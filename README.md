# Torta — Clan Website

Next.js web app for the Torta OSRS clan. Public-facing pages for leaderboards, events, and bingo — plus a Discord-authenticated staff admin panel for activity tracking, member management, and bot configuration.

Works alongside the [Torta Bot](https://github.com/taakko12/Torta), which shares the same Supabase database.

Live at **[tortapounders.vercel.app](https://tortapounders.vercel.app)**

---

## Public Pages

| Page | Description |
|---|---|
| `/` | Home — clan overview and loot highlights |
| `/feed` | Clan Records — loot/death leaderboards, achievements, recent drops, coffer |
| `/events` | Upcoming clan events with RSVP |
| `/cotm` | Clan of the Month standings |
| `/bingo` | Active bingo event — team standings, board, submissions |
| `/player` | Per-player profile — loot, deaths, achievements |
| `/hiscores` | OSRS hiscores lookup |
| `/apply` | Clan application form |
| `/submit-drop` | Manual loot drop submission (screenshot URL or file upload) |
| `/feedback` | Anonymous feedback form (toggled on/off from admin panel) |
| `/rules` | Clan rules |
| `/changelog` | Public-facing patch notes |

---

## Admin Panel

Accessible at `/admin` — requires Discord login and the configured staff role.

| Section | Pages |
|---|---|
| **Members** | Tickets, Applications, Members, Blacklist, Promotions, Recruitments |
| **Clan** | Events, Competitions (SOTW/BOTW), COTM, Bingo |
| **Data** | Activity (Discord + in-game + VC), Loot, Coffer |
| **Comms** | Messenger, Changelog, Feedback |
| **System** | Logs, Settings |

### Key Admin Features

- **Tickets** — mod mail thread viewer; reply directly from the panel
- **Applications** — approve or reject new member applications; approval updates the embed in-place and DMs the applicant
- **Members** — full member roster with RSN links, activity, absence tracking, and WOM departure check
- **Promotions** — role changes with audit log; automatically strips the Guest role on any promotion
- **Loot** — edit GP values inline, delete entries, toggle to see only flagged drops, clear review flags
- **Coffer** — donation leaderboard with manual log entry and activity log
- **Activity** — Discord message counts, in-game chat counts, and VC time for every linked member
- **Settings** — configure all bot channel IDs, feature toggles (feedback form, in-game chat tracking, VC tracking), scheduled job times, role panel, and recap filters

---

## Setup

### 1. Discord OAuth2

You can reuse the bot's Discord application or create a separate one.

1. [Discord Developer Portal](https://discord.com/developers/applications) → open your application
2. **OAuth2** → add redirect URLs:
   - Local: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://your-site-url/api/auth/callback/discord`
3. Copy **Client ID** and **Client Secret**

### 2. Supabase

Use the same project as the bot. If you haven't already, run the bot's `schema.sql`.

From **Settings → API**, copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Discord IDs

- **Guild ID** — right-click server name (Developer Mode on) → copy
- **Admin Role ID** — right-click the staff role → copy
- **Bot Token** — Developer Portal → Bot → copy (used server-side to verify admin role membership)

### 4. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Discord
NEXT_PUBLIC_GUILD_ID=your_server_id
DISCORD_CLIENT_ID=your_oauth_client_id
DISCORD_CLIENT_SECRET=your_oauth_client_secret
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_ADMIN_ROLE_ID=your_staff_role_id

# NextAuth
NEXTAUTH_SECRET=any_random_string_32_chars_min
NEXTAUTH_URL=http://localhost:3000   # set to your production URL on Vercel

# Bot communication (must match BOT_ADMIN_SECRET in the bot's env)
BOT_BASE_URL=https://your-bot-url.railway.app
BOT_ADMIN_SECRET=same_secret_as_bot

# Wise Old Man
WOM_GROUP_ID=your_wom_group_id

# Discord channel IDs for public deep links (optional)
NEXT_PUBLIC_DROPS_CHANNEL_ID=your_drops_channel_id
NEXT_PUBLIC_PLANKS_CHANNEL_ID=your_planks_channel_id

# Optional overrides
GUEST_ROLE_ID=discord_guest_role_id   # defaults to 1519867633069981818
```

Generate `NEXTAUTH_SECRET`: `openssl rand -base64 32`

### 5. Install & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Deploy to Vercel

1. Push the repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Add all env vars under **Settings → Environment Variables**
4. Set `NEXTAUTH_URL` to your Vercel URL (e.g. `https://tortapounders.vercel.app`)
5. Add the Vercel URL to the Discord OAuth2 redirect list in the Developer Portal

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side admin writes) |
| `NEXT_PUBLIC_GUILD_ID` | Yes | Discord server ID — scopes all data queries |
| `DISCORD_CLIENT_ID` | Yes | Discord OAuth2 client ID |
| `DISCORD_CLIENT_SECRET` | Yes | Discord OAuth2 client secret |
| `DISCORD_BOT_TOKEN` | Yes | Bot token — used to verify admin role membership |
| `DISCORD_ADMIN_ROLE_ID` | Yes | Role ID that grants access to the admin panel |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `NEXTAUTH_URL` | Yes | Full URL of the deployed site |
| `BOT_BASE_URL` | Yes | Railway URL of the bot (for admin API calls) |
| `BOT_ADMIN_SECRET` | Yes | Shared secret — must match the bot's `BOT_ADMIN_SECRET` |
| `WOM_GROUP_ID` | No | Wise Old Man group ID — enables WOM API routes |
| `NEXT_PUBLIC_DROPS_CHANNEL_ID` | No | Drops channel ID for Discord deep links on the feed page |
| `NEXT_PUBLIC_PLANKS_CHANNEL_ID` | No | Deaths channel ID for Discord deep links |
| `GUEST_ROLE_ID` | No | Guest role to strip on promotion (has a hardcoded default) |

---

## Project Structure

```
├── app/
│   ├── layout.tsx                  # Root layout — navbar, footer
│   ├── page.tsx                    # Home page
│   ├── feed/page.tsx               # Clan Records (leaderboards, recent drops, coffer)
│   ├── events/                     # Public events page
│   ├── cotm/                       # COTM standings
│   ├── bingo/                      # Bingo viewer
│   ├── player/                     # Player profile
│   ├── hiscores/                   # Hiscores lookup
│   ├── apply/                      # Application form
│   ├── submit-drop/                # Manual drop submission
│   ├── feedback/                   # Anonymous feedback form
│   ├── rules/                      # Clan rules
│   ├── changelog/                  # Public changelog
│   ├── terms/                      # Terms of Service
│   ├── privacy/                    # Privacy Policy
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout — sidebar nav, auth gate
│   │   ├── page.tsx                # Dashboard
│   │   ├── _lib/data.ts            # Shared types and data fetchers
│   │   ├── _components/            # Admin panel UI components
│   │   ├── tickets/                # Mod mail tickets
│   │   ├── applications/           # Member applications
│   │   ├── members/                # Member roster + WOM check
│   │   ├── blacklist/              # Blacklist management
│   │   ├── promotions/             # Role promotions
│   │   ├── recruitments/           # Recruitment tracking
│   │   ├── events/                 # Clan event management
│   │   ├── comp/                   # SOTW/BOTW competition management
│   │   ├── cotm/                   # COTM management
│   │   ├── bingo/                  # Bingo management
│   │   ├── activity/               # Member activity tables
│   │   ├── loot/                   # Loot table + review flags
│   │   ├── coffer/                 # Coffer donations
│   │   ├── messenger/              # Mass Discord messaging
│   │   ├── changelog/              # Changelog management
│   │   ├── feedback/               # Community feedback viewer
│   │   ├── logs/                   # Admin action logs
│   │   └── settings/               # Bot config, feature toggles, scheduled jobs
│   └── api/
│       ├── auth/                   # NextAuth Discord OAuth
│       ├── feedback/               # Public feedback submission
│       ├── loot-review/            # Public drop review request
│       ├── submit-drop/            # Public drop submission
│       └── admin/                  # Admin-only API routes (auth-gated)
├── components/                     # Shared UI components
└── lib/
    ├── auth.ts                     # getServerSession, isAdmin
    ├── supabase-admin.ts           # Supabase admin client
    ├── data.ts                     # Public data fetchers
    └── utils.ts                    # formatGp, currentMonthLabel, etc.
```
