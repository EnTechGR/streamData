const L = require('leaflet');
const io = require('socket.io-client');

// Initialize map
const map = L.map('map').setView([37.93, 23.65], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Custom vessel icon
const vesselIcon = L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Add streaming status indicator
const statusControl = L.control({ position: 'topright' });
statusControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'status-control');
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div id="streamingStatus">Initializing stream...</div>
            <div id="streamingProgress"></div>
        </div>
    `;
    return div;
};
statusControl.addTo(map);

// Add control panel
const controlPanel = L.control({ position: 'bottomleft' });
controlPanel.onAdd = function () {
    const div = L.DomUtil.create('div', 'control-panel');
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div id="timestamp" style="margin-bottom: 10px;">Time: --:--:--</div>
            <button id="playPause">Pause</button>
            <select id="speed">
                <option value="2000">0.5x</option>
                <option value="1000" selected>1x</option>
                <option value="500">2x</option>
                <option value="250">4x</option>
            </select>
            <div>Active Vessels: <span id="vesselCount">0</span></div>
            <div>Current File: <span id="currentFile">1</span>/<span id="totalFiles">-</span></div>
        </div>
    `;
    return div;
};
controlPanel.addTo(map);

// Store markers and active vessels count
const markers = {};
let activeVessels = new Set();

// Connect to Socket.IO
const socket = io();

// Handle streaming status
socket.on('streamingStatus', (status) => {
    const streamingStatus = document.getElementById('streamingStatus');
    const streamingProgress = document.getElementById('streamingProgress');
    const currentFile = document.getElementById('currentFile');
    const totalFiles = document.getElementById('totalFiles');

    if (status.isStreaming) {
        streamingStatus.textContent = 'Streaming vessel data...';
        currentFile.textContent = status.currentFile;
        totalFiles.textContent = status.totalFiles;
        streamingProgress.textContent = `Processing file ${status.currentFile} of ${status.totalFiles}`;
    } else {
        streamingStatus.textContent = 'Initializing stream...';
    }
});

// Control panel functionality
let isPaused = false;
document.getElementById('playPause').addEventListener('click', function () {
    isPaused = !isPaused;
    this.textContent = isPaused ? 'Play' : 'Pause';
    socket.emit('setPaused', isPaused);
});

document.getElementById('speed').addEventListener('change', function () {
    socket.emit('setSpeed', parseInt(this.value));
});

// Handle vessel updates
socket.on('vesselUpdates', (vessels) => {
    vessels.forEach(vessel => {
        console.log('Processing vessel:', vessel);

        if (
            typeof vessel.latitude !== 'number' || vessel.latitude < -90 || vessel.latitude > 90 ||
            typeof vessel.longitude !== 'number' || vessel.longitude < -180 || vessel.longitude > 180
        ) {
            console.error('Invalid coordinates for vessel:', vessel);
            return;
        }

        // Update active vessels set
        activeVessels.add(vessel.mmsi);

        // Update vessel count
        document.getElementById('vesselCount').textContent = activeVessels.size;

        if (!markers[vessel.mmsi]) {
            console.log('Creating new marker for vessel:', vessel.mmsi);
            // Create new marker with custom icon
            markers[vessel.mmsi] = L.marker([vessel.latitude, vessel.longitude], { icon: vesselIcon })
                .bindPopup(`
                    Ship: ${vessel.ship_name}<br>
                    MMSI: ${vessel.mmsi}<br>
                    Type: ${vessel.ship_type}<br>
                    Speed: ${vessel.speed} knots<br>
                    Heading: ${vessel.heading}°
                `)
                .addTo(map);
        } else {
            // Update existing marker
            markers[vessel.mmsi].setLatLng([vessel.latitude, vessel.longitude]);
            markers[vessel.mmsi].getPopup().setContent(`
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
    document.getElementById('timestamp').textContent = `Time: ${timestamp}`;
});

// Debug marker visibility
console.log('Map initialized:', map);
