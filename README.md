# Better Media

Better Media is a local-first social platform for communities, creators, language learners, and small private networks. It includes social posts, messaging, calls, moderation tools, an admin panel, language groups, and optional production services like MongoDB, Redis, SMTP, TURN, object storage, Sightengine, and Ollama.

The project is designed to run locally during development without paid API keys, while still leaving a clear path for self-hosted or cloud production deployments.

---

## Features

- Account signup, login, email verification, password reset, onboarding, and session management
- Public and private profiles with follow requests, blocks, badges, profile settings, and privacy controls
- Posts with text, images, videos, carousels, captions, hashtags, comments, replies, likes, dislikes, saves, reposts, and archives
- Personalized feeds for discovery, following, language content, trending posts, and interests
- Direct messages with editing, deletion, replies, read receipts, typing indicators, GIF support, voice messages, and media messages
- Audio/video calls with WebRTC signaling, media state updates, screen sharing support, and call history
- Language groups for native speakers and learners
- Notifications for social activity, reports, appeals, calls, security events, and moderation updates
- Admin panel support for reports, appeals, diagnostics, mail testing, bot settings, moderation actions, and audit history
- ModBot support for rule explanations, help messages, report guidance, appeals, local moderation checks, and optional Ollama/Sightengine integration
- Local JSON storage for development, MongoDB for production, and optional Redis for scaling/caching/realtime support
- Local uploads in development with object storage-ready production structure

---

## Screenshots

### Auth & Onboarding

| Sign In | Sign Up |
|---|---|
| <img src="docs/screenshots/signin.png" alt="Sign in screen" width="420"> | <img src="docs/screenshots/signup.png" alt="Sign up screen" width="420"> |

| Sign Up Flow | Email Verification |
|---|---|
| <img src="docs/screenshots/signup1.png" alt="Sign up flow" width="420"> | <img src="docs/screenshots/verifyemail.png" alt="Email verification screen" width="420"> |

| Onboarding | Interests |
|---|---|
| <img src="docs/screenshots/onboarding.png" alt="Onboarding screen" width="420"> | <img src="docs/screenshots/intrest.png" alt="Interest selection screen" width="420"> |

### Home, Feed & Discovery

| Home Feed | Home Feed Detail |
|---|---|
| <img src="docs/screenshots/homepage.png" alt="Home feed" width="420"> | <img src="docs/screenshots/homepage1.png" alt="Home feed detail" width="420"> |

| Feed View | Explore |
|---|---|
| <img src="docs/screenshots/homepage2.png" alt="Feed view" width="420"> | <img src="docs/screenshots/explore.png" alt="Explore page" width="420"> |

| Post Card | Hashtag Page |
|---|---|
| <img src="docs/screenshots/postcard.png" alt="Post card" width="420"> | <img src="docs/screenshots/hashtag.png" alt="Hashtag page" width="420"> |

| Comments | Followers |
|---|---|
| <img src="docs/screenshots/coemment.png" alt="Comments screen" width="420"> | <img src="docs/screenshots/followers.png" alt="Followers screen" width="420"> |

### Profiles & Settings

| Profile | Profile View |
|---|---|
| <img src="docs/screenshots/profile.png" alt="Profile screen" width="420"> | <img src="docs/screenshots/profile1.png" alt="Profile view" width="420"> |

| User Profile | User Profile Detail |
|---|---|
| <img src="docs/screenshots/userprofile1.png" alt="User profile" width="420"> | <img src="docs/screenshots/userprofile2.png" alt="User profile detail" width="420"> |

| Theme Profile | Settings |
|---|---|
| <img src="docs/screenshots/themeprofile.png" alt="Theme profile screen" width="420"> | <img src="docs/screenshots/settings1.png" alt="Settings screen" width="420"> |

| Privacy Settings | Account Settings |
|---|---|
| <img src="docs/screenshots/settings2.png" alt="Privacy settings" width="420"> | <img src="docs/screenshots/settings3.png" alt="Account settings" width="420"> |

| App Settings | Security Settings |
|---|---|
| <img src="docs/screenshots/settings4.png" alt="App settings" width="420"> | <img src="docs/screenshots/settings5.png" alt="Security settings" width="420"> |

### Chat & Calls

