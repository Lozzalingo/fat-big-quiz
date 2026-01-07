// routes/comments.js
const express = require("express");
const router = express.Router();
const { getPostComments, createComment, updateComment, deleteComment, getComment } = require("../controllers/comments");
const { voteComment, getVotes, getUserVote } = require("../controllers/votes");

// Post routes
router.get("/post/:postId", getPostComments);
router.post("/", createComment);

// Comment routes by ID
router.get("/:id", getComment);
router.put("/:id", updateComment);
router.delete("/:id", deleteComment);

// Vote routes
router.post("/:id/vote", voteComment);
router.get("/:id/votes", getVotes);
router.get("/:id/votes/:userId", getUserVote);

module.exports = router;