var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var csv = require('csv-parser');
var fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
// Store vessel data
app.locals.vesselData = [];

// Read and parse CSV file
fs.createReadStream(path.join(__dirname, 'data/argosaronic_gulf_march_2020_part_1/split_files/part_1.csv'))
  .pipe(csv())
  .on('data', (row) => {
    app.locals.vesselData.push({
      timestamp: row.timestamp,
      mmsi: row.mmsi,
      longitude: parseFloat(row.longitude),
      latitude: parseFloat(row.latitude),
      ship_name: row.ship_name,
      ship_type: row.ship_type,
      heading: parseFloat(row.heading),
      speed: parseFloat(row.sog)
    });
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  });

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
