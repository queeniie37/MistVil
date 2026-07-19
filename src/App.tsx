import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, Flame, Clock, Award, Plus, Layers, Search, 
  MessageSquare, Users, Shield, BookOpen, Heart, 
  ArrowUp, Mail, AlertCircle, TrendingUp, CheckCircle, HelpCircle, FileText, Megaphone, Send,
  Edit, Camera, DollarSign, Settings, Link, Check, Image, Bell, X
} from 'lucide-react';
import { User, UserRole, Novel, Suggestion, Reservation, News, Team, TranslatorRequest } from './types';
import { DEFAULT_USERS, MistVilDatabase } from './data';
import { isImageSource, safeEmojiOrFallback, compressImageFile } from './utils/media';
import { getUserBadges } from './utils/badges';
import { upsertSelfInDirectory } from './utils/directory';

// Component imports
import Header from './components/Header';
import NewsTicker from './components/NewsTicker';
import HeroSlider from './components/HeroSlider';
import NovelCard from './components/NovelCard';
import ContinueReading from './components/ContinueReading';
import SuggestNovelDialog from './components/SuggestNovelDialog';
import ExploreLibrary from './components/ExploreLibrary';
import NovelDetails from './components/NovelDetails';
import ReaderView from './components/ReaderView';
import TranslatorPanel from './components/TranslatorPanel';
import AdminPanel from './components/AdminPanel';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import ContactUs from './components/ContactUs';
import AdsTicker from './components/AdsTicker';
import AdsPage from './components/AdsPage';
import TranslatorRequestForm from './components/TranslatorRequestForm';

// Themed placeholders shown when a remote image (cover/avatar/banner) fails to
// load, so visitors never see a broken-image icon. Inline SVG data URIs can
// never themselves fail to load.
// Social platforms the OWNER can attach to their profile with the +/× manager
const SOCIAL_PLATFORMS = [
  { id: 'discord', name: 'Discord', icon: '👾', placeholder: 'https://discord.gg/...' },
  { id: 'telegram', name: 'Telegram', icon: '📢', placeholder: 'https://t.me/...' },
  { id: 'instagram', name: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/...' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@...' },
  { id: 'youtube', name: 'YouTube', icon: '📺', placeholder: 'https://youtube.com/@...' },
  { id: 'x', name: 'X (Twitter)', icon: '🐦', placeholder: 'https://x.com/...' },
  { id: 'snapchat', name: 'Snapchat', icon: '👻', placeholder: 'https://snapchat.com/add/...' }
];

const FALLBACK_COVER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#131F33"/><stop offset="1" stop-color="#1E3050"/></linearGradient></defs><rect width="300" height="450" fill="url(#g)"/><text x="150" y="215" font-size="90" text-anchor="middle">🌫️</text><text x="150" y="270" font-size="20" fill="#38BDF8" text-anchor="middle" font-family="sans-serif">MistVil</text></svg>`
  );
const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#1E3050"/><text x="60" y="80" font-size="56" text-anchor="middle">🌫️</text></svg>`
  );

