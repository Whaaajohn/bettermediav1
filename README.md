# Better Media

**A full-stack social media, language-learning, messaging, and calling platform** — run it locally with no paid API keys, or deploy to production.

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ and npm
- (Optional) MongoDB and Redis for production

### 1️⃣ Frontend
```powershell
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 2️⃣ Backend
```powershell
cd backend
npm install
npm start
# Runs at http://localhost:3000
```

### 3️⃣ Desktop App (Optional)
```powershell
cd desktop
npm install
npm run dev
```

That's it! The app creates local databases automatically on first run. No configuration needed to get started.

---

## Full Documentation

Better Media is a local-first social media, language-learning, messaging, calling, moderation, and admin platform. It can run fully on one PC for development with no paid API keys, and it is also prepared for production with MongoDB Community or Atlas, optional/required Redis, SMTP, object storage, TURN, Sightengine moderation, Ollama/local AI, and hosted web/mobile clients.

## What The App Can Do

### Accounts And Auth

- Sign up with email, name, and password.
- Sign in with email or username.
- Store auth in an HTTP-only JWT cookie.
- Per-user/session/IP rate limits so one noisy user does not log out or block everyone else.
- Logged-in device/session management with single-device revoke and log-out-other-devices.
- Login alert emails for new sign-ins when SMTP is configured, with terminal fallback locally.
- Optional per-user email-code login protection.
- Verify email with SMTP when configured.
- Print verification codes to the terminal in local mode when SMTP is missing.
- Reset password with email/username and a reset code.
- Keep users out of protected features until onboarding and email verification are complete.
- Show banned users a ban/appeal flow instead of silently logging them in.
- Create env-controlled admin and ModBot users on local reset/start.

### Onboarding And Profiles

- Full name, username, bio, location, profile picture.
- Native language and learning language setup.
- Interest onboarding for Gaming, Music, Coding, AI, Sports, Memes, Language Learning, and more.
- Private/public account settings.
- Message privacy settings.
- Read receipt settings.
- Camera/mic defaults.
- Followers and following visibility.
- Clickable profile links throughout the app.
- Badges for admin, mod, creator, and verified users.

### Social Features

- New posts can be text-only, media-only, or caption plus media.
- Multiple pictures can be attached to one post as a carousel.
- Caption text is optional on media posts.
- Optional song previews on posts through backend-proxied music search.
- iTunes Search support by default, optional Jamendo support when `JAMENDO_CLIENT_ID` is configured.
- Image/video media posts with optional video thumbnails.
- Optional thumbnail support.
- Post language and target language metadata.
- Hashtags, detected tags, final tags, category, subcategory, and tone.
- Likes, dislikes, saves, comments, replies, reposts, unreposts.
- Comment GIFs use KLIPY when `VITE_KLIPY_API_KEY` is configured; local mode works without a GIF key.
- Archives and deletes.
- Instagram-like profile grids in the frontend.
- Repost privacy protection: repost cards remain, but unavailable originals hide their content.
- Feed tabs for For You, Following, Language, Trending, and Discover.
- Frontend feed controls: not interested, see more like this, hide post, mute hashtag, report, copy link.
- Clickable hashtags and hashtag pages.
- Automatic language groups for native speakers and learners of each supported language.
- Language group pages with posts and people tabs.
- User search and follow suggestions.

### Chat And Calls

- Conversations and direct messages.
- Message edit/delete.
- Message replies.
- Read receipts.
- Voice messages and media messages.
- KLIPY GIF/sticker messages when a frontend KLIPY key is configured.
- Typing indicators over Socket.IO.
- Audio calls, video calls, media-state signaling, and screenshare signaling.
- Call history and delete-call notification/history support.
- WebRTC for media; Socket.IO only handles signaling.
- STUN by default, optional TURN for production/tunnels/mobile networks.

### Notifications

- In-app notifications for likes, comments, replies, reposts, follows, accepted follow requests, reports, appeals, staff messages, calls, and moderation events.
- Security notification tab for login/security/account events.
- Notification read/delete APIs.
- Frontend pop-up notification support.

### Moderation And Safety

- Reports for users, posts, comments, messages, and bugs.
- Report categories.
- Appeals.
- Timed bans.
- Full bans.
- Message bans.
- Shadow bans.
- Badge grant/removal.
- Profile photo reset.
- Staff notifications.
- SMTP outreach when configured.
- Admin audit/moderation action history.
- Algorithm downranking and feed removal.
- Hashtag block/unblock.
- Spam and unsafe-language detection hooks.
- Optional Sightengine text/image moderation when credentials are configured.
- Local rules and Ollama moderation fallback when Sightengine is off or unavailable in local mode.

### Admin Panel Support

The backend supports admin APIs for:

- Dashboard data.
- Users.
- Reports.
- Appeals.
- Content.
- Bot training.
- Mail/outreach.
- Audit logs.
- Diagnostics.
- Create post/admin posting flows.
- SMTP test.
- Moderation action APIs.
- Production readiness diagnostics for MongoDB, Redis, SMTP, Sightengine, Ollama, TURN, storage, and worker queues.

Only admins should access the admin panel route in the frontend.

### MEDIA ModBot

MEDIA ModBot is a local assistant account. It is not a paid API bot by default.

It can:

- Run on the same PC/local network as the backend with no paid AI API.
- Explain rules.
- Help users report issues.
- Help with appeals.
- Help with account safety.
- Help with verification questions.
- Help with call troubleshooting.
- Help with language practice.
- Keep short conversation memory so replies feel connected during a session.
- Reply when users message it directly or mention `@modbot`.
- Follow back users who follow the bot when enabled.
- Send a thank-you message after a user follows the bot when enabled.
- Leave optional low-frequency social comments on public posts from trusted users.
- Optionally repost public posts based on creator reputation when `BOT_AUTO_REPOST=true`.
- Follow admin-configured bot rules.
- Use local fallback replies when no model is configured.
- Use Ollama locally for stronger social replies, moderation, vision checks, and appeal review.
- Use Sightengine for production text/image safety checks when configured, while still falling back to local rules/Ollama.
- Route fast chat/moderation to `qwen2.5:3b`, appeals to `phi4-mini`, vision to `qwen2.5vl:3b`, and backup checks to `gemma3:4b` when those models are installed.
- Keep user-viewable/deletable safe casual memory for more natural bot conversations.
- Scan new posts, comments, messages, reports, and appeals through a local queue.
- Create bot action records with confidence, severity, target, reason, status, and audit history.
- Warn users, create staff reports, apply temporary message mutes, and apply temporary app restrictions when those permissions are enabled.
- Apply timed bans only when `BOT_CAN_TEMP_BAN=true`, `ALLOW_BOT_AUTO_ACTIONS=true`, and the admin runtime setting allows it. Full bans remain admin-only.
- Queue higher-risk actions for admin/mod review instead of silently applying them.
- Let staff approve, reject, or undo reversible bot actions from the admin panel.

It cannot:

- Secretly ban or unban users.
- Bypass admin permissions.
- Invent moderation actions.
- Reveal private content.
- Spam users randomly.
- Replace real admin review.
- Full-ban users, delete users, remove admins, change server settings, or clear logs by itself.

Hard safety rule: the bot can never full-ban, delete users, remove admins, clear audit logs, or change server settings even if someone puts those words in training text or environment variables.

### Local Ollama model setup

The bot is Ollama-first in local mode. Install/run Ollama on the PC, then pull the recommended models:

```bash
ollama pull qwen2.5:3b
ollama pull phi4-mini
ollama pull qwen2.5vl:3b
ollama pull llama3.2-vision
ollama pull gemma3:4b
```

Useful local AI variables:

- `LOCAL_AI_ENABLED=true`
- `OLLAMA_ENABLED=true`
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_TEXT_MODEL=qwen2.5:3b`
- `OLLAMA_FAST_CHAT_MODEL=qwen2.5:3b`
- `OLLAMA_APPEAL_MODEL=phi4-mini:latest`
- `OLLAMA_VISION_MODEL=qwen2.5vl:3b`
- `OLLAMA_STRONG_VISION_MODEL=llama3.2-vision:latest`
- `OLLAMA_BACKUP_MODEL=gemma3:4b`

