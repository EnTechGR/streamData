// Import the leaflet package
var L = require('leaflet');
const io = require('socket.io-client');

// Creates a leaflet map binded to an html <div> with id "map"
// setView will set the initial map view to the location at coordinates
// 13 represents the initial zoom level with higher values being more zoomed in
var map = L.map('map').setView([37.946450, 23.640097], 20);

// Adds the basemap tiles to your web map
// Additional providers are available at: https://leaflet-extras.github.io/leaflet-providers/preview/
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 21
}).addTo(map);

// Store markers
const markers = {};

// Connect to Socket.IO
const socket = io();

// Handle vessel updates
socket.on('vesselUpdate', (vessel) => {
    // Create or update marker
    if (!markers[vessel.mmsi]) {
        // Create new marker
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

// Adds a popup marker to the webmap for GGL address
L.circleMarker([37.946450, 23.640097]).addTo(map)
	.bindPopup(
		'This is<br>' + 
		'an example<br>' +
		'Piraeus<br>'
	)
	.openPopup();