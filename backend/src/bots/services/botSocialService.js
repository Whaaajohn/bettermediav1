import { generateBotReply, generateFollowThanks, generateWelcomeMessage } from "../../lib/localAi.js";

export function generateSocialReply(options) {
  return generateBotReply(options);
}

export function generateSocialFollowThanks(options) {
  return generateFollowThanks(options);
}

export function generateSocialWelcome(options) {
  return generateWelcomeMessage(options);
}

