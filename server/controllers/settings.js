// settings.js controller
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get settings for a user
exports.getSettings = async (req, res) => {
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // First, attempt to find existing settings
    let userSettings = await prisma.settings.findFirst({
      where: {
        userId: userId
      }
    });

    // If no settings exist yet, create default settings
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: {
          userId: userId,
          orders: true,
          products: true,
          blog: true,
          users: true
        }
      });
    }

    return res.status(200).json(userSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// Update settings for a user
exports.updateSettings = async (req, res) => {
  const userId = req.query.userId;
  const { orders, products, blog, users } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // First, check if settings exist for this user
    const existingSettings = await prisma.settings.findFirst({
      where: {
        userId: userId
      }
    });

    let updatedSettings;
    
    if (existingSettings) {
      // If settings exist, update them
      updatedSettings = await prisma.settings.update({
        where: {
          id: existingSettings.id // Use the id we found
        },
        data: {
          orders: orders !== undefined ? orders : existingSettings.orders,
          products: products !== undefined ? products : existingSettings.products,
          blog: blog !== undefined ? blog : existingSettings.blog,
          users: users !== undefined ? users : existingSettings.users
        }
      });
    } else {
      // If no settings exist, create them
      updatedSettings = await prisma.settings.create({
        data: {
          userId: userId,
          orders: orders !== undefined ? orders : true,
          products: products !== undefined ? products : true,
          blog: blog !== undefined ? blog : true,
          users: users !== undefined ? users : true
        }
      });
    }

    return res.status(200).json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return res.status(500).json({ error: "Failed to update settings" });
  }
};