import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  acceptFollowRequest,
  blockUser,
  declineFollowRequest,
  followUser,
  getCallHistory,
  getDebug,
  getFollowRequests,
  getFollowerList,
  getFriendRequests,
  getMyFriends,
  getOutgoingFriendReqs,
  getUserProfile,
  updateMyInterests,
  getRecommendedUsers,
  getSuggestions,
  searchUsers,
  dismissSuggestion,
  removeFollower,
  sendFriendRequest,
  unblockUser,
  unfollowUser,
  updateMySettings,
} from "../controllers/user.controller.js";

const router = express.Router();

// apply auth middleware to all routes
router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/search", searchUsers);
router.get("/suggestions", getSuggestions);
router.get("/suggestions/:mode", getSuggestions);
router.post("/suggestions/:id/not-interested", dismissSuggestion);
router.get("/friends", getMyFriends);
router.patch("/me/settings", updateMySettings);
router.post("/me/interests", updateMyInterests);
router.patch("/me/interests", updateMyInterests);
router.get("/debug/local", getDebug);
router.get("/calls/history", getCallHistory);
router.get("/:id/follows", getFollowerList);

router.post("/:id/follow", followUser);
router.delete("/:id/follow", unfollowUser);
router.delete("/:id/follower", removeFollower);
router.post("/:id/block", blockUser);
router.delete("/:id/block", unblockUser);
router.get("/follow-requests", getFollowRequests);
router.put("/follow-request/:id/accept", acceptFollowRequest);
router.put("/follow-request/:id/decline", declineFollowRequest);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutgoingFriendReqs);
router.get("/:id", getUserProfile);

export default router;
