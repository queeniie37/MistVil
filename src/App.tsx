import React, { useState, useEffect } from "react";
import { BookOpen, Library, Bookmark, Compass, Flame, Shield, Award, ChevronLeft, Moon, Database, User, Megaphone, PenTool } from "lucide-react";
import { Novel, Chapter, LibraryEntry, BookmarkedParagraph, ReadingSettings, ReadingStats, Badge, UserProfile, RoleRequest, PendingNovel, TrashItem, Announcement } from "./types";
import { MOCK_NOVELS, DEFAULT_BADGES } from "./data";
import ExploreView from "./components/ExploreView";
import MyLibraryView from "./components/MyLibraryView";
import NovelDetailView from "./components/NovelDetailView";
import NovelReaderView from "./components/NovelReaderView";
import BookmarksView from "./components/BookmarksView";
import AdminPanelView from "./components/AdminPanelView";
import UserProfileView from "./components/UserProfileView";
import AnnouncementsView from "./components/AnnouncementsView";
import WorkPanelView from "./components/WorkPanelView";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_SETTINGS: ReadingSettings = {
  fontFamily: "Tajawal",
  fontSize: 20,
  lineHeight: "relaxed",
  theme: "darkFog",
  containerWidth: "comfortable",
  autoScrollSpeed: 0
};

const getInitialWeeklyHistory = () => {
  const history: { [date: string]: number } = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    history[dateStr] = 0;
  }
  return history;
};

const DEFAULT_STATS: ReadingStats = {
  totalChaptersRead: 0,
  totalWordsRead: 0,
  currentStreak: 0,
  lastReadDate: "",
  weeklyHistory: getInitialWeeklyHistory(),
  badges: []
};

export default function App() {
  // Navigation & Router
  const [activeTab, setActiveTab] = useState<"explore" | "library" | "bookmarks" | "detail" | "reader" | "admin" | "profile" | "work" | "announcements">("explore");
  const [selectedNovelId, setSelectedNovelId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Persistent States
  const [novels, setNovels] = useState<Novel[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedParagraph[]>([]);
  const [readHistory, setReadHistory] = useState<{ [novelId: string]: string[] }>({});
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<ReadingStats>(DEFAULT_STATS);

  // Auth, Roles, Pending lists, Trash Bin & Announcements States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [pendingNovels, setPendingNovels] = useState<PendingNovel[]>([]);
  const [trashBin, setTrashBin] = useState<TrashItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // New Badge Unlock Notification
  const [unlockedBadgeNotify, setUnlockedBadgeNotify] = useState<Badge | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedNovels = localStorage.getItem("mistvil-novels");
    if (savedNovels) {
      setNovels(JSON.parse(savedNovels));
    } else {
      setNovels(MOCK_NOVELS);
      localStorage.setItem("mistvil-novels", JSON.stringify(MOCK_NOVELS));
    }

    const savedLibrary = localStorage.getItem("mistvil-library");
    if (savedLibrary) setLibrary(JSON.parse(savedLibrary));

    const savedBookmarks = localStorage.getItem("mistvil-bookmarks");
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

    const savedHistory = localStorage.getItem("mistvil-readHistory");
    if (savedHistory) setReadHistory(JSON.parse(savedHistory));

    const savedSettings = localStorage.getItem("mistvil-settings");
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    const savedStats = localStorage.getItem("mistvil-stats");
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      const currentHistory = getInitialWeeklyHistory();
      const updatedHistory = { ...currentHistory, ...parsed.weeklyHistory };
      setStats({ ...parsed, weeklyHistory: updatedHistory });
    } else {
      setStats(DEFAULT_STATS);
    }

    // Load registered users or seed defaults
    const savedUsers = localStorage.getItem("mistvil-registered-users");
    if (savedUsers) {
      setRegisteredUsers(JSON.parse(savedUsers));
    } else {
      const defaultUsers: UserProfile[] = [
        {
          username: "Owner_Mist",
          email: "mistvil112@gmail.com",
          avatar: "monarch",
          bio: "Monarch and founder of the MistVil Imperial Sanctuary.",
          title: "Supreme Monarch 👑",
          createdAt: "2026-01-01",
          role: "owner",
          level: 50,
          xp: 15400,
          favorites: [],
          paypal: "paypal.me/mistvil",
          telegram: "@mistvil_dev",
          discord: "mistvil#1120"
        },
        {
          username: "ShadowTrans",
          email: "shadow_translator@mist.com",
          avatar: "mage",
          bio: "Shadow Realm official translator. Master of spell chants.",
          title: "Senior Translator 🔮",
          createdAt: "2026-03-12",
          role: "translator",
          level: 32,
          xp: 8400,
          favorites: ["lord-of-mysteries"],
          paypal: "paypal.me/shadowtrans",
          telegram: "@shadow_trans",
          discord: "shadow#9999"
        }
      ];
      setRegisteredUsers(defaultUsers);
      localStorage.setItem("mistvil-registered-users", JSON.stringify(defaultUsers));
    }

    // Load role upgrade requests or seed
    const savedRequests = localStorage.getItem("mistvil-role-requests");
    if (savedRequests) {
      setRoleRequests(JSON.parse(savedRequests));
    } else {
      const defaultRequests: RoleRequest[] = [
        {
          id: "req-1",
          username: "FutureWriter",
          email: "future_writer@mist.com",
          requestedRole: "writer",
          status: "pending",
          date: "2026-07-10"
        }
      ];
      setRoleRequests(defaultRequests);
      localStorage.setItem("mistvil-role-requests", JSON.stringify(defaultRequests));
    }

    // Load pending novels or seed
    const savedPending = localStorage.getItem("mistvil-pending-novels");
    if (savedPending) {
      setPendingNovels(JSON.parse(savedPending));
    } else {
      const defaultPending: PendingNovel[] = [
        {
          id: "pending-1",
          novel: {
            id: "sword-emperor-legacy",
            title: "The Sword Emperor's Legacy",
            englishTitle: "The Sword Emperor's Legacy",
            coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300",
            author: "Ye Tian",
            translator: "ShadowTrans",
            description: "A legendary swordsman wakes up in a trash body of a minor noble. Armed with his supreme swordsmanship and memories, he defies heaven and rebuilds his empire!",
            genres: ["Wuxia", "Action", "Martial Arts"],
            tags: ["Swordsman", "Reborn", "Determined MC"],
            rating: 4.9,
            chaptersCount: 0,
            status: "مستمرة",
            viewCount: 120,
            chapters: []
          },
          submittedBy: "shadow_translator@mist.com",
          status: "pending",
          date: "2026-07-11"
        }
      ];
      setPendingNovels(defaultPending);
      localStorage.setItem("mistvil-pending-novels", JSON.stringify(defaultPending));
    }

    // Load trash bin
    const savedTrash = localStorage.getItem("mistvil-trash-bin");
    if (savedTrash) {
      setTrashBin(JSON.parse(savedTrash));
    } else {
      setTrashBin([]);
    }

    // Load announcements or seed
    const savedAnnouncements = localStorage.getItem("mistvil-announcements");
    if (savedAnnouncements) {
      setAnnouncements(JSON.parse(savedAnnouncements));
    } else {
      const defaultAnn: Announcement[] = [
        {
          id: "ann-1",
          title: "Welcome to MistVil Translated Sanctuary!",
          content: "We are thrilled to launch the brand new MistVil Translated Novels Portal. Expect lightning-fast chapter loading, beautiful dark custom layouts, and a dedicated workspace for translators!",
          author: "Owner_Mist",
          date: "2026-07-11"
        },
        {
          id: "ann-2",
          title: "M1213vil Custom Chapter Released",
          content: "The Supreme Monarch has authorized the initial batch release of custom translations. Explore pristine translations with footnotes!",
          author: "Owner_Mist",
          date: "2026-07-11"
        }
      ];
      setAnnouncements(defaultAnn);
      localStorage.setItem("mistvil-announcements", JSON.stringify(defaultAnn));
    }

    // Load current logged-in user if any
    const savedCurrentUser = localStorage.getItem("mistvil-current-user");
    if (savedCurrentUser) {
      setCurrentUser(JSON.parse(savedCurrentUser));
    }
  }, []);

  // Save actions to local storage helper
  const saveToLocalStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Auth Operations
  const handleLogin = (email: string, pass: string): boolean => {
    // Check owner credentials strictly
    if (email === "mistvil112@gmail.com" && pass === "M1213vil") {
      let ownerUser = registeredUsers.find(u => u.email === "mistvil112@gmail.com");
      if (!ownerUser) {
        ownerUser = {
          username: "Owner_Mist",
          email: "mistvil112@gmail.com",
          avatar: "monarch",
          bio: "Monarch and founder of the MistVil Imperial Sanctuary.",
          title: "Supreme Monarch 👑",
          createdAt: "2026-01-01",
          role: "owner",
          level: 50,
          xp: 15400,
          favorites: [],
          paypal: "paypal.me/mistvil",
          telegram: "@mistvil_dev",
          discord: "mistvil#1120"
        };
        const updatedUsers = [ownerUser, ...registeredUsers.filter(u => u.email !== "mistvil112@gmail.com")];
        setRegisteredUsers(updatedUsers);
        saveToLocalStorage("mistvil-registered-users", updatedUsers);
      }
      setCurrentUser(ownerUser);
      saveToLocalStorage("mistvil-current-user", ownerUser);
      return true;
    }

    // Check ordinary registered users
    const matched = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setCurrentUser(matched);
      saveToLocalStorage("mistvil-current-user", matched);
      return true;
    }

    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("mistvil-current-user");
    setActiveTab("explore");
  };

  const handleUpdateUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    saveToLocalStorage("mistvil-current-user", updated);

    // Update inside registeredUsers too
    const updatedList = registeredUsers.map(u => u.email.toLowerCase() === updated.email.toLowerCase() ? updated : u);
    setRegisteredUsers(updatedList);
    saveToLocalStorage("mistvil-registered-users", updatedList);
  };

  // Roles request submission
  const handleSendRoleRequest = (requestedRole: "translator" | "writer") => {
    if (!currentUser) return;
    const newReq: RoleRequest = {
      id: `req-${Date.now()}`,
      username: currentUser.username,
      email: currentUser.email,
      requestedRole,
      status: "pending",
      date: new Date().toISOString().split("T")[0]
    };
    const updated = [newReq, ...roleRequests];
    setRoleRequests(updated);
    saveToLocalStorage("mistvil-role-requests", updated);
  };

  // Owner Admin Panel Approvals/Rejections
  const handleApproveRole = (requestId: string) => {
    const matchedReq = roleRequests.find(r => r.id === requestId);
    if (!matchedReq) return;

    // Update role in registered users
    const updatedUsers = registeredUsers.map(u => {
      if (u.email.toLowerCase() === matchedReq.email.toLowerCase()) {
        return {
          ...u,
          role: matchedReq.requestedRole,
          title: matchedReq.requestedRole === "translator" ? "Prism Realm Translator 🔮" : "Genesis Book Creator ✍️"
        };
      }
      return u;
    });
    setRegisteredUsers(updatedUsers);
    saveToLocalStorage("mistvil-registered-users", updatedUsers);

    // Update current user role if matches
    if (currentUser && currentUser.email.toLowerCase() === matchedReq.email.toLowerCase()) {
      const updatedCur = {
        ...currentUser,
        role: matchedReq.requestedRole,
        title: matchedReq.requestedRole === "translator" ? "Prism Realm Translator 🔮" : "Genesis Book Creator ✍️"
      };
      setCurrentUser(updatedCur);
      saveToLocalStorage("mistvil-current-user", updatedCur);
    }

    // Mark request approved
    const updatedReqs = roleRequests.map(r => r.id === requestId ? { ...r, status: "approved" as const } : r);
    setRoleRequests(updatedReqs);
    saveToLocalStorage("mistvil-role-requests", updatedReqs);
  };

  const handleRejectRole = (requestId: string) => {
    const updatedReqs = roleRequests.map(r => r.id === requestId ? { ...r, status: "rejected" as const } : r);
    setRoleRequests(updatedReqs);
    saveToLocalStorage("mistvil-role-requests", updatedReqs);
  };

  const handleApproveNovel = (requestId: string) => {
    const pending = pendingNovels.find(p => p.id === requestId);
    if (!pending) return;

    // 1. Save novel into Core Database
    const updatedNovels = [...novels, pending.novel];
    setNovels(updatedNovels);
    saveToLocalStorage("mistvil-novels", updatedNovels);

    // 2. Mark pending novel as approved
    const updatedPending = pendingNovels.map(p => p.id === requestId ? { ...p, status: "approved" as const } : p);
    setPendingNovels(updatedPending);
    saveToLocalStorage("mistvil-pending-novels", updatedPending);
  };

  const handleRejectNovel = (requestId: string) => {
    const updatedPending = pendingNovels.map(p => p.id === requestId ? { ...p, status: "rejected" as const } : p);
    setPendingNovels(updatedPending);
    saveToLocalStorage("mistvil-pending-novels", updatedPending);
  };

  const handleUpdateUserRole = (email: string, role: 'reader' | 'translator' | 'writer' | 'owner') => {
    const updatedList = registeredUsers.map(u => {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return {
          ...u,
          role,
          title: role === "owner" ? "Supreme Monarch 👑" : role === "translator" ? "Prism Realm Translator 🔮" : role === "writer" ? "Genesis Book Creator ✍️" : "Mist Wanderer"
        };
      }
      return u;
    });
    setRegisteredUsers(updatedList);
    saveToLocalStorage("mistvil-registered-users", updatedList);

    // If current user updated
    if (currentUser && currentUser.email.toLowerCase() === email.toLowerCase()) {
      const updatedCur = {
        ...currentUser,
        role,
        title: role === "owner" ? "Supreme Monarch 👑" : role === "translator" ? "Prism Realm Translator 🔮" : role === "writer" ? "Genesis Book Creator ✍️" : "Mist Wanderer"
      };
      setCurrentUser(updatedCur);
      saveToLocalStorage("mistvil-current-user", updatedCur);
    }
  };

  // Trash Bin Operations (Restore, Permanent Delete)
  const handleRestoreTrashItem = (itemId: string) => {
    const item = trashBin.find(t => t.id === itemId);
    if (!item) return;

    if (item.type === "novel") {
      const restoredNovel = item.data as Novel;
      const updatedNovels = [...novels, restoredNovel];
      setNovels(updatedNovels);
      saveToLocalStorage("mistvil-novels", updatedNovels);
    } else if (item.type === "chapter" && item.parentNovelId) {
      const restoredCh = item.data as Chapter;
      const updatedNovels = novels.map(n => {
        if (n.id === item.parentNovelId) {
          const reordered = [...n.chapters, restoredCh].sort((a, b) => a.chapterNumber - b.chapterNumber);
          return {
            ...n,
            chaptersCount: reordered.length,
            chapters: reordered
          };
        }
        return n;
      });
      setNovels(updatedNovels);
      saveToLocalStorage("mistvil-novels", updatedNovels);
    }

    // Remove from trashBin
    const updatedTrash = trashBin.filter(t => t.id !== itemId);
    setTrashBin(updatedTrash);
    saveToLocalStorage("mistvil-trash-bin", updatedTrash);
  };

  const handleDeleteTrashItemPermanently = (itemId: string) => {
    const updatedTrash = trashBin.filter(t => t.id !== itemId);
    setTrashBin(updatedTrash);
    saveToLocalStorage("mistvil-trash-bin", updatedTrash);
  };

  // Core Novels / Chapter additions & Deletions
  const handleAddNovel = (newNovel: Novel) => {
    const updated = [...novels, newNovel];
    setNovels(updated);
    saveToLocalStorage("mistvil-novels", updated);
  };

  const handleUpdateNovel = (updatedNovel: Novel) => {
    const updated = novels.map(n => n.id === updatedNovel.id ? updatedNovel : n);
    setNovels(updated);
    saveToLocalStorage("mistvil-novels", updated);
  };

  // Delete Novel - Confirms 2 times on admin UI and transfers to TRASH BIN
  const handleDeleteNovel = (novelId: string) => {
    const novelToDelete = novels.find(n => n.id === novelId);
    if (!novelToDelete) return;

    // 1. Remove from active novels
    const updated = novels.filter((n) => n.id !== novelId);
    setNovels(updated);
    saveToLocalStorage("mistvil-novels", updated);

    // 2. Put into trash bin
    const trashItem: TrashItem = {
      id: `trash-novel-${Date.now()}`,
      type: "novel",
      title: novelToDelete.title,
      data: novelToDelete,
      deletedAt: new Date().toLocaleString()
    };
    const updatedTrash = [trashItem, ...trashBin];
    setTrashBin(updatedTrash);
    saveToLocalStorage("mistvil-trash-bin", updatedTrash);
    
    // Cleanup library entry if any
    const updatedLib = library.filter((l) => l.novelId !== novelId);
    setLibrary(updatedLib);
    saveToLocalStorage("mistvil-library", updatedLib);
  };

  // Delete Chapter - transfers to TRASH BIN
  const handleDeleteChapter = (novelId: string, chapterId: string) => {
    const novel = novels.find(n => n.id === novelId);
    if (!novel) return;

    const chapterToDelete = novel.chapters.find(c => c.id === chapterId);
    if (!chapterToDelete) return;

    // 1. Remove chapter from novel's chapters list
    const updatedNovels = novels.map(n => {
      if (n.id === novelId) {
        const filteredChs = n.chapters.filter(c => c.id !== chapterId);
        return {
          ...n,
          chaptersCount: filteredChs.length,
          chapters: filteredChs
        };
      }
      return n;
    });
    setNovels(updatedNovels);
    saveToLocalStorage("mistvil-novels", updatedNovels);

    // 2. Put into trash bin
    const trashItem: TrashItem = {
      id: `trash-ch-${Date.now()}`,
      type: "chapter",
      title: `Chapter ${chapterToDelete.chapterNumber}: ${chapterToDelete.title} (from novel ${novel.title})`,
      parentNovelId: novelId,
      data: chapterToDelete,
      deletedAt: new Date().toLocaleString()
    };
    const updatedTrash = [trashItem, ...trashBin];
    setTrashBin(updatedTrash);
    saveToLocalStorage("mistvil-trash-bin", updatedTrash);
  };

  const handleAddChapter = (novelId: string, chapter: Chapter) => {
    const updated = novels.map((n) => {
      if (n.id === novelId) {
        const chaptersCopy = [...n.chapters, chapter].sort((a, b) => a.chapterNumber - b.chapterNumber);
        return {
          ...n,
          chaptersCount: chaptersCopy.length,
          chapters: chaptersCopy
        };
      }
      return n;
    });
    setNovels(updated);
    saveToLocalStorage("mistvil-novels", updated);
  };

  // Submit pending novel for translator/writer
  const handleSubmitPendingNovel = (pending: PendingNovel) => {
    const updated = [pending, ...pendingNovels];
    setPendingNovels(updated);
    saveToLocalStorage("mistvil-pending-novels", updated);
  };

  // Public Announcements Management
  const handleAddAnnouncement = (title: string, content: string) => {
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      content,
      author: currentUser?.username || "Owner_Mist",
      date: new Date().toISOString().split("T")[0]
    };
    const updated = [newAnn, ...announcements];
    setAnnouncements(updated);
    saveToLocalStorage("mistvil-announcements", updated);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    saveToLocalStorage("mistvil-announcements", updated);
  };

  const handleResetData = () => {
    setNovels(MOCK_NOVELS);
    setLibrary([]);
    setBookmarks([]);
    setReadHistory({});
    setStats(DEFAULT_STATS);
    setTrashBin([]);
    setRoleRequests([]);
    
    localStorage.setItem("mistvil-novels", JSON.stringify(MOCK_NOVELS));
    localStorage.setItem("mistvil-library", JSON.stringify([]));
    localStorage.setItem("mistvil-bookmarks", JSON.stringify([]));
    localStorage.setItem("mistvil-readHistory", JSON.stringify({}));
    localStorage.setItem("mistvil-stats", JSON.stringify(DEFAULT_STATS));
    localStorage.setItem("mistvil-trash-bin", JSON.stringify([]));
    localStorage.setItem("mistvil-role-requests", JSON.stringify([]));
    setActiveTab("explore");
  };

  // Add/Remove and update Tracking list
  const handleUpdateLibraryStatus = (novelId: string, status: LibraryEntry["status"]) => {
    const novel = novels.find((n) => n.id === novelId);
    if (!novel) return;

    let updated: LibraryEntry[];
    const existing = library.find((entry) => entry.novelId === novelId);

    if (existing) {
      updated = library.map((entry) =>
        entry.novelId === novelId
          ? { ...entry, status, lastReadAt: new Date().toISOString() }
          : entry
      );
    } else {
      updated = [
        ...library,
        {
          novelId,
          status,
          addedAt: new Date().toISOString(),
          lastReadAt: new Date().toISOString()
        }
      ];
    }
    setLibrary(updated);
    saveToLocalStorage("mistvil-library", updated);
  };

  const handleRemoveFromLibrary = (novelId: string) => {
    const updated = library.filter((entry) => entry.novelId !== novelId);
    setLibrary(updated);
    saveToLocalStorage("mistvil-library", updated);
  };

  // Update Reading settings
  const handleUpdateSettings = (newSettings: ReadingSettings) => {
    setSettings(newSettings);
    saveToLocalStorage("mistvil-settings", newSettings);
  };

  // Add Bookmarked paragraph
  const handleAddBookmark = (newB: Omit<BookmarkedParagraph, "id" | "bookmarkedAt">) => {
    const bookmarkItem: BookmarkedParagraph = {
      ...newB,
      id: `b-item-${Date.now()}`,
      bookmarkedAt: new Date().toISOString()
    };
    const updated = [bookmarkItem, ...bookmarks];
    setBookmarks(updated);
    saveToLocalStorage("mistvil-bookmarks", updated);

    // Evaluate Bookmark badge unlock
    if (updated.length >= 5) {
      triggerBadgeUnlock("bookmark_master");
    }
  };

  const handleRemoveBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    saveToLocalStorage("mistvil-bookmarks", updated);
  };

  // Evaluate reading metrics
  const handleChapterCompleted = (novelId: string, chapterId: string, scrollPercent: number) => {
    if (scrollPercent < 80) return;

    const novel = novels.find((n) => n.id === novelId);
    if (!novel) return;

    const chapter = novel.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) return;

    const novelHistory = readHistory[novelId] || [];
    if (novelHistory.includes(chapterId)) {
      updateLibraryProgress(novelId, chapterId, chapter.chapterNumber, scrollPercent);
      return;
    }

    const updatedNovelHistory = [...novelHistory, chapterId];
    const updatedReadHistory = { ...readHistory, [novelId]: updatedNovelHistory };
    setReadHistory(updatedReadHistory);
    saveToLocalStorage("mistvil-readHistory", updatedReadHistory);

    updateLibraryProgress(novelId, chapterId, chapter.chapterNumber, scrollPercent);

    const todayStr = new Date().toISOString().split("T")[0];

    let streak = stats.currentStreak;
    if (!stats.lastReadDate) {
      streak = 1;
    } else {
      const lastRead = new Date(stats.lastReadDate);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today.getTime() - lastRead.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }

    const weeklyCopy = { ...stats.weeklyHistory };
    weeklyCopy[todayStr] = (weeklyCopy[todayStr] || 0) + 1;

    const updatedStats: ReadingStats = {
      ...stats,
      totalChaptersRead: stats.totalChaptersRead + 1,
      totalWordsRead: stats.totalWordsRead + chapter.wordCount,
      currentStreak: streak,
      lastReadDate: todayStr,
      weeklyHistory: weeklyCopy
    };

    evaluateStatsBadges(updatedStats, updatedReadHistory);
  };

  const updateLibraryProgress = (novelId: string, chapterId: string, chapterNum: number, progress: number) => {
    const existing = library.find((l) => l.novelId === novelId);
    if (existing) {
      const updated = library.map((l) =>
        l.novelId === novelId
          ? {
              ...l,
              lastReadChapterId: chapterId,
              lastReadChapterNum: chapterNum,
              progressPercentage: Math.max(l.progressPercentage || 0, progress),
              lastReadAt: new Date().toISOString()
            }
          : l
      );
      setLibrary(updated);
      saveToLocalStorage("mistvil-library", updated);
    } else {
      const updated: LibraryEntry[] = [
        ...library,
        {
          novelId,
          status: "reading",
          addedAt: new Date().toISOString(),
          lastReadChapterId: chapterId,
          lastReadChapterNum: chapterNum,
          progressPercentage: progress,
          lastReadAt: new Date().toISOString()
        }
      ];
      setLibrary(updated);
      saveToLocalStorage("mistvil-library", updated);
    }
  };

  const triggerBadgeUnlock = (badgeId: string) => {
    const badgeConfig = DEFAULT_BADGES.find((b) => b.id === badgeId);
    if (!badgeConfig) return;

    if (stats.badges.some((b) => b.id === badgeId)) return;

    const unlockedBadge: Badge = {
      ...badgeConfig,
      unlockedAt: new Date().toISOString()
    };

    setUnlockedBadgeNotify(unlockedBadge);

    const updatedStats = {
      ...stats,
      badges: [...stats.badges, unlockedBadge]
    };
    setStats(updatedStats);
    saveToLocalStorage("mistvil-stats", updatedStats);
  };

  const evaluateStatsBadges = (currentStats: ReadingStats, currentHistory: { [novelId: string]: string[] }) => {
    let newlyUnlockedBadgeIds: string[] = [];

    if (currentStats.totalChaptersRead >= 1 && !currentStats.badges.some((b) => b.id === "first_read")) {
      newlyUnlockedBadgeIds.push("first_read");
    }

    if (currentStats.currentStreak >= 3 && !currentStats.badges.some((b) => b.id === "streak_3")) {
      newlyUnlockedBadgeIds.push("streak_3");
    }

    if (currentStats.totalWordsRead >= 2500 && !currentStats.badges.some((b) => b.id === "speed_reader")) {
      newlyUnlockedBadgeIds.push("speed_reader");
    }

    const mockNovelIds = novels.map((n) => n.id);
    const hasReadFromAll = mockNovelIds.length > 0 && mockNovelIds.every((id) => (currentHistory[id] || []).length >= 1);
    if (hasReadFromAll && !currentStats.badges.some((b) => b.id === "all_novels")) {
      newlyUnlockedBadgeIds.push("all_novels");
    }

    if (newlyUnlockedBadgeIds.length > 0) {
      const firstNewBadgeId = newlyUnlockedBadgeIds[0];
      const badgeConfig = DEFAULT_BADGES.find((b) => b.id === firstNewBadgeId);

      if (badgeConfig) {
        const unlocked: Badge = { ...badgeConfig, unlockedAt: new Date().toISOString() };
        setUnlockedBadgeNotify(unlocked);

        const updatedStats = {
          ...currentStats,
          badges: [...currentStats.badges, ...newlyUnlockedBadgeIds.map((id) => {
            const cfg = DEFAULT_BADGES.find((b) => b.id === id)!;
            return { ...cfg, unlockedAt: new Date().toISOString() };
          })]
        };
        setStats(updatedStats);
        saveToLocalStorage("mistvil-stats", updatedStats);
        return;
      }
    }

    setStats(currentStats);
    saveToLocalStorage("mistvil-stats", currentStats);
  };

  const handleSelectNovel = (novelId: string) => {
    setSelectedNovelId(novelId);
    setActiveTab("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectChapter = (novelId: string, chapterId: string) => {
    setSelectedNovelId(novelId);
    setSelectedChapterId(chapterId);
    setActiveTab("reader");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentNovel = novels.find((n) => n.id === selectedNovelId);
  const currentChapter = currentNovel?.chapters.find((ch) => ch.id === selectedChapterId);

  const handleJumpToChapter = (novelId: string, chapterId: string) => {
    handleSelectChapter(novelId, chapterId);
  };

  const currentChapterIndex = currentNovel && currentChapter
    ? currentNovel.chapters.findIndex((ch) => ch.id === currentChapter.id)
    : -1;

  const hasNextChapter = currentNovel && currentChapterIndex !== -1 && currentChapterIndex < currentNovel.chapters.length - 1;
  const hasPrevChapter = currentNovel && currentChapterIndex > 0;

  const handleNextChapter = () => {
    if (currentNovel && hasNextChapter) {
      const nextCh = currentNovel.chapters[currentChapterIndex + 1];
      setSelectedChapterId(nextCh.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevChapter = () => {
    if (currentNovel && hasPrevChapter) {
      const prevCh = currentNovel.chapters[currentChapterIndex - 1];
      setSelectedChapterId(prevCh.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Role validation flags
  const isOwner = currentUser?.role === "owner" || currentUser?.email === "mistvil112@gmail.com";
  const isTeam = currentUser?.role === "translator" || currentUser?.role === "writer";

  return (
    <div className="min-h-screen bg-[#0b1311] text-gray-200 flex flex-col justify-between" dir="ltr">
      <div className="fixed top-0 left-1/4 right-1/4 h-24 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {activeTab !== "reader" && (
        <header id="main-navigation-header" className="sticky top-0 bg-brand-950/80 border-b border-brand-800/40 px-4 md:px-8 py-4 backdrop-blur-md z-30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab("explore"); setSelectedNovelId(null); }}>
            <div className="bg-brand-500/20 p-2 rounded-xl border border-brand-400/30 text-brand-300 shadow-[0_0_12px_rgba(56,132,116,0.2)]">
              <Moon className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-xl font-extrabold tracking-wide text-white">MistVil</span>
              <span className="text-[10px] bg-brand-900 text-brand-400 border border-brand-800 px-1.5 py-0.2 rounded ml-1.5 font-mono font-bold">TRANSLATED</span>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-brand-950/60 p-1.5 rounded-xl border border-brand-800/60 shadow-inner flex-wrap justify-center">
            <button
              id="nav-btn-explore"
              onClick={() => {
                setActiveTab("explore");
                setSelectedNovelId(null);
                setSelectedChapterId(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition flex items-center gap-1 ${
                activeTab === "explore" || activeTab === "detail"
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </button>

            {/* Public Announcements View Tab */}
            <button
              id="nav-btn-announcements"
              onClick={() => {
                setActiveTab("announcements");
                setSelectedNovelId(null);
                setSelectedChapterId(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === "announcements"
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Announcements</span>
            </button>

            <button
              id="nav-btn-library"
              onClick={() => {
                setActiveTab("library");
                setSelectedNovelId(null);
                setSelectedChapterId(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition flex items-center gap-1 ${
                activeTab === "library"
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Library className="w-4 h-4" />
              <span>My Library</span>
            </button>

            <button
              id="nav-btn-bookmarks"
              onClick={() => {
                setActiveTab("bookmarks");
                setSelectedNovelId(null);
                setSelectedChapterId(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition flex items-center gap-1 ${
                activeTab === "bookmarks"
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Bookmarks</span>
            </button>

            <button
              id="nav-btn-profile"
              onClick={() => {
                setActiveTab("profile");
                setSelectedNovelId(null);
                setSelectedChapterId(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold cursor-pointer transition flex items-center gap-1 ${
                activeTab === "profile"
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>

            {/* Work board ONLY for translators or writers */}
            {isTeam && (
              <button
                id="nav-btn-work"
                onClick={() => {
                  setActiveTab("work");
                  setSelectedNovelId(null);
                  setSelectedChapterId(null);
                }}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold font-cairo cursor-pointer transition flex items-center gap-1.5 border border-dashed ${
                  activeTab === "work"
                    ? "bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-md"
                    : "text-brand-300 border-brand-500/20 hover:text-brand-400 hover:bg-brand-500/5"
                }`}
              >
                <PenTool className="w-4 h-4 animate-pulse" />
                <span>لوحة العمل</span>
              </button>
            )}

            {/* Admin panel ONLY for the Owner */}
            {isOwner && (
              <button
                id="nav-btn-admin"
                onClick={() => {
                  setActiveTab("admin");
                  setSelectedNovelId(null);
                  setSelectedChapterId(null);
                }}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-black font-cairo cursor-pointer transition flex items-center gap-1.5 border ${
                  activeTab === "admin"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md"
                    : "text-amber-500/85 border-amber-500/20 hover:text-amber-400 hover:bg-amber-500/5"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>لوحة الإدارة</span>
              </button>
            )}
          </nav>
        </header>
      )}

      {/* Main Content Area */}
      <div className={`flex-grow ${activeTab === "reader" ? "" : "max-w-7xl w-full mx-auto px-4 md:px-8 py-8"}`}>
        <AnimatePresence mode="wait">
          {activeTab === "explore" && (
            <motion.div
              key="explore-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <ExploreView
                onSelectNovel={handleSelectNovel}
                onSelectChapter={handleSelectChapter}
                library={library}
                novels={novels}
              />
            </motion.div>
          )}

          {activeTab === "announcements" && (
            <motion.div
              key="announcements-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <AnnouncementsView
                announcements={announcements}
                currentUser={currentUser}
                onAddAnnouncement={handleAddAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
              />
            </motion.div>
          )}

          {activeTab === "work" && (
            <motion.div
              key="work-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <WorkPanelView
                currentUser={currentUser}
                novels={novels}
                pendingNovels={pendingNovels}
                onSubmitPendingNovel={handleSubmitPendingNovel}
                onAddChapter={handleAddChapter}
                onDeleteChapter={handleDeleteChapter}
              />
            </motion.div>
          )}

          {activeTab === "library" && (
            <motion.div
              key="library-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <MyLibraryView
                library={library}
                stats={stats}
                novels={novels}
                onRemoveFromLibrary={handleRemoveFromLibrary}
                onSelectNovel={handleSelectNovel}
                onSelectChapter={handleSelectChapter}
              />
            </motion.div>
          )}

          {activeTab === "bookmarks" && (
            <motion.div
              key="bookmarks-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <BookmarksView
                bookmarks={bookmarks}
                onRemoveBookmark={handleRemoveBookmark}
                onJumpToChapter={handleJumpToChapter}
              />
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div
              key="profile-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <UserProfileView
                stats={stats}
                novels={novels}
                readHistory={readHistory}
                onSelectNovel={handleSelectNovel}
                onSelectChapter={handleSelectChapter}
                currentUser={currentUser}
                registeredUsers={registeredUsers}
                roleRequests={roleRequests}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateUser}
                onSendRoleRequest={handleSendRoleRequest}
              />
            </motion.div>
          )}

          {activeTab === "admin" && (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <AdminPanelView
                novels={novels}
                currentUser={currentUser}
                roleRequests={roleRequests}
                pendingNovels={pendingNovels}
                trashBin={trashBin}
                registeredUsers={registeredUsers}
                onApproveRole={handleApproveRole}
                onRejectRole={handleRejectRole}
                onApproveNovel={handleApproveNovel}
                onRejectNovel={handleRejectNovel}
                onRestoreTrashItem={handleRestoreTrashItem}
                onDeleteTrashItemPermanently={handleDeleteTrashItemPermanently}
                onAddNovel={handleAddNovel}
                onDeleteNovel={handleDeleteNovel}
                onAddChapter={handleAddChapter}
                onUpdateUserRole={handleUpdateUserRole}
                onResetData={handleResetData}
              />
            </motion.div>
          )}

          {activeTab === "detail" && currentNovel && (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <NovelDetailView
                novel={currentNovel}
                library={library}
                readHistory={readHistory}
                onBack={() => setActiveTab("explore")}
                onUpdateLibraryStatus={handleUpdateLibraryStatus}
                onRemoveFromLibrary={handleRemoveFromLibrary}
                onSelectChapter={handleSelectChapter}
                currentUser={currentUser}
                onUpdateNovel={handleUpdateNovel}
              />
            </motion.div>
          )}

          {activeTab === "reader" && currentNovel && currentChapter && (
            <motion.div
              key="reader-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <NovelReaderView
                novel={currentNovel}
                chapter={currentChapter}
                settings={settings}
                bookmarks={bookmarks}
                onBack={() => setActiveTab("detail")}
                onUpdateSettings={handleUpdateSettings}
                onAddBookmark={handleAddBookmark}
                onRemoveBookmark={handleRemoveBookmark}
                onNextChapter={handleNextChapter}
                onPrevChapter={handlePrevChapter}
                onChapterCompleted={handleChapterCompleted}
                hasNext={hasNextChapter}
                hasPrev={hasPrevChapter}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {activeTab !== "reader" && (
        <footer className="bg-brand-950 border-t border-brand-800/20 py-8 text-center text-xs text-gray-500 font-light space-y-2 shrink-0">
          <p className="text-gray-400">All rights reserved to MistVil Translated Novels Portal &copy; 2026</p>
          <p className="font-mono text-[10px]">Atmospheric MistVil design - Created with absolute visual precision</p>
        </footer>
      )}

      {/* Badge Unlocks Celebration */}
      <AnimatePresence>
        {unlockedBadgeNotify && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.8, rotate: -2, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-brand-950 border-2 border-amber-500/40 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.2)] relative"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-500 text-brand-950 p-4 rounded-full border-4 border-brand-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                <Award className="w-10 h-10 animate-bounce" />
              </div>

              <div className="pt-6 space-y-1">
                <span className="text-[10px] text-amber-500 font-bold tracking-widest uppercase">NEW ACHIEVEMENT UNLOCKED!</span>
                <h2 className="text-xl font-black text-white">{unlockedBadgeNotify.title}</h2>
              </div>

              <p className="text-xs text-gray-300 font-light leading-relaxed">
                {unlockedBadgeNotify.description}
              </p>

              <div className="bg-brand-900/60 p-3 rounded-2xl border border-brand-800/60 inline-block px-6">
                <span className="text-[10px] text-brand-300 font-mono">Successfully documented in your Hall of Fame</span>
              </div>

              <button
                id="btn-close-badge-overlay"
                onClick={() => setUnlockedBadgeNotify(null)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-brand-950 font-black text-sm rounded-xl transition cursor-pointer shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
              >
                Continue Adventure
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
