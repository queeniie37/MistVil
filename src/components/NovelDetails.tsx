import React, { useState, useEffect, useRef } from 'react';
import { Star, Eye, Layers, Heart, Share2, Plus, Calendar, Clock, ChevronDown, MessageSquare, Edit2, AlertCircle, Trash2, Upload, Image, ArrowUp, ArrowDown, FileText, ChevronLeft, Undo2, Redo2, BookOpen, Info, Download } from 'lucide-react';
import { Novel, Chapter, Comment, Review, User, UserRole, Report, Suggestion } from '../types';
import { MistVilDatabase } from '../data';
import { compressImageFile } from '../utils/media';
import { normalizeChapterText, spreadPlainTextLines } from '../utils/text';
import { isUserTranslatorOfTheMonth } from '../utils/points';
import ConfirmModal from './ConfirmModal';

function sanitizeChapterHtml(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Restore simple formatting tags
  let restored = escaped.replace(/&lt;(\/?)(b|i|u)&gt;/gi, '<$1$2>');
  
  // Restore img tags (backwards compatibility)
  restored = restored.replace(/&lt;img\s+src="([^"]+)"\s*(?:\/)?&gt;/gi, (match, src) => {
    return `<img src="${src}" class="max-h-[750px] w-full max-w-[700px] my-6 mx-auto rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] border border-white/10 block object-contain bg-black/30 p-1.5 transition-all duration-300 hover:border-violet-500/40 hover:scale-[1.01]" />`;
  });
  
  // Restore (PNG, JPG: base64) tags
  restored = restored.replace(/\(PNG,\s*JPG:\s*([^\s)]+)\)/gi, (match, src) => {
    return `<img src="${src}" class="max-h-[750px] w-full max-w-[700px] my-6 mx-auto rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] border border-white/10 block object-contain bg-black/30 p-1.5 transition-all duration-300 hover:border-violet-500/40 hover:scale-[1.01]" />`;
  });
  
  return restored;
}

function extractImagesFromContent(text: string): string[] {
  const urls: string[] = [];
  
  // Extract from <img> (backwards compatibility)
  const imgRegex = /<img\s+src="([^"]+)"\s*(?:\/)?\s*>/gi;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  
  // Extract from (PNG, JPG: ...)
  const customRegex = /\(PNG,\s*JPG:\s*([^\s)]+)\)/gi;
  while ((match = customRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

interface NovelDetailsProps {
  novelId: string;
  currentUser: User;
  onBack: () => void;
  onReadChapter: (novelId: string, chapterNumber: number) => void;
  isBookmarked: boolean;
  onBookmarkToggle: (novelId: string) => void;
  autoOpenAddChapter?: boolean;
}

export default function NovelDetails({ novelId, currentUser, onBack, onReadChapter, isBookmarked, onBookmarkToggle, autoOpenAddChapter }: NovelDetailsProps) {
  const [activeTab, setActiveTab] = useState<'chapters' | 'comments'>('chapters');
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [readChapters, setReadChapters] = useState<any[]>([]);
  // Chapter list ordering: true = ascending (1 → N), false = descending (N → 1)
  // Chapter list order: newest chapter first by default whenever a novel is
  // opened; the toolbar toggle can flip it to oldest-first per visit.
  const [chaptersAscending, setChaptersAscending] = useState(false);
  
  // Claim state variables
  const [timeRemaining, setTimeRemaining] = useState('');
  const [reservation, setReservation] = useState<any | null>(null);

  // New commenting state
  const [commentText, setCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<{ [commentId: string]: string }>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const [reportReason, setReportReason] = useState('Offensive / inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [isSpoilerComment, setIsSpoilerComment] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<string[]>([]);

  // Deletion double confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    danger: true
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, danger = true) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      onConfirm,
      danger
    });
  };

  // Add chapter simulator state
  const [showAddChapterForm, setShowAddChapterForm] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [newChapterImages, setNewChapterImages] = useState('');
  const [newChapterPublishAt, setNewChapterPublishAt] = useState('');
  const [newChapterNumber, setNewChapterNumber] = useState<string | number>('');
  const [publishTimeType, setPublishTimeType] = useState<'now' | 'schedule'>('now');
  const [contentHistory, setContentHistory] = useState<string[]>(['']);
  const [historyIdx, setHistoryIdx] = useState(0);

  const getMaxScheduleDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2); // 2 months from now
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    const hours = String(maxDate.getHours()).padStart(2, '0');
    const minutes = String(maxDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getMinScheduleDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef('');

  // Opening the add-chapter page always starts from the top (the trigger
  // button sits far down the novel page, so without this the form opened
  // at the previous scroll position).
  useEffect(() => {
    if (showAddChapterForm) {
      window.scrollTo(0, 0);
    }
  }, [showAddChapterForm]);

  useEffect(() => {
    if (showAddChapterForm) {
      if (editorRef.current && newChapterContent !== lastHtmlRef.current) {
        editorRef.current.innerHTML = newChapterContent;
        lastHtmlRef.current = newChapterContent;
      }
    }
  }, [showAddChapterForm, newChapterContent]);

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    lastHtmlRef.current = html;
    handleContentChange(html);
  };

  // First attach of the chapter text: pasting into the EMPTY editor lays the
  // content out with one visible blank line between every line, right in the
  // editor. Pastes into non-empty content are left to the browser, so every
  // later tweak by the translator (adding or removing blank lines) is kept
  // exactly as written.
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerText.replace(/\s/g, '') !== '') return;
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted || !pasted.trim()) return;
    e.preventDefault();
    const html = spreadPlainTextLines(pasted);
    el.innerHTML = html;
    lastHtmlRef.current = html;
    handleContentChange(html);
  };

  // Load everything on mount/id change
  useEffect(() => {
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const foundNovel = allNovels.find(n => n.id === novelId);
    if (foundNovel) {
      setNovel(foundNovel);
    }

    const allChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
    let foundChapters = allChapters.filter(c => c.novelId === novelId).sort((a, b) => a.number - b.number);

    // Scheduled (future publishAt) chapters never show in the novel's
    // chapter list — not even for the owner/translator. Until their publish
    // time arrives they live exclusively in the Activity & Scheduling page
    // of the translator panel.
    foundChapters = foundChapters.filter(c => !c.publishAt || new Date(c.publishAt) <= new Date());
    setChapters(foundChapters);
    setNewChapterNumber('');
    // Entering a novel always starts with the newest chapters on top
    setChaptersAscending(false);

    const allComments = MistVilDatabase.get<Comment[]>('comments', []);
    const foundComments = allComments.filter(c => c.refId === novelId || foundChapters.some(ch => ch.id === c.refId));
    setComments(foundComments);

    const allRead = MistVilDatabase.get<any[]>('read_chapters', []);
    const myRead = allRead.filter(rc => rc.userId === (currentUser?.id || 'guest'));
    setReadChapters(myRead);

    const allReservations = MistVilDatabase.get<any[]>('reservations', []);
    const activeRes = allReservations.find(r => r.novelId === novelId && r.status === 'ACTIVE');
    setReservation(activeRes || null);

  }, [novelId]);

  // Live-refresh the chapter list: picks up chapters synced from the server
  // AND makes a scheduled chapter appear for readers the moment its publish
  // time arrives (checked every 15s), without re-opening the page.
  useEffect(() => {
    const refreshChapters = () => {
      // If the novel itself wasn't in the local cache when the page opened
      // (direct link / first visit before the first server sync), pick it up
      // now instead of leaving the page blank.
      const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
      const foundNovel = allNovels.find(n => n.id === novelId);
      if (foundNovel) {
        setNovel(prev => prev ?? foundNovel);
      }

      const allChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
      let list = allChapters.filter(c => c.novelId === novelId).sort((a, b) => a.number - b.number);
      // Scheduled chapters are hidden from the chapter list for everyone
      // (owner and translator included) until their publish time arrives.
      list = list.filter(c => !c.publishAt || new Date(c.publishAt) <= new Date());
      setChapters(prev => {
        // Avoid re-render churn when nothing actually changed
        if (prev.length === list.length && prev.every((p, i) => p.id === list[i].id && p.title === list[i].title)) return prev;
        return list;
      });
    };
    window.addEventListener('chapters-updated', refreshChapters);
    window.addEventListener('novels-updated', refreshChapters);
    const timer = setInterval(refreshChapters, 15000);
    return () => {
      window.removeEventListener('chapters-updated', refreshChapters);
      window.removeEventListener('novels-updated', refreshChapters);
      clearInterval(timer);
    };
  }, [novelId, currentUser]);

  // Live-refresh comments pulled by the background server sync so every
  // visitor (guest, reader, translator, owner) sees all comments without
  // needing to re-open the page.
  useEffect(() => {
    const refresh = () => {
      const allComments = MistVilDatabase.get<Comment[]>('comments', []);
      setComments(allComments.filter(c => c.refId === novelId || chapters.some(ch => ch.id === c.refId)));
    };
    window.addEventListener('comments-updated', refresh);
    return () => window.removeEventListener('comments-updated', refresh);
  }, [novelId, chapters]);

  useEffect(() => {
    if (autoOpenAddChapter) {
      setActiveTab('chapters');
      setShowAddChapterForm(true);
    }
  }, [autoOpenAddChapter]);

  // Reservation Live Countdown Timer (Updates every second!)
  useEffect(() => {
    if (!reservation) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(reservation.endAt).getTime();
      const distance = end - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeRemaining('Reservation expired due to no publishing');
        
        // Handle auto release in database
        const allReservations = MistVilDatabase.get<any[]>('reservations', []);
        const updatedRes = allReservations.map(r => r.id === reservation.id ? { ...r, status: 'EXPIRED' } : r);
        MistVilDatabase.set('reservations', updatedRes);

        const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
        const updatedNovels = allNovels.map(n => n.id === novelId ? { ...n, status: 'AVAILABLE' as const, translatorId: '', translatorName: '' } : n);
        MistVilDatabase.set('novels', updatedNovels);

        setReservation(null);
        if (novel) setNovel({ ...novel, status: 'AVAILABLE', translatorId: '', translatorName: '' });
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeRemaining(`Remaining: ${days}d · ${hours}h · ${minutes}m · ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation, novel]);

  if (!novel) return null;

  const checkCanReserve = () => {
    if (currentUser.role === 'OWNER') return { allowed: true };

    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    const novelChapters = allChapters.filter(c => c.novelId === novel.id);

    // If it has chapters, it means it has been uploaded/published
    if (novelChapters.length > 0) {
      // It can only be reserved if it has been stopped for 6 months!
      const sortedChapters = [...novelChapters].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastChapter = sortedChapters[0];
      const lastChapterDate = new Date(lastChapter.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastChapterDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 180) { // 6 months is approx 180 days
        return { allowed: true, reason: 'Novel on hiatus for more than 6 months' };
      } else {
        return { 
          allowed: false, 
          reason: `This novel is active and has had chapters downloaded recently (${diffDays} days ago). Downloaded novels can never be reserved unless fully stopped for 6 months.` 
        };
      }
    }

    // If it has 0 chapters, it can be reserved ONLY if it is in the suggestions list!
    const allSuggestions = MistVilDatabase.get<Suggestion[]>('suggestions', []);
    const hasSuggestion = allSuggestions.some(s => s.titleAr === novel.titleAr || s.titleEn === novel.titleEn);
    
    if (hasSuggestion) {
      return { allowed: true, reason: 'Suggested novel' };
    } else {
      return { 
        allowed: false, 
        reason: 'This novel cannot be reserved; only novels in "Suggest a Novel" or novels whose chapters have been stopped for 6 months can be reserved.' 
      };
    }
  };

  // Claim/Reservation action handler
  const handleClaimNovel = () => {
    if (currentUser.role === 'GUEST') {
      alert('You must sign in first to reserve the novel for translation. 🌫️');
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    const check = checkCanReserve();
    if (!check.allowed) {
      alert(check.reason);
      return;
    }

    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(startAt.getDate() + 30); // 30 Days reservation limit

    const newRes = {
      id: `res-${Date.now()}`,
      novelId: novel.id,
      novelTitle: novel.titleAr,
      translatorId: currentUser.id,
      translatorName: currentUser.username,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      status: 'ACTIVE' as const,
      extensionRequested: false
    };

    // Update database
    const allReservations = MistVilDatabase.get<any[]>('reservations', []);
    MistVilDatabase.set('reservations', [...allReservations, newRes]);

    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const updatedNovels = allNovels.map(n => n.id === novel.id ? { 
      ...n, 
      status: 'RESERVED' as const, 
      translatorId: currentUser.id, 
      translatorName: currentUser.username 
    } : n);
    MistVilDatabase.set('novels', updatedNovels);

    setReservation(newRes);
    setNovel({ 
      ...novel, 
      status: 'RESERVED', 
      translatorId: currentUser.id, 
      translatorName: currentUser.username 
    });

    // Notify translator
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-${Date.now()}`,
      userId: currentUser.id,
      title: 'Novel reserved successfully!',
      message: `You reserved "${novel.titleEn || novel.titleAr}" successfully. Please publish the first chapter within 30 days to confirm translation ownership.`,
      type: 'RESERVATION',
      isRead: false,
      createdAt: 'now'
    };
    MistVilDatabase.set('notifications', [...allNotifs, newNotif]);
  };

  // Add Comment Handler
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'GUEST') {
      alert('You must sign in first to write comments. 🌫️');
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }
    if (commentText.trim() === '') return;

    // Random suffix: Date.now() alone collides when the same member posts
    // several comments quickly, making later comments seem to never appear.
    const createdAt = new Date().toISOString();
    const newComment: Comment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      refId: novel.id,
      refType: 'NOVEL',
      authorId: currentUser.id,
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
    setComments(updated.filter(c => c.refId === novel.id || chapters.some(ch => ch.id === c.refId)));
    setCommentText('');
    setIsSpoilerComment(false);
  };

  // Like comment handler
  const handleLikeComment = (commentId: string) => {
    if (currentUser.role === 'GUEST') {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }
    const allComments = MistVilDatabase.get<Comment[]>('comments', []);
    const updated = allComments.map(c => {
      if (c.id === commentId) {
        const isLiked = c.likedBy.includes(currentUser.id);
        const likedBy = isLiked ? c.likedBy.filter(id => id !== currentUser.id) : [...c.likedBy, currentUser.id];
        return { ...c, likes: isLiked ? c.likes - 1 : c.likes + 1, likedBy, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    MistVilDatabase.set('comments', updated);
    setComments(updated.filter(c => c.refId === novel.id || chapters.some(ch => ch.id === c.refId)));
  };

  // Reply to comment handler
  const handleAddReply = (commentId: string) => {
    const text = replyTexts[commentId];
    if (!text || text.trim() === '') return;
    if (currentUser.role === 'GUEST') return;

    const newReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorName: currentUser.username,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      content: text,
      createdAt: new Date().toISOString()
    };

    const allComments = MistVilDatabase.get<Comment[]>('comments', []);
    const updated = allComments.map(c => {
      if (c.id === commentId) {
        return { ...c, replies: [...(c.replies || []), newReply], updatedAt: new Date().toISOString() };
      }
      return c;
    });

    MistVilDatabase.set('comments', updated);
    setComments(updated.filter(c => c.refId === novel.id || chapters.some(ch => ch.id === c.refId)));
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
    if (!reportingComment) return;

    // Resolve Novel & Chapter names
    let novelTitle = novel?.titleAr || '';
    let chapterNumStr = '';

    const allChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);

    if (reportingComment.refType === 'CHAPTER') {
      const ch = allChapters.find(c => c.id === reportingComment.refId);
      if (ch) {
        chapterNumStr = `Chapter ${ch.number}`;
        const n = allNovels.find(nv => nv.id === ch.novelId);
        if (n) {
          novelTitle = n.titleAr;
        }
      }
    } else {
      const n = allNovels.find(nv => nv.id === reportingComment.refId);
      if (n) {
        novelTitle = n.titleAr;
      }
    }

    const newReport: Report = {
      id: 'report-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type: 'COMMENT',
      targetId: reportingComment.id,
      targetName: `${reportingComment.authorName}: ${reportingComment.content}`,
      reason: reportReason,
      details: `Novel: ${novelTitle}${chapterNumStr ? ` • ${chapterNumStr}` : ''}${reportDetails ? ` - Details: ${reportDetails}` : ''}`,
      reportedBy: currentUser.role === 'GUEST' ? 'Guest' : currentUser.username,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const reports = MistVilDatabase.get<Report[]>('reports', []);
    MistVilDatabase.set('reports', [...reports, newReport]);

    // Send a system notification immediately to the Owner
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const usersDb = MistVilDatabase.get<any[]>('users_db', []);
    // Find all owner users
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

    // Tombstone-delete so the removal propagates to every device instead of
    // being resurrected by the server-side comments merge.
    MistVilDatabase.deleteComment(commentId);
    const remaining = MistVilDatabase.get<Comment[]>('comments', []);
    if (novel) {
      setComments(remaining.filter(c => c.refId === novel.id || chapters.some(ch => ch.id === c.refId)));
    }
    alert('Comment deleted successfully.');
  };

  // Helper to apply HTML tags for rich text
  const applyFormat = (tag: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const command = tag === 'b' ? 'bold' : tag === 'i' ? 'italic' : tag === 'u' ? 'underline' : tag;
      document.execCommand(command, false);
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      handleContentChange(html);
    }
  };

  const handleContentChange = (val: string) => {
    setNewChapterContent(val);
    if (val !== contentHistory[historyIdx]) {
      const nextHistory = contentHistory.slice(0, historyIdx + 1);
      nextHistory.push(val);
      setContentHistory(nextHistory);
      setHistoryIdx(nextHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setNewChapterContent(contentHistory[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < contentHistory.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setNewChapterContent(contentHistory[nextIdx]);
    }
  };

  const insertTextAtCursor = (textToInsert: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, textToInsert);
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      handleContentChange(html);
    }
  };

  // Convert uploaded PNG/images to Base64 data urls and insert them immediately in the text content at cursor
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      if (!file.type.startsWith('image/')) {
        alert('Please select image files only (PNG, JPG, JPEG, GIF)');
        return;
      }
      
      compressImageFile(file, 1000)
        .then((base64String) => {
          // Insert clean standard <img> tag at cursor
          const imgTag = `<img src="${base64String}" />`;
          insertTextAtCursor(imgTag);
        })
        .catch(() => alert('Could not process the image. Try a smaller one.'));
    });
  };

  // Translator: Create Chapter handler
  const handleCreateChapter = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novel) {
      alert('Sorry, you must select the novel first!');
      return;
    }
    if (newChapterNumber === '') {
      alert('Sorry, the chapter number is required!');
      return;
    }
    const parsedChNum = Number(newChapterNumber);
    if (isNaN(parsedChNum) || parsedChNum <= 0) {
      alert('Sorry, the chapter number must be a whole number greater than 0!');
      return;
    }
    // Never allow two chapters of the same novel to share a number — pull the
    // freshest synced list so a chapter just published from another device
    // counts too.
    const existingChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
    const numberTaken = existingChapters.some(c => c.novelId === novel.id && !(c as any).deleted && Number(c.number) === parsedChNum);
    if (numberTaken) {
      alert(`Sorry, chapter ${parsedChNum} already exists for this novel! Pick a different number, or edit the existing chapter from the work panel.`);
      return;
    }
    if (!newChapterTitle.trim()) {
      alert('Sorry, the chapter title is required!');
      return;
    }
    if (!newChapterContent.trim() || newChapterContent.trim() === '<p><br></p>' || newChapterContent.trim() === '<br>') {
      alert('Sorry, the chapter content is required!');
      return;
    }

    if (newChapterPublishAt) {
      const publishDate = new Date(newChapterPublishAt);
      const now = new Date();
      if (publishDate < now) {
        alert('Sorry, you cannot schedule a chapter earlier than the current time!');
        return;
      }
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 2); // 2 months from now
      if (publishDate > maxDate) {
        alert('Sorry, you cannot schedule a chapter more than two months (60 days) in the future!');
        return;
      }
    }

    const newChapterNum = Number(newChapterNumber);
    const imgUrls = extractImagesFromContent(newChapterContent);

    const isScheduled = newChapterPublishAt ? new Date(newChapterPublishAt) > new Date() : false;

    const newChap: Chapter = {
      id: `${novel.id}-chap-${newChapterNum}-${Date.now()}`,
      novelId: novel.id,
      number: newChapterNum,
      chapterNumber: newChapterNum,
      title: `Chapter ${newChapterNum}: ${newChapterTitle}`,
      content: normalizeChapterText(newChapterContent),
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDraft: isScheduled,
      publishAt: newChapterPublishAt || undefined,
      images: imgUrls.length > 0 ? imgUrls : undefined
    } as any;

    // Update database
    const allChapters = MistVilDatabase.get<Chapter[]>('chapters', []);
    const updatedChaps = [...allChapters, newChap];
    MistVilDatabase.set('chapters', updatedChaps);
    const novelChaps = updatedChaps.filter(c => c.novelId === novel.id).sort((a, b) => a.number - b.number);
    setChapters(novelChaps);
    setNewChapterNumber('');

    // If this novel was in a reserved state and this is Chapter 1, promote status to TRANSLATING
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    let newStatus = novel.status;
    let updatedReservations = MistVilDatabase.get<any[]>('reservations', []);
    
    if (novel.status === 'RESERVED' && novel.translatorId === currentUser.id) {
      newStatus = 'TRANSLATING';
      // Mark reservation as completed
      updatedReservations = updatedReservations.map(r => 
        (r.novelId === novel.id && r.status === 'ACTIVE') ? { ...r, status: 'COMPLETED' } : r
      );
      MistVilDatabase.set('reservations', updatedReservations);
      setReservation(null);
    }

    const updatedNovels = allNovels.map(n => n.id === novel.id ? { 
      ...n, 
      chaptersCount: n.chaptersCount + 1,
      status: newStatus 
    } : n);
    MistVilDatabase.set('novels', updatedNovels);
    setNovel({ ...novel, chaptersCount: novel.chaptersCount + 1, status: newStatus });

    // Scheduled chapters stay private until their publish time: no public
    // "new chapter" announcement now — checkScheduledChapters() sends it when
    // the scheduled date/time actually arrives. The creator only gets a
    // private confirmation that the chapter is scheduled.
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = isScheduled
      ? {
          id: `notif-${Date.now()}`,
          userId: currentUser.id,
          title: '📅 Chapter scheduled successfully',
          message: `Chapter ${newChapterNum} of "${novel.titleEn || novel.titleAr}" has been scheduled and will publish automatically for readers on ${new Date(newChapterPublishAt).toLocaleString('en-US')}. It now appears in the Activity & Scheduling page as scheduled to publish.`,
          type: 'CHAPTER' as const,
          isRead: false,
          createdAt: 'now',
          novelId: novel.id,
          chapterId: newChap.id
        }
      : {
          id: `notif-${Date.now()}`,
          userId: currentUser.id,
          title: 'New chapter released!',
          message: `Chapter ${newChapterNum} of "${novel.titleEn || novel.titleAr}" was published successfully.`,
          type: 'CHAPTER' as const,
          isRead: false,
          createdAt: 'now',
          novelId: novel.id,
          chapterId: newChap.id
        };
    const updatedNotifs = [...allNotifs, newNotif];
    // Announce the new chapter to everyone who bookmarked this novel: a
    // shared notification (no userId) tagged forBookmarkers, which each
    // member's device shows only when the novel is in their own bookmarks.
    if (!isScheduled) {
      updatedNotifs.push({
        id: `notif-chapter-live-${Date.now()}-${newChap.id}`,
        title: 'New chapter released! 📚',
        message: `A new chapter of "${novel.titleEn || novel.titleAr}" has been published — read it now!`,
        type: 'CHAPTER' as const,
        isRead: false,
        createdAt: new Date().toISOString(),
        novelId: novel.id,
        chapterId: newChap.id,
        forBookmarkers: true
      } as any);
    }
    MistVilDatabase.set('notifications', updatedNotifs);

    if (isScheduled) {
      alert(`📅 Chapter ${newChapterNum} scheduled successfully! It won't appear to readers until ${new Date(newChapterPublishAt).toLocaleString('en-US')}, and you can track it from the Activity & Scheduling page.`);
    } else {
      alert(`Chapter ${newChapterNum} published successfully and is now available to all readers! 🎉`);
    }

    setShowAddChapterForm(false);
    setNewChapterTitle('');
    setNewChapterContent('');
    setNewChapterImages('');
    setNewChapterPublishAt('');
    setNewChapterNumber('');
  };

  const isOwner = currentUser.role === 'OWNER' || currentUser.email?.toLowerCase() === 'mistvil112@gmail.com';
  const isTranslatorOrOwner = isOwner || (novel && novel.translatorId === currentUser.id);

  // Download the novel's published chapters as a single .txt file. The file is
  // always named with the ENGLISH title (never the Arabic one); the Arabic
  // title is only used as a fallback when no English title exists.
  const handleDownloadNovel = () => {
    if (!novel) return;
    const published = chapters
      .filter(c => !c.publishAt || new Date(c.publishAt).getTime() <= Date.now())
      .slice()
      .sort((a, b) => a.number - b.number);
    if (published.length === 0) {
      alert('There are no published chapters to download yet.');
      return;
    }

    const englishName = (novel.titleEn && novel.titleEn.trim()) ? novel.titleEn.trim() : (novel.titleAr || 'novel');
    const header = `${englishName}\nAuthor: ${novel.author || 'Unknown'}\nTranslator: ${novel.translatorName || 'None'}\n© MistVil\n`;
    const body = published
      .map(ch => {
        const title = ch.title.includes(':') ? ch.title.split(':').slice(1).join(':').trim() : ch.title;
        return `\n\n==============================\nChapter ${ch.number}: ${title || 'Translated chapter'}\n==============================\n\n${normalizeChapterText(ch.content || '')}`;
      })
      .join('');

    // Filesystem-safe file name derived from the English title only.
    const safeName = englishName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'novel';
    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteNovel = () => {
    if (!novel) return;

    showConfirm(
      'Permanently delete novel ⚠️ (confirm 1/2)',
      `Are you absolutely and definitively sure you want to permanently delete "${novel.titleEn || novel.titleAr}" from the entire site along with all its chapters and comments?`,
      () => {
        setTimeout(() => {
          showConfirm(
            'Permanently delete novel ⚠️ (final confirm 2/2)',
            `Final, definitive confirmation: are you absolutely sure you want to delete "${novel.titleEn || novel.titleAr}" and all its chapters, comments, and data forever? This action cannot be undone under any circumstances!`,
            () => {
              // Tombstone-delete so the removal propagates through the
              // server-side novels merge instead of being resurrected (or
              // wiping unrelated novels) by stale devices.
              MistVilDatabase.deleteNovels([novel.id]);

              const allChapters = MistVilDatabase.get<any[]>('chapters', []);
              const deletedChaptersList = allChapters.filter(c => c.novelId === novel.id);
              const deletedChapterIds = deletedChaptersList.map(c => c.id);
              // Tombstone-delete so the removal propagates through the
              // server-side chapters merge instead of being resurrected (or
              // wiping unrelated chapters) by stale devices.
              MistVilDatabase.deleteChapters(deletedChapterIds);

              const allReservations = MistVilDatabase.get<any[]>('reservations', []);
              const updatedReservations = allReservations.filter(r => r.novelId !== novel.id);
              MistVilDatabase.set('reservations', updatedReservations);

              // Delete comments associated with novel or its chapters
              const allComments = MistVilDatabase.get<any[]>('comments', []);
              const updatedComments = allComments.filter(c => c.refId !== novel.id && !deletedChapterIds.includes(c.refId));
              MistVilDatabase.set('comments', updatedComments);

              // Delete reviews
              const allReviews = MistVilDatabase.get<any[]>('reviews', []);
              const updatedReviews = allReviews.filter(r => r.novelId !== novel.id);
              MistVilDatabase.set('reviews', updatedReviews);

              // Delete bookmarks
              const allBookmarks = MistVilDatabase.get<string[]>('bookmarks', []);
              const updatedBookmarks = allBookmarks.filter(id => id !== novel.id);
              MistVilDatabase.set('bookmarks', updatedBookmarks);

              // Delete reading history
              const allHistory = MistVilDatabase.get<any[]>('reading_history', []);
              const updatedHistory = allHistory.filter(h => h.novelId !== novel.id);
              MistVilDatabase.set('reading_history', updatedHistory);

              // Delete from deleted_chapters
              const allDeletedChapters = MistVilDatabase.get<any[]>('deleted_chapters', []);
              const updatedDeletedChapters = allDeletedChapters.filter(c => c.novelId !== novel.id);
              MistVilDatabase.set('deleted_chapters', updatedDeletedChapters);

              window.dispatchEvent(new Event('novels-updated'));
              alert(`"${novel.titleEn || novel.titleAr}" was deleted successfully along with all its chapters and data!`);
              onBack();
            },
            true
          );
        }, 100);
      },
      true
    );
  };

  const handleDeleteChapterByOwner = (chapterId: string, chapterNumber: number) => {
    if (currentUser.role !== 'OWNER' && currentUser.email?.toLowerCase() !== 'mistvil112@gmail.com') {
      alert('Sorry, this permission is reserved for the site owner only!');
      return;
    }

    showConfirm(
      'Permanently delete chapter ⚠️ (confirm 1/2)',
      `Are you sure you want to delete chapter ${chapterNumber}? It will be fully removed along with all its comments.`,
      () => {
        setTimeout(() => {
          showConfirm(
            'Permanently delete chapter ⚠️ (final confirm 2/2)',
            `Final, definitive confirmation: are you absolutely sure you want to permanently delete chapter ${chapterNumber} and all its comments? This action can never be undone!`,
            () => {
              // Delete from active chapters (tombstone so the deletion
              // survives the server-side chapters merge on every device)
              const allChapters = MistVilDatabase.get<any[]>('chapters', []);
              const remainingChapters = allChapters.filter(c => c.id !== chapterId);
              MistVilDatabase.deleteChapters([chapterId]);

              // Filter local state
              setChapters(prev => prev.filter(c => c.id !== chapterId));

              // Delete comments associated with this chapter
              const allComments = MistVilDatabase.get<any[]>('comments', []);
              const remainingComments = allComments.filter(c => c.refId !== chapterId);
              MistVilDatabase.set('comments', remainingComments);

              // Reduce chaptersCount of the novel
              if (novel) {
                const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
                const actualCount = remainingChapters.filter(c => c.novelId === novel.id).length;
                const updatedNovels = allNovels.map(n => {
                  if (n.id === novel.id) {
                    return { ...n, chaptersCount: actualCount };
                  }
                  return n;
                });
                MistVilDatabase.set('novels', updatedNovels);
                setNovel(prev => prev ? { ...prev, chaptersCount: actualCount } : null);
              }

              alert(`Chapter ${chapterNumber} was deleted successfully along with all its comments! 🗑️`);
              window.dispatchEvent(new Event('novels-updated'));
            },
            true
          );
        }, 100);
      },
      true
    );
  };

  if (showAddChapterForm && novel) {
    return (
      <form onSubmit={handleCreateChapter} className="w-full text-left pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Section Title with File Icon and Cancel Button */}
        <div className="flex items-center justify-between mb-8">
          <button 
            type="button"
            onClick={() => setShowAddChapterForm(false)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>✕ Cancel and back to novel</span>
          </button>
          <div className="flex items-center gap-3 justify-start">
            <h2 className="text-xl font-extrabold text-white text-left">Add a new chapter</h2>
            <div className="p-2.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl">
              <FileText size={20} />
            </div>
          </div>
        </div>

        {/* 1. Novel selector/display */}
        <div className="flex flex-col gap-1.5 text-left w-full mb-4">
          <div className="relative w-full">
            <div className="w-full bg-[#0F1828] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3.5 text-xs text-purple-300 text-left flex justify-between items-center select-none cursor-default">
              <ChevronDown size={14} className="text-purple-400" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{novel.titleAr}</span>
                <span className="text-purple-400">Novel</span>
                <BookOpen size={14} className="text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Chapter Number */}
        <div className="flex flex-col gap-1 w-full mb-4 text-left">
          <div className="flex justify-start items-center mb-1 text-[11px] text-purple-400">
            <span>Chapter number</span>
          </div>
          <input 
            type="number"
            required
            min="1"
            placeholder="e.g. 5"
            value={newChapterNumber}
            onChange={(e) => setNewChapterNumber(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-[#0F1828] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3.5 text-xs text-white text-left outline-none focus:border-violet-500 font-sans placeholder-purple-300/40 font-mono"
          />
        </div>

        {/* 3. Chapter Title */}
        <div className="flex flex-col gap-1 w-full mb-4 relative text-left">
          <div className="flex justify-between items-center mb-1 text-[11px] text-purple-400">
            <span>100 / {newChapterTitle.length}</span>
            <span>Chapter title</span>
          </div>
          <input 
            type="text"
            required
            maxLength={100}
            placeholder="Chapter title"
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
            className="w-full bg-[#0F1828] border border-white/5 hover:border-white/10 rounded-xl px-4 py-3.5 text-xs text-white text-left outline-none focus:border-violet-500 font-sans placeholder-purple-300/40"
          />
        </div>

        {/* 4. Rich Chapter Content Editor */}
        <div className="flex flex-col border border-white/5 hover:border-white/10 bg-[#0F1828] rounded-xl overflow-hidden mb-3">
          {/* Editor Toolbar */}
          <div className="flex justify-between items-center px-4 py-3 bg-[#121E33] border-b border-white/5 select-none">
            {/* Left toolbar options: Undo/Redo */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUndo}
                className="p-1.5 hover:bg-white/5 rounded-lg text-purple-400 hover:text-white transition-all cursor-pointer"
                title="Undo"
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                className="p-1.5 hover:bg-white/5 rounded-lg text-purple-400 hover:text-white transition-all cursor-pointer"
                title="Redo"
              >
                <Redo2 size={16} />
              </button>
            </div>

            {/* Right toolbar options: Bold, Italic, Underline, Image */}
            <div className="flex gap-3 items-center font-bold">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('png-uploader')?.click();
                }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-purple-400 hover:text-white transition-all cursor-pointer"
                title="Insert images & illustrations"
              >
                <Image size={16} />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('u')}
                className="p-1.5 hover:bg-white/5 rounded-lg text-purple-400 hover:text-white font-bold transition-all cursor-pointer"
                title="Underline"
              >
                <u>U</u>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('i')}
                className="p-1.5 hover:bg-white/5 rounded-lg text-purple-400 hover:text-white italic font-bold transition-all cursor-pointer"
                title="Italic"
              >
                <i>I</i>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('b')}
                className="p-1.5 hover:bg-white/5 rounded-lg text-purple-400 hover:text-white font-bold transition-all cursor-pointer"
                title="Bold"
              >
                <b>B</b>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div 
            ref={editorRef}
            id="chapter-content-textarea"
            contentEditable
            onInput={handleEditorInput}
            onPaste={handleEditorPaste}
            placeholder="Chapter content"
            className="w-full bg-[#0F1828] px-5 py-4 text-base leading-8 text-white text-left outline-none font-sans min-h-[50vh] overflow-y-auto placeholder-purple-300/40 border border-white/5 rounded-xl empty:before:content-[attr(placeholder)] empty:before:text-purple-300/40 empty:before:pointer-events-none focus:border-violet-500 transition-all [&_img]:max-h-[750px] [&_img]:w-full [&_img]:max-w-[700px] [&_img]:my-6 [&_img]:mx-auto [&_img]:rounded-2xl [&_img]:shadow-[0_10px_35px_rgba(0,0,0,0.6)] [&_img]:border [&_img]:border-white/10 [&_img]:block [&_img]:object-contain [&_img]:bg-black/30 [&_img]:p-1.5 hover:[&_img]:border-violet-500/40 hover:[&_img]:scale-[1.01] [&_img]:transition-all [&_img]:duration-300"
          />
        </div>

        <input 
          type="file" 
          id="png-uploader"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* 7. Publishing Date selectors */}
        <div className="flex flex-col gap-2.5 text-left mb-8">
          <label className="text-xs font-bold text-purple-200">Publish date</label>
          <div className="flex gap-6 justify-start items-center">
            {/* Option 2: Schedule */}
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <span className="text-xs text-purple-300 group-hover:text-white transition-colors">Schedule</span>
              <input 
                type="radio"
                name="publishing-time"
                checked={publishTimeType === 'schedule'}
                onChange={() => setPublishTimeType('schedule')}
                className="w-4 h-4 accent-violet-500 cursor-pointer"
              />
            </label>

            {/* Option 1: Now */}
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <span className="text-xs text-purple-300 group-hover:text-white transition-colors">Now</span>
              <input 
                type="radio"
                name="publishing-time"
                checked={publishTimeType === 'now'}
                onChange={() => {
                  setPublishTimeType('now');
                  setNewChapterPublishAt('');
                }}
                className="w-4 h-4 accent-violet-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Conditional Date-time Input with smooth collapse/fade */}
          {publishTimeType === 'schedule' && (
            <div className="mt-2.5 p-4 rounded-xl bg-[#0F1828] border border-white/5 animate-in slide-in-from-top-2 duration-200 text-left">
              <input 
                type="datetime-local"
                lang="en"
                value={newChapterPublishAt}
                onChange={(e) => setNewChapterPublishAt(e.target.value)}
                min={getMinScheduleDate()}
                max={getMaxScheduleDate()}
                className="w-full bg-[#131F33] border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-violet-500 text-white font-mono text-left"
              />
              <span className="text-[10px] text-purple-400/80 mt-1.5 block">Pick the date and time for automatic publishing. The chapter stays scheduled and unavailable to read before then.</span>
            </div>
          )}
        </div>

        {/* 8. Large blue Add/Submit Button */}
        <div className="w-full">
          <button 
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-500 hover:to-violet-400 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2"
          >
            <span>Add</span>
          </button>
        </div>

      </form>
    );
  }

  return (
    <div className="w-full text-left mt-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Back button */}
      <button 
        onClick={onBack}
        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-purple-300 hover:text-white transition-all text-xs font-bold mb-6 flex items-center gap-2 mr-auto cursor-pointer"
      >
        <span>← Back to library</span>
      </button>

      {/* Novel Profile Banner Area */}
      <div className="relative w-full rounded-3xl overflow-hidden glass-panel border border-white/5 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start select-none">
        <div 
          className="absolute inset-0 bg-cover bg-center -z-10 opacity-10 filter blur-2xl scale-110"
          style={{ backgroundImage: `url(${novel.cover})` }}
        />

        {/* Cover image wrapper */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="relative w-48 h-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img src={novel.cover} alt={novel.titleAr} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          {isTranslatorOrOwner && (
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  
                  const extension = file.name.split('.').pop()?.toLowerCase();
                  const allowed = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
                  if (!extension || !allowed.includes(extension)) {
                    alert('Sorry, the file must be PNG, JPG, JPEG, or WEBP for premium display quality!');
                    return;
                  }
                  
                  compressImageFile(file, 600).then((base64String) => {
                    // Update in database
                    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
                    const updatedNovels = allNovels.map(n => n.id === novel.id ? { ...n, cover: base64String } : n);
                    const savedOk = MistVilDatabase.set('novels', updatedNovels);
                    if (!savedOk) {
                      alert('Could not save the cover: storage is full. Try a smaller image.');
                      return;
                    }
                    // Update local state
                    setNovel({ ...novel, cover: base64String });
                    alert('Novel cover updated successfully with the attached image! 🎉');
                    // Trigger event so any other components update if listening
                    window.dispatchEvent(new Event('novels-updated'));
                  }).catch(() => alert('Could not process the cover image. Try a smaller one.'));
                };
                input.click();
              }}
              className="w-full py-2 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-violet-500/5"
            >
              <Image size={12} />
              <span>Change novel cover 🎨</span>
            </button>
          )}
        </div>

        {/* Right Info pane */}
        <div className="flex-1 w-full min-w-0 flex flex-col justify-between h-full">
          <div>
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-600/10 border border-violet-600/30 text-violet-300">
                {novel.language}
              </span>
              {novel.teamName && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 border border-sky-500/30 text-sky-300">
                  Team: {novel.teamName}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
              {novel.titleEn || novel.titleAr}
            </h1>
            <h3 className="text-sm text-purple-300 font-semibold mt-1">
              {novel.titleAr && novel.titleAr !== novel.titleEn ? novel.titleAr : ''} {novel.titleOriginal ? `| ${novel.titleOriginal}` : ''}
            </h3>

            <p className="text-xs text-purple-400 mt-2 flex items-center gap-1.5 flex-wrap justify-start md:justify-start">
              <span>Original author: <strong className="text-purple-200 font-bold">{novel.author}</strong></span>
              <span>|</span>
              <span className="flex items-center gap-1.5">
                Current translator: <strong className="text-rose-300 font-bold">{novel.translatorName || 'None'}</strong>
                {novel.translatorName && isUserTranslatorOfTheMonth(novel.translatorName) && (
                  <span className="inline-flex items-center gap-0.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                    🏆 Translator of the Month
                  </span>
                )}
              </span>
            </p>

            {/* Genres list */}
            <div className="flex flex-wrap gap-2 mt-4">
              {novel.genres.map(genre => (
                <span key={genre} className="text-xs bg-white/5 border border-white/5 text-purple-300 px-3 py-1 rounded-xl font-bold">
                  {genre}
                </span>
              ))}
            </div>

            {/* Synopsis directly under genres */}
            <div className="mt-4 text-xs text-purple-200 leading-relaxed text-left bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="font-bold text-violet-300 block mb-1.5">Story & synopsis:</span>
              <p className="whitespace-pre-wrap">{novel.description}</p>
            </div>
          </div>

          {/* Core novel statistics */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <span className="text-xs text-purple-400 block mb-1">Views</span>
              <span className="font-bold text-white text-base">{(novel.views).toLocaleString('ar-EG', { numberingSystem: 'latn' })}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <span className="text-xs text-purple-400 block mb-1">Chapters</span>
              <span className="font-bold text-white text-base">{chapters.length}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <span className="text-xs text-purple-400 block mb-1">Bookmarks</span>
              <span className="font-bold text-white text-base">{(novel.bookmarksCount).toLocaleString('ar-EG', { numberingSystem: 'latn' })}</span>
            </div>
          </div>

          {/* Interactive Actions Pane */}
          <div className="flex flex-wrap gap-3 mt-6">
            {chapters.length > 0 ? (
              <button 
                onClick={() => onReadChapter(novel.id, 1)}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-violet-500/10 cursor-pointer"
              >
                <span>Start reading</span>
              </button>
            ) : (
              <button 
                disabled
                className="px-6 py-3 bg-white/10 text-purple-400 font-bold rounded-xl text-xs cursor-not-allowed"
              >
                <span>Coming soon (no chapters)</span>
              </button>
            )}

            {/* Bookmark button */}
            <button
              onClick={() => onBookmarkToggle(novel.id)}
              className={`px-5 py-3 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${isBookmarked ? 'bg-rose-600/20 border-rose-500/40 text-rose-300' : 'bg-white/5 border-white/10 text-purple-300 hover:bg-white/10'}`}
            >
              <Heart size={14} className={isBookmarked ? 'fill-rose-500 text-rose-500 animate-pulse' : ''} />
              <span>{isBookmarked ? 'Bookmarked' : 'Add bookmark'}</span>
            </button>

            {/* Special Request Claim/Reservation trigger */}
            {novel.status === 'AVAILABLE' && (currentUser.role === 'TRANSLATOR' || currentUser.role === 'OWNER') && (
              (() => {
                const check = checkCanReserve();
                if (check.allowed) {
                  return (
                    <button 
                      onClick={handleClaimNovel}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-violet-500/15 cursor-pointer"
                    >
                      <span>Request to reserve this novel 📝</span>
                    </button>
                  );
                } else {
                  return (
                    <button 
                      disabled
                      title={check.reason}
                      onClick={() => alert(check.reason)}
                      className="px-6 py-3 bg-white/5 border border-white/5 text-purple-500 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center gap-1.5"
                    >
                      <span>🔒 Reservation closed</span>
                    </button>
                  );
                }
              })()
            )}

            {/* Download button — only when the owner has enabled downloads for
                this novel. The saved file is named with the English title. */}
            {novel.downloadAllowed && chapters.length > 0 && (
              <button
                onClick={handleDownloadNovel}
                className="px-5 py-3 bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                title="Download the published chapters as a text file (named with the English title)"
              >
                <Download size={14} />
                <span>Download novel</span>
              </button>
            )}

            {/* Owner Delete button */}
            {isOwner && (
              <button
                onClick={handleDeleteNovel}
                className="px-5 py-3 bg-red-600/25 hover:bg-red-600 hover:text-white text-red-200 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-red-500/10 transition-all duration-300"
                title="Permanently delete novel from the site"
              >
                <Trash2 size={14} />
                <span>Delete novel 🗑️</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Translator & Owner: Edit Novel Status Panel */}
      {(currentUser.id === novel.translatorId || isOwner) && novel.status !== 'PENDING' && (
        <div className="w-full mt-4 p-4 rounded-2xl bg-[#131F33] border border-violet-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-left">
            <Edit2 size={16} className="text-violet-400" />
            <span className="text-purple-200">Admin controls: update the current novel status:</span>
            <span className="font-extrabold text-violet-300">
              {novel.status === 'ONGOING' || novel.status === 'TRANSLATING' || novel.status === 'AVAILABLE' ? 'Ongoing' :
               novel.status === 'HIATUS' ? 'On hiatus' :
               novel.status === 'CANCELLED' ? 'Dropped' :
               novel.status === 'COMPLETED' ? 'Completed' : novel.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400">Change to:</span>
            <select
              value={novel.status === 'TRANSLATING' || novel.status === 'AVAILABLE' ? 'ONGOING' : novel.status}
              onChange={(e) => {
                const newStatus = e.target.value;
                let reason = '';
                const statusNames: Record<string, string> = {
                  ONGOING: 'Ongoing',
                  HIATUS: 'On hiatus',
                  CANCELLED: 'Dropped',
                  COMPLETED: 'Completed'
                };

                if (newStatus === 'HIATUS' || newStatus === 'CANCELLED') {
                  const promptMsg = newStatus === 'HIATUS' 
                    ? 'Please enter the reason for the hiatus (it will reach the site owner):' 
                    : 'Please enter the reason for dropping it (it will reach the site owner):';
                  reason = prompt(promptMsg) || '';
                  if (!reason.trim()) {
                    alert('You must provide a reason to change the status to stopped!');
                    return;
                  }
                }

                const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
                const updated = allNovels.map(n => {
                  if (n.id === novel.id) {
                    return { ...n, status: newStatus as any, statusChangeReason: reason || undefined };
                  }
                  return n;
                });
                MistVilDatabase.set('novels', updated);
                setNovel({ ...novel, status: newStatus as any });

                // Send Admin Notification to owner
                const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
                const newNotif = {
                  id: `notif-status-${Date.now()}`,
                  userId: 'mistvil-owner',
                  title: `Novel status change: ${novel.titleEn || novel.titleAr}`,
                  message: `Translator "${currentUser.username}" changed the status of "${novel.titleEn || novel.titleAr}" to (${statusNames[newStatus]}). ${reason ? `Reason: ${reason}` : ''}`,
                  type: 'SYSTEM',
                  isRead: false,
                  createdAt: new Date().toISOString()
                };
                MistVilDatabase.set('notifications', [newNotif, ...allNotifs]);

                alert(`Novel status changed to (${statusNames[newStatus]}) successfully.`);
                window.dispatchEvent(new Event('novels-updated'));
              }}
              className="bg-[#0F1828] text-purple-200 border border-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer text-xs focus:border-violet-500"
            >
              <option value="ONGOING">Ongoing</option>
              <option value="HIATUS">On hiatus</option>
              <option value="CANCELLED">Dropped</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      )}

      {/* Live Reservation Countdown Banner if reserved */}
      {reservation && (
        <div className="w-full mt-4 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock size={16} className="animate-spin-slow text-yellow-400" />
            <span>Novel reserved for translation by: <span className="font-extrabold text-white">{reservation.translatorName}</span></span>
          </div>
          <span className="font-bold tracking-wide bg-yellow-500/10 px-3 py-1 rounded-full text-xs">
            {timeRemaining || 'Loading countdown...'}
          </span>
        </div>
      )}

      {/* Main Tab Area */}
      <div className="w-full mt-8">
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-white/5 mb-6 text-sm font-semibold text-purple-300/80 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('chapters')}
            className={`pb-3 px-6 relative transition-colors ${activeTab === 'chapters' ? 'text-white' : 'hover:text-white'}`}
          >
            <span>Chapters ({chapters.length})</span>
            {activeTab === 'chapters' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('comments')}
            className={`pb-3 px-6 relative transition-colors ${activeTab === 'comments' ? 'text-white' : 'hover:text-white'}`}
          >
            <span>Comments ({comments.length})</span>
            {activeTab === 'comments' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
          </button>
        </div>

        {/* Tab Panel contents */}
        <div className="w-full">

          {/* TAB 2: Chapters List */}
          {activeTab === 'chapters' && (
            <div className="flex flex-col gap-4">
              {/* Toolbar */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-xs text-purple-300 font-semibold">Total published chapters: {chapters.length}</span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Ascending / descending chapter order toggle */}
                  {chapters.length > 0 && (
                    <button
                      onClick={() => setChaptersAscending(prev => !prev)}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Toggle chapter order"
                    >
                      {chaptersAscending
                        ? <><ArrowUp size={14} className="text-violet-300" /><span>Ascending (oldest first)</span></>
                        : <><ArrowDown size={14} className="text-violet-300" /><span>Descending (newest first)</span></>}
                    </button>
                  )}

                  {/* Show Add Chapter trigger for OWNER, TRANSLATOR, or WRITER */}
                  {(currentUser.role === 'OWNER' || currentUser.role === 'TRANSLATOR' || currentUser.role === 'WRITER') && (
                    <button
                      onClick={() => {
                        setShowAddChapterForm(!showAddChapterForm);
                        setNewChapterNumber('');
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-500/10"
                    >
                      <Plus size={14} />
                      <span>Add a new chapter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Chapters (ordered by the ascending/descending toggle) */}
              {chapters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...chapters].sort((a, b) => chaptersAscending ? a.number - b.number : b.number - a.number).map((chapter) => {
                    const isRead = readChapters.some(rc => rc.novelId === novel.id && rc.chapterNumber === chapter.number);
                    return (
                      <div
                        key={chapter.id}
                        onClick={() => onReadChapter(novel.id, chapter.number)}
                        className={`group p-4 rounded-2xl flex items-center justify-between gap-2 cursor-pointer transition-all text-left border ${
                          isRead
                            ? 'bg-violet-900/15 border-violet-500/40 hover:bg-violet-900/25 hover:border-violet-400'
                            : 'bg-[#131F33] border-white/5 hover:border-violet-500/20 hover:bg-violet-950/5'
                        }`}
                      >
                        <div className="min-w-0">
                          <h4 className={`font-bold text-xs transition-colors truncate ${isRead ? 'text-violet-300 group-hover:text-violet-200' : 'text-purple-100 group-hover:text-violet-400'}`}>
                            Chapter {chapter.number}: {chapter.title.split(':').slice(1).join(':').trim() || 'Translated chapter'}
                            {isRead && (
                              <span className="mr-2 text-[9px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-normal">
                                Read ✔️
                              </span>
                            )}
                          </h4>
                          <span className={`text-[10px] mt-1 block ${isRead ? 'text-violet-400/80' : 'text-purple-400'}`}>
                            Published: {new Date(chapter.createdAt).toLocaleDateString('en-US')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {currentUser.role === 'OWNER' && (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteChapterByOwner(chapter.id, chapter.number); 
                              }}
                              className="p-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition-all cursor-pointer"
                              title={`Permanently delete chapter ${chapter.number}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                            isRead
                              ? 'bg-violet-500/20 text-violet-300 group-hover:bg-violet-600 group-hover:text-white'
                              : 'bg-white/5 text-purple-300 group-hover:bg-violet-600 group-hover:text-white'
                          }`}>
                            {isRead ? 'Read again →' : 'Read chapter →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 text-purple-400">
                  <p className="text-sm font-semibold">There are no published chapters for this novel yet.</p>
                  <p className="text-xs text-purple-400 mt-1">If you are the translator, click "Add a new chapter" to start translating.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Comments System */}
          {activeTab === 'comments' && (
            <div className="flex flex-col gap-6">
              {/* Policy alert enforcement */}
              <div className="p-3 bg-violet-600/5 border border-violet-500/20 rounded-2xl text-left flex items-start gap-2.5">
                <span className="text-sm">⚠️</span>
                <div>
                  <span className="text-[10px] font-extrabold text-violet-400 block mb-0.5 font-sans">Platform interaction policy & rules</span>
                  <p className="text-[10px] text-purple-300 leading-relaxed">
                    Please respect all other readers and translators. Offensive or abusive language is strictly prohibited, as is stealing translators' work and crediting it elsewhere. Violating accounts face immediate direct bans.
                  </p>
                </div>
              </div>

              {/* Form to submit comment */}
              <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={currentUser.role === 'GUEST' ? 'Sign in to comment on this novel... 🌫️' : 'Write your comment about this novel here...'}
                    readOnly={currentUser.role === 'GUEST'}
                    onClick={() => {
                      if (currentUser.role === 'GUEST') window.dispatchEvent(new Event('open-login-modal'));
                    }}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 min-w-0 bg-[#131F33] border border-white/5 focus:border-violet-500 outline-none rounded-2xl px-4 py-3.5 text-white placeholder-purple-300/40 text-xs text-left transition-all"
                  />
                  <button
                    type="submit"
                    className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-2xl text-xs font-bold shadow-lg transition-all cursor-pointer shrink-0"
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
                    <div key={comment.id} className="p-4 bg-[#131F33]/60 border border-white/5 rounded-2xl text-left flex flex-col gap-3">
                      
                      {/* Comment Header */}
                      <div className="flex items-center gap-3">
                        <img src={comment.authorAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=user'} alt={comment.authorName} className="w-9 h-9 rounded-full border border-violet-500/20" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{comment.authorName}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold">
                              {comment.authorRole === 'OWNER' ? 'Owner 👑' : comment.authorRole === 'TRANSLATOR' ? 'Translator ✍️' : 'Member 👤'}
                            </span>
                            {isUserTranslatorOfTheMonth(comment.authorName) && (
                              <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-bold flex items-center gap-0.5">
                                🏆 Translator of the Month
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-purple-400 mt-0.5 block">{new Date(comment.createdAt).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</span>
                        </div>
                      </div>

                      {/* Comment Content */}
                      {comment.isSpoiler && !revealedSpoilers.includes(comment.id) ? (
                        <div className="pr-12">
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
                        <div className="pr-12">
                          {comment.isSpoiler && (
                            <span className="text-[10px] text-red-400 font-extrabold bg-red-500/10 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 mb-2 select-none">
                              🔥 Spoiler comment (revealed):
                            </span>
                          )}
                          <p className={`text-xs text-purple-200 leading-relaxed ${comment.isSpoiler ? 'border-r-2 border-red-500/40 pr-3 font-sans' : ''}`}>
                            {comment.content}
                          </p>
                        </div>
                      )}

                      {/* Comment Actions (Like / Reply triggers) */}
                      <div className="flex items-center gap-4 pr-12 text-[10px] text-purple-400">
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
                          className="hover:text-white transition-colors cursor-pointer"
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
                        <div className="mr-12 mt-2 flex flex-col gap-3 border-r border-white/5 pr-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="p-3 bg-white/5 rounded-xl flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <img src={reply.authorAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=reply'} alt={reply.authorName} className="w-6 h-6 rounded-full border border-white/10" />
                                <span className="font-bold text-[11px] text-white">{reply.authorName}</span>
                                <span className="text-[8px] px-1 bg-violet-500/20 text-violet-300 rounded-full">{reply.authorRole}</span>
                              </div>
                              <p className="text-xs text-purple-300 leading-relaxed">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply field active */}
                      {activeReplyId === comment.id && (
                        <div className="mr-12 mt-2 flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Write your kind reply..."
                            value={replyTexts[comment.id] || ''}
                            onChange={(e) => setReplyTexts({ ...replyTexts, [comment.id]: e.target.value })}
                            className="flex-1 bg-white/5 border border-white/5 focus:border-violet-500 outline-none rounded-xl px-3 py-2 text-white text-xs"
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
                  <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 text-purple-400">
                    <p className="text-sm">No comments yet. Be the first to leave an enthusiastic comment!</p>
                  </div>
                )}
              </div>
            </div>
          )}

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

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        danger={confirmConfig.danger}
      />

    </div>
  );
}
