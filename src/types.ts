export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  chapterNumber: number;
  content: string[]; // List of paragraphs to support bookmarking/notes line-by-line
  translatorNotes?: string;
  translationNotesMap?: { [paragraphIndex: number]: string }; // Paragraph-specific translator's notes
  termsMap?: { [term: string]: { translation: string; explanation: string } }; // Term hover definitions
  publishDate: string;
  wordCount: number;
}

export interface Novel {
  id: string;
  title: string;
  englishTitle?: string;
  coverImage: string;
  author: string;
  translator: string;
  description: string;
  genres: string[];
  tags: string[];
  rating: number;
  chaptersCount: number;
  status: "مستمرة" | "مكتملة"; // Ongoing or Completed
  viewCount: number;
  chapters: Chapter[];
}

export interface ReadingSettings {
  fontFamily: "Tajawal" | "Cairo" | "Amiri";
  fontSize: number; // in pixels (e.g., 18, 20, 24)
  lineHeight: "normal" | "relaxed" | "loose";
  theme: "darkFog" | "sepia" | "midnight" | "lightCream";
  containerWidth: "compact" | "comfortable" | "wide";
  autoScrollSpeed: number; // 0 = disabled, 1-10 speed levels
}

export interface LibraryEntry {
  novelId: string;
  status: "reading" | "plan" | "completed" | "favorite";
  addedAt: string;
  lastReadChapterId?: string;
  lastReadChapterNum?: number;
  progressPercentage?: number;
  lastReadAt?: string;
}

export interface BookmarkedParagraph {
  id: string;
  novelId: string;
  novelTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  paragraphIndex: number;
  text: string;
  note?: string;
  bookmarkedAt: string;
}

export interface ChapterComment {
  id: string;
  chapterId: string;
  username: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface ReadingStats {
  totalChaptersRead: number;
  totalWordsRead: number;
  currentStreak: number;
  lastReadDate: string; // YYYY-MM-DD
  weeklyHistory: { [date: string]: number }; // date -> chapters read count
  badges: Badge[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserProfile {
  username: string;
  email: string;
  avatar: string; // Avatar identifier or URL
  bio: string;
  title: string; // Reading rank title
  createdAt: string;
  role?: 'reader' | 'translator' | 'writer' | 'owner';
  level?: number;
  xp?: number;
  paypal?: string;
  telegram?: string;
  discord?: string;
  favorites?: string[]; // Novel IDs
}

export interface RoleRequest {
  id: string;
  email: string;
  username: string;
  requestedRole: 'translator' | 'writer';
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface PendingNovel {
  id: string;
  novel: Novel;
  submittedBy: string; // Email of submitter
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface TrashItem {
  id: string;
  type: 'novel' | 'chapter';
  title: string;
  parentNovelId?: string; // If chapter, store parent novel ID
  data: any; // Entire Novel or Chapter object
  deletedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

