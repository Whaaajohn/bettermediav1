# BetterMedia Free-Tier Launch Guide

This is the lowest-friction way to put BetterMedia on the internet without paying at launch.

## Free Stack

- App host: Render Free Web Service, using the root `Dockerfile`
- Database/media: MongoDB Atlas Free cluster with `UPLOAD_DRIVER=mongo`
- Email/support tickets: Resend Free through HTTPS API, not SMTP
- Redis/rate limits: Upstash Free Redis REST API
- AI/mod bot: Gemini API key, with local Ollama/HF disabled on Render Free

Checked on June 21, 2026:

- Render Free web services spin down after 15 minutes idle, have an ephemeral filesystem, include 750 free instance hours per workspace/month, and block SMTP ports 25/465/587.
- MongoDB Atlas Free has small limits: 0.5 GB storage, 100 read/write ops per second, and auto-pauses after 30 days with no connections.
- Upstash Redis Free includes 256 MB data and 500K commands/month.
- Resend Free includes 3,000 emails/month, 100 emails/day, and 1 domain.

Free tier is perfect for proving the app and showing people. It is not serious production scale yet.

## 1. Push This Repo To GitHub

Render needs the code in a Git repo it can access.

```bash
git status
git add .
git commit -m "Prepare BetterMedia for free-tier deploy"
git push
```

Do not commit real `.env` files or secrets.

## 2. Create MongoDB Atlas Free

1. Create a free Atlas cluster.
2. Create a database user.
3. Network Access: allow Render to connect. For the first free launch, `0.0.0.0/0` is simplest. Lock this down later.
4. Copy the app connection string.
5. Use database name `bettermedia`.

Render env value:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/bettermedia
```

This app stores uploads in Mongo/GridFS on free hosting, because Render Free loses local files after restarts/spin-downs.

## 3. Create Resend Free

1. Create a Resend account.
2. Add and verify your domain.
3. Create an API key.
4. Use a sender from that verified domain.

Render env values:

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
MAIL_FROM_NAME=BetterMedia
MAIL_FROM_EMAIL=no-reply@your-domain.com
```

The app still supports SMTP for local/self-hosting, but Render Free blocks outbound SMTP ports, so Resend API is the free hosted path.

## 4. Deploy On Render

Use the included [render.yaml](./render.yaml).

1. Go to Render Dashboard.
2. New > Blueprint.
3. Connect the GitHub repo.
4. Render will detect `render.yaml`.
5. Choose Free plan.
6. Fill the secret prompts:
   - `ADMIN_PASSWORD`
   - `ADMIN_EMAIL`
   - `MONGO_URI`
   - `RESEND_API_KEY`
   - `MAIL_FROM_EMAIL`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `GEMINI_API_KEY` if you want the bot powered by Gemini immediately
7. Deploy.

The blueprint assumes the public URL is:

```env
https://better-media.onrender.com
```

If Render gives you a different URL, update these env vars in Render:

```env
API_BASE_URL=https://your-render-url.onrender.com
CLIENT_URL=https://your-render-url.onrender.com
CORS_ORIGINS=https://your-render-url.onrender.com
PUBLIC_UPLOAD_URL=https://your-render-url.onrender.com/uploads
```

Then redeploy.

## 5. Upstash Redis REST

The app can use the Upstash REST values shown in the Upstash dashboard. This powers hosted rate limits over HTTPS on Render Free.

Add these Render env vars from the Upstash REST panel:

```env
REDIS_ENABLED=true
REDIS_REQUIRED=false
REDIS_URL=
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
UPSTASH_REDIS_TIMEOUT_MS=10000
USE_REDIS_SOCKET_ADAPTER=false
REDIS_SOCKET_ADAPTER=false
REDIS_RATE_LIMITS=true
REDIS_QUEUES=false
```

Keep the socket adapter off with REST. Socket.IO pub/sub needs a Redis TCP URL, but the REST API is enough for free-tier rate limiting and diagnostics.

## 6. Gemini Bot Setup

Free Render should not run local Ollama or download local HF models. Use Gemini instead:

```env
GEMINI_ENABLED=true
GEMINI_API_KEY=your-google-gemini-key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash
OLLAMA_ENABLED=false
BOT_LOCAL_AI_ENABLED=false
LOCAL_AI_ENABLED=false
LOCAL_AI_HF_ENABLED=false
```

Keep dangerous bot powers off:

```env
BOT_CAN_DELETE_USERS=false
BOT_CAN_CLEAR_LOGS=false
BOT_CAN_CHANGE_ADMIN=false
BOT_CAN_FULL_BAN=false
```

## 7. After Deploy Checks

Open:

```text
https://your-render-url.onrender.com
https://your-render-url.onrender.com/api/health
https://your-render-url.onrender.com/api/ready
https://your-render-url.onrender.com/admin
```

Then check:

1. Create a test user.
2. Verify email code sends through Resend.
3. Open `/support` and submit a support ticket.
4. Confirm the receipt email reaches the user.
5. Confirm the support ticket appears in Admin > Mail.
6. Upload a small image.
7. Create a post, comment, DM, report, and appeal.
8. Admin > Diagnostics: test Mongo, upload, Gemini, and email.
9. Admin > Settings: change Instagram/footer/theme and confirm a logged-out browser sees it.
10. Switch holiday themes and confirm the landing page changes too.

## Security Notes

- Use a strong `ADMIN_PASSWORD`.
- Keep `COOKIE_SECURE=true` on Render.
- Keep secrets only in Render env vars.
- Do not rely on Render Free local files for uploads or databases.
- Free tier can sleep, throttle, or pause. Upgrade before real public traffic.
