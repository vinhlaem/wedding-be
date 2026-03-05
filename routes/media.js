const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  getMedia,
  createMedia,
  updateMedia,
  deleteMedia,
  uploadMedia,
  importFromDrive,
  reorderMedia,
} = require("../controllers/mediaController");

// Use memory storage so we can pipe the buffer to Cloudinary directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (
      !file.mimetype.startsWith("image/") &&
      !file.mimetype.startsWith("video/")
    ) {
      return cb(new Error("Only image and video files are allowed"), false);
    }
    cb(null, true);
  },
});

router.get("/", getMedia);
router.post("/", createMedia);
router.put("/:id", updateMedia);
router.delete("/:id", deleteMedia);

router.post("/upload", upload.single("file"), uploadMedia);
router.post("/import-drive", importFromDrive);
router.patch("/reorder", reorderMedia);

module.exports = router;
