import express from "express";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "mistvil_db.json");

// Allow large payloads for importing novels/covers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to load database
function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading database file, using empty:", e);
    }
  }
  return {};
}

// Helper to save database
function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing to database file:", e);
  }
}

// Initialize default values if empty
const db = loadDb();
const defaults: any = {
  novels: [],
  news: [],
  teams: [],
  suggestions: [],
  comments: [],
  reviews: [],
  reservations: [],
  notifications: [],
  reports: [],
  translator_requests: [],
  chapters: [],
  ads: [],
  // email(lowercase) -> role, so owner role approvals propagate across devices
  // without ever syncing account credentials (users_db stays private)
  role_assignments: {},
  // userId -> badges granted by the owner (admin panel)
  user_badges: {},
  // userId -> public profile + reading stats, published by each member's device
  user_directory: {},
  site_name: "MistVil",
  site_logo: "🌫️",
  site_banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200",
  footer_description: "A leading platform for translating, suggesting, and reading light novels, fantasy, and dark web novels — with top accuracy, protection standards, and a premium visual aesthetic.",
  footer_email: "support@mistvil.com",
  footer_support_text: "Via the official Discord ticket below",
  footer_community_text: "Join our great novel family to get chapter notifications the moment they drop, live before everyone else!",
  footer_socials: [
    { id: "discord", name: "Discord", icon: "👾", url: "https://discord.gg/mistvil", active: true },
    { id: "telegram", name: "Telegram", icon: "📢", url: "https://t.me/mistvil", active: true },
    { id: "facebook", name: "Facebook", icon: "👥", url: "", active: false },
    { id: "twitter", name: "Twitter / X", icon: "🐦", url: "", active: false },
    { id: "instagram", name: "Instagram", icon: "📸", url: "", active: false },
    { id: "tiktok", name: "TikTok", icon: "🎵", url: "", active: false },
    { id: "youtube", name: "YouTube", icon: "📺", url: "", active: false },
    { id: "whatsapp", name: "WhatsApp", icon: "💬", url: "", active: false }
  ]
};

let dbChanged = false;
for (const key of Object.keys(defaults)) {
  if (!(key in db)) {
    db[key] = defaults[key];
    dbChanged = true;
  }
}
if (dbChanged) {
  saveDb(db);
}

// Per-user/private keys must never be stored in or served from the shared
// database — users_db in particular contains account credentials.
const PRIVATE_KEYS = new Set([
  "users_db",
  "current_user_data",
  "current_role",
  "bookmarks",
  "bookmark_times",
  "reading_history",
]);

// API Endpoints
app.get("/api/db", (req, res) => {
  const db = loadDb();
  for (const key of PRIVATE_KEYS) {
    delete db[key];
  }
  // Cheap conditional polling (matches api/db.php): empty 304 when the
  // client already holds the latest data.
  const body = JSON.stringify(db);
  const etag = '"' + createHash("md5").update(body).digest("hex") + '"';
  res.setHeader("ETag", etag);
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }
  res.type("application/json").send(body);
});

// Comments are written by many visitors at once. A plain "replace the whole
// array" write makes the last writer erase everyone else's fresh comments,
// so instead the server merges: comments only the server knows about are
// kept, and for comments both sides know the newest version wins. Deleted
// comments arrive as tombstones ({deleted:true}) so deletions survive the
// merge; tombstones older than 30 days are purged.
function commentTime(c: any): number {
  const t = Date.parse(c?.updatedAt || c?.createdAt || "");
  return Number.isNaN(t) ? 0 : t;
}

function mergeComments(stored: any, incoming: any): any[] {
  const storedList = Array.isArray(stored) ? stored : [];
  const incomingList = Array.isArray(incoming) ? incoming : [];
  const byId = new Map<string, any>();
  for (const c of storedList) {
    if (c && typeof c === "object" && typeof c.id === "string") byId.set(c.id, c);
  }
  for (const c of incomingList) {
    if (!c || typeof c !== "object" || typeof c.id !== "string") continue;
    const prev = byId.get(c.id);
    if (!prev || commentTime(c) >= commentTime(prev)) byId.set(c.id, c);
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return [...byId.values()]
    .filter((c) => !c.deleted || commentTime(c) > cutoff)
    .sort((a, b) => commentTime(b) - commentTime(a));
}

// Novels and chapters used to be synced the naive way too: every client
// POSTed its whole local array and the server stored it as-is. Any device
// holding a stale list (a tab open since yesterday, a reader whose 30s
// view-counter fired before the first sync, another translator publishing)
// would silently erase every record it didn't know about — which is exactly
// how freshly published novels and scheduled chapters kept disappearing for
// visitors. Merge like comments instead: records only the server knows about
// are KEPT, for records both sides know the newest version
// (updatedAt/createdAt) wins, and deletions arrive as tombstones
// ({deleted:true}) so they propagate without letting stale clients wipe data;
// tombstones older than 30 days are purged.
function mergeById(stored: any, incoming: any): any[] {
  const storedList = Array.isArray(stored) ? stored : [];
  const incomingList = Array.isArray(incoming) ? incoming : [];
  const byId = new Map<string, any>();
  for (const c of storedList) {
    if (c && typeof c === "object" && typeof c.id === "string") byId.set(c.id, c);
  }
  for (const c of incomingList) {
    if (!c || typeof c !== "object" || typeof c.id !== "string") continue;
    const prev = byId.get(c.id);
    if (!prev || commentTime(c) >= commentTime(prev)) byId.set(c.id, c);
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return [...byId.values()].filter((c) => !c.deleted || commentTime(c) > cutoff);
}

app.post("/api/db", (req, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== "string") {
    return res.status(400).json({ error: "Missing key" });
  }
  if (PRIVATE_KEYS.has(key)) {
    return res.status(403).json({ error: "This key is private and cannot be synced" });
  }
  const currentDb = loadDb();
  if (key === "comments") {
    currentDb[key] = mergeComments(currentDb[key], value);
  } else if (key === "chapters" || key === "novels") {
    currentDb[key] = mergeById(currentDb[key], value);
  } else {
    currentDb[key] = value;
  }
  saveDb(currentDb);
  res.json({ success: true });
});

// Cross-device accounts (dev parity with public/api/auth.php). Accounts live
// in a separate file that the public /api/db never returns; only a salted
// password hash (computed in the browser) is stored/compared here, and every
// response strips it.
const USERS_FILE = path.join(process.cwd(), "mistvil_users.json");
function loadUsers(): any[] {
  if (fs.existsSync(USERS_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      if (Array.isArray(d)) return d;
    } catch { /* ignore */ }
  }
  return [];
}
function saveUsers(list: any[]): void {
  try { fs.writeFileSync(USERS_FILE, JSON.stringify(list), "utf-8"); } catch (e) { console.error("users write failed", e); }
}
function publicUser(u: any): any { const { passwordHash, ...rest } = u; return rest; }

app.post("/api/auth", (req, res) => {
  const body = req.body || {};
  const action = body.action;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const hash = typeof body.passwordHash === "string" ? body.passwordHash : "";
  if (!email || !hash) return res.status(400).json({ error: "Missing email or credentials" });
  if (email === "mistvil112@gmail.com") return res.status(403).json({ error: "This email is reserved for the platform owner" });

  const users = loadUsers();
  const idx = users.findIndex((u) => typeof u.email === "string" && u.email.toLowerCase() === email);

  if (action === "register") {
    if (idx !== -1) return res.status(409).json({ error: "This email is already registered." });
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!username) return res.status(400).json({ error: "Username is required." });
    const user = {
      id: typeof body.id === "string" ? body.id : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username, email, role: "MEMBER", xp: 0, level: 1,
      avatar: typeof body.avatar === "string" ? body.avatar : "",
      bio: typeof body.bio === "string" ? body.bio : "",
      passwordHash: hash, createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    return res.json({ user: publicUser(user) });
  }
  if (action === "login") {
    if (idx === -1 || users[idx].passwordHash !== hash) return res.status(401).json({ error: "Incorrect email or password." });
    return res.json({ user: publicUser(users[idx]) });
  }
  if (action === "update") {
    if (idx === -1 || users[idx].passwordHash !== hash) return res.status(401).json({ error: "Not authorized to update this account." });
    const updates = body.updates && typeof body.updates === "object" ? body.updates : {};
    const allowed = ["username", "avatar", "bio", "banner", "discord", "telegram", "paypalEmail", "supportLink", "socialLinks", "customStatus"];
    for (const f of allowed) if (f in updates) users[idx][f] = updates[f];
    saveUsers(users);
    return res.json({ user: publicUser(users[idx]) });
  }
  return res.status(400).json({ error: "Unknown action" });
});

// Mount Vite or static assets depending on environment
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
