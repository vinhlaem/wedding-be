const Slide = require("../models/Slide");

// Simple projection for slide list responses
const SLIDE_PROJECTION = {
  type: 1,
  images: 1,
  caption: 1,
  order: 1,
  published: 1,
  createdAt: 1,
};

const getSlides = async (req, res) => {
  try {
    const filter = {};
    if (req.query.published) filter.published = req.query.published === "true";
    const slides = await Slide.find(filter, SLIDE_PROJECTION)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: slides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSlide = async (req, res) => {
  try {
    const { type, images, caption, order, published } = req.body;
    if (!type || !images || !Array.isArray(images) || images.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "type and non-empty images array are required",
        });
    }
    const slide = await Slide.create({
      type,
      images,
      caption: caption || null,
      order: Number(order) || 0,
      published: published !== false,
    });
    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSlide = async (req, res) => {
  try {
    const slide = await Slide.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!slide)
      return res
        .status(404)
        .json({ success: false, message: "Slide not found" });
    res.status(200).json({ success: true, data: slide });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSlide = async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    if (!slide)
      return res
        .status(404)
        .json({ success: false, message: "Slide not found" });
    await slide.deleteOne();
    res.status(200).json({ success: true, message: "Slide deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reorderSlides = async (req, res) => {
  try {
    const { items } = req.body; // [{ id, order }]
    if (!Array.isArray(items) || items.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "items must be a non-empty array" });
    const ops = items.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: Number(order) } },
      },
    }));
    await Slide.bulkWrite(ops, { ordered: false });
    res.status(200).json({ success: true, message: "Order updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
};
