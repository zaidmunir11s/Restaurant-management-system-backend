// config/db.js
const mongoose = require('mongoose');
const config = require('config');


const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/restaurant_management", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB; 