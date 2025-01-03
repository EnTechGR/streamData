// Import required modules
var express = require('express'); // Framework for building web applications
var path = require('path'); // Utility for handling file and directory paths
var cookieParser = require('cookie-parser'); // Middleware for parsing cookies
var logger = require('morgan'); // Middleware for logging HTTP requests
var csv = require('csv-parser'); // Library for parsing CSV files
var readline = require('readline'); // Library for creating interfaces for reading lines
var fs = require('fs'); // File system module

// Import route handlers
var indexRouter = require('./routes/index'); // Route handler for index routes
var usersRouter = require('./routes/users'); // Route handler for user routes
const Vessel = require('./models/vessel'); // Sequelize model for Vessel data

// Create an instance of the Express application
var app = express();

// Define application-wide local variables for tracking streaming status
app.locals.streamingStatus = {
    isStreaming: false, // Indicates whether streaming is currently active
    currentFile: 1, // Tracks the current file being processed
    totalFiles: 11, // Total number of files to process
    currentLine: 0, // Tracks the number of lines processed in the current file
    totalLines: 0 // Tracks the total number of lines processed across all files
};

// Function to parse a line from a CSV file and save it to the database
async function parseCSVLineAndSave(line) {
    const parts = line.split(','); // Split the line into parts using comma as a delimiter
    if (parts[0] === 'timestamp') {
        return null; // Skip the header line
    }

    // Create a vessel data object from the CSV line
    const vesselData = {
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
        size_starboard: parseFloat(parts[16]) || 0,
        destinations: parts[17]
    };

    // Save the vessel data to the database
    await Vessel.create(vesselData);

    // Return the parsed vessel data for further processing
    return vesselData;
}

// Function to create a line reader for processing files line-by-line
function createLineReader(filePath) {
    const fileStream = fs.createReadStream(filePath); // Create a stream to read the file
    return readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity // Support platforms with different line endings
    });
}

// Function to stream data to connected clients via WebSocket
function streamDataToClients(io) {
    let currentFileIndex = 1; // Start processing from the first file
    const baseDir = path.join(__dirname, './data/argosaronic_gulf_march_2020_part_1'); // Directory containing CSV files

    // Recursive function to process the next file
    async function processNextFile() {
        // Restart from the first file if all files have been processed
        if (currentFileIndex > app.locals.streamingStatus.totalFiles) {
            currentFileIndex = 1;
        }

        // Construct the file path for the current file
        const filePath = path.join(baseDir, `part_${currentFileIndex}.csv`);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: part_${currentFileIndex}.csv`);
            currentFileIndex++;
            return processNextFile(); // Skip to the next file
        }

        // Update the streaming status with the current file index
        app.locals.streamingStatus.currentFile = currentFileIndex;
        const lineReader = createLineReader(filePath); // Create a line reader for the file
        let isFirstLine = true; // Flag to skip the header line

        // Process each line in the file
        for await (const line of lineReader) {
            if (isFirstLine) {
                isFirstLine = false;
                continue; // Skip the header line
            }

            // Parse the CSV line and save the data to the database
            const vesselData = await parseCSVLineAndSave(line);
            if (vesselData) {
                const savedData = await Vessel.findOne({ where: { timestamp: vesselData.timestamp } });

                // Emit the saved data to clients via WebSocket
                if (savedData) {
                    io.emit('vesselUpdates', [savedData]);
                    io.emit('timestampUpdate', savedData.timestamp);

                    // Simulate a delay to create a real-time streaming effect
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Increment the processed line count
            app.locals.streamingStatus.currentLine++;
        }

        // Move to the next file
        currentFileIndex++;
        processNextFile(); // Recursively process the next file
    }

    // Start the streaming process
    app.locals.streamingStatus.isStreaming = true;
    processNextFile();
}

// Middleware setup
app.use(logger('dev')); // Log HTTP requests using Morgan
app.use(express.json()); // Parse JSON payloads
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded payloads
app.use(cookieParser()); // Parse HTTP cookies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// Use defined routes for handling requests
app.use('/', indexRouter); // Routes for index
app.use('/users', usersRouter); // Routes for user management

// API endpoint to check the current streaming status
app.get('/api/streaming-status', (req, res) => {
    res.json(app.locals.streamingStatus); // Respond with the current streaming status
});

// Export the app and the function to stream data to clients
module.exports = { app, streamDataToClients };
