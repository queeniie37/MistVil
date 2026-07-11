import React, { useState } from "react";
import { Announcement, UserProfile } from "../types";
import { Megaphone, Plus, Trash2, Calendar, User, Sparkles, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AnnouncementsViewProps {
  announcements: Announcement[];
  currentUser: UserProfile | null;
  onAddAnnouncement: (title: string, content: string) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export default function AnnouncementsView({
  announcements,
  currentUser,
  onAddAnnouncement,
  onDeleteAnnouncement,
}: AnnouncementsViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const isOwner = currentUser?.role === "owner" || currentUser?.email === "mistvil112@gmail.com";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAddAnnouncement(title.trim(), content.trim());
    setTitle("");
    setContent("");
    setIsAdding(false);
  };

  return (
    <div id="announcements-view-container" className="space-y-6 max-w-4xl mx-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-brand-800/40 pb-4 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-cairo text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-brand-400" />
            <span>مركز الإعلانات والبيانات العامة الفاخرة</span>
          </h1>
          <p className="text-gray-400 text-xs font-light mt-1 font-cairo">
            ابق على اطلاع بآخر أخبار الترجمات، تحديثات الفصول، والفعاليات الثقافية بموقع بيري مست.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2.5 bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-xs font-cairo rounded-xl transition shadow-[0_4px_12px_rgba(56,132,116,0.3)] hover:scale-[1.01] flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إعلان جديد</span>
          </button>
        )}
      </div>

      {/* Add Announcement Form Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-950 border border-brand-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-brand-800/40 pb-3">
                <h3 className="text-base font-bold text-white font-cairo flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-brand-400" />
                  <span>إنشاء إعلان عام جديد</span>
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1.5 hover:bg-brand-900 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">عنوان الإعلان *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تحديث عاجل لفصل رواية ملك السحر"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-brand-900 border border-brand-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">تفاصيل الإعلان *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="اكتب المحتوى الكامل للإعلان هنا..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-brand-900 border border-brand-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-brand-500 text-right resize-none font-light"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 bg-brand-900 hover:bg-brand-800 border border-brand-800 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs font-cairo rounded-xl transition cursor-pointer"
                  >
                    نشر الإعلان
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-16 bg-brand-900/10 rounded-2xl border border-brand-800/40">
            <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-3 stroke-1" />
            <p className="text-gray-400 text-sm font-cairo">لا توجد إعلانات منشورة حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {announcements.map((ann) => (
              <motion.div
                key={ann.id}
                layout
                className="bg-brand-900/30 border border-brand-800/40 hover:border-brand-500/30 p-5 rounded-2xl space-y-3 transition backdrop-blur-md relative overflow-hidden shadow-sm"
              >
                {/* Visual Accent */}
                <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-brand-400 to-brand-600"></div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white font-cairo flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      <span>{ann.title}</span>
                    </h2>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-brand-500" />
                        <span>{ann.date}</span>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-brand-500" />
                        <span>الناشر: {ann.author}</span>
                      </span>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => {
                        if (window.confirm("هل تريد بالتأكيد حذف هذا الإعلان؟")) {
                          onDeleteAnnouncement(ann.id);
                        }
                      }}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white rounded-xl transition cursor-pointer"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-gray-300 text-xs md:text-sm font-light leading-relaxed whitespace-pre-line font-cairo pt-2 border-t border-brand-800/20">
                  {ann.content}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
