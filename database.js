const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI;
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log("Error connecting to MongoDB", error);
    }
};

module.exports = connectDB;