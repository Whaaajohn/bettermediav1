import jwt from "jsonwebtoken";
import { getPublicUserById, verifySessionFor } from "../lib/localStore.js";
import { env } from "../config/env.js";

const JWT_SECRET = env.JWT_SECRET;

export const protectRoute = async (req, res, next) => {

    try {
        const token = req.cookies[env.COOKIE_NAME] || req.cookies.jwt;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided"});
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if(!decoded) {
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }

        const sessionIsActive = await verifySessionFor(decoded.userId, decoded.sessionId);
        if (!sessionIsActive) {
            res.clearCookie(env.COOKIE_NAME, {
                httpOnly: true,
                sameSite: env.COOKIE_SAME_SITE,
                secure: env.COOKIE_SECURE,
            });
            return res.status(401).json({ message: "This device has been logged out. Please sign in again." });
        }
        
        const user = await getPublicUserById(decoded.userId);

        if(!user) {
            return res.status(401).json({ message: "Unauthorized - User not found" });
        }

        req.user = user;
        req.sessionId = decoded.sessionId || null;

        next();
    } catch (error) {
        console.log("Error in protectRoute middleware:", error.message);
        res.clearCookie(env.COOKIE_NAME, {
            httpOnly: true,
            sameSite: env.COOKIE_SAME_SITE,
            secure: env.COOKIE_SECURE,
        });
        if (env.COOKIE_NAME !== "jwt") {
            res.clearCookie("jwt", {
                httpOnly: true,
                sameSite: env.COOKIE_SAME_SITE,
                secure: env.COOKIE_SECURE,
            });
        }
        res.status(401).json({ message: "Your session expired. Please sign in again." });
    }
}
