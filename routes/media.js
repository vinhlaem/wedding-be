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
const { lightQueue, heavyQueue } = require("../middleware/requestQueue");
const { verifyJWT } = require("../middleware/authMiddleware");

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

// Light operations — moderate concurrency
router.get("/", lightQueue, getMedia);
router.post("/", verifyJWT, lightQueue, createMedia);
router.put("/:id", verifyJWT, lightQueue, updateMedia);
router.delete("/:id", verifyJWT, lightQueue, deleteMedia);
router.patch("/reorder", verifyJWT, lightQueue, reorderMedia);

// Heavy operations — sequential (concurrency=1) to protect weak host
router.post(
  "/upload",
  verifyJWT,
  heavyQueue,
  upload.single("file"),
  uploadMedia,
);
router.post("/import-drive", verifyJWT, heavyQueue, importFromDrive);

module.exports = router;