// Shown instead of the admin/translator panels for users without the required role
function AccessDeniedPanel({ message, isGuest, onNavigateHome }: { message: string; isGuest: boolean; onNavigateHome: () => void }) {
  return (
    <div className="w-full text-center mt-12 pb-12 animate-in fade-in duration-300">
      <div className="max-w-md mx-auto p-8 bg-[#131F33] border border-white/5 rounded-3xl flex flex-col items-center gap-4">
        <Shield size={40} className="text-rose-400" />
        <h2 className="text-lg font-extrabold text-white">This page is protected 🔒</h2>
        <p className="text-xs text-purple-300 leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-2">
          {isGuest && (
            <button
              onClick={() => window.dispatchEvent(new Event('open-login-modal'))}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer"
            >
              Sign in 🌫️
            </button>
          )}
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-purple-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Core states
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USERS.GUEST);
  // Every in-app screen gets its own URL hash (e.g. #/novel?d=...). This is
  // what makes the browser back/forward buttons walk through visited screens
  // even after a page reload or on browsers that drop history state objects.
  const buildScreenHash = (page: string, params: any) => {
    let h = `#/${page}`;
    if (params !== null && params !== undefined) {
      try { h += `?d=${encodeURIComponent(JSON.stringify(params))}`; } catch { /* ignore */ }
    }
    return h;
  };
  const parseScreenHash = (): { page: string; params: any } | null => {
    try {
      const raw = window.location.hash || '';
      const m = raw.match(/^#\/([\w-]+)(?:\?d=(.*))?$/);
      if (!m) return null;
      let params: any = null;
      if (m[2]) {
        try { params = JSON.parse(decodeURIComponent(m[2])); } catch { params = null; }
      }
      return { page: m[1], params };
    } catch {
      return null;
    }
  };

  // Screens that actually exist in the app. Any entry URL pointing anywhere
  // else (mistyped/stale copied link) must open the homepage instead of a
  // blank screen.
  const KNOWN_PAGES = new Set([
    'home', 'explore', 'suggestions', 'teams', 'notifications', 'profile',
    'profile-edit', 'novel', 'reader', 'translator-panel', 'admin', 'ads',
    'contact-us', 'privacy-policy', 'terms-of-service'
  ]);

  // Decide the first screen for this entry to the site:
  // - A copied/shared link (URL hash, e.g. #/novel?d=…) opens exactly that
  //   page — refreshes keep their page the same way because the current
  //   screen is always stamped into the URL hash.
  // - Entering the bare domain (no hash) ALWAYS opens the homepage. The old
  //   sessionStorage fallback could bounce a visitor who typed the domain
  //   into a previously-used tab back to a random earlier screen.
  const restoreLastScreen = () => {
    const fromHash = parseScreenHash();
    if (fromHash && KNOWN_PAGES.has(fromHash.page)) return fromHash;
    return { page: 'home', params: null };
  };
  const [currentPage, setCurrentPage] = useState<string>(() => restoreLastScreen().page); // home, explore, suggestions, teams, profile, novel, reader, translator-panel, admin
  const [currentParams, setCurrentParams] = useState<any>(() => restoreLastScreen().params);

  // Keep the scroll position saved for refresh restore
  useEffect(() => {
    const saveScroll = () => {
      try { sessionStorage.setItem('mistvil_scroll', String(window.scrollY)); } catch { /* ignore */ }
    };
    window.addEventListener('beforeunload', saveScroll);
    let savedScroll = 0;
    try { savedScroll = parseInt(sessionStorage.getItem('mistvil_scroll') || '0', 10); } catch { /* ignore */ }
    if (savedScroll > 0) {
      // Wait for the restored screen's content to render before scrolling
      setTimeout(() => window.scrollTo(0, savedScroll), 500);
    }
    return () => window.removeEventListener('beforeunload', saveScroll);
  }, []);

  const [novels, setNovels] = useState<Novel[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);

  // Publish this member's public entry (username/avatar/role + reading
  // stats) to the shared directory so the owner's badges panel can list
  // every subscriber. No email or credentials leave the device.
  useEffect(() => {
    if (!currentUser || currentUser.role === 'GUEST') return;
    upsertSelfInDirectory(currentUser);
    const refresh = () => upsertSelfInDirectory(currentUser);
    window.addEventListener('read_chapters-updated', refresh);
    return () => window.removeEventListener('read_chapters-updated', refresh);
  }, [currentUser, readingHistory]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Modals / Overlays
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showProfileFavorites, setShowProfileFavorites] = useState(true);
  const [refreshAdsTrigger, setRefreshAdsTrigger] = useState(0);
  const [refreshNotificationsTrigger, setRefreshNotificationsTrigger] = useState(0);

  // Join Form State for translators page
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinType, setJoinType] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL');
  const [joinName, setJoinName] = useState('');
  const [joinLanguages, setJoinLanguages] = useState('');
  const [joinContact, setJoinContact] = useState('');
  const [joinExperience, setJoinExperience] = useState('');
  const [joinReason, setJoinReason] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [joinError, setJoinError] = useState('');

  const [siteName, setSiteName] = useState(() => MistVilDatabase.get<string>('site_name', 'MistVil'));
  const [siteLogo, setSiteLogo] = useState(() => {
    const logo = MistVilDatabase.get<string>('site_logo', '/site_logo_v2.png');
    return logo === '🌫️' ? '/site_logo_v2.png' : logo;
  });
  const [siteBanner, setSiteBanner] = useState(() => MistVilDatabase.get<string>('site_banner', '/site_banner.png'));

  const safeSiteLogo = (typeof siteLogo === 'string' && siteLogo.trim() && siteLogo.trim() !== '🌫️') ? siteLogo.trim() : '/site_logo_v2.png';
  const safeSiteBanner = (typeof siteBanner === 'string' && siteBanner.trim()) ? siteBanner.trim() : '/site_banner.png';
  const safeSiteName = (typeof siteName === 'string' && siteName.trim()) ? siteName.trim() : 'MistVil';

  // Footer dynamic values
  const [footerDesc, setFooterDesc] = useState(() => MistVilDatabase.get<string>('footer_description', 'A leading platform for translating, suggesting, and reading light novels, fantasy, and dark web novels — with top accuracy, protection standards, and a premium visual aesthetic.'));
  const [footerEmail, setFooterEmail] = useState(() => MistVilDatabase.get<string>('footer_email', 'support@mistvil.com'));
  const [footerSupport, setFooterSupport] = useState(() => MistVilDatabase.get<string>('footer_support_text', 'Via the official Discord ticket below'));
  const [footerCommunityText, setFooterCommunityText] = useState(() => MistVilDatabase.get<string>('footer_community_text', 'Join our great novel family to get chapter notifications the moment they drop, live before everyone else!'));
  
  const defaultSocialLinks = [
    { id: "discord", name: "Discord", icon: "👾", url: "https://discord.gg/mistvil", active: true },
    { id: "telegram", name: "Telegram", icon: "📢", url: "https://t.me/mistvil", active: true },
    { id: "facebook", name: "Facebook", icon: "👥", url: "", active: false },
    { id: "twitter", name: "Twitter / X", icon: "🐦", url: "", active: false },
    { id: "instagram", name: "Instagram", icon: "📸", url: "", active: false },
    { id: "tiktok", name: "TikTok", icon: "🎵", url: "", active: false },
    { id: "youtube", name: "YouTube", icon: "📺", url: "", active: false },
    { id: "whatsapp", name: "WhatsApp", icon: "💬", url: "", active: false }
  ];
  const [footerSocials, setFooterSocials] = useState<any[]>(() => MistVilDatabase.get<any[]>('footer_socials', defaultSocialLinks));

  // Initialize data on mount
  useEffect(() => {
    MistVilDatabase.initialize();

    // Global fallback for any image that fails to load (dead remote host,
    // network/adblock). Runs in the capture phase because `error` doesn't
    // bubble. Guarded so a failing fallback can't loop.
    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (!img || img.tagName !== 'IMG' || img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = 'true';
      const isAvatar = img.classList.contains('rounded-full') || img.width <= 64;
      img.src = isAvatar ? FALLBACK_AVATAR : FALLBACK_COVER;
    };
    document.addEventListener('error', handleImageError, true);

    const handleAdsUpdate = () => {
      setRefreshAdsTrigger(prev => prev + 1);
    };
    window.addEventListener('ads-updated', handleAdsUpdate);

    const handleNotificationsUpdate = () => {
      setRefreshNotificationsTrigger(prev => prev + 1);
    };
    window.addEventListener('notifications-updated', handleNotificationsUpdate);

    const handleUserUpdate = () => {
      const savedUser = MistVilDatabase.get<User | null>('current_user_data', null);
      if (savedUser) {
        setCurrentUser(savedUser);
      }
    };
    window.addEventListener('user-updated', handleUserUpdate);

    const handleSiteUpdate = () => {
      setSiteName(MistVilDatabase.get<string>('site_name', 'MistVil'));
      const logo = MistVilDatabase.get<string>('site_logo', '/site_logo_v2.png');
      setSiteLogo(logo === '🌫️' ? '/site_logo_v2.png' : logo);
      setSiteBanner(MistVilDatabase.get<string>('site_banner', '/site_banner.png'));
    };
    window.addEventListener('site-settings-updated', handleSiteUpdate);

    const handleFooterUpdate = () => {
      setFooterDesc(MistVilDatabase.get<string>('footer_description', 'A leading platform for translating, suggesting, and reading light novels, fantasy, and dark web novels — with top accuracy, protection standards, and a premium visual aesthetic.'));
      setFooterEmail(MistVilDatabase.get<string>('footer_email', 'support@mistvil.com'));
      setFooterSupport(MistVilDatabase.get<string>('footer_support_text', 'Via the official Discord ticket below'));
      setFooterCommunityText(MistVilDatabase.get<string>('footer_community_text', 'Join our great novel family to get chapter notifications the moment they drop, live before everyone else!'));
      setFooterSocials(MistVilDatabase.get<any[]>('footer_socials', defaultSocialLinks));
    };
    window.addEventListener('footer-settings-updated', handleFooterUpdate);

    const handleNovelsUpdate = () => {
      setNovels(MistVilDatabase.get<Novel[]>('novels', []));
    };
    window.addEventListener('novels-updated', handleNovelsUpdate);
    
    // Load from local database
    const savedUser = MistVilDatabase.get<User | null>('current_user_data', null);
    if (savedUser) {
      if (savedUser.role === 'OWNER' && savedUser.email !== 'mistvil112@gmail.com') {
        const fallbackUser = DEFAULT_USERS.GUEST;
        setCurrentUser(fallbackUser);
        MistVilDatabase.set('current_user_data', fallbackUser);
        MistVilDatabase.set('current_role', 'GUEST');
      } else {
        setCurrentUser(savedUser);
      }
    } else {
      const initialRole = MistVilDatabase.get<UserRole>('current_role', 'GUEST');
      if (initialRole === 'OWNER') {
        setCurrentUser(DEFAULT_USERS.GUEST);
        MistVilDatabase.set('current_role', 'GUEST');
      } else {
        setCurrentUser(DEFAULT_USERS[initialRole]);
      }
    }
    const loadedNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const loadedSuggestions = MistVilDatabase.get<Suggestion[]>('suggestions', []);
    
    // Automatically repair any of the Owner's novels that might have been saved as PENDING
    let databaseNeedsSave = false;
    const repairedNovels = loadedNovels.map(n => {
      if (n.status === 'PENDING' && (n.translatorName === 'MISTVIL' || n.translatorId === 'mistvil-owner')) {
        databaseNeedsSave = true;
        return { ...n, status: 'AVAILABLE' as const, updatedAt: new Date().toISOString() };
      }
      return n;
    });
    if (databaseNeedsSave) {
      MistVilDatabase.set('novels', repairedNovels);
    }

    setNovels(databaseNeedsSave ? repairedNovels : loadedNovels);
    setNews(MistVilDatabase.get<News[]>('news', []));
    setSuggestions(loadedSuggestions);
    setBookmarks(MistVilDatabase.get<string[]>('bookmarks', []));
    setReadingHistory(MistVilDatabase.get<any[]>('reading_history', []));
    setTeams(MistVilDatabase.get<Team[]>('teams', []));

    // Apply any role assignment the owner made for this user (e.g. approving a
    // translator) that arrived via the shared DB, so their panel access updates
    // without needing to log out and back in. The owner account is never touched.
    const applyRoleAssignment = () => {
      const saved = MistVilDatabase.get<User | null>('current_user_data', null);
      if (!saved || !saved.email) return;
      const email = saved.email.toLowerCase();
      if (email === 'mistvil112@gmail.com') return;
      const assignments = MistVilDatabase.get<Record<string, string>>('role_assignments', {});
      const assigned = assignments[email];
      if (assigned && assigned !== saved.role) {
        const updated = { ...saved, role: assigned as UserRole };
        MistVilDatabase.set('current_user_data', updated);
        MistVilDatabase.set('current_role', assigned);
        setCurrentUser(updated);
      }
    };

    // Async server synchronization immediately on mount
    const syncDb = async () => {
      await MistVilDatabase.syncWithServer();
      applyRoleAssignment();
      // Refresh React states with the newly synced server data
      const syncedNovels = MistVilDatabase.get<Novel[]>('novels', []);
      let syncedNeedsSave = false;
      const repairedSynced = syncedNovels.map(n => {
        if (n.status === 'PENDING' && (n.translatorName === 'MISTVIL' || n.translatorId === 'mistvil-owner')) {
          syncedNeedsSave = true;
          return { ...n, status: 'AVAILABLE' as const, updatedAt: new Date().toISOString() };
        }
        return n;
      });
      if (syncedNeedsSave) {
        MistVilDatabase.set('novels', repairedSynced);
      }
      
      setNovels(syncedNeedsSave ? repairedSynced : syncedNovels);
      setNews(MistVilDatabase.get<News[]>('news', []));
      setSuggestions(MistVilDatabase.get<Suggestion[]>('suggestions', []));
      setTeams(MistVilDatabase.get<Team[]>('teams', []));
    };
    syncDb();

    // Poll the backend server database every 2 seconds so new comments and
    // chapters appear for everyone almost instantly. Unchanged polls cost
    // almost nothing: the server answers 304 via the ETag handshake.
    const syncInterval = setInterval(() => {
      syncDb();
    }, 2000);

    // Run automatic reservation expiration check
    checkReservationsExpiration(loadedNovels, loadedSuggestions);
    checkScheduledChapters();

    // Setup an interval to check for scheduled Gregorian chapters every 5 seconds
    const schedulerInterval = setInterval(() => {
      checkScheduledChapters();
    }, 5000);

    return () => {
      clearInterval(schedulerInterval);
      clearInterval(syncInterval);
      document.removeEventListener('error', handleImageError, true);
      window.removeEventListener('ads-updated', handleAdsUpdate);
      window.removeEventListener('notifications-updated', handleNotificationsUpdate);
      window.removeEventListener('user-updated', handleUserUpdate);
      window.removeEventListener('site-settings-updated', handleSiteUpdate);
      window.removeEventListener('footer-settings-updated', handleFooterUpdate);
      window.removeEventListener('novels-updated', handleNovelsUpdate);
    };
  }, []);

  // SEO & Document Title Dynamic Synchronizer
  useEffect(() => {
    let title = `${siteName} | Premium Platform for Translated & Original Novels`;
    
    switch (currentPage) {
      case 'home':
        title = `${siteName} | Home - Premium Novel Platform`;
        break;
      case 'explore':
        title = `Library & Explore | Browse Novels - ${siteName}`;
        break;
      case 'novel':
        if (currentParams && currentParams.id) {
          const novel = novels.find(n => n.id === currentParams.id);
          if (novel) {
            title = `${novel.titleEn || novel.titleAr} (${novel.titleAr}) | ${siteName}`;
          }
        }
        break;
      case 'reader':
        if (currentParams && currentParams.novelId) {
          const novel = novels.find(n => n.id === currentParams.novelId);
          if (novel) {
            title = `Chapter ${currentParams.chapterNumber} of ${novel.titleEn || novel.titleAr} | ${siteName}`;
          }
        }
        break;
      case 'suggestions':
        title = `Suggest a New Novel | Share Your Ideas - ${siteName}`;
        break;
      case 'teams':
        title = `Translators & Authors Team | ${siteName}`;
        break;
      case 'notifications':
        title = `Notifications Center | ${siteName}`;
        break;
      case 'profile':
        title = `My Profile | ${siteName}`;
        break;
      case 'translator-panel':
        title = `Translator & Writer Work Panel | ${siteName}`;
        break;
      case 'admin':
        title = `Admin & Control Panel | ${siteName}`;
        break;
      case 'ads':
        title = `Ads & Promotions Center | ${siteName}`;
        break;
      default:
        break;
    }
    
    document.title = title;
  }, [currentPage, currentParams, novels, siteName]);

  // Guest browsers must stay read-only on shared data: never let an anonymous
  // visitor's automated housekeeping write to the shared server collections
  // (this is what used to wipe novels for everyone).
  const isAuthenticatedClient = () => {
    const u = MistVilDatabase.get<User | null>('current_user_data', null);
    return !!u && u.role !== 'GUEST';
  };

  // Auto-check and publish scheduled chapters when their Gregorian date is reached
  const checkScheduledChapters = () => {
    if (!isAuthenticatedClient()) return;
    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    const allNovels = MistVilDatabase.get<any[]>('novels', []);
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    
    let dbChanged = false;
    const now = new Date();

    const updatedChapters = allChapters.map(chap => {
      // If a chapter is scheduled (isDraft is true and publishAt is set)
      if (chap.isDraft && chap.publishAt) {
        const publishTime = new Date(chap.publishAt);
        if (now >= publishTime) {
          chap.isDraft = false;
          // Fresh updatedAt so the server-side per-chapter merge treats the
          // published version as newest — a stale device holding the old
          // draft copy can no longer roll the publication back.
          chap.updatedAt = new Date().toISOString();
          dbChanged = true;

          const correspondingNovel = allNovels.find(n => n.id === chap.novelId);
          const novelTitle = correspondingNovel ? (correspondingNovel.titleEn || correspondingNovel.titleAr) : 'the translated novel';

          // Private confirmation for the chapter's translator
          allNotifs.unshift({
            id: `notif-scheduled-publish-${Date.now()}-${chap.id}`,
            userId: correspondingNovel?.translatorId || 'system',
            title: '🎉 Scheduled chapter auto-published!',
            message: `The scheduled publish time for chapter "${chap.title}" of "${novelTitle}" has arrived, and it has been auto-published to readers now!`,
            type: 'CHAPTER',
            isRead: false,
            createdAt: 'now',
            novelId: chap.novelId,
            chapterId: chap.id
          });

          // Public "new chapter" announcement for readers — sent at the
          // scheduled time, not when the chapter was created (no userId =
          // visible to everyone).
          allNotifs.unshift({
            id: `notif-chapter-live-${Date.now()}-${chap.id}`,
            title: 'New chapter released!',
            message: `"${chap.title}" of "${novelTitle}" has been published and is now available to read!`,
            type: 'CHAPTER',
            isRead: false,
            createdAt: 'now',
            novelId: chap.novelId,
            chapterId: chap.id
          });
        }
      }
      return chap;
    });

    if (dbChanged) {
      MistVilDatabase.set('chapters', updatedChapters);
      MistVilDatabase.set('notifications', allNotifs);
      
      // Force React state update
      const freshNovels = MistVilDatabase.get<Novel[]>('novels', []);
      setNovels([...freshNovels]);
    }
  };

  // Auto check and expire inactive reservations past 30 days
  const checkReservationsExpiration = (currentNovelsList?: Novel[], currentSugsList?: Suggestion[]) => {
    if (!isAuthenticatedClient()) return;
    const allReservations = MistVilDatabase.get<Reservation[]>('reservations', []);
    const allNovels = currentNovelsList || MistVilDatabase.get<Novel[]>('novels', []);
    const allSuggestions = currentSugsList || MistVilDatabase.get<Suggestion[]>('suggestions', []);
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    
    let dbChanged = false;
    const now = new Date();

    const updatedReservations = allReservations.map(res => {
      if (res.status === 'ACTIVE') {
        const end = new Date(res.endAt);
        if (now > end) {
          // Check if novel has 0 chapters
          const correspondingNovel = allNovels.find(n => n.id === res.novelId);
          if (correspondingNovel && correspondingNovel.chaptersCount === 0) {
            dbChanged = true;
            
            // 1. Expire reservation
            res.status = 'EXPIRED';
            
            // 2. Change suggestion back to PENDING so it appears in the suggestions page again
            const matchingSug = allSuggestions.find(s => s.titleAr === res.novelTitle || s.titleEn === correspondingNovel.titleEn);
            if (matchingSug) {
              matchingSug.status = 'PENDING';
            }
            
            // 3. Set novel status to CANCELLED (fresh updatedAt so the
            // cancellation outranks stale copies in the server-side merge)
            correspondingNovel.status = 'CANCELLED';
            correspondingNovel.updatedAt = new Date().toISOString();

            // 4. Notify translator
            allNotifs.push({
              id: `notif-expire-${Date.now()}-${res.id}`,
              userId: res.translatorId,
              title: '⚠️ Novel reservation expired (30 days)',
              message: `Your reservation for "${res.novelTitle}" was cancelled automatically because no chapters were published within the 30-day window, and the novel returned to the public suggestions list for member voting and other translators to reserve.`,
              type: 'RESERVATION',
              isRead: false,
              createdAt: 'now'
            });
          }
        }
      }
      return res;
    });

    if (dbChanged) {
      MistVilDatabase.set('reservations', updatedReservations);
      MistVilDatabase.set('novels', allNovels);
      MistVilDatabase.set('suggestions', allSuggestions);
      MistVilDatabase.set('notifications', allNotifs);
      setNovels([...allNovels]);
      setSuggestions([...allSuggestions]);
    }
  };

  // Handle join team or individual request
  const handleJoinRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinSuccess('');
    setJoinError('');

    if (!joinName.trim() || !joinLanguages.trim() || !joinContact.trim() || !joinExperience.trim() || !joinReason.trim()) {
      setJoinError('Please fill in all required fields.');
      return;
    }

    const newRequest: TranslatorRequest = {
      id: `req-${Date.now()}`,
      username: currentUser.username,
      email: currentUser.email,
      discord: joinContact,
      telegram: joinContact,
      experience: joinExperience,
      languages: joinLanguages.split(/[,،]/).map(l => l.trim()).filter(Boolean),
      reason: joinReason,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      joinType: joinType
    };

    // Save to DB
    const allReqs = MistVilDatabase.get<TranslatorRequest[]>('translator_requests', []);
    MistVilDatabase.set('translator_requests', [newRequest, ...allReqs]);

    // Send notifications to owner
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-req-${Date.now()}`,
      userId: 'mistvil-owner',
      title: '📥 New translator/team application',
      message: `Member "${currentUser.username}" submitted an application as ${joinType === 'INDIVIDUAL' ? 'an individual translator' : 'a full translation team'} (${joinName}) for review and approval.`,
      type: 'ROLE' as any,
      isRead: false,
      createdAt: 'now'
    };
    MistVilDatabase.set('notifications', [...allNotifs, newNotif]);

    setJoinSuccess(`Your application as ${joinType === 'INDIVIDUAL' ? 'an individual translator' : 'a full team'} was submitted successfully! It's now under review by the platform owner. 🌫️`);
    setJoinName('');
    setJoinLanguages('');
    setJoinContact('');
    setJoinExperience('');
    setJoinReason('');
  };

  // Handle suggestion claim directly
  const handleClaimSuggestion = (sug: Suggestion) => {
    if (currentUser.role !== 'TRANSLATOR' && currentUser.role !== 'OWNER') {
      alert('Sorry, you must be a translator or the owner to reserve suggested novels.');
      return;
    }

    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(startAt.getDate() + 30); // 30 Days reservation timer

    // 1. Create a novel placeholder from suggestion
    const newNovel: Novel = {
      id: `novel-claimed-${Date.now()}`,
      titleAr: sug.titleAr,
      titleEn: sug.titleEn,
      author: 'Original author',
      translatorId: currentUser.id,
      translatorName: currentUser.username,
      cover: sug.cover,
      chaptersCount: 0,
      views: 0,
      likes: 0,
      bookmarksCount: 0,
      rating: 5.0,
      ratingCount: 1,
      status: 'RESERVED',
      language: 'Korean',
      genres: sug.genres,
      description: sug.description,
      createdAt: new Date().toISOString(),
      downloadAllowed: true
    };

    // 2. Create reservation record
    const newRes: Reservation = {
      id: `res-claimed-${Date.now()}`,
      novelId: newNovel.id,
      novelTitle: newNovel.titleAr,
      translatorId: currentUser.id,
      translatorName: currentUser.username,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      status: 'ACTIVE',
      extensionRequested: false
    };

    // 3. Update suggestion status (becomes RESERVED so it disappears from suggestions list)
    const updatedSugs = suggestions.map(s => s.id === sug.id ? { ...s, status: 'RESERVED' as const } : s);
    setSuggestions(updatedSugs);
    MistVilDatabase.set('suggestions', updatedSugs);

    // Save Novels & Reservations
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const updatedNovels = [newNovel, ...allNovels];
    setNovels(updatedNovels);
    MistVilDatabase.set('novels', updatedNovels);

    const allReservations = MistVilDatabase.get<Reservation[]>('reservations', []);
    MistVilDatabase.set('reservations', [newRes, ...allReservations]);

    // Send notification
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-claimed-${Date.now()}`,
      userId: currentUser.id,
      title: 'Suggestion accepted successfully!',
      message: `You reserved the suggested novel "${sug.titleEn || sug.titleAr}" successfully. It now appears in the translator panel and your account, and the 30-day reservation countdown is starting.`,
      type: 'RESERVATION',
      isRead: false,
      createdAt: 'now'
    };
    MistVilDatabase.set('notifications', [...allNotifs, newNotif]);
    alert(`Congratulations! You accepted and reserved the suggested novel "${sug.titleEn || sug.titleAr}" for translation successfully, and the 30-day reservation countdown is starting.`);
  };

  // Update dynamic simulated user role
  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === 'OWNER' && currentUser.email?.toLowerCase() !== 'mistvil112@gmail.com') {
      alert('Security error: the owner role is reserved exclusively for the site owner! Please sign in with the owner account (mistvil112@gmail.com) first to access the admin panel.');
      return;
    }
    MistVilDatabase.set('current_role', newRole);
    const u = MistVilDatabase.get<User>(`custom_user_${newRole}`, DEFAULT_USERS[newRole]);
    setCurrentUser(u);
    MistVilDatabase.set('current_user_data', u);
    
    // Relocate to homepage if they lose access to Admin or Translator panels
    if (newRole === 'GUEST' || newRole === 'MEMBER') {
      if (currentPage === 'admin' || currentPage === 'translator-panel') {
        setCurrentPage('home');
      }
    }
  };

  // Profile editing local state
  const [editAvatar, setEditAvatar] = useState('');
  const [editBanner, setEditBanner] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPaypalEmail, setEditPaypalEmail] = useState('');
  const [editSupportLink, setEditSupportLink] = useState('');
  const [editSocialLinks, setEditSocialLinks] = useState<{ id: string; url: string }[]>([]);
  const [newSocialPlatform, setNewSocialPlatform] = useState('');

  const handleOpenEditProfile = () => {
    setEditAvatar(currentUser.avatar || '');
    setEditBanner(currentUser.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200');
    setEditBio(currentUser.bio || '');
    setEditPaypalEmail(currentUser.paypalEmail || '');
    setEditSupportLink(currentUser.supportLink || '');
    // Owner's social links; migrate the old fixed discord/telegram fields once
    const existing = Array.isArray(currentUser.socialLinks) ? currentUser.socialLinks.map(l => ({ id: l.id, url: l.url })) : [];
    if (existing.length === 0) {
      if (currentUser.discord) existing.push({ id: 'discord', url: currentUser.discord });
      if (currentUser.telegram) existing.push({ id: 'telegram', url: currentUser.telegram });
    }
    setEditSocialLinks(existing);
    setNewSocialPlatform('');
    // Profile editing lives on its own dedicated page
    handleNavigate('profile-edit');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Regular readers can only customize avatar, banner and bio.
    // Support/funding channels are for the owner and owner-approved creative
    // roles; SOCIAL MEDIA links are managed exclusively by the owner.
    const canEditSupport = ['OWNER', 'TRANSLATOR', 'WRITER'].includes(currentUser.role);
    const isOwnerRole = currentUser.role === 'OWNER';
    const cleanedSocials = editSocialLinks
      .filter(l => l.url.trim())
      .map(l => {
        const platform = SOCIAL_PLATFORMS.find(pf => pf.id === l.id);
        return { id: l.id, name: platform?.name || l.id, icon: platform?.icon || '🔗', url: l.url.trim() };
      });
    const updatedUser: User = {
      ...currentUser,
      avatar: editAvatar.trim(),
      banner: editBanner.trim(),
      bio: editBio.trim(),
      ...(canEditSupport
        ? {
            paypalEmail: editPaypalEmail.trim(),
            supportLink: editSupportLink.trim()
          }
        : {}),
      ...(isOwnerRole ? { socialLinks: cleanedSocials } : {})
    };
    
    setCurrentUser(updatedUser);
    MistVilDatabase.set('current_user_data', updatedUser);
    MistVilDatabase.set(`custom_user_${currentUser.role}`, updatedUser);

    // Sync changes into the central user database (users_db) so all parts of the site reflect them
    const usersDb = MistVilDatabase.get<any[]>('users_db', []);
    const userIndex = usersDb.findIndex(u => u && u.id === updatedUser.id);
    if (userIndex !== -1) {
      usersDb[userIndex] = { ...usersDb[userIndex], ...updatedUser };
      MistVilDatabase.set('users_db', usersDb);
    } else {
      const emailIndex = usersDb.findIndex(u => u && u.email?.toLowerCase() === updatedUser.email?.toLowerCase());
      if (emailIndex !== -1) {
        usersDb[emailIndex] = { ...usersDb[emailIndex], ...updatedUser };
        MistVilDatabase.set('users_db', usersDb);
      } else {
        MistVilDatabase.set('users_db', [...usersDb, updatedUser]);
      }
    }
    
    window.dispatchEvent(new Event('user-updated'));
    alert('Your profile was saved and updated successfully and published live on the site! 🎉');
    // Editing happens on its own dedicated page — return to the profile
    handleNavigate('profile');
  };

  // Safe navigation
  const handleNavigate = (page: string, params: any = null) => {
    const isOwner = currentUser.role === 'OWNER' || currentUser.email?.toLowerCase() === 'mistvil112@gmail.com';
    const isTranslatorOrWriter = currentUser.role === 'TRANSLATOR' || currentUser.role === 'WRITER';

    if (page === 'admin') {
      if (!isOwner) {
        alert('Sorry, the owner & admin panel is reserved exclusively for the owner!');
        setCurrentPage('home');
        return;
      }
    }

    if (page === 'translator-panel') {
      if (!isOwner && !isTranslatorOrWriter) {
        alert('Sorry, the work panel is for translators, writers, or the owner only!');
        setCurrentPage('home');
        return;
      }
    }

    // Record every in-app screen in the browser history (with its own URL
    // hash) so the back button walks back through the visited screens
    // instead of leaving the site. Re-clicking the current screen doesn't
    // stack a duplicate entry.
    try {
      const isSameScreen = page === currentPage && JSON.stringify(params) === JSON.stringify(currentParams);
      if (!isSameScreen) {
        window.history.pushState({ mistvilPage: page, mistvilParams: params }, '', buildScreenHash(page, params));
      }
    } catch { /* history API unavailable */ }

    setCurrentPage(page);
    setCurrentParams(params);
    window.scrollTo(0, 0);
  };

  // Browser back/forward support: restore the screen saved in the history
  // entry instead of unloading the whole site.
  useEffect(() => {
    // Stamp the entry the visitor is currently on so going back to it
    // (or refreshing) restores the right screen.
    try {
      const cur = restoreLastScreen();
      window.history.replaceState({ mistvilPage: cur.page, mistvilParams: cur.params }, '', buildScreenHash(cur.page, cur.params));
    } catch { /* history API unavailable */ }

    const handlePopState = (e: PopStateEvent) => {
      // Prefer the state object; fall back to the entry's URL hash for
      // browsers/sessions where the state object didn't survive.
      const s = e.state;
      let target = (s && typeof s.mistvilPage === 'string')
        ? { page: s.mistvilPage, params: s.mistvilParams ?? null }
        : (parseScreenHash() || { page: 'home', params: null });
      if (!KNOWN_PAGES.has(target.page)) target = { page: 'home', params: null };
      setCurrentPage(target.page);
      setCurrentParams(target.params);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Toggle Novel Bookmarks (Mofaddala)
  const handleBookmarkToggle = (novelId: string) => {
    if (currentUser.role === 'GUEST') {
      alert('You must sign in first to add novels to your bookmarks. 🌫️');
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    const updated = bookmarks.includes(novelId) 
      ? bookmarks.filter(id => id !== novelId) 
      : [...bookmarks, novelId];
    
    setBookmarks(updated);
    MistVilDatabase.set('bookmarks', updated);

    // Update novel bookmarksCount
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const updatedNovels = allNovels.map(n => {
      if (n.id === novelId) {
        return { 
          ...n, 
          bookmarksCount: bookmarks.includes(novelId) ? n.bookmarksCount - 1 : n.bookmarksCount + 1 
        };
      }
      return n;
    });
    setNovels(updatedNovels);
    MistVilDatabase.set('novels', updatedNovels);
  };

  // Add custom user proposed suggestion
  const handleAddSuggestion = (suggestionData: Partial<Suggestion>) => {
    const newSug: Suggestion = {
      id: `sug-${Date.now()}`,
      titleAr: suggestionData.titleAr || '',
      titleEn: suggestionData.titleEn || '',
      novelUpdatesLink: suggestionData.novelUpdatesLink,
      cover: suggestionData.cover || 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600',
      genres: suggestionData.genres || [],
      description: suggestionData.description || '',
      suggestedBy: currentUser.username,
      suggestedById: currentUser.id,
      votes: 1,
      votedUsers: [currentUser.id],
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const updated = [newSug, ...suggestions];
    setSuggestions(updated);
    MistVilDatabase.set('suggestions', updated);
    setShowSuggestDialog(false);
    alert('Thank you! Your suggestion was recorded successfully and is now open for voting by all members.');
  };

  // Vote on specific suggestion
  const handleVoteSuggestion = (sugId: string) => {
    if (currentUser.role === 'GUEST') {
      alert('You must sign in first to vote on suggestions. 🌫️');
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    const updated = suggestions.map((sug) => {
      if (sug.id === sugId) {
        const hasVoted = sug.votedUsers.includes(currentUser.id);
        const votedUsers = hasVoted 
          ? sug.votedUsers.filter(id => id !== currentUser.id) 
          : [...sug.votedUsers, currentUser.id];
        
        return { 
          ...sug, 
          votes: hasVoted ? sug.votes - 1 : sug.votes + 1, 
          votedUsers 
        };
      }
      return sug;
    });

    setSuggestions(updated);
    MistVilDatabase.set('suggestions', updated);
  };

  // Read Chapter helper (Routes to full screen reader)
  const handleReadChapter = (novelId: string, chapterNumber: number) => {
    handleNavigate('reader', { novelId, chapterNumber });
  };

  // Reader viewport navigation helper (Previous / Next chapter).
  // Uses the actual neighbouring chapter numbers so navigation works even
  // when chapter numbers are non-contiguous (e.g. after deletions).
  const handleReaderNavigateChapter = (direction: 'next' | 'prev') => {
    if (currentPage !== 'reader' || !currentParams) return;
    const { novelId, chapterNumber } = currentParams;
    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    const chaptersOfNovel = allChapters.filter(c => c.novelId === novelId).sort((a, b) => a.number - b.number);

    let nextNum = chapterNumber;
    const currentIndex = chaptersOfNovel.findIndex(c => c.number === chapterNumber);
    if (currentIndex !== -1) {
      if (direction === 'next' && currentIndex < chaptersOfNovel.length - 1) {
        nextNum = chaptersOfNovel[currentIndex + 1].number;
      } else if (direction === 'prev' && currentIndex > 0) {
        nextNum = chaptersOfNovel[currentIndex - 1].number;
      }
    } else if (direction === 'next') {
      nextNum = Math.min(chapterNumber + 1, chaptersOfNovel.length);
    } else {
      nextNum = Math.max(chapterNumber - 1, 1);
    }

    handleNavigate('reader', { novelId, chapterNumber: nextNum });
  };

  // All uploaded novels are publicly visible to every visitor (guests included),
  // except cancelled or pending ones. Interaction (bookmarks, comments, votes) still requires signing in.
  const activeNovels = useMemo(() => novels.filter(n => n.status !== 'CANCELLED' && n.status !== 'PENDING'), [novels]);

  // Trending list — ranked by BOTH views and comment engagement. Each comment
  // (and reply) for the novel, whether left on the novel page or on one of its
  // chapters, adds to the score alongside its view count.
  const trendingNovels = useMemo(() => {
    const allComments = MistVilDatabase.get<any[]>('comments', []).filter(c => c && !c.deleted);
    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    const chapterToNovel: Record<string, string> = {};
    allChapters.forEach(ch => { if (ch && ch.id) chapterToNovel[ch.id] = ch.novelId; });

    const commentScore: Record<string, number> = {};
    allComments.forEach(c => {
      const novelId = c.refType === 'CHAPTER' ? (chapterToNovel[c.refId] || '') : (c.refId || '');
      if (!novelId) return;
      const replies = Array.isArray(c.replies) ? c.replies.length : 0;
      commentScore[novelId] = (commentScore[novelId] || 0) + 1 + replies;
    });

    // Comments are weighted higher than a single view since they signal much
    // stronger engagement, so they meaningfully influence what trends.
    const trendScore = (n: Novel) => (n.views || 0) + (commentScore[n.id] || 0) * 5;

    return [...activeNovels]
      .sort((a, b) => trendScore(b) - trendScore(a))
      .slice(0, 8);
  }, [activeNovels, novels]);

  // Latest added chapters list (with new tag): one card per novel — never a
  // duplicate — ordered by the moment its newest chapter became readable
  // (publishAt for scheduled chapters, createdAt otherwise). Every chapter
  // added to a novel moves that novel to the front of the list.
  const latestChaptersList = useMemo(() => {
    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    const now = new Date();
    const lastAddedAt = new Map<string, number>();
    for (const c of allChapters) {
      if (c.publishAt && new Date(c.publishAt) > now) continue; // not out yet
      const t = Date.parse(c.publishAt || c.createdAt || '') || 0;
      if (t > (lastAddedAt.get(c.novelId) || 0)) lastAddedAt.set(c.novelId, t);
    }
    return [...activeNovels]
      .filter(n => n.chaptersCount > 0)
      .map(n => ({ ...n, lastChapterAt: lastAddedAt.get(n.id) || 0 }))
      .sort((a, b) => b.lastChapterAt - a.lastChapterAt)
      .slice(0, 20);
  }, [activeNovels]);

  // Honest relative timestamp for the latest-chapters cards
  const timeAgoLabel = (ts: number): string => {
    if (!ts) return '';
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'moments ago';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
  };

  return (
    <div className="relative min-h-screen bg-[#0A1120] text-purple-100 flex flex-col justify-between selection:bg-violet-600/30">
      
      {/* Ambient background particles and mist glow elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full mist-glow-violet opacity-30 blur-[120px] animate-float-slow" />
        <div className="absolute top-10 right-[-10%] w-[500px] h-[500px] rounded-full mist-glow-rose opacity-20 blur-[100px] animate-float-slow" style={{ animationDelay: '6s' }} />
      </div>

      {/* Shared Premium Header */}
      <Header 
        currentUser={currentUser} 
        onRoleChange={handleRoleChange} 
        onNavigate={handleNavigate}
        currentPage={currentPage}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Breaking News Ticker (Sticks below navbar) */}
      <NewsTicker 
        newsList={news} 
        onNewsClick={(item) => {
          if (item.novelId) {
            handleNavigate('novel', { id: item.novelId });
          } else {
            alert(`Platform announcement: ${item.title}`);
          }
        }}
      />

      {/* Moving Advertisements Ticker Bar */}
      <AdsTicker 
        onAdClick={(ad) => {
          handleNavigate('ads', { selectedAdId: ad.id });
        }}
        refreshTrigger={refreshAdsTrigger}
      />

      {/* Main Core Body Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 relative z-10">
        
        {/* ==================== SCREEN 1: HOMEPAGE ==================== */}
        {currentPage === 'home' && (
          <div className="flex flex-col gap-10">
            {/* dynamic custom hero welcome banner requested by user */}
            <div className="relative w-full h-[160px] md:h-[240px] rounded-3xl overflow-hidden border border-white/5 shadow-xl flex items-center justify-between p-6 md:p-10 text-left animate-in fade-in duration-300">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-500 hover:scale-[1.01]"
                style={{ backgroundImage: `url(${safeSiteBanner})`, filter: 'brightness(0.35)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-[#0A1120] via-[#0A1120]/40 to-transparent" />
              <div className="relative z-10 flex flex-col gap-2 max-w-2xl">
                <h1 className="text-2xl md:text-4xl font-extrabold text-white flex items-center gap-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {isImageSource(safeSiteLogo) ? (
                    <img src={safeSiteLogo} alt="Logo" className="w-8 h-8 rounded-full object-cover filter drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]" referrerPolicy="no-referrer" />
                  ) : (
                    <img src="/site_logo_v2.png" alt="Logo" className="w-8 h-8 rounded-full object-cover filter drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]" referrerPolicy="no-referrer" />
                  )}
                  <span>{safeSiteName}</span>
                </h1>
                <p className="text-xs md:text-sm text-purple-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-semibold">
                  The premium platform for translating and writing fantasy novels and stories ✨
                </p>
                <p className="text-[10px] text-purple-300/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] hidden sm:block leading-relaxed">
                  Explore exclusive chapters, follow your favorite translators, and share your thoughts in a reading environment built for fantasy and action fans!
                </p>
              </div>
            </div>

            {activeNovels.length === 0 ? (
              <div className="w-full text-left p-8 md:p-12 rounded-3xl bg-white/5 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-[80px]" />
                
                <img src="/site_logo_v2.png" alt="Logo" className="w-12 h-12 rounded-full object-cover filter drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] mb-4 block" referrerPolicy="no-referrer" />
                <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">Welcome to {safeSiteName}!</h2>
                <p className="text-purple-300 text-sm md:text-base leading-relaxed max-w-3xl">
                  There are no published novels yet. Stay tuned for the first exclusive translated novels and chapters! ✨
                </p>
              </div>
            ) : (
              <>
                {/* Cinematic Slider */}
                <HeroSlider 
                  featuredNovels={activeNovels.slice(0, 3)}
                  onStartReading={(id) => handleReadChapter(id, 1)}
                  onViewDetails={(id) => handleNavigate('novel', { id })}
                />

                {/* Continuing Reading Carousel (History) */}
                <ContinueReading 
                  progressItems={readingHistory}
                  novels={novels}
                  onChapterClick={handleReadChapter}
                />

                {/* Trending Section */}
                <div className="w-full text-left mt-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                      <Flame size={20} className="text-rose-400 animate-pulse" />
                      <span>Trending novels today</span>
                    </h2>
                    <span className="text-xs text-purple-400">Live updates</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {trendingNovels.map((novel, idx) => (
                      <NovelCard 
                        key={novel.id}
                        novel={novel}
                        isBookmarked={bookmarks.includes(novel.id)}
                        onBookmarkToggle={handleBookmarkToggle}
                        onClick={(id) => handleNavigate('novel', { id })}
                        ranking={idx + 1}
                      />
                    ))}
                  </div>
                </div>

                {/* Latest added chapters section */}
                <div className="w-full text-left my-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                      <Layers size={20} className="text-violet-400" />
                      <span>Latest added chapters</span>
                    </h2>
                    <button 
                      onClick={() => handleNavigate('explore')}
                      className="text-xs text-violet-400 hover:text-white"
                    >
                      Show library filters →
                    </button>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {latestChaptersList.map((novel) => (
                        <div 
                          key={novel.id}
                          onClick={() => handleReadChapter(novel.id, novel.chaptersCount)}
                          className="p-4 bg-[#0E1626] hover:bg-[#131F33] border border-white/5 hover:border-violet-500/20 rounded-2xl flex gap-4 cursor-pointer transition-all hover:-translate-y-0.5 group relative"
                        >
                          {/* Purple "New" ribbon badge as requested in specs */}
                          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-600 text-white shadow-md animate-pulse">
                            New
                          </span>

                          <img src={novel.cover} alt={novel.titleAr} className="w-12 h-18 rounded-xl object-cover shrink-0" loading="lazy" referrerPolicy="no-referrer" />
                          
                          <div className="flex-1 flex flex-col justify-between min-w-0 text-left">
                            <div>
                              <h4 className="font-extrabold text-xs text-white group-hover:text-violet-400 transition-colors truncate">
                                {novel.titleAr}
                              </h4>
                              <span className="text-[10px] text-purple-400 truncate mt-0.5 block">{novel.titleEn}</span>
                            </div>
                            
                            <div className="flex justify-between items-center mt-2 text-[10px] text-purple-300 border-t border-white/5 pt-2">
                              <span className="font-bold text-violet-300">Read chapter {novel.chaptersCount} →</span>
                              <span className="text-purple-400">{timeAgoLabel(novel.lastChapterAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                {/* All Published Novels / Latest Added Section */}
                <div className="w-full text-left mt-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                      <span className="text-violet-400">✨</span>
                      <span>All published novels (newest first)</span>
                    </h2>
                    <span className="text-xs text-purple-400">Live auto-updates</span>
                  </div>
                  
                  {activeNovels.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-4">
                      {/* Sort by createdAt descending, so newly added always appear first */}
                      {[...activeNovels]
                        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                        .map((novel) => (
                          <NovelCard 
                            key={novel.id}
                            novel={novel}
                            isBookmarked={bookmarks.includes(novel.id)}
                            onBookmarkToggle={handleBookmarkToggle}
                            onClick={(id) => handleNavigate('novel', { id })}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center glass-panel rounded-2xl border border-white/5 text-purple-400">
                      <p className="text-xs">There are no published novels right now.</p>
                    </div>
                  )}
                </div>

              </>
            )}
          </div>
        )}

        {/* ==================== SCREEN 2: DISCOVERY / EXPLORE CATALOG ==================== */}
        {currentPage === 'explore' && (
          <ExploreLibrary 
            novels={activeNovels}
            bookmarks={bookmarks}
            onBookmarkToggle={handleBookmarkToggle}
            onNovelClick={(id) => handleNavigate('novel', { id })}
          />
        )}

        {/* ==================== SCREEN 3: NOVEL PROFILE DETAILS ==================== */}
        {currentPage === 'novel' && currentParams && (
          <NovelDetails 
            novelId={currentParams.id}
            currentUser={currentUser}
            onBack={() => handleNavigate('explore')}
            onReadChapter={handleReadChapter}
            isBookmarked={bookmarks.includes(currentParams.id)}
            onBookmarkToggle={handleBookmarkToggle}
            autoOpenAddChapter={currentParams.autoOpenAddChapter}
          />
        )}

        {/* ==================== SCREEN 4: READ CHAPTERS VIEWPORT ==================== */}
        {currentPage === 'reader' && currentParams && (
          <ReaderView 
            novelId={currentParams.novelId}
            chapterNumber={currentParams.chapterNumber}
            currentUser={currentUser}
            onBack={() => handleNavigate('novel', { id: currentParams.novelId })}
            onNavigateChapter={handleReaderNavigateChapter}
          />
        )}

        {/* ==================== SCREEN 5: TRANSLATORS CLAIMS / SUGGESTIONS LIST ==================== */}
        {currentPage === 'suggestions' && (
          <div className="w-full text-left mt-4 pb-12 animate-in fade-in duration-300">
            <div className="p-6 bg-[#131F33] rounded-3xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <Compass size={24} className="text-rose-400 animate-pulse" />
                  <span>Suggest new novels for voting</span>
                </h1>
                <p className="text-xs text-purple-300 mt-1">Vote for novels you want to see translated live on the platform, or submit a new suggestion!</p>
              </div>
              <button 
                onClick={() => {
                  if (currentUser.role === 'GUEST') {
                    alert('You must sign in first to submit novel suggestions. 🌫️');
                    window.dispatchEvent(new Event('open-login-modal'));
                    return;
                  }
                  setShowSuggestDialog(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg self-start sm:self-auto shrink-0 cursor-pointer"
              >
                Submit a new suggestion +
              </button>
            </div>

            {/* List of active suggestions */}
            <div className="flex flex-col gap-4">
              {suggestions.filter(s => s.status === 'PENDING').length > 0 ? (
                suggestions.filter(s => s.status === 'PENDING').map((sug) => (
                  <div key={sug.id} className="p-5 bg-[#131F33] border border-white/5 rounded-2xl flex flex-col md:flex-row gap-5 items-center md:items-start text-left">
                    <img src={sug.cover} alt={sug.titleAr} className="w-24 h-36 rounded-xl object-cover border border-white/5 shrink-0 shadow-lg" />
                    
                    <div className="flex-1 w-full flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 w-full">
                          <h4 className="font-extrabold text-sm text-white">{sug.titleAr}</h4>
                          <button 
                            onClick={() => handleVoteSuggestion(sug.id)}
                            className={`px-4 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${sug.votedUsers.includes(currentUser.id) ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-extrabold' : 'bg-white/5 border-white/10 text-purple-300 hover:bg-white/10'}`}
                          >
                            <span>👍 Vote to translate ({sug.votes})</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-purple-400 mt-0.5">{sug.titleEn}</p>
                        <p className="text-xs text-purple-300/90 mt-4 leading-relaxed whitespace-pre-wrap">{sug.description}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 pt-3 border-t border-white/5 text-[10px] text-purple-400 gap-3 w-full">
                        <span>Suggested by: <span className="font-bold text-white">{sug.suggestedBy}</span></span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">Open for public voting</span>
                          {(currentUser.role === 'TRANSLATOR' || currentUser.role === 'OWNER') && (
                            <button
                              onClick={() => handleClaimSuggestion(sug)}
                              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-md shadow-violet-500/10 flex items-center gap-1"
                            >
                              <span>Reserve & pick up to translate 📝</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center glass-panel rounded-2xl border border-white/5 text-purple-400">
                  <p className="text-sm font-semibold">There are no novel suggestions open for voting right now.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 6: TEAMS DIRECTORY ==================== */}
        {currentPage === 'teams' && (
          <div className="w-full text-left mt-4 pb-12 animate-in fade-in duration-300">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Users size={20} className="text-violet-400 animate-pulse" />
              <span>Directory of approved translators & teams ✍️</span>
            </h2>

            {/* Request to Join Box */}
            <div className="mb-8 p-6 bg-gradient-to-r from-violet-950/30 to-purple-950/30 border border-violet-500/20 rounded-3xl relative overflow-hidden text-left shadow-xl">
              <div className="absolute top-0 left-0 w-32 h-32 bg-violet-600/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border-b border-white/5 pb-4 mb-6">
                <div>
                  <h3 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2">
                    <Award size={18} className="text-violet-400" />
                    <span>Apply as an (independent individual) or a (full team)</span>
                  </h3>
                  <p className="text-[10px] text-purple-300 mt-1">Are you an independent translator who wants to publish chapters? Or do you have a full translation team to register on the platform? Apply now!</p>
                </div>
                {currentUser.role === 'GUEST' ? (
                  <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-bold">
                    ⚠️ Please sign in first to submit an application
                  </span>
                ) : (
                  <button 
                    onClick={() => {
                      setShowJoinForm(!showJoinForm);
                      setJoinSuccess('');
                      setJoinError('');
                    }}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 self-start cursor-pointer hover:shadow-violet-500/10"
                  >
                    {showJoinForm ? 'Close application form ▲' : 'Open the application form ▼'}
                  </button>
                )}
              </div>

              {showJoinForm && currentUser.role !== 'GUEST' && (
                <form onSubmit={handleJoinRequest} className="flex flex-col gap-5 text-xs font-medium bg-black/30 p-5 rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-300">
                  {joinSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-300 rounded-xl text-center font-bold">
                      {joinSuccess}
                    </div>
                  )}
                  {joinError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-center font-bold">
                      {joinError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Join Type Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-purple-200 font-bold">Type of application *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setJoinType('INDIVIDUAL')}
                          className={`py-2 px-3 rounded-xl border font-bold transition-all text-center flex justify-center items-center gap-1.5 ${joinType === 'INDIVIDUAL' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/5 text-purple-300 hover:bg-white/10'}`}
                        >
                          <span>Independent individual translator ✍️</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setJoinType('TEAM')}
                          className={`py-2 px-3 rounded-xl border font-bold transition-all text-center flex justify-center items-center gap-1.5 ${joinType === 'TEAM' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/5 text-purple-300 hover:bg-white/10'}`}
                        >
                          <span>Full translation team 👥</span>
                        </button>
                      </div>
                    </div>

                    {/* Team/Individual Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-purple-200 font-bold">Name (your name or team name) *</label>
                      <input
                        type="text"
                        required
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        placeholder={joinType === 'INDIVIDUAL' ? 'Enter your translator name...' : 'Enter the team name to register...'}
                        className="bg-[#0E1626] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-2.5 text-white text-xs transition-all text-left"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Languages */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-purple-200 font-bold">Languages you translate from *</label>
                      <input
                        type="text"
                        required
                        value={joinLanguages}
                        onChange={(e) => setJoinLanguages(e.target.value)}
                        placeholder="e.g. Korean, English, Japanese..."
                        className="bg-[#0E1626] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-2.5 text-white text-xs transition-all text-left"
                      />
                    </div>

                    {/* Discord/Telegram */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-purple-200 font-bold">Contact link or handle (Discord / Telegram) *</label>
                      <input
                        type="text"
                        required
                        value={joinContact}
                        onChange={(e) => setJoinContact(e.target.value)}
                        placeholder="e.g. dsc.gg/yourteam or a Telegram handle..."
                        className="bg-[#0E1626] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-2.5 text-white text-xs transition-all text-left"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Experience */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-purple-200 font-bold">Previous experience and past projects in detail *</label>
                      <textarea
                        required
                        rows={3}
                        value={joinExperience}
                        onChange={(e) => setJoinExperience(e.target.value)}
                        placeholder="Enter the novels or chapters you have translated before..."
                        className="bg-[#0E1626] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-2.5 text-white text-xs transition-all text-left resize-none"
                      />
                    </div>

                    {/* Reason / Bio */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-purple-200 font-bold">A short note or your reason for joining us *</label>
                      <textarea
                        required
                        rows={3}
                        value={joinReason}
                        onChange={(e) => setJoinReason(e.target.value)}
                        placeholder="Why do you want to publish your translations or move your team to MistVil?..."
                        className="bg-[#0E1626] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-2.5 text-white text-xs transition-all text-left resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full md:w-fit px-8 py-3 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold transition-all shadow-md self-end flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Submit application to admin 🚀</span>
                  </button>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="p-6 bg-[#131F33] border border-white/5 rounded-3xl flex flex-col justify-between text-left shadow-md">
                  <div>
                    <div 
                      onClick={() => setSelectedTeam(team)}
                      className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="text-3xl p-2 bg-white/5 rounded-2xl border border-white/5">{team.logo}</span>
                      <div>
                        <h3 className="font-extrabold text-sm text-white hover:text-violet-300 transition-colors">{team.name}</h3>
                        <span className="text-[10px] text-purple-400">Founded: {new Date(team.createdAt).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>

                    <p className="text-xs text-purple-300 leading-relaxed mb-4">{team.bio}</p>

                    <h4 className="font-bold text-[10px] text-violet-400 uppercase tracking-wider mb-2">Active team members:</h4>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {team.members.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl text-[10px] text-purple-200">
                          <img src={member.avatar} alt={member.username} className="w-5 h-5 rounded-full border border-white/10" />
                          <span>{member.username} ({member.role})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-3 border-t border-white/5">
                    <span className="text-purple-400">Manages {team.novelsCount} active novels</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedTeam(team)}
                        className="text-violet-400 hover:text-white font-extrabold cursor-pointer transition-colors"
                      >
                        View details & works 📂
                      </button>
                      <span className="text-white/10">|</span>
                      <button 
                        onClick={() => alert(`Thanks for your interest in joining "${team.name}"! Please contact the team lead listed in the team details to request to join.`)}
                        className="text-purple-300 hover:text-white font-bold cursor-pointer transition-colors"
                      >
                        Join the team
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== SCREEN: FULL NOTIFICATIONS PAGE ==================== */}
        {currentPage === 'notifications' && (
          <div className="w-full text-left mt-4 pb-12 animate-in fade-in duration-300">
            <div className="p-6 bg-[#131F33] border border-white/5 rounded-3xl mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 font-sans">
                  <Bell className="text-rose-400" size={24} />
                  <span>Notifications Center 🔔</span>
                </h1>
                <p className="text-xs text-purple-300 mt-1">Keep up with the latest updates and alerts, and admin decisions about your account and promotions.</p>
              </div>
              <span className="text-3xl">📣</span>
            </div>

            <div className="p-6 bg-[#0E1626] border border-white/5 rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6 flex-wrap gap-3">
                <h3 className="font-extrabold text-sm text-white">Incoming notifications</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const rawNotifs = MistVilDatabase.get<any[]>('notifications', []);
                      const updated = rawNotifs.map(n => {
                        const isTarget = currentUser.role !== 'GUEST' && (n.userId === currentUser.id || n.email?.toLowerCase() === currentUser.email?.toLowerCase());
                        if (isTarget || (!n.userId && !n.email)) {
                          return { ...n, isRead: true };
                        }
                        return n;
                      });
                      MistVilDatabase.set('notifications', updated);
                      window.dispatchEvent(new Event('notifications-updated'));
                    }}
                    className="px-4 py-2 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Mark all as read ✓
                  </button>
                  <button 
                    onClick={() => {
                      const rawNotifs = MistVilDatabase.get<any[]>('notifications', []);
                      const updated = rawNotifs.filter(n => {
                        const isTarget = currentUser.role !== 'GUEST' && (n.userId === currentUser.id || n.email?.toLowerCase() === currentUser.email?.toLowerCase());
                        return !isTarget;
                      });
                      MistVilDatabase.set('notifications', updated);
                      window.dispatchEvent(new Event('notifications-updated'));
                    }}
                    className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear all notifications 🗑️
                  </button>
                </div>
              </div>

              {(() => {
                const rawNotifs = MistVilDatabase.get<any[]>('notifications', [
                  { id: '1', title: 'New chapter available!', message: 'Chapter 165 of "The Beginning After the End" is now available to read.', isRead: false, createdAt: '10 minutes ago' },
                  { id: '2', title: 'Your novel was approved', message: 'The novel "Return of the Shadow King" was approved and published successfully.', isRead: true, createdAt: '1 hour ago' }
                ]);
                const userNotifications = rawNotifs.filter(n => {
                  if (currentUser.role === 'GUEST') {
                    return !n.userId && !n.email;
                  }
                  return !n.userId && !n.email || n.userId === currentUser.id || n.email?.toLowerCase() === currentUser.email?.toLowerCase();
                });
                // Newest notifications always on top. New notifications are
                // appended to the end of the stored array, so for legacy
                // entries without parseable dates we fall back to reversed
                // insertion order.
                const indexed = userNotifications.map((n, idx) => ({ n, idx, t: Date.parse(n?.createdAt || '') || 0 }));
                indexed.sort((a, b) => (b.t - a.t) || (b.idx - a.idx));
                const sortedNotifications = indexed.map(x => x.n);

                return (
                  <div className="flex flex-col gap-4">
                    {sortedNotifications.length > 0 ? (
                      sortedNotifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-2 ${
                            notif.isRead 
                              ? 'bg-white/[0.01] border-white/5 hover:border-white/10' 
                              : 'bg-violet-500/[0.04] border-violet-500/20 hover:border-violet-500/30'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-2">
                              {!notif.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                              <span className="font-extrabold text-sm text-white">{notif.title}</span>
                            </div>
                            <span className="text-[10px] text-purple-400 font-mono">{notif.createdAt}</span>
                          </div>
                          <p className="text-xs text-purple-200/90 leading-relaxed mt-1 whitespace-pre-line text-left">{notif.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-purple-400">
                        <p className="text-sm">You have no notifications right now.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 7: MEMBER PROFILE PAGE ==================== */}
        {currentPage === 'profile' && (
          <div className="w-full text-left mt-4 pb-12 animate-in fade-in duration-300">
            <div className="relative rounded-3xl overflow-hidden border border-white/5 shadow-xl select-none mb-6">
              {/* Cover banner image */}
              <div 
                className="w-full h-36 md:h-48 bg-cover bg-center transition-all duration-500"
                style={{ 
                  backgroundImage: `url(${currentUser.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200'})` 
                }}
              >
                <div className="w-full h-full bg-gradient-to-t from-[#0A1120] via-black/40 to-transparent" />
              </div>

              {/* Inner card profile info overlapping the banner */}
              <div className="px-6 pb-6 relative z-10 -mt-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.username} 
                    className="w-24 h-24 rounded-full border-4 border-[#0A1120] bg-[#0A1120] shadow-2xl relative z-10" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="pb-2">
                    <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                      <h2 className="text-xl md:text-2xl font-extrabold text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{currentUser.username}</h2>
                      {(() => {
                        const userNovelsCount = MistVilDatabase.get<any[]>('novels', [])
                          .filter(n => n.translatorId === currentUser.id && n.status !== 'PENDING').length;
                        
                        let rankLabel = currentUser.role;
                        if (currentUser.role === 'OWNER') rankLabel = 'Owner 👑';
                        else if (currentUser.role === 'SUPERVISOR') rankLabel = 'Supervisor 🛡️';
                        else if (currentUser.role === 'MEMBER') rankLabel = 'Reader 👤';
                        else if (currentUser.role === 'TRANSLATOR' || currentUser.role === 'WRITER') {
                          if (userNovelsCount > 10) rankLabel = 'Pro Translator & Writer 🏆';
                          else if (userNovelsCount > 6) rankLabel = 'Expert Translator & Writer 🎖️';
                          else rankLabel = 'Translator & Writer ✍️';
                        }

                        return (
                          <span className="text-[10px] bg-gradient-to-r from-rose-600 to-violet-600 text-white border border-violet-500/30 px-3 py-0.5 rounded-full font-bold shadow-md shadow-violet-500/10">
                            Rank: {rankLabel}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-purple-400 mt-1 font-mono">{currentUser.email}</p>
                  </div>
                </div>

                {/* Edit Profile button */}
                <button 
                  onClick={handleOpenEditProfile}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:shadow-violet-500/20 mb-2 self-center sm:self-end"
                >
                  <Edit size={14} />
                  <span>Edit profile ⚙️</span>
                </button>
              </div>

              {/* Biography, Support Methods and Stats */}
              <div className="p-6 pt-0 border-t border-white/5 bg-[#0E1626]/90">
                <div className={`grid grid-cols-1 ${['OWNER', 'TRANSLATOR', 'WRITER'].includes(currentUser.role) ? 'md:grid-cols-2' : ''} gap-6 mt-6`}>
                  {/* Bio & Details */}
                  <div className="text-left flex flex-col gap-3">
                    <div>
                      <span className="text-[10px] text-purple-400 font-bold block mb-1">Bio:</span>
                      <p className="text-xs text-purple-200 leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        {currentUser.bio || 'You haven\'t written a bio yet. Click the edit button to add your bio! ✨'}
                      </p>
                    </div>
                  </div>

                  {/* Support & contact methods: shown ONLY for the owner and
                      owner-approved creative roles — never for regular readers */}
                  {['OWNER', 'TRANSLATOR', 'WRITER'].includes(currentUser.role) && (
                  <div className="text-left flex flex-col gap-3">
                    <span className="text-[10px] text-purple-400 font-bold block mb-1">Approved support & contact methods:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                        <span className="text-[9px] text-purple-400 font-bold">📧 PayPal support account:</span>
                        <span className="text-white font-mono break-all">{currentUser.paypalEmail || 'Not linked yet'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                        <span className="text-[9px] text-purple-400 font-bold">🔗 Direct financial support link:</span>
                        {currentUser.supportLink ? (
                          <a href={currentUser.supportLink} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-white hover:underline truncate font-bold flex items-center gap-1">
                            <Link size={12} />
                            <span>My support page</span>
                          </a>
                        ) : (
                          <span className="text-purple-500/70 italic">No support link yet</span>
                        )}
                      </div>
                      {/* Social media accounts: owner-managed list only */}
                      {currentUser.role === 'OWNER' && (currentUser.socialLinks || []).map((link) => (
                        <div key={link.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                          <span className="text-[9px] text-purple-400 font-bold">{link.icon} {link.name}:</span>
                          <a href={link.url.startsWith('http') ? link.url : undefined} target="_blank" rel="noreferrer" className="text-white font-mono truncate hover:text-violet-300">
                            {link.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/5 text-center">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-purple-400 block mb-1">Level</span>
                    <span className="font-extrabold text-white text-base">Lvl {currentUser.level}</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-purple-400 block mb-1">Total XP</span>
                    <span className="font-extrabold text-white text-base">{currentUser.xp} XP</span>
                  </div>
                  <button 
                    onClick={() => setShowProfileFavorites(!showProfileFavorites)}
                    className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col items-center justify-center ${showProfileFavorites ? 'border-violet-500/50 bg-violet-500/10 shadow-[0_0_15px_rgba(56,189,248,0.15)] scale-102' : 'bg-white/5 border-white/5 hover:border-violet-500/20'}`}
                  >
                    <span className="text-[10px] text-purple-400 block mb-1">Bookmarked novels</span>
                    <span className="font-extrabold text-white text-base flex items-center gap-1">
                      {bookmarks.length} <Heart size={14} className="text-rose-400 fill-rose-400 animate-pulse" />
                    </span>
                    <span className="text-[9px] text-violet-400 mt-0.5 font-bold">
                      {showProfileFavorites ? 'Click to hide ▲' : 'Click to browse ▼'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bookmarks Display Section */}
            {showProfileFavorites && (
              <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Heart size={16} className="text-rose-400 fill-rose-400 animate-pulse" />
                    <span>Your bookmarked novels ({bookmarks.length})</span>
                  </h3>
                  <span className="text-[10px] text-purple-400 font-bold">Click a novel to go to its live chapters page</span>
                </div>

                {bookmarks.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {novels
                      .filter((n) => bookmarks.includes(n.id))
                      .map((novel) => (
                        <div 
                          key={novel.id}
                          onClick={() => handleNavigate('novel', { id: novel.id })}
                          className="bg-[#0E1626] border border-white/5 hover:border-violet-500/30 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/15 group flex flex-col justify-between h-full"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <img 
                              src={novel.cover} 
                              alt={novel.titleAr} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-95" />
                            
                            {/* Remove button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookmarkToggle(novel.id);
                              }}
                              className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 text-rose-400 hover:text-white rounded-full transition-all cursor-pointer z-10"
                              title="Remove from bookmarks"
                            >
                              <Heart size={12} className="fill-current" />
                            </button>
                          </div>
                          <div className="p-2.5 text-left flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-extrabold text-[11px] text-white group-hover:text-violet-400 transition-colors truncate">
                                {novel.titleAr}
                              </h4>
                              <span className="text-[9px] text-purple-400 truncate block mt-0.5">{novel.titleEn}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-purple-300 font-bold text-left">
                              Browse novel →
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-12 px-4 text-center bg-[#0E1626]/50 rounded-2xl border border-dashed border-white/5 text-purple-400 animate-in fade-in duration-300">
                    <Heart size={32} className="mx-auto mb-3 text-purple-500/50" />
                    <p className="text-xs font-semibold">Your bookmarks are completely empty right now!</p>
                    <p className="text-[10px] text-purple-400 mt-1">Start bookmarking your favorite novels from the library and they'll show up here.</p>
                    <button
                      onClick={() => handleNavigate('explore')}
                      className="px-5 py-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl text-xs font-bold mt-4 transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-md shadow-violet-500/10"
                    >
                      Browse & explore the library now 🧭
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Works & Reservations Section for Creative Roles */}
            {['OWNER', 'TRANSLATOR', 'WRITER'].includes(currentUser.role) && (
              <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-6 animate-in fade-in duration-300">
                <h3 className="font-extrabold text-sm text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-3">
                  <FileText size={16} className="text-violet-400" />
                  <span>💼 Personal works & reservations board</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Column 1: Active Translating/Writing Works */}
                  <div>
                    <h4 className="font-bold text-xs text-purple-300 mb-3 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-violet-400" />
                      <span>Current works ({novels.filter(n => n.translatorId === currentUser.id).length})</span>
                    </h4>

                    {novels.filter(n => n.translatorId === currentUser.id).length > 0 ? (
                      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {novels
                          .filter(n => n.translatorId === currentUser.id)
                          .map(novel => (
                            <div 
                              key={novel.id}
                              onClick={() => handleNavigate('novel', { id: novel.id })}
                              className="p-3 bg-[#0E1626] hover:bg-[#16243B] border border-white/5 hover:border-violet-500/20 rounded-xl flex items-center gap-3 cursor-pointer transition-all text-left"
                            >
                              <img src={novel.cover} alt={novel.titleAr} className="w-10 h-14 rounded-lg object-cover border border-white/5" />
                              <div className="flex-1 text-left">
                                <h5 className="font-extrabold text-[11px] text-white truncate">{novel.titleAr}</h5>
                                <span className="text-[9px] text-purple-400 block truncate">{novel.titleEn}</span>
                                <span className="text-[8px] mt-1 inline-block bg-violet-600/20 text-violet-300 px-1.5 py-0.5 rounded font-bold">
                                  {novel.chaptersCount} chapters • {novel.status}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-[#0E1626]/50 border border-dashed border-white/5 rounded-2xl text-[10px] text-purple-400">
                        {currentUser.role === 'WRITER' ? 'You haven\'t authored any novels yet.' : 'You haven\'t translated any novels registered under your name yet.'}
                      </div>
                    )}
                  </div>

                  {/* Column 2: Reserved Works */}
                  <div>
                    <h4 className="font-bold text-xs text-purple-300 mb-3 flex items-center gap-1.5">
                      <Clock size={14} className="text-violet-400" />
                      <span>Active reservations ({MistVilDatabase.get<any[]>('reservations', []).filter(r => r.translatorId === currentUser.id && r.status === 'ACTIVE').length})</span>
                    </h4>

                    {MistVilDatabase.get<any[]>('reservations', []).filter(r => r.translatorId === currentUser.id && r.status === 'ACTIVE').length > 0 ? (
                      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {MistVilDatabase.get<any[]>('reservations', [])
                          .filter(r => r.translatorId === currentUser.id && r.status === 'ACTIVE')
                          .map(res => {
                            const daysLeft = Math.ceil((new Date(res.endAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            return (
                              <div 
                                key={res.id}
                                className="p-3 bg-[#0E1626] border border-white/5 rounded-xl flex flex-col justify-between"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="font-bold text-[11px] text-white truncate text-left">{res.novelTitle}</h5>
                                  <span className="text-[8px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-extrabold shrink-0">
                                    {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                                  </span>
                                </div>
                                <div className="text-[8px] text-purple-400 mt-2 flex justify-between items-center font-mono">
                                  <span>Reserved: {new Date(res.startAt).toLocaleDateString('en-US')}</span>
                                  <span>Ends: {new Date(res.endAt).toLocaleDateString('en-US')}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-[#0E1626]/50 border border-dashed border-white/5 rounded-2xl text-[10px] text-purple-400">
                        You have no novels reserved under your name right now.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Real badges: shown ONLY when the owner has granted this user
                at least one badge from the admin panel — no automatic or
                placeholder achievements. */}
            {(() => {
              const myBadges = getUserBadges(currentUser.id);
              if (myBadges.length === 0) return null;
              return (
                <div className="glass-panel p-6 rounded-3xl border border-white/5">
                  <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                    <Award size={16} className="text-yellow-400" />
                    <span>Badges & achievements granted by platform admin 🎖️</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {myBadges.map((badge) => (
                      <div key={badge.id} className="p-4 bg-white/5 rounded-2xl border border-yellow-500/20 flex flex-col items-center shadow-lg shadow-yellow-500/5">
                        <span className="text-2xl mb-2">{badge.icon}</span>
                        <span className="font-bold text-xs text-white">{badge.name}</span>
                        <span className="text-[10px] text-purple-400 mt-1">{badge.desc}</span>
                        <span className="text-[8px] text-purple-500 mt-1.5 font-mono">
                          Granted: {new Date(badge.grantedAt).toLocaleDateString('en-US')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* If Member (Reader), show Translator Request Form */}
            {currentUser.role === 'MEMBER' && (
              <TranslatorRequestForm 
                currentUser={currentUser} 
                onRequestSubmitted={() => {
                  // Re-render or notify user
                  console.log('Translator request submitted!');
                }} 
              />
            )}
          </div>
        )}

        {/* ==================== SCREEN 7.5: PROFILE EDIT PAGE (standalone) ==================== */}
        {currentPage === 'profile-edit' && currentUser.role !== 'GUEST' && (
          <div className="w-full text-left mt-4 pb-12 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => handleNavigate('profile')}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ← Back to profile
              </button>
              <h2 className="text-lg md:text-xl font-extrabold text-white">Edit profile ⚙️</h2>
            </div>
              <div className="p-6 bg-[#131F33] rounded-3xl border border-violet-500/20 shadow-2xl relative overflow-hidden mb-6 animate-in slide-in-from-top-4 duration-300">
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full blur-[60px]" />
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                  <Settings className="text-[#FF2255]" size={20} />
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Edit your profile details and support methods</h3>
                    <p className="text-[10px] text-purple-400 mt-0.5 font-semibold">Customize your account's look and your contact and support channels live.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Icon File Upload */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-purple-200">Upload profile avatar image (PNG, JPG, JPEG, WEBP) *</label>
                      <div className="relative border border-dashed border-white/10 hover:border-violet-500/40 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[90px]">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const allowed = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
                            const extension = file.name.split('.').pop()?.toLowerCase() || '';
                            if (!allowed.includes(extension)) {
                              alert('Error: you must choose a supported image format (PNG, JPG, JPEG, WEBP, SVG)!');
                              return;
                            }
                            compressImageFile(file, 256)
                              .then((dataUrl) => setEditAvatar(dataUrl))
                              .catch(() => alert('Could not process the avatar. Try a smaller image.'));
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {editAvatar ? (
                          <div className="flex items-center gap-3">
                            <img src={editAvatar} alt="Avatar Preview" className="w-10 h-10 rounded-full border border-violet-500 object-cover" referrerPolicy="no-referrer" />
                            <span className="text-[10px] text-green-400 font-bold">Avatar uploaded successfully ✓</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Camera size={16} className="text-purple-400" />
                            <span className="text-[10px] text-purple-300 font-bold">Click to choose your avatar file</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-purple-400 font-semibold">Attach a real square or cutout image for the best look.</p>
                    </div>

                    {/* Banner File Upload */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-purple-200">Upload profile cover (PNG, JPG, JPEG, WEBP) *</label>
                      <div className="relative border border-dashed border-white/10 hover:border-violet-500/40 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[90px]">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const allowed = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
                            const extension = file.name.split('.').pop()?.toLowerCase() || '';
                            if (!allowed.includes(extension)) {
                              alert('Error: you must choose a supported image format (PNG, JPG, JPEG, WEBP, SVG)!');
                              return;
                            }
                            compressImageFile(file, 1600)
                              .then((dataUrl) => setEditBanner(dataUrl))
                              .catch(() => alert('Could not process the profile cover. Try a smaller image.'));
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {editBanner ? (
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-8 rounded border border-violet-500 overflow-hidden">
                              <img src={editBanner} alt="Banner Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <span className="text-[10px] text-green-400 font-bold">Cover uploaded successfully ✓</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Image size={16} className="text-purple-400" />
                            <span className="text-[10px] text-purple-300 font-bold">Click to choose a PNG file for the profile cover</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-purple-400 font-semibold">A premium PNG cover image to display as your profile background.</p>
                    </div>
                  </div>

                  {/* Biography (textarea) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-purple-200">Your bio</label>
                    <textarea 
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Write something great about yourself, your novel interests, or your translation specialty..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Support links and communication: reserved for the owner
                      and owner-approved creative roles. Readers only edit
                      their avatar, banner and bio. */}
                  {['OWNER', 'TRANSLATOR', 'WRITER'].includes(currentUser.role) && (
                  <div className="border-t border-white/5 pt-5 mt-2">
                    <h4 className="text-xs font-bold text-violet-300 mb-3 flex items-center gap-1.5">
                      <DollarSign size={14} className="text-rose-400" />
                      <span>Your contact channels and support/funding methods:</span>
                    </h4>
                    <p className="text-[9px] text-purple-400 mb-4 font-semibold">Enter your details so readers and fans of your work can support you financially and reach you directly with ease.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PayPal Email */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-purple-200">PayPal email for support</label>
                        <input 
                          type="email"
                          value={editPaypalEmail}
                          onChange={(e) => setEditPaypalEmail(e.target.value)}
                          placeholder="your-paypal@domain.com"
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
                          dir="ltr"
                        />
                      </div>

                      {/* Support Link */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-purple-200">Direct support page link (Patreon, Ko-fi, etc.)</label>
                        <input 
                          type="url"
                          value={editSupportLink}
                          onChange={(e) => setEditSupportLink(e.target.value)}
                          placeholder="https://patreon.com/yourname"
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
                          dir="ltr"
                        />
                      </div>

                    </div>

                    {/* Social media manager: OWNER ONLY. Add a platform with
                        the + button, remove one with ×. Translators cannot
                        add social media links. */}
                    {currentUser.role === 'OWNER' && (
                      <div className="mt-5 pt-4 border-t border-white/5">
                        <h4 className="text-xs font-bold text-violet-300 mb-3">Your social media links (owner permission):</h4>
                        <div className="flex flex-col gap-2.5">
                          {editSocialLinks.map((link, idx) => {
                            const platform = SOCIAL_PLATFORMS.find(pf => pf.id === link.id);
                            return (
                              <div key={link.id} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditSocialLinks(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
                                  title={`Remove ${platform?.name || link.id}`}
                                >
                                  <X size={12} />
                                </button>
                                <input
                                  type="text"
                                  value={link.url}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setEditSocialLinks(prev => prev.map((l, i) => i === idx ? { ...l, url: v } : l));
                                  }}
                                  placeholder={platform?.placeholder || 'https://...'}
                                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
                                  dir="ltr"
                                />
                                <span className="w-28 shrink-0 text-[11px] font-bold text-purple-200 text-left">
                                  {platform?.icon} {platform?.name || link.id}
                                </span>
                              </div>
                            );
                          })}

                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newSocialPlatform) { alert('Choose a social platform from the list first.'); return; }
                                setEditSocialLinks(prev => [...prev, { id: newSocialPlatform, url: '' }]);
                                setNewSocialPlatform('');
                              }}
                              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow-md shadow-violet-500/10 shrink-0"
                            >
                              + Add
                            </button>
                            <select
                              value={newSocialPlatform}
                              onChange={(e) => setNewSocialPlatform(e.target.value)}
                              className="flex-1 bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-white outline-none focus:border-violet-500/50 text-left"
                            >
                              <option value="">— Choose a platform to add —</option>
                              {SOCIAL_PLATFORMS.filter(pf => !editSocialLinks.some(l => l.id === pf.id)).map(pf => (
                                <option key={pf.id} value={pf.id}>{pf.icon} {pf.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      <span>Save & publish changes live 🌫️</span>
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => handleNavigate('profile')}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-purple-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
          </div>
        )}

        {/* ==================== SCREEN 8: TRANSLATOR CONTROL DESK ==================== */}
        {currentPage === 'translator-panel' && (
          ['TRANSLATOR', 'WRITER', 'OWNER'].includes(currentUser.role) ? (
            <TranslatorPanel currentUser={currentUser} onNavigate={handleNavigate} />
          ) : (
            <AccessDeniedPanel
              message="The translator & writer work panel is only available to members with an approved translator or writer role."
              isGuest={currentUser.role === 'GUEST'}
              onNavigateHome={() => handleNavigate('home')}
            />
          )
        )}

        {/* ==================== SCREEN 9: ADMIN PANEL ==================== */}
        {currentPage === 'admin' && (
          currentUser.role === 'OWNER' ? (
            <AdminPanel currentUser={currentUser} onNavigate={handleNavigate} />
          ) : (
            <AccessDeniedPanel
              message="The admin & control panel is reserved exclusively for the platform owner."
              isGuest={currentUser.role === 'GUEST'}
              onNavigateHome={() => handleNavigate('home')}
            />
          )
        )}

        {/* ==================== SCREEN 10: ADS AND ANNOUNCEMENTS PANEL ==================== */}
        {currentPage === 'ads' && (
          <AdsPage 
            currentUser={currentUser} 
            onNavigate={handleNavigate} 
            selectedAdId={currentParams?.selectedAdId}
          />
        )}

        {/* ==================== SCREEN 11: PRIVACY POLICY PAGE ==================== */}
        {currentPage === 'privacy-policy' && (
          <PrivacyPolicy 
            currentUser={currentUser} 
            onNavigate={handleNavigate} 
          />
        )}

        {/* ==================== SCREEN 12: TERMS OF SERVICE PAGE ==================== */}
        {currentPage === 'terms-of-service' && (
          <TermsOfService 
            currentUser={currentUser} 
            onNavigate={handleNavigate} 
          />
        )}

        {/* ==================== SCREEN 13: CONTACT US PAGE ==================== */}
        {currentPage === 'contact-us' && (
          <ContactUs 
            currentUser={currentUser} 
            onNavigate={handleNavigate} 
          />
        )}

      </main>

      {/* Suggest Novel Modal Form Popup Overlay */}
      {showSuggestDialog && (
        <SuggestNovelDialog 
          currentUser={currentUser} 
          onClose={() => setShowSuggestDialog(false)} 
          onAddSuggestion={handleAddSuggestion}
        />
      )}

      {/* ==================== TEAM DETAILS MODAL ==================== */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl bg-[#0E1626] border border-white/10 rounded-3xl overflow-hidden text-left shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Cover Banner */}
            <div className="relative h-40 w-full overflow-hidden bg-gradient-to-r from-violet-950 to-purple-950">
              {selectedTeam.banner && (
                <img src={selectedTeam.banner} alt="Banner" className="w-full h-full object-cover opacity-35" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E1626] to-transparent" />
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedTeam(null)}
                className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/10 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Team Info Header inside Banner */}
              <div className="absolute bottom-4 right-6 flex items-center gap-4">
                <span className="text-4xl p-3 bg-[#131F33] border border-white/10 rounded-2xl shadow-xl">{selectedTeam.logo}</span>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-white">
                    <span>{selectedTeam.name}</span>
                  </h3>
                  <p className="text-xs text-purple-300 mt-1">Founded: {new Date(selectedTeam.createdAt).toLocaleDateString('en-US')}</p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 md:p-8 flex flex-col gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              
              {/* Bio / Description */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">🌫️ About the translator / team:</h4>
                <p className="text-sm text-purple-200 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                  {selectedTeam.bio}
                </p>
              </div>

              {/* Team Members List */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">👥 Approved team members ({selectedTeam.members.length}):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTeam.members.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl transition-all hover:bg-white/5">
                      <img src={member.avatar} alt={member.username} className="w-10 h-10 rounded-full border-2 border-violet-500/20 bg-black" />
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-white">{member.username}</p>
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/10 mt-1 inline-block">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support / Donation info */}
              {selectedTeam.supportUrl && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">💖 Support the team and its work:</h4>
                  <div className="p-4 bg-gradient-to-r from-violet-950/20 to-pink-950/20 border border-violet-500/10 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                    <p className="text-xs text-purple-300 max-w-sm">Love this translator's work and want to support them to keep going and publish faster?</p>
                    <a 
                      href={selectedTeam.supportUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/15 flex items-center gap-1.5 transition-all"
                    >
                      <Heart size={14} className="fill-current text-white animate-pulse" />
                      <span>Support the translator / team</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Associated Works / Novels */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">📚 The translator's approved works & projects:</h4>
                {(() => {
                  const teamNovels = novels.filter(n => n.teamId === selectedTeam.id || selectedTeam.works?.includes(n.id));
                  if (teamNovels.length === 0) {
                    return (
                      <div className="p-4 bg-white/[0.01] rounded-2xl border border-dashed border-white/5 text-center text-xs text-purple-400">
                        This translator has no announced works right now.
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {teamNovels.map((novel) => (
                        <div 
                          key={novel.id} 
                          onClick={() => {
                            setSelectedTeam(null);
                            handleNavigate('novel', { id: novel.id });
                          }}
                          className="flex gap-3 bg-white/[0.02] hover:bg-violet-600/10 border border-white/5 hover:border-violet-500/20 p-3 rounded-2xl transition-all cursor-pointer group"
                        >
                          <img src={novel.cover} alt={novel.titleAr} className="w-12 h-16 object-cover rounded-xl border border-white/10" />
                          <div className="text-left flex-1 flex flex-col justify-between">
                            <div>
                              <h5 className="text-xs font-extrabold text-white group-hover:text-violet-300 transition-colors line-clamp-1">{novel.titleAr}</h5>
                              <p className="text-[10px] text-purple-400 mt-0.5 font-mono line-clamp-1">{novel.titleEn}</p>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-purple-300">
                              <span>{novel.chaptersCount} chapters</span>
                              <span className="bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 text-violet-300">{novel.status === 'TRANSLATING' ? 'Translating' : 'Ongoing'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-[#131F33] border-t border-white/5 flex justify-start">
              <button 
                onClick={() => setSelectedTeam(null)}
                className="px-5 py-2 bg-white/5 hover:bg-white/10 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Shared Full-Featured Footer */}
      <footer className="w-full bg-[#0E1626] border-t border-white/5 py-12 px-6 lg:px-12 text-left relative overflow-hidden select-none">
        
        {/* Main Footer columns */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 relative z-10">
          
          {/* Col 1: Brand Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {isImageSource(safeSiteLogo) ? (
                <img src={safeSiteLogo} alt="Logo" className="w-8 h-8 rounded-full object-cover filter drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]" referrerPolicy="no-referrer" />
              ) : (
                <img src="/site_logo_v2.png" alt="Logo" className="w-8 h-8 rounded-full object-cover filter drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]" referrerPolicy="no-referrer" />
              )}
              <span className="font-extrabold text-xl bg-gradient-to-r from-violet-400 to-rose-400 bg-clip-text text-transparent">
                {safeSiteName}
              </span>
            </div>
            <p className="text-xs text-purple-300 leading-relaxed max-w-xs">
              {footerDesc}
            </p>
          </div>

          {/* Col 2: Shortcuts */}
          <div>
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider mb-4 border-l-2 border-violet-500 pl-2">Quick links</h4>
            <div className="flex flex-col gap-2.5 text-xs text-purple-300">
              <button onClick={() => handleNavigate('home')} className="hover:text-white transition-colors text-left cursor-pointer">Home</button>
              <button onClick={() => handleNavigate('explore')} className="hover:text-white transition-colors text-left cursor-pointer">Library & Explore</button>
              <button onClick={() => handleNavigate('suggestions')} className="hover:text-white transition-colors text-left cursor-pointer">Member suggestions</button>
              <button onClick={() => handleNavigate('teams')} className="hover:text-white transition-colors text-left cursor-pointer">Translators & teams</button>
            </div>
          </div>

          {/* Col 3: Support & Contact */}
          <div>
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider mb-4 border-l-2 border-rose-500 pl-2">Contact & support</h4>
            <div className="flex flex-col gap-2.5 text-xs text-purple-300">
              <span className="text-purple-400">Official email:</span>
              <span className="text-white font-mono">{footerEmail}</span>
              <span className="text-purple-400 mt-1">Quick support contact:</span>
              <span className="text-white">{footerSupport}</span>
            </div>
          </div>

          {/* Col 4: Community Links */}
          <div>
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider mb-4 border-l-2 border-violet-500 pl-2">Join our community</h4>
            <p className="text-xs text-purple-300 mb-3 max-w-xs">{footerCommunityText}</p>
            <div className="flex gap-2 flex-wrap justify-start select-none">
              {footerSocials.filter(s => s.active && s.url).map((social) => (
                <a 
                  key={social.id}
                  href={social.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-purple-300 hover:text-white hover:bg-violet-600 transition-all text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer" 
                  title={social.name}
                >
                  <span>{social.name} {social.icon}</span>
                </a>
              ))}
              {footerSocials.filter(s => s.active && s.url).length === 0 && (
                <span className="text-[10px] text-purple-400 font-semibold italic">No active social networks linked yet</span>
              )}
            </div>
          </div>

        </div>

        {/* Sub-footer Copyright */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-purple-400 gap-4">
          <span className="text-center sm:text-left">Copyright and translation rights fully reserved © 2026 for {safeSiteName} and its approved translators.</span>
          <div className="flex flex-wrap justify-center gap-4">
            <span 
              onClick={() => handleNavigate('terms-of-service')}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Terms of Service
            </span>
            <span 
              onClick={() => handleNavigate('privacy-policy')}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Privacy Policy
            </span>
            <span 
              onClick={() => handleNavigate('contact-us')}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Contact Us
            </span>
          </div>
        </div>

      </footer>

    </div>
  );
}
