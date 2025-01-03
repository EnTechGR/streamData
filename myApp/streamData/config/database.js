const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('mydatabase', 'myuser', 'mypassword', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5433,
});

module.exports = sequelize;
