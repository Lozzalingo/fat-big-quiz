const fs = require('fs').promises;
const path = require('path');

async function listImages(req, res) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { folderName } = req.query;

    // Validate folderName - only allow specific folders
    if (!folderName || !['blog-body', 'products'].includes(folderName)) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }

    // Set the directory path
    const imageDirectory = path.join(__dirname, '../images', folderName);

    // Check if directory exists
    try {
      await fs.access(imageDirectory);
    } catch {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Read directory contents
    const files = await fs.readdir(imageDirectory);

    // Filter to only include image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // Create URLs for each image
    const imageUrls = imageFiles.map(file => ({
      filename: file,
      url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/server/images/${folderName}/${file}`
    }));

    res.status(200).json({ images: imageUrls });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
}

module.exports = {
  listImages,
};