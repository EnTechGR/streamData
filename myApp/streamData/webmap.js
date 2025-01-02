const L = require('leaflet'); // Import Leaflet for map rendering
const io = require('socket.io-client'); // Import Socket.IO for real-time communication

// Initialize map
const map = L.map('map').setView([37.93, 23.65], 12); // Set initial map view to specific coordinates and zoom level
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); // Add OpenStreetMap tiles to the map

// Custom vessel icon
const vesselIcon = L.icon({
    iconUrl: '/stylesheets/images/marker-icon.png', // Path to custom icon image
    shadowUrl: '/stylesheets/images/marker-shadow.png', // Path to shadow image
    iconSize: [25, 41], // Size of the icon
    iconAnchor: [12, 41], // Point of the icon that corresponds to marker's location
    popupAnchor: [1, -34], // Point from which the popup should open relative to the icon anchor
    shadowSize: [41, 41] // Size of the shadow
});

// Add streaming status indicator
const statusControl = L.control({ position: 'topright' }); // Create a new control in the top-right corner
statusControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'status-control'); // Create a container div for the control
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div id="streamingStatus">Initializing stream...</div>
            <div id="streamingProgress"></div>
        </div>
    `;
    return div; // Return the DOM element for the control
};
statusControl.addTo(map); // Add the control to the map

// Add control panel for user interaction
const controlPanel = L.control({ position: 'bottomleft' }); // Create a new control in the bottom-left corner
controlPanel.onAdd = function () {
    const div = L.DomUtil.create('div', 'control-panel'); // Create a container div for the control
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div id="timestamp" style="margin-bottom: 10px;">Time: --:--:--</div>
            <button id="playPause">Pause</button> <!-- Pause/Play button -->
            <select id="speed"> <!-- Dropdown for selecting playback speed -->
                <option value="2000">0.5x</option>
                <option value="1000" selected>1x</option>
                <option value="500">2x</option>
                <option value="250">4x</option>
            </select>
            <div>Active Vessels: <span id="vesselCount">0</span></div> <!-- Active vessels count -->
            <div>Current File: <span id="currentFile">1</span>/<span id="totalFiles">-</span></div> <!-- Current file info -->
        </div>
    `;
    return div; // Return the DOM element for the control
};
controlPanel.addTo(map); // Add the control to the map

// Store markers and active vessels count
const markers = {}; // Object to store markers by vessel MMSI
let activeVessels = new Set(); // Set to track active vessels by MMSI

// Connect to Socket.IO
const socket = io(); // Initialize Socket.IO client

// Handle streaming status updates from the server
socket.on('streamingStatus', (status) => {
    const streamingStatus = document.getElementById('streamingStatus');
    const streamingProgress = document.getElementById('streamingProgress');
    const currentFile = document.getElementById('currentFile');
    const totalFiles = document.getElementById('totalFiles');

    if (status.isStreaming) {
        streamingStatus.textContent = 'Streaming vessel data...'; // Update status text
        currentFile.textContent = status.currentFile; // Update current file number
        totalFiles.textContent = status.totalFiles; // Update total files count
        streamingProgress.textContent = `Processing file ${status.currentFile} of ${status.totalFiles}`; // Update progress
    } else {
        streamingStatus.textContent = 'Initializing stream...'; // Default text if not streaming
    }
});

// Control panel functionality
let isPaused = false; // Flag to track pause/play state
document.getElementById('playPause').addEventListener('click', function () {
    isPaused = !isPaused; // Toggle pause/play state
    this.textContent = isPaused ? 'Play' : 'Pause'; // Update button text
    socket.emit('setPaused', isPaused); // Notify server of the pause/play state
});

document.getElementById('speed').addEventListener('change', function () {
    socket.emit('setSpeed', parseInt(this.value)); // Notify server of the new speed setting
});

// Handle vessel updates from the server
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

        // Update active vessels set
        activeVessels.add(vessel.mmsi);

        // Update vessel count display
        document.getElementById('vesselCount').textContent = activeVessels.size;

        if (!markers[vessel.mmsi]) {
            console.log('Creating new marker for vessel:', vessel.mmsi);
            // Create a new marker for the vessel
            markers[vessel.mmsi] = L.marker([vessel.latitude, vessel.longitude], { icon: vesselIcon })
                .bindPopup(` <!-- Popup with vessel details -->
                    mmsi: ${vessel.mmsi}<br>
                    imo: ${vessel.imo}<br>
                    Navigational status: ${vessel.navigational_status}<br>
                    Heading: ${vessel.heading}°<br>
                    cog: ${vessel.cog}°<br>
                    sog: ${vessel.sog} knots<br>
                    Ship name: ${vessel.ship_name}<br>
                    callsign: ${vessel.callsign}<br>
                    ship type: ${vessel.ship_type}<br>
                    destination: ${vessel.destinations}                    
                `)
                .addTo(map); // Add marker to the map
        } else {
            // Update the position and popup content of an existing marker
            markers[vessel.mmsi].setLatLng([vessel.latitude, vessel.longitude]);
            markers[vessel.mmsi].getPopup().setContent(` <!-- Simplified popup content -->
                Ship: ${vessel.ship_name}<br>
                MMSI: ${vessel.mmsi}<br>
                Type: ${vessel.ship_type}<br>
                Speed: ${vessel.speed} knots<br>
                Heading: ${vessel.heading}°
            `);
        }
    });
});

// Update timestamp display
socket.on('timestampUpdate', (timestamp) => {
    document.getElementById('timestamp').textContent = `Time: ${timestamp}`; // Update timestamp display
});

// Debug marker visibility
console.log('Map initialized:', map); // Log map initialization