If Ollama is offline, ModBot falls back to hard local rules and deterministic app-help replies.

Limited autonomous moderation is controlled by environment variables and admin runtime settings:

- `ALLOW_BOT_AUTO_ACTIONS=true`
- `BOT_CAN_WARN=true`
- `BOT_CAN_CREATE_REPORTS=true`
- `BOT_CAN_TEMP_MUTE=true`
- `BOT_CAN_TEMP_RESTRICT=true`
- `BOT_CAN_TEMP_BAN=false` by default
- `BOT_CAN_FULL_BAN=false` always reports as unavailable
- Admin panel Bot tab controls whether critical actions auto-apply or stay in review.

Admin bot config lives in the local JSON store and is exposed through:

- `GET /api/mod/admin/bot-training`
- `PUT /api/mod/admin/bot-training`
- `GET /api/bot/profile`
- `GET /api/bot/health`
- `POST /api/bot/message`
- `GET /api/bot/settings`
- `PATCH /api/bot/settings`
- `GET /api/mod/bot/actions`
- `POST /api/mod/bot/actions/:id/approve`
- `POST /api/mod/bot/actions/:id/reject`
- `POST /api/mod/bot/actions/:id/undo`

## Local Mode

Local mode is the default developer mode.

When `LOCAL_DEV=true`:

- MongoDB is optional.
- Redis is optional.
- SMTP is optional.
- Sightengine is optional.
- Google OAuth is optional.
- Apple OAuth is optional.
- Object storage is optional.
- Uploads are saved locally.
- Verification/reset codes can print to the backend terminal.
- Socket.IO chat/calls run on localhost.
- The app should not crash because an external API key is missing.

### Start Locally

```powershell
cd C:\Users\JONATHAN\Documents\Codex\Media
copy backend\.env.local.example backend\.env
npm run dev
```

Default local URLs:

- App/API: `http://127.0.0.1:5174`
- Admin: `http://127.0.0.1:5175/admin`
- Health: `http://127.0.0.1:5174/api/health`
- Ready: `http://127.0.0.1:5174/api/ready`

### Local Data

- Main JSON database: `backend/data/db.json`
- Backups: `backend/data/backups`
- Legacy media route: `backend/data/media` served at `/media`
- Upload route: `backend/uploads` served at `/uploads`

## Production Mode

Production mode is for hosted deployments like Railway, Render, Fly.io, DigitalOcean, AWS, or Google Cloud Run.

Production requires:

- `NODE_ENV=production`
- `LOCAL_DEV=false`
- `DB_DRIVER=mongo`
- `MONGO_URI`
- strong `JWT_SECRET`
- `COOKIE_SECURE=true`
- correct `CORS_ORIGINS`

Recommended:

- Redis for rate limits, cache, online state, active calls, worker queue metadata, and Socket.IO scaling.
- SMTP for email verification and password resets.
- Sightengine for text/image moderation if you want a hosted safety provider.
- TURN server for reliable WebRTC across strict networks.
- S3/R2/object storage for production uploads.

```powershell
cd C:\Users\JONATHAN\Documents\Codex\Media\backend
copy .env.production.example .env
npm install
npm start
```

### MongoDB Production Options

Better Media supports both local MongoDB Community Server and MongoDB Atlas. The backend labels the connection in `/api/ready` and the admin Diagnostics tab as `community`, `atlas`, or `custom`.

Community Server on the same machine:

```env
DB_DRIVER=mongo
MONGO_URI=mongodb://127.0.0.1:27017/bettermedia
```

MongoDB Atlas:

```env
DB_DRIVER=mongo
MONGO_URI=mongodb+srv://user:password@cluster.example.mongodb.net/bettermedia
```

Local JSON remains available for development:

```env
LOCAL_DEV=true
DB_DRIVER=local_json
LOCAL_DB_FILE=./data/db.json
```

Production intentionally requires `DB_DRIVER=mongo` and `MONGO_URI` so a hosted deployment cannot accidentally boot on an empty local JSON file.

### Redis, Sightengine, And Worker Readiness

Redis is optional locally and can be required in production:

```env
REDIS_ENABLED=true
REDIS_REQUIRED=true
REDIS_URL=redis://default:password@redis-host:6379
REDIS_SOCKET_ADAPTER=true
REDIS_RATE_LIMITS=true
REDIS_QUEUES=true
```

If Redis is missing while `LOCAL_DEV=true`, the server logs a warning and uses memory fallback. If `NODE_ENV=production` and `REDIS_REQUIRED=true`, startup fails until Redis is configured.

Sightengine is optional locally and strict in production only when enabled:

```env
SIGHTENGINE_ENABLED=true
SIGHTENGINE_API_USER=your-api-user
SIGHTENGINE_API_SECRET=your-api-secret
DETECTION_PROVIDER=sightengine_ollama
DECISION_PROVIDER=sightengine_thresholds_ollama
APPEAL_REVIEWER=ollama_reasoning
```

Worker settings report how many CPU-bound moderation workers the backend should target. The current app still keeps local JSON writes single-writer safe; these values are exposed for production planning and queue diagnostics:

```env
WORKER_CPU_FRACTION=0.5
WORKER_MIN_PROCESSES=1
WORKER_MAX_PROCESSES=auto
WORKER_QUEUES_ENABLED=true
```

## Environment Files

- `backend/.env.example`: full reference.
- `backend/.env.local.example`: local PC defaults.
- `backend/.env.selfhosted.example`: production-style local/self-hosted template for MongoDB Community, Redis, Sightengine, SMTP, local uploads, and optional Ollama.
- `backend/.env.production.example`: production template.
- `frontend/.env`: Vite client-side settings such as `VITE_API_URL`, `VITE_SOCKET_URL`, and optional `VITE_KLIPY_API_KEY`.

Music search is local-backend proxied and free by default:

- `MUSIC_ENABLED=true`
- `MUSIC_PROVIDER=itunes`
- `MUSIC_ALLOW_EXPLICIT=false`
- `MUSIC_SEARCH_LIMIT=20`
- `JAMENDO_CLIENT_ID=` optional independent/Creative Commons provider

GIF search is optional and client-side:

- `VITE_KLIPY_API_KEY=` enables KLIPY GIF/sticker search in chat and comments.
- Leave it blank for fully local/offline development; GIF search simply returns no remote results.

Never commit real values for:

- Gmail app passwords.
- SMTP passwords.
- MongoDB URI.
- Redis URL.
- Sightengine API secret.
- JWT secret.
- TURN password.
- S3/R2 keys.

## Important Scripts

Run from the repo root unless noted.

```powershell
npm run dev
npm run start --prefix backend
npm run tunnel --prefix backend
npm run db:backup --prefix backend
npm run db:restore --prefix backend -- ./data/backups/db-example.json
npm run db:validate --prefix backend
npm run db:reset-local --prefix backend
npm run db:clean-test-users --prefix backend
npm run db:migrate-local-to-mongo --prefix backend
npm run db:migrate-local-to-mongo:dry --prefix backend
npm run mongo:indexes --prefix backend
npm run ready --prefix backend
npm run bot:download-model --prefix backend
npm run test:health --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
```

`db:reset-local` backs up `db.json`, resets local data, and recreates env admin + ModBot users.

## Self-Hosted Production-Style Local Mode

Use this mode when you want the app running on your own PC with real local infrastructure:

- MongoDB Community Server: `mongodb://127.0.0.1:27017/bettermedia`
- Redis: `redis://127.0.0.1:6379`
- Gmail SMTP app password
- Sightengine as the main moderation detector
- Local uploads under `backend/uploads`
- Ollama for ModBot chat, appeal reasoning, summaries, and explanations

Setup:

```powershell
cd C:\Users\JONATHAN\Documents\Codex\Media
copy backend\.env.selfhosted.example backend\.env
notepad backend\.env
npm run db:migrate-local-to-mongo:dry --prefix backend
npm run db:migrate-local-to-mongo --prefix backend
npm run mongo:indexes --prefix backend
npm run start --prefix backend
```

Use placeholders until you paste real secrets into your private `.env` only:

```env
SIGHTENGINE_API_USER=put_api_user_here
SIGHTENGINE_API_SECRET=put_api_secret_here
SMTP_USER=put_email_here
SMTP_PASS=put_gmail_app_password_here
```

Important: a Gmail app password was previously shown in a screenshot/chat context. Regenerate/rotate that Gmail app password before trusting SMTP in production-style mode.

Dry-run migration does not write to MongoDB. It reads and validates `backend/data/db.json`, creates a local backup, counts users/posts/messages/comments/uploads, and lists local-only collections that will be mirrored into MongoDB.

Real migration:

- backs up local JSON first
- preserves IDs when possible
- flattens embedded post comments/replies into Mongo `Comment`
- upserts model-backed collections
- mirrors local-only admin/bot/appeal/settings collections into `LocalMirrorRecord`
- extracts upload metadata without moving physical files
- reports missing upload files
- never deletes `db.json`

## Backend Architecture

```text
backend/src
  config/
    env.js
    database.js
    redis.js
    storage.js
    workers.js
  controllers/
  lib/
    localStore.js
    localAi.js
    signaling.js
    smtpMailer.js
  middleware/
  models/
  routes/
  scripts/
  services/
    classifier.service.js
    feed.service.js
    hashtag.service.js
    suggestion.service.js
  server.js
```

### Storage Modes

- Local JSON: default local mode.
- MongoDB/Mongoose: production-ready model layer for Community Server or Atlas.
- Redis: optional local and production cache/realtime/rate-limit/queue metadata layer.
- Local uploads: `/uploads`.
- Legacy media: `/media`.
- S3/R2 placeholders: configured through env for production.

### Local JSON Safety

The local database protects itself with:

- queued writes
- backup before write
- temp-file writes
- JSON validation before replacement
- corrupt-file backup as `db.corrupt-<timestamp>.json`
- recovery from newest valid backup

The server should never silently wipe users/posts/messages because of a parse error.

## Rate Limiting And Sessions

Rate limits are scoped to the smallest safe identity available:

- logged-in `userId + sessionId`
- logged-in `userId`
- device/session header or cookie
- IP + user-agent hash for anonymous users

Route buckets include auth login, posts/comments, messages, uploads, feeds, and general API calls. If one user spams reload or messages, only that user/session/IP receives:

```json
{
  "error": "rate_limited",
  "message": "Too many requests. Try again soon.",
  "retryAfterMs": 30000
}
```

The backend does not rotate JWT secrets, clear global cookies, delete everyone’s sessions, or shut down auth because one user is rate limited.

Sessions are local JSON records in local mode and Mongo-ready through `UserSession` in production mode. Users can list devices, revoke one device, log out other devices, log out all devices, and mark devices trusted.

## Frontend Routes

Public:

- `/docs`
- `/signup`
- `/login`
- `/forgot-password`

Protected:

- `/`
- `/ban`
- `/messages`
- `/explore`
- `/settings`
- `/profile/:id`
- `/notifications`
- `/admin`
- `/call/:id`
- `/chat/:id`
- `/onboarding`
- `/onboarding/interests`
- `/hashtag/:tag`
- `/language-groups/:slug`

Redirects:

- `/debug` redirects to `/admin` for admins, otherwise `/`.
- `/friends` redirects to `/explore`.

## HTTP API

Authenticated routes require the auth cookie, default name `jwt`.

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | JSON API root when requested as JSON |
| GET | `/api/health` | Process health |
| GET | `/api/version` | Version, Node, local/dev, call config summary |
| GET | `/api/ready` | DB, Redis, storage, SMTP, Sightengine, Ollama, TURN, worker readiness |

### Auth

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login by email or username |
| POST | `/api/auth/login/verify-code` | Finish email-code protected login |
| POST | `/api/auth/logout` | Clear auth cookie |
| POST | `/api/auth/forgot-password` | Start password reset |
| POST | `/api/auth/reset-password` | Finish password reset |
| GET | `/api/auth/sessions` | List logged-in devices |
| DELETE | `/api/auth/sessions/:sessionId` | Revoke one logged-in device |
| POST | `/api/auth/sessions/logout-others` | Revoke every other device |
| POST | `/api/auth/sessions/logout-all` | Revoke all devices for current user |
| PATCH | `/api/auth/sessions/:sessionId/trust` | Trust/untrust a device |
| POST | `/api/auth/security/email-code-login` | Toggle email-code login |
| POST | `/api/auth/onboarding` | Save onboarding profile/settings |
| POST | `/api/auth/send-verification-code` | Send or print verification code |
| POST | `/api/auth/verify-email` | Verify email code |
| GET | `/api/auth/me` | Current user |

Email-code login flow:

1. `POST /api/auth/login` with email/username and password.
2. If the user enabled the setting, the response includes `requiresEmailCode` and `challengeId`.
3. `POST /api/auth/login/verify-code` with `challengeId` and `code`.
4. The backend creates a normal session/cookie only after the code is correct.

### Users

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users` | Recommended/search fallback users |
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/:id` | Public profile |
| PATCH | `/api/users/me/settings` | Update settings |
| GET | `/api/interests` | Interest picker options |
| POST | `/api/users/me/interests` | Save onboarding interests |
| PATCH | `/api/users/me/interests` | Update interests later |
| GET | `/api/users/debug/local` | Local diagnostics for admins/debug |
| GET | `/api/users/calls/history` | User call history |
| GET | `/api/users/:id/follows?type=followers` | Followers/following list |
| POST | `/api/users/:id/follow` | Follow or request follow |
| DELETE | `/api/users/:id/follow` | Unfollow |
| DELETE | `/api/users/:id/follower` | Remove follower |
| POST | `/api/users/:id/block` | Block user |
| DELETE | `/api/users/:id/block` | Unblock user |
| GET | `/api/users/follow-requests` | Incoming follow requests |
| PUT | `/api/users/follow-request/:id/accept` | Accept follow request |
| PUT | `/api/users/follow-request/:id/decline` | Decline follow request |
| GET | `/api/users/friends` | Friend list |
| POST | `/api/users/friend-request/:id` | Legacy friend request |
| PUT | `/api/users/friend-request/:id/accept` | Accept legacy friend request |
| GET | `/api/users/friend-requests` | Incoming legacy friend requests |
| GET | `/api/users/outgoing-friend-requests` | Outgoing legacy friend requests |

### Suggestions

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users/suggestions` | All suggestions |
| GET | `/api/users/suggestions/language` | Language partner suggestions |
| GET | `/api/users/suggestions/interests` | Interest-based suggestions |
| POST | `/api/users/suggestions/:id/not-interested` | Dismiss suggestion |

### Posts

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/posts/feed` | Legacy smart feed |
| POST | `/api/posts` | Create text-only, media, video, carousel, or captioned post. Accepts optional `song` and `clientId` |
| GET | `/api/posts/user/:id` | Profile posts |
| DELETE | `/api/posts/:id` | Delete post |
| POST | `/api/posts/:id/repost` | Repost/unrepost |
| PUT | `/api/posts/:id/like` | Like/unlike |
| PUT | `/api/posts/:id/dislike` | Dislike/undislike |
| PUT | `/api/posts/:id/save` | Save/unsave |
| PUT | `/api/posts/:id/archive` | Archive/unarchive |
| POST | `/api/posts/:id/view` | Record post view |
| POST | `/api/posts/:id/hide` | Hide post |
| POST | `/api/posts/:id/not-interested` | See less like this |
| POST | `/api/posts/:id/hashtags/recalculate` | Staff hashtag recalculation |

### Comments And Replies

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/posts/:id/comments` | Get nested comments/replies |
| POST | `/api/posts/:id/comments` | Add comment or reply with `parentCommentId`; accepts `clientId` |
| POST | `/api/posts/:id/comments/:commentId/replies` | Reply to any comment or reply; accepts `clientId` |
| PUT | `/api/posts/:id/comments/:commentId` | Edit comment/reply |
| DELETE | `/api/posts/:id/comments/:commentId` | Delete comment/reply |
| PUT | `/api/posts/:id/comments/:commentId/like` | Like comment/reply |

### Feed

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/feed/for-you?page=1&limit=20` | Personalized feed |
| GET | `/api/feed/following?page=1&limit=20` | Following/friends feed |
| GET | `/api/feed/language?page=1&limit=20` | Language-learning feed |
| GET | `/api/feed/trending?page=1&limit=20` | Trending feed |
| GET | `/api/feed/discover?page=1&limit=20` | Discovery/new creators feed |

### Algorithm

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/algorithm/me` | Current algorithm profile |
| PUT | `/api/algorithm/interests` | Edit interests/preferences |
| POST | `/api/algorithm/reset` | Reset For You profile |
| POST | `/api/algorithm/event` | Record algorithm event |

Event types:

- `view`
- `long_view`
- `like`
- `dislike`
- `comment`
- `save`
- `repost`
- `share`
- `hide`
- `not_interested`
- `report`
- `follow_author`
- `open_hashtag`
- `click_profile`
- `block_author`

### Hashtags

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/hashtags/trending` | Trending hashtags |
| GET | `/api/hashtags/search?q=` | Search hashtags |
| GET | `/api/hashtags/:tag` | Hashtag page |
| GET | `/api/hashtags/:tag/posts` | Hashtag posts |
| POST | `/api/hashtags/:tag/mute` | Mute hashtag for current user |
| DELETE | `/api/hashtags/:tag/mute` | Unmute hashtag for current user |
| POST | `/api/hashtags/recalculate` | Admin recalculates hashtag stats |

### Music

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/music/providers` | Enabled music providers |
| GET | `/api/music/search?q=QUERY&limit=20&provider=itunes` | Search legal song previews |
| GET | `/api/music/trending?limit=20` | Trending/fallback preview results |

Song attachment shape:

```json
{
  "provider": "itunes",
  "providerId": "123",
  "title": "Song title",
  "artist": "Artist name",
  "album": "Album name",
  "artworkUrl": "https://...",
  "previewUrl": "https://...",
  "sourceUrl": "https://...",
  "explicit": false,
  "durationMs": 30000
}
```

The backend stores metadata and preview URLs only. It does not upload, host, or store full songs.

### Language Groups

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/language-groups` | List auto-generated native/learning language groups |
| GET | `/api/language-groups/:slug` | Language group details and members |
| GET | `/api/language-groups/:slug/posts` | Posts and people for a language group page |
| POST | `/api/language-groups/sync-me` | Re-sync current user into automatic groups |

### Chat

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/chat/conversations` | Recent conversations |
| GET | `/api/chat/calls` | Call history |
| DELETE | `/api/chat/calls/:callId` | Delete call history item |
| GET | `/api/chat/:id/messages` | Messages with user |
| POST | `/api/chat/:id/messages` | Send message; accepts `clientId` for optimistic idempotency |
| PUT | `/api/chat/:id/messages/:messageId` | Edit message |
| DELETE | `/api/chat/:id/messages/:messageId` | Delete message |

### Calls

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/calls/config` | STUN/TURN/client call config |

Calls are WebRTC peer-to-peer. The backend stores call state/history/signaling only, not raw video/audio.

### Uploads

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/uploads` | Upload a data URL |
| GET | `/uploads/:filename` | Local upload file |
| GET | `/media/:filename` | Legacy local media file |

Example upload body:

```json
{
  "dataUrl": "data:image/png;base64,...",
  "filename": "avatar.png"
}
```

### Notifications, Reports, Appeals, Admin, Mod

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/mod/notifications` | Current user notifications |
| PUT | `/api/mod/notifications/read` | Mark notifications read |
| DELETE | `/api/mod/notifications/:id` | Delete notification |
| GET | `/api/mod/reports` | Admin report list |
| POST | `/api/mod/reports` | Create report |
| PUT | `/api/mod/reports/:id` | Resolve report |
| GET | `/api/mod/appeals` | Admin appeal list |
| GET | `/api/mod/appeals/me` | My appeals |
| POST | `/api/mod/appeals` | Create appeal |
| PUT | `/api/mod/appeals/:id` | Resolve appeal |
| GET | `/api/mod/admin` | Admin panel data |
| GET | `/api/mod/admin/bot-training` | Get ModBot config |
| PUT | `/api/mod/admin/bot-training` | Update ModBot config |
| PUT | `/api/mod/admin/settings` | Update admin settings |
| POST | `/api/mod/admin/smtp-test` | Test SMTP |
| POST | `/api/mod/admin/test/mongo` | Admin-only MongoDB readiness test |
| POST | `/api/mod/admin/test/redis` | Admin-only Redis readiness test |
| POST | `/api/mod/admin/test/sightengine-text` | Admin-only Sightengine text test |
| POST | `/api/mod/admin/test/sightengine-image` | Admin-only Sightengine image test |
| POST | `/api/mod/admin/test/upload` | Admin-only local upload write test |
| POST | `/api/mod/admin/test/ollama` | Admin-only Ollama chat test |
| POST | `/api/mod/admin/migration/dry-run` | Admin-only local JSON to Mongo migration dry run |
| GET | `/api/mod/bot` | Admin bot dashboard data |
| GET | `/api/mod/bot/actions` | List bot action queue/history |
| POST | `/api/mod/bot/actions/:id/approve` | Approve queued bot action |
| POST | `/api/mod/bot/actions/:id/reject` | Reject queued bot action |
| POST | `/api/mod/bot/actions/:id/undo` | Undo reversible bot action |
| POST | `/api/mod/bot/rescan/:targetType/:targetId` | Admin-triggered ModBot rescan for posts, comments, messages, or users |
| POST | `/api/mod/users/:id/action` | Apply moderation action |
| POST | `/api/mod/users/:id/notify` | Send staff notification/email |
| GET | `/api/mod/algorithm/reported-posts` | Reported posts for ranking review |
| GET | `/api/mod/algorithm/spammy-posts` | Spammy posts |
| POST | `/api/mod/posts/:id/downrank` | Downrank post |
| POST | `/api/mod/posts/:id/remove-from-feed` | Remove post from feeds |
| POST | `/api/mod/hashtags/:tag/block` | Block hashtag |
| POST | `/api/mod/hashtags/:tag/unblock` | Unblock hashtag |

Moderation action types are handled by the backend local store and include warnings, timed bans, full bans, message bans, shadow bans, badge actions, clears/unbans, and profile/content cleanup actions.

### ModBot API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/bot/profile` | Current ModBot profile, training summary, and health |
| GET | `/api/bot/health` | Runtime queue/model/action status |
| GET | `/api/bot/models` | Installed/reachable local Ollama model list |
| POST | `/api/bot/message` | Message the bot through the real chat system |
| GET | `/api/bot/memory/me` | View your safe casual bot memory |
| DELETE | `/api/bot/memory/me` | Clear your safe casual bot memory |
| POST | `/api/bot/scan/text` | Manual text moderation scan |
| POST | `/api/bot/scan/image` | Manual image moderation scan |
| POST | `/api/bot/moderate/:targetType` | Manual target text moderation scan |
| POST | `/api/bot/actions/:id/apply` | Apply a queued bot action |
| POST | `/api/bot/actions/:id/undo` | Undo a reversible bot action |
| POST | `/api/bot/actions/:id/restore` | Restore content affected by a reversible bot action |
| POST | `/api/bot/appeals/:id/review` | Ask ModBot/Ollama to review an appeal |
| GET | `/api/bot/admin` | Admin-only bot dashboard data |
| GET | `/api/bot/settings` | Admin-only bot runtime settings |
| PATCH | `/api/bot/settings` | Admin-only update of bot runtime settings |

The bot runs hard local rules first for critical safety issues, then routes eligible work to Sightengine and/or Ollama when available. If Sightengine or Ollama is missing locally, the backend keeps running and falls back to local rules.

## Socket.IO Events

### Calls

Client emits:

- `call:start`
- `call:accept`
- `call:decline`
- `call:join`
- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:media-state`
- `call:relay-audio`
- `call:relay-video-frame`
- `call:end`

Server emits:

- `call:incoming`
- `call:ringing`
- `call:accepted`
- `call:declined`
- `call:peer-joined`
- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:media-state`
- `call:relay-audio`
- `call:relay-video-frame`
- `call:ended`

### Chat

Client emits:

- `chat:typing`

Server emits:

- `chat:typing`

## Feed Algorithm

The For You feed scores posts from:

- language match
- user interests
- followed users
- friends
- engagement quality
- freshness
- creator quality
- hashtag match
- comment activity
- exploration
- location match
- report penalty
- spam penalty
- already-seen penalty
- repeated-author penalty
- blocked penalty

The backend filters out:

- deleted posts
- archived posts
- blocked authors
- muted users
- muted words
- muted hashtags
- full banned authors
- timed banned authors
- shadow banned authors for other viewers
- private posts the viewer cannot access
- reported/spammy content above threshold
- moderation-removed posts
- blocked hashtags

## Hashtag System

Posts are tagged from:

- user selected category
- hashtags in text
- keyword dictionaries
- language metadata
- emoji/tone detection
- engagement signals
- moderation signals

Hashtag rules:

- max 10 hashtags per post
- length 2-40 chars
- letters, numbers, underscore
- lowercase normalized values
- duplicates removed
- spammy unrelated hashtag abuse lowers trust

## Music Preview System

- Frontend music picker searches through `/api/music/search`.
- The backend calls iTunes Search by default and normalizes results.
- Jamendo is disabled unless `JAMENDO_CLIENT_ID` exists.
- Explicit tracks are rejected unless `MUSIC_ALLOW_EXPLICIT=true`.
- Only one preview plays at a time globally.
- Post cards show compact song previews without autoplay.

## Language Groups

The backend auto-generates groups for every configured language:

- `native-english` -> English Speakers
- `learning-spanish` -> Learning Spanish

Users are automatically synced into groups when they sign up, complete onboarding, save interests/languages, or update settings. If manual group joins are added later, automatic sync preserves manual membership separately.

## Optimistic UI

The frontend now sends client IDs for posts, messages, comments, and replies. The backend stores `clientId` and returns existing records on retry so slow networks do not create duplicates.

Current optimistic behavior covers:

- creating posts
- sending messages
- liking posts in the feed
- comments/replies using idempotent client IDs
- selected song state before posting

Failed optimistic sends/posts stay visible with a failed state instead of disappearing suddenly.

## Friend And Follow Suggestions

Suggestions use:

- mutual follows/friends
- same learning language
- opposite language pairs
- native language match
- shared interests
- shared hashtags
- recent activity
- complete profile
- not blocked
- not already followed
- not banned/shadow banned

Returned users include human-readable reasons like:

- `Also learning Spanish`
- `Native Spanish speaker learning English`
- `You both like gaming`
- `Followed by 3 people you know`
- `Active language learner`

## Privacy Rules

The backend should not expose:

- private account posts to non-followers
- archived originals to other users
- blocked user posts
- muted user posts
- muted words
- muted hashtags
- full banned users
- shadow banned users to other users
- deleted posts
- heavily reported posts

Reposts keep their repost card, but the original is replaced with `Original post unavailable` when access is lost.

## Calls And Tunnels

Local calls work on localhost with STUN.

For ngrok, VS Code tunnel, mobile networks, school/work Wi-Fi, or strict NAT, WebRTC may need TURN:

```env
TURN_ENABLED=true
TURN_URL=turn:your-turn-host:3478
TURN_USERNAME=turn-user
TURN_PASSWORD=turn-password
```

The app never stores raw audio/video in Redis, MongoDB, or JSON.

## Testing Checklist

After changes:

```powershell
npm run db:validate --prefix backend
npm run test:health --prefix backend
npm run build --prefix frontend
```

Also check:

- `GET http://127.0.0.1:5174/api/ready`
- Admin Panel -> Diagnostics tab

Manual tests:

- sign up
- login with username
- verify email
- forgot password
- onboarding
- create a text-only post
- create photo/video/carousel post with optional caption
- add a song preview to a post
- open a language group page
- comment and reply
- edit/delete comment
- like/dislike/save/repost/unrepost
- archive post and confirm repost privacy
- follow/unfollow/private follow request
- search users
- open hashtag page
- send messages
- edit/delete messages
- start audio/video call
- toggle camera/mic/screenshare
- report post/comment/message/user
- resolve report as admin
- ban/timed ban/full ban and appeal
- update ModBot training
- SMTP test if email is configured

## Fresh Launch Reset

To wipe local test content while keeping a safety backup:

```powershell
npm run db:reset-local --prefix backend
```

This keeps a backup in `backend/data/backups`, resets the JSON store, and recreates the env admin + ModBot accounts.

## Current Local Server Commands

```powershell
npm run dev
```

or:

```powershell
npm run dev --prefix backend
```

Then open:

- `http://:5174`
- `http://:5175/admin`

## Notes For Mobile Clients

Web, iOS, iPadOS, and Android clients can share the same API:

- Use cookie auth for web.
- Native clients may store and send cookies through their HTTP client, or the backend can later expose bearer-token mode.
- Use the same REST endpoints for users/posts/feed/chat/moderation.
- Use Socket.IO for realtime chat/calls.
- Use WebRTC for audio/video/screenshare.
- Configure TURN for reliable mobile calls outside localhost.
