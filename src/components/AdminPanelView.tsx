import React, { useState } from "react";
import { Novel, Chapter, UserProfile, RoleRequest, PendingNovel, TrashItem } from "../types";
import { PlusCircle, Trash2, Database, FilePlus, RefreshCw, Activity, CheckCircle, AlertTriangle, Lock, LogIn, LogOut, ShieldAlert, Check, X, ShieldCheck, RefreshCcw, Eye, Star, User, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelViewProps {
  novels: Novel[];
  currentUser: UserProfile | null;
  roleRequests: RoleRequest[];
  pendingNovels: PendingNovel[];
  trashBin: TrashItem[];
  registeredUsers: UserProfile[];
  onApproveRole: (requestId: string) => void;
  onRejectRole: (requestId: string) => void;
  onApproveNovel: (requestId: string) => void;
  onRejectNovel: (requestId: string) => void;
  onRestoreTrashItem: (itemId: string) => void;
  onDeleteTrashItemPermanently: (itemId: string) => void;
  onAddNovel: (novel: Novel) => void;
  onDeleteNovel: (novelId: string) => void;
  onAddChapter: (novelId: string, chapter: Chapter) => void;
  onUpdateUserRole: (email: string, role: 'reader' | 'translator' | 'writer' | 'owner') => void;
  onResetData: () => void;
}

export default function AdminPanelView({
  novels,
  currentUser,
  roleRequests,
  pendingNovels,
  trashBin,
  registeredUsers,
  onApproveRole,
  onRejectRole,
  onApproveNovel,
  onRejectNovel,
  onRestoreTrashItem,
  onDeleteTrashItemPermanently,
  onAddNovel,
  onDeleteNovel,
  onAddChapter,
  onUpdateUserRole,
  onResetData
}: AdminPanelViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pending-novels" | "role-requests" | "manage-ranks" | "trash-bin" | "add-novel-chapters" | "stats">("pending-novels");

  // Novel Form State
  const [novelTitle, setNovelTitle] = useState("");
  const [novelAuthor, setNovelAuthor] = useState("");
  const [novelTranslator, setNovelTranslator] = useState("");
  const [novelCover, setNovelCover] = useState("");
  const [novelDesc, setNovelDesc] = useState("");
  const [novelStatus, setNovelStatus] = useState<"مستمرة" | "مكتملة">("مستمرة");
  const [novelGenres, setNovelGenres] = useState("");
  const [novelTags, setNovelTags] = useState("");
  const [novelSuccessMsg, setNovelSuccessMsg] = useState("");

  // Chapter Form State
  const [selectedNovelId, setSelectedNovelId] = useState("");
  const [chapterNum, setChapterNum] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterNotes, setChapterNotes] = useState("");
  const [chapterSuccessMsg, setChapterSuccessMsg] = useState("");

  // double confirmation delete states
  const [deletingNovelId, setDeletingNovelId] = useState<string | null>(null);

  const handleNovelDeleteClick = (id: string) => {
    if (deletingNovelId === id) {
      onDeleteNovel(id);
      setDeletingNovelId(null);
    } else {
      setDeletingNovelId(id);
      setTimeout(() => setDeletingNovelId(null), 5000); // Reset after 5 seconds
    }
  };

  const handleAddNovelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novelTitle || !novelAuthor || !novelTranslator) {
      alert("الرجاء ملء الحقول الأساسية المطلوبة.");
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
      translator: novelTranslator.trim(),
      description: novelDesc.trim() || "لا يوجد وصف متوفر لهذه الرواية حالياً.",
      genres: novelGenres.split(",").map(g => g.trim()).filter(Boolean),
      tags: novelTags.split(",").map(t => t.trim()).filter(Boolean),
      rating: 4.8,
      chaptersCount: 0,
      status: novelStatus,
      viewCount: Math.floor(Math.random() * 5000) + 100,
      chapters: []
    };

    onAddNovel(newNovel);
    setNovelSuccessMsg(`تمت إضافة الرواية "${novelTitle}" بنجاح!`);
    
    // Clear Form
    setNovelTitle("");
    setNovelAuthor("");
    setNovelTranslator("");
    setNovelCover("");
    setNovelDesc("");
    setNovelGenres("");
    setNovelTags("");
    
    setTimeout(() => setNovelSuccessMsg(""), 5000);
  };

  const handleAddChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNovelId || !chapterNum || !chapterTitle || !chapterContent) {
      alert("الرجاء ملء تفاصيل الفصل ومحتواه أولاً.");
      return;
    }

    const paragraphs = chapterContent
      .split("\n")
      .map(p => p.trim())
      .filter(Boolean);

    const newChapter: Chapter = {
      id: `${selectedNovelId}-ch-${chapterNum}`,
      novelId: selectedNovelId,
      title: `Chapter ${chapterNum}: ${chapterTitle}`,
      chapterNumber: parseInt(chapterNum) || 1,
      publishDate: new Date().toISOString().split("T")[0],
      wordCount: paragraphs.reduce((acc, p) => acc + p.split(/\s+/).length, 0),
      content: paragraphs,
      translatorNotes: chapterNotes.trim() || undefined
    };

    onAddChapter(selectedNovelId, newChapter);
    setChapterSuccessMsg(`تم إدراج الفصل ${chapterNum} بنجاح للرواية المحددة!`);
    
    setChapterNum("");
    setChapterTitle("");
    setChapterContent("");
    setChapterNotes("");
    
    setTimeout(() => setChapterSuccessMsg(""), 5000);
  };

  const isOwner = currentUser?.role === "owner" || currentUser?.email === "mistvil112@gmail.com";

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4" dir="rtl">
        <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-cairo text-white">غير مصرح بالدخول</h2>
        <p className="text-xs text-gray-400 leading-relaxed font-cairo">
          لوحة الإدارة مخصصة فقط لمالك الموقع الإمبراطوري الأعلى. إذا كنت المالك، يرجى تسجيل الدخول بحسابك الخاص.
        </p>
      </div>
    );
  }

  return (
    <div id="admin-panel-container" className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-brand-800/40 pb-4 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-cairo text-white flex items-center gap-2">
            <Database className="w-7 h-7 text-brand-400" />
            <span>لوحة تحكم المالك والإدارة العليا 👑</span>
          </h1>
          <p className="text-gray-400 text-xs font-light mt-1 font-cairo">
            مرحباً بك يا صاحب الجلالة <strong className="text-white font-mono">{currentUser?.username}</strong>. مساحتك الكاملة للتحكم برتب الأعضاء، الفصول المضافة، والمحذوفات المعلقة.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (window.confirm("هل أنت متأكد من رغبتك في تصفير البيانات للوضع المصنعي؟ سيتم حذف جميع الفصول والروايات المضافة يدوياً.")) {
                onResetData();
              }
            }}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 hover:border-red-500 text-red-300 font-bold text-xs font-cairo rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تصفير البيانات بالكامل</span>
          </button>
        </div>
      </div>

      {/* Grid Stats Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-950/60 border border-brand-800/60 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 font-cairo block">الروايات المعلقة للموافقة</span>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">{pendingNovels.length} روايات</p>
        </div>
        <div className="bg-brand-950/60 border border-brand-800/60 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 font-cairo block">طلبات الانضمام كفريق</span>
          <p className="text-xl font-bold font-mono text-brand-400 mt-1">{roleRequests.filter(r => r.status === "pending").length} طلبات</p>
        </div>
        <div className="bg-brand-950/60 border border-brand-800/60 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 font-cairo block">سلة المحذوفات المعلقة</span>
          <p className="text-xl font-bold font-mono text-red-400 mt-1">{trashBin.length} كائنات</p>
        </div>
        <div className="bg-brand-950/60 border border-brand-800/60 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 font-cairo block">الأعضاء المسجلين</span>
          <p className="text-xl font-bold font-mono text-white mt-1">{registeredUsers.length} عضو</p>
        </div>
      </div>

      {/* Sub Tabs Controls */}
      <div className="flex bg-brand-950/60 p-1.5 rounded-xl border border-brand-800/60 shadow-inner w-full overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("pending-novels")}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo whitespace-nowrap cursor-pointer transition ${
            activeSubTab === "pending-novels" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          موافقة الروايات الجديدة ({pendingNovels.filter(p => p.status === "pending").length})
        </button>
        <button
          onClick={() => setActiveSubTab("role-requests")}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo whitespace-nowrap cursor-pointer transition ${
            activeSubTab === "role-requests" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          طلبات الترقية للفريق ({roleRequests.filter(r => r.status === "pending").length})
        </button>
        <button
          onClick={() => setActiveSubTab("manage-ranks")}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo whitespace-nowrap cursor-pointer transition ${
            activeSubTab === "manage-ranks" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          إدارة رتب الأعضاء ({registeredUsers.length})
        </button>
        <button
          onClick={() => setActiveSubTab("trash-bin")}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo whitespace-nowrap cursor-pointer transition ${
            activeSubTab === "trash-bin" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          سلة المحذوفات 🗑️ ({trashBin.length})
        </button>
        <button
          onClick={() => setActiveSubTab("add-novel-chapters")}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo whitespace-nowrap cursor-pointer transition ${
            activeSubTab === "add-novel-chapters" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          إضافة يدوية (روايات وفصول)
        </button>
        <button
          onClick={() => setActiveSubTab("stats")}
          className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold font-cairo whitespace-nowrap cursor-pointer transition ${
            activeSubTab === "stats" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          سجلات النظام ومترجم الشهر
        </button>
      </div>

      {/* Sub-tab view body */}
      <div className="bg-brand-900/10 rounded-2xl border border-brand-800/30 p-6 shadow-md">
        
        {/* PENDING NOVEL APPROVALS */}
        {activeSubTab === "pending-novels" && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-cairo text-white flex items-center gap-2 border-b border-brand-800/30 pb-2">
              <Eye className="w-5 h-5 text-brand-400" />
              <span>طلبات الموافقة على تنزيل الروايات</span>
            </h3>

            {pendingNovels.filter(p => p.status === "pending").length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs font-cairo">
                لا توجد طلبات روايات معلقة في الانتظار حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingNovels.filter(p => p.status === "pending").map(req => (
                  <div key={req.id} className="p-5 rounded-2xl bg-brand-950/60 border border-brand-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex gap-4 items-start">
                      <img src={req.novel.coverImage} className="w-16 h-24 object-cover rounded-xl border border-brand-800 shrink-0" alt={req.novel.title} />
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-base font-cairo">{req.novel.title}</h4>
                        <p className="text-xs text-gray-400 font-mono">الوسم التقني: {req.novel.id}</p>
                        <p className="text-xs text-gray-400 font-cairo">مقدم الطلب: <strong className="text-brand-300">{req.submittedBy}</strong> &bull; تاريخ الرفع: {req.date}</p>
                        <p className="text-xs text-gray-500 font-cairo max-w-xl line-clamp-2">{req.novel.description}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                      <button
                        onClick={() => onRejectNovel(req.id)}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold font-cairo transition cursor-pointer"
                      >
                        رفض
                      </button>
                      <button
                        onClick={() => onApproveNovel(req.id)}
                        className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-xs font-bold font-cairo transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>موافقة ونشر</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ROLE JOIN REQUESTS */}
        {activeSubTab === "role-requests" && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-cairo text-white flex items-center gap-2 border-b border-brand-800/30 pb-2">
              <User className="w-5 h-5 text-brand-400" />
              <span>طلبات الانضمام كفريق العمل (مترجم / كاتب)</span>
            </h3>

            {roleRequests.filter(r => r.status === "pending").length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs font-cairo">
                لا توجد طلبات انضمام معلقة حالياً.
              </div>
            ) : (
              <div className="space-y-3">
                {roleRequests.filter(r => r.status === "pending").map(req => (
                  <div key={req.id} className="p-4 rounded-xl bg-brand-950/60 border border-brand-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm font-cairo">{req.username}</h4>
                        <span className="text-[10px] bg-brand-800 text-brand-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                          {req.requestedRole === "translator" ? "طلب مترجم" : "طلب كاتب"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">البريد: {req.email} &bull; تاريخ الطلب: {req.date}</p>
                    </div>

                    <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => onRejectRole(req.id)}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold font-cairo transition cursor-pointer"
                      >
                        رفض الطلب
                      </button>
                      <button
                        onClick={() => onApproveRole(req.id)}
                        className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-xs font-bold font-cairo transition cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>قبول وتفعيل الرتبة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MANAGE MEMBER RANKS */}
        {activeSubTab === "manage-ranks" && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-cairo text-white flex items-center gap-2 border-b border-brand-800/30 pb-2">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
              <span>إدارة رتب وصلاحيات الأعضاء المسجلين بالمنصة</span>
            </h3>

            <div className="space-y-3">
              {registeredUsers.map(user => (
                <div key={user.email} className="p-4 rounded-xl bg-brand-950/60 border border-brand-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-white text-sm font-cairo">{user.username} {user.email === "mistvil112@gmail.com" && "👑"}</h4>
                    <p className="text-xs text-gray-400 font-mono">بريد: {user.email} &bull; رتبة حالية: <span className="text-brand-300 font-bold uppercase">{user.role || "reader"}</span></p>
                  </div>

                  {user.email !== "mistvil112@gmail.com" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-cairo">تغيير الرتبة:</span>
                      <select
                        value={user.role || "reader"}
                        onChange={(e) => onUpdateUserRole(user.email, e.target.value as any)}
                        className="bg-brand-900 border border-brand-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="reader">قارئ (Reader)</option>
                        <option value="translator">مترجم (Translator)</option>
                        <option value="writer">كاتب (Writer)</option>
                        <option value="owner">مالك (Owner)</option>
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-lg font-bold font-cairo">
                      المالك والمنشئ الأعلى (محمي)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRASH BIN */}
        {activeSubTab === "trash-bin" && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-cairo text-white flex items-center gap-2 border-b border-brand-800/30 pb-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>سلة المحذوفات ومهملات الموقع 🗑️</span>
            </h3>

            {trashBin.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs font-cairo">
                سلة المحذوفات فارغة تماماً. يا لها من نظافة!
              </div>
            ) : (
              <div className="space-y-3">
                {trashBin.map(item => (
                  <div key={item.id} className="p-4 rounded-xl bg-brand-950/80 border border-brand-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          item.type === "novel" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}>
                          {item.type === "novel" ? "رواية" : "فصل"}
                        </span>
                        <h4 className="font-bold text-white text-xs md:text-sm font-cairo">{item.title}</h4>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono">حُذف في: {item.deletedAt}</p>
                    </div>

                    <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => onDeleteTrashItemPermanently(item.id)}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold font-cairo transition cursor-pointer"
                        title="حذف نهائي لا يمكن استرجاعه"
                      >
                        حذف نهائي
                      </button>
                      <button
                        onClick={() => onRestoreTrashItem(item.id)}
                        className="px-4 py-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs font-bold font-cairo transition cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        <span>استعادة الكيان</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MANUAL ADDITIONS */}
        {activeSubTab === "add-novel-chapters" && (
          <div className="space-y-8">
            {/* Quick Novel Add Form */}
            <form onSubmit={handleAddNovelSubmit} className="space-y-4">
              <h3 className="text-base font-bold font-cairo text-white flex items-center gap-2 border-b border-brand-800/30 pb-2">
                <PlusCircle className="w-5 h-5 text-brand-400" />
                <span>إضافة رواية جديدة يدوياً للكتالوج الأساسي</span>
              </h3>

              {novelSuccessMsg && (
                <div className="p-4 bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{novelSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">اسم الرواية (باللغة الإنجليزية) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Path of the Magic Cult"
                    value={novelTitle}
                    onChange={(e) => setNovelTitle(e.target.value)}
                    className="w-full bg-brand-950 border border-brand-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">المؤلف الأصلي *</label>
                  <input
                    type="text"
                    required
                    value={novelAuthor}
                    onChange={(e) => setNovelAuthor(e.target.value)}
                    className="w-full bg-brand-950 border border-brand-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none animate-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">المترجم المسؤول *</label>
                  <input
                    type="text"
                    required
                    value={novelTranslator}
                    onChange={(e) => setNovelTranslator(e.target.value)}
                    className="w-full bg-brand-950 border border-brand-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold font-cairo">حالة الفصول المترجمة</label>
                  <select
                    value={novelStatus}
                    onChange={(e) => setNovelStatus(e.target.value as any)}
                    className="w-full bg-brand-950 border border-brand-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
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
                      id="admin-novel-cover-file"
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
                              htmlFor="admin-novel-cover-file"
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
                        htmlFor="admin-novel-cover-file"
                        className="flex-grow flex flex-col items-center justify-center border border-dashed border-brand-800 hover:border-brand-500 bg-brand-950/40 rounded-xl p-3.5 cursor-pointer transition"
                      >
                        <Upload className="w-5 h-5 text-gray-500 mb-1" />
                        <span className="text-[10px] text-gray-400 font-cairo">اضغط لإرفاق صورة الغلاف (PNG / JPG)</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold font-cairo">ملخص قصة الرواية (Synopsis)</label>
                <textarea
                  rows={3}
                  value={novelDesc}
                  onChange={(e) => setNovelDesc(e.target.value)}
                  className="w-full bg-brand-950 border border-brand-800 rounded-xl p-3 text-xs text-white focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-xs font-cairo rounded-xl transition cursor-pointer"
                >
                  حفظ الرواية الإمبراطورية
                </button>
              </div>
            </form>

            {/* List of current novels for deletion management */}
            <div className="space-y-3 pt-6 border-t border-brand-800/30">
              <h4 className="text-xs text-gray-400 font-bold font-cairo">روايات الكتالوج الأساسي النشطة (تأكيد الحذف مرتين ونقل للسلة)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {novels.map(n => (
                  <div key={n.id} className="p-4 rounded-xl bg-brand-950/60 border border-brand-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img src={n.coverImage} className="w-10 h-14 object-cover rounded border border-brand-800" alt={n.title} />
                      <div>
                        <h5 className="font-bold text-white text-xs font-cairo">{n.title}</h5>
                        <span className="text-[9px] bg-brand-800 px-2 py-0.5 rounded text-brand-300 font-cairo font-medium">
                          {n.chapters.length} فصول منشورة
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleNovelDeleteClick(n.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-cairo cursor-pointer transition flex items-center gap-1 ${
                        deletingNovelId === n.id
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingNovelId === n.id ? "اضغط مجدداً للتأكيد النهائي والنقل للسلة 🗑️" : "حذف الرواية"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM STATUS & LOGS */}
        {activeSubTab === "stats" && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-cairo text-white flex items-center gap-2 border-b border-brand-800/30 pb-2">
              <Activity className="w-5 h-5 text-brand-400" />
              <span>سجلات النظام والأمان التفاعلي للمنصة</span>
            </h3>

            <div className="bg-brand-950/60 p-5 rounded-2xl border border-brand-800/60 text-right space-y-4">
              <h4 className="text-xs font-bold text-brand-300 font-cairo">سجل نشاط الخادم والمنصة (Live Action Logs)</h4>
              
              <div className="bg-brand-950 p-4 rounded-xl border border-brand-800/60 font-mono text-[11px] text-gray-400 space-y-2 h-44 overflow-y-auto" dir="ltr">
                <div>[08:52:13] SYSTEM: Firewall verified. Core portal online at 0.0.0.0:3000</div>
                <div>[11:21:40] OWNER: Logged in safely using secure credentials.</div>
                <div>[12:15:02] DATABASE: Synchronized 2 registered readers with mock cultivation records</div>
                <div>[12:30:19] SECURITY: Blocked unauthorized request from guest to access AdminPanelView</div>
                <div>[13:00:05] SYSTEM: Rendered interactive MistVil user interface in iframe preview mode</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
