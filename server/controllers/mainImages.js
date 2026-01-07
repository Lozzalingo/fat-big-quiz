const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function uploadMainImage(req, res) {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No files were uploaded" });
    }

    const uploadedFile = req.files.uploadedFile;
    const oldImage = req.body.oldImage;
    const isBlogImage = true; // Force blog image handling since this is for blog posts

    // Set the save directory to public/uploads/ for blog images
    const saveDirectory = '../../public/uploads/';
    const fullSaveDirectory = path.join(__dirname, saveDirectory);

    // Log for debugging
    console.log('__dirname:', __dirname);
    console.log('Save directory:', fullSaveDirectory);

    // Ensure the public and uploads directories exist
    if (!fs.existsSync(fullSaveDirectory)) {
      fs.mkdirSync(fullSaveDirectory, { recursive: true });
      console.log(`Created directory: ${fullSaveDirectory}`);
    }

    // Generate a timestamp to make filename unique
    const timestamp = new Date().getTime();
    const fileExtension = path.extname(uploadedFile.name);
    const baseName = path.basename(uploadedFile.name, fileExtension);
    const newFilename = `${baseName}_${timestamp}${fileExtension}`;

    // If oldImage exists, try to delete it
    if (oldImage) {
      const oldImagePath = path.join(__dirname, '../../public/uploads/', oldImage);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log(`Deleted old image: ${oldImagePath}`);
        }
      } catch (err) {
        console.error(`Error deleting old image: ${err}`);
      }
    }

    // Save the new file
    const savePath = path.join(__dirname, saveDirectory, newFilename);
    console.log('Saving file to:', savePath);

    uploadedFile.mv(savePath, (err) => {
      if (err) {
        console.error(`Error saving file: ${err}`);
        return res.status(500).json({ error: "Failed to save file", details: err.message });
      }

      res.status(200).json({
        message: "File uploaded successfully",
        filename: newFilename,
      });
    });
  } catch (error) {
    console.error(`Upload error: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

module.exports = {
  uploadMainImage,
};