const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

router.post("/", async (req, res) => {
    const { name, message } = req.body;
    if (!name || !message) {
        return res.status(400).json({ message: "Name and message are required" });
    }
    try {
        const newMessage = new Message({ name, message });
        await newMessage.save();
        res.status(201).json({ message: "Message sent successfully", data: newMessage });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const messages = await Message.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
        const totalMessages = await Message.countDocuments();
        const totalPages = Math.ceil(totalMessages / limit);
        res.status(200).json({ message: "Messages fetched successfully", data: messages, totalPages, currentPage: page });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;