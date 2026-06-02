import {
  addCommentFor,
  archivePostFor,
  createPostFor,
  deleteCommentFor,
  deletePostFor,
  editCommentFor,
  getFeedFor,
  getPostCommentsFor,
  getPostsForProfile,
  toggleCommentPinFor,
  repostFor,
  sharePostFor,
  togglePostPinFor,
  toggleDislikeFor,
  toggleCommentLikeFor,
  toggleLikeFor,
  toggleSaveFor,
} from "../lib/localStore.js";
import { notifyBotCommentCreated, notifyBotPostCreated } from "../bots/index.js";

function findNewestUserComment(comments = [], userId, text = "") {
  const matches = [];
  const visit = (items = []) => {
    items.forEach((comment) => {
      const authorId = comment.author?._id || comment.author;
      if (authorId === userId && comment.text === text) matches.push(comment);
      visit(comment.replies || []);
    });
  };
  visit(comments);
  return matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

export async function createPost(req, res) {
  try {
    const post = await createPostFor(req.user.id, req.body);
    notifyBotPostCreated(post, req.user);
    res.status(201).json(post);
  } catch (error) {
    console.error("Error in createPost controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getFeed(req, res) {
  try {
    const feed = await getFeedFor(req.user.id);
    res.status(200).json(feed);
  } catch (error) {
    console.error("Error in getFeed controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getProfilePosts(req, res) {
  try {
    const posts = await getPostsForProfile(req.user.id, req.params.id);
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error in getProfilePosts controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function togglePostArchive(req, res) {
  try {
    const post = await archivePostFor(req.user.id, req.params.id);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in togglePostArchive controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function togglePostPin(req, res) {
  try {
    const post = await togglePostPinFor(req.user.id, req.params.id);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in togglePostPin controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function deletePost(req, res) {
  try {
    const result = await deletePostFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in deletePost controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function repost(req, res) {
  try {
    const post = await repostFor(req.user.id, req.params.id);
    res.status(201).json(post);
  } catch (error) {
    console.error("Error in repost controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function sharePost(req, res) {
  try {
    const message = await sharePostFor(req.user.id, req.params.id, req.body || {});
    res.status(201).json(message);
  } catch (error) {
    console.error("Error in sharePost controller", error.message);
    res.status(error.status || 500).json({
      message: error.message || "Internal server error",
      failures: error.failures || undefined,
    });
  }
}

export async function toggleLike(req, res) {
  try {
    const post = await toggleLikeFor(req.user.id, req.params.id);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in toggleLike controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function toggleDislike(req, res) {
  try {
    const post = await toggleDislikeFor(req.user.id, req.params.id);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in toggleDislike controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function toggleSave(req, res) {
  try {
    const post = await toggleSaveFor(req.user.id, req.params.id);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in toggleSave controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function addComment(req, res) {
  try {
    const post = await addCommentFor(
      req.user.id,
      req.params.id,
      req.body.text || "",
      req.body.parentCommentId || null,
      req.body.gif || null,
      req.body.clientId || ""
    );
    const comment = findNewestUserComment(post.comments || [], req.user.id, (req.body.text || "").trim().slice(0, 800));
    notifyBotCommentCreated(post, req.user, req.body.text || "", comment?._id);
    res.status(201).json(post);
  } catch (error) {
    console.error("Error in addComment controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function addReply(req, res) {
  try {
    const post = await addCommentFor(
      req.user.id,
      req.params.id,
      req.body.text || "",
      req.params.commentId,
      req.body.gif || null,
      req.body.clientId || ""
    );
    const comment = findNewestUserComment(post.comments || [], req.user.id, (req.body.text || "").trim().slice(0, 800));
    notifyBotCommentCreated(post, req.user, req.body.text || "", comment?._id);
    res.status(201).json(post);
  } catch (error) {
    console.error("Error in addReply controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getComments(req, res) {
  try {
    const comments = await getPostCommentsFor(req.user.id, req.params.id);
    res.status(200).json({ comments });
  } catch (error) {
    console.error("Error in getComments controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function editComment(req, res) {
  try {
    const post = await editCommentFor(req.user.id, req.params.id, req.params.commentId, req.body.text || "");
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in editComment controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function deleteComment(req, res) {
  try {
    const post = await deleteCommentFor(req.user.id, req.params.id, req.params.commentId);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in deleteComment controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function toggleCommentLike(req, res) {
  try {
    const post = await toggleCommentLikeFor(req.user.id, req.params.id, req.params.commentId);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in toggleCommentLike controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function toggleCommentPin(req, res) {
  try {
    const post = await toggleCommentPinFor(req.user.id, req.params.id, req.params.commentId);
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in toggleCommentPin controller", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}
