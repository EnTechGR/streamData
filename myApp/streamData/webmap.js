const L = require('leaflet');
const io = require('socket.io-client');

// Initialize map
const map = L.map('map').setView([37.93, 23.65], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add loading indicator
const loadingControl = L.control({ position: 'topright' });
loadingControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'loading-control');
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div id="loadingStatus">Loading data...</div>
            <div id="loadingProgress"></div>
        </div>
    `;
    return div;
};
loadingControl.addTo(map);

// Add control panel (only show after data is loaded)
const controlPanel = L.control({ position: 'bottomleft' });
controlPanel.onAdd = function () {
    const div = L.DomUtil.create('div', 'control-panel');
    div.style.display = 'none'; // Hide initially
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
        </div>
    `;
    return div;
};
controlPanel.addTo(map);

// Store markers
const markers = {};

// Connect to Socket.IO
const socket = io();

// Handle loading status
socket.on('loadingStatus', (status) => {
    const loadingStatus = document.getElementById('loadingStatus');
    const loadingProgress = document.getElementById('loadingProgress');
    const controlPanelDiv = document.querySelector('.control-panel');

    if (status.loaded) {
        loadingStatus.textContent = 'Data loaded successfully!';
        loadingProgress.textContent = `Total records: ${status.totalRecords}`;
        controlPanelDiv.style.display = 'block';
        setTimeout(() => {
            document.querySelector('.loading-control').style.display = 'none';
        }, 2000);
    } else {
        loadingStatus.textContent = `Loading part ${status.currentPart} of 6...`;
        loadingProgress.textContent = `Records loaded: ${status.totalRecords}`;
    }
});

// Control panel functionality
let isPaused = false;
document.getElementById('playPause').addEventListener('click', function() {
    isPaused = !isPaused;
    this.textContent = isPaused ? 'Play' : 'Pause';
    socket.emit('setPaused', isPaused);
});

document.getElementById('speed').addEventListener('change', function() {
    socket.emit('setSpeed', parseInt(this.value));
});

// Handle vessel updates
socket.on('vesselUpdates', (vessels) => {
    document.getElementById('vesselCount').textContent = vessels.length;
    
    vessels.forEach(vessel => {
        if (!markers[vessel.mmsi]) {
            markers[vessel.mmsi] = L.marker([vessel.latitude, vessel.longitude])
                .bindPopup(`
                    Ship: ${vessel.ship_name}<br>
                    MMSI: ${vessel.mmsi}<br>
                    Type: ${vessel.ship_type}<br>
                    Speed: ${vessel.speed} knots<br>
                    Heading: ${vessel.heading}°
                `)
                .addTo(map);
        } else {
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