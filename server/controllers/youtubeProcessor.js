// controllers/youtubeProcessor.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

/**
 * Process a YouTube video and convert it to a blog post
 * @param {Object} req - Express request object with YouTube URL in body
 * @param {Object} res - Express response object
 */
async function processYoutubeVideo(req, res) {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    // Create a unique output file for this request
    const timestamp = Date.now();
    const outputFile = path.join(__dirname, '..', 'temp', `blog_${timestamp}.json`);
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Path to the python script
    const scriptPath = path.join(__dirname, '..', 'scripts', 'youtube_processor.py');
    
    // Run the Python script as a child process
    const command = `python3 ${scriptPath} --url "${url}" --output "${outputFile}"`;
    
    console.log(`Executing command: ${command}`);
    
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error.message}`);
        return res.status(500).json({ error: 'Failed to process YouTube video', details: error.message });
      }
      
      if (stderr) {
        console.error(`Python script stderr: ${stderr}`);
      }
      
      console.log(`Python script stdout: ${stdout}`);
      
      try {
        // Check if output file exists
        if (!fs.existsSync(outputFile)) {
          return res.status(500).json({ error: 'Output file was not generated' });
        }
        
        // Read the generated blog post JSON file
        const blogData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        
        // Clean up the temp file
        fs.unlinkSync(outputFile);
        
        // Post to the blog API endpoint to create the blog post
        const apiUrl = `${req.protocol}://${req.get('host')}/api/blog`;
        const blogResponse = await axios.post(apiUrl, blogData);
        
        return res.status(201).json({
          message: 'Blog post successfully created from YouTube video',
          blog: blogResponse.data
        });
      } catch (fileError) {
        console.error(`Error processing output file: ${fileError.message}`);
        return res.status(500).json({ error: 'Error processing blog data', details: fileError.message });
      }
    });
  } catch (error) {
    console.error(`Error in processYoutubeVideo: ${error.message}`);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

/**
 * Process a YouTube video and return the generated blog data without creating it
 * @param {Object} req - Express request object with YouTube URL in body
 * @param {Object} res - Express response object
 */
async function previewYoutubeVideo(req, res) {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    // Create a unique output file for this request
    const timestamp = Date.now();
    const outputFile = path.join(__dirname, '..', 'temp', `preview_${timestamp}.json`);
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Path to the python script
    const scriptPath = path.join(__dirname, '..', 'scripts', 'youtube_processor.py');
    
    // Run the Python script as a child process
    const command = `python3 ${scriptPath} --url "${url}" --output "${outputFile}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error.message}`);
        return res.status(500).json({ error: 'Failed to process YouTube video', details: error.message });
      }
      
      if (stderr) {
        console.error(`Python script stderr: ${stderr}`);
      }
      
      try {
        // Check if output file exists
        if (!fs.existsSync(outputFile)) {
          return res.status(500).json({ error: 'Output file was not generated' });
        }
        
        // Read the generated blog post JSON file
        const blogData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        
        // Clean up the temp file
        fs.unlinkSync(outputFile);
        
        return res.status(200).json({
          message: 'Blog post preview generated from YouTube video',
          preview: blogData
        });
      } catch (fileError) {
        console.error(`Error processing output file: ${fileError.message}`);
        return res.status(500).json({ error: 'Error processing blog data', details: fileError.message });
      }
    });
  } catch (error) {
    console.error(`Error in previewYoutubeVideo: ${error.message}`);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

module.exports = {
  processYoutubeVideo,
  previewYoutubeVideo
};