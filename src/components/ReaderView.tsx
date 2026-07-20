import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Settings, Type, BookOpen, HelpCircle, Heart, Check, Share2, Clipboard, MessageSquare, X, ChevronDown, Bold, AlignRight, AlignCenter, AlignLeft, AlignJustify, Shield } from 'lucide-react';
import { Chapter, Novel, User, Comment, CommentReply, Report } from '../types';
import { MistVilDatabase } from '../data';
import { isUserTranslatorOfTheMonth } from '../utils/points';
import { normalizeChapterText } from '../utils/text';

// Chapter text is author-provided. Escape all HTML, then re-allow only the
// simple formatting tags the chapter editor can produce (<b>, <i>, <u>, <img>) so a
// malicious chapter can't inject scripts into readers' browsers.
function sanitizeChapterHtml(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Restore simple formatting tags
  let restored = escaped.replace(/&lt;(\/?)(b|i|u)&gt;/gi, '<$1$2>');
  
  // Only ever restore an <img> when the source is a safe image URL:
  // an embedded data:image, a same-site path, or an http(s) URL.
  // Anything else (javascript:, vbscript:, etc.) stays escaped as text.
  const isSafeImgSrc = (src: string) => {
    const v = src.trim().toLowerCase();
    return v.startsWith('data:image/') || v.startsWith('https://') || v.startsWith('http://') || v.startsWith('/');
  };

  // Restore img tags (backwards compatibility)
  restored = restored.replace(/&lt;img\s+src="([^"]+)"\s*(?:\/)?&gt;/gi, (match, src) => {
    if (!isSafeImgSrc(src)) return match;
    return `<img src="${src}" class="max-h-[300px] sm:max-h-[500px] w-auto max-w-full my-4 mx-auto rounded-xl shadow-lg border border-white/10 block object-contain" />`;
  });
  
  // Restore (PNG, JPG: base64) tags
  restored = restored.replace(/\(PNG,\s*JPG:\s*([^\s)]+)\)/gi, (match, src) => {
    if (!isSafeImgSrc(src)) return match;
    return `<img src="${src}" class="max-h-[300px] sm:max-h-[500px] w-auto max-w-full my-4 mx-auto rounded-xl shadow-lg border border-white/10 block object-contain" />`;
  });
  
  return restored;
}

interface ReaderViewProps {
  novelId: string;
  chapterNumber: number;
  currentUser: User;
  onBack: () => void;
  onNavigateChapter: (direction: 'next' | 'prev') => void;
}

export default function ReaderView({ novelId, chapterNumber, currentUser, onBack, onNavigateChapter }: ReaderViewProps) {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [themeMode, setThemeMode] = useState<'normal' | 'black' | 'sepia' | 'blue' | 'green' | 'pink' | 'purple'>(() => 
    MistVilDatabase.get<'normal' | 'black' | 'sepia' | 'blue' | 'green' | 'pink' | 'purple'>('reader_theme', 'normal')
  );
  const [fontSize, setFontSize] = useState<number>(() => 
    MistVilDatabase.get<number>('reader_font_size', 18)
  );
  const [fontFamily, setFontFamily] = useState<'cairo' | 'naskh' | 'tajawal' | 'amiri' | 'plex'>(() => 
    MistVilDatabase.get<'cairo' | 'naskh' | 'tajawal' | 'amiri' | 'plex'>('reader_font_family', 'cairo')
  );
  const [lineHeight, setLineHeight] = useState<number>(() => 
    MistVilDatabase.get<number>('reader_line_height', 1.6)
  );
  const [fontContrast, setFontContrast] = useState<'high' | 'medium' | 'low'>(() => 
    MistVilDatabase.get<'high' | 'medium' | 'low'>('reader_font_contrast', 'high')
  );
  const [fontBold, setFontBold] = useState<boolean>(() => 
    MistVilDatabase.get<boolean>('reader_font_bold', false)
  );
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left' | 'justify'>(() =>
    MistVilDatabase.get<'right' | 'center' | 'left' | 'justify'>('reader_text_align', 'left')
  );
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [hasPrevChapter, setHasPrevChapter] = useState(false);
  const [hasNextChapter, setHasNextChapter] = useState(false);
  
  // Chapter Comments System state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<{ [commentId: string]: string }>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const [reportReason, setReportReason] = useState('Offensive / inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [isSpoilerComment, setIsSpoilerComment] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<string[]>([]);
  // When true, the chapter body is blurred/hidden to deter screenshots and
  // screen recording (triggered when the tab loses focus or PrintScreen is hit).
  const [screenshotGuard, setScreenshotGuard] = useState(false);

  // Reader Settings Setters
  const updateThemeMode = (mode: 'normal' | 'black' | 'sepia' | 'blue' | 'green' | 'pink' | 'purple') => {
    setThemeMode(mode);
    MistVilDatabase.set('reader_theme', mode);
  };
  const updateFontSize = (size: number) => {
    setFontSize(size);
    MistVilDatabase.set('reader_font_size', size);
  };
  const updateFontFamily = (family: 'cairo' | 'naskh' | 'tajawal' | 'amiri' | 'plex') => {
    setFontFamily(family);
    MistVilDatabase.set('reader_font_family', family);
  };
  const updateLineHeight = (height: number) => {
    setLineHeight(height);
    MistVilDatabase.set('reader_line_height', height);
  };
  const updateFontContrast = (contrast: 'high' | 'medium' | 'low') => {
    setFontContrast(contrast);
    MistVilDatabase.set('reader_font_contrast', contrast);
  };
  const updateFontBold = (bold: boolean) => {
    setFontBold(bold);
    MistVilDatabase.set('reader_font_bold', bold);
  };
  const updateTextAlign = (align: 'right' | 'center' | 'left' | 'justify') => {
    setTextAlign(align);
    MistVilDatabase.set('reader_text_align', align);
  };

  const isLightTheme = ['sepia', 'blue', 'green', 'pink', 'purple'].includes(themeMode);

  const getThemeClasses = () => {
    switch (themeMode) {
      case 'black':
        return 'bg-black text-[#E5E7EB]';
      case 'sepia':
        return 'bg-[#F4ECD8] text-[#4E3629]';
      case 'blue':
        return 'bg-[#E0F2FE] text-[#0C4A6E]';
      case 'green':
        return 'bg-[#DCFCE7] text-[#14532D]';
      case 'pink':
        return 'bg-[#FCE7F3] text-[#500724]';
      case 'purple':
        return 'bg-[#E0F2FE] text-[#0C4A6E]';
      case 'normal':
      default:
        return 'bg-[#0A1120] text-[#F1F6FC]';
    }
  };

  const getHeaderClasses = () => {
    switch (themeMode) {
      case 'black':
        return 'bg-black/90 border-white/10 text-white';
      case 'sepia':
        return 'bg-[#EFE6D0]/95 border-black/10 text-[#4E3629]';
      case 'blue':
        return 'bg-[#D0E8FB]/95 border-black/10 text-[#0C4A6E]';
      case 'green':
        return 'bg-[#CDF6DC]/95 border-black/10 text-[#14532D]';
      case 'pink':
        return 'bg-[#FBCFE8]/95 border-black/10 text-[#500724]';
      case 'purple':
        return 'bg-[#D3EDFB]/95 border-black/10 text-[#0C4A6E]';
      case 'normal':
      default:
        return 'bg-[#0A1120]/80 border-white/5 text-[#F1F6FC]';
    }
  };

  const getCardClasses = () => {
    if (isLightTheme) {
      return 'bg-black/5 border border-black/5';
    } else {
      return 'bg-white/5 border border-white/5';
    }
  };

  const getInputClasses = () => {
    if (isLightTheme) {
      return 'bg-black/5 border border-black/10 text-black placeholder-black/40 focus:border-violet-600';
    } else {
      return 'bg-[#0E1626] border border-white/5 text-white placeholder-purple-300/40 focus:border-violet-500';
    }
  };
  
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load novel and specific chapter
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const foundNovel = allNovels.find(n => n.id === novelId);
    if (foundNovel) setNovel(foundNovel);

    const allChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
    let novelChapters = allChapters.filter(c => c.novelId === novelId);

    // Scheduled chapters are unreadable for everyone (owner and translator
    // included) until their publish time — they live only in the Activity &
    // Scheduling page of the translator panel before that.
    novelChapters = novelChapters.filter(c => !c.publishAt || new Date(c.publishAt) <= new Date());

    // Sort chapters by number ascending
    novelChapters.sort((a, b) => a.number - b.number);

    const currentIndex = novelChapters.findIndex(c => c.number === chapterNumber);
    setHasPrevChapter(currentIndex > 0);
    setHasNextChapter(currentIndex !== -1 && currentIndex < novelChapters.length - 1);

    const foundChapter = novelChapters.find(c => c.number === chapterNumber);
    if (foundChapter) {
      setChapter(foundChapter);
      
      // Load comments for this chapter
      const allComments = MistVilDatabase.get<Comment[]>('comments', []);
      const chapterComments = allComments.filter(c => c.refId === foundChapter.id);
      setComments(chapterComments);

      // Update reader history
      const history = MistVilDatabase.get<any[]>('reading_history', []);
      const updatedHistory = history.filter(h => h.novelId !== novelId);
      updatedHistory.unshift({
        novelId,
        chapterNumber,
        progress: Math.floor(Math.random() * 30) + 70, // Simulated scroll progress
        updatedAt: new Date().toISOString()
      });
      MistVilDatabase.set('reading_history', updatedHistory);

      // Save to read chapters log
      const readChapters = MistVilDatabase.get<any[]>('read_chapters', []);
      const alreadySaved = readChapters.some(rc => rc.novelId === novelId && rc.chapterNumber === chapterNumber && (rc.userId === (currentUser?.id || 'guest')));
      if (!alreadySaved) {
        readChapters.push({
          userId: currentUser?.id || 'guest',
          novelId,
          chapterNumber,
          readAt: new Date().toISOString()
        });
        MistVilDatabase.set('read_chapters', readChapters);
      }
    }
  }, [novelId, chapterNumber, currentUser]);

  // Live-refresh from the background server sync (both directions):
  // - A fresh visitor who deep-links straight into a chapter before the
  //   first sync lands is no longer stuck on "Loading..." — the chapter
  //   (and its comments) fill in the moment the data arrives.
  // - A reader sitting on the latest chapter sees the "next chapter"
  //   button light up seconds after a new chapter is published, without
  //   navigating or reloading.
  // The fallback tick also picks up a scheduled chapter the moment its
  // publish time passes (no sync event fires then — the data didn't change).
  useEffect(() => {
    const refreshChapter = () => {
      const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
      const foundNovel = allNovels.find(n => n.id === novelId);
      if (foundNovel) setNovel(prev => prev ?? foundNovel);

      const allChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
      const novelChapters = allChapters
        .filter(c => c.novelId === novelId)
        .filter(c => !c.publishAt || new Date(c.publishAt) <= new Date())
        .sort((a, b) => a.number - b.number);
      const currentIndex = novelChapters.findIndex(c => c.number === chapterNumber);
      setHasPrevChapter(currentIndex > 0);
      setHasNextChapter(currentIndex !== -1 && currentIndex < novelChapters.length - 1);
      if (currentIndex !== -1) {
        const foundChapter = novelChapters[currentIndex];
        // First fill of a deep-linked chapter: pull its comments too.
        if (!chapter) {
          const allComments = MistVilDatabase.get<Comment[]>('comments', []);
          setComments(allComments.filter(c => c.refId === foundChapter.id));
        }
        setChapter(prev => (prev && prev.id === foundChapter.id && prev.content === foundChapter.content) ? prev : foundChapter);
      }
    };

    refreshChapter();
    window.addEventListener('chapters-updated', refreshChapter);
    window.addEventListener('novels-updated', refreshChapter);
    const retryTimer = setInterval(refreshChapter, 3000);
    return () => {
      window.removeEventListener('chapters-updated', refreshChapter);
      window.removeEventListener('novels-updated', refreshChapter);
      clearInterval(retryTimer);
    };
  }, [novelId, chapterNumber, novel, chapter]);

  // Live-refresh comments: other visitors' comments arrive through the
  // background server sync. Without this listener, anyone who opened the
  // chapter before the first sync completed (e.g. a fresh guest) would
  // never see the existing comments until they navigated away and back.
  useEffect(() => {
    const refresh = () => {
      if (!chapter) return;
      const allComments = MistVilDatabase.get<Comment[]>('comments', []);
      setComments(allComments.filter(c => c.refId === chapter.id));
    };
    window.addEventListener('comments-updated', refresh);
    return () => window.removeEventListener('comments-updated', refresh);
  }, [chapter]);

  // Views are only counted if reader spends > 30 seconds
  useEffect(() => {
    if (!novelId || !chapterNumber) return;

    const timer = setTimeout(() => {
      const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
      const updatedNovels = allNovels.map(n => n.id === novelId ? { ...n, views: n.views + 1 } : n);
      MistVilDatabase.set('novels', updatedNovels);
      setNovel(prev => prev && prev.id === novelId ? { ...prev, views: prev.views + 1 } : prev);

      const allChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
      const updatedChapters = allChapters.map(c => 
        (c.novelId === novelId && c.number === chapterNumber) 
          ? { ...c, views: (c.views || 0) + 1 } 
          : c
      );
      MistVilDatabase.set('chapters', updatedChapters);
      setChapter(prev => prev && prev.novelId === novelId && prev.number === chapterNumber ? { ...prev, views: (prev.views || 0) + 1 } : prev);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [novelId, chapterNumber]);

  // Track scrolling progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Copy protection & select listeners as specified in master specs §19.7
  useEffect(() => {
    // If the user is an OWNER, they can copy all chapters freely!
    if (currentUser.role === 'OWNER') {
      return;
    }

    const preventAction = (e: Event) => {
      e.preventDefault();
      alert('Chapter content is protected under MistVil copyright ©');
    };

    const blockCopy = (e: ClipboardEvent) => preventAction(e);
    const blockCut = (e: ClipboardEvent) => preventAction(e);
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    const blockDrag = (e: DragEvent) => e.preventDefault();
    
    // Best-effort screenshot deterrence. The web platform cannot truly block an
    // OS-level screen capture, but we can neutralize the most common paths and
    // discourage the rest: wipe the clipboard on PrintScreen, and blur the
    // chapter body whenever the tab is backgrounded or loses focus (which many
    // capture / screen-record tools trigger).
    const guardOnce = () => {
      setScreenshotGuard(true);
      window.setTimeout(() => setScreenshotGuard(false), 1500);
    };

    const blockShortcuts = (e: KeyboardEvent) => {
      // Block Ctrl+P (Print), Ctrl+S (Save), Ctrl+U (View Source), Ctrl+C (Copy)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        alert('Chapter content is protected against theft, copying, and downloading under MistVil copyright ©');
      }
      // PrintScreen / screenshot shortcuts (PrtScn, Win+Shift+S, Cmd+Shift+3/4/5)
      const isScreenshot =
        e.key === 'PrintScreen' ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', 'S', '3', '4', '5'].includes(e.key));
      if (isScreenshot) {
        e.preventDefault();
        try { navigator.clipboard?.writeText(''); } catch { /* clipboard may be unavailable */ }
        guardOnce();
        alert('Screenshots are disabled inside MistVil chapters. The content is protected by copyright ©');
      }
    };

    const handleVisibility = () => { if (document.hidden) setScreenshotGuard(true); else setScreenshotGuard(false); };
    const handleBlur = () => setScreenshotGuard(true);
    const handleFocus = () => setScreenshotGuard(false);

    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCut);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('dragstart', blockDrag);
    document.addEventListener('keydown', blockShortcuts);
    document.addEventListener('keyup', blockShortcuts);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCut);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('dragstart', blockDrag);
      document.removeEventListener('keydown', blockShortcuts);
      document.removeEventListener('keyup', blockShortcuts);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser]);

  // Add Comment Handler
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'GUEST') {
      alert('You must sign in first to write comments. 🌫️');
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }
    if (!commentText.trim() || !chapter) return;

    // Random suffix: Date.now() alone collides when the same member posts
    // several comments quickly, making later comments seem to never appear.
    const createdAt = new Date().toISOString();
    const newComment: Comment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      refId: chapter.id,
      refType: 'CHAPTER',
      authorName: currentUser.username,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      content: commentText,
      likes: 0,
      likedBy: [],
      replies: [],
      createdAt,
      updatedAt: createdAt,
      isSpoiler: isSpoilerComment
    };

    const allComments = MistVilDatabase.get<Comment[]>('comments', []);
    const updated = [newComment, ...allComments];
    MistVilDatabase.set('comments', updated);
    setComments(updated.filter(c => c.refId === chapter.id));
    setCommentText('');
    setIsSpoilerComment(false);
  };

  // Like Comment Handler
  const handleLikeComment = (commentId: string) => {
    if (currentUser.role === 'GUEST') {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }
    if (!chapter) return;
    const allComments = MistVilDatabase.get<Comment[]>('comments', []);
    const updated = allComments.map(c => {
      if (c.id === commentId) {
        const alreadyLiked = c.likedBy.includes(currentUser.id);
        const likedBy = alreadyLiked 
          ? c.likedBy.filter(id => id !== currentUser.id)
          : [...c.likedBy, currentUser.id];
        const likes = alreadyLiked ? c.likes - 1 : c.likes + 1;
        return { ...c, likes, likedBy, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    MistVilDatabase.set('comments', updated);
    setComments(updated.filter(c => c.refId === chapter.id));
  };

  // Add Reply Handler
  const handleAddReply = (commentId: string) => {
    if (currentUser.role === 'GUEST') {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }
    const replyText = replyTexts[commentId];
    if (!replyText || !replyText.trim() || !chapter) return;

    const newReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorName: currentUser.username,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role === 'OWNER' ? 'Owner 👑' : currentUser.role === 'TRANSLATOR' ? 'Translator ✍️' : 'Member 👤',
      content: replyText,
      createdAt: new Date().toISOString()
    };

    const allComments = MistVilDatabase.get<Comment[]>('comments', []);
    const updated = allComments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply],
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });
    MistVilDatabase.set('comments', updated);
    setComments(updated.filter(c => c.refId === chapter.id));
    setReplyTexts({ ...replyTexts, [commentId]: '' });
    setActiveReplyId(null);
  };

  // Report offensive comment handler
  const handleReportComment = (comment: Comment) => {
    setReportingComment(comment);
    setReportReason('Offensive / inappropriate content');
    setReportDetails('');
  };

  const submitReport = () => {
    if (!reportingComment || !chapter || !novel) return;

    const newReport: Report = {
      id: 'report-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type: 'COMMENT',
      targetId: reportingComment.id,
      targetName: `${reportingComment.authorName}: ${reportingComment.content}`,
      reason: reportReason,
      details: `Novel: ${novel.titleEn || novel.titleAr} • Chapter ${chapter.number}${reportDetails ? ` - Details: ${reportDetails}` : ''}`,
      reportedBy: currentUser.role === 'GUEST' ? 'Guest' : currentUser.username,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const reports = MistVilDatabase.get<Report[]>('reports', []);
    MistVilDatabase.set('reports', [...reports, newReport]);

    // Send a system notification immediately to the Owner
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const usersDb = MistVilDatabase.get<any[]>('users_db', []);
    const owners = usersDb.filter(u => u && (u.role === 'OWNER' || u.email?.toLowerCase() === 'mistvil112@gmail.com'));
    const ownerIds = owners.map(u => u.id);
    if (ownerIds.length === 0) ownerIds.push('mistvil-owner'); // Fallback

    const newOwnerNotifs = ownerIds.map(oId => ({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: oId,
      title: '🚨 New report about an offensive comment!',
      message: `${newReport.reportedBy} reported an offensive comment in ${newReport.details}. Comment content: "${reportingComment.content}"`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: 'now'
    }));

    MistVilDatabase.set('notifications', [...allNotifs, ...newOwnerNotifs]);

    alert('Your report was sent to the platform owner successfully; appropriate action will be taken shortly.');
    setReportingComment(null);
    setReportDetails('');
  };

  // Delete comment handler for Owner
  const handleDeleteComment = (commentId: string) => {
    if (currentUser.role !== 'OWNER' && currentUser.email?.toLowerCase() !== 'mistvil112@gmail.com') {
      alert('Sorry, this permission is reserved for the site owner only!');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this comment?')) {
      return;
    }

    if (!chapter) return;
    // Tombstone-delete so the removal propagates to every device instead of
    // being resurrected by the server-side comments merge.
    MistVilDatabase.deleteComment(commentId);
    const remaining = MistVilDatabase.get<Comment[]>('comments', []);
    setComments(remaining.filter(c => c.refId === chapter.id));
    alert('Comment deleted successfully.');
  };

  if (!novel || !chapter) {
    return (
      <div className="w-full text-center py-20 text-purple-400">
        <p className="text-sm font-semibold">Loading the chapter reader...</p>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen text-left transition-colors duration-300 pb-16 ${getThemeClasses()}`}>
      
      {/* 3px Reading Progress bar fixed on top of the screen */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-rose-500 transition-all duration-100"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Reader Bar (Title, Navigation actions) */}
      <div className={`sticky top-0 z-40 w-full h-16 flex items-center justify-between gap-2 px-3 sm:px-6 border-b transition-colors duration-300 ${getHeaderClasses()}`}>
        <button 
          onClick={onBack}
          className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
            isLightTheme ? 'text-neutral-600 hover:text-black' : 'text-purple-300 hover:text-white'
          }`}
        >
          <span>← Back to novel</span>
        </button>

        <div className="text-center min-w-0">
          <h4 className={`font-extrabold text-xs truncate max-w-[140px] sm:max-w-md mx-auto ${isLightTheme ? 'text-neutral-950' : 'text-white'}`}>{novel.titleAr}</h4>
          <span className={`text-[10px] mt-0.5 block font-bold truncate max-w-[140px] sm:max-w-md mx-auto ${isLightTheme ? 'text-neutral-500' : 'text-purple-400'}`}>Chapter {chapter.number}: {chapter.title.split(':').slice(1).join(':').trim()}</span>
        </div>

        {/* Customizer triggers */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLightTheme 
                ? 'bg-black/5 hover:bg-black/10 text-neutral-700 border-black/10 hover:text-black' 
                : 'bg-white/5 hover:bg-white/10 text-purple-200 hover:text-white border-white/5'
            }`}
            title="Customize font & theme"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings Menu Drawer */}
      {showSettings && (
        <div className="fixed top-18 left-3 sm:left-6 z-50 w-full max-w-[340px] sm:max-w-[360px] bg-[#101A2C] border border-white/10 p-5 rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-top-4 text-left">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5 select-none">
            <button 
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
            <h4 className="font-extrabold text-sm text-white">Reader Settings</h4>
          </div>

          {/* Themes switcher horizontal list */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5 justify-between">
              {[
                { id: 'normal', name: 'Normal', btnBg: 'bg-[#17253D]', btnText: 'text-[#D8E6F5]', btnBorder: 'border-violet-500/35' },
                { id: 'black', name: 'Black', btnBg: 'bg-black', btnText: 'text-white', btnBorder: 'border-white/20' },
                { id: 'sepia', name: 'Sepia', btnBg: 'bg-[#F4ECD8]', btnText: 'text-[#5B4636]', btnBorder: 'border-[#5B4636]/20' },
                { id: 'blue', name: 'Blue', btnBg: 'bg-[#E0F2FE]', btnText: 'text-[#0369A1]', btnBorder: 'border-[#0369A1]/20' },
                { id: 'green', name: 'Green', btnBg: 'bg-[#DCFCE7]', btnText: 'text-[#15803D]', btnBorder: 'border-[#15803D]/20' },
                { id: 'pink', name: 'Pink', btnBg: 'bg-[#FCE7F3]', btnText: 'text-[#BE185D]', btnBorder: 'border-[#BE185D]/20' },
                { id: 'purple', name: 'Purple', btnBg: 'bg-[#E0F2FE]', btnText: 'text-[#0369A1]', btnBorder: 'border-[#0369A1]/20' }
              ].map((theme) => {
                const isActive = themeMode === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => updateThemeMode(theme.id as any)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-0.5 select-none cursor-pointer ${theme.btnBg} ${theme.btnText} ${theme.btnBorder} ${
                      isActive ? 'ring-2 ring-violet-500 border-transparent shadow-md scale-105' : 'hover:scale-102 hover:brightness-105'
                    }`}
                  >
                    {isActive && <Check size={10} className="shrink-0" />}
                    <span>{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid of Customizers styled as fieldsets with legend on the border */}
          <div className="flex flex-col gap-3.5 mb-4">
            
            {/* Font Family */}
            <fieldset className="border border-white/10 rounded-xl px-3 py-1 bg-white/5 relative">
              <legend className="text-[10px] text-purple-300 font-bold px-1.5 select-none">Font</legend>
              <div className="relative flex items-center justify-between w-full">
                <select
                  value={fontFamily}
                  onChange={(e) => updateFontFamily(e.target.value as any)}
                  className="w-full bg-transparent text-xs text-white text-left outline-none cursor-pointer pl-6 pr-1 py-0.5 appearance-none relative z-10 font-bold"
                >
                  <option value="cairo" className="bg-[#101A2C] text-white">Cairo</option>
                  <option value="naskh" className="bg-[#101A2C] text-white">Naskh</option>
                  <option value="tajawal" className="bg-[#101A2C] text-white">Tajawal</option>
                  <option value="amiri" className="bg-[#101A2C] text-white">Amiri</option>
                  <option value="plex" className="bg-[#101A2C] text-white">IBM Plex</option>
                </select>
                <ChevronDown size={14} className="text-purple-400 absolute left-0 pointer-events-none" />
              </div>
            </fieldset>

            {/* Font Size */}
            <fieldset className="border border-white/10 rounded-xl px-3 py-1 bg-white/5 relative">
              <legend className="text-[10px] text-purple-300 font-bold px-1.5 select-none">Font size</legend>
              <div className="relative flex items-center justify-between w-full">
                <select
                  value={fontSize}
                  onChange={(e) => updateFontSize(parseInt(e.target.value))}
                  className="w-full bg-transparent text-xs text-white text-left outline-none cursor-pointer pl-6 pr-1 py-0.5 appearance-none relative z-10 font-bold"
                >
                  <option value={16} className="bg-[#101A2C] text-white">90%</option>
                  <option value={18} className="bg-[#101A2C] text-white">100%</option>
                  <option value={20} className="bg-[#101A2C] text-white">110%</option>
                  <option value={22} className="bg-[#101A2C] text-white">120%</option>
                  <option value={24} className="bg-[#101A2C] text-white">130%</option>
                  <option value={26} className="bg-[#101A2C] text-white">140%</option>
                  <option value={28} className="bg-[#101A2C] text-white">150%</option>
                  <option value={30} className="bg-[#101A2C] text-white">160%</option>
                  <option value={34} className="bg-[#101A2C] text-white">180%</option>
                  <option value={40} className="bg-[#101A2C] text-white">200%</option>
                </select>
                <ChevronDown size={14} className="text-purple-400 absolute left-0 pointer-events-none" />
              </div>
            </fieldset>

            {/* Line Height */}
            <fieldset className="border border-white/10 rounded-xl px-3 py-1 bg-white/5 relative">
              <legend className="text-[10px] text-purple-300 font-bold px-1.5 select-none">Line height</legend>
              <div className="relative flex items-center justify-between w-full">
                <select
                  value={lineHeight}
                  onChange={(e) => updateLineHeight(parseFloat(e.target.value))}
                  className="w-full bg-transparent text-xs text-white text-left outline-none cursor-pointer pl-6 pr-1 py-0.5 appearance-none relative z-10 font-bold"
                >
                  <option value={1.4} className="bg-[#101A2C] text-white">140%</option>
                  <option value={1.5} className="bg-[#101A2C] text-white">150%</option>
                  <option value={1.6} className="bg-[#101A2C] text-white">160%</option>
                  <option value={1.7} className="bg-[#101A2C] text-white">170%</option>
                  <option value={1.8} className="bg-[#101A2C] text-white">180%</option>
                  <option value={2.0} className="bg-[#101A2C] text-white">200%</option>
                </select>
                <ChevronDown size={14} className="text-purple-400 absolute left-0 pointer-events-none" />
              </div>
            </fieldset>

            {/* Font Contrast / Opacity */}
            <fieldset className="border border-white/10 rounded-xl px-3 py-1 bg-white/5 relative">
              <legend className="text-[10px] text-purple-300 font-bold px-1.5 select-none">Text contrast</legend>
              <div className="relative flex items-center justify-between w-full">
                <select
                  value={fontContrast}
                  onChange={(e) => updateFontContrast(e.target.value as any)}
                  className="w-full bg-transparent text-xs text-white text-left outline-none cursor-pointer pl-6 pr-1 py-0.5 appearance-none relative z-10 font-bold"
                >
                  <option value="high" className="bg-[#101A2C] text-white">High</option>
                  <option value="medium" className="bg-[#101A2C] text-white">Medium</option>
                  <option value="low" className="bg-[#101A2C] text-white">Low</option>
                </select>
                <ChevronDown size={14} className="text-purple-400 absolute left-0 pointer-events-none" />
              </div>
            </fieldset>

          </div>

          {/* Bottom Row - Bold & Text Alignment */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            
            {/* Bold Button on the Left */}
            <button
              onClick={() => updateFontBold(!fontBold)}
              className={`w-12 h-9 rounded-lg flex items-center justify-center border font-extrabold text-xs transition-all cursor-pointer select-none ${
                fontBold 
                  ? 'bg-violet-600 border-violet-500 text-white shadow-md' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Bold"
            >
              <span>B</span>
            </button>

            {/* Text Alignment buttons on the Right */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
              {[
                { id: 'left', icon: <AlignLeft size={14} /> },
                { id: 'center', icon: <AlignCenter size={14} /> },
                { id: 'right', icon: <AlignRight size={14} /> }
              ].map((align) => {
                const isAlignActive = textAlign === align.id;
                return (
                  <button
                    key={align.id}
                    onClick={() => updateTextAlign(align.id as any)}
                    className={`px-2.5 py-1 rounded-md flex items-center justify-center transition-all cursor-pointer select-none ${
                      isAlignActive 
                        ? 'bg-white/15 text-white border border-white/10' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                    title={align.id === 'right' ? 'Align right' : align.id === 'center' ? 'Center' : 'Align left'}
                  >
                    {align.icon}
                  </button>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* Print-only copyright notice replaces the protected content for non-owners */}
      {currentUser.role !== 'OWNER' && (
        <div className="print-only-notice hidden">
          This chapter is protected under MistVil translation and copyright © and may not be printed or saved.
        </div>
      )}

      {/* Screenshot-guard overlay: covers the chapter while the tab is
          backgrounded / a capture is attempted (non-owners only). */}
      {currentUser.role !== 'OWNER' && screenshotGuard && (
        <div className="fixed inset-0 z-[90] bg-[#0A1120]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-3 text-center px-6 select-none">
          <Shield size={40} className="text-violet-400" />
          <p className="text-sm font-extrabold text-white">Screenshots are disabled inside chapters</p>
          <p className="text-xs text-purple-300 max-w-xs">This content is protected by MistVil copyright ©. Return to the tab to keep reading.</p>
        </div>
      )}

      {/* Main Chapter Content Frame */}
      <div
        ref={readerRef}
        className={`w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16 leading-relaxed relative watermarked-text transition-all duration-150 ${currentUser.role !== 'OWNER' ? 'select-none print-protected' : ''} ${currentUser.role !== 'OWNER' && screenshotGuard ? 'blur-xl pointer-events-none' : ''}`}
        data-watermark={`MISTVIL - ${currentUser.username}`}
        style={{
          fontSize: `${fontSize}px`, 
          fontFamily: 
            fontFamily === 'cairo' ? '"Cairo", "Tajawal", sans-serif' :
            fontFamily === 'naskh' ? '"Noto Naskh Arabic", "Amiri", serif' :
            fontFamily === 'tajawal' ? '"Tajawal", sans-serif' :
            fontFamily === 'amiri' ? '"Amiri", serif' :
            '"IBM Plex Sans Arabic", sans-serif',
          lineHeight: lineHeight,
          textAlign: textAlign as any,
          fontWeight: fontBold ? 'bold' : 'normal',
          opacity: fontContrast === 'high' ? 1 : fontContrast === 'medium' ? 0.85 : 0.7,
          userSelect: currentUser.role !== 'OWNER' ? 'none' : 'auto',
          WebkitUserSelect: currentUser.role !== 'OWNER' ? 'none' : 'auto'
        }}
      >
        <div className={`mb-8 text-center ${currentUser.role !== 'OWNER' ? 'select-none' : ''}`}>
          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight border-b border-white/5 pb-4">
            Chapter {chapter.number}: {chapter.title.split(':').slice(1).join(':').trim() || 'Translated chapter'}
          </h2>
          <span className="text-xs text-purple-400 mt-2 block">Translation and publishing rights reserved for MistVil and the translator: {novel.translatorName}</span>
        </div>

        {/* Text paragraph splitter */}
        <div className="space-y-6">
          {normalizeChapterText(chapter.content).split('\n\n').map((para, idx) => (
            <p 
              key={idx} 
              className={`whitespace-pre-wrap ${currentUser.role !== 'OWNER' ? 'select-none' : ''}`}
              dangerouslySetInnerHTML={{ __html: sanitizeChapterHtml(para) }}
            />
          ))}
        </div>

        {/* Chapter illustrations render inline within the content above (the
            sanitizer restores <img> tags), so no separate "attached
            illustrations" section — it would duplicate every image. */}

        {/* Navigation bottom buttons (with correctly inverted arrow icons) */}
        <div className="flex flex-wrap justify-between items-center gap-2 border-t border-white/5 pt-8 mt-12 select-none">
          <button
            onClick={() => hasPrevChapter && onNavigateChapter('prev')}
            disabled={!hasPrevChapter}
            className="px-3 sm:px-5 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer transition-all border border-white/5 hover:border-white/10"
          >
            <ChevronRight size={14} className="text-purple-400" />
            <span>Previous chapter</span>
          </button>

          <button
            onClick={onBack}
            className="px-3 sm:px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-purple-300 cursor-pointer"
          >
            Chapter index
          </button>

          <button
            onClick={() => hasNextChapter && onNavigateChapter('next')}
            disabled={!hasNextChapter}
            className="px-3 sm:px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-[#131F33] disabled:to-[#131F33] disabled:border-white/5 disabled:text-purple-300/30 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-violet-500/10"
          >
            <span>Next chapter</span>
            <ChevronLeft size={14} className="text-white" />
          </button>
        </div>

        {/* Comments section below chapter navigation */}
        <div className="mt-16 border-t border-white/5 pt-12 text-left">
          <h3 className={`text-lg font-extrabold mb-6 flex items-center justify-between gap-2 border-b border-white/5 pb-3 transition-colors duration-300 ${isLightTheme ? 'text-neutral-900 border-black/10' : 'text-white'}`}>
            <span>Comments & discussion on this chapter ({comments.length})</span>
            <MessageSquare size={18} className="text-violet-400" />
          </h3>

          {/* Form to submit comment */}
          <form onSubmit={handleAddComment} className="flex flex-col gap-2 mb-8">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={currentUser.role === 'GUEST' ? 'Sign in to comment on this chapter... 🌫️' : 'Write your comment about this chapter here...'}
                readOnly={currentUser.role === 'GUEST'}
                onClick={() => {
                  if (currentUser.role === 'GUEST') window.dispatchEvent(new Event('open-login-modal'));
                }}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className={`flex-1 min-w-0 outline-none rounded-2xl px-4 py-3 text-xs text-left transition-all ${getInputClasses()}`}
              />
              <button
                type="submit"
                className="px-4 sm:px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-2xl text-xs font-bold shadow-lg transition-all cursor-pointer shrink-0"
              >
                Send
              </button>
            </div>
            {currentUser.role !== 'GUEST' && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setIsSpoilerComment(!isSpoilerComment)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSpoilerComment
                      ? 'bg-red-500/15 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)] font-extrabold'
                      : 'bg-white/5 text-purple-300 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <span>🔥 Contains spoilers</span>
                </button>
              </div>
            )}
          </form>

          {/* List of comments */}
          <div className="flex flex-col gap-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className={`p-4 rounded-2xl text-left flex flex-col gap-3 transition-colors duration-300 ${getCardClasses()}`}>
                  
                  {/* Comment Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={comment.authorAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=user'} alt={comment.authorName} className="w-8 h-8 rounded-full border border-violet-500/20" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs transition-colors duration-300 ${isLightTheme ? 'text-neutral-900' : 'text-white'}`}>{comment.authorName}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold">
                            {comment.authorRole === 'OWNER' ? 'Owner 👑' : comment.authorRole === 'TRANSLATOR' ? 'Translator ✍️' : 'Member 👤'}
                          </span>
                          {isUserTranslatorOfTheMonth(comment.authorName) && (
                            <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-bold flex items-center gap-0.5">
                              🏆 Translator of the Month
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-purple-400 mt-0.5 block">{new Date(comment.createdAt).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comment Content */}
                  {comment.isSpoiler && !revealedSpoilers.includes(comment.id) ? (
                    <div className="pr-11">
                      <div
                        onClick={() => setRevealedSpoilers(prev => [...prev, comment.id])}
                        className="p-3.5 bg-red-950/35 hover:bg-red-950/50 border border-red-500/30 hover:border-red-500/50 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-300 group select-none"
                      >
                        <span className="text-xs font-bold text-red-400 flex items-center gap-2">
                          🚨 Spoiler! (click to read at your own risk)
                        </span>
                        <span className="text-[10px] bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-extrabold transition-colors">
                          Show 👁️
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pr-11">
                      {comment.isSpoiler && (
                        <span className="text-[10px] text-red-400 font-extrabold bg-red-500/10 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 mb-2 select-none">
                          🔥 Spoiler comment (revealed):
                        </span>
                      )}
                      <p className={`text-xs leading-relaxed transition-colors duration-300 ${isLightTheme ? 'text-neutral-800' : 'text-purple-200'} ${comment.isSpoiler ? 'border-r-2 border-red-500/40 pr-3 font-sans' : ''}`}>
                        {comment.content}
                      </p>
                    </div>
                  )}

                  {/* Comment Actions (Like / Reply triggers) */}
                  <div className={`flex items-center gap-4 pr-11 text-[9px] transition-colors duration-300 ${isLightTheme ? 'text-neutral-500' : 'text-purple-400'}`}>
                    <button 
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center gap-1 hover:text-rose-400 transition-colors cursor-pointer ${comment.likedBy.includes(currentUser.id) ? 'text-rose-400 font-bold' : ''}`}
                    >
                      <span>Like ({comment.likes})</span>
                    </button>
                    <button
                      onClick={() => {
                        if (currentUser.role === 'GUEST') {
                          window.dispatchEvent(new Event('open-login-modal'));
                          return;
                        }
                        setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                      }}
                      className={`transition-colors cursor-pointer ${isLightTheme ? 'hover:text-neutral-900' : 'hover:text-white'}`}
                    >
                      <span>Reply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportComment(comment)}
                      className="hover:text-red-400 transition-colors cursor-pointer flex items-center gap-0.5 text-purple-400/80"
                      title="Report an offensive comment"
                    >
                      <span>🚩 Report</span>
                    </button>
                    {(currentUser.role === 'OWNER' || currentUser.email?.toLowerCase() === 'mistvil112@gmail.com') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="hover:text-red-500 transition-colors cursor-pointer flex items-center gap-0.5 text-red-400"
                        title="Delete comment"
                      >
                        <span>🗑️ Delete comment</span>
                      </button>
                    )}
                  </div>

                  {/* Comment replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className={`mr-11 mt-2 flex flex-col gap-3 border-r pr-4 ${isLightTheme ? 'border-black/10' : 'border-white/5'}`}>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className={`p-3 rounded-xl flex flex-col gap-2 transition-colors duration-300 ${getCardClasses()}`}>
                          <div className="flex items-center gap-2">
                            <img src={reply.authorAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=reply'} alt={reply.authorName} className={`w-5 h-5 rounded-full border ${isLightTheme ? 'border-black/10' : 'border-white/10'}`} />
                            <span className={`font-bold text-[10px] transition-colors duration-300 ${isLightTheme ? 'text-neutral-950' : 'text-white'}`}>{reply.authorName}</span>
                            <span className="text-[7px] px-1 bg-violet-500/20 text-violet-300 rounded-full">{reply.authorRole}</span>
                          </div>
                          <p className={`text-xs transition-colors duration-300 ${isLightTheme ? 'text-neutral-700' : 'text-purple-300'} leading-relaxed`}>{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply field active */}
                  {activeReplyId === comment.id && (
                    <div className="mr-11 mt-2 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Write your kind reply..."
                        value={replyTexts[comment.id] || ''}
                        onChange={(e) => setReplyTexts({ ...replyTexts, [comment.id]: e.target.value })}
                        className={`flex-1 outline-none rounded-xl px-3 py-2 text-xs transition-all ${getInputClasses()}`}
                      />
                      <button 
                        onClick={() => handleAddReply(comment.id)}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold"
                      >
                        Reply
                      </button>
                    </div>
                  )}

                </div>
              ))
            ) : (
              <div className={`p-8 text-center rounded-2xl transition-colors duration-300 ${getCardClasses()} ${isLightTheme ? 'text-neutral-500' : 'text-purple-400'}`}>
                <p className="text-xs">No comments on this chapter yet. Share your thoughts on the translation and the epic events!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {reportingComment && (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="w-full max-w-md bg-[#101A2C] border border-white/10 rounded-3xl p-6 text-left shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">🚨 Report an offensive comment</h3>
            <p className="text-xs text-purple-300 mb-4">
              You are about to report a comment by <span className="text-violet-400 font-bold">{reportingComment.authorName}</span>:
            </p>
            
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-purple-200 mb-4 max-h-24 overflow-y-auto italic">
              "{reportingComment.content}"
            </div>

            <label className="block text-xs font-bold text-purple-300 mb-1.5">Reason for report:</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full bg-[#17253C] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white mb-4 outline-none focus:border-violet-500"
            >
              <option value="Offensive / inappropriate content">Offensive / inappropriate content / insults</option>
              <option value="Unmarked spoilers">Unmarked spoilers</option>
              <option value="Plagiarism / spam">Plagiarism / spam / ads</option>
              <option value="Other">Other (please explain below)</option>
            </select>

            <label className="block text-xs font-bold text-purple-300 mb-1.5">Additional details (optional):</label>
            <textarea
              placeholder="Add any notes that help the owner review the report..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="w-full h-20 bg-[#17253C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white mb-5 outline-none focus:border-violet-500 resize-none"
            />

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={submitReport}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-violet-600 hover:from-red-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Submit report
              </button>
              <button
                type="button"
                onClick={() => setReportingComment(null)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white border border-white/10 rounded-xl text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
