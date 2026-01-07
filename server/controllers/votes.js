const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Handle voting on a comment
 * POST /api/comments/:id/vote
 */
async function voteComment(req, res) {
  try {
    const { id: commentId } = req.params;
    const { userId, upvote } = req.body;

    // Validate inputs
    if (!commentId || !userId) {
      return res.status(400).json({ error: "Comment ID and User ID are required" });
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user has already voted on this comment
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_commentId: {
          userId: userId,
          commentId: commentId
        }
      }
    });

    // Determine vote type based on upvote parameter
    const voteType = upvote ? "upvote" : "downvote";

    if (existingVote) {
      // If user already voted with the same vote type, remove their vote (toggle off)
      if (existingVote.type === voteType) {
        await prisma.vote.delete({
          where: {
            id: existingVote.id
          }
        });
        
        // Return updated vote counts
        const upvotes = await prisma.vote.count({
          where: {
            commentId: commentId,
            type: "upvote"
          }
        });
        
        const downvotes = await prisma.vote.count({
          where: {
            commentId: commentId,
            type: "downvote"
          }
        });
        
        return res.status(200).json({
          message: "Vote removed",
          upCount: upvotes,
          downCount: downvotes
        });
      } else {
        // If user voted differently before, update their vote
        await prisma.vote.update({
          where: {
            id: existingVote.id
          },
          data: {
            type: voteType
          }
        });
      }
    } else {
      // Create new vote
      await prisma.vote.create({
        data: {
          type: voteType,
          userId: userId,
          commentId: commentId
        }
      });
    }

    // Count updated votes
    const upvotes = await prisma.vote.count({
      where: {
        commentId: commentId,
        type: "upvote"
      }
    });
    
    const downvotes = await prisma.vote.count({
      where: {
        commentId: commentId,
        type: "downvote"
      }
    });

    res.status(200).json({
      message: "Vote recorded successfully",
      upCount: upvotes,
      downCount: downvotes
    });
  } catch (error) {
    console.error(`Vote error: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

/**
 * Get vote counts for a comment
 * GET /api/comments/:id/votes
 */
async function getVotes(req, res) {
  try {
    const { id: commentId } = req.params;

    // Validate commentId
    if (!commentId) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Count votes
    const upvotes = await prisma.vote.count({
      where: {
        commentId: commentId,
        type: "upvote"
      }
    });
    
    const downvotes = await prisma.vote.count({
      where: {
        commentId: commentId,
        type: "downvote"
      }
    });

    res.status(200).json({
      upCount: upvotes,
      downCount: downvotes
    });
  } catch (error) {
    console.error(`Get votes error: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

/**
 * Get user's vote on a comment
 * GET /api/comments/:id/votes/:userId
 */
async function getUserVote(req, res) {
  try {
    const { id: commentId, userId } = req.params;

    // Validate inputs
    if (!commentId || !userId) {
      return res.status(400).json({ error: "Comment ID and User ID are required" });
    }

    // Find user's vote
    const vote = await prisma.vote.findUnique({
      where: {
        userId_commentId: {
          userId: userId,
          commentId: commentId
        }
      }
    });

    if (!vote) {
      return res.status(200).json({ vote: null });
    }

    res.status(200).json({ vote: vote.type });
  } catch (error) {
    console.error(`Get user vote error: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

module.exports = {
  voteComment,
  getVotes,
  getUserVote
};