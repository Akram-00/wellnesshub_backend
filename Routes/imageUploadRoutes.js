const express = require('express');
const router = express.Router();
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const sharp = require('sharp');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/uploadimage', upload.single('myimage'), async (req, res) => {
    const file = req.file;
    const folderName = req.body.folderName; // Get folder name from request body

    if (!file) {
        return res.status(400).json({ ok: false, error: 'No image file provided' });
    }

    sharp(file.buffer)
        .resize({ width: 800 })
        .toBuffer(async (err, data, info) => {
            if (err) {
                console.error('Image processing error:', err);
                return res.status(500).json({ ok: false, error: 'Error processing image' });
            }

            cloudinary.uploader.upload_stream({ resource_type: 'auto', folder: folderName }, async (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error:', error);
                    return res.status(500).json({ ok: false, error: 'Error uploading image to Cloudinary' });
                }

                res.json({ ok: true, imageUrl: result.url, imageId: result.public_id, message: 'Image uploaded successfully' });
            }).end(data);
        })
});

router.delete('/deletecloudinaryimages', async (req, res) => {
  try {
    const { publicId } = req.body; // Assuming an array of public IDs is sent in the request body

    // Delete resources using public IDs
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })


    res.json({ok:true, message: 'Images deleted successfully' ,data:result, id:publicId});
  } catch (error) {
    console.error("Error deleting images:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;