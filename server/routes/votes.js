const express = require("express");
const router = express.Router();
const { voteComment, getVotes, getUserVote } = require("../controllers/votes");

// Vote on a comment
router.post("/:id/vote", voteComment);

// Get vote counts for a comment
router.get("/:id/votes", getVotes);

// Get user's vote on a comment
router.get("/:id/votes/:userId", getUserVote);

module.exports = router;