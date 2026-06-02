import express from "express";
import {
  forgotPassword,
  getSessions,
  login,
  logout,
  logoutAllSessions,
  logoutOtherSessions,
  onboard,
  revokeSession,
  resetPassword,
  sendVerificationCode,
  setEmailCodeLogin,
  signup,
  trustSession,
  verifyEmail,
  verifyLoginCode,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";  

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/login/verify-code", verifyLoginCode);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/sessions", protectRoute, getSessions);
router.delete("/sessions/:sessionId", protectRoute, revokeSession);
router.post("/sessions/logout-others", protectRoute, logoutOtherSessions);
router.post("/sessions/logout-all", protectRoute, logoutAllSessions);
router.patch("/sessions/:sessionId/trust", protectRoute, trustSession);
router.post("/security/email-code-login", protectRoute, setEmailCodeLogin);
router.post("/onboarding", protectRoute, onboard);
router.post("/send-verification-code", protectRoute, sendVerificationCode);
router.post("/verify-email", protectRoute, verifyEmail);

router.get("/me", protectRoute, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});

export default router;
