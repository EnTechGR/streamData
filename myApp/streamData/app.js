// Import required modules
var express = require('express'); // Framework for building web applications
var path = require('path'); // Utility for handling file and directory paths
var cookieParser = require('cookie-parser'); // Middleware for parsing cookies
var logger = require('morgan'); // Middleware for logging HTTP requests
var csv = require('csv-parser'); // Library for parsing CSV files
var readline = require('readline'); // Library for creating interfaces for reading lines
var fs = require('fs'); // File system module

// Import route handlers
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

// Express application instance
var app = express();

// Define application-wide local variables for tracking streaming status
app.locals.streamingStatus = {
    isStreaming: false, // Indicates if streaming is currently active
    currentFile: 1, // Tracks the current file being processed
    totalFiles: 11, // Total number of files to process
    currentLine: 0, // Tracks the current line being processed in a file
    totalLines: 0 // Tracks the total number of lines processed
};

// Function to parse a line from a CSV file
function parseCSVLine(line) {
    const parts = line.split(',');
    if (parts[0] === 'timestamp') {
        return null; // Skip the header line
    }
    return {
        timestamp: parts[0],
        mmsi: parts[1],
        imo: parts[2],
        navigational_status: parts[3],
        longitude: parseFloat(parts[4]),
        latitude: parseFloat(parts[5]),
        heading: parseFloat(parts[6]) || 0,
        cog: parseFloat(parts[7]) || 0,
        sog: parseFloat(parts[8]) || 0,
        ship_name: parts[9],
        callsign: parts[10],
        ship_type: parts[11],
        draught: parseFloat(parts[12]) || 0,
        size_bow: parseFloat(parts[13]) || 0,
        size_stern: parseFloat(parts[14]) || 0,
        size_port: parseFloat(parts[15]) || 0,
        size_starboard: parts[16] || 0,
        destinations: parts[17]
    };
}

// Function to create a line reader for a given file path
function createLineReader(filePath) {
    const fileStream = fs.createReadStream(filePath); // Create a file stream
    return readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity // Support platforms with different line endings
    });
}

// Function to stream data to connected clients via WebSocket (using socket.io)
function streamDataToClients(io) {
    let currentFileIndex = 1; // Start with the first file
    const baseDir = path.join(__dirname, './data/argosaronic_gulf_march_2020_part_1'); // Directory containing files

    async function processNextFile() {
        // Reset to the first file if all files have been processed
        if (currentFileIndex > app.locals.streamingStatus.totalFiles) {
            currentFileIndex = 1;
        }

        const filePath = path.join(baseDir, `part_${currentFileIndex}.csv`); // Construct file path
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: part_${currentFileIndex}.csv`);
            currentFileIndex++;
            return processNextFile(); // Skip to the next file
        }

        app.locals.streamingStatus.currentFile = currentFileIndex; // Update current file in status
        const lineReader = createLineReader(filePath);
        let isFirstLine = true; // Flag to skip the header line

        // Process each line in the file
        for await (const line of lineReader) {
            if (isFirstLine) {
                isFirstLine = false;
                continue; // Skip header
            }

            const vesselData = parseCSVLine(line); // Parse the line into an object
            if (vesselData) {
                io.emit('vesselUpdates', [vesselData]); // Emit vessel data to clients
                io.emit('timestampUpdate', vesselData.timestamp); // Emit timestamp update
                
                // Simulate a delay to mimic real-time streaming
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            app.locals.streamingStatus.currentLine++; // Increment processed line count
        }

        currentFileIndex++; // Move to the next file
        processNextFile(); // Process the next file recursively
    }

    // Start the streaming process
    app.locals.streamingStatus.isStreaming = true;
    processNextFile();
}

// Middleware setup
app.use(logger('dev')); // Log HTTP requests
app.use(express.json()); // Parse JSON payloads
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded payloads
app.use(cookieParser()); // Parse cookies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Use defined routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// API endpoint to check streaming status
app.get('/api/streaming-status', (req, res) => {
    res.json(app.locals.streamingStatus); // Respond with current streaming status
});

// Export the app and the streamDataToClients function
module.exports = { app, streamDataToClients };
