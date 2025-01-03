// Import required modules
const L = require('leaflet'); // Import Leaflet for map rendering
const io = require('socket.io-client'); // Import Socket.IO for real-time communication

// Initialize the map
const map = L.map('map').setView([37.93, 23.65], 12); // Set initial map view (latitude, longitude, zoom level)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); // Add OpenStreetMap tiles to the map

// Define a custom icon for vessels
const vesselIcon = L.icon({
    iconUrl: '/stylesheets/images/marker-icon.png', // Path to the marker icon image
    shadowUrl: '/stylesheets/images/marker-shadow.png', // Path to the shadow image
    iconSize: [25, 41], // Dimensions of the icon
    iconAnchor: [12, 41], // Anchor point of the icon (positioning relative to the map)
    popupAnchor: [1, -34], // Anchor point for the popup
    shadowSize: [41, 41] // Dimensions of the shadow
});

// Add a control for displaying the streaming status
const statusControl = L.control({ position: 'topright' }); // Position the control in the top-right corner
statusControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'status-control'); // Create the container div
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div id="streamingStatus">Initializing stream...</div> <!-- Display streaming status -->
            <div id="streamingProgress"></div> <!-- Display streaming progress -->
        </div>
    `;
    return div; // Return the control's DOM element
};
statusControl.addTo(map); // Add the control to the map

// Add a control panel for user interaction
const controlPanel = L.control({ position: 'bottomleft' }); // Position the control panel in the bottom-left corner
controlPanel.onAdd = function () {
    const div = L.DomUtil.create('div', 'control-panel'); // Create the container div
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div id="timestamp" style="margin-bottom: 10px;">Time: --:--:--</div> <!-- Timestamp display -->
            <button id="playPause">Pause</button> <!-- Button to toggle play/pause -->
            <select id="speed"> <!-- Dropdown for selecting playback speed -->
                <option value="2000">0.5x</option>
                <option value="1000" selected>1x</option>
                <option value="500">2x</option>
                <option value="250">4x</option>
            </select>
            <div>Active Vessels: <span id="vesselCount">0</span></div> <!-- Display active vessels count -->
            <div>Current File: <span id="currentFile">1</span>/<span id="totalFiles">-</span></div> <!-- Display current and total files -->
        </div>
    `;
    return div; // Return the control panel's DOM element
};
controlPanel.addTo(map); // Add the control panel to the map

// Initialize data structures for managing vessel data
const markers = {}; // Store vessel markers by MMSI
let activeVessels = new Set(); // Track active vessels using their MMSI
const trackingHistory = {}; // Store historical positions for vessels
let polylines = {}; // Store polylines for vessel tracks

// Connect to the Socket.IO server
const socket = io(); // Establish a WebSocket connection

// Function to update tracking history and draw polylines for vessels
function updateTrackingHistory(vessel) {
    // Initialize tracking history for the vessel if not present
    if (!trackingHistory[vessel.mmsi]) {
        trackingHistory[vessel.mmsi] = []; // Create an empty array for storing positions
    }

    // Add the current position to the vessel's history
    trackingHistory[vessel.mmsi].push([vessel.latitude, vessel.longitude]);

    // Limit the history length to avoid excessive memory usage
    if (trackingHistory[vessel.mmsi].length > 1000) {
        trackingHistory[vessel.mmsi].shift(); // Remove the oldest entry
    }

    // Update or create the polyline for the vessel
    if (polylines[vessel.mmsi]) {
        polylines[vessel.mmsi].setLatLngs(trackingHistory[vessel.mmsi]); // Update polyline coordinates
    } else {
        polylines[vessel.mmsi] = L.polyline(trackingHistory[vessel.mmsi], { color: 'black' }).addTo(map); // Create a new polyline
    }
}

// Event listener for streaming status updates
socket.on('streamingStatus', (status) => {
    const streamingStatus = document.getElementById('streamingStatus'); // Reference the status element
    const streamingProgress = document.getElementById('streamingProgress'); // Reference the progress element
    const currentFile = document.getElementById('currentFile'); // Reference the current file element
    const totalFiles = document.getElementById('totalFiles'); // Reference the total files element

    // Update UI elements based on streaming status
    if (status.isStreaming) {
        streamingStatus.textContent = 'Streaming vessel data...';
        currentFile.textContent = status.currentFile;
        totalFiles.textContent = status.totalFiles;
        streamingProgress.textContent = `Processing file ${status.currentFile} of ${status.totalFiles}`;
    } else {
        streamingStatus.textContent = 'Initializing stream...';
    }
});

// Toggle play/pause functionality
let isPaused = false; // Track whether streaming is paused
document.getElementById('playPause').addEventListener('click', function () {
    isPaused = !isPaused; // Toggle pause state
    this.textContent = isPaused ? 'Play' : 'Pause'; // Update button text
    socket.emit('setPaused', isPaused); // Notify the server of the new state
});

// Update playback speed based on user selection
document.getElementById('speed').addEventListener('change', function () {
    socket.emit('setSpeed', parseInt(this.value)); // Notify the server of the selected speed
});

// Handle vessel updates and add or update markers
socket.on('vesselUpdates', (vessels) => {
    vessels.forEach(vessel => {
        console.log('Processing vessel:', vessel);

        // Validate vessel coordinates
        if (
            typeof vessel.latitude !== 'number' || vessel.latitude < -90 || vessel.latitude > 90 ||
            typeof vessel.longitude !== 'number' || vessel.longitude < -180 || vessel.longitude > 180
        ) {
            console.error('Invalid coordinates for vessel:', vessel); // Log error for invalid data
            return;
        }

        // Update the active vessels set
        activeVessels.add(vessel.mmsi);

        // Update the active vessels count in the control panel
        document.getElementById('vesselCount').textContent = activeVessels.size;

        // Define the popup content for the vessel
        const popupContent = `
            MMSI: ${vessel.mmsi}<br>
            IMO: ${vessel.imo}<br>
            Navigational Status: ${vessel.navigational_status}<br>
            Longitude: ${vessel.longitude}<br>
            Latitude: ${vessel.latitude}<br>
            Heading: ${vessel.heading}°<br>
            COG: ${vessel.cog}°<br>
            SOG: ${vessel.sog} knots<br>
            Ship Name: ${vessel.ship_name}<br>
            Callsign: ${vessel.callsign}<br>
            Ship Type: ${vessel.ship_type}<br>
            Draught: ${vessel.draught}<br>
            Destination: ${vessel.destinations}
        `;

        // Add or update the marker for the vessel
        if (!markers[vessel.mmsi]) {
            markers[vessel.mmsi] = L.marker([vessel.latitude, vessel.longitude], { icon: vesselIcon })
                .bindPopup(popupContent) // Attach the popup content
                .addTo(map)
                .on('click', () => {
                    // Highlight the tracking history when a marker is clicked
                    if (trackingHistory[vessel.mmsi]?.length > 1) {
                        polylines[vessel.mmsi]?.setStyle({ opacity: 1 });
                    } else {
                        console.log('No tracking history available for this vessel.');
                    }
                });
        } else {
            markers[vessel.mmsi].setLatLng([vessel.latitude, vessel.longitude]); // Update marker position
            markers[vessel.mmsi].getPopup().setContent(popupContent); // Update popup content
        }

        // Update the vessel's tracking history
        updateTrackingHistory(vessel);
    });
});

// Hide all polylines when clicking on the map
map.on('click', () => {
    Object.values(polylines).forEach(polyline => {
        polyline.setStyle({ opacity: 0 }); // Hide all polylines
    });
});

// Update the displayed timestamp
socket.on('timestampUpdate', (timestamp) => {
    document.getElementById('timestamp').textContent = `Time: ${timestamp}`;
});

// Log map initialization
console.log('Map initialized:', map);