| Chat Page | Chat Thread |
|---|---|
| <img src="docs/screenshots/chatpage.png" alt="Chat page" width="420"> | <img src="docs/screenshots/chatpage1.png" alt="Chat thread" width="420"> |

| Chat Media | GIF Chat |
|---|---|
| <img src="docs/screenshots/chatpage2.png" alt="Chat media view" width="420"> | <img src="docs/screenshots/chatgift.png" alt="GIF chat screen" width="420"> |

| Call Screen | Call View |
|---|---|
| <img src="docs/screenshots/call.png" alt="Call screen" width="420"> | <img src="docs/screenshots/call1.png" alt="Call view" width="420"> |

| Call Notification | Notifications |
|---|---|
| <img src="docs/screenshots/callnoti.png" alt="Call notification" width="420"> | <img src="docs/screenshots/notificaion.png" alt="Notifications screen" width="420"> |

| Notification Detail | Email Flow |
|---|---|
| <img src="docs/screenshots/notification1.png" alt="Notification detail" width="420"> | <img src="docs/screenshots/email.png" alt="Email flow" width="420"> |

### Docs

| Documentation |
|---|
| <img src="docs/screenshots/doc.png" alt="Documentation screen" width="850"> |

---

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, Socket.IO client, WebRTC |
| Backend | Node.js, Express, Socket.IO |
| Local storage | Local JSON store with safe writes and backups |
| Production database | MongoDB with Mongoose models |
| Realtime/cache | Redis optional for production scaling |
| Calls | WebRTC with STUN by default and optional TURN |
| Email | SMTP for verification, password reset, and alerts |
| Moderation | Local rules, optional Sightengine, optional Ollama |
| Desktop | Electron/Vite desktop shell |

---

## Getting Started

### Requirements

- Node.js 18+
- npm
- MongoDB and Redis are optional for local development

### Install

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Configure Local Environment

macOS/Linux:

```bash
cp backend/.env.local.example backend/.env
```

Windows PowerShell:

```powershell
Copy-Item backend/.env.local.example backend/.env
```

Local development works without paid API keys. External services can stay disabled until needed.

### Run Development

```bash
npm run dev
```

The frontend, backend, realtime server, and local development tools should start from the project scripts. If the project is being run package-by-package, the backend and frontend can also be started separately.

Backend:

```bash
npm run dev --prefix backend
```

Frontend:

```bash
npm run dev --prefix frontend
```

---

## Local Development

Local mode is built for fast testing on one machine.

Local mode supports:

- local JSON database
- local file uploads
- local Socket.IO chat/call signaling
- terminal fallback for verification/reset codes when SMTP is not configured
- optional MongoDB migration testing
- optional Ollama for local ModBot responses
- optional Sightengine for moderation checks
- optional Redis for production-style testing

Local data is stored inside the backend project folders and is ignored by Git.

---

## Production Notes

Production deployments should use:

- `NODE_ENV=production`
- `LOCAL_DEV=false`
- MongoDB as the database driver
- a strong JWT secret
- secure cookies
- a strict CORS origin list
- SMTP for account email flows
- Redis for scaling, rate limits, queues, and realtime state
- TURN for reliable calls across strict networks
- object storage for uploaded media

Production should not run from local JSON storage.

---

## Environment Files

The backend includes example environment files for different setups:

- `backend/.env.example`
- `backend/.env.local.example`
- `backend/.env.selfhosted.example`
- `backend/.env.production.example`

The frontend uses Vite environment variables for browser-safe client settings.

Never commit real secrets, passwords, tokens, private URLs, database credentials, SMTP credentials, TURN passwords, or API keys.

---

## Important Scripts

```bash
npm run dev
npm run start --prefix backend
npm run tunnel --prefix backend
npm run db:backup --prefix backend
npm run db:restore --prefix backend
npm run db:validate --prefix backend
npm run db:reset-local --prefix backend
npm run db:clean-test-users --prefix backend
npm run db:migrate-local-to-mongo --prefix backend
npm run db:migrate-local-to-mongo:dry --prefix backend
npm run mongo:indexes --prefix backend
npm run ready --prefix backend
npm run test:health --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
```

---

## API Overview

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Process health |
| GET | `/api/version` | Version and runtime summary |
| GET | `/api/ready` | Database, Redis, SMTP, storage, TURN, moderation, and worker readiness |

