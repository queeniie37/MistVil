import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Settings, Play, Pause, Bot, MessageSquare, ChevronLeft, ChevronRight,
  BookMarked, Check, HelpCircle, Sparkles, Send, Bookmark, FileText, Globe
} from "lucide-react";
import { Chapter, Novel, ReadingSettings, BookmarkedParagraph, ChapterComment } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface NovelReaderViewProps {
  novel: Novel;
  chapter: Chapter;
  settings: ReadingSettings;
  bookmarks: BookmarkedParagraph[];
  onBack: () => void;
  onUpdateSettings: (settings: ReadingSettings) => void;
  onAddBookmark: (bookmark: Omit<BookmarkedParagraph, "id" | "bookmarkedAt">) => void;
  onRemoveBookmark: (id: string) => void;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onChapterCompleted: (novelId: string, chapterId: string, percentage: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function NovelReaderView({
  novel,
  chapter,
  settings,
  bookmarks,
  onBack,
  onUpdateSettings,
  onAddBookmark,
  onRemoveBookmark,
  onNextChapter,
  onPrevChapter,
  onChapterCompleted,
  hasPrev,
  hasNext
}: NovelReaderViewProps) {
  // UI Panels Toggles
  const [showSettings, setShowSettings] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Active Tooltips/Overlays
  const [activeTerm, setActiveTerm] = useState<{ term: string; translation: string; explanation: string } | null>(null);
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null);
  const [customBookmarkNote, setCustomBookmarkNote] = useState("");

  // Auto Scroll States
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);

  // AI Assistant States
  const [aiQuery, setAiQuery] = useState("");
  const [aiChat, setAiChat] = useState<{ sender: "user" | "bot"; text: string }[]>([
    {
      sender: "bot",
      text: `Hello! I am your MistAI smart translation assistant for "${novel.title}". Would you like an explanation of the cultural terms, magic system, cultivation ranks, or a quick summary of this chapter?`
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Comments State (stored in localStorage per chapter)
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");

  // Reading Progress scroll tracker
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const readerBodyRef = useRef<HTMLDivElement>(null);

  // Load comments
  useEffect(() => {
    const saved = localStorage.getItem(`comments-${chapter.id}`);
    if (saved) {
      setComments(JSON.parse(saved));
    } else {
      // Default Mock comments
      const defaults: ChapterComment[] = [
        {
          id: `c-1-${chapter.id}`,
          chapterId: chapter.id,
          username: "NovelEnthusiast",
          userAvatar: "https://picsum.photos/seed/user1/40/40",
          content: "Excellent translation flow and atmospheric rendering! Thanks to the translation team for the incredible work. Can't wait for the next chapter!",
          createdAt: "3 hours ago",
          likes: 12
        },
        {
          id: `c-2-${chapter.id}`,
          chapterId: chapter.id,
          username: "SwordImmortal",
          userAvatar: "https://picsum.photos/seed/user2/40/40",
          content: "The interactive glossary terms are incredibly helpful. It's so much easier to appreciate the cultivator vows and Qi dynamics with these details. Absolute masterpiece!",
          createdAt: "6 hours ago",
          likes: 8
        }
      ];
      setComments(defaults);
      localStorage.setItem(`comments-${chapter.id}`, JSON.stringify(defaults));
    }
  }, [chapter.id]);

  // Track scroll position to update reading percentage
  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const scrolled = (window.scrollY / docHeight) * 100;
      setScrollPercentage(scrolled);

      // Report chapter reading percentage to parent status tracker
      onChapterCompleted(novel.id, chapter.id, scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [chapter.id, novel.id]);

  // Auto Scroll Engine
  useEffect(() => {
    if (isAutoScrolling && settings.autoScrollSpeed > 0) {
      const speedMap = [100, 80, 60, 45, 35, 25, 18, 12, 8, 4]; // interval in ms
      const ms = speedMap[settings.autoScrollSpeed - 1] || 50;

      scrollIntervalRef.current = window.setInterval(() => {
        window.scrollBy({ top: 1, behavior: "auto" });
        // Check if hit bottom
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
          setIsAutoScrolling(false);
        }
      }, ms);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    }

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [isAutoScrolling, settings.autoScrollSpeed]);

  // Handle setting changes
  const updateSetting = (key: keyof ReadingSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  // Add Comment
  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const comment: ChapterComment = {
      id: `c-custom-${Date.now()}`,
      chapterId: chapter.id,
      username: "You (Active Reader)",
      userAvatar: "https://picsum.photos/seed/me/40/40",
      content: newCommentText,
      createdAt: "Just now",
      likes: 0
    };
    const updated = [comment, ...comments];
    setComments(updated);
    setNewCommentText("");
    localStorage.setItem(`comments-${chapter.id}`, JSON.stringify(updated));
  };

  // Like comment
  const handleLikeComment = (commentId: string) => {
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return { ...c, likes: c.likes + 1 };
      }
      return c;
    });
    setComments(updated);
    localStorage.setItem(`comments-${chapter.id}`, JSON.stringify(updated));
  };

  // Bookmark / Note Creator Callback
  const handleSaveParagraphBookmark = () => {
    if (selectedParagraphIndex === null) return;
    onAddBookmark({
      novelId: novel.id,
      novelTitle: novel.title,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterNumber: chapter.chapterNumber,
      paragraphIndex: selectedParagraphIndex,
      text: chapter.content[selectedParagraphIndex],
      note: customBookmarkNote.trim() || undefined
    });
    setSelectedParagraphIndex(null);
    setCustomBookmarkNote("");
  };

  // Check if paragraph is bookmarked
  const getParagraphBookmark = (index: number) => {
    return bookmarks.find(
      (b) => b.chapterId === chapter.id && b.paragraphIndex === index
    );
  };

  // Ask AI translation assistant
  const askAiAssistant = async (customPrompt?: string) => {
    const promptText = customPrompt || aiQuery;
    if (!promptText.trim()) return;

    setAiChat((prev) => [...prev, { sender: "user", text: promptText }]);
    setAiQuery("");
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/gemini/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelTitle: novel.title,
          chapterTitle: chapter.title,
          chapterContent: chapter.content.join("\n"),
          prompt: promptText
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiChat((prev) => [...prev, { sender: "bot", text: data.explanation }]);
      } else {
        throw new Error("Server response failed");
      }
    } catch (err) {
      // Local context-aware responses fallback in English
      setTimeout(() => {
        let answer = "I'm currently running in offline mode, but based on the local translation notes, I can clarify this for you:";

        const queryLower = promptText.toLowerCase();
        if (queryLower.includes("summarize") || queryLower.includes("summary") || queryLower.includes("outline")) {
          answer = `Summary of "${chapter.title}":\nThe protagonist experiences a pivotal moment in this chapter:\n- In "${novel.title}", the main character encounters mystical forces or critical dangers that force them to tap into their underlying potential.\n- The chapter demonstrates the initial cultivation breakthrough steps or battle maneuvers.\n- A mysterious figure or warning sign alerts the protagonist to stay on guard for major upcoming conflicts.`;
        } else if (queryLower.includes("qi") || queryLower.includes("cultivation")) {
          answer = "Qi (spirit energy) is the cornerstone of Xianxia cultivation fantasy. It represents the vital energy of the universe. Cultivators draw Qi into their meridians, refining it inside their Dantian (energy core) to transcend mortality, gain superhuman combat skills, and prolong their lifespans.";
        } else if (queryLower.includes("mist") || queryLower.includes("fog")) {
          answer = "The mist in 'Lord of the Misty Thrones' isn't just vapor—it is a corrupted ether storm that saps life-force. Only the Shadow Sentinels or individuals equipped with an Emerald Jade Lantern can safely traverse the outer rings.";
        } else if (queryLower.includes("cultural") || queryLower.includes("notes") || queryLower.includes("glossary")) {
          answer = "These chapters integrate Chinese and high-fantasy terminology, such as Dantian (the central elixir field), Dao (the natural order of the cosmos), and relic arrays. MistVil highlights these footnotes so Western readers can appreciate the cultural subtext.";
        } else {
          answer = `Regarding "${promptText}": This element is vital to the world-building of "${novel.title}". It underscores the protagonist's growth curve, forcing them to balance tactical adaptation with raw willpower on their road to supremacy.`;
        }

        setAiChat((prev) => [...prev, { sender: "bot", text: answer }]);
      }, 800);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Themes mapping based on settings
  const themeClasses = {
    darkFog: "bg-[#0b1311] text-gray-300",
    midnight: "bg-black text-[#8d99ae]",
    sepia: "bg-[#f4ecd8] text-[#4a3b32]",
    lightCream: "bg-[#fdfbf7] text-[#2c221e]"
  };

  const fontClasses = {
    Tajawal: "font-sans",
    Cairo: "font-sans",
    Amiri: "font-serif"
  };

  const lineHeights = {
    normal: "leading-normal",
    relaxed: "leading-relaxed",
    loose: "leading-loose"
  };

  const containerWidths = {
    compact: "max-w-xl",
    comfortable: "max-w-3xl",
    wide: "max-w-5xl"
  };

  return (
    <div
      id="novel-reader-frame"
      className={`min-h-screen transition-all duration-300 pb-24 ${themeClasses[settings.theme]} ${fontClasses[settings.fontFamily]}`}
      dir="ltr"
    >
      {/* Scroll Progress Bar at the top */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-brand-950 z-50">
        <div
          className="bg-brand-400 h-1 transition-all"
          style={{ width: `${scrollPercentage}%` }}
        ></div>
      </div>

      {/* Floating Header */}
      <header className="sticky top-0 bg-brand-950/90 border-b border-brand-800/40 px-4 py-3 backdrop-blur-md flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          <button
            id="btn-reader-back"
            onClick={onBack}
            className="p-1.5 rounded-lg bg-brand-900 text-brand-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <h2 className="text-xs text-brand-400 font-bold truncate max-w-[150px] sm:max-w-xs">{novel.title}</h2>
            <h1 className="text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs">{chapter.title}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Settings button */}
          <button
            id="btn-toggle-settings"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg cursor-pointer transition ${
              showSettings ? "bg-brand-500 text-white" : "bg-brand-900 text-brand-300 hover:text-white"
            }`}
            title="Reader Display Options"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Auto Scroll toggle */}
          <button
            id="btn-toggle-autoscroll"
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            className={`p-2 rounded-lg cursor-pointer transition ${
              isAutoScrolling ? "bg-brand-500 text-white animate-pulse" : "bg-brand-900 text-brand-300 hover:text-white"
            }`}
            title={isAutoScrolling ? "Pause Auto Scroll" : "Start Auto Scroll"}
          >
            {isAutoScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* AI translation assistant */}
          <button
            id="btn-toggle-ai-assistant"
            onClick={() => setShowAiAssistant(!showAiAssistant)}
            className={`p-2 rounded-lg cursor-pointer transition ${
              showAiAssistant ? "bg-brand-500 text-white" : "bg-brand-900 text-brand-300 hover:text-white"
            }`}
            title="Ask MistAI Assistant"
          >
            <Bot className="w-4 h-4" />
          </button>

          {/* Comments count */}
          <button
            id="btn-toggle-comments"
            onClick={() => setShowComments(!showComments)}
            className={`p-2 rounded-lg cursor-pointer transition ${
              showComments ? "bg-brand-500 text-white" : "bg-brand-900 text-brand-300 hover:text-white"
            }`}
            title="Chapter Comments"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chapter Content Body */}
      <main className="px-4 py-10 md:py-16">
        <div className={`mx-auto ${containerWidths[settings.containerWidth]} space-y-8`}>
          {/* Chapter Metadata Card */}
          <div className="text-center space-y-2 border-b border-brand-800/20 pb-8">
            <span className="text-xs text-brand-400 font-bold">Chapter {chapter.chapterNumber}</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">{chapter.title}</h1>
            <div className="flex justify-center gap-4 text-xs text-gray-400">
              <span>Translator: <span className="text-brand-300">{novel.translator}</span></span>
              <span>•</span>
              <span>{chapter.wordCount} words</span>
              <span>•</span>
              <span>{chapter.publishDate}</span>
            </div>
          </div>

          {/* Core Novel Text */}
          <div
            id="chapter-text-container"
            ref={readerBodyRef}
            className={`space-y-6 ${lineHeights[settings.lineHeight]}`}
            style={{ fontSize: `${settings.fontSize}px` }}
          >
            {chapter.content.map((paragraph, index) => {
              const bookmark = getParagraphBookmark(index);

              // Simple parser to underline terms in termsMap
              let parsedText: React.ReactNode = paragraph;
              if (chapter.termsMap) {
                const terms = Object.keys(chapter.termsMap);
                for (const term of terms) {
                  const regex = new RegExp(`\\b(${term})\\b`, "gi");
                  if (paragraph.toLowerCase().includes(term.toLowerCase())) {
                    const parts = paragraph.split(regex);
                    parsedText = parts.map((part, pIdx) => {
                      if (part.toLowerCase() === term.toLowerCase()) {
                        const originalKey = terms.find(t => t.toLowerCase() === part.toLowerCase()) || term;
                        return (
                          <span
                            key={pIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTerm({
                                term: originalKey,
                                translation: chapter.termsMap![originalKey].translation,
                                explanation: chapter.termsMap![originalKey].explanation
                              });
                            }}
                            className="underline decoration-dotted decoration-brand-400 text-brand-300 hover:text-brand-200 cursor-help font-bold"
                          >
                            {part}
                          </span>
                        );
                      }
                      return part;
                    });
                  }
                }
              }

              return (
                <div
                  key={index}
                  className="relative group p-3 rounded-lg hover:bg-brand-500/5 transition duration-200 text-left"
                >
                  {/* Text of the paragraph */}
                  <p className="whitespace-pre-wrap">{parsedText}</p>

                  {/* Translator inline footnote for this paragraph */}
                  {chapter.translationNotesMap && chapter.translationNotesMap[index] && (
                    <div className="mt-2 text-xs bg-brand-500/10 border-l-2 border-brand-400 p-2 text-brand-300/90 font-mono flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{chapter.translationNotesMap[index]}</span>
                    </div>
                  )}

                  {/* Bookmark and Note icon indicator */}
                  {bookmark && (
                    <div className="absolute top-2 right-2 flex gap-1.5 items-center">
                      <div
                        className="bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded text-[10px] font-mono border border-brand-500/30 flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          setSelectedParagraphIndex(index);
                          setCustomBookmarkNote(bookmark.note || "");
                        }}
                      >
                        <Bookmark className="w-3 h-3 fill-brand-300" />
                        {bookmark.note && <span className="text-[9px]">Has Note</span>}
                      </div>
                    </div>
                  )}

                  {/* Inline Action HUD on Hover */}
                  {!bookmark && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-brand-950/90 border border-brand-800 rounded-lg p-1 shadow">
                      <button
                        onClick={() => {
                          setSelectedParagraphIndex(index);
                          setCustomBookmarkNote("");
                        }}
                        className="p-1 hover:bg-brand-800 rounded text-brand-300 hover:text-white cursor-pointer"
                        title="Add Bookmark or Reading Note"
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chapter Translator Summary Footer Notes */}
          {chapter.translatorNotes && (
            <div className="p-5 rounded-2xl bg-brand-900/20 border border-brand-800/40 space-y-2 mt-12 text-xs md:text-sm text-left">
              <h3 className="font-bold text-brand-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>Translator Footnotes & Notes:</span>
              </h3>
              <p className="text-gray-300 leading-relaxed font-light">{chapter.translatorNotes}</p>
            </div>
          )}

          {/* Next/Previous Chapter Buttons */}
          <div className="flex justify-between gap-4 pt-12 border-t border-brand-800/20">
            <button
              id="btn-prev-chapter"
              onClick={onPrevChapter}
              disabled={!hasPrev}
              className={`flex-1 px-4 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                hasPrev
                  ? "bg-brand-900 border-brand-800 text-brand-300 hover:bg-brand-800 cursor-pointer"
                  : "bg-brand-950/20 border-brand-950 text-gray-600 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Chapter</span>
            </button>

            <button
              id="btn-next-chapter"
              onClick={onNextChapter}
              disabled={!hasNext}
              className={`flex-1 px-4 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                hasNext
                  ? "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white border-transparent cursor-pointer"
                  : "bg-brand-950/20 border-brand-950 text-gray-600 cursor-not-allowed"
              }`}
            >
              <span>Next Chapter</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER BAR FOR READING FEEDBACK */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-950 border-t border-brand-800/40 p-4 z-30 flex items-center justify-center gap-2">
        <span className="text-xs text-gray-400 font-light">You have read {Math.round(scrollPercentage)}% of this chapter</span>
      </div>

      {/* SETTINGS OVERLAY PANEL (Drawer-style on Right) */}
      <AnimatePresence>
        {showSettings && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSettings(false)}
            ></div>
            <motion.div
              id="reader-settings-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-brand-950 border-l border-brand-800 text-white z-50 p-6 space-y-6 overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-800/30 pb-4">
                <h3 className="text-base font-bold">Customize Reader</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-brand-900 rounded text-gray-400 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Theme selection */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-400 font-medium">Reader Theme</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateSetting("theme", "darkFog")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                      settings.theme === "darkFog" ? "border-brand-500 bg-brand-900" : "border-brand-800 bg-[#0b1311]"
                    }`}
                  >
                    Dark Fog
                  </button>
                  <button
                    onClick={() => updateSetting("theme", "midnight")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                      settings.theme === "midnight" ? "border-brand-500 bg-brand-900" : "border-brand-800 bg-black text-[#8d99ae]"
                    }`}
                  >
                    Midnight
                  </button>
                  <button
                    onClick={() => updateSetting("theme", "sepia")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                      settings.theme === "sepia" ? "border-brand-500 bg-[#eadeca]" : "border-brand-800 bg-[#f4ecd8] text-[#4a3b32]"
                    }`}
                  >
                    Sepia
                  </button>
                  <button
                    onClick={() => updateSetting("theme", "lightCream")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                      settings.theme === "lightCream" ? "border-brand-500 bg-white" : "border-brand-800 bg-[#fdfbf7] text-[#2c221e]"
                    }`}
                  >
                    Light Cream
                  </button>
                </div>
              </div>

              {/* Font selection */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-400 font-medium">Font Family</h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Tajawal", "Cairo", "Amiri"] as const).map((font) => (
                    <button
                      key={font}
                      onClick={() => updateSetting("fontFamily", font)}
                      className={`py-2 rounded-lg border text-xs transition ${
                        settings.fontFamily === font ? "border-brand-500 bg-brand-900 font-bold" : "border-brand-800 bg-brand-900/30"
                      }`}
                    >
                      {font === "Amiri" ? "Serif" : "Sans"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Font Size</span>
                  <span className="text-brand-300 font-mono font-bold">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="32"
                  value={settings.fontSize}
                  onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))}
                  className="w-full accent-brand-400"
                />
              </div>

              {/* Line height */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-400 font-medium">Line Spacing</h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["normal", "relaxed", "loose"] as const).map((lh) => (
                    <button
                      key={lh}
                      onClick={() => updateSetting("lineHeight", lh)}
                      className={`py-2 rounded-lg border text-xs transition ${
                        settings.lineHeight === lh ? "border-brand-500 bg-brand-900 font-bold" : "border-brand-800 bg-brand-900/30"
                      }`}
                    >
                      {lh === "normal" ? "Normal" : lh === "relaxed" ? "Relaxed" : "Loose"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Container width */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-400 font-medium">Reading Container Width</h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["compact", "comfortable", "wide"] as const).map((width) => (
                    <button
                      key={width}
                      onClick={() => updateSetting("containerWidth", width)}
                      className={`py-2 rounded-lg border text-xs transition ${
                        settings.containerWidth === width ? "border-brand-500 bg-brand-900 font-bold" : "border-brand-800 bg-brand-900/30"
                      }`}
                    >
                      {width === "compact" ? "Narrow" : width === "comfortable" ? "Mid" : "Wide"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Scroll Speed */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Auto Scroll Speed</span>
                  <span className="text-brand-300 font-mono font-bold">
                    {settings.autoScrollSpeed === 0 ? "Off" : `${settings.autoScrollSpeed}/10`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={settings.autoScrollSpeed}
                  onChange={(e) => updateSetting("autoScrollSpeed", parseInt(e.target.value))}
                  className="w-full accent-brand-400"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* INTERACTIVE MISTAI TRANSLATION ASSISTANT DRAWER */}
      <AnimatePresence>
        {showAiAssistant && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowAiAssistant(false)}
            ></div>
            <motion.div
              id="ai-assistant-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-0 bottom-0 w-80 sm:w-96 bg-brand-950 border-r border-brand-800 text-white z-50 p-5 flex flex-col justify-between shadow-2xl text-left"
            >
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-brand-800/30 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg border border-brand-500/20 text-brand-300">
                      <Bot className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">MistAI Translation Assistant</h3>
                      <p className="text-[10px] text-gray-400 font-light font-mono">Xianxia Lore Clarifier</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiAssistant(false)}
                    className="p-1 hover:bg-brand-900 rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Chat Log History */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-2">
                  {aiChat.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === "user" ? "ml-auto items-end text-right" : "mr-auto items-start text-left"
                      }`}
                    >
                      <span className="text-[9px] text-gray-500 font-semibold mb-1">
                        {msg.sender === "user" ? "You" : "MistAI Companion"}
                      </span>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed font-light ${
                          msg.sender === "user"
                            ? "bg-brand-600 text-white rounded-tr-none text-left"
                            : "bg-brand-900/60 text-gray-200 border border-brand-800/60 rounded-tl-none text-left"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="flex flex-col items-start max-w-[85%] mr-auto">
                      <span className="text-[9px] text-gray-500 font-semibold mb-1">MistAI Companion</span>
                      <div className="bg-brand-900/60 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-brand-300">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Channelling lore core energy...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick helpers questions buttons */}
                <div className="pt-2 border-t border-brand-800/20 space-y-2 shrink-0">
                  <p className="text-[10px] text-gray-400 font-bold">Quick Inquiries:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => askAiAssistant("Summarize the main events of this chapter.")}
                      className="px-2.5 py-1 text-[10px] bg-brand-900 hover:bg-brand-800 border border-brand-800/60 text-brand-300 rounded-lg cursor-pointer"
                    >
                      Summarize Chapter
                    </button>
                    <button
                      onClick={() => askAiAssistant("Explain how Qi refining works in the meridian arrays.")}
                      className="px-2.5 py-1 text-[10px] bg-brand-900 hover:bg-brand-800 border border-brand-800/60 text-brand-300 rounded-lg cursor-pointer"
                    >
                      Explain Qi Flow
                    </button>
                    <button
                      onClick={() => askAiAssistant("Describe the cultural elements behind Dantian refining.")}
                      className="px-2.5 py-1 text-[10px] bg-brand-900 hover:bg-brand-800 border border-brand-800/60 text-brand-300 rounded-lg cursor-pointer"
                    >
                      Dantian Concept
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Send Input Form */}
              <div className="pt-3 border-t border-brand-800/30 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Ask any question about translation or fantasy lore..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAiAssistant()}
                  className="flex-1 bg-brand-950 border border-brand-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-light"
                />
                <button
                  onClick={() => askAiAssistant()}
                  className="p-2 bg-brand-500 hover:bg-brand-400 rounded-xl text-white transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* COMMENTS DRAWER PANEL (Drawer-style on Left) */}
      <AnimatePresence>
        {showComments && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowComments(false)}
            ></div>
            <motion.div
              id="comments-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-0 bottom-0 w-80 sm:w-96 bg-brand-950 border-r border-brand-800 text-white z-50 p-5 flex flex-col justify-between shadow-2xl text-left"
            >
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-brand-800/30 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-brand-400" />
                    <div>
                      <h3 className="text-sm font-bold">Reader Discussions</h3>
                      <p className="text-[10px] text-gray-400 font-light">Community thoughts & fan theories</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowComments(false)}
                    className="p-1 hover:bg-brand-900 rounded text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Comments List Log */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-xs font-light">
                      Be the first to share your thoughts on this chapter!
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-brand-900/20 p-3 rounded-xl border border-brand-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={comment.userAvatar}
                              alt={comment.username}
                              className="w-7 h-7 rounded-full object-cover border border-brand-800"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-xs font-bold text-white">{comment.username}</span>
                          </div>
                          <span className="text-[10px] text-gray-500">{comment.createdAt}</span>
                        </div>
                        <p className="text-xs text-gray-300 font-light leading-relaxed">{comment.content}</p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className="text-[10px] text-gray-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Like</span>
                            <span className="font-mono bg-brand-950 px-1.5 py-0.5 rounded border border-brand-800">{comment.likes}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Comment Section Form */}
              <div className="pt-3 border-t border-brand-800/30 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Write your reaction or theory here..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  className="flex-1 bg-brand-950 border border-brand-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-light"
                />
                <button
                  onClick={handleAddComment}
                  className="px-3.5 py-2 bg-brand-500 hover:bg-brand-400 rounded-xl text-white font-bold text-xs transition cursor-pointer"
                >
                  Post
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* POPUP OVERLAY TO VIEW DETAILED EXPLANATION OF CLICKED KEYWORD/GLOSSARY TERM */}
      <AnimatePresence>
        {activeTerm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-950 border border-brand-500/40 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl relative text-left"
            >
              <div className="flex items-center gap-2 border-b border-brand-800/40 pb-2.5">
                <HelpCircle className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Term: {activeTerm.term}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">Original: {activeTerm.translation}</p>
                </div>
              </div>
              <p className="text-xs text-gray-300 font-light leading-relaxed">{activeTerm.explanation}</p>
              <button
                onClick={() => setActiveTerm(null)}
                className="w-full py-2 bg-brand-900 hover:bg-brand-800 text-brand-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close Explanation
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOOKMARK PARAGRAPH NOTE EDITOR MODAL */}
      <AnimatePresence>
        {selectedParagraphIndex !== null && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-950 border border-brand-500/30 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-brand-800/30 pb-2.5">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-brand-400" />
                  <span>Customize Bookmark / Note</span>
                </h3>
              </div>

              <div className="bg-brand-900/20 p-3 rounded-xl border border-brand-800 text-xs text-gray-400 line-clamp-3 text-left">
                {chapter.content[selectedParagraphIndex]}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Add your personal comment annotation (Optional):</label>
                <textarea
                  placeholder="Example: This paragraph hints at the return of the Sword Sovereign..."
                  value={customBookmarkNote}
                  onChange={(e) => setCustomBookmarkNote(e.target.value)}
                  className="w-full bg-brand-950 border border-brand-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 text-left font-light h-24 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveParagraphBookmark}
                  className="flex-1 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Save Bookmark
                </button>

                {getParagraphBookmark(selectedParagraphIndex) && (
                  <button
                    onClick={() => {
                      const existing = getParagraphBookmark(selectedParagraphIndex!);
                      if (existing) onRemoveBookmark(existing.id);
                      setSelectedParagraphIndex(null);
                    }}
                    className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Delete
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedParagraphIndex(null);
                    setCustomBookmarkNote("");
                  }}
                  className="px-4 py-2.5 bg-brand-900 hover:bg-brand-800 text-brand-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
