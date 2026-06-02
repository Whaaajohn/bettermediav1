import { axiosInstance } from "./axios";

function getClientLoginHints() {
  if (typeof window === "undefined") return {};

  const resolved = Intl.DateTimeFormat().resolvedOptions();
  const languages = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language].filter(Boolean);

  return {
    clientTimezone: resolved.timeZone || "",
    clientLocale: navigator.language || "",
    clientLanguages: languages,
  };
}

function withClientLoginHints(payload = {}) {
  return {
    ...payload,
    ...getClientLoginHints(),
  };
}

export const signup = async (signupData) => {
    const response = await axiosInstance.post("/auth/signup", withClientLoginHints(signupData));
    return response.data;
    };

export const login = async (loginData) => {
    const response = await axiosInstance.post("/auth/login", withClientLoginHints(loginData));
    return response.data;
    };

export const verifyLoginCode = async (payload) => {
    const response = await axiosInstance.post("/auth/login/verify-code", withClientLoginHints(payload));
    return response.data;
};

export const forgotPassword = async (payload) => {
    const response = await axiosInstance.post("/auth/forgot-password", payload);
    return response.data;
};

export const resetPassword = async (payload) => {
    const response = await axiosInstance.post("/auth/reset-password", payload);
    return response.data;
};

export const logout = async () => {
    const response = await axiosInstance.post("/auth/logout");
    return response.data;
        };

export const getAuthUser = async () => {
   try {
       const res = await axiosInstance.get("/auth/me");
       return res.data;
   } catch (error) {
    console.log("Error in getAuthUser: ", error);
    return null
    
   }
};

export const completeOnboarding = async (userData) => {
    const response = await axiosInstance.post("/auth/onboarding", userData);
    return response.data;
};

export async function sendVerificationCode() {
  const response = await axiosInstance.post("/auth/send-verification-code");
  return response.data;
}

export async function verifyEmailCode(code) {
  const response = await axiosInstance.post("/auth/verify-email", { code });
  return response.data;
}

export async function getAuthSessions() {
  const response = await axiosInstance.get("/auth/sessions");
  return response.data;
}

export async function revokeAuthSession(sessionId) {
  const response = await axiosInstance.delete(`/auth/sessions/${sessionId}`);
  return response.data;
}

export async function logoutOtherSessions() {
  const response = await axiosInstance.post("/auth/sessions/logout-others");
  return response.data;
}

export async function logoutAllSessions() {
  const response = await axiosInstance.post("/auth/sessions/logout-all");
  return response.data;
}

export async function trustAuthSession(sessionId, trusted = true) {
  const response = await axiosInstance.patch(`/auth/sessions/${sessionId}/trust`, { trusted });
  return response.data;
}

export async function setEmailCodeLogin(enabled) {
  const response = await axiosInstance.post("/auth/security/email-code-login", { enabled });
  return response.data;
}

export async function getInterests() {
  const response = await axiosInstance.get("/interests");
  return response.data;
}

export async function saveMyInterests(payload) {
  const response = await axiosInstance.patch("/users/me/interests", payload);
  return response.data;
}

export async function getLanguageGroups() {
  const response = await axiosInstance.get("/language-groups");
  return response.data;
}

export async function getLanguageGroup(slug) {
  const response = await axiosInstance.get(`/language-groups/${slug}`);
  return response.data;
}

export async function getLanguageGroupPosts(slug) {
  const response = await axiosInstance.get(`/language-groups/${slug}/posts`);
  return response.data;
}

export async function syncMyLanguageGroups() {
  const response = await axiosInstance.post("/language-groups/sync-me");
  return response.data;
}

export async function getRecommendedUsers() {
    const response = await axiosInstance.get("/users");
    return response.data;
}

export async function searchUsers(query = "") {
  const response = await axiosInstance.get("/users/search", { params: { q: query } });
  return response.data;
}

export async function getUserProfile(userId) {
  const response = await axiosInstance.get(`/users/${userId}`);
  return response.data;
}

export async function updateMySettings(settings) {
  const response = await axiosInstance.patch("/users/me/settings", settings);
  return response.data;
}

export async function followUser(userId) {
  const response = await axiosInstance.post(`/users/${userId}/follow`);
  return response.data;
}

export async function unfollowUser(userId) {
  const response = await axiosInstance.delete(`/users/${userId}/follow`);
  return response.data;
}

