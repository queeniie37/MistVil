import React, { useState, useMemo } from 'react';
import { Filter, Search, Grid, List, RefreshCw, Layers, Star } from 'lucide-react';
import { Novel } from '../types';
import { matchesSearchWords } from '../utils/text';
import NovelCard from './NovelCard';

interface ExploreLibraryProps {
  novels: Novel[];
  bookmarks: string[];
  onBookmarkToggle: (novelId: string) => void;
  onNovelClick: (novelId: string) => void;
}

const GENRES = ['All', 'Action', 'Fantasy', 'Adventure', 'Thriller', 'System', 'Isekai', 'Murim', 'Drama', 'Mystery', 'Romance', 'Comedy', 'Regression', 'Music'];
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'TRANSLATING', label: 'Translating' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'HIATUS', label: 'On Hiatus' }
];

export default function ExploreLibrary({ novels, bookmarks, onBookmarkToggle, onNovelClick }: ExploreLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('popular'); // popular, rating, newest, chapters

  const filteredNovels = useMemo(() => {
    return novels
      .filter((novel) => {
        // Case-insensitive, word-based matching: every typed word must appear
        // somewhere in the titles/author, in any order.
        const matchesSearch = matchesSearchWords(search, [novel.titleAr, novel.titleEn, novel.titleOriginal, novel.author]);
        
        const matchesGenre = selectedGenre === 'All' || novel.genres.includes(selectedGenre);
        
        // A novel that is still ongoing counts as "Translating" in the
        // library; once its status flips to COMPLETED it moves to "Completed".
        const matchesStatus =
          selectedStatus === 'ALL' ||
          (selectedStatus === 'TRANSLATING'
            ? ['TRANSLATING', 'ONGOING', 'AVAILABLE', 'RESERVED'].includes(novel.status)
            : novel.status === selectedStatus);

        return matchesSearch && matchesGenre && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.views - a.views;
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'chapters') return b.chaptersCount - a.chaptersCount;
        return 0;
      });
  }, [novels, search, selectedGenre, selectedStatus, sortBy]);

  const handleReset = () => {
    setSearch('');
    setSelectedGenre('All');
    setSelectedStatus('ALL');
    setSortBy('popular');
  };

  return (
    <div className="w-full text-left mt-6 flex flex-col lg:flex-row gap-8">
      
      {/* Sidebar Filter Control Panel (Desktop: 280px, Mobile: horizontal flex) */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Filter size={16} className="text-violet-400" />
              <span>Explore Filters</span>
            </h3>
            <button 
              onClick={handleReset}
              className="text-xs text-purple-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={10} />
              <span>Reset</span>
            </button>
          </div>

          {/* Search Input Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-purple-300 font-semibold">Keyword search</span>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Novel title, author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl py-2.5 pl-9 pr-3 text-white text-xs outline-none transition-all text-left"
              />
              <Search className="absolute left-3 top-3 text-purple-400" size={14} />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-purple-300 font-semibold">Translation status</span>
            <div className="flex flex-col gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button 
                  key={opt.value}
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${selectedStatus === opt.value ? 'bg-violet-600 text-white font-bold' : 'bg-white/5 text-purple-300 hover:bg-white/10'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sorting */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-purple-300 font-semibold">Sort results by</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#131F33] border border-white/10 rounded-xl py-2.5 px-3 text-purple-200 text-xs outline-none focus:border-violet-500 cursor-pointer text-left"
            >
              <option value="popular">🔥 Most read & popular</option>
              <option value="newest">📅 Newest added</option>
              <option value="chapters">📚 Most chapters published</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1">
        {/* Genre Quick Ribbon (Horizontal scrolling) */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 select-none scrollbar-none">
          {GENRES.map((genre) => (
            <button 
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all border cursor-pointer ${selectedGenre === genre ? 'bg-gradient-to-r from-violet-600 to-rose-500 border-violet-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-purple-300 hover:bg-white/10'}`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Catalog results count info */}
        <div className="flex justify-between items-center mb-6 text-xs text-purple-400">
          <span>Found <span className="text-violet-400 font-bold">{filteredNovels.length}</span> matching novels</span>
          <span>Advanced grid view</span>
        </div>

        {/* Novels Grid */}
        {filteredNovels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredNovels.map((novel) => (
              <NovelCard 
                key={novel.id}
                novel={novel}
                isBookmarked={bookmarks.includes(novel.id)}
                onBookmarkToggle={onBookmarkToggle}
                onClick={onNovelClick}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-16 text-center rounded-3xl border border-white/5 flex flex-col items-center justify-center">
            <Layers size={48} className="text-purple-500 mb-3 opacity-60 animate-bounce" />
            <h4 className="font-bold text-lg text-white mb-1">No matching novels</h4>
            <p className="text-xs text-purple-300/80 max-w-sm leading-relaxed mb-4">The current filters don’t match any novels. Try a different filter or search.</p>
            <button 
              onClick={handleReset}
              className="px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-500 transition-all cursor-pointer"
            >
              Reset all library filters
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
