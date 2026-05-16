# WhatsApp Realty Marketing Bot

A production-ready WhatsApp marketing bot for real estate, built with Node.js, Meta WhatsApp Cloud API, Neon DB, Cloudinary, Sharp, and fluent-ffmpeg — all on free tiers.

---

## Architecture

```
User (WhatsApp) ↔ Meta Cloud API ↔ Express Webhook (/webhook)
                                         ↓
                                    botFlow.js
                              ┌──────────┼──────────┐
                           db.js   mediaProcessor  sessionStore
                                         ↓
                              cloudinaryClient → Cloudinary CDN
                                         ↓
                              whatsappClient → Meta Cloud API → User
```

---

## Prerequisites — Free Account Setup

Complete all steps before running the server.

### 1. Meta for Developers (WhatsApp Cloud API)

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in.
2. Click **Create App** → select **Business** → follow prompts.
3. In your app dashboard, click **Add Product** → choose **WhatsApp**.
4. Under **WhatsApp > API Setup**, copy:
   - **Temporary access token** → `WHATSAPP_TOKEN`
   - **Phone number ID** → `PHONE_NUMBER_ID`
5. For production, generate a **permanent System User token** via Business Manager.

### 2. Neon DB (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and sign up (free).
2. Create a new project.
3. Copy the connection string from **Dashboard > Connection Details** → `DATABASE_URL`.

### 3. Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account.
2. In the dashboard, copy:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

### 4. ngrok (Local Dev Tunnel)

1. Go to [ngrok.com](https://ngrok.com), sign up, and download ngrok.
2. Authenticate: `ngrok authtoken YOUR_AUTH_TOKEN`
3. During dev, run: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`) — this is your webhook base URL.

### 5. ffmpeg Binary

fluent-ffmpeg requires the `ffmpeg` binary on your system.

- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

---

## Installation

```bash
# Clone or set up the project directory
cd realty-whatsapp-bot

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env
# Edit .env with your credentials
```

---

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
WHATSAPP_TOKEN=your_meta_access_token
WHATSAPP_VERIFY_TOKEN=any_secret_string_you_choose
PHONE_NUMBER_ID=your_phone_number_id

DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

PORT=3000
COMPANY_NAME=Prestige Realty
```

---

## Sample Media

Add your sample images and videos to `media/raw/` using this naming convention:

```
media/raw/
  1_1.jpg    ← Project ID 1, Image 1
  1_2.jpg    ← Project ID 1, Image 2
  1_1.mp4    ← Project ID 1, Video 1
  2_1.jpg    ← Project ID 2, Image 1
  2_2.jpg    ← Project ID 2, Image 2
  2_1.mp4    ← Project ID 2, Video 1
  3_1.jpg    ← Project ID 3, Image 1
  3_2.jpg    ← Project ID 3, Image 2
  3_1.mp4    ← Project ID 3, Video 1
  4_1.jpg    ← Project ID 4, Image 1
  4_2.jpg    ← Project ID 4, Image 2
  4_1.mp4    ← Project ID 4, Video 1
```

Use any real estate images/videos — minimum 800×600px recommended for images.

---

## Database Seeding

Run the seed script to create tables and insert sample data in Neon DB:

```bash
npm run seed
```

This runs `db/schema.sql` which creates tables for `cities`, `projects`, and `project_media`, and seeds 2 cities, 4 projects, and 12 media records.

---

## Running the Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:3000`.

---

## Setting Up the Webhook on Meta Dashboard

1. Start the server and run ngrok: `ngrok http 3000`
2. Copy your ngrok HTTPS URL (e.g., `https://abc123.ngrok-free.app`)
3. In Meta App Dashboard → **WhatsApp > Configuration**:
   - **Callback URL**: `https://abc123.ngrok-free.app/webhook`
   - **Verify Token**: the value you set as `WHATSAPP_VERIFY_TOKEN` in `.env`
4. Click **Verify and Save**. The server logs `[Webhook] Verified successfully.` on success.
5. Subscribe to the **messages** webhook field.

---

## Conversation Flow

```
User: Hi
Bot:  Welcome to Prestige Realty 🏠
      1. Mumbai
      2. Bangalore

User: 1
Bot:  Projects in Mumbai:
      1. Prestige Seabreeze
      2. Prestige Gateway

User: 1
Bot:  You selected: Prestige Seabreeze 🏗️
      1. Creatives: Images
      2. Creatives: Video
      3. SMS

User: 1
Bot:  Please enter your full name:

User: Rahul Sharma
Bot:  Thank you, Rahul Sharma! Now please enter your contact number:

User: 9876543210
Bot:  [sends personalised images with text overlay via WhatsApp]
      Your personalised creatives have been sent! 🎉
```

---

## Production Deployment (Render.com Free Tier)

1. Push code to GitHub.
2. Go to [render.com](https://render.com), create a **Web Service**.
3. Connect your GitHub repo.
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add all environment variables from `.env` under **Environment**.
7. Use the Render URL as your Meta webhook base URL.

> Note: Render free tier spins down after 15 minutes of inactivity. The first webhook after sleep takes ~30s to respond. Consider upgrading or using a cron ping service to keep it alive.

---

## Project Structure

```
/realty-whatsapp-bot
  /src
    index.js            — Express server + webhook endpoints
    sessionStore.js     — In-memory conversation state (Map)
    db.js               — Neon DB connection + query helpers
    botFlow.js          — Conversation router (state machine)
    mediaProcessor.js   — Sharp image overlay + ffmpeg video overlay
    cloudinaryClient.js — Cloudinary upload, returns secure_url
    whatsappClient.js   — Meta Cloud API: sendText + sendMedia
  /media
    /raw                — Original images/videos (you add these)
    /processed          — Temp files before Cloudinary upload (gitignored)
  /db
    schema.sql          — Tables + seed data
  .env.example
  package.json
  README.md
```

---

## Optional Extensions

Add these features by extending the existing modules:

- **Session timeout**: In `sessionStore.js`, add a timestamp and clear state after 10 minutes.
- **Redis sessions**: Replace the in-memory Map with Upstash Redis (free tier — 10k commands/day).
- **Conversation logging**: Add a `conversations` table in Neon DB and log each message in `botFlow.js`.
- **Admin REST API**: Add routes in `index.js` to CRUD cities, projects, and media.
- **Render auto-deploy**: Add a `render.yaml` with service config for one-click deployment.
