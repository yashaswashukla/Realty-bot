# WhatsApp Realty Marketing Bot — Claude Code Prompt

> Copy the prompt below directly into Claude Code to scaffold the full application.

---

## Free Tier Service Map

All services used in this project are either fully free or have a free tier sufficient for development and early production.

| Service | Purpose | Free Tier |
|---|---|---|
| **Meta WhatsApp Cloud API** | Send/receive WhatsApp messages | Free — no per-message cost via Cloud API; just need a Meta Business account |
| **Neon DB** | PostgreSQL database | Free tier — 0.5 GB storage, 1 project, always-on |
| **Cloudinary** | Host processed images/videos publicly | Free tier — 25 credits/month, 25 GB storage |
| **Render.com** | Host the Express server | Free tier — 750 hrs/month (spins down on inactivity) |
| **ngrok** | Local tunnel for development/testing | Free tier — 1 static domain, sufficient for dev |
| **Sharp** | Image text overlay | Free — open source npm package |
| **fluent-ffmpeg** | Video text overlay | Free — open source npm package (needs ffmpeg binary) |
| **Node.js + Express** | Server runtime | Free — open source |

---

## Prompt

Build a WhatsApp marketing bot for a real estate company using the following tech stack and requirements:

---

## Tech Stack

- **Runtime**: Node.js
- **WhatsApp**: Meta WhatsApp Cloud API (free via Meta for Developers — no Twilio required)
- **Database**: Neon DB (PostgreSQL via `@neondatabase/serverless` or `pg`) — free tier
- **Image Processing**: Sharp (open source — overlay text on images)
- **Video Processing**: fluent-ffmpeg (open source — burn-in text on videos)
- **Media Hosting**: Cloudinary (free tier — host processed media and get public URLs)
- **Server**: Express.js (webhook receiver)
- **Tunnel (dev)**: ngrok free tier for local development
- **Hosting (prod)**: Render.com free tier
- **Environment**: `.env` for secrets

---

## WhatsApp Setup — Meta Cloud API (Free)

Use the Meta WhatsApp Cloud API directly instead of any third-party paid wrapper. Steps to set up:

1. Go to [developers.facebook.com](https://developers.facebook.com), create a Meta App of type **Business**.
2. Add the **WhatsApp** product to your app.
3. Use the free test number provided by Meta for development (no business verification needed for sandbox testing).
4. Set the webhook URL to `POST /webhook` on your server.
5. Use the `WHATSAPP_VERIFY_TOKEN` you define to verify the webhook on Meta's dashboard.

### Sending a message (Meta Cloud API)

```js
await axios.post(
  `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
  {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    type: 'text',
    text: { body: messageText }
  },
  {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    }
  }
);
```

### Sending media (image/video) via Cloudinary URL

```js
await axios.post(
  `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
  {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    type: 'image', // or 'video'
    image: { link: cloudinaryPublicUrl, caption: 'Your personalised creative' }
  },
  {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    }
  }
);
```

### Receiving a message (webhook payload parsing)

```js
const body = req.body;
const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
const from = message?.from;       // sender's WhatsApp number
const text = message?.text?.body; // message text
```

---

## Database Schema

Create and seed the following tables in Neon DB (free tier — 0.5 GB, more than enough):

```sql
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  city_id INTEGER REFERENCES cities(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sms_message TEXT NOT NULL
);

CREATE TABLE project_media (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),
  file_path VARCHAR(500) NOT NULL,
  cloudinary_url VARCHAR(500)
);
```

Seed with at least 2 cities (e.g., Mumbai, Bangalore), 2 projects per city, 2 images and 1 video per project, and a pre-written SMS message per project.

---

## Cloudinary Integration (Free Tier — Media Hosting)

After processing an image or video locally, upload it to Cloudinary and use the returned secure URL as the media link sent via WhatsApp.

```js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const result = await cloudinary.uploader.upload(localFilePath, {
  resource_type: 'auto', // handles both image and video
  folder: 'realty-bot/processed'
});

return result.secure_url; // use this as the public media URL
```

The free tier gives 25 GB storage and 25 monthly credits — sufficient for a dev/demo environment and early usage.

---

## Conversation Flow

Implement a stateful conversation engine. State per user (keyed by WhatsApp number) must persist in-memory using a `Map` with the following fields:

| Field | Type | Description |
|---|---|---|
| `step` | string | One of: `start`, `city_selected`, `project_selected`, `awaiting_name`, `awaiting_number`, `done` |
| `selectedCity` | object \| null | The city object chosen by the user |
| `selectedProject` | object \| null | The project object chosen by the user |
| `pendingMediaType` | `'image'` \| `'video'` \| null | Set when user picks creatives |
| `userName` | string \| null | Collected from the user |

### Step 1 — Greeting

When user sends any message and step is `start` (or first interaction), reply:

```
Welcome to [Company Name] 🏠

Please select your city:
1. Mumbai
2. Bangalore
(list all cities from DB dynamically, numbered)

Reply with the number of your choice.
```

### Step 2 — City Selected

User replies with a number. Look up the city. Set step to `city_selected`. Reply:

```
Great! Here are our ongoing projects in [City Name]:

1. [Project Name 1]
2. [Project Name 2]
(list from DB dynamically)

Reply with the number of your choice.
```

### Step 3 — Project Selected

User replies with a number. Look up the project. Set step to `project_selected`. Reply:

```
You selected: [Project Name] 🏗️

What would you like?
1. Creatives: Images
2. Creatives: Video
3. SMS

Reply with 1, 2, or 3.
```

### Step 4a — Creatives: Images or Video

If user selects `1` or `2`, set `pendingMediaType` to `'image'` or `'video'`. Set step to `awaiting_name`. Reply:

```
Please enter your full name:
```

### Step 4b — SMS

If user selects `3`, fetch the `sms_message` for the project from DB and send it directly via the Meta Cloud API. Reset state to `start`. Then send:

```
Is there anything else we can help you with? Reply Hi to start again.
```

### Step 5 — Collect Name

User replies with their name. Store it. Set step to `awaiting_number`. Reply:

```
Thank you, [Name]! Now please enter your contact number:
```

### Step 6 — Collect Number, Process & Send Media

User replies with their contact number. Store it. Then:

1. Fetch all media from `project_media` table where `project_id` matches and `media_type` matches `pendingMediaType`.
2. For each media file:
   - **If image**: use Sharp to overlay text at the bottom:
     ```
     To know more, please contact [Name] at [Number]
     ```
     Use white text on a semi-transparent dark banner composited at the bottom of the image.
   - **If video**: use fluent-ffmpeg to burn-in a text overlay at the bottom using the `drawtext` filter:
     ```
     To know more, please contact [Name] at [Number]
     ```
3. Upload each processed file to Cloudinary using `cloudinary.uploader.upload()` with `resource_type: 'auto'`. Use the returned `secure_url`.
4. Send each media item via the Meta WhatsApp Cloud API using the Cloudinary URL as the `link`.
5. After sending all media, reply:
   ```
   Your personalised creatives have been sent! 🎉
   Is there anything else? Reply Hi to start again.
   ```
6. Reset state to `start`.

---

## Error Handling

| Scenario | Bot Response |
|---|---|
| User sends invalid option (e.g., "5" when only 3 options exist) | `"Invalid choice. Please reply with one of the listed numbers."` |
| User sends unrecognized message mid-flow | Re-send the current step's prompt |
| DB query fails | `"We're experiencing technical difficulties. Please try again later."` |
| Cloudinary upload fails | Log error, reply `"Media processing failed. Please try again."` |
| Meta API call fails | Log error + HTTP status, reply `"Message delivery failed. Please try again."` |

---

## File & Folder Structure

```
/realty-whatsapp-bot
  /src
    index.js            — Express server, webhook handler, Meta webhook verification
    sessionStore.js     — In-memory state Map with get/set/reset
    db.js               — Neon DB connection + query helpers
    botFlow.js          — Main conversation router (switch on step)
    mediaProcessor.js   — Sharp image overlay + ffmpeg video overlay logic
    cloudinaryClient.js — Cloudinary upload helper, returns secure_url
    whatsappClient.js   — Meta Cloud API send text + send media helpers
  /media
    /raw                — Original project images and videos (seeded samples)
    /processed          — Temp output files before Cloudinary upload (gitignored)
  /db
    schema.sql          — Full schema + seed SQL
  .env.example
  package.json
  README.md
```

---

## Environment Variables (`.env.example`)

```env
# Meta WhatsApp Cloud API (free via Meta for Developers)
WHATSAPP_TOKEN=           # Permanent or temp access token from Meta App Dashboard
WHATSAPP_VERIFY_TOKEN=    # Any string you define for webhook verification
PHONE_NUMBER_ID=          # From Meta App > WhatsApp > API Setup

# Neon DB (free tier — neon.tech)
DATABASE_URL=postgresql://...neon.tech/...

# Cloudinary (free tier — cloudinary.com)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
PORT=3000
COMPANY_NAME=Prestige Realty
```

---

## Additional Requirements

1. **Webhook verification**: Implement `GET /webhook` to handle Meta's verification handshake using `hub.mode`, `hub.verify_token`, and `hub.challenge` query params.
2. **Webhook receiver**: `POST /webhook` receives Meta Cloud API message payloads. Parse the nested `entry[0].changes[0].value.messages[0]` structure.
3. **Temp file cleanup**: After uploading to Cloudinary, delete the local processed file from `/media/processed` to avoid disk bloat.
4. **Graceful seeding**: Include a `npm run seed` script that runs `/db/schema.sql` against Neon DB.
5. **README**: Include step-by-step setup — create Meta App, get WhatsApp token and Phone Number ID, configure Neon DB, configure Cloudinary, install deps, run seed, start server, expose via ngrok, set webhook URL on Meta dashboard.
6. **Code quality**: Use `async/await` throughout, proper `try/catch`, modular separation. No monolithic single-file code.
7. **Sample media**: Include instructions in README for adding sample images/videos to `/media/raw` using the naming convention: `{project_id}_1.jpg`, `{project_id}_2.jpg`, `{project_id}_1.mp4`.

Build the complete, production-ready application. All files must be fully implemented, not stubbed. Include all `package.json` dependencies.

---

## Pre-run Checklist

Before running this prompt in Claude Code, complete the following free account setups:

- [ ] **Meta for Developers** — [developers.facebook.com](https://developers.facebook.com) → Create App → Add WhatsApp product → Copy `WHATSAPP_TOKEN` and `PHONE_NUMBER_ID`
- [ ] **Neon DB** — [neon.tech](https://neon.tech) → Create free project → Copy `DATABASE_URL`
- [ ] **Cloudinary** — [cloudinary.com](https://cloudinary.com) → Create free account → Copy `CLOUD_NAME`, `API_KEY`, `API_SECRET`
- [ ] **ngrok** — [ngrok.com](https://ngrok.com) → Install + authenticate → Run `ngrok http 3000` for local dev webhook URL
- [ ] Sample images/videos added to `/media/raw`

---

## Optional Extensions

Append any of these to the prompt for additional features:

- `"Use Upstash Redis (free tier) instead of in-memory Map for session state"` — survives server restarts; Upstash free tier gives 10,000 commands/day
- `"Add a session timeout of 10 minutes, after which state resets automatically"` — avoids zombie sessions
- `"Log all conversations to a Neon DB table for analytics"` — useful for a marketing hub dashboard
- `"Add an admin REST API to manage cities, projects, and media without touching the DB directly"`
- `"Deploy automatically to Render.com free tier with a render.yaml config file"`
