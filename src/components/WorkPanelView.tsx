import React, { useState } from "react";
import { Novel, PendingNovel, UserProfile, Chapter } from "../types";
import { PenTool, PlusCircle, CheckCircle2, Clock, AlertCircle, Sparkles, BookOpen, User, Flame, Award, ChevronLeft, Plus, Trash2, Upload, Image, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WorkPanelViewProps {
  currentUser: UserProfile | null;
  novels: Novel[];
  pendingNovels: PendingNovel[];
  onSubmitPendingNovel: (pending: PendingNovel) => void;
  onAddChapter: (novelId: string, chapter: Chapter) => void;
  onDeleteChapter: (novelId: string, chapterId: string) => void;
}

export default function WorkPanelView({
  currentUser,
  novels,
  pendingNovels,
  onSubmitPendingNovel,
  onAddChapter,
  onDeleteChapter
}: WorkPanelViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"my-novels" | "submit-novel" | "points" | "edit-request">("my-novels");
  
  // Submit novel state
  const [novelTitle, setNovelTitle] = useState("");
  const [novelAuthor, setNovelAuthor] = useState("");
  const [novelCover, setNovelCover] = useState("");
  const [novelDesc, setNovelDesc] = useState("");
  const [novelStatus, setNovelStatus] = useState<"مستمرة" | "مكتملة">("مستمرة");
  const [novelGenres, setNovelGenres] = useState("");
  const [novelTags, setNovelTags] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Add chapter state (specific to a novel)
  const [selectedNovelIdForChapter, setSelectedNovelIdForChapter] = useState<string | null>(null);
  const [chapterNum, setChapterNum] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterNotes, setChapterNotes] = useState("");
  const [chapterSuccessMsg, setChapterSuccessMsg] = useState("");

  const myNovels = novels.filter(n => n.translator.toLowerCase() === currentUser?.username.toLowerCase());
  const myPending = pendingNovels.filter(p => p.submittedBy.toLowerCase() === currentUser?.email.toLowerCase());

  const handleNovelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novelTitle || !novelAuthor) {
      alert("الرجاء ملء كافة الحقول الإجبارية النجمية (*)");
      return;
    }

    // Auto-generate safe unique ID from English Title
    const slug = novelTitle.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    const generatedId = `${slug || 'novel'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newNovel: Novel = {
      id: generatedId,
      title: novelTitle.trim(),
      englishTitle: novelTitle.trim(),
      coverImage: novelCover.trim() || "/src/assets/images/mistvil_brand_banner_1783795867538.jpg",
      author: novelAuthor.trim(),
      translator: currentUser?.username || "Translator",
      description: novelDesc.trim() || "لا يوجد وصف حالياً.",
      genres: novelGenres.split(",").map(g => g.trim()).filter(Boolean),
      tags: novelTags.split(",").map(t => t.trim()).filter(Boolean),
      rating: 4.8,
      chaptersCount: 0,
      status: novelStatus,
      viewCount: 150,
      chapters: []
    };

    const pendingEntry: PendingNovel = {
      id: `pending-${Date.now()}`,
      novel: newNovel,
      submittedBy: currentUser?.email || "",
      status: "pending",
      date: new Date().toISOString().split("T")[0]
    };

    onSubmitPendingNovel(pendingEntry);
    setSuccessMsg("تم رفع طلبك للموافقة على الرواية بنجاح! سيتم مراجعتها قريباً من قبل المالك.");
    
    // Reset form
    setNovelTitle("");
    setNovelCover("");
    setNovelDesc("");
    setNovelGenres("");
    setNovelTags("");

    setTimeout(() => setSuccessMsg(""), 6000);
  };

  const handleChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNovelIdForChapter || !chapterNum || !chapterTitle || !chapterContent) {
      alert("الرجاء إدخال كافة تفاصيل الفصل");
      return;
    }

    const paragraphs = chapterContent
      .split("\n")
      .map(p => p.trim())
      .filter(Boolean);

    const newChapter: Chapter = {
      id: `${selectedNovelIdForChapter}-ch-${chapterNum}`,
      novelId: selectedNovelIdForChapter,
      title: `Chapter ${chapterNum}: ${chapterTitle}`,
      chapterNumber: parseInt(chapterNum) || 1,
      publishDate: new Date().toISOString().split("T")[0],
      wordCount: paragraphs.reduce((acc, p) => acc + p.split(/\s+/).length, 0),
      content: paragraphs,
      translatorNotes: chapterNotes.trim() || undefined
    };

    onAddChapter(selectedNovelIdForChapter, newChapter);
    setChapterSuccessMsg(`تم إضافة الفصل ${chapterNum} بنجاح للرواية!`);
    
    setChapterNum("");
    setChapterTitle("");
    setChapterContent("");
    setChapterNotes("");

    setTimeout(() => setChapterSuccessMsg(""), 5000);
  };

  // Double confirmation delete state for chapter deletion
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  const triggerDeleteChapterWithConfirm = (novelId: string, chapterId: string) => {
    if (deletingChapterId === chapterId) {
      onDeleteChapter(novelId, chapterId);
      setDeletingChapterId(null);
    } else {
      setDeletingChapterId(chapterId);
      setTimeout(() => {
        setDeletingChapterId(null); // Cancel after 5 seconds if not clicked again
      }, 5000);
    }
  };

  return (
    <div id="work-panel-container" className="space-y-6 max-w-5xl mx-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-brand-800/40 pb-4 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-cairo text-white flex items-center gap-2">
            <PenTool className="w-7 h-7 text-brand-400" />
            <span>لوحة تحكم ومطوري الترجمة الفخمة 🌸</span>
          </h1>
          <p className="text-gray-400 text-xs font-light mt-1 font-cairo">
            مساحتك الإبداعية لتسجيل الروايات المترجمة، تنزيل الفصول الجديدة، ومتابعة رصيدك من النقاط والتفاعلات.
          </p>
        </div>
        
        <div className="bg-brand-950/80 px-4 py-2 border border-brand-800 rounded-xl flex items-center gap-3">
          <div className="text-left font-mono">
            <div className="text-[10px] text-gray-500 font-sans uppercase">XP Level</div>
            <div className="text-xs text-brand-300 font-bold">Lvl {currentUser?.level || 1} ({currentUser?.xp || 0} XP)</div>
          </div>
          <span className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-sm">
            👑
          </span>
        </div>
      </div>

      {/* Sub Tabs Controls */}
      <div className="flex bg-brand-950/60 p-1.5 rounded-xl border border-brand-800/60 shadow-inner w-full md:w-max overflow-x-auto">
        <button
          onClick={() => { setActiveSubTab("my-novels"); setSelectedNovelIdForChapter(null); }}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo cursor-pointer whitespace-nowrap transition ${
            activeSubTab === "my-novels" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          رواياتي المترجمة ({myNovels.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("submit-novel"); setSelectedNovelIdForChapter(null); }}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo cursor-pointer whitespace-nowrap transition ${
            activeSubTab === "submit-novel" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          تسجيل رواية جديدة للترجمة +
        </button>
        <button
          onClick={() => { setActiveSubTab("points"); setSelectedNovelIdForChapter(null); }}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo cursor-pointer whitespace-nowrap transition ${
            activeSubTab === "points" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          نظام النقاط والجوائز
        </button>
        <button
          onClick={() => { setActiveSubTab("edit-request"); setSelectedNovelIdForChapter(null); }}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo cursor-pointer whitespace-nowrap transition ${
            activeSubTab === "edit-request" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          طلب تعديل فصل
        </button>
      </div>

      {/* Body View */}
      <div className="bg-brand-900/10 rounded-2xl border border-brand-800/30 p-6 shadow-md">
        <AnimatePresence mode="wait">
          
          {/* MY NOVELS */}
          {activeSubTab === "my-novels" && !selectedNovelIdForChapter && (
            <motion.div
              key="my-novels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="border-b border-brand-800/30 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold font-cairo text-white">كتالوج الروايات المسؤول عنها</h3>
                <span className="text-xs text-gray-400 font-mono">رتبة العضو: {currentUser?.role === 'translator' ? "Certified Translator" : "Certified Writer"}</span>
              </div>

              {myNovels.length === 0 ? (
                <div className="text-center py-12 bg-brand-950/20 rounded-2xl border border-brand-800/30 space-y-4">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto stroke-1" />
                  <p className="text-gray-400 text-sm font-cairo">لا توجد روايات مسجلة باسمك حالياً.</p>
                  <button
                    onClick={() => setActiveSubTab("submit-novel")}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-xl cursor-pointer transition font-cairo"
                  >
                    سجل أول رواية لك الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myNovels.map(n => (
                    <div key={n.id} className="p-4 rounded-xl bg-brand-950/60 border border-brand-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <img src={n.coverImage} className="w-12 h-16 object-cover rounded border border-brand-800" alt={n.title} />
                        <div>
                          <h5 className="font-bold text-white text-xs font-cairo">{n.title}</h5>
                          <p className="text-[10px] text-gray-500 font-mono">{n.id}</p>
                          <span className="text-[9px] bg-brand-800 px-2 py-0.5 rounded text-brand-300 font-cairo font-medium inline-block mt-1">
                            {n.chapters.length} فصول منشورة
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedNovelIdForChapter(n.id)}
                        className="w-full sm:w-auto px-4 py-2 bg-brand-500/10 hover:bg-brand-500 text-brand-300 hover:text-white rounded-xl border border-brand-500/30 text-xs font-bold font-cairo transition cursor-pointer"
                      >
                        إدارة الفصول والفصل الجديد
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending novel list */}
              {myPending.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-brand-800/20">
                  <h4 className="text-xs font-bold text-gray-400 font-cairo">طلبات روايات قيد المراجعة والموافقة ({myPending.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myPending.map(p => (
                      <div key={p.id} className="p-4 rounded-xl bg-brand-950/30 border border-brand-800/40 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <img src={p.novel.coverImage} className="w-10 h-14 object-cover rounded border border-brand-800/40" alt={p.novel.title} />
                          <div>
                            <h5 className="font-bold text-gray-300 text-xs font-cairo">{p.novel.title}</h5>
                            <span className="text-[9px] text-gray-500">تم الرفع في: {p.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-400 text-[10px] font-bold font-cairo">
                          <Clock className="w-3 h-3" />
                          <span>في انتظار الموافقة</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ADD CHAPTER MODULAR VIEW */}
          {activeSubTab === "my-novels" && selectedNovelIdForChapter && (
            <motion.div
              key="add-chapter-flow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <button
                onClick={() => setSelectedNovelIdForChapter(null)}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-bold font-cairo transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                <span>العودة لقائمة الروايات المترجمة</span>
              </button>

              <div className="border-b border-brand-800/30 pb-3">
                <h3 className="text-base font-bold font-cairo text-white">إضافة فصول وتعديل رواية: {novels.find(n => n.id === selectedNovelIdForChapter)?.title}</h3>
              </div>

              {chapterSuccessMsg && (
                <div className="p-4 bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{chapterSuccessMsg}</span>
                </div>
              )}

              {/* Form Add Chapter */}
              <form onSubmit={handleChapterSubmit} className="space-y-4 bg-brand-950/40 p-5 rounded-2xl border border-brand-800/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">رقم الفصل الفني *</label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 12"
                      value={chapterNum}
                      onChange={(e) => setChapterNum(e.target.value)}
                      className="w-full bg-brand-900 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">عنوان الفصل (بالإنجليزي/العربي) *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: The New Realm Awakens"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      className="w-full bg-brand-900 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">نص الفصل الكامل (فقرة بكل سطر) *</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="ادخل أسطر الفصل هنا. كل سطر يمثل فقرة قراءة مخصصة ومستقلة لتسهيل القراءة والتعليق المباشر..."
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    className="w-full bg-brand-900 border border-brand-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right resize-y font-light h-48"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">هوامش المترجم وتوضيحاته (اختياري)</label>
                  <textarea
                    rows={2}
                    placeholder="أي ملاحظات تود إظهارها للقراء بأسفل الفصل..."
                    value={chapterNotes}
                    onChange={(e) => setChapterNotes(e.target.value)}
                    className="w-full bg-brand-900 border border-brand-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right resize-none h-16"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-xs font-cairo rounded-xl transition cursor-pointer"
                  >
                    نشر الفصل فوراً ⚡
                  </button>
                </div>
              </form>

              {/* Chapter Deletion list with Dual Confirmation */}
              <div className="space-y-3 pt-6 border-t border-brand-800/20">
                <h4 className="text-xs font-bold text-gray-400 font-cairo">الفصول المنشورة حالياً تحت إشرافك (التحكم والتعديل وحذف الفصل مرتين)</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {novels.find(n => n.id === selectedNovelIdForChapter)?.chapters.map(ch => (
                    <div key={ch.id} className="p-3 bg-brand-950/60 rounded-xl border border-brand-800/60 flex justify-between items-center gap-4">
                      <div>
                        <span className="text-xs font-bold text-white font-cairo">الفصل {ch.chapterNumber}: {ch.title}</span>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">عدد الكلمات: {ch.wordCount || 0} كلمة &bull; تم النشر في {ch.publishDate}</p>
                      </div>
                      
                      <button
                        onClick={() => triggerDeleteChapterWithConfirm(selectedNovelIdForChapter, ch.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-cairo cursor-pointer transition-all flex items-center gap-1.5 ${
                          deletingChapterId === ch.id
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{deletingChapterId === ch.id ? "اضغط مرة أخرى لحذف الفصل وإرساله للسلة 🗑️" : "حذف الفصل"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* REGISTER NEW NOVEL */}
          {activeSubTab === "submit-novel" && (
            <motion.div
              key="submit-novel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="border-b border-brand-800/30 pb-3">
                <h3 className="text-base font-bold font-cairo text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-brand-400" />
                  <span>تقديم طلب لتنزيل رواية جديدة تحت حسابك</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  سيتم إدراج هذه الرواية في لوحة موافقات المالك، وعند تفعيلها ستصبح مترجماً رسمياً لها وتتحكم بها من هنا.
                </p>
              </div>

              {successMsg && (
                <div className="p-4 bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleNovelSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">اسم الرواية (باللغة الإنجليزية) *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: Path of the Magic Cult"
                      value={novelTitle}
                      onChange={(e) => setNovelTitle(e.target.value)}
                      className="w-full bg-brand-950 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">المؤلف الأصلي *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: لوه تشينغ"
                      value={novelAuthor}
                      onChange={(e) => setNovelAuthor(e.target.value)}
                      className="w-full bg-brand-950 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">حالة الفصول</label>
                    <select
                      value={novelStatus}
                      onChange={(e) => setNovelStatus(e.target.value as any)}
                      className="w-full bg-brand-950 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right"
                    >
                      <option value="مستمرة">مستمرة (Ongoing)</option>
                      <option value="مكتملة">مكتملة (Completed)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">غلاف الرواية (بصيغة PNG أو JPG) *</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        id="novel-cover-file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith("image/png") && !file.type.startsWith("image/jpeg")) {
                              alert("عذراً، يجب أن يكون غلاف الرواية بصيغة PNG أو JPG فقط!");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setNovelCover(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {novelCover ? (
                        <div className="flex items-center gap-2 bg-brand-950 p-2 rounded-xl border border-brand-800 flex-grow">
                          <img src={novelCover} className="w-12 h-16 object-cover rounded border border-brand-800/60" alt="Cover Preview" />
                          <div className="text-right flex-grow">
                            <span className="text-[10px] text-emerald-400 font-bold block">✓ تم تحميل الغلاف</span>
                            <div className="flex gap-2 mt-1">
                              <label
                                htmlFor="novel-cover-file"
                                className="px-3 py-1 bg-brand-800 hover:bg-brand-700 text-white rounded-lg text-[9px] font-bold font-cairo cursor-pointer transition inline-block text-center"
                              >
                                تغيير الغلاف
                              </label>
                              <button
                                type="button"
                                onClick={() => setNovelCover("")}
                                className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded-lg text-[9px] font-bold font-cairo cursor-pointer transition"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="novel-cover-file"
                          className="flex-1 flex flex-col items-center justify-center border border-dashed border-brand-800 hover:border-brand-500 bg-brand-950/40 rounded-xl p-4 cursor-pointer transition"
                        >
                          <Upload className="w-5 h-5 text-gray-500 mb-1" />
                          <span className="text-[10px] text-gray-400 font-cairo">اضغط لإرفاق صورة الغلاف (PNG / JPG)</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">التصنيفات (Genres) - افصل بفاصلة</label>
                    <input
                      type="text"
                      placeholder="مثال: Xianxia, Martial Arts, Action"
                      value={novelGenres}
                      onChange={(e) => setNovelGenres(e.target.value)}
                      className="w-full bg-brand-950 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold font-cairo">الوسوم (Tags) - افصل بفاصلة</label>
                    <input
                      type="text"
                      placeholder="مثال: Overpowered, Magic System, Reincarnation"
                      value={novelTags}
                      onChange={(e) => setNovelTags(e.target.value)}
                      className="w-full bg-brand-950 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">قصة وملخص الرواية (Synopsis)</label>
                  <textarea
                    rows={4}
                    placeholder="اكتب هنا القصة المختصرة والحافز الروائي للعمل..."
                    value={novelDesc}
                    onChange={(e) => setNovelDesc(e.target.value)}
                    className="w-full bg-brand-950 border border-brand-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right resize-none h-28"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-xs font-cairo rounded-xl transition cursor-pointer"
                  >
                    إرسال الرواية للمراجعة والتدقيق
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* POINTS SYSTEM */}
          {activeSubTab === "points" && (
            <motion.div
              key="points"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="border-b border-brand-800/30 pb-3">
                <h3 className="text-base font-bold font-cairo text-white">نظام الترقية والـ XP والمترجم الفائز بموقع MistVil</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-brand-950/60 border border-brand-800 rounded-2xl space-y-2 text-center">
                  <Flame className="w-10 h-10 text-orange-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm font-cairo">معدل الفصول الأسبوعي</h4>
                  <p className="text-2xl font-black text-brand-300">{(myNovels.reduce((acc, n) => acc + n.chapters.length, 0) * 1.5).toFixed(0)} XP</p>
                  <p className="text-[10px] text-gray-500">مجموع الـ XP التراكمي لترجمة الفصول والمساهمة الفخمة</p>
                </div>

                <div className="p-5 bg-brand-950/60 border border-brand-800 rounded-2xl space-y-2 text-center">
                  <Award className="w-10 h-10 text-amber-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm font-cairo">لقب الشهر المرموق</h4>
                  <p className="text-lg font-bold text-white font-cairo">مترجم الروح الفضي</p>
                  <p className="text-[10px] text-gray-500">يُمنح اللقب بناء على تصويت القراء وتقييم جودة الصياغة</p>
                </div>

                <div className="p-5 bg-brand-950/60 border border-brand-800 rounded-2xl space-y-2 text-center">
                  <Sparkles className="w-10 h-10 text-brand-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm font-cairo">رابط الدعم الإمبراطوري</h4>
                  <p className="text-xs text-gray-400 font-cairo">متصل بحساب Paypal الخاص بك في ملفك الشخصي</p>
                  <p className="text-[10px] text-gray-500">يظهر للقراء بداخل الفصول لدعم جهودك بشكل مباشر!</p>
                </div>
              </div>

              <div className="bg-brand-950/40 p-5 rounded-2xl border border-brand-800/40 space-y-2 leading-relaxed">
                <h4 className="text-xs font-bold text-brand-300 font-cairo">إرشادات الجودة المعتمدة للترجمة:</h4>
                <ul className="text-xs text-gray-400 list-disc list-inside space-y-1 font-light font-cairo">
                  <li>يرجى تدقيق المصطلحات التكرارية وتفعيل منشئ المصطلحات لمساعدة القراء.</li>
                  <li>تجنب الترجمة الحرفية وركز على إيصال الفكرة بطريقة درامية ملائمة.</li>
                  <li>احرص على رفع الفصول بانتظام لعدم سحب الحجز والموافقة من الرواية.</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* EDIT REQUEST */}
          {activeSubTab === "edit-request" && (
            <motion.div
              key="edit-request"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="border-b border-brand-800/30 pb-3">
                <h3 className="text-base font-bold font-cairo text-white">إرسال طلب عاجل لتعديل محتوى فصل منشور</h3>
                <p className="text-xs text-gray-400 mt-1">إذا أردت تعديل رقم فصل أو تغيير محتوى نص كبير تواصل مع المالك من هنا.</p>
              </div>

              <div className="bg-brand-950/60 p-6 rounded-2xl border border-brand-800/80 space-y-4 max-w-lg mx-auto">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">الرواية المستهدفة</label>
                  <select className="w-full bg-brand-900 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white">
                    <option value="">-- اختر الرواية --</option>
                    {myNovels.map(n => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">رقم الفصل المطلوب تعديله</label>
                  <input type="number" placeholder="مثال: 5" className="w-full bg-brand-900 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">تفاصيل وسبب طلب التعديل</label>
                  <textarea rows={3} placeholder="اكتب هنا ما تود تغييره..." className="w-full bg-brand-900 border border-brand-800 rounded-xl p-3 text-xs text-white"></textarea>
                </div>

                <button
                  onClick={() => alert("تم تقديم طلب التعديل للمالك بنجاح!")}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs font-cairo rounded-xl transition cursor-pointer"
                >
                  إرسال الطلب للمالك ⚡
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
