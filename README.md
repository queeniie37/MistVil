# MistVil 🌫️

**MistVil** is a premium English-language platform for suggesting, translating, publishing, and reading web novels: translated Korean, Chinese, and Japanese novels alongside original works — with a reservation system and rich community interaction, built for an international English-reading audience.

## Key Features

- **Full novel lifecycle**: member-voted suggestions → translator reservation (30 days + extension) → translation → owner approval → publishing → follow/complete.
- **Advanced chapter editor**: drafts, inline images, custom numbering, and automatic scheduled publishing.
- **Advanced reader**: font and color customization, offline reading, chapter navigation, and chapter downloads (PNG / JPG / TXT) with the owner's permission.
- **Interactive community**: comments with replies, likes, and spoiler tags, structured reviews, reports, notifications, and an XP system with levels and badges.
- **Admin panels**: a comprehensive owner panel (approvals, roles, badges, ads, site settings) and a translator panel (novels, chapters, reservations, edit requests).
- **Near-real-time sync** between visitors via lightweight polling with an ETag/304 handshake.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS 4 |
| Dev server | Express (`server.ts`) on port 3000 |
| Production backend | Pure PHP (`public/api/db.php`) — runs on shared hosting with no Node.js |
| Database | Shared JSON file (`mistvil_db.json`) with atomic writes and rotating backups |
| Browser storage | IndexedDB (with localStorage fallback) |
| Deployment | GitHub Actions → FTP to Hostinger |

## Running Locally

**Requirements:** Node.js

```bash
npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # production build into dist/
npm run lint     # TypeScript type checking
```

## Deployment

See the detailed deployment guide: [DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md)
