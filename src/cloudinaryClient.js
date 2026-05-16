require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadMedia(localFilePath) {
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      folder: 'realty-bot/processed',
    });
    return result.secure_url;
  } catch (err) {
    console.error('[Cloudinary] Upload failed:', err.message);
    throw err;
  } finally {
    try {
      fs.unlinkSync(localFilePath);
    } catch (_) {}
  }
}

module.exports = { uploadMedia };
