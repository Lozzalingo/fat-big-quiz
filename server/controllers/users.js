  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const bcrypt = require("bcryptjs");

  async function getAllUsers(request, response) {
    try {
      const users = await prisma.user.findMany({});
      return response.json(users);
    } catch (error) {
      return response.status(500).json({ error: "Error fetching users" });
    }
  }

  async function createUser(request, response) {
    try {
      const {
        email,
        password,
        role,
        subscribedAt,
        avatar,
        bio,
        userName,
        firstName,
        lastName,
      } = request.body;

      if (!email || !password) {
        return response.status(400).json({ error: "Email and password are required." });
      }

      const hashedPassword = await bcrypt.hash(password, 5);

      const userData = {
        email,
        password: hashedPassword,
        ...(role && { role }),
        ...(subscribedAt && { subscribedAt }),
        ...(avatar && { avatar }),
        ...(bio && { bio }),
        ...(userName && { userName }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      };

      const user = await prisma.user.create({ data: userData });
      return response.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      return response.status(500).json({ error: "Error creating user" });
    }
  }

  async function updateUser(request, response) {
    try {
      const { id } = request.params; // Assuming user ID is passed in the URL
      const {
        email,
        password,
        role,
        subscribedAt,
        avatar,
        bio,
        userName,
        firstName,
        lastName,
      } = request.body;

      const updateData = {};

      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (subscribedAt) updateData.subscribedAt = subscribedAt;
      if (avatar) updateData.avatar = avatar;
      if (bio) updateData.bio = bio;
      if (userName) updateData.userName = userName;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (password) updateData.password = await bcrypt.hash(password, 5);

      if (Object.keys(updateData).length === 0) {
        return response.status(400).json({ error: "No fields provided to update." });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      return response.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      return response.status(500).json({ error: "Error updating user" });
    }
  }

  async function getUserComments(request, response) {
    try {
      const { id: userId } = request.params;
      
      if (!userId) {
        return response.status(400).json({ error: "User ID is required" });
      }

      const comments = await prisma.comment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              userName: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          votes: true
        }
      });

      // Process comments to include vote counts
      const processedComments = comments.map(comment => {
        const upCount = comment.votes.filter(vote => vote.type === "upvote").length;
        const downCount = comment.votes.filter(vote => vote.type === "downvote").length;
        
        const { votes, ...commentWithoutVotes } = comment;
        
        return {
          ...commentWithoutVotes,
          upCount,
          downCount
        };
      });

      response.status(200).json(processedComments);
    } catch (error) {
      console.error(`Error getting user comments: ${error}`);
      response.status(500).json({ error: "Server error", details: error.message });
    }
  }

  async function getUserVotes(request, response) {
    try {
      const { id: userId } = request.params;
      
      if (!userId) {
        return response.status(400).json({ error: "User ID is required" });
      }
      
      // Finding votes given by this user
      const votes = await prisma.vote.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              userName: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          comment: {
            include: {
              user: {
                select: {
                  id: true,
                  userName: true,
                  avatar: true
                }
              }
            }
          }
        }
      });
      
      // Process votes to match the frontend's expected format
      const processedVotes = votes.map(vote => {
        return {
          id: vote.id,
          userId: vote.userId,
          commentId: vote.commentId,
          voteType: vote.type === "upvote" ? "up" : "down", // Convert to match frontend expectations
          createdAt: vote.createdAt,
          user: vote.user,
          comment: vote.comment
        };
      });
      
      response.status(200).json(processedVotes);
    } catch (error) {
      console.error(`Error getting user votes: ${error}`);
      response.status(500).json({ error: "Server error", details: error.message });
    }
  }

  async function deleteUser(request, response) {
    try {
      const { id } = request.params;
      await prisma.user.delete({
        where: {
          id: id,
        },
      });
      return response.status(204).send();
    } catch (error) {
      console.log(error);
      return response.status(500).json({ error: "Error deleting user" });
    }
  }

  async function getUser(request, response) {
    const { id } = request.params;
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }
    return response.status(200).json(user);
  }

  async function getUserByEmail(request, response) {
    const { email } = request.params;
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }
    return response.status(200).json(user);
  }

  module.exports = {
    createUser,
    updateUser,
    deleteUser,
    getUser,
    getAllUsers,
    getUserByEmail,
    getUserComments,
    getUserVotes,
  };
