import React, { useState } from "react";
import { Search, Star, BookOpen, Compass, Eye, CheckCircle2, RefreshCw } from "lucide-react";
import { Novel, LibraryEntry } from "../types";
import { motion } from "motion/react";

interface ExploreViewProps {
  onSelectNovel: (novelId: string) => void;
  onSelectChapter: (novelId: string, chapterId: string) => void;
  library: LibraryEntry[];
  novels: Novel[];
}

export default function ExploreView({ onSelectNovel, onSelectChapter, library, novels }: ExploreViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Get all unique genres from novels list
  const allGenres = Array.from(new Set(novels.flatMap((n) => n.genres)));

  // Filter novels
  const filteredNovels = novels.filter((novel) => {
    const matchesSearch =
      novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (novel.englishTitle && novel.englishTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      novel.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      novel.translator.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre = selectedGenre ? novel.genres.includes(selectedGenre) : true;
    const matchesStatus = selectedStatus ? novel.status === selectedStatus : true;

    return matchesSearch && matchesGenre && matchesStatus;
  });

  // Find the last read novel in the library
  const readingNowEntries = library
    .filter((entry) => entry.status === "reading" && entry.lastReadChapterId)
    .sort((a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime());

  const latestReadingEntry = readingNowEntries[0];
  const latestReadingNovel = latestReadingEntry
    ? novels.find((n) => n.id === latestReadingEntry.novelId)
    : null;
  const latestReadingChapter =
    latestReadingNovel && latestReadingEntry
      ? latestReadingNovel.chapters.find((ch) => ch.id === latestReadingEntry.lastReadChapterId)
      : null;

  return (
    <div id="explore-view-container" className="space-y-8" dir="ltr">
      {/* Brand Header / Hero Banner */}
      <div
        id="explore-hero-banner"
        className="relative rounded-3xl overflow-hidden h-64 md:h-80 flex items-center bg-cover bg-center border border-brand-800/60 shadow-2xl"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(11, 19, 17, 0.95) 30%, rgba(11, 19, 17, 0.4) 70%, rgba(11, 19, 17, 0.95) 100%), url("/src/assets/images/mistvil_brand_banner_1783795867538.jpg")`
        }}
      >
        {/* Floating Mist Effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-transparent to-transparent opacity-90"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 px-6 md:px-12 max-w-2xl text-left space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-brand-800/70 border border-brand-500/30 text-brand-300 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Professional Novel Translation Gateway</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-white"
          >
            Explore <span className="text-brand-400 font-black drop-shadow-[0_0_15px_rgba(56,132,116,0.3)]">MistVil</span> Novels
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-300 text-sm md:text-base leading-relaxed font-light"
          >
            Immerse yourself in meticulously translated fantasy works. Track your progress, enjoy interactive footnotes clarifying culture, and read with comfort.
          </motion.p>
        </div>
      </div>

      {/* Quick Resume Card */}
      {latestReadingNovel && latestReadingChapter && latestReadingEntry && (
        <motion.div
          id="resume-reading-container"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-brand-900/60 via-brand-950/80 to-brand-900/60 p-5 rounded-2xl border border-brand-500/30 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-lg relative overflow-hidden"
        >
          {/* Decorative side glow */}
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-400 to-brand-600"></div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <img
              src={latestReadingNovel.coverImage}
              alt={latestReadingNovel.title}
              className="w-16 h-20 rounded-lg object-cover border border-brand-500/20 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1 text-left">
              <span className="text-xs text-brand-400 font-semibold flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Resume Reading
              </span>
              <h3 className="font-bold text-white text-base md:text-lg leading-snug">
                {latestReadingNovel.title}
              </h3>
              <p className="text-xs text-gray-400 font-light">
                {latestReadingChapter.title}
              </p>
              {latestReadingEntry.progressPercentage !== undefined && (
                <div className="flex items-center gap-2 mt-2 w-48 md:w-64">
                  <div className="w-full bg-brand-950 rounded-full h-1.5 overflow-hidden border border-brand-800">
                    <div
                      className="bg-gradient-to-r from-brand-400 to-brand-500 h-1.5 rounded-full"
                      style={{ width: `${latestReadingEntry.progressPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-brand-300 font-mono">
                    {Math.round(latestReadingEntry.progressPercentage)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            id="btn-resume-reading"
            onClick={() => onSelectChapter(latestReadingNovel.id, latestReadingChapter.id)}
            className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_4px_12px_rgba(56,132,116,0.3)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Read Now</span>
          </button>
        </motion.div>
      )}

      {/* Filter and Search Bar Panel */}
      <div
        id="explore-filter-panel"
        className="bg-brand-900/40 p-5 rounded-2xl border border-brand-800/60 backdrop-blur-sm space-y-4 text-left"
      >
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="novel-search-input"
              type="text"
              placeholder="Search by title, author, translator, or genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-brand-950/80 border border-brand-800/80 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-inner font-light"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              id="status-filter-all"
              onClick={() => setSelectedStatus(null)}
              className={`px-4 py-3 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
                selectedStatus === null
                  ? "bg-brand-600 text-white border-brand-500 shadow-md"
                  : "bg-brand-950/60 text-gray-400 border-brand-800/60 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              id="status-filter-ongoing"
              onClick={() => setSelectedStatus("Ongoing")}
              className={`px-4 py-3 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
                selectedStatus === "Ongoing"
                  ? "bg-brand-600 text-white border-brand-500 shadow-md"
                  : "bg-brand-950/60 text-gray-400 border-brand-800/60 hover:text-white"
              }`}
            >
              Ongoing
            </button>
            <button
              id="status-filter-completed"
              onClick={() => setSelectedStatus("Completed")}
              className={`px-4 py-3 rounded-xl font-semibold text-xs transition-all border cursor-pointer ${
                selectedStatus === "Completed"
                  ? "bg-brand-600 text-white border-brand-500 shadow-md"
                  : "bg-brand-950/60 text-gray-400 border-brand-800/60 hover:text-white"
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Genre Tags Filters */}
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-thin">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap mr-1">Genres:</span>
          <button
            id="genre-all"
            onClick={() => setSelectedGenre(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              selectedGenre === null
                ? "bg-brand-500/20 text-brand-300 border border-brand-500/40"
                : "bg-brand-950/40 text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            All Genres
          </button>
          {allGenres.map((genre) => (
            <button
              key={genre}
              id={`genre-${genre}`}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedGenre === genre
                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/40"
                  : "bg-brand-950/40 text-gray-400 hover:text-white border border-transparent"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Results Grid */}
      <div id="explore-results-panel" className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Translated Novels Library</span>
            <span className="text-xs bg-brand-800/60 text-brand-300 px-2.5 py-1 rounded-full font-mono font-medium">
              {filteredNovels.length}
            </span>
          </h2>
        </div>

        {filteredNovels.length === 0 ? (
          <div className="text-center py-16 bg-brand-900/20 rounded-2xl border border-brand-800/40">
            <Compass className="w-12 h-12 text-gray-500 mx-auto mb-3 stroke-1" />
            <p className="text-gray-400 text-sm font-medium">No translated works match your search criteria.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre(null);
                setSelectedStatus(null);
              }}
              className="mt-3 px-4 py-1.5 text-xs bg-brand-800 text-brand-300 rounded-lg hover:bg-brand-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map((novel) => {
              const novelLib = library.find((l) => l.novelId === novel.id);
              return (
                <motion.div
                  key={novel.id}
                  layoutId={`novel-card-${novel.id}`}
                  onClick={() => onSelectNovel(novel.id)}
                  className="bg-brand-900/30 rounded-2xl border border-brand-800/40 hover:border-brand-500/40 transition-all hover:bg-brand-900/50 cursor-pointer overflow-hidden shadow-md flex flex-col group h-[260px]"
                >
                  <div className="flex p-4 gap-4 flex-1">
                    {/* Novel Cover */}
                    <div className="relative w-28 h-36 rounded-xl overflow-hidden border border-brand-800/80 shadow bg-brand-950 flex-shrink-0">
                      <img
                        src={novel.coverImage}
                        alt={novel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {/* Status Badge */}
                      <span
                        className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-bold ${
                          novel.status === "مستمرة"
                            ? "bg-emerald-500/80 text-white backdrop-blur-xs"
                            : "bg-blue-500/80 text-white backdrop-blur-xs"
                        }`}
                      >
                        {novel.status === "مستمرة" ? "Ongoing" : "Completed"}
                      </span>
                    </div>

                    {/* Novel Info Block */}
                    <div className="flex flex-col justify-between flex-grow min-w-0 text-left">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-brand-300 font-medium bg-brand-900/80 px-2 py-0.5 rounded border border-brand-800/50">
                            {novel.translator}
                          </span>
                          {novelLib && (
                            <span className="text-[9px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Library
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-base leading-snug group-hover:text-brand-300 transition-colors truncate">
                          {novel.title}
                        </h3>
                        {novel.englishTitle && (
                          <p className="text-[11px] text-gray-400 font-mono truncate">{novel.englishTitle}</p>
                        )}
                        <p className="text-gray-300 text-xs font-light line-clamp-3 leading-relaxed mt-1">
                          {novel.description}
                        </p>
                      </div>

                      {/* Ratings and views */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-white font-bold">{novel.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{novel.viewCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Novel tags row */}
                  <div className="px-4 py-2 bg-brand-950/40 border-t border-brand-800/30 flex gap-1 overflow-hidden shrink-0">
                    {novel.genres.slice(0, 2).map((genre) => (
                      <span
                        key={genre}
                        className="text-[9px] bg-brand-900/60 text-brand-300/80 border border-brand-800/40 px-2 py-0.5 rounded-full font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                    {novel.tags.slice(0, 1).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] bg-brand-950/60 text-gray-400 border border-brand-800/30 px-2 py-0.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
