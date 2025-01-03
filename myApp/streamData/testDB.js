const sequelize = require('./config/database');
const Vessel = require('./models/vessel');

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });

  
  
  
//   sequelize.sync({ force: true }) // force: true will drop the table if it already exists (use with caution)
//     .then(() => {
//       console.log('Vessel table created!');
//     })
//     .catch((err) => {
//       console.error('Error creating table:', err);
//     });


async function insertVesselData() {
  await Vessel.create({
    timestamp: '2025-01-03T10:00:00',
    mmsi: '123456789',
    imo: '987654321',
    navigational_status: 'Underway using engine',
    longitude: 23.789,
    latitude: 37.983,
    heading: 90,
    cog: 10,
    sog: 5,
    ship_name: 'Example Ship',
    callsign: 'EX123',
    ship_type: 'Cargo',
    draught: 8,
    size_bow: 50,
    size_stern: 60,
    size_port: 15,
    size_starboard: '15',
    destinations: 'Port of Athens',
  });
}

insertVesselData();