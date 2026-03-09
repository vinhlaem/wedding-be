const Media = require("../models/Media");
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} = require("../services/cloudinaryService");
const { importFromGoogleDrive } = require("../services/googleDriveService");

// Only return fields the client actually needs — omit __v and large unused fields.
const MEDIA_PROJECTION = {
  imageUrl: 1,
  cloudinaryPublicId: 1,
  order: 1,
  role: 1,
  mediaType: 1,
  component: 1,
  source: 1,
  createdAt: 1,
};

// ─── GET /api/media?component=banner&role=wife ───────────────────────────────────────────────────────
const getMedia = async (req, res) => {
  try {
    const { component, role } = req.query;
    const filter = {};
    if (component) filter.component = component;
    if (role) filter.role = role;

    // lean() returns plain JS objects (no Mongoose overhead) — faster + less RAM.
    const media = await Media.find(filter, MEDIA_PROJECTION)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Public media is immutable until an admin changes it.
    // Cache at CDN/browser for 60 s, serve stale for up to 5 min while revalidating.
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.status(200).json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/media ─────────────────────────────────────────────────────────
const createMedia = async (req, res) => {
  try {
    const {
      component,
      imageUrl,
      cloudinaryPublicId,
      order,
      source,
      role,
      mediaType,
    } = req.body;
    if (!component || !imageUrl || !cloudinaryPublicId) {
      return res.status(400).json({
        success: false,
        message: "component, imageUrl, and cloudinaryPublicId are required",
      });
    }
    const media = await Media.create({
      component,
      imageUrl,
      cloudinaryPublicId,
      order,
      source,
      role: role || null,
      mediaType: mediaType || "image",
    });
    res.status(201).json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/media/:id ───────────────────────────────────────────────────────
const updateMedia = async (req, res) => {
  try {
    const media = await Media.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!media)
      return res
        .status(404)
        .json({ success: false, message: "Media not found" });
    res.status(200).json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /api/media/:id ───────────────────────────────────────────────────
const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media)
      return res
        .status(404)
        .json({ success: false, message: "Media not found" });

    // Remove from Cloudinary
    if (media.cloudinaryPublicId) {
      await deleteFromCloudinary(media.cloudinaryPublicId);
    }

    await media.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Media deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/media/upload ──────────────────────────────────────────────────
// Expects multipart/form-data with fields: file (binary), component, order, role, mediaType
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    const {
      component = "gallery",
      order = 0,
      role,
      mediaType = "image",
    } = req.body;
    const folder = `wedding/${component}`;

    const { imageUrl, publicId } = await uploadBufferToCloudinary(
      req.file.buffer,
      folder,
      mediaType === "video" ? "video" : "image",
    );

    const media = await Media.create({
      component,
      imageUrl,
      cloudinaryPublicId: publicId,
      order: Number(order),
      source: "upload",
      role: role || null,
      mediaType,
    });

    res.status(201).json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/media/import-drive ────────────────────────────────────────────
// Body: { component, driveFileId, accessToken, order, role }
const importFromDrive = async (req, res) => {
  try {
    const {
      component = "gallery",
      driveFileId,
      accessToken,
      order = 0,
      role,
    } = req.body;

    if (!driveFileId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "driveFileId and accessToken are required",
      });
    }

    const folder = `wedding/${component}`;
    const { imageUrl, publicId } = await importFromGoogleDrive(
      driveFileId,
      accessToken,
      folder,
    );

    const media = await Media.create({
      component,
      imageUrl,
      cloudinaryPublicId: publicId,
      order: Number(order),
      source: "google-drive",
      role: role || null,
      mediaType: "image",
    });

    res.status(201).json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /api/media/reorder ────────────────────────────────────────────────
// Body: { items: [{ id, order }] }
const reorderMedia = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "items must be a non-empty array" });
    }

    // Use a single bulkWrite instead of N individual findByIdAndUpdate calls.
    // This sends one round-trip to MongoDB regardless of how many items there are.
    const ops = items.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: Number(order) } },
      },
    }));
    await Media.bulkWrite(ops, { ordered: false }); // ordered:false = max parallelism inside Mongo

    res.status(200).json({ success: true, message: "Order updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMedia,
  createMedia,
  updateMedia,
  deleteMedia,
  uploadMedia,
  importFromDrive,
  reorderMedia,
};
