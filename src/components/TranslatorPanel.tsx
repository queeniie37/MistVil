import React, { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle, Flame, Clock, Award, Check, Layers, AlertCircle, Edit, Trash2, Calendar, BookOpen, Eye, RefreshCw, Upload, Image } from 'lucide-react';
import { Novel, Suggestion, Reservation, User } from '../types';
import { MistVilDatabase, COVER_IMAGES } from '../data';
import { compressImageFile } from '../utils/media';
import { normalizeChapterText } from '../utils/text';
import { getTranslatorPoints, getAllTranslatorsPoints, isUserTranslatorOfTheMonth, getCurrentMonthKey } from '../utils/points';
import ConfirmModal from './ConfirmModal';

interface TranslatorPanelProps {
  currentUser: User;
  onNavigate: (page: string, params?: any) => void;
}

export default function TranslatorPanel({ currentUser, onNavigate }: TranslatorPanelProps) {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<'novels' | 'claims' | 'reservations' | 'add-novel' | 'activity' | 'deleted-chapters' | 'edit-requests' | 'points'>('novels');
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
  
  // Create novel form
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [author, setAuthor] = useState('');
  const [lang, setLang] = useState('Korean');
  const [desc, setDesc] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [success, setSuccess] = useState('');

  // Enhanced activity & archive states
  const [chapters, setChapters] = useState<any[]>([]);
  const [deletedChapters, setDeletedChapters] = useState<any[]>([]);

  // Editing chapter states
  const [editingChapter, setEditingChapter] = useState<any | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editChapterContent, setEditChapterContent] = useState('');
  const [editChapterPublishAt, setEditChapterPublishAt] = useState('');
  const [editChapterImages, setEditChapterImages] = useState('');

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

  const genresOptions = ['Action', 'Fantasy', 'Adventure', 'Thriller', 'System', 'Isekai', 'Murim', 'Drama', 'Mystery', 'Romance', 'Comedy', 'Regression', 'Music'];

  const loadChaptersAndDeleted = () => {
    // 1. Load active chapters
    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    const allNovels = MistVilDatabase.get<any[]>('novels', []);
    
    // We only want chapters of novels translated/written by this user (or all if OWNER)
    const userNovelIds = allNovels
      .filter(n => n.translatorId === currentUser.id || currentUser.role === 'OWNER')
      .map(n => n.id);
      
    const userChapters = allChapters.filter(c => userNovelIds.includes(c.novelId));
    
    // Add novelTitle to each chapter for display
    const chaptersWithNovelInfo = userChapters.map(c => {
      const n = allNovels.find(novel => novel.id === c.novelId);
      return {
        ...c,
        novelTitle: n ? (n.titleEn || n.titleAr) : 'Unknown novel'
      };
    });
    setChapters(chaptersWithNovelInfo.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    // 2. Load deleted chapters
    const allDeleted = MistVilDatabase.get<any[]>('deleted_chapters', []);
    // For regular translators/writers, show chapters deleted by them (or from their novels)
    // For OWNER, show ALL deleted chapters by all translators/writers!
    if (currentUser.role === 'OWNER') {
      setDeletedChapters(allDeleted);
    } else {
      setDeletedChapters(allDeleted.filter(d => d.deletedById === currentUser.id || userNovelIds.includes(d.novelId)));
    }
  };

  const canModifyChapter = (chapter: any) => {
    if (currentUser.role === 'OWNER') {
      return { allowed: true, reason: 'The site owner always has full permission', daysLeft: 15 };
    }
    const isScheduled = chapter.publishAt && new Date(chapter.publishAt) > new Date();
    if (isScheduled) {
      return { allowed: true, reason: 'Scheduled chapters can always be edited', daysLeft: 15 };
    }
    const createdDate = new Date(chapter.createdAt);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays > 15) {
      return { allowed: false, reason: 'Locked (more than 15 days since publishing)', daysLeft: 0 };
    }
    
    const daysLeft = Math.max(0, 15 - Math.floor(diffDays));
    return { allowed: true, reason: `${daysLeft} days left to edit/delete`, daysLeft };
  };

  // Edit Request Form States
  const [reqNovelName, setReqNovelName] = useState('');
  const [reqChapterName, setReqChapterName] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [myEditRequests, setMyEditRequests] = useState<any[]>([]);

  const handleCreateEditRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqNovelName || !reqChapterName || !reqDetails) return;

    const newRequest = {
      id: `edit-req-${Date.now()}`,
      novelName: reqNovelName,
      chapterName: reqChapterName,
      details: reqDetails,
      translatorId: currentUser.id,
      translatorName: currentUser.username,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString()
    };

    const allEditReqs = MistVilDatabase.get<any[]>('edit_requests', []);
    const updated = [newRequest, ...allEditReqs];
    MistVilDatabase.set('edit_requests', updated);

    // Send a system notification to the Owner
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-editreq-${Date.now()}`,
      userId: 'mistvil-owner',
      title: `New chapter edit request from translator: ${currentUser.username}`,
      message: `Translator "${currentUser.username}" requested an edit on "${reqNovelName}", chapter: "${reqChapterName}". Details: ${reqDetails}`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    MistVilDatabase.set('notifications', [newNotif, ...allNotifs]);

    setMyEditRequests(updated.filter(r => r.translatorId === currentUser.id));
    setReqNovelName('');
    setReqChapterName('');
    setReqDetails('');
    alert('Your edit request was sent to the site owner successfully! It will be reviewed and the chapter updated soon.');
  };

  const handleStatusChange = (novelId: string, newStatus: any) => {
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
      if (n.id === novelId) {
        return {
          ...n,
          status: newStatus,
          statusChangeReason: reason || undefined
        };
      }
      return n;
    });

    MistVilDatabase.set('novels', updated);
    setNovels(updated.filter(n => n.translatorId === currentUser.id || currentUser.role === 'OWNER'));

    // Send Admin Notification to owner
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-status-${Date.now()}`,
      userId: 'mistvil-owner',
      title: `Novel status change: ${updated.find(n => n.id === novelId)?.titleEn || updated.find(n => n.id === novelId)?.titleAr || ''}`,
      message: `Translator "${currentUser.username}" changed the status of "${updated.find(n => n.id === novelId)?.titleEn || updated.find(n => n.id === novelId)?.titleAr || ''}" to (${statusNames[newStatus]}). ${reason ? `Reason: ${reason}` : ''}`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    MistVilDatabase.set('notifications', [newNotif, ...allNotifs]);

    alert(`Novel status changed to (${statusNames[newStatus]}) successfully and the owner was notified.`);
    window.dispatchEvent(new Event('novels-updated'));
  };

  useEffect(() => {
    // Load novels matching current translator or Owner
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    setNovels(allNovels.filter(n => n.translatorId === currentUser.id || currentUser.role === 'OWNER'));

    // Load available suggestions
    const allSuggestions = MistVilDatabase.get<Suggestion[]>('suggestions', []);
    setSuggestions(allSuggestions.filter(s => s.status === 'PENDING'));

    // Load active reservations
    const allReservations = MistVilDatabase.get<Reservation[]>('reservations', []);
    setReservations(allReservations.filter(r => r.translatorId === currentUser.id));

    // Load my edit requests
    const allEditReqs = MistVilDatabase.get<any[]>('edit_requests', []);
    setMyEditRequests(allEditReqs.filter(r => r.translatorId === currentUser.id));

    loadChaptersAndDeleted();
  }, [currentUser, activeTab]);

  // Handle deleting a chapter (with confirmation & archives it)
  const handleDeleteChapter = (chapterId: string) => {
    if (currentUser.role !== 'OWNER') {
      alert('Sorry, translators cannot delete published chapters. Only the site owner has this permission.');
      return;
    }

    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    const chapterToDelete = allChapters.find(c => c.id === chapterId);
    if (!chapterToDelete) return;

    // Enforce 15-day restriction
    const permission = canModifyChapter(chapterToDelete);
    if (!permission.allowed) {
      alert(`Sorry, you cannot delete this chapter! Reason: ${permission.reason}. Please contact administration for any edits.`);
      return;
    }

    showConfirm(
      'Delete chapter and move to archive (confirm 1/2)',
      `Are you absolutely sure you want to delete this chapter? It will be moved to the deleted-chapters archive, where you can restore it or delete it permanently.`,
      () => {
        setTimeout(() => {
          showConfirm(
            'Delete chapter and move to archive (final confirm 2/2) ⚠️',
            `Final, definitive warning: are you absolutely and definitively sure you want to remove this chapter and move it to the trash?`,
            () => {
              // Remove from active chapters
              const remainingChapters = allChapters.filter(c => c.id !== chapterId);
              MistVilDatabase.set('chapters', remainingChapters);

              // Get original novel title
              const allNovels = MistVilDatabase.get<any[]>('novels', []);
              const n = allNovels.find(novel => novel.id === chapterToDelete.novelId);

              // Add to deleted_chapters archive
              const allDeleted = MistVilDatabase.get<any[]>('deleted_chapters', []);
              const deletedEntry = {
                ...chapterToDelete,
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser.username,
                deletedById: currentUser.id,
                novelTitle: n ? (n.titleEn || n.titleAr) : 'Unknown novel'
              };
              MistVilDatabase.set('deleted_chapters', [...allDeleted, deletedEntry]);

              // Recalculate chapters count for novel
              if (n) {
                const actualCount = remainingChapters.filter(c => c.novelId === n.id).length;
                const updatedNovels = allNovels.map(novel => {
                  if (novel.id === n.id) {
                    return {
                      ...novel,
                      chaptersCount: actualCount
                    };
                  }
                  return novel;
                });
                MistVilDatabase.set('novels', updatedNovels);
              }

              loadChaptersAndDeleted();
              window.dispatchEvent(new Event('novels-updated'));
              alert('Chapter deleted and moved to the archive successfully! 🗑️');
            },
            true
          );
        }, 100);
      },
      true
    );
  };

  // Handle restoring a chapter
  const handleRestoreChapter = (deletedId: string) => {
    const allDeleted = MistVilDatabase.get<any[]>('deleted_chapters', []);
    const chapToRestore = allDeleted.find(d => d.id === deletedId);
    if (!chapToRestore) return;

    // Remove from deleted list
    const remainingDeleted = allDeleted.filter(d => d.id !== deletedId);
    MistVilDatabase.set('deleted_chapters', remainingDeleted);

    // Add back to active chapters
    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    
    // Clean deleted meta
    const { deletedAt, deletedBy, deletedById, ...originalChapter } = chapToRestore;
    MistVilDatabase.set('chapters', [...allChapters, originalChapter]);

    // Recalculate chapters count for novel
    const allNovels = MistVilDatabase.get<any[]>('novels', []);
    const actualCount = [...allChapters, originalChapter].filter(c => c.novelId === originalChapter.novelId).length;
    const updatedNovels = allNovels.map(novel => {
      if (novel.id === originalChapter.novelId) {
        return {
          ...novel,
          chaptersCount: actualCount
        };
      }
      return novel;
    });
    MistVilDatabase.set('novels', updatedNovels);

    loadChaptersAndDeleted();
    window.dispatchEvent(new Event('novels-updated'));
    alert('Chapter restored and republished successfully! ↩️');
  };

  // Handle permanently deleting a chapter
  const handlePermanentlyDelete = (deletedId: string) => {
    showConfirm(
      'Permanently delete chapter ⚠️ (confirm 1/2)',
      'Warning: are you sure you want to permanently delete this chapter? This action cannot be undone and will erase the chapter completely from the database!',
      () => {
        setTimeout(() => {
          showConfirm(
            'Permanently delete chapter ⚠️ (final confirm 2/2)',
            'Final, definitive warning: are you absolutely sure you want to erase this chapter permanently and forever? The chapter cannot be restored after this action!',
            () => {
              const allDeleted = MistVilDatabase.get<any[]>('deleted_chapters', []);
              const remainingDeleted = allDeleted.filter(d => d.id !== deletedId);
              MistVilDatabase.set('deleted_chapters', remainingDeleted);

              loadChaptersAndDeleted();
              alert('Chapter permanently and definitively deleted. ❌');
            },
            true
          );
        }, 100);
      },
      true
    );
  };

  // Handle opening edit modal
  const handleOpenEditModal = (chapter: any) => {
    // Enforce 15-day restriction
    const permission = canModifyChapter(chapter);
    if (!permission.allowed) {
      alert(`Sorry, you cannot edit this chapter! Reason: ${permission.reason}. Please contact administration for any edits.`);
      return;
    }

    setEditingChapter(chapter);
    setEditChapterTitle(chapter.title.split(':').slice(1).join(':').trim() || chapter.title);
    // Legacy chapters may still hold pasted HTML soup — clean it so the
    // editor shows readable text, and the next save persists the clean form.
    setEditChapterContent(normalizeChapterText(chapter.content));
    setEditChapterPublishAt(chapter.publishAt || '');
    setEditChapterImages(chapter.images ? chapter.images.join(', ') : '');
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
      if (!extension || !allowed.includes(extension)) {
        alert('Please choose PNG, JPG, JPEG, or WEBP images for aesthetic and compatible display on the platform!');
        return;
      }

      compressImageFile(file, 1000)
        .then((base64String) => {
          setEditChapterImages(prev => prev ? `${prev}, ${base64String}` : base64String);
        })
        .catch(() => alert('Could not process one of the images. Try a smaller one.'));
    });
  };

  const removeEditAttachedImage = (indexToRemove: number) => {
    const list = editChapterImages.split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    const updated = list.filter((_, idx) => idx !== indexToRemove);
    setEditChapterImages(updated.join(', '));
  };

  // Handle saving edited chapter
  const handleSaveEditChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;

    if (editChapterPublishAt) {
      const publishDate = new Date(editChapterPublishAt);
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

    const allChapters = MistVilDatabase.get<any[]>('chapters', []);
    
    const imgUrls = editChapterImages.split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const isScheduled = editChapterPublishAt ? new Date(editChapterPublishAt) > new Date() : false;

    const updatedChapters = allChapters.map(c => {
      if (c.id === editingChapter.id) {
        return {
          ...c,
          title: `Chapter ${editingChapter.number}: ${editChapterTitle}`,
          content: normalizeChapterText(editChapterContent),
          isDraft: isScheduled,
          publishAt: editChapterPublishAt || undefined,
          images: imgUrls.length > 0 ? imgUrls : undefined
        };
      }
      return c;
    });

    MistVilDatabase.set('chapters', updatedChapters);
    setEditingChapter(null);
    loadChaptersAndDeleted();
    alert('Chapter details edited and saved successfully! 💾');
  };

  // Request reservation extension
  const handleRequestExtension = (resId: string) => {
    const reason = prompt('Enter the reason for extending the reservation (e.g. we need time to proofread the first chapters):');
    if (!reason || reason.trim() === '') {
      alert('A reason is required to submit an extension request.');
      return;
    }

    const allReservations = MistVilDatabase.get<Reservation[]>('reservations', []);
    const updated = allReservations.map(r => {
      if (r.id === resId) {
        return {
          ...r,
          extensionRequested: true,
          extensionReason: reason
        };
      }
      return r;
    });

    MistVilDatabase.set('reservations', updated);
    setReservations(updated.filter(r => r.translatorId === currentUser.id));

    // Send admin notification
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-ext-${Date.now()}`,
      userId: 'mistvil-owner', // Notify Owner
      title: 'Novel reservation extension request',
      message: `Translator "${currentUser.username}" requested a reservation extension for the following reason: ${reason}`,
      type: 'RESERVATION',
      isRead: false,
      createdAt: 'now'
    };
    MistVilDatabase.set('notifications', [...allNotifs, newNotif]);
    alert('Your reservation extension request was sent to senior administration for review successfully.');
  };

  // Simulate 30 days passing for testing purposes
  const handleSimulateTime = (resId: string) => {
    const allReservations = MistVilDatabase.get<Reservation[]>('reservations', []);
    const updated = allReservations.map(r => {
      if (r.id === resId) {
        // Set startAt and endAt to 31 days ago, making it expired
        const thirtyOneDaysAgo = new Date();
        thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
        const expiredEndAt = new Date();
        expiredEndAt.setDate(expiredEndAt.getDate() - 1);
        
        return {
          ...r,
          startAt: thirtyOneDaysAgo.toISOString(),
          endAt: expiredEndAt.toISOString()
        };
      }
      return r;
    });

    MistVilDatabase.set('reservations', updated);
    setReservations(updated.filter(r => r.translatorId === currentUser.id));
    alert('Successfully simulated 30 days passing on this reservation! Please switch to other screens or reload the site to trigger the automatic expiry check.');
  };

  // Cancel reservation by the translator who booked it
  const handleCancelMyReservation = (resId: string, novelId: string, novelTitle: string) => {
    if (!confirm(`Are you sure you want to cancel the reservation for "${novelTitle}"? The novel will immediately return to the public suggestions list for members.`)) {
      return;
    }

    const allReservations = MistVilDatabase.get<Reservation[]>('reservations', []);
    const updatedRes = allReservations.map(r => r.id === resId ? { ...r, status: 'CANCELLED' as const } : r);
    MistVilDatabase.set('reservations', updatedRes);
    setReservations(updatedRes.filter(r => r.translatorId === currentUser.id));

    // Set novel back to CANCELLED
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const updatedNovels = allNovels.map(n => n.id === novelId ? { ...n, status: 'CANCELLED' as const, translatorId: '', translatorName: '' } : n);
    MistVilDatabase.set('novels', updatedNovels);

    // Return Suggestion to PENDING so it appears back in suggestion panel with votes kept intact
    const allSuggestions = MistVilDatabase.get<Suggestion[]>('suggestions', []);
    const updatedSugs = allSuggestions.map(s => {
      if (s.titleAr === novelTitle) {
        return { ...s, status: 'PENDING' as const };
      }
      return s;
    });
    MistVilDatabase.set('suggestions', updatedSugs);

    alert('Novel reservation cancelled successfully and it returned to the public suggestions with its votes intact.');
  };

  // Handle suggestion claim directly from translator panel
  const handleClaimSuggestion = (sug: Suggestion) => {
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

    // 2. Create reservation
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

    // 3. Update suggestion status (Disappears from list because status becomes RESERVED)
    const allSuggestions = MistVilDatabase.get<Suggestion[]>('suggestions', []);
    const updatedSugs = allSuggestions.map(s => s.id === sug.id ? { ...s, status: 'RESERVED' as const } : s);
    MistVilDatabase.set('suggestions', updatedSugs);

    // Save
    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const allReservations = MistVilDatabase.get<Reservation[]>('reservations', []);
    MistVilDatabase.set('novels', [newNovel, ...allNovels]);
    MistVilDatabase.set('reservations', [newRes, ...allReservations]);

    // Refresh state
    setNovels([newNovel, ...novels]);
    setSuggestions(updatedSugs.filter(s => s.status === 'PENDING'));
    setReservations([newRes, ...reservations]);

    // Send notification
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-claimed-${Date.now()}`,
      userId: currentUser.id,
      title: 'Suggestion accepted successfully!',
      message: `You reserved the suggested novel "${sug.titleEn || sug.titleAr}" successfully. It now appears in the translator panel and your account.`,
      type: 'RESERVATION',
      isRead: false,
      createdAt: 'now'
    };
    MistVilDatabase.set('notifications', [...allNotifs, newNotif]);
    alert(`Congratulations! You accepted the suggested novel "${sug.titleEn || sug.titleAr}" successfully and the 30-day reservation countdown is starting.`);
  };

  // Submit new novel draft for Admin Review / Publish immediately for Owner
  const handleCreateNovel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr || !titleEn || !author || !desc) {
      alert('Please fill in the required fields.');
      return;
    }

    let finalCover = coverImage;
    if (!finalCover) {
      const keys = Object.keys(COVER_IMAGES);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      finalCover = COVER_IMAGES[randomKey as keyof typeof COVER_IMAGES];
    }

    const status = 'AVAILABLE'; // Publish immediately so it appears on the homepage for visitors right away!

    const newNovel: Novel = {
      id: `novel-draft-${Date.now()}`,
      titleAr,
      titleEn,
      author,
      translatorId: currentUser.id,
      translatorName: currentUser.username,
      cover: finalCover,
      chaptersCount: 0,
      views: 0,
      likes: 0,
      bookmarksCount: 0,
      rating: 5.0,
      ratingCount: 0,
      status: status,
      language: lang,
      genres: selectedGenres,
      description: desc,
      createdAt: new Date().toISOString(),
      downloadAllowed: true
    };

    const allNovels = MistVilDatabase.get<Novel[]>('novels', []);
    const savedOk = MistVilDatabase.set('novels', [newNovel, ...allNovels]);
    if (!savedOk) {
      alert('Could not save the novel: storage is full (usually due to large images). Try a smaller cover or delete some old content.');
      return; // Keep the form filled so the user does not lose their work
    }

    // Notify administrators
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-review-${Date.now()}`,
      userId: 'mistvil-owner', // Notify Super Admin
      title: 'A new novel was published 📣',
      message: `${currentUser.role === 'WRITER' ? 'Writer' : 'Translator'} "${currentUser.username}" published a new novel "${titleEn || titleAr}" and it is now active on the platform.`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: 'now'
    };
    MistVilDatabase.set('notifications', [...allNotifs, newNotif]);
    setSuccess('Congratulations! Your novel was created and published successfully and is now instantly live for all visitors on the home page! 🎉');

    // Trigger update so App.tsx knows the novels updated!
    window.dispatchEvent(new Event('novels-updated'));

    setTitleAr('');
    setTitleEn('');
    setAuthor('');
    setDesc('');
    setSelectedGenres([]);
    setCoverImage('');

    setTimeout(() => {
      setSuccess('');
      setActiveTab('novels');
      setNovels([newNovel, ...novels]);
    }, 2000);
  };

  return (
    <div className="w-full text-left mt-4 pb-12 animate-in fade-in duration-300">
      
      {/* Banner */}
      <div className="p-6 bg-gradient-to-r from-violet-900/40 via-purple-900/20 to-[#0E1626] border border-violet-500/15 rounded-3xl mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="text-violet-400" size={24} />
            <span>Translation Studio & Control Panel</span>
          </h1>
          <p className="text-xs text-purple-300 mt-1">Create your own novels, publish chapters, and accept suggestions from the reader community.</p>
        </div>
        <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">✍️</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-6 text-sm font-semibold text-purple-300/80 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('novels')}
          className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'novels' ? 'text-white' : 'hover:text-white'}`}
        >
          <span>{currentUser.role === 'WRITER' ? 'My authored novels' : 'My translated novels'} ({novels.length})</span>
          {activeTab === 'novels' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
        </button>
        {currentUser.role !== 'WRITER' && (
          <button 
            onClick={() => setActiveTab('claims')}
            className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'claims' ? 'text-white' : 'hover:text-white'}`}
          >
            <span>Suggestion pickups ({suggestions.length})</span>
            {activeTab === 'claims' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
          </button>
        )}
        {currentUser.role !== 'WRITER' && (
          <button 
            onClick={() => setActiveTab('reservations')}
            className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'reservations' ? 'text-white' : 'hover:text-white'}`}
          >
            <span>My active reservations ({reservations.filter(r => r.status === 'ACTIVE').length})</span>
            {activeTab === 'reservations' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
          </button>
        )}
        <button 
          onClick={() => setActiveTab('add-novel')}
          className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'add-novel' ? 'text-white' : 'hover:text-white'}`}
        >
          <span>{currentUser.role === 'WRITER' ? 'Author a new novel +' : 'Register a new novel to translate +'}</span>
          {activeTab === 'add-novel' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'activity' ? 'text-white' : 'hover:text-white'}`}
        >
          <span className="flex items-center gap-1">📋 Activity & scheduling ({chapters.length})</span>
          {activeTab === 'activity' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('deleted-chapters')}
          className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'deleted-chapters' ? 'text-white' : 'hover:text-white'}`}
        >
          <span className="flex items-center gap-1">🗑️ Deleted chapters ({deletedChapters.length})</span>
          {activeTab === 'deleted-chapters' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('edit-requests')}
          className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'edit-requests' ? 'text-white' : 'hover:text-white'}`}
        >
          <span className="flex items-center gap-1">🛠️ Chapter edit request</span>
          {activeTab === 'edit-requests' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('points')}
          className={`pb-3 px-6 relative transition-colors shrink-0 ${activeTab === 'points' ? 'text-white' : 'hover:text-white'}`}
        >
          <span className="flex items-center gap-1">🌟 Points system ({getTranslatorPoints(currentUser.id, currentUser.username).pointsThisMonth} pts)</span>
          {activeTab === 'points' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />}
        </button>
      </div>

      {/* Tab Panel Content */}
      <div className="w-full">
        {/* TAB 1: Novels list */}
        {activeTab === 'novels' && (
          <div className="flex flex-col gap-4">
            {novels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {novels.map((novel) => (
                  <div 
                    key={novel.id}
                    className="p-4 bg-[#131F33] border border-white/5 hover:border-violet-500/20 rounded-2xl flex gap-4 transition-all"
                  >
                    <img src={novel.cover} alt={novel.titleAr} className="w-16 h-24 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-sm text-white truncate">{novel.titleAr}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${novel.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                            {novel.status === 'PENDING' ? 'Awaiting admin approval' : 'Active on site'}
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-400 truncate mt-0.5">{novel.titleEn}</p>
                      </div>

                      <div className="flex flex-col gap-2 mt-3 pt-2.5 border-t border-white/5">
                        <div className="flex justify-between items-center text-[10px] text-purple-300">
                          <span>{novel.chaptersCount} published chapters</span>
                          <div className="flex gap-2.5 items-center">
                            {novel.status !== 'PENDING' && (
                              <button
                                onClick={() => onNavigate('novel', { id: novel.id, autoOpenAddChapter: true })}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-500 hover:to-violet-400 text-white rounded-xl text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1"
                              >
                                <span>Add a new chapter +</span>
                              </button>
                            )}
                            <button 
                              onClick={() => onNavigate('novel', { id: novel.id })}
                              className="text-violet-400 font-extrabold hover:text-violet-300 text-[10px]"
                            >
                              View & edit →
                            </button>
                          </div>
                        </div>

                        {novel.status !== 'PENDING' && (
                          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] bg-white/5 p-2 rounded-xl border border-white/5">
                            <span className="text-purple-300 font-medium">Status: <span className="text-violet-300 font-bold">
                              {novel.status === 'ONGOING' || novel.status === 'TRANSLATING' || novel.status === 'AVAILABLE' ? 'Ongoing' :
                               novel.status === 'HIATUS' ? 'On hiatus' :
                               novel.status === 'CANCELLED' ? 'Dropped' :
                               novel.status === 'COMPLETED' ? 'Completed' : novel.status}
                            </span></span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-purple-400">Change status:</span>
                              <select
                                value={novel.status === 'TRANSLATING' || novel.status === 'AVAILABLE' ? 'ONGOING' : novel.status}
                                onChange={(e) => handleStatusChange(novel.id, e.target.value as any)}
                                className="bg-[#0F1828] text-purple-200 border border-white/10 rounded-lg px-2 py-1 cursor-pointer text-[10px] outline-none focus:border-violet-500"
                              >
                                <option value="ONGOING">Ongoing</option>
                                <option value="HIATUS">On hiatus</option>
                                <option value="CANCELLED">Dropped</option>
                                <option value="COMPLETED">Completed</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center glass-panel rounded-2xl border border-white/5 text-purple-400">
                <AlertCircle size={32} className="mx-auto mb-2 text-violet-400 animate-pulse" />
                <p className="text-sm">You haven't registered or reserved any novels yet.</p>
                <button 
                  onClick={() => setActiveTab('add-novel')}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold mt-4"
                >
                  Register your first novel now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Active Reservations */}
        {activeTab === 'reservations' && (
          <div className="flex flex-col gap-4 text-left animate-in fade-in duration-300">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-purple-300 flex items-start gap-2 leading-relaxed">
              <AlertCircle size={14} className="shrink-0 text-violet-400 mt-0.5" />
              <span>
                Deadline management: each novel reservation lasts **30 days**. If the 30 days pass without publishing any chapters, the reservation is cancelled automatically so the novel becomes available to other translators and to prevent hoarding. You can request an extension when needed.
              </span>
            </div>

            {reservations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reservations.map((res) => {
                  const daysLeft = Math.ceil((new Date(res.endAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft <= 0 || res.status === 'EXPIRED';
                  
                  return (
                    <div 
                      key={res.id} 
                      className="p-5 bg-[#131F33] border border-white/5 hover:border-violet-500/10 rounded-2xl flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="font-extrabold text-xs text-white">{res.novelTitle}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            res.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                            isExpired ? 'bg-zinc-500/10 text-zinc-400' :
                            'bg-green-500/10 text-green-400'
                          }`}>
                            {res.status === 'CANCELLED' ? 'Cancelled' :
                             isExpired ? 'Expired' :
                             'Active & protected ⏱️'}
                          </span>
                        </div>
                        
                        <div className="text-[10px] text-purple-400 flex flex-col gap-1 mt-2.5">
                          <div>Start date: <span className="text-white font-mono">{new Date(res.startAt).toLocaleDateString('en-US')}</span></div>
                          <div>End date: <span className="text-white font-mono">{new Date(res.endAt).toLocaleDateString('en-US')}</span></div>
                        </div>

                        <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                          <span className="text-purple-300">Time remaining:</span>
                          <span className={`font-extrabold ${isExpired ? 'text-red-400' : daysLeft <= 5 ? 'text-amber-400 animate-pulse' : 'text-violet-400'}`}>
                            {isExpired ? 'Reservation ended (0 days)' : `${daysLeft} days left`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-start mt-5 pt-3 border-t border-white/5">
                        {/* Simulation button for easy demo */}
                        {!isExpired && res.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleSimulateTime(res.id)}
                            className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                            title="Simulate 30 days passing instantly to confirm the reservation expires and the novel returns to suggestions"
                          >
                            ⌛ Simulate 30 days
                          </button>
                        )}

                        {!isExpired && res.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCancelMyReservation(res.id, res.novelId, res.novelTitle)}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Cancel reservation ❌
                          </button>
                        )}

                        {res.extensionRequested ? (
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                            ⏳ Extension request sent, awaiting admin
                          </span>
                        ) : (
                          !isExpired && res.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleRequestExtension(res.id)}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Request reservation extension ⏱️
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center glass-panel rounded-2xl border border-white/5 text-purple-400">
                <p className="text-xs">You have no active reservations right now.</p>
                <button
                  onClick={() => setActiveTab('claims')}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold mt-4 cursor-pointer"
                >
                  Explore suggested novels to reserve
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Suggestions available for claiming/reservation */}
        {activeTab === 'claims' && (
          <div className="flex flex-col gap-4 text-left">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-purple-300 flex items-start gap-2 leading-relaxed">
              <AlertCircle size={14} className="shrink-0 text-violet-400 mt-0.5" />
              <span>
                Per the technical spec: when you choose to "accept and pick up" a novel from member suggestions, it **disappears from the public suggestions** and automatically switches to **reserved for your translation**, appearing instantly in your account to start translating!
              </span>
            </div>

            {suggestions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {suggestions.map((sug) => (
                  <div key={sug.id} className="p-5 bg-[#131F33] border border-white/5 hover:border-violet-500/20 rounded-2xl flex flex-col md:flex-row gap-5 transition-all text-left">
                    <img src={sug.cover} alt={sug.titleAr} className="w-24 h-36 rounded-xl object-cover border border-white/5 mx-auto md:mx-0" />
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center">
                          <h4 className="font-extrabold text-sm text-white">{sug.titleAr}</h4>
                          <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2.5 py-0.5 rounded-full font-extrabold">👍 {sug.votes} upvotes</span>
                        </div>
                        <p className="text-[10px] text-purple-400 mt-0.5">{sug.titleEn}</p>
                        <p className="text-xs text-purple-300 mt-3 leading-relaxed">{sug.description}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-3 border-t border-white/5 gap-3">
                        <span className="text-[10px] text-purple-400">Suggested by: <span className="font-bold text-white">{sug.suggestedBy}</span></span>
                        
                        <div className="flex gap-2">
                          {sug.novelUpdatesLink && (
                            <a 
                              href={sug.novelUpdatesLink} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-purple-300 rounded-lg text-xs font-bold transition-all"
                            >
                              NovelUpdates 🔗
                            </a>
                          )}
                          <button 
                            onClick={() => handleClaimSuggestion(sug)}
                            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-violet-500/10"
                          >
                            Accept & reserve this novel to translate 📝
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center glass-panel rounded-2xl border border-white/5 text-purple-400">
                <p className="text-sm font-semibold">There are no novel suggestions awaiting translation right now.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Create Novel */}
        {activeTab === 'add-novel' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-left">
            
            {success && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-2 text-xs mb-6">
                <CheckCircle size={16} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleCreateNovel} className="flex flex-col gap-5 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-purple-200">Arabic title *</label>
                  <input 
                    type="text" 
                    required
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="e.g. The Beginning After the End (Arabic)"
                    className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white text-xs transition-all text-left"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-purple-200">English title *</label>
                  <input 
                    type="text" 
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. The Beginning After the End"
                    className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white text-xs transition-all text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-purple-200">Original author *</label>
                  <input 
                    type="text" 
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. TurtleMe"
                    className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white text-xs transition-all text-left"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-purple-200">Original language *</label>
                  <select 
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-purple-200 text-xs transition-all text-left cursor-pointer"
                  >
                    <option value="Korean">Korean 🇰🇷</option>
                    <option value="Chinese">Chinese 🇨🇳</option>
                    <option value="Japanese">Japanese 🇯🇵</option>
                    <option value="English">English 🇺🇸</option>
                  </select>
                </div>
              </div>

              {/* Genres checkbox list */}
              <div className="flex flex-col gap-1.5">
                <label className="text-purple-200">Select the appropriate genres for the novel</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {genresOptions.map((g) => {
                    const isSelected = selectedGenres.includes(g);
                    return (
                      <button 
                        key={g}
                        type="button"
                        onClick={() => {
                          setSelectedGenres(prev => 
                            isSelected ? prev.filter(item => item !== g) : [...prev, g]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${isSelected ? 'bg-violet-600 border-violet-500 text-white' : 'bg-[#131F33] border-white/5 text-purple-300'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Synopsis description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-purple-200">Full synopsis & story of the original novel *</label>
                <textarea 
                  required
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Write a compelling synopsis to draw in the reader community..."
                  className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white text-xs transition-all text-left resize-none"
                />
              </div>

              {/* Cover Image Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-purple-200">Premium novel cover (optional — a featured cover is auto-assigned if left blank)</label>
                <div className="relative border-2 border-dashed border-white/10 hover:border-violet-500/40 rounded-2xl p-6 flex flex-col items-center justify-center bg-[#131F33] hover:bg-white/5 transition-all text-center cursor-pointer min-h-[120px]">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const extension = file.name.split('.').pop()?.toLowerCase();
                      const allowed = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
                      if (!extension || !allowed.includes(extension)) {
                        alert('Error: only PNG, JPG, JPEG, or WEBP cover images are accepted to ensure premium cover quality!');
                        return;
                      }
                      // Compress before storing: raw multi-MB covers were the
                      // main reason publish syncs failed and novels vanished.
                      compressImageFile(file, 600)
                        .then((dataUrl) => setCoverImage(dataUrl))
                        .catch(() => alert('Could not process the cover image. Try a smaller one.'));
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {coverImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={coverImage} alt="Cover Preview" className="w-20 h-28 object-cover rounded-xl border border-violet-500" referrerPolicy="no-referrer" />
                      <span className="text-xs text-green-400 font-bold">Cover uploaded successfully ✓</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="text-purple-400 mb-2" />
                      <p className="text-xs font-bold text-purple-200">Drag the cover image here or browse your files</p>
                      <p className="text-[10px] text-purple-400 mt-1">PNG, JPG, JPEG, WEBP accepted — dimensions must be portrait at a 2:3 ratio</p>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-start mt-4 pt-4 border-t border-white/5">
                <button 
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-violet-500/10"
                >
                  Create & publish the novel instantly 🚀
                </button>
              </div>

            </form>

          </div>
        )}

        {/* TAB 4: Activity Desk & Scheduling */}
        {activeTab === 'activity' && (
          <div className="flex flex-col gap-4 text-left animate-in fade-in duration-300">
            <div className="p-5 bg-gradient-to-r from-violet-950/20 to-purple-950/20 border border-violet-500/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Calendar size={16} className="text-violet-400" />
                  <span>Activity board & automatic chapter scheduling</span>
                </h3>
                <p className="text-[10px] text-purple-400 mt-1">Track all your translated chapters, edit them without time limits, and schedule their publish times in seconds.</p>
              </div>
              <span className="text-[10px] bg-violet-600/20 text-violet-300 px-3 py-1 rounded-xl font-bold border border-violet-500/20">
                Total chapters: {chapters.length}
              </span>
            </div>

            {chapters.length > 0 ? (
              <div className="flex flex-col gap-3">
                {chapters.map((chap) => {
                  const isScheduled = chap.publishAt && new Date(chap.publishAt) > new Date();
                  return (
                    <div 
                      key={chap.id}
                      className="p-4 bg-[#131F33] border border-white/5 hover:border-violet-500/10 rounded-2xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-xs text-white truncate">{chap.title}</h4>
                          <span className="text-[9px] bg-violet-950 text-violet-300 px-2 py-0.5 rounded border border-white/5 font-bold">
                            {chap.novelTitle}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] text-purple-400">
                          <span>Views: {chap.views || 0} 👀</span>
                          <span>Created: {new Date(chap.createdAt).toLocaleDateString('en-US')} ⏱️</span>
                          {chap.images && <span>{chap.images.length} attached image(s) 🖼️</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {isScheduled ? (
                          <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-xl font-bold font-mono">
                            📅 Scheduled to publish: {new Date(chap.publishAt).toLocaleString('en-US', { hour12: true })}
                          </span>
                        ) : (
                          <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-xl font-bold">
                            ✅ Published publicly to readers
                          </span>
                        )}

                        {/* 15 Days Rule Badge */}
                        {(() => {
                          const perm = canModifyChapter(chap);
                          if (currentUser.role === 'OWNER') {
                            return (
                              <span className="text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-xl font-bold">
                                🛡️ Full owner permission
                              </span>
                            );
                          }
                          return perm.allowed ? (
                            <span className="text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-xl font-bold">
                              ⏳ {perm.daysLeft} days left to edit/delete
                            </span>
                          ) : (
                            <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-xl font-bold">
                              🔒 Locked (15 days passed)
                            </span>
                          );
                        })()}

                        <div className="flex gap-2">
                          <button 
                            disabled={!canModifyChapter(chap).allowed}
                            onClick={() => handleOpenEditModal(chap)}
                            className={`p-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all border flex items-center gap-1 ${
                              canModifyChapter(chap).allowed 
                                ? 'bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border-violet-500/10' 
                                : 'bg-gray-800/30 text-gray-500 border-gray-800/20 cursor-not-allowed opacity-50'
                            }`}
                            title={canModifyChapter(chap).reason}
                          >
                            <Edit size={12} />
                            <span>Edit chapter ✍️</span>
                          </button>
                          <button 
                            disabled={!canModifyChapter(chap).allowed}
                            onClick={() => handleDeleteChapter(chap.id)}
                            className={`p-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all border flex items-center gap-1 ${
                              canModifyChapter(chap).allowed 
                                ? 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/10' 
                                : 'bg-gray-800/30 text-gray-500 border-gray-800/20 cursor-not-allowed opacity-50'
                            }`}
                            title={canModifyChapter(chap).reason}
                          >
                            <Trash2 size={12} />
                            <span>Delete 🗑️</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center bg-[#131F33] border border-dashed border-white/5 rounded-3xl text-xs text-purple-400">
                You haven't published or scheduled any chapters yet. Pick a novel from the control panel and start adding your chapters!
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Deleted Chapters Archive */}
        {activeTab === 'deleted-chapters' && (
          <div className="flex flex-col gap-4 text-left animate-in fade-in duration-300">
            <div className="p-5 bg-gradient-to-r from-red-950/20 to-purple-950/20 border border-red-500/10 rounded-2xl">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Trash2 size={16} className="text-red-400 animate-pulse" />
                <span>Trash & deleted-chapters archive</span>
              </h3>
              <p className="text-[10px] text-purple-400 mt-1">
                {currentUser.role === 'OWNER' 
                  ? 'As the site owner, all deleted chapters from every translator and writer appear here, where you can restore them or permanently erase them to keep the content clean.'
                  : 'Chapters you delete are kept safely here. You can review them, restore them to the novel, or delete them permanently.'}
              </p>
            </div>

            {deletedChapters.length > 0 ? (
              <div className="flex flex-col gap-3">
                {deletedChapters.map((chap) => (
                  <div 
                    key={chap.id}
                    className="p-4 bg-[#131F33] border border-white/5 hover:border-red-500/10 rounded-2xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-xs text-white truncate">{chap.title}</h4>
                        <span className="text-[9px] bg-red-950/40 text-red-300 px-2 py-0.5 rounded border border-red-500/10 font-bold">
                          {chap.novelTitle}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] text-purple-400">
                        <span>Deleted by: {chap.deletedBy} 👤</span>
                        <span>Deleted on: {new Date(chap.deletedAt).toLocaleString('en-US')} 📅</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleRestoreChapter(chap.id)}
                        className="p-2 px-3 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all border border-green-500/10 flex items-center gap-1"
                      >
                        <span>Restore chapter ↩️</span>
                      </button>
                      <button 
                        onClick={() => handlePermanentlyDelete(chap.id)}
                        className="p-2 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-[10px] font-bold cursor-pointer transition-all border border-red-500/10 flex items-center gap-1"
                      >
                        <span>Delete permanently ❌</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center bg-[#131F33] border border-dashed border-white/5 rounded-3xl text-xs text-purple-400">
                The trash is completely empty and there are no archived chapters right now.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Edit Requests */}
        {activeTab === 'edit-requests' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-left animate-in fade-in duration-300">
            <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2 justify-start">
              <span>Request a chapter fix 🛠️</span>
              <AlertCircle className="text-violet-400" size={18} />
            </h3>
            <p className="text-xs text-purple-300 mb-6 leading-relaxed">
              If you find an error in a chapter or the 15-day editing window has passed, you can submit a request directly to the site owner to edit it on your behalf.
            </p>

            {/* Submission Form */}
            <form onSubmit={handleCreateEditRequest} className="flex flex-col gap-5 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-purple-200">Novel title *</label>
                  <input 
                    type="text" 
                    required
                    value={reqNovelName}
                    onChange={(e) => setReqNovelName(e.target.value)}
                    placeholder="e.g. The Beginning After the End (Arabic)"
                    className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white text-xs transition-all text-left"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-purple-200">Chapter to edit (number or title) *</label>
                  <input 
                    type="text" 
                    required
                    value={reqChapterName}
                    onChange={(e) => setReqChapterName(e.target.value)}
                    placeholder="e.g. Chapter 25"
                    className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white text-xs transition-all text-left"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-purple-200">Requested change and proposed edits in detail *</label>
                <textarea 
                  required
                  rows={4}
                  value={reqDetails}
                  onChange={(e) => setReqDetails(e.target.value)}
                  placeholder="Please describe the requested edit or change precisely..."
                  className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white text-xs transition-all text-left resize-none"
                />
              </div>

              <div className="flex gap-3 justify-start">
                <button 
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
                >
                  Send edit request to the owner 🚀
                </button>
              </div>
            </form>

            {/* List of submitted edit requests */}
            <div className="mt-8 border-t border-white/5 pt-6">
              <h4 className="text-xs font-bold text-purple-200 mb-4">Your submitted edit requests:</h4>
              {myEditRequests.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {myEditRequests.map((r: any) => (
                    <div key={r.id} className="p-4 bg-[#131F33] border border-white/5 rounded-xl flex justify-between items-center text-left text-xs">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.status === 'RESOLVED' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {r.status === 'RESOLVED' ? 'Edited ✓' : 'Under review ⏱️'}
                        </span>
                        <div className="text-purple-300 mt-2">
                          Novel: <span className="text-white font-bold">{r.novelName}</span> | {r.chapterName}
                        </div>
                        <p className="text-purple-400 mt-1">{r.details}</p>
                      </div>
                      <span className="text-[10px] text-purple-500 font-mono">
                        {new Date(r.createdAt).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-purple-400">You haven't submitted any edit requests yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: Points System */}
        {activeTab === 'points' && (() => {
          const pointsInfo = getTranslatorPoints(currentUser.id, currentUser.username);
          const isCrowned = isUserTranslatorOfTheMonth(currentUser.username);
          const currentMonth = new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
          const nextPointViewsLeft = 10 - (pointsInfo.viewsThisMonth % 10);
          const progressPercent = ((pointsInfo.viewsThisMonth % 10) / 10) * 100;

          return (
            <div className="flex flex-col gap-6 text-left animate-in fade-in duration-300">
              
              {/* Crowned Greeting */}
              {isCrowned && (
                <div className="relative p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-yellow-500/30 text-center flex flex-col items-center justify-center gap-2 overflow-hidden shadow-xl shadow-yellow-500/5">
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                  <div className="text-4xl">🏆</div>
                  <h3 className="text-lg font-extrabold text-yellow-400">Warm congratulations! You are Translator of the Month!</h3>
                  <p className="text-xs text-yellow-100 max-w-md">
                    Administration has crowned you <strong>Translator of the Month</strong> for your exceptional effort and great engagement. Your special rank now appears next to your name on all chapters and comments!
                  </p>
                </div>
              )}

              {/* Main Points Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Views & Points Box */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 md:col-span-2 flex flex-col gap-5 justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2.5 py-1 rounded-full font-bold">
                      {currentMonth}
                    </span>
                    <h4 className="text-sm font-extrabold text-white">Approved points & views stats 📈</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-[#0F1828] p-4 rounded-xl border border-white/5">
                      <span className="text-[10px] text-purple-400 block mb-1">Approved views this month</span>
                      <strong className="text-2xl font-extrabold text-white font-mono">{pointsInfo.viewsThisMonth}</strong>
                      <span className="text-[9px] text-purple-500 block mt-1">views</span>
                    </div>
                    <div className="bg-gradient-to-br from-[#16233A] to-[#0D1626] p-4 rounded-xl border border-violet-500/10 shadow-inner">
                      <span className="text-[10px] text-violet-400 block mb-1">Your current earned points</span>
                      <strong className="text-2xl font-extrabold text-violet-400 font-mono">{pointsInfo.pointsThisMonth}</strong>
                      <span className="text-[9px] text-violet-500 block mt-1">points</span>
                    </div>
                  </div>

                  {/* Progress to Next Point */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] text-purple-300">
                      <span>{pointsInfo.viewsThisMonth % 10} / 10 views to the next point</span>
                      <span>{nextPointViewsLeft} views left for a new point</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden border border-white/5 p-[2px]">
                      <div 
                        className="bg-gradient-to-r from-violet-600 to-rose-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Rules & Info */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 text-xs">
                  <h4 className="font-extrabold text-white flex items-center gap-1.5 justify-start">
                    <span>Points system guide</span>
                    <Award className="text-violet-400" size={16} />
                  </h4>
                  <ul className="flex flex-col gap-3 text-purple-300 list-disc list-inside">
                    <li>Every <strong>10 approved views</strong> earns you <strong>one point</strong>.</li>
                    <li><strong>View protection:</strong> a view only counts if the reader spends <strong>at least 30 seconds</strong> in the chapter.</li>
                    <li>Points reset automatically at the start of each calendar month to reopen the competition.</li>
                    <li>The Translator of the Month gets a premium temporary rank next to their name until the next month's winner is announced.</li>
                  </ul>
                </div>

              </div>

              {/* Points History */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <h4 className="text-sm font-extrabold text-white mb-4">Points history for previous months 📜</h4>
                {pointsInfo.viewsHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-purple-300 text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-purple-400">
                          <th className="pb-3 pt-1">Calendar month</th>
                          <th className="pb-3 pt-1">Views achieved</th>
                          <th className="pb-3 pt-1 text-left">Points earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {pointsInfo.viewsHistory.map((h, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 font-sans">{h.month}</td>
                            <td className="py-3">{h.views} views</td>
                            <td className="py-3 text-left text-violet-400 font-bold">{h.points} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-purple-400 text-center py-4">No historical data for previous months yet.</p>
                )}
              </div>

            </div>
          );
        })()}
      </div>

      {/* EDIT CHAPTER MODAL OVERLAY */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0E1626] border border-violet-500/20 rounded-3xl p-6 max-w-2xl w-full text-left shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <h3 className="font-extrabold text-sm md:text-base text-white border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
              <Edit size={18} className="text-violet-400" />
              <span>Edit chapter: {editingChapter.title}</span>
            </h3>

            <form onSubmit={handleSaveEditChapter} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-purple-200 font-bold">Chapter title</label>
                <input 
                  type="text" 
                  required
                  value={editChapterTitle}
                  onChange={(e) => setEditChapterTitle(e.target.value)}
                  className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-purple-200 font-bold">Chapter body</label>
                  
                  {/* Rich Text Format Helpers */}
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => {
                        const textarea = document.getElementById('edit-content-textarea') as HTMLTextAreaElement;
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const selected = text.substring(start, end);
                        const replacement = `<b>${selected || 'bold text'}</b>`;
                        setEditChapterContent(text.substring(0, start) + replacement + text.substring(end));
                      }} 
                      className="px-2 py-1 bg-white/5 hover:bg-white/15 text-white border border-white/5 rounded-lg text-[9px] font-bold cursor-pointer"
                    >
                      B
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const textarea = document.getElementById('edit-content-textarea') as HTMLTextAreaElement;
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const selected = text.substring(start, end);
                        const replacement = `<i>${selected || 'italic text'}</i>`;
                        setEditChapterContent(text.substring(0, start) + replacement + text.substring(end));
                      }} 
                      className="px-2 py-1 bg-white/5 hover:bg-white/15 text-white border border-white/5 rounded-lg text-[9px] italic font-bold cursor-pointer"
                    >
                      I
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const textarea = document.getElementById('edit-content-textarea') as HTMLTextAreaElement;
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const selected = text.substring(start, end);
                        const replacement = `<u>${selected || 'underlined text'}</u>`;
                        setEditChapterContent(text.substring(0, start) + replacement + text.substring(end));
                      }} 
                      className="px-2 py-1 bg-white/5 hover:bg-white/15 text-white border border-white/5 rounded-lg text-[9px] underline font-bold cursor-pointer"
                    >
                      U
                    </button>
                  </div>
                </div>
                <textarea 
                  id="edit-content-textarea"
                  required
                  rows={16}
                  value={editChapterContent}
                  onChange={(e) => setEditChapterContent(e.target.value)}
                  className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white font-sans min-h-[45vh] resize-y"
                />
              </div>

              {/* Image attachment fields removed per request to avoid cluttered inputs */}

              <div className="flex flex-col gap-1.5">
                <label className="text-purple-200 font-bold">📅 Schedule automatic publish time</label>
                <input 
                  type="datetime-local" 
                  lang="en"
                  value={editChapterPublishAt}
                  onChange={(e) => setEditChapterPublishAt(e.target.value)}
                  min={getMinScheduleDate()}
                  max={getMaxScheduleDate()}
                  className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl px-4 py-3 text-white font-mono"
                />
                <span className="text-[9px] text-purple-400">Pick the date and time to reschedule the chapter automatically. Leave blank to publish immediately.</span>
              </div>

              <div className="flex gap-2 justify-start mt-4 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setEditingChapter(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white rounded-xl font-bold cursor-pointer shadow-lg shadow-violet-500/10"
                >
                  Save chapter edits 💾
                </button>
              </div>
            </form>
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
