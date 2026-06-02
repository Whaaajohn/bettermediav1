import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  deleteMessage,
  deleteCallHistory,
  editMessage,
  getCallHistory,
  getConversations,
  getMessages,
  sendMessage,
  toggleMessageReaction,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/conversations", protectRoute, getConversations);
router.get("/calls", protectRoute, getCallHistory);
router.delete("/calls/:callId", protectRoute, deleteCallHistory);
router.get("/:id/messages", protectRoute, getMessages);
router.post("/:id/messages", protectRoute, sendMessage);
router.put("/:id/messages/:messageId", protectRoute, editMessage);
router.delete("/:id/messages/:messageId", protectRoute, deleteMessage);
router.put("/:id/messages/:messageId/reaction", protectRoute, toggleMessageReaction);

export default router;