### Auth

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| POST | `/api/auth/forgot-password` | Start password reset |
| POST | `/api/auth/reset-password` | Complete password reset |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/sessions` | Logged-in devices |
| POST | `/api/auth/send-verification-code` | Send verification code |
| POST | `/api/auth/verify-email` | Verify email |

### Users

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users/search` | Search users |
| GET | `/api/users/:id` | Public profile |
| PATCH | `/api/users/me/settings` | Update profile/settings |
| POST | `/api/users/:id/follow` | Follow or request follow |
| DELETE | `/api/users/:id/follow` | Unfollow |
| POST | `/api/users/:id/block` | Block user |
| DELETE | `/api/users/:id/block` | Unblock user |
| GET | `/api/users/follow-requests` | Incoming follow requests |

### Posts & Feed

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/feed/for-you` | Personalized feed |
| GET | `/api/feed/following` | Following feed |
| GET | `/api/feed/language` | Language feed |
| GET | `/api/feed/trending` | Trending feed |
| GET | `/api/feed/discover` | Discovery feed |
| POST | `/api/posts` | Create a post |
| DELETE | `/api/posts/:id` | Delete a post |
| PUT | `/api/posts/:id/like` | Like/unlike |
| PUT | `/api/posts/:id/dislike` | Dislike/undislike |
| PUT | `/api/posts/:id/save` | Save/unsave |
| POST | `/api/posts/:id/repost` | Repost/unrepost |
| GET | `/api/posts/:id/comments` | Load comments |
| POST | `/api/posts/:id/comments` | Add a comment/reply |

### Chat & Calls

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/chat/conversations` | Recent conversations |
| GET | `/api/chat/:id/messages` | Conversation messages |
| POST | `/api/chat/:id/messages` | Send message |
| PUT | `/api/chat/:id/messages/:messageId` | Edit message |
| DELETE | `/api/chat/:id/messages/:messageId` | Delete message |
| GET | `/api/chat/calls` | Call history |
| GET | `/api/calls/config` | Client call configuration |

### Moderation & Admin

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/mod/notifications` | Current user notifications |
| POST | `/api/mod/reports` | Create report |
| GET | `/api/mod/reports` | Admin report list |
| GET | `/api/mod/appeals` | Admin appeal list |
| POST | `/api/mod/appeals` | Create appeal |
| GET | `/api/mod/admin` | Admin dashboard data |
| GET | `/api/mod/bot/actions` | Bot action queue/history |
| POST | `/api/mod/users/:id/action` | Apply moderation action |

---

## Realtime Events

### Chat

Client emits:

- `chat:typing`

Server emits:

- `chat:typing`

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
- `call:ended`

---

## ModBot

ModBot is a local helper and moderation assistant account. It can explain rules, help users report issues, answer app questions, help with appeals, and support local moderation checks.

ModBot can run with local fallback replies. When configured, it can also use Ollama for stronger responses and Sightengine for hosted text/image checks.

ModBot is not allowed to silently full-ban users, delete users, remove admins, change server settings, clear audit logs, or bypass admin permissions. High-risk actions are kept for staff review.

---

## Privacy & Safety

Better Media is designed around user privacy and community control.

The backend should not expose:

- private account posts to non-followers
- archived posts to other users
- blocked user content
- muted users, words, or hashtags
- deleted posts
- full-banned users
- shadow-banned users to other users
- heavily reported content above moderation thresholds

Secrets and local data must stay out of Git. The repository should ignore `.env` files, local databases, uploads, build folders, cache folders, and dependency folders.

---

## Testing

Before pushing changes:

```bash
npm run db:validate --prefix backend
npm run test:health --prefix backend
npm run build --prefix frontend
```

Useful manual checks:

- create account
- verify email
- login with username
- complete onboarding
- create a post
- upload media
- comment and reply
- like, save, repost, and archive
- follow, unfollow, and handle private follow requests
- send messages
- edit and delete messages
- start a call
- report content
- resolve a report as admin
- test ModBot settings
- run admin diagnostics

---

## Contributing

Bug fixes, documentation improvements, UI polish, and feature pull requests are welcome.

Good contributions should:

- keep local development working without paid services
- avoid committing secrets or local data
- include clear testing notes
- keep privacy and moderation behavior predictable
- avoid breaking existing API contracts without documenting the change

---

## License

MIT License.
