import {
  createMessage,
  deleteCallHistoryFor,
  deleteMessageFor,
  editMessageFor,
  getCallHistoryFor,
  getConversationsFor,
  getMessagesBetween,
  toggleMessageReactionFor,
} from "../lib/localStore.js";
import { notifyBotMessageCreated } from "../bots/index.js";

function sendError(res, error, fallback = "Internal Server Error") {
  res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || "ERROR",
  });
}

export async function getConversations(req, res) {
  try {
    const conversations = await getConversationsFor(req.user.id);
    res.status(200).json(conversations);
  } catch (error) {
    console.log("Error in getConversations controller:", error.message);
    sendError(res, error);
  }
}

export async function getMessages(req, res) {
  try {
    const messages = await getMessagesBetween(req.user.id, req.params.id);
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    sendError(res, error);
  }
}

export async function sendMessage(req, res) {
  try {
    const message = await createMessage({
      sender: req.user.id,
      recipient: req.params.id,
      text: req.body.text || "",
      mediaDataUrl: req.body.mediaDataUrl || "",
      mediaName: req.body.mediaName || "",
      gif: req.body.gif || null,
      replyTo: req.body.replyTo || null,
      sharedPostId: req.body.sharedPostId || null,
      clientId: req.body.clientId || "",
    });

    notifyBotMessageCreated(message, req.user);
    res.status(201).json(message);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    sendError(res, error);
  }
}

export async function editMessage(req, res) {
  try {
    const message = await editMessageFor(req.user.id, req.params.messageId, req.body.text || "");
    res.status(200).json(message);
  } catch (error) {
    console.log("Error in editMessage controller:", error.message);
    sendError(res, error);
  }
}

export async function deleteMessage(req, res) {
  try {
    const message = await deleteMessageFor(req.user.id, req.params.messageId);
    res.status(200).json(message);
  } catch (error) {
    console.log("Error in deleteMessage controller:", error.message);
    sendError(res, error);
  }
}

export async function toggleMessageReaction(req, res) {
  try {
    const message = await toggleMessageReactionFor(
      req.user.id,
      req.params.messageId,
      req.body.emoji || ""
    );
    res.status(200).json(message);
  } catch (error) {
    console.log("Error in toggleMessageReaction controller:", error.message);
    sendError(res, error, "Could not react to message");
  }
}

export async function getCallHistory(req, res) {
  try {
    const callHistory = await getCallHistoryFor(req.user.id);
    res.status(200).json(callHistory);
  } catch (error) {
    console.log("Error in getCallHistory controller:", error.message);
    sendError(res, error);
  }
}

export async function deleteCallHistory(req, res) {
  try {
    const result = await deleteCallHistoryFor(req.user.id, req.params.callId);
    res.status(200).json(result);
  } catch (error) {
    console.log("Error in deleteCallHistory controller:", error.message);
    sendError(res, error);
  }
}
