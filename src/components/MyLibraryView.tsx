import React, { useState } from "react";
import { BookOpen, Flame, Trophy, Award, Trash2, ArrowUpRight, BarChart2, Star, CheckCircle, Calendar, Sparkles } from "lucide-react";
import { Novel, LibraryEntry, ReadingStats, Badge } from "../types";
import { DEFAULT_BADGES } from "../data";
import { motion, AnimatePresence } from "motion/react";

interface MyLibraryViewProps {
  library: LibraryEntry[];
  stats: ReadingStats;
  novels: Novel[];
  onRemoveFromLibrary: (novelId: string) => void;
  onSelectNovel: (novelId: string) => void;
  onSelectChapter: (novelId: string, chapterId: string) => void;
}

export default function MyLibraryView({
  library,
  stats,
  novels,
  onRemoveFromLibrary,
  onSelectNovel,
  onSelectChapter
}: MyLibraryViewProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "reading" | "plan" | "completed" | "favorite" | "all">("all");

  // Get matching novels in library
  const libraryNovelsWithStatus = library.map((entry) => {
    const novel = novels.find((n) => n.id === entry.novelId);
    return {
      novel,
      entry
    };
  }).filter((item) => item.novel !== undefined) as { novel: Novel; entry: LibraryEntry }[];

  // Filter based on selected category
  const finalFilteredList = libraryNovelsWithStatus.filter((item) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "favorite") return item.entry.status === "favorite";
    return item.entry.status === activeCategory;
  });

  const categories = [
    { id: "all", label: "All" },
    { id: "reading", label: "Currently Reading" },
    { id: "plan", label: "Want to Read" },
    { id: "completed", label: "Completed" },
    { id: "favorite", label: "Favorites" }
  ];

  // Helper to map badge icons dynamically
  const renderBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const colorClass = isUnlocked ? "text-brand-300" : "text-gray-600";
    switch (iconName) {
      case "BookOpen":
        return <BookOpen className={`w-6 h-6 ${colorClass}`} />;
      case "Flame":
        return <Flame className={`w-6 h-6 ${isUnlocked ? "text-amber-500 fill-amber-500" : "text-gray-600"}`} />;
      case "Compass":
        return <CompassIcon className={`w-6 h-6 ${colorClass}`} />;
      case "Bookmark":
        return <Award className={`w-6 h-6 ${colorClass}`} />;
      case "Zap":
        return <Sparkles className={`w-6 h-6 ${isUnlocked ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />;
      default:
        return <Trophy className={`w-6 h-6 ${colorClass}`} />;
    }
  };

  return (
    <div id="library-view-container" className="space-y-8 animate-fade-in" dir="ltr">
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-brand-800/40 pb-4">
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Advanced Library Tracker</h1>
          <p className="text-gray-400 text-xs font-light mt-1">Continuous progress logging, milestones achievements, and bookmarks repository.</p>
        </div>
        <Flame className="w-8 h-8 text-amber-500 animate-pulse" />
      </div>

      {/* Stats Dashboard Grid */}
      <div id="library-stats-dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Streaks and totals */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Chapters */}
          <div className="bg-brand-900/30 p-5 rounded-2xl border border-brand-800/50 flex items-center justify-between shadow-md">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium">Chapters Read</span>
              <p className="text-3xl font-black font-mono text-brand-300">{stats.totalChaptersRead}</p>
            </div>
            <div className="bg-brand-500/10 p-3 rounded-xl border border-brand-500/20">
              <BookOpen className="w-6 h-6 text-brand-400" />
            </div>
          </div>

          {/* Card 2: Total Words */}
          <div className="bg-brand-900/30 p-5 rounded-2xl border border-brand-800/50 flex items-center justify-between shadow-md">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium">Words Read</span>
              <p className="text-2xl font-black font-mono text-white">{(stats.totalWordsRead).toLocaleString()}</p>
            </div>
            <div className="bg-brand-500/10 p-3 rounded-xl border border-brand-500/20">
              <BarChart2 className="w-6 h-6 text-brand-400" />
            </div>
          </div>

          {/* Card 3: Reading Streak */}
          <div className="bg-brand-900/30 p-5 rounded-2xl border border-brand-800/50 flex items-center justify-between shadow-md relative overflow-hidden">
            {stats.currentStreak > 0 && (
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl animate-pulse"></div>
            )}
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium">Reading Streak</span>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black font-mono text-amber-500">{stats.currentStreak}</p>
                <span className="text-xs text-gray-400 font-medium">consecutive days</span>
              </div>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <Flame className={`w-6 h-6 ${stats.currentStreak > 0 ? "text-amber-500 fill-amber-500 animate-bounce" : "text-gray-500"}`} />
            </div>
          </div>

          {/* Weekly Bar Graph Representation */}
          <div className="sm:col-span-3 bg-brand-900/20 p-5 rounded-2xl border border-brand-800/40 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Weekly Reading Activity</span>
            </h3>

            <div className="flex items-end justify-between h-24 pt-2 px-4 gap-2">
              {Object.entries(stats.weeklyHistory).map(([dateStr, count]) => {
                const dayLabel = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
                const percentage = Math.min((count / 5) * 100, 100); // 5 chapters as target 100%
                return (
                  <div key={dateStr} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="relative w-full flex justify-center">
                      {count > 0 && (
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-brand-950 text-brand-300 text-[10px] font-mono px-2 py-0.5 rounded border border-brand-800 transition-opacity whitespace-nowrap z-10 shadow">
                          {count} ch.
                        </div>
                      )}
                      <div className="w-6 bg-brand-950 rounded-t-md h-20 flex items-end overflow-hidden border border-brand-900">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            count > 0
                              ? "bg-gradient-to-t from-brand-600 to-brand-400 shadow-[0_0_8px_rgba(56,132,116,0.4)]"
                              : "bg-transparent"
                          }`}
                          style={{ height: `${percentage || 5}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Achievements & Badges */}
        <div className="bg-brand-900/30 p-5 rounded-2xl border border-brand-800/50 space-y-4 shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-400" />
              <span>Achievements & Badges</span>
            </h3>

            <div className="space-y-3 divide-y divide-brand-800/30 max-h-[220px] overflow-y-auto pl-1">
              {DEFAULT_BADGES.map((badge) => {
                const isUnlocked = stats.badges.some((b) => b.id === badge.id);
                return (
                  <div key={badge.id} className="flex items-center gap-3 pt-3 first:pt-0">
                    <div
                      className={`p-2.5 rounded-xl border flex-shrink-0 ${
                        isUnlocked
                          ? "bg-brand-500/10 border-brand-500/30 text-brand-300"
                          : "bg-brand-950 border-brand-900 text-gray-600"
                      }`}
                    >
                      {renderBadgeIcon(badge.icon, isUnlocked)}
                    </div>
                    <div className="min-w-0 text-left">
                      <p
                        className={`text-xs font-bold ${
                          isUnlocked ? "text-brand-300" : "text-gray-500"
                        }`}
                      >
                        {badge.title}
                      </p>
                      <p className="text-[10px] text-gray-400 font-light truncate">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-brand-800/20 text-center">
            <span className="text-[11px] text-brand-300 flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>Unlocked {stats.badges.length} of {DEFAULT_BADGES.length} Badges</span>
            </span>
          </div>
        </div>
      </div>

      {/* Library Grid and Categories filters */}
      <div className="space-y-4 text-left">
        {/* Category Tabs */}
        <div className="flex border-b border-brand-800/40 overflow-x-auto gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`library-tab-${cat.id}`}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`pb-3.5 px-3 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer relative ${
                activeCategory === cat.id
                  ? "text-brand-300"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {cat.label}
              {activeCategory === cat.id && (
                <motion.div
                  layoutId="library-tab-indicator"
                  className="absolute bottom-0 right-0 left-0 h-0.5 bg-brand-400"
                ></motion.div>
              )}
            </button>
          ))}
        </div>

        {/* Library Novels Grid */}
        <AnimatePresence mode="popLayout">
          {finalFilteredList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 bg-brand-900/10 rounded-2xl border border-brand-800/30"
            >
              <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3 stroke-1" />
              <p className="text-gray-400 text-sm font-medium">No novels added in this category yet.</p>
              <p className="text-gray-500 text-xs font-light mt-1">Browse translated stories in Explore and add works to get started!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {finalFilteredList.map(({ novel, entry }) => (
                <motion.div
                  key={novel.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-brand-900/30 rounded-2xl border border-brand-800/50 overflow-hidden shadow-md p-4 flex gap-4 hover:border-brand-500/30 transition group relative"
                >
                  {/* Remove Button */}
                  <button
                    id={`btn-remove-lib-${novel.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromLibrary(novel.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-brand-950/80 border border-brand-800 text-gray-400 hover:text-red-400 hover:border-red-400/40 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Remove from Library"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Book Cover */}
                  <div
                    onClick={() => onSelectNovel(novel.id)}
                    className="w-24 h-32 rounded-xl overflow-hidden border border-brand-800/80 shadow bg-brand-950 flex-shrink-0 cursor-pointer relative"
                  >
                    <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {entry.status === "completed" && (
                      <div className="absolute inset-0 bg-brand-950/70 flex items-center justify-center backdrop-blur-xs">
                        <CheckCircle className="w-7 h-7 text-brand-400" />
                      </div>
                    )}
                  </div>

                  {/* Tracking Info Column */}
                  <div className="flex flex-col justify-between flex-grow min-w-0 text-left">
                    <div className="space-y-1 pl-4">
                      <span className="text-[9px] bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2 py-0.5 rounded-full">
                        {entry.status === "reading"
                          ? "Reading"
                          : entry.status === "plan"
                          ? "Want to Read"
                          : entry.status === "completed"
                          ? "Completed"
                          : "Favorite"}
                      </span>
                      <h3
                        onClick={() => onSelectNovel(novel.id)}
                        className="font-bold text-white text-base hover:text-brand-300 transition-colors truncate cursor-pointer leading-tight mt-1"
                      >
                        {novel.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{novel.englishTitle}</p>
                    </div>

                    {/* Progress tracking details */}
                    <div className="space-y-2 mt-2">
                      {entry.lastReadChapterId && entry.lastReadChapterNum ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 font-light">Reached Chapter {entry.lastReadChapterNum}</span>
                            {entry.progressPercentage !== undefined && (
                              <span className="text-brand-300 font-mono font-bold text-[11px]">{Math.round(entry.progressPercentage)}%</span>
                            )}
                          </div>
                          {entry.progressPercentage !== undefined && (
                            <div className="w-full bg-brand-950 rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-brand-400 h-1 rounded-full"
                                style={{ width: `${entry.progressPercentage}%` }}
                              ></div>
                            </div>
                          )}
                          <button
                            id={`btn-continue-read-${novel.id}`}
                            onClick={() => onSelectChapter(novel.id, entry.lastReadChapterId!)}
                            className="text-xs text-brand-300 font-bold hover:text-brand-200 transition flex items-center gap-0.5 mt-1 cursor-pointer"
                          >
                            <span>Continue Reading</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2">
                          <button
                            id={`btn-start-read-${novel.id}`}
                            onClick={() => onSelectChapter(novel.id, novel.chapters[0].id)}
                            className="px-3.5 py-1.5 bg-brand-800 text-brand-300 hover:bg-brand-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Start Reading</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Inline fallback for missing compass icon in standard imports
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
