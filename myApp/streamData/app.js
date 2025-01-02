var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var csv = require('csv-parser');
var readline = require('readline');
var fs = require('fs');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { Readline } = require('readline/promises');
const { call } = require('file-loader');

var app = express();

// Store vessel data with a more efficient structure
//app.locals.vesselData = [];
//app.locals.dataLoaded = false;
//app.locals.currentLoadingPart = 1;

app.locals.streamingStatus = {
    isStreaming: false,
    currentFile: 1,
    totalFiles: 11,
    currentLine: 0,
    totalLines: 0
}

function parseCSVLine(line) {
    const parts = line.split(',');
    if (parts[0]==='timestamp') {
        return null;
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
        size_starboard: parseFloat(parts[16]) || 0,
        destinations: parts[17]       
    };
}

function createLineReader(filePath) {
    const fileStream = fs.createReadStream(filePath)
    return readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
}

// Function to stream data to connected clients
function streamDataToClients(io) {
    let currentFileIndex = 1;
    const baseDir = path.join(__dirname, './data/argosaronic_gulf_march_2020_part_1');
    
    async function processNextFile() {
        if (currentFileIndex > app.locals.streamingStatus.totalFiles) {
            currentFileIndex = 1; // Reset to first file to loop continuously
        }

        const filePath = path.join(baseDir, `part_${currentFileIndex}.csv`);
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: part_${currentFileIndex}.csv`);
            currentFileIndex++;
            return processNextFile();
        }

        app.locals.streamingStatus.currentFile = currentFileIndex;
        const lineReader = createLineReader(filePath);
        let isFirstLine = true;

        for await (const line of lineReader) {
            if (isFirstLine) {
                isFirstLine = false;
                continue; // Skip header
            }

            const vesselData = parseCSVLine(line);
            if (vesselData) {
                // Emit to all connected clients
                io.emit('vesselUpdates', [vesselData]);
                io.emit('timestampUpdate', vesselData.timestamp);
                
                // Simulate real-time delay
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            app.locals.streamingStatus.currentLine++;
        }

        currentFileIndex++;
        processNextFile();
    }

    // Start the streaming process
    app.locals.streamingStatus.isStreaming = true;
    processNextFile();
}

// Function to process CSV data in chunks
// function processCSVChunk(chunk) {
//     return {
//         timestamp: chunk.timestamp,
//         mmsi: chunk.mmsi,
//         longitude: parseFloat(chunk.longitude),
//         latitude: parseFloat(chunk.latitude),
//         ship_name: chunk.ship_name,
//         ship_type: chunk.ship_type,
//         heading: parseFloat(chunk.heading) || 0,
//         speed: parseFloat(chunk.sog) || 0
//     };
// }

// Function to read a single CSV file with stream processing
// function readCSVFile(filePath, partNumber) {
//     return new Promise((resolve, reject) => {
//         const tempData = [];
//         console.log(`Starting to read part ${partNumber}`);
        
//         fs.createReadStream(filePath)
//             .pipe(csv())
//             .on('data', (chunk) => {
//                 try {
//                     tempData.push(processCSVChunk(chunk));
                    
//                     // Process in smaller batches to avoid memory issues
//                     if (tempData.length >= 10000) {
//                         app.locals.vesselData.push(...tempData);
//                         tempData.length = 0; // Clear the temporary array
//                     }
//                 } catch (error) {
//                     console.error('Error processing chunk:', error);
//                 }
//             })
//             .on('end', () => {
//                 // Push any remaining data
//                 if (tempData.length > 0) {
//                     app.locals.vesselData.push(...tempData);
//                 }
//                 console.log(`Finished reading part ${partNumber}. Current total records: ${app.locals.vesselData.length}`);
//                 resolve();
//             })
//             .on('error', (error) => {
//                 console.error(`Error reading part ${partNumber}:`, error);
//                 reject(error);
//             });
//     });
// }

// // Function to read CSV files sequentially
// async function loadAllCSVFiles() {
//     try {
//         const baseDir = path.join(__dirname, './data/argosaronic_gulf_march_2020_part_1');
//         const numberOfParts = 11;

//         for (let i = 1; i <= numberOfParts; i++) {
//             const filePath = path.join(baseDir, `part_${i}.csv`);
//             app.locals.currentLoadingPart = i;

//             if (fs.existsSync(filePath)) {
//                 await readCSVFile(filePath, i);
//                 console.log(`Successfully loaded part ${i}`);
//             } else {
//                 console.log(`File not found: part_${i}.csv`);
//             }
//         }

//         // Sort data by timestamp after loading all files
//         console.log('Sorting data by timestamp...');
//         app.locals.vesselData.sort((a, b) => 
//             new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
//         );

//         app.locals.dataLoaded = true;
//         console.log(`All parts loaded. Total records: ${app.locals.vesselData.length}`);
//     } catch (error) {
//         console.error('Error loading CSV files:', error);
//         app.locals.dataLoaded = true; // Set to true even on error to prevent hanging
//     }
// }

// Start loading the CSV files
//loadAllCSVFiles();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Add endpoint to check streaming status
app.get('/api/streaming-status', (req, res) => {
    res.json(app.locals.streamingStatus);
});

module.exports = app;

// Export both app and streamDataToClients function
module.exports = { app, streamDataToClients };