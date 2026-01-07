const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Get all comments for a post
 * GET /api/comments/post/:postId
 */
async function getPostComments(req, res) {
  try {
    const { postId } = req.params;
    
    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
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
      
      // Remove votes array from response to avoid sending too much data
      const { votes, ...commentWithoutVotes } = comment;
      
      return {
        ...commentWithoutVotes,
        upCount,
        downCount
      };
    });

    res.status(200).json(processedComments);
  } catch (error) {
    console.error(`Error getting comments: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

/**
 * Create a new comment
 * POST /api/comments
 */
async function createComment(req, res) {
  try {
    const { message, userId, postId, parentId, mentions } = req.body;
    
    if (!message || !userId || !postId) {
      return res.status(400).json({ error: "Message, user ID, and post ID are required" });
    }

    const newComment = await prisma.comment.create({
      data: {
        message,
        userId,
        postId,
        parentId: parentId || null
      },
      include: {
        user: {
          select: {
            userName: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Add upCount and downCount properties to match the expected format
    const commentWithCounts = {
      ...newComment,
      upCount: 0,
      downCount: 0
    };

    res.status(201).json(commentWithCounts);
  } catch (error) {
    console.error(`Error creating comment: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

/**
 * Update a comment
 * PUT /api/comments/:id
 */
async function updateComment(req, res) {
  try {
    const { id } = req.params;
    const { message, mentions } = req.body;
    
    if (!id || !message) {
      return res.status(400).json({ error: "Comment ID and message are required" });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { message },
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

    // Process comment to include vote counts
    const upCount = updatedComment.votes.filter(vote => vote.type === "upvote").length;
    const downCount = updatedComment.votes.filter(vote => vote.type === "downvote").length;
    
    // Remove votes array from response
    const { votes, ...commentWithoutVotes } = updatedComment;
    
    const processedComment = {
      ...commentWithoutVotes,
      upCount,
      downCount
    };

    res.status(200).json(processedComment);
  } catch (error) {
    console.error(`Error updating comment: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
async function deleteComment(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    // First, recursively delete all child comments
    await deleteChildComments(id);

    // Then delete the comment itself
    await prisma.comment.delete({
      where: { id }
    });

    res.status(200).json({ message: "Comment and its replies deleted successfully" });
  } catch (error) {
    console.error(`Error deleting comment: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

/**
 * Helper function to recursively delete child comments
 */
async function deleteChildComments(parentId) {
  // Find all direct child comments
  const childComments = await prisma.comment.findMany({
    where: { parentId }
  });

  // For each child, recursively delete its children
  for (const child of childComments) {
    await deleteChildComments(child.id);
  }

  // Delete all direct child comments at once if any exist
  if (childComments.length > 0) {
    await prisma.comment.deleteMany({
      where: { parentId }
    });
  }
}

/**
 * Get a single comment by ID
 * GET /api/comments/:id
 */
async function getComment(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
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

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Process comment to include vote counts
    const upCount = comment.votes.filter(vote => vote.type === "upvote").length;
    const downCount = comment.votes.filter(vote => vote.type === "downvote").length;
    
    // Remove votes array from response
    const { votes, ...commentWithoutVotes } = comment;
    
    const processedComment = {
      ...commentWithoutVotes,
      upCount,
      downCount
    };

    res.status(200).json(processedComment);
  } catch (error) {
    console.error(`Error getting comment: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

module.exports = {
  getPostComments,
  createComment,
  updateComment,
  deleteComment,
  getComment
};