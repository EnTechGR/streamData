var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var csv = require('csv-parser');
var fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// Store vessel data with a more efficient structure
app.locals.vesselData = [];
app.locals.dataLoaded = false;
app.locals.currentLoadingPart = 1;

// Function to process CSV data in chunks
function processCSVChunk(chunk) {
    return {
        timestamp: chunk.timestamp,
        mmsi: chunk.mmsi,
        longitude: parseFloat(chunk.longitude),
        latitude: parseFloat(chunk.latitude),
        ship_name: chunk.ship_name,
        ship_type: chunk.ship_type,
        heading: parseFloat(chunk.heading) || 0,
        speed: parseFloat(chunk.sog) || 0
    };
}

// Function to read a single CSV file with stream processing
function readCSVFile(filePath, partNumber) {
    return new Promise((resolve, reject) => {
        const tempData = [];
        console.log(`Starting to read part ${partNumber}`);
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (chunk) => {
                try {
                    tempData.push(processCSVChunk(chunk));
                    
                    // Process in smaller batches to avoid memory issues
                    if (tempData.length >= 10000) {
                        app.locals.vesselData.push(...tempData);
                        tempData.length = 0; // Clear the temporary array
                    }
                } catch (error) {
                    console.error('Error processing chunk:', error);
                }
            })
            .on('end', () => {
                // Push any remaining data
                if (tempData.length > 0) {
                    app.locals.vesselData.push(...tempData);
                }
                console.log(`Finished reading part ${partNumber}. Current total records: ${app.locals.vesselData.length}`);
                resolve();
            })
            .on('error', (error) => {
                console.error(`Error reading part ${partNumber}:`, error);
                reject(error);
            });
    });
}

// Function to read CSV files sequentially
async function loadAllCSVFiles() {
    try {
        const baseDir = path.join(__dirname, 'data/argosaronic_gulf_march_2020_part_1/split_files');
        const numberOfParts = 6;

        for (let i = 1; i <= numberOfParts; i++) {
            const filePath = path.join(baseDir, `part_${i}.csv`);
            app.locals.currentLoadingPart = i;

            if (fs.existsSync(filePath)) {
                await readCSVFile(filePath, i);
                console.log(`Successfully loaded part ${i}`);
            } else {
                console.log(`File not found: part_${i}.csv`);
            }
        }

        // Sort data by timestamp after loading all files
        console.log('Sorting data by timestamp...');
        app.locals.vesselData.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        app.locals.dataLoaded = true;
        console.log(`All parts loaded. Total records: ${app.locals.vesselData.length}`);
    } catch (error) {
        console.error('Error loading CSV files:', error);
        app.locals.dataLoaded = true; // Set to true even on error to prevent hanging
    }
}

// Start loading the CSV files
loadAllCSVFiles();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Add endpoint to check loading status
app.get('/api/loading-status', (req, res) => {
    res.json({
        loaded: app.locals.dataLoaded,
        currentPart: app.locals.currentLoadingPart,
        totalRecords: app.locals.vesselData.length
    });
});

module.exports = app;