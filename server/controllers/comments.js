const prisma = require("../utils/prisma");

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
        _count: {
          select: {
            votes: { where: { type: "upvote" } },
          },
        },
      }
    });

    // Prisma filtered counts don't support multiple filters on same relation,
    // so we get upvotes via _count and compute downvotes separately
    const commentIds = comments.map(c => c.id);
    const downvoteCounts = await prisma.vote.groupBy({
      by: ['commentId'],
      where: { commentId: { in: commentIds }, type: "downvote" },
      _count: true,
    });
    const downMap = new Map(downvoteCounts.map(d => [d.commentId, d._count]));

    const processedComments = comments.map(comment => {
      const { _count, ...rest } = comment;
      return {
        ...rest,
        upCount: _count.votes,
        downCount: downMap.get(comment.id) || 0,
      };
    });

    res.status(200).json(processedComments);
  } catch (error) {
    console.error("[Comments] Error getting comments:", error);
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
    console.error("[Comments] Error creating comment:", error);
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
      }
    });

    // Get vote counts efficiently
    const [upCount, downCount] = await Promise.all([
      prisma.vote.count({ where: { commentId: id, type: "upvote" } }),
      prisma.vote.count({ where: { commentId: id, type: "downvote" } }),
    ]);

    const processedComment = {
      ...updatedComment,
      upCount,
      downCount
    };

    res.status(200).json(processedComment);
  } catch (error) {
    console.error("[Comments] Error updating comment:", error);
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

    // Cascade delete handles child comments automatically via schema
    await prisma.comment.delete({
      where: { id }
    });

    res.status(200).json({ message: "Comment and its replies deleted successfully" });
  } catch (error) {
    console.error("[Comments] Error deleting comment:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

// deleteChildComments removed - cascade delete handles this via schema onDelete: Cascade

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

    const [comment, upCount, downCount] = await Promise.all([
      prisma.comment.findUnique({
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
        }
      }),
      prisma.vote.count({ where: { commentId: id, type: "upvote" } }),
      prisma.vote.count({ where: { commentId: id, type: "downvote" } }),
    ]);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.status(200).json({ ...comment, upCount, downCount });
  } catch (error) {
    console.error("[Comments] Error getting comment:", error);
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