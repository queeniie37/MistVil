import React, { useState } from "react";
import { Search, Trash2, ArrowUpRight, BookMarked, FileText } from "lucide-react";
import { BookmarkedParagraph } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface BookmarksViewProps {
  bookmarks: BookmarkedParagraph[];
  onRemoveBookmark: (id: string) => void;
  onJumpToChapter: (novelId: string, chapterId: string) => void;
}

export default function BookmarksView({ bookmarks, onRemoveBookmark, onJumpToChapter }: BookmarksViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNovelFilter, setSelectedNovelFilter] = useState<string | null>(null);

  // Get unique novel titles with bookmarks
  const novelFilters = Array.from(new Set(bookmarks.map((b) => b.novelTitle)));

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesSearch =
      b.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.note && b.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesNovel = selectedNovelFilter ? b.novelTitle === selectedNovelFilter : true;

    return matchesSearch && matchesNovel;
  });

  return (
    <div id="bookmarks-view-container" className="space-y-6 animate-fade-in text-left" dir="ltr">
      {/* Title */}
      <div className="border-b border-brand-800/40 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Bookmarks & Reading Annotations</h1>
        <p className="text-gray-400 text-xs font-light mt-1">Review, organize, and manage your highlighted segments and personal notes.</p>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-brand-900/30 p-4 rounded-2xl border border-brand-800/50 flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            id="bookmark-search-input"
            type="text"
            placeholder="Search inside bookmarked quotes or personal notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-brand-950/80 border border-brand-800/80 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition font-light"
          />
        </div>

        {/* Novel filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
          <button
            id="bookmark-filter-all"
            onClick={() => setSelectedNovelFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer border ${
              selectedNovelFilter === null
                ? "bg-brand-500/20 text-brand-300 border-brand-500/30"
                : "bg-brand-950/50 text-gray-400 hover:text-white border-transparent"
            }`}
          >
            All Novels
          </button>
          {novelFilters.map((novelTitle) => (
            <button
              key={novelTitle}
              id={`bookmark-filter-${novelTitle}`}
              onClick={() => setSelectedNovelFilter(novelTitle)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer border ${
                selectedNovelFilter === novelTitle
                  ? "bg-brand-500/20 text-brand-300 border-brand-500/30"
                  : "bg-brand-950/50 text-gray-400 hover:text-white border-transparent"
              }`}
            >
              {novelTitle}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarks List */}
      <AnimatePresence mode="popLayout">
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-16 bg-brand-900/10 rounded-2xl border border-brand-800/30">
            <BookMarked className="w-12 h-12 text-gray-500 mx-auto mb-3 stroke-1" />
            <p className="text-gray-400 text-sm font-medium">No bookmarks match this search criteria.</p>
            <p className="text-gray-500 text-xs font-light mt-1">Double click or hover any paragraph in the reader to save quotes!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((bookmark) => (
              <motion.div
                key={bookmark.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-900/20 p-5 rounded-2xl border border-brand-800/40 hover:border-brand-500/20 transition flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow"
              >
                <div className="space-y-2 text-left flex-1 pl-1">
                  {/* Novel and Chapter info */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="text-brand-300 font-bold bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">
                      {bookmark.novelTitle}
                    </span>
                    <span className="text-gray-400 font-medium">
                      Chapter {bookmark.chapterNumber}: {bookmark.chapterTitle}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(bookmark.bookmarkedAt).toLocaleDateString("en-US", { dateStyle: "short" })}
                    </span>
                  </div>

                  {/* Novel Bookmarked Quote */}
                  <blockquote className="text-sm text-gray-200 border-l-2 border-brand-400 pl-3.5 italic leading-relaxed font-light">
                    &ldquo;{bookmark.text}&rdquo;
                  </blockquote>

                  {/* Personal Comment Annotation if exists */}
                  {bookmark.note && (
                    <div className="mt-2 text-xs bg-brand-500/5 p-3 rounded-xl border border-brand-800/50 text-gray-300 flex items-start gap-1.5 font-light">
                      <FileText className="w-3.5 h-3.5 mt-0.5 text-brand-400 shrink-0" />
                      <div>
                        <span className="font-bold text-brand-300">Your Personal Note:</span>{" "}
                        <span>{bookmark.note}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right hand Action buttons */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t border-brand-800/10 pt-3 md:pt-0 md:border-0 shrink-0">
                  <button
                    id={`btn-jump-bookmark-${bookmark.id}`}
                    onClick={() => onJumpToChapter(bookmark.novelId, bookmark.chapterId)}
                    className="px-4 py-2 bg-brand-900 hover:bg-brand-800 border border-brand-800 text-brand-300 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Read Source</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id={`btn-delete-bookmark-${bookmark.id}`}
                    onClick={() => onRemoveBookmark(bookmark.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-xl transition cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
