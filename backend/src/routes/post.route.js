import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  hidePost,
  notInterested,
  recordView,
} from "../controllers/algorithm.controller.js";
import { recalculatePostHashtags } from "../controllers/hashtag.controller.js";
import {
  addComment,
  addReply,
  createPost,
  deleteComment,
  deletePost,
  editComment,
  getFeed,
  getComments,
  getProfilePosts,
  repost,
  sharePost,
  toggleCommentLike,
  toggleCommentPin,
  toggleDislike,
  toggleLike,
  togglePostArchive,
  togglePostPin,
  toggleSave,
} from "../controllers/post.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/feed", getFeed);
router.post("/", createPost);
router.get("/user/:id", getProfilePosts);
router.post("/:id/repost", repost);
router.post("/:id/share", sharePost);
router.delete("/:id", deletePost);
router.post("/:id/view", recordView);
router.post("/:id/hide", hidePost);
router.post("/:id/not-interested", notInterested);
router.put("/:id/like", toggleLike);
router.put("/:id/dislike", toggleDislike);
router.put("/:id/save", toggleSave);
router.put("/:id/archive", togglePostArchive);
router.put("/:id/pin", togglePostPin);
router.post("/:id/hashtags/recalculate", recalculatePostHashtags);
router.get("/:id/comments", getComments);
router.post("/:id/comments/:commentId/replies", addReply);
router.post("/:id/comments", addComment);
router.put("/:id/comments/:commentId", editComment);
router.delete("/:id/comments/:commentId", deleteComment);
router.put("/:id/comments/:commentId/like", toggleCommentLike);
router.put("/:id/comments/:commentId/pin", toggleCommentPin);

export default router;
