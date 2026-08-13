const prisma = require("../utils/prisma");
  const bcrypt = require("bcryptjs");

  // Strip password from user object before sending to client
  function sanitiseUser(user) {
    if (!user) return user;
    const { password, ...safe } = user;
    return safe;
  }

  async function getAllUsers(request, response) {
    try {
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 50;
      console.log(`[User] Fetching users (page ${page}, limit ${limit})`);
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count(),
      ]);
      console.log(`[User] Found ${users.length} of ${total} users`);
      return response.json({
        users: users.map(sanitiseUser),
        pagination: { total, pages: Math.ceil(total / limit), currentPage: page, perPage: limit },
      });
    } catch (error) {
      console.error("[User] Error fetching users:", error.message);
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
        console.log("[User] Create rejected - missing email or password");
        return response.status(400).json({ error: "Email and password are required." });
      }

      const normalisedEmail = email.toLowerCase().trim();
      console.log("[User] Creating user:", normalisedEmail);

      // Check for duplicate email
      const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
      if (existing) {
        console.log("[User] Duplicate email rejected:", normalisedEmail);
        return response.status(409).json({ error: "A user with this email already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        email: normalisedEmail,
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
      console.log("[User] Created successfully:", user.id);
      return response.status(201).json(sanitiseUser(user));
    } catch (error) {
      console.error("[User] Error creating user:", error.message);
      return response.status(500).json({ error: "Error creating user" });
    }
  }

  async function updateUser(request, response) {
    try {
      const { id } = request.params;
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

      console.log("[User] Updating user:", id);

      const updateData = {};

      if (email) updateData.email = email.toLowerCase().trim();
      if (role) updateData.role = role;
      if (subscribedAt) updateData.subscribedAt = subscribedAt;
      if (avatar) updateData.avatar = avatar;
      if (bio) updateData.bio = bio;
      if (userName) updateData.userName = userName;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      if (Object.keys(updateData).length === 0) {
        console.log("[User] Update rejected - no fields provided");
        return response.status(400).json({ error: "No fields provided to update." });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      console.log("[User] Updated successfully:", id);
      return response.status(200).json(sanitiseUser(updatedUser));
    } catch (error) {
      console.error("[User] Error updating user:", error.message);
      return response.status(500).json({ error: "Error updating user" });
    }
  }

  async function getUserComments(request, response) {
    try {
      const { id: userId } = request.params;

      if (!userId) {
        return response.status(400).json({ error: "User ID is required" });
      }

      console.log("[User] Fetching comments for user:", userId);

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

      console.log(`[User] Found ${processedComments.length} comments for user ${userId}`);
      response.status(200).json(processedComments);
    } catch (error) {
      console.error("[User] Error getting user comments:", error.message);
      response.status(500).json({ error: "Error fetching user comments" });
    }
  }

  async function getUserVotes(request, response) {
    try {
      const { id: userId } = request.params;

      if (!userId) {
        return response.status(400).json({ error: "User ID is required" });
      }

      console.log("[User] Fetching votes for user:", userId);

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
          voteType: vote.type === "upvote" ? "up" : "down",
          createdAt: vote.createdAt,
          user: vote.user,
          comment: vote.comment
        };
      });

      console.log(`[User] Found ${processedVotes.length} votes for user ${userId}`);
      response.status(200).json(processedVotes);
    } catch (error) {
      console.error("[User] Error getting user votes:", error.message);
      response.status(500).json({ error: "Error fetching user votes" });
    }
  }

  async function deleteUser(request, response) {
    try {
      const { id } = request.params;
      console.log("[User] Deleting user:", id);
      await prisma.user.delete({
        where: {
          id: id,
        },
      });
      console.log("[User] Deleted successfully:", id);
      return response.status(204).send();
    } catch (error) {
      console.error("[User] Error deleting user:", error.message);
      return response.status(500).json({ error: "Error deleting user" });
    }
  }

  async function getUser(request, response) {
    try {
      const { id } = request.params;
      console.log("[User] Fetching user by ID:", id);
      const user = await prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (!user) {
        console.log("[User] Not found by ID:", id);
        return response.status(404).json({ error: "User not found" });
      }
      return response.status(200).json(sanitiseUser(user));
    } catch (error) {
      console.error("[User] Error fetching user by ID:", error.message);
      return response.status(500).json({ error: "Error fetching user" });
    }
  }

  async function getUserByEmail(request, response) {
    try {
      const { email } = request.params;
      const normalisedEmail = email.toLowerCase().trim();
      console.log("[User] Fetching user by email:", normalisedEmail);
      const user = await prisma.user.findUnique({
        where: {
          email: normalisedEmail,
        },
      });
      if (!user) {
        console.log("[User] Not found by email:", normalisedEmail);
        return response.status(404).json({ error: "User not found" });
      }
      return response.status(200).json(sanitiseUser(user));
    } catch (error) {
      console.error("[User] Error fetching user by email:", error.message);
      return response.status(500).json({ error: "Error fetching user" });
    }
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
