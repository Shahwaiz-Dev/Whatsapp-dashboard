# Gymclub

A Next.js dashboard for Gymclub to sync members from Google Sheets, organize recipient groups, send WhatsApp messages via Meta Cloud API, and manage conversations in a clean chat UI.

## Features

- **Google Sheets sync** — Import contacts (name, phone, email) from a public sheet
- **Contact management** — Search, filter, and view 24h messaging window status
- **Groups** — Create groups and add members for bulk messaging
- **Compose** — Select contacts/groups and send WhatsApp messages
- **Chat UI** — WhatsApp-style conversation list and message thread with delivery status
- **Webhook** — Receive inbound messages and delivery/read receipts from Meta
- **Auth** — Simple admin password protection

## Tech stack

- Next.js 16 (App Router)
- shadcn/ui + Tailwind CSS 4
- Mongoose + MongoDB Atlas
- Meta WhatsApp Cloud API
- Google Sheets API

## Getting started

### 1. Install dependencies

```bash
cd whatsapp-dashboard
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Dashboard login password |
| `SESSION_SECRET` | Min 32 chars for session encryption |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GOOGLE_SHEETS_ID` | Spreadsheet ID from the sheet URL |
| `GOOGLE_SHEETS_API_KEY` | Google Cloud API key with Sheets API enabled |
| `GOOGLE_SHEETS_RANGE` | e.g. `Sheet1!A2:C1000` |
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Custom string for webhook verification |
| `WHATSAPP_APP_SECRET` | Meta app secret for webhook signature validation |

### 3. Set up MongoDB Atlas

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Under Network Access, allow your IP (and `0.0.0.0/0` for Vercel)
4. Copy the connection string and set `MONGODB_URI` in `.env`:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/whatsapp-dashboard?retryWrites=true&w=majority
   ```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your `ADMIN_PASSWORD`.

---

## Google Sheets setup

1. Create a sheet with headers in row 1: **Name | Phone | Email**
2. Add contact data starting from row 2
3. Share the sheet: **Anyone with the link → Viewer**
4. In [Google Cloud Console](https://console.cloud.google.com/):
   - Create a project
   - Enable **Google Sheets API**
   - Create an **API key** (restrict to Sheets API in production)
5. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
6. Set `GOOGLE_SHEETS_ID` and `GOOGLE_SHEETS_API_KEY` in `.env`
7. In the dashboard, go to **Contacts → Sync from Sheet**

---

## Meta WhatsApp Cloud API setup

1. Create an app at [developers.facebook.com](https://developers.facebook.com)
2. Add the **WhatsApp** product
3. Get your **Phone Number ID** and generate a **Permanent Access Token**
4. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_APP_SECRET`
5. Choose a random `WHATSAPP_VERIFY_TOKEN` string
6. Deploy the app (or use ngrok for local testing)
7. In Meta Developer Console → WhatsApp → Configuration:
   - **Callback URL:** `https://your-domain.com/api/webhooks/whatsapp`
   - **Verify token:** same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages`, `message_status`

### 24-hour messaging window

WhatsApp only allows free-form text messages within **24 hours** of the contact's last inbound message. Outside this window, you must use an **approved template message** (configure templates in Meta Business Manager). The dashboard shows **Can reply** vs **Template required** badges per contact.

---

## Deployment (Vercel)

1. Push to GitHub and import in Vercel
2. Add all environment variables from `.env.example`
3. Set `MONGODB_URI` to your Atlas connection string (use the Vercel + MongoDB Atlas integration or add manually)
4. Configure the Meta webhook URL to your production domain

---

## Project structure

```
src/
├── app/
│   ├── dashboard/          # Protected dashboard pages
│   ├── login/              # Auth page
│   └── api/                # REST API + webhook
├── components/
│   ├── ui/                 # shadcn components
│   ├── layout/             # Sidebar shell
│   ├── contacts/
│   ├── groups/
│   ├── compose/
│   └── chat/
└── lib/
    ├── models/             # Mongoose schemas
    ├── services/           # Business logic
    ├── google-sheets.ts
    ├── whatsapp.ts
    └── auth/session.ts
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |

## License

Private — internal use only.
