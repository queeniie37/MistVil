import React, { useState, useEffect } from "react";
import { User, Mail, Lock, UserPlus, LogIn, LogOut, Award, Flame, Calendar, Edit3, Check, BookOpen, Sparkles, Clock, Compass, DollarSign, MessageSquare, Send, Heart, ShieldAlert, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ReadingStats, Novel, UserProfile, RoleRequest } from "../types";

interface UserProfileViewProps {
  stats: ReadingStats;
  novels: Novel[];
  readHistory: { [novelId: string]: string[] };
  onSelectNovel: (novelId: string) => void;
  onSelectChapter: (novelId: string, chapterId: string) => void;
  
  // Auth and global integration
  currentUser: UserProfile | null;
  registeredUsers: UserProfile[];
  roleRequests: RoleRequest[];
  onLogin: (email: string, pass: string) => boolean;
  onLogout: () => void;
  onUpdateUser: (updated: UserProfile) => void;
  onSendRoleRequest: (requestedRole: "translator" | "writer") => void;
}

const AVATARS = [
  { id: "monarch", label: "👑 Monarch", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "scholar", label: "📚 Scholar", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { id: "mage", label: "✨ Archmage", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { id: "assassin", label: "🗡️ Rogue", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  { id: "alchemist", label: "🧪 Alchemist", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { id: "wanderer", label: "🧭 Wanderer", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
];

export default function UserProfileView({
  stats,
  novels,
  readHistory,
  onSelectNovel,
  onSelectChapter,
  currentUser,
  registeredUsers,
  roleRequests,
  onLogin,
  onLogout,
  onUpdateUser,
  onSendRoleRequest
}: UserProfileViewProps) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  // Profile fields editing
  const [isEditingSupport, setIsEditingSupport] = useState(false);
  const [paypalInput, setPaypalInput] = useState("");
  const [telegramInput, setTelegramInput] = useState("");
  const [discordInput, setDiscordInput] = useState("");

  // Role Request Choice State
  const [roleSelection, setRoleSelection] = useState<"translator" | "writer">("translator");
  const [requestSuccess, setRequestSuccess] = useState("");

  // Fill in inputs when currentUser is loaded
  useEffect(() => {
    if (currentUser) {
      setPaypalInput(currentUser.paypal || "");
      setTelegramInput(currentUser.telegram || "");
      setDiscordInput(currentUser.discord || "");
    }
  }, [currentUser]);

  // Calculate dynamic rank title
  const getRankTitle = (role: string = "reader") => {
    if (role === "owner") return "Supreme Monarch of letters 👑";
    if (role === "translator") return "Prism Realm Translator 🔮";
    if (role === "writer") return "Genesis Book Creator ✍️";
    return "Mist Wanderer (Reader)";
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const success = onLogin(emailInput.trim(), passwordInput);
    if (success) {
      setSuccessMsg("Logged in successfully! Welcome back.");
      setEmailInput("");
      setPasswordInput("");
    } else {
      setErrorMsg("Invalid credentials. Please verify your email and password.");
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!usernameInput.trim()) {
      setErrorMsg("Please enter a username.");
      return;
    }

    const registeredList = [...registeredUsers];
    const exists = registeredList.some((u) => u.email.toLowerCase() === emailInput.trim().toLowerCase());
    if (exists) {
      setErrorMsg("An account with this email already exists.");
      return;
    }

    const newUser: UserProfile = {
      username: usernameInput.trim(),
      email: emailInput.trim().toLowerCase(),
      avatar: "wanderer",
      bio: "Passionate reader of MistVil!",
      title: "Mist Wanderer (Reader)",
      createdAt: new Date().toISOString().split("T")[0],
      role: "reader",
      level: 1,
      xp: 150,
      favorites: [],
      paypal: "",
      telegram: "",
      discord: ""
    };

    // Save newly registered user to the list
    const updatedUsers = [...registeredList, newUser];
    localStorage.setItem("mistvil-registered-users", JSON.stringify(updatedUsers));
    
    // Auto-login with the new user
    onLogin(newUser.email, passwordInput); // Password is bypassed in client demo register
    setSuccessMsg("Account registered successfully! Welcome to MistVil.");
    
    setUsernameInput("");
    setEmailInput("");
    setPasswordInput("");
  };

  const handleUpdateBio = () => {
    if (!currentUser) return;
    const updated = { ...currentUser, bio: bioText };
    onUpdateUser(updated);
    setIsEditingBio(false);
  };

  const handleUpdateSupportFields = () => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      paypal: paypalInput.trim(),
      telegram: telegramInput.trim(),
      discord: discordInput.trim()
    };
    onUpdateUser(updated);
    setIsEditingSupport(false);
  };

  const handleSelectAvatar = (avatarId: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, avatar: avatarId };
    onUpdateUser(updated);
    setIsEditingAvatar(false);
  };

  const submitRoleRequest = () => {
    onSendRoleRequest(roleSelection);
    setRequestSuccess(`Your request to become a ${roleSelection} was sent successfully! The Owner will approve it from the Admin Panel.`);
    setTimeout(() => setRequestSuccess(""), 6000);
  };

  // Find user avatar details
  const userAvatarObj = AVATARS.find((a) => a.id === (currentUser?.avatar || "wanderer")) || AVATARS[5];

  // Map history keys to actual read chapters
  const flattenedHistory: Array<{
    novel: Novel;
    chapterId: string;
    chapterTitle: string;
    chapterNumber: number;
  }> = [];

  Object.entries(readHistory).forEach(([novelId, chapterIds]) => {
    const novel = novels.find((n) => n.id === novelId);
    if (novel) {
      chapterIds.forEach((chId) => {
        const chapter = novel.chapters.find((c) => c.id === chId);
        if (chapter) {
          flattenedHistory.push({
            novel,
            chapterId: chId,
            chapterTitle: chapter.title,
            chapterNumber: chapter.chapterNumber,
          });
        }
      });
    }
  });

  const hasPendingRequest = roleRequests.some(r => r.email === currentUser?.email && r.status === "pending");

  return (
    <div id="user-profile-view-container" className="space-y-8 max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          // LOGIN & REGISTRATION BOARD
          <motion.div
            key="auth-board"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-brand-900/40 border border-brand-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-brand-500/15 border border-brand-500/30 rounded-2xl flex items-center justify-center text-brand-400">
                  {isLoginView ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                </div>
                <h2 className="text-2xl font-extrabold text-white font-cairo">
                  {isLoginView ? "Sign In to MistVil" : "Create Account"}
                </h2>
                <p className="text-xs text-gray-400 font-light font-cairo">
                  {isLoginView
                    ? "Keep track of your reading progress, unlock cool badges, and level up."
                    : "Join our novel sanctuary and start tracking your cultivation level."}
                </p>
              </div>

              <form onSubmit={isLoginView ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4 text-left">
                {!isLoginView && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-semibold">Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. CultivatorKing"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full bg-brand-950/80 border border-brand-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. reader@berrymist.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-brand-950/80 border border-brand-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-brand-950/80 border border-brand-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-[11px] text-red-400 text-center font-light">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-xs rounded-xl transition shadow-[0_4px_12px_rgba(56,132,116,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoginView ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isLoginView ? "Sign In" : "Register Account"}</span>
                </button>
              </form>

              <div className="pt-4 border-t border-brand-800/30 text-center text-xs">
                <span className="text-gray-400">
                  {isLoginView ? "Don't have an account yet?" : "Already have an account?"}
                </span>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginView(!isLoginView);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-brand-400 hover:text-brand-300 font-bold underline ml-1 cursor-pointer"
                >
                  {isLoginView ? "Sign Up Free" : "Sign In Here"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          // USER PROFILE BOARD - REPLICATING SCREENSHOT 5
          <motion.div
            key="profile-board"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 text-left"
          >
            {/* Header profile card with glassmorphism */}
            <div className="bg-gradient-to-r from-brand-900/60 to-brand-950/80 border border-brand-800/60 p-6 md:p-8 rounded-3xl relative overflow-hidden backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                {/* Avatar */}
                <div className="relative group">
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold border-2 ${userAvatarObj.color} shadow-[0_0_20px_rgba(56,132,116,0.2)] transition duration-300`}>
                    {userAvatarObj.label.split(" ")[0]}
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingAvatar(!isEditingAvatar);
                      setIsEditingBio(false);
                    }}
                    className="absolute -bottom-1.5 -right-1.5 bg-brand-500 text-white p-1.5 rounded-lg border border-brand-400/50 hover:bg-brand-400 transition cursor-pointer shadow-md"
                    title="Change Avatar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row items-center gap-2">
                    <h2 className="text-2xl font-black text-white">{currentUser.username}</h2>
                    <span className="bg-brand-800 text-brand-300 text-[10px] font-mono border border-brand-700/60 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {getRankTitle(currentUser.role)}
                    </span>
                  </div>

                  {isEditingBio ? (
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value)}
                        className="bg-brand-950 border border-brand-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
                        placeholder="Tell us about yourself..."
                      />
                      <button
                        onClick={handleUpdateBio}
                        className="bg-brand-500 text-white p-2 rounded-xl border border-brand-400/40 hover:bg-brand-400 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-300 text-xs md:text-sm max-w-md font-light italic leading-relaxed flex items-center justify-center md:justify-start gap-1.5">
                      <span>"{currentUser.bio || "Passionate cultivator of high-quality translation notes."}"</span>
                      <button
                        onClick={() => {
                          setBioText(currentUser.bio || "");
                          setIsEditingBio(true);
                          setIsEditingAvatar(false);
                        }}
                        className="text-gray-500 hover:text-white transition cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-mono justify-center md:justify-start">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Member since: {currentUser.createdAt}</span>
                    <span className="text-gray-700">&bull;</span>
                    <Mail className="w-3.5 h-3.5" />
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Logout & Actions */}
              <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                <button
                  onClick={onLogout}
                  className="px-4 py-2.5 bg-brand-950 hover:bg-brand-900 text-gray-400 hover:text-white border border-brand-800 hover:border-brand-600 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out Account</span>
                </button>
              </div>
            </div>

            {/* Avatar Selection Sheet */}
            <AnimatePresence>
              {isEditingAvatar && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-brand-950/40 border border-brand-800/40 p-4 rounded-3xl space-y-3 text-right"
                  dir="rtl"
                >
                  <h4 className="text-xs font-bold text-gray-300 font-cairo">اختر شارة رتبة التجسيد المفضلة لديك:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => handleSelectAvatar(av.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                          currentUser.avatar === av.id
                            ? "bg-brand-500/35 text-white border-brand-500"
                            : "bg-brand-900/30 hover:bg-brand-900/60 text-gray-400 hover:text-white border-brand-800/60"
                        }`}
                      >
                        <span className="text-2xl">{av.label.split(" ")[0]}</span>
                        <span>{av.label.split(" ")[1]}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Block (Level 50, XP 15400) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-brand-900/30 border border-brand-800/50 p-5 rounded-2xl text-center space-y-1">
                <div className="text-xs text-gray-400 font-medium">Level Level</div>
                <div className="text-3xl font-black text-amber-400 flex items-center justify-center gap-1.5 font-mono">
                  <Award className="w-6 h-6 text-amber-500" />
                  <span>Level {currentUser.level || 50}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">Advanced Reader Rank</div>
              </div>

              <div className="bg-brand-900/30 border border-brand-800/50 p-5 rounded-2xl text-center space-y-1">
                <div className="text-xs text-gray-400 font-medium">Est. XP Progress</div>
                <div className="text-3xl font-black text-brand-400 flex items-center justify-center gap-1.5 font-mono">
                  <Sparkles className="w-6 h-6 text-brand-400" />
                  <span>{(currentUser.xp || 15400).toLocaleString()} XP</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">Cultivated knowledge base</div>
              </div>

              <div className="bg-brand-900/30 border border-brand-800/50 p-5 rounded-2xl text-center space-y-1">
                <div className="text-xs text-gray-400 font-medium">Favorite Novels</div>
                <div className="text-3xl font-black text-rose-400 flex items-center justify-center gap-1.5 font-mono">
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                  <span>{currentUser.favorites?.length || 0} Saved</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">Bookmarked novels</div>
              </div>
            </div>

            {/* Support and contact cards - REPLICATING SCREENSHOT 5 */}
            <div className="bg-brand-900/20 border border-brand-800/40 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-brand-800/30 pb-3" dir="rtl">
                <h3 className="text-sm font-bold text-white font-cairo">روابط الدعم الفني والتمويل الذاتي</h3>
                <button
                  onClick={() => setIsEditingSupport(!isEditingSupport)}
                  className="text-xs text-brand-400 hover:text-brand-300 font-bold font-cairo cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingSupport ? "إلغاء التعديل" : "تعديل الروابط"}</span>
                </button>
              </div>

              {isEditingSupport ? (
                <div className="space-y-4 text-right" dir="rtl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-bold font-cairo">حساب PayPal</label>
                      <input
                        type="text"
                        placeholder="e.g. paypal.me/mistvil"
                        value={paypalInput}
                        onChange={(e) => setPaypalInput(e.target.value)}
                        className="w-full bg-brand-950 border border-brand-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-bold font-cairo">حساب تليجرام (Telegram)</label>
                      <input
                        type="text"
                        placeholder="e.g. @mistvil_dev"
                        value={telegramInput}
                        onChange={(e) => setTelegramInput(e.target.value)}
                        className="w-full bg-brand-950 border border-brand-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-bold font-cairo">معرف الديسكورد (Discord)</label>
                      <input
                        type="text"
                        placeholder="e.g. mistvil#1234"
                        value={discordInput}
                        onChange={(e) => setDiscordInput(e.target.value)}
                        className="w-full bg-brand-950 border border-brand-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleUpdateSupportFields}
                      className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold font-cairo rounded-xl transition cursor-pointer"
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right" dir="rtl">
                  <div className="bg-brand-950/60 border border-brand-800/40 p-4 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-500 font-cairo block">حساب الدعم المباشر PayPal</span>
                      <span className="text-xs text-white font-mono font-bold">{currentUser.paypal || "لم يربط بعد"}</span>
                    </div>
                    <DollarSign className="w-5 h-5 text-amber-500 shrink-0" />
                  </div>

                  <div className="bg-brand-950/60 border border-brand-800/40 p-4 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-500 font-cairo block">معرف التليجرام الخاص بي</span>
                      <span className="text-xs text-white font-mono font-bold">{currentUser.telegram || "لم يربط بعد"}</span>
                    </div>
                    <Send className="w-5 h-5 text-brand-400 shrink-0" />
                  </div>

                  <div className="bg-brand-950/60 border border-brand-800/40 p-4 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-500 font-cairo block">حساب الديسكورد للتواصل</span>
                      <span className="text-xs text-white font-mono font-bold">{currentUser.discord || "لم يربط بعد"}</span>
                    </div>
                    <MessageSquare className="w-5 h-5 text-indigo-400 shrink-0" />
                  </div>
                </div>
              )}
            </div>

            {/* ROLE UPGRADE REQUEST (For Readers only) */}
            {currentUser.role === "reader" && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl space-y-4" dir="rtl">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-400 font-cairo">تقديم طلب ترقية لرتبة Translator أو Writer</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-cairo">
                    إذا أردت المساهمة بتنزيل الفصول أو تأليف رواياتك الخاصة، حدد الرتبة المطلوبة وأرسل طلباً لمالك الموقع للموافقة عليه فوراً.
                  </p>
                </div>

                {requestSuccess && (
                  <div className="p-3 bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{requestSuccess}</span>
                  </div>
                )}

                {hasPendingRequest ? (
                  <div className="p-3.5 bg-brand-950/60 border border-brand-800 text-xs text-gray-400 font-cairo flex items-center gap-2 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>لديك طلب ترقية معلق قيد المراجعة حالياً من قبل المالك. يرجى الانتظار لحين الموافقة وتفعيل الصلاحيات.</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-cairo">الرتبة المطلوبة:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRoleSelection("translator")}
                          className={`px-4 py-2 rounded-lg text-xs font-bold font-cairo transition cursor-pointer ${
                            roleSelection === "translator" ? "bg-amber-500 text-brand-950" : "bg-brand-950 text-gray-400"
                          }`}
                        >
                          Translator
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoleSelection("writer")}
                          className={`px-4 py-2 rounded-lg text-xs font-bold font-cairo transition cursor-pointer ${
                            roleSelection === "writer" ? "bg-amber-500 text-brand-950" : "bg-brand-950 text-gray-400"
                          }`}
                        >
                          Writer
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={submitRoleRequest}
                      className="px-5 py-2.5 bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white text-xs font-bold font-cairo rounded-xl transition shadow-[0_4px_12px_rgba(56,132,116,0.3)] cursor-pointer shrink-0"
                    >
                      إرسال الطلب للمالك
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Favorite Novels (قائمة الروايات المفضلة) */}
            <div className="bg-brand-900/20 border border-brand-800/40 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-brand-800/30 pb-3" dir="rtl">
                <h3 className="text-sm font-bold text-white font-cairo">قائمة الروايات المفضلة الخاصة بك ({currentUser.favorites?.length || 0})</h3>
              </div>

              {(!currentUser.favorites || currentUser.favorites.length === 0) ? (
                <div className="text-center py-8 text-gray-500 text-xs font-cairo">
                  لم تقم بإضافة أي رواية للمفضلة بعد. ابدأ الاستكشاف الآن!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentUser.favorites.map((favId) => {
                    const favNovel = novels.find(n => n.id === favId);
                    if (!favNovel) return null;
                    return (
                      <div
                        key={favId}
                        onClick={() => onSelectNovel(favId)}
                        className="p-3 bg-brand-950/60 hover:bg-brand-950/90 border border-brand-800 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <img src={favNovel.coverImage} className="w-10 h-14 object-cover rounded border border-brand-800" alt={favNovel.title} />
                          <div>
                            <h5 className="font-bold text-white text-xs font-cairo">{favNovel.title}</h5>
                            <span className="text-[10px] text-gray-400 font-mono">{favNovel.englishTitle}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedFavs = (currentUser.favorites || []).filter(id => id !== favId);
                            onUpdateUser({ ...currentUser, favorites: updatedFavs });
                          }}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                          title="إزالة من المفضلة"
                        >
                          <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Badges list */}
            <div className="bg-brand-900/20 border border-brand-800/40 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-brand-800/30 pb-3" dir="rtl">
                <h3 className="text-sm font-bold text-white font-cairo">شارة الإنجازات المحققة (Unlocks)</h3>
                <span className="text-[10px] bg-brand-900 text-brand-400 border border-brand-800 px-2.5 py-0.5 rounded font-mono font-bold">
                  {stats.badges.length} UNLOCKED
                </span>
              </div>

              {stats.badges.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs font-light space-y-1">
                  <p>No badges unlocked yet.</p>
                  <p className="text-[10px]">Read novel chapters to start unlocking achievements!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.badges.map((bdg) => (
                    <div
                      key={bdg.id}
                      className="bg-brand-950/80 border border-brand-800 p-3 rounded-xl flex items-start gap-2.5 hover:border-brand-700/60 transition"
                    >
                      <div className="text-2xl p-1 bg-brand-900/60 rounded-lg border border-brand-800 shrink-0">
                        {bdg.icon || "🏆"}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white leading-tight">{bdg.title}</h4>
                        <p className="text-[10px] text-gray-400 leading-normal font-light">
                          {bdg.description}
                        </p>
                        {bdg.unlockedAt && (
                          <span className="text-[8px] text-brand-400 font-mono block pt-0.5">
                            Unlocked {bdg.unlockedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
