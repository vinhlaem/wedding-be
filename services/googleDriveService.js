const axios = require("axios");
const { uploadBufferToCloudinary } = require("./cloudinaryService");

/**
 * Given a Google Drive file ID and a valid OAuth access token,
 * download the file and upload it to Cloudinary.
 *
 * @param {string} driveFileId  - Google Drive file ID
 * @param {string} accessToken  - Google OAuth2 access token from the frontend
 * @param {string} folder       - Cloudinary destination folder
 * @returns {Promise<{ imageUrl: string, publicId: string }>}
 */
const importFromGoogleDrive = async (
  driveFileId,
  accessToken,
  folder = "wedding",
) => {
  // 1. Download the file from Google Drive using the user's access token
  const response = await axios.get(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: "arraybuffer",
    },
  );

  const buffer = Buffer.from(response.data);

  // 2. Upload the buffer to Cloudinary
  const result = await uploadBufferToCloudinary(buffer, folder);
  return result;
};

module.exports = { importFromGoogleDrive };
