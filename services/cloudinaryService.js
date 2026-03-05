const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer or stream directly to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} folder  - Destination folder in Cloudinary (e.g. "wedding/banner")
 * @param {"image"|"video"} resourceType - Cloudinary resource type
 * @returns {Promise<{ imageUrl: string, publicId: string }>}
 */
const uploadBufferToCloudinary = (
  buffer,
  folder = "wedding",
  resourceType = "image",
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation:
          resourceType === "image"
            ? [{ quality: "auto", fetch_format: "auto" }]
            : undefined,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Delete an image from Cloudinary by its public ID
 * @param {string} publicId
 */
const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { uploadBufferToCloudinary, deleteFromCloudinary };
