# Clan Website

A Next.js web app for OSRS clans. Public-facing pages for loot drops, deaths, achievements, and bingo — plus a Discord-authenticated admin panel for activity tracking, promotion notes, clan event scheduling, and bot channel configuration.

Built to work alongside the [Clan Leaderboard Bot](https://github.com/your-org/clan-leaderboard-bot). Both connect to the same Supabase database.

---

## Features

### Public pages
- **Loot leaderboard** — monthly and all-time drop rankings from Dink webhooks
- **Death leaderboard** — monthly death counts
- **Achievement feed** — clan achievement broadcasts from TrackScape
- **Bingo** — view active bingo events, team standings, and submission status
- **Player profile** — per-player loot, death, and achievement summary

### Admin panel (Discord login required, admin role gated)
- **Activity** — Discord message counts, in-game clan chat counts, and voice channel minutes for every member. Linked RSNs shown inline. Promotion notes editable per member.
- **Combined view** — merge Discord and in-game activity into a single table sorted by this month's activity.
- **VC activity** — time spent in voice channels (all-time + this month), formatted as `Xd Xh Xm`.
- **Clan events** — create events with title, description, date, and Discord channel. The bot posts an embed with RSVP buttons. Admin panel shows RSVP counts and attendee lists.
- **Settings** — configure which Discord channels the bot watches for each feature (drops, deaths, clan chat, broadcasts, welcome, inactivity alerts, weekly recap).

---

## Setup

### 1. Create a Discord OAuth2 application

You can reuse the same Discord application as the bot, or create a separate one.

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and open your application.
2. Under **OAuth2**, add a redirect URL:
   - Local: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://your-site-url/api/auth/callback/discord`
3. Copy the **Client ID** (`DISCORD_CLIENT_ID`) and **Client Secret** (`DISCORD_CLIENT_SECRET`).

### 2. Set up Supabase

Use the same Supabase project as the bot. If you haven't already, run the bot's `schema.sql` in the SQL Editor.

From **Settings → API**, copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Find your Discord IDs

**Guild ID** — right-click your server name in Discord with Developer Mode on (User Settings → Advanced) and copy the ID.

**Admin Role ID** — right-click the role you want to grant admin access to the panel (e.g. `@Staff`) and copy the ID.

**Bot Token** — from the Discord Developer Portal → Bot → copy the token. The website uses this to verify admin role membership.

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Discord
NEXT_PUBLIC_GUILD_ID=your_server_id
DISCORD_CLIENT_ID=your_oauth_client_id
DISCORD_CLIENT_SECRET=your_oauth_client_secret
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_ADMIN_ROLE_ID=your_admin_role_id

# NextAuth
NEXTAUTH_SECRET=any_random_string_at_least_32_chars
NEXTAUTH_URL=http://localhost:3000

# Wise Old Man (optional — enables /api/wom routes)
WOM_GROUP_ID=your_wom_group_id
```

Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

### 5. Install & run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Deploy to Railway

1. Push the repo to GitHub.
2. In [Railway](https://railway.app), create a new project from the GitHub repo.
3. Add all environment variables under the service's **Variables** tab.
4. Set `NEXTAUTH_URL` to your Railway public URL (e.g. `https://your-site.railway.app`).
5. Add the Railway URL to the Discord OAuth2 redirect list in the Developer Portal.

---

## Switching to a different Discord server

All server-specific data is isolated by `guild_id` in Supabase. To point the website at a different server:

1. Update `NEXT_PUBLIC_GUILD_ID` to the new server ID.
2. Update `DISCORD_ADMIN_ROLE_ID` to a role ID from the new server.
3. Redeploy (Railway picks up env var changes automatically).

The admin panel's Settings tab lets you update channel IDs without touching env vars or redeploying.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public, read-only RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side admin writes) |
| `NEXT_PUBLIC_GUILD_ID` | Yes | Discord server ID — scopes all data queries |
| `DISCORD_CLIENT_ID` | Yes | Discord OAuth2 client ID (for login) |
| `DISCORD_CLIENT_SECRET` | Yes | Discord OAuth2 client secret |
| `DISCORD_BOT_TOKEN` | Yes | Bot token — used server-side to verify admin role |
| `DISCORD_ADMIN_ROLE_ID` | Yes | Role ID that grants access to the admin panel |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `NEXTAUTH_URL` | Yes | Full URL of the deployed site |
| `WOM_GROUP_ID` | No | Wise Old Man group ID — enables WOM API routes |

---

## Project Structure

```
├── app/
│   ├── page.tsx                    # Home / loot leaderboard
│   ├── admin/
│   │   ├── page.tsx                # Admin panel entry
│   │   └── AdminDashboard.tsx      # Full admin panel (activity, events, settings)
│   ├── player/[rsn]/
│   │   └── page.tsx                # Public player profile
│   ├── bingo/                      # Bingo event viewer
│   └── api/
│       ├── auth/                   # NextAuth Discord OAuth
│       ├── admin/
│       │   ├── activity/route.ts   # GET activity tables, PATCH promotion notes
│       │   ├── events/route.ts     # GET/POST/DELETE clan events + RSVP list
│       │   └── config/route.ts     # GET/PATCH guild channel config
│       ├── drops/route.ts          # Public loot leaderboard data
│       ├── planks/route.ts         # Public death leaderboard data
│       ├── achievements/route.ts   # Public achievement feed
│       └── wom/                    # WOM proxy routes
├── lib/
│   ├── auth.ts                     # getServerSession, isAdmin (role check via bot token)
│   └── supabase-admin.ts           # Supabase admin client (service role)
└── components/                     # Shared UI components
```
