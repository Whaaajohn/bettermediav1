import {
  acceptFriendRequestFor,
  blockUserFor,
  createFriendRequest,
  followUserFor,
  getCallHistoryFor,
  getDebugInfo,
  getFollowRequestsFor,
  getFollowersFor,
  getFriendRequestsFor,
  getFriendsFor,
  getInterestOptionsFor,
  getOutgoingFriendRequestsFor,
  getPublicUserById,
  getSuggestionsFor,
  getUserProfileFor,
  dismissSuggestionFor,
  resolveFollowRequestFor,
  removeFollowerFor,
  searchUsersFor,
  unblockUserFor,
  unfollowUserFor,
  updateUserInterestsFor,
  updateUser,
} from "../lib/localStore.js";

function sendError(res, error, fallback = "Internal server error") {
  res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || "ERROR",
  });
}

export async function getRecommendedUsers(req, res) {
  try {
    const recommendedUsers = await searchUsersFor(req.user.id, req.query.q || "");
    res.status(200).json(recommendedUsers);
  } catch (error) {
    console.error("Error in getRecommendedUsers controller", error.message);
    sendError(res, error);
  }
}

export async function searchUsers(req, res) {
  try {
    const users = await searchUsersFor(req.user.id, req.query.q || "");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers controller", error.message);
    sendError(res, error);
  }
}

export async function getSuggestions(req, res) {
  try {
    const suggestions = await getSuggestionsFor(req.user.id, req.params.mode || "all");
    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error in getSuggestions controller", error.message);
    sendError(res, error);
  }
}

export async function dismissSuggestion(req, res) {
  try {
    const result = await dismissSuggestionFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in dismissSuggestion controller", error.message);
    sendError(res, error);
  }
}

export async function getMyFriends(req, res) {
  try {
    const friends = await getFriendsFor(req.user.id);
    res.status(200).json(friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    sendError(res, error);
  }
}

export async function getUserProfile(req, res) {
  try {
    const user = await getUserProfileFor(req.user.id, req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile controller", error.message);
    sendError(res, error);
  }
}

export async function updateMySettings(req, res) {
  try {
    const updatedUser = await updateUser(req.user.id, req.body);
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in updateMySettings controller", error.message);
    sendError(res, error, "Could not save settings");
  }
}

export async function getInterests(req, res) {
  try {
    res.status(200).json({ interests: await getInterestOptionsFor() });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateMyInterests(req, res) {
  try {
    const user = await updateUserInterestsFor(req.user.id, req.body);
    res.status(200).json({ success: true, user });
  } catch (error) {
    sendError(res, error, "Could not save interests");
  }
}

export async function followUser(req, res) {
  try {
    const result = await followUserFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in followUser controller", error.message);
    sendError(res, error);
  }
}

export async function unfollowUser(req, res) {
  try {
    const result = await unfollowUserFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in unfollowUser controller", error.message);
    sendError(res, error);
  }
}

export async function removeFollower(req, res) {
  try {
    const result = await removeFollowerFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in removeFollower controller", error.message);
    sendError(res, error);
  }
}

export async function blockUser(req, res) {
  try {
    const result = await blockUserFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in blockUser controller", error.message);
    sendError(res, error);
  }
}

export async function unblockUser(req, res) {
  try {
    const result = await unblockUserFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in unblockUser controller", error.message);
    sendError(res, error);
  }
}

export async function getFollowRequests(req, res) {
  try {
    const requests = await getFollowRequestsFor(req.user.id);
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getFollowRequests controller", error.message);
    sendError(res, error);
  }
}

export async function acceptFollowRequest(req, res) {
  try {
    const result = await resolveFollowRequestFor(req.user.id, req.params.id, "accept");
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in acceptFollowRequest controller", error.message);
    sendError(res, error);
  }
}

export async function declineFollowRequest(req, res) {
  try {
    const result = await resolveFollowRequestFor(req.user.id, req.params.id, "decline");
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in declineFollowRequest controller", error.message);
    sendError(res, error);
  }
}

export async function getCallHistory(req, res) {
  try {
    const callHistory = await getCallHistoryFor(req.user.id);
    res.status(200).json(callHistory);
  } catch (error) {
    console.error("Error in getCallHistory controller", error.message);
    sendError(res, error);
  }
}

export async function getDebug(req, res) {
  try {
    const debugInfo = await getDebugInfo(req.user.id);
    res.status(200).json(debugInfo);
  } catch (error) {
    console.error("Error in getDebug controller", error.message);
    sendError(res, error);
  }
}

export async function getFollowerList(req, res) {
  try {
    const users = await getFollowersFor(req.user.id, req.params.id, req.query.type || "followers");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getFollowerList controller", error.message);
    sendError(res, error);
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const friendRequest = await createFriendRequest(req.user.id, req.params.id);
    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    sendError(res, error);
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const result = await acceptFriendRequestFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in acceptFriendRequest controller", error.message);
    sendError(res, error);
  }
}

export async function getFriendRequests(req, res) {
  try {
    const friendRequests = await getFriendRequestsFor(req.user.id);
    res.status(200).json(friendRequests);
  } catch (error) {
    console.error("Error in getFriendRequests controller", error.message);
    sendError(res, error);
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await getOutgoingFriendRequestsFor(req.user.id);
    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    sendError(res, error);
  }
}