export async function removeFollower(userId) {
  const response = await axiosInstance.delete(`/users/${userId}/follower`);
  return response.data;
}

export async function blockUser(userId) {
  const response = await axiosInstance.post(`/users/${userId}/block`);
  return response.data;
}

export async function unblockUser(userId) {
  const response = await axiosInstance.delete(`/users/${userId}/block`);
  return response.data;
}

export async function getFollowRequests() {
  const response = await axiosInstance.get("/users/follow-requests");
  return response.data;
}

export async function acceptFollowRequest(requestId) {
  const response = await axiosInstance.put(`/users/follow-request/${requestId}/accept`);
  return response.data;
}

export async function declineFollowRequest(requestId) {
  const response = await axiosInstance.put(`/users/follow-request/${requestId}/decline`);
  return response.data;
}

export async function getDebugInfo() {
  const response = await axiosInstance.get("/users/debug/local");
  return response.data;
}

export async function getFollowers(userId, type = "followers") {
  const response = await axiosInstance.get(`/users/${userId}/follows`, { params: { type } });
  return response.data;
}

export async function getNotifications() {
  const response = await axiosInstance.get("/mod/notifications");
  return response.data;
}

export async function deleteNotification(notificationId) {
  const response = await axiosInstance.delete(`/mod/notifications/${notificationId}`);
  return response.data;
}

export async function markNotificationsRead() {
  const response = await axiosInstance.put("/mod/notifications/read");
  return response.data;
}

export async function getMessages(userId) {
  const response = await axiosInstance.get(`/chat/${userId}/messages`);
  return response.data;
}

export async function getConversations() {
  const response = await axiosInstance.get("/chat/conversations");
  return response.data;
}

export async function getCallHistory() {
  const response = await axiosInstance.get("/chat/calls");
  return response.data;
}

export async function deleteCallHistory(callId) {
  const response = await axiosInstance.delete(`/chat/calls/${callId}`);
  return response.data;
}

export async function sendMessage(userId, payload) {
  const body = typeof payload === "string" ? { text: payload } : payload;
  const response = await axiosInstance.post(`/chat/${userId}/messages`, body);
  return response.data;
}

export async function editMessage(userId, messageId, text) {
  const response = await axiosInstance.put(`/chat/${userId}/messages/${messageId}`, { text });
  return response.data;
}

export async function deleteMessage(userId, messageId) {
  const response = await axiosInstance.delete(`/chat/${userId}/messages/${messageId}`);
  return response.data;
}

export async function toggleMessageReaction(userId, messageId, emoji) {
  const response = await axiosInstance.put(`/chat/${userId}/messages/${messageId}/reaction`, { emoji });
  return response.data;
}

export async function createReport(reportData) {
  const response = await axiosInstance.post("/mod/reports", reportData);
  return response.data;
}

export async function createPost(postData) {
  const response = await axiosInstance.post("/posts", postData);
  return response.data;
}

export async function getMusicProviders() {
  const response = await axiosInstance.get("/music/providers");
  return response.data;
}

export async function searchMusic(query, provider = "itunes", limit = 20) {
  const response = await axiosInstance.get("/music/search", {
    params: { q: query, provider, limit },
  });
  return response.data;
}

export async function getTrendingMusic(limit = 20) {
  const response = await axiosInstance.get("/music/trending", {
    params: { limit },
  });
  return response.data;
}

export async function getFeed() {
  const response = await axiosInstance.get("/posts/feed");
  return response.data;
}

export async function getSmartFeed(mode = "for-you") {
  if (mode === "latest") {
    const response = await axiosInstance.get("/posts/feed");
    return response.data;
  }
  const response = await axiosInstance.get(`/feed/${mode}`);
  return response.data;
}

export async function recordAlgorithmEvent(payload) {
  const response = await axiosInstance.post("/algorithm/event", payload);
  return response.data;
}

export async function hidePost(postId) {
  const response = await axiosInstance.post(`/posts/${postId}/hide`);
  return response.data;
}

export async function notInterestedPost(postId) {
  const response = await axiosInstance.post(`/posts/${postId}/not-interested`);
  return response.data;
}

export async function getTrendingHashtags(params = {}) {
  const response = await axiosInstance.get("/hashtags/trending", { params });
  return response.data;
}

export async function searchHashtags(query = "") {
  const response = await axiosInstance.get("/hashtags/search", { params: { q: query } });
  return response.data;
}

export async function getHashtag(tag, params = {}) {
  const response = await axiosInstance.get(`/hashtags/${tag}`, { params });
  return response.data;
}

export async function muteHashtag(tag) {
  const response = await axiosInstance.post(`/hashtags/${tag}/mute`);
  return response.data;
}

export async function unmuteHashtag(tag) {
  const response = await axiosInstance.delete(`/hashtags/${tag}/mute`);
  return response.data;
}

export async function getProfilePosts(userId) {
  const response = await axiosInstance.get(`/posts/user/${userId}`);
  return response.data;
}

export async function archivePost(postId) {
  const response = await axiosInstance.put(`/posts/${postId}/archive`);
  return response.data;
}

export async function togglePostPin(postId) {
  const response = await axiosInstance.put(`/posts/${postId}/pin`);
  return response.data;
}

export async function deletePost(postId) {
  const response = await axiosInstance.delete(`/posts/${postId}`);
  return response.data;
}

export async function repost(postId) {
  const response = await axiosInstance.post(`/posts/${postId}/repost`);
  return response.data;
}

export async function sharePost(postId, payload) {
  const response = await axiosInstance.post(`/posts/${postId}/share`, payload);
  return response.data;
}

export async function toggleLike(postId) {
  const response = await axiosInstance.put(`/posts/${postId}/like`);
  return response.data;
}

export async function addComment(postId, text) {
  const body = typeof text === "string" ? { text } : text;
  const response = await axiosInstance.post(`/posts/${postId}/comments`, body);
  return response.data;
}

export async function replyToComment(postId, parentCommentId, text) {
  const body = typeof text === "string" ? { text } : text;
  const response = await axiosInstance.post(`/posts/${postId}/comments/${parentCommentId}/replies`, body);
  return response.data;
}

export async function editComment(postId, commentId, text) {
  const response = await axiosInstance.put(`/posts/${postId}/comments/${commentId}`, { text });
  return response.data;
}

export async function deleteComment(postId, commentId) {
  const response = await axiosInstance.delete(`/posts/${postId}/comments/${commentId}`);
  return response.data;
}

export async function toggleCommentLike(postId, commentId) {
  const response = await axiosInstance.put(`/posts/${postId}/comments/${commentId}/like`);
  return response.data;
}

export async function toggleCommentPin(postId, commentId) {
  const response = await axiosInstance.put(`/posts/${postId}/comments/${commentId}/pin`);
  return response.data;
}

export async function getAdminPanel() {
  const response = await axiosInstance.get("/mod/admin");
  return response.data;
}

export async function applyModerationAction(userId, action) {
  const response = await axiosInstance.post(`/mod/users/${userId}/action`, action);
  return response.data;
}

export async function sendStaffNotification(userId, payload) {
  const response = await axiosInstance.post(`/mod/users/${userId}/notify`, payload);
  return response.data;
}

export async function resolveReport(reportId, payload) {
  const response = await axiosInstance.put(`/mod/reports/${reportId}`, payload);
  return response.data;
}

export async function createAppeal(payload) {
  const response = await axiosInstance.post("/mod/appeals", payload);
  return response.data;
}

export async function getMyAppeals() {
  const response = await axiosInstance.get("/mod/appeals/me");
  return response.data;
}

export async function resolveAppeal(appealId, payload) {
  const response = await axiosInstance.put(`/mod/appeals/${appealId}`, payload);
  return response.data;
}

export async function getBotTraining() {
  const response = await axiosInstance.get("/mod/admin/bot-training");
  return response.data;
}

export async function updateBotTraining(payload) {
  const response = await axiosInstance.put("/mod/admin/bot-training", payload);
  return response.data;
}

export async function getBotProfile() {
  const response = await axiosInstance.get("/bot/profile");
  return response.data;
}

export async function getBotHealth() {
  const response = await axiosInstance.get("/bot/health");
  return response.data;
}

export async function messageBot(payload) {
  const response = await axiosInstance.post("/bot/message", payload);
  return response.data;
}

export async function getBotSettings() {
  const response = await axiosInstance.get("/bot/settings");
  return response.data;
}

export async function updateBotSettings(payload) {
  const response = await axiosInstance.patch("/bot/settings", payload);
  return response.data;
}

export async function getBotModeration() {
  const response = await axiosInstance.get("/mod/bot");
  return response.data;
}

export async function getBotActions(status = "all") {
  const response = await axiosInstance.get("/mod/bot/actions", {
    params: { status },
  });
  return response.data;
}

export async function approveBotAction(actionId, payload = {}) {
  const response = await axiosInstance.post(`/mod/bot/actions/${actionId}/approve`, payload);
  return response.data;
}

export async function rejectBotAction(actionId, payload = {}) {
  const response = await axiosInstance.post(`/mod/bot/actions/${actionId}/reject`, payload);
  return response.data;
}

export async function undoBotAction(actionId, payload = {}) {
  const response = await axiosInstance.post(`/mod/bot/actions/${actionId}/undo`, payload);
  return response.data;
}

export async function getBotModels() {
  const response = await axiosInstance.get("/bot/models");
  return response.data;
}

export async function getMyBotMemory() {
  const response = await axiosInstance.get("/bot/memory/me");
  return response.data;
}

export async function deleteMyBotMemory() {
  const response = await axiosInstance.delete("/bot/memory/me");
  return response.data;
}

export async function scanBotText(payload) {
  const response = await axiosInstance.post("/bot/scan/text", payload);
  return response.data;
}

export async function scanBotImage(payload) {
  const response = await axiosInstance.post("/bot/scan/image", payload);
  return response.data;
}

export async function rescanBotTarget(targetType, targetId) {
  const response = await axiosInstance.post(`/mod/bot/rescan/${targetType}/${targetId}`);
  return response.data;
}

export async function applyDirectBotAction(actionId, payload = {}) {
  const response = await axiosInstance.post(`/bot/actions/${actionId}/apply`, payload);
  return response.data;
}

export async function undoDirectBotAction(actionId, payload = {}) {
  const response = await axiosInstance.post(`/bot/actions/${actionId}/undo`, payload);
  return response.data;
}

export async function restoreBotAction(actionId, payload = {}) {
  const response = await axiosInstance.post(`/bot/actions/${actionId}/restore`, payload);
  return response.data;
}

export async function reviewAppealWithBot(appealId) {
  const response = await axiosInstance.post(`/bot/appeals/${appealId}/review`);
  return response.data;
}

export async function updateAdminSettings(payload) {
  const response = await axiosInstance.put("/mod/admin/settings", payload);
  return response.data;
}

export async function sendSmtpTest() {
  const response = await axiosInstance.post("/mod/admin/smtp-test");
  return response.data;
}

export async function testAdminService(kind) {
  const response = await axiosInstance.post(`/mod/admin/test/${kind}`);
  return response.data;
}

export async function runMigrationDryRun() {
  const response = await axiosInstance.post("/mod/admin/migration/dry-run");
  return response.data;
}

function pickKlipyUrl(item = {}) {
  const media =
    item.media_formats ||
    item.media ||
    item.images ||
    item.formats ||
    {};

  return (
    item.url ||
    item.itemurl ||
    item.content_url ||
    item.gif ||
    media.gif?.url ||
    media.mediumgif?.url ||
    media.tinygif?.url ||
    media.nanogif?.url ||
    media.loopedmp4?.url ||
    media.mp4?.url ||
    media.fixed_height?.url ||
    media.original?.url ||
    ""
  );
}

function normalizeKlipyItems(payload = {}, mode = "gifs") {
  const items = Array.isArray(payload)
    ? payload
    : payload.results || payload.data || payload.items || [];

  return items
    .map((item) => {
      const url = pickKlipyUrl(item);
      const previewUrl =
        item.previewUrl ||
        item.preview ||
        item.media_formats?.tinygif?.url ||
        item.media_formats?.nanogif?.url ||
        item.media_formats?.gif?.url ||
        url;

      return {
        id: item.id || item._id || url,
        title: item.title || item.content_description || item.name || "KLIPY GIF",
        url,
        previewUrl,
        source: "klipy",
        provider: "klipy",
        type: mode === "stickers" ? "sticker" : "gif",
      };
    })
    .filter((item) => item.url);
}

export async function searchGifs(query, mode = "gifs") {
  const key = import.meta.env.VITE_KLIPY_API_KEY || import.meta.env.VITE_GIF_API_KEY;
  if (!key || !query.trim()) return [];

  const url = new URL("https://api.klipy.com/v2/search");
  url.searchParams.set("key", key);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("contentfilter", "medium");
  url.searchParams.set("media_filter", mode === "stickers" ? "sticker" : "gif");

  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return normalizeKlipyItems(data, mode);
}
