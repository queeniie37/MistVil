import React, { useState } from "react";
import { ArrowLeft, Star, Heart, Bookmark, Eye, Calendar, User, BookOpen, Check, ListChecks, Upload } from "lucide-react";
import { Novel, LibraryEntry, Chapter, UserProfile } from "../types";
import { motion } from "motion/react";

interface NovelDetailViewProps {
  novel: Novel;
  library: LibraryEntry[];
  readHistory: { [novelId: string]: string[] }; // novelId -> list of read chapterIds
  onBack: () => void;
  onUpdateLibraryStatus: (novelId: string, status: "reading" | "plan" | "completed" | "favorite") => void;
  onRemoveFromLibrary: (novelId: string) => void;
  onSelectChapter: (novelId: string, chapterId: string) => void;
  currentUser?: UserProfile | null;
  onUpdateNovel?: (updatedNovel: Novel) => void;
}

export default function NovelDetailView({
  novel,
  library,
  readHistory,
  onBack,
  onUpdateLibraryStatus,
  onRemoveFromLibrary,
  onSelectChapter,
  currentUser,
  onUpdateNovel
}: NovelDetailViewProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const libraryEntry = library.find((entry) => entry.novelId === novel.id);
  const readChapterIds = readHistory[novel.id] || [];

  const statusOptions = [
    { id: "reading", label: "Currently Reading", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { id: "plan", label: "Want to Read", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { id: "completed", label: "Completed", color: "bg-brand-500/20 text-brand-300 border-brand-500/30" },
    { id: "favorite", label: "Favorite", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" }
  ];

  return (
    <div id="novel-detail-container" className="space-y-8 animate-fade-in text-left" dir="ltr">
      {/* Back Button */}
      <button
        id="btn-back-to-explore"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-white font-semibold transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore</span>
      </button>

      {/* Novel Summary Hero */}
      <div
        id="novel-hero-card"
        className="bg-gradient-to-b from-brand-900/40 to-brand-950/80 rounded-3xl border border-brand-800/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start relative overflow-hidden"
      >
        {/* Background ambient glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Book Cover Image */}
        <div className="w-full md:w-44 h-60 rounded-2xl overflow-hidden border border-brand-800/80 shadow-lg bg-brand-950 flex-shrink-0 mx-auto md:mx-0 relative group">
          <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          
          {(currentUser?.role === "owner" || (novel.translator && currentUser?.username && novel.translator.toLowerCase() === currentUser.username.toLowerCase())) && onUpdateNovel && (
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
              <label htmlFor="detail-change-cover" className="cursor-pointer bg-brand-500 hover:bg-brand-400 text-brand-950 font-bold px-3 py-1.5 rounded-lg text-[11px] font-cairo flex items-center gap-1 transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>تغيير الغلاف</span>
              </label>
              <input
                type="file"
                id="detail-change-cover"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.type.startsWith("image/png") && !file.type.startsWith("image/jpeg")) {
                      alert("عذراً، يجب اختيار صورة بصيغة PNG أو JPG فقط!");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      onUpdateNovel({
                        ...novel,
                        coverImage: dataUrl
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Book metadata content */}
        <div className="flex-1 space-y-4 w-full text-left">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{novel.title}</h1>
            {novel.englishTitle && <p className="text-sm text-gray-400 font-mono">{novel.englishTitle}</p>}
          </div>

          {/* Author, Translator and View stats */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-brand-400" />
              <span>Author: <span className="text-white font-medium">{novel.author}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-brand-400" />
              <span>Translator: <span className="text-brand-300 font-medium">{novel.translator}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>Views: <span className="text-white font-mono">{novel.viewCount.toLocaleString()}</span></span>
            </div>
          </div>

          {/* Star Rating and Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-white text-sm font-black font-mono">{novel.rating}</span>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                novel.status === "مستمرة"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}
            >
              Status: {novel.status === "مستمرة" ? "Ongoing" : "Completed"}
            </span>
          </div>

          {/* Novel synopsis */}
          <p className="text-gray-300 text-sm md:text-base leading-relaxed font-light">
            {novel.description}
          </p>

          {/* Genre and tags container */}
          <div className="flex flex-wrap gap-2 pt-2">
            {novel.genres.map((genre) => (
              <span
                key={genre}
                className="text-xs bg-brand-900/60 text-brand-300 border border-brand-800/50 px-3 py-1 rounded-full font-medium"
              >
                {genre}
              </span>
            ))}
            {novel.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-brand-950 text-gray-400 border border-brand-800/40 px-3 py-1 rounded-full font-light"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Advanced tracking state dropdown */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center relative z-20">
            <div className="relative w-full sm:w-auto">
              <button
                id="btn-toggle-library-status"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border shadow-md ${
                  libraryEntry
                    ? "bg-brand-500/20 text-brand-300 border-brand-500/40"
                    : "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white border-transparent"
                }`}
              >
                {libraryEntry ? (
                  <>
                    <Bookmark className="w-4 h-4 fill-brand-300" />
                    <span>Tracking: {statusOptions.find((o) => o.id === libraryEntry.status)?.label}</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4" />
                    <span>Add to Library</span>
                  </>
                )}
              </button>

              {/* Status Dropdown */}
              {showStatusDropdown && (
                <div
                  id="library-status-dropdown"
                  className="absolute left-0 top-full mt-2 w-56 bg-brand-950 border border-brand-800 rounded-xl shadow-xl overflow-hidden py-1.5 animate-slide-up z-30 text-left"
                >
                  <p className="text-[10px] text-gray-500 font-semibold px-4 py-1.5 border-b border-brand-900">
                    Select Tracking Status
                  </p>
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.id}
                      id={`opt-status-${opt.id}`}
                      onClick={() => {
                        onUpdateLibraryStatus(novel.id, opt.id as any);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-brand-900/60 hover:text-brand-300 flex items-center justify-between cursor-pointer font-semibold"
                    >
                      <span>{opt.label}</span>
                      {libraryEntry?.status === opt.id && <Check className="w-3.5 h-3.5 text-brand-400" />}
                    </button>
                  ))}
                  {libraryEntry && (
                    <button
                      id="opt-remove-library"
                      onClick={() => {
                        onRemoveFromLibrary(novel.id);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center justify-between cursor-pointer font-bold border-t border-brand-900 mt-1"
                    >
                      <span>Remove Novel</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick action: Read chapter 1 */}
            <button
              id="btn-detail-read-first"
              disabled={novel.chapters.length === 0}
              onClick={() => novel.chapters.length > 0 && onSelectChapter(novel.id, novel.chapters[0].id)}
              className="w-full sm:w-auto px-5 py-2.5 bg-brand-900 hover:bg-brand-800 border border-brand-800 text-brand-300 hover:text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Chapter 1</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <div id="chapters-list-panel" className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-brand-400" />
          <span>Translated Chapters</span>
          <span className="text-xs bg-brand-900/60 text-brand-400 px-2.5 py-1 rounded-full font-mono font-medium">
            {novel.chapters.length} available
          </span>
        </h2>

        {novel.chapters.length === 0 ? (
          <div className="text-center py-10 bg-brand-900/20 rounded-2xl border border-brand-800/40 text-gray-400 text-xs font-light">
            No translated chapters available yet. Add chapters using the Imperial Admin Panel.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {novel.chapters.map((chapter) => {
              const isRead = readChapterIds.includes(chapter.id);
              const isLastRead = libraryEntry?.lastReadChapterId === chapter.id;

              return (
                <div
                  key={chapter.id}
                  id={`chapter-card-${chapter.id}`}
                  onClick={() => onSelectChapter(novel.id, chapter.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isLastRead
                      ? "bg-brand-500/15 border-brand-500/50 shadow-[0_0_12px_rgba(56,132,116,0.15)]"
                      : isRead
                      ? "bg-brand-900/10 border-brand-900/60 hover:bg-brand-900/20 hover:border-brand-800/80"
                      : "bg-brand-900/30 border-brand-800/40 hover:bg-brand-900/40 hover:border-brand-500/30"
                  }`}
                >
                  <div className="space-y-1 text-left min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      {isLastRead && (
                        <span className="text-[9px] bg-brand-500 text-white px-2 py-0.5 rounded font-bold">
                          Current Progress
                        </span>
                      )}
                      {isRead && !isLastRead && (
                        <span className="text-[9px] bg-brand-900/80 text-brand-400 border border-brand-800 px-2 py-0.5 rounded font-medium">
                          Read
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 font-mono">{chapter.publishDate}</span>
                    </div>
                    <h3 className="font-bold text-white text-sm md:text-base group-hover:text-brand-300 transition-colors truncate">
                      {chapter.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-light">
                      Word Count: <span className="font-mono">{chapter.wordCount} words</span>
                    </p>
                  </div>

                  {/* Right decorative circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                      isLastRead
                        ? "bg-brand-500/20 border-brand-500 text-brand-300"
                        : isRead
                        ? "bg-brand-900 border-brand-800 text-brand-400"
                        : "bg-brand-950 border-brand-800 text-gray-500 group-hover:border-brand-500/50 group-hover:text-brand-300"
                    }`}
                  >
                    {isRead ? <Check className="w-4 h-4" /> : <BookOpen className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
