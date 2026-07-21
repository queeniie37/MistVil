import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Moon, Sun, User as UserIcon, LogOut, Settings, Award, Shield, FileText, CheckCircle, Flame, Layers, Plus, Megaphone, Menu, X, LogIn } from 'lucide-react';
import { User, UserRole } from '../types';
import { DEFAULT_USERS, MistVilDatabase } from '../data';
import { isImageSource, safeEmojiOrFallback } from '../utils/media';
import LoginModal from './LoginModal';

interface HeaderProps {
  currentUser: User;
  onRoleChange: (newRole: UserRole) => void;
  onNavigate: (page: string, params?: any) => void;
  currentPage: string;
  onLoginSuccess: (user: User) => void;
}

export default function Header({ currentUser, onRoleChange, onNavigate, currentPage, onLoginSuccess }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Close the profile/notifications dropdowns when clicking anywhere
  // outside them (e.g. on a novel card) instead of leaving them open.
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);
  
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setLoginModalOpen(true);
    };
    window.addEventListener('open-login-modal', handleOpenLoginModal);
    return () => {
      window.removeEventListener('open-login-modal', handleOpenLoginModal);
    };
  }, []);
  
  const [siteName, setSiteName] = useState(() => MistVilDatabase.get<string>('site_name', 'MistVil'));
  const [siteLogo, setSiteLogo] = useState(() => {
    const logo = MistVilDatabase.get<string>('site_logo', '/site_logo_v2.png');
    return logo === '🌫️' ? '/site_logo_v2.png' : logo;
  });

  const safeSiteLogo = (typeof siteLogo === 'string' && siteLogo.trim() && siteLogo.trim() !== '🌫️') ? siteLogo.trim() : '/site_logo_v2.png';
  const safeSiteName = (typeof siteName === 'string' && siteName.trim()) ? siteName.trim() : 'MistVil';

  useEffect(() => {
    const handleSiteUpdate = () => {
      setSiteName(MistVilDatabase.get<string>('site_name', 'MistVil'));
      const logo = MistVilDatabase.get<string>('site_logo', '/site_logo_v2.png');
      setSiteLogo(logo === '🌫️' ? '/site_logo_v2.png' : logo);
    };
    window.addEventListener('site-settings-updated', handleSiteUpdate);
    return () => window.removeEventListener('site-settings-updated', handleSiteUpdate);
  }, []);

  // Real-time search results
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    // All uploaded novels are searchable by every visitor (guests included), except cancelled ones
    const novels = MistVilDatabase.get<any[]>('novels', []);
    const filtered = novels.filter(n => {
      if (n.status === 'CANCELLED') return false;
      return (
        n.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.genres.some((g: string) => g.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
    setSearchResults(filtered);
  }, [searchQuery]);

  const [localNotifications, setLocalNotifications] = useState<any[]>([]);

  const loadNotifications = () => {
    const rawNotifications = MistVilDatabase.get<any[]>('notifications', [
      { id: '1', title: 'New chapter available!', message: 'Chapter 165 of "The Beginning After the End" is now available to read.', isRead: false, createdAt: '10 minutes ago' },
      { id: '2', title: 'Your novel was approved', message: 'The novel "Return of the Shadow King" was approved and published successfully.', isRead: true, createdAt: '1 hour ago' }
    ]);

    const myBookmarks = MistVilDatabase.get<string[]>('bookmarks', []);
    const filtered = rawNotifications.filter(n => {
      // New-chapter announcements tagged forBookmarkers reach exactly the
      // members who bookmarked that novel.
      if (n.forBookmarkers && n.novelId) {
        return currentUser.role !== 'GUEST' && myBookmarks.includes(n.novelId);
      }
      if (currentUser.role === 'GUEST') {
        return !n.userId && !n.email;
      }
      return !n.userId && !n.email || n.userId === currentUser.id || n.email?.toLowerCase() === currentUser.email?.toLowerCase();
    });
    // Newest notifications always on top. New ones are appended to the end
    // of the stored array, so entries without parseable dates fall back to
    // reversed insertion order instead of keeping oldest-first.
    const indexed = filtered.map((n, idx) => ({ n, idx, t: Date.parse(n?.createdAt || '') || 0 }));
    indexed.sort((a, b) => (b.t - a.t) || (b.idx - a.idx));
    setLocalNotifications(indexed.map(x => x.n));
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('user-updated', handleUpdate);
    window.addEventListener('notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('user-updated', handleUpdate);
      window.removeEventListener('notifications-updated', handleUpdate);
    };
  }, [currentUser]);

  const handleMarkAllRead = () => {
    const rawNotifications = MistVilDatabase.get<any[]>('notifications', [
      { id: '1', title: 'New chapter available!', message: 'Chapter 165 of "The Beginning After the End" is now available to read.', isRead: false, createdAt: '10 minutes ago' },
      { id: '2', title: 'Your novel was approved', message: 'The novel "Return of the Shadow King" was approved and published successfully.', isRead: true, createdAt: '1 hour ago' }
    ]);
    const updated = rawNotifications.map(n => {
      const isTarget = currentUser.role !== 'GUEST' && (n.userId === currentUser.id || n.email?.toLowerCase() === currentUser.email?.toLowerCase());
      if (isTarget || (!n.userId && !n.email)) {
        return { ...n, isRead: true };
      }
      return n;
    });
    MistVilDatabase.set('notifications', updated);
    loadNotifications();
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const unreadCount = localNotifications.filter(n => !n.isRead).length;

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-panel h-20 transition-all duration-300 flex items-center border-b border-white/5 px-4 sm:px-6 lg:px-12 justify-between">
        {/* Right Side: Logo & Hamburger */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger button for mobile/tablet */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/25 text-violet-300 hover:text-white hover:bg-violet-600/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.12)] whitespace-nowrap"
            title="Sections & pages"
          >
            <Menu size={16} />
            <span className="text-xs font-bold font-sans hidden min-[400px]:inline">Menu</span>
          </button>

          <div 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none"
          >
            {isImageSource(safeSiteLogo) ? (
              <img src={safeSiteLogo} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover filter drop-shadow-[0_0_10px_rgba(56,189,248,0.6)] animate-pulse" referrerPolicy="no-referrer" />
            ) : (
              <img src="/site_logo_v2.png" alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover filter drop-shadow-[0_0_10px_rgba(56,189,248,0.6)] animate-pulse" referrerPolicy="no-referrer" />
            )}
            <span className="font-extrabold text-lg sm:text-2xl tracking-tight bg-gradient-to-r from-violet-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
              {safeSiteName}
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-purple-200/80 mr-8">
            <button 
              onClick={() => onNavigate('home')} 
              className={`hover:text-white transition-colors py-2 relative ${currentPage === 'home' ? 'text-white font-semibold' : ''}`}
            >
              Home
              {currentPage === 'home' && (
                <span className="absolute bottom-0 right-0 left-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => onNavigate('explore')} 
              className={`hover:text-white transition-colors py-2 relative ${currentPage === 'explore' ? 'text-white font-semibold' : ''}`}
            >
              Library & Explore
              {currentPage === 'explore' && (
                <span className="absolute bottom-0 right-0 left-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => onNavigate('suggestions')} 
              className={`hover:text-white transition-colors py-2 relative ${currentPage === 'suggestions' ? 'text-white font-semibold' : ''}`}
            >
              Suggest a Novel
              {currentPage === 'suggestions' && (
                <span className="absolute bottom-0 right-0 left-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => onNavigate('teams')} 
              className={`hover:text-white transition-colors py-2 relative ${currentPage === 'teams' ? 'text-white font-semibold' : ''}`}
            >
              Translators
              {currentPage === 'teams' && (
                <span className="absolute bottom-0 right-0 left-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => onNavigate('ads')} 
              className={`hover:text-white transition-colors py-2 relative ${currentPage === 'ads' ? 'text-white font-semibold' : ''}`}
            >
              Ads 📢
              {currentPage === 'ads' && (
                <span className="absolute bottom-0 right-0 left-0 h-[2px] bg-gradient-to-r from-violet-500 to-rose-500 rounded-full" />
              )}
            </button>
          </nav>
        </div>

        {/* Left Side: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {currentUser.role === 'GUEST' && (
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-violet-600 to-rose-500 text-white shadow-lg hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
            >
              <LogIn size={12} />
              <span className="hidden sm:inline">Sign In 🌫️</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}

          {/* Quick Role Switcher removed for privacy, keeping only the one in profile next to user's name */}

          {/* Search Button */}
          <button 
            onClick={() => setSearchOpen(true)}
            className="p-2 sm:p-2.5 rounded-full bg-white/5 border border-white/5 text-purple-200/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <Search size={16} />
          </button>

          {/* Notifications Trigger */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="p-2 sm:p-2.5 rounded-full bg-white/5 border border-white/5 text-purple-200/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
              )}
            </button>

            {/* Notifications Panel */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] glass-panel rounded-2xl p-4 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                  <h4 className="font-bold text-sm text-purple-200">Notifications</h4>
                  <button 
                    onClick={handleMarkAllRead} 
                    className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer"
                  >
                    Mark all as read
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {localNotifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-2.5 rounded-xl text-left transition-colors ${notif.isRead ? 'bg-transparent' : 'bg-violet-500/10'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-white">{notif.title}</span>
                        <span className="text-[10px] text-purple-400">{notif.createdAt}</span>
                      </div>
                      <p className="text-xs text-purple-300/90 mt-1">{notif.message}</p>
                    </div>
                  ))}

                  {localNotifications.length === 0 && (
                    <p className="text-xs text-purple-400 py-6 text-center">No notifications right now.</p>
                  )}
                </div>

                {localNotifications.length > 0 && (
                  <button 
                    onClick={() => {
                      setNotificationsOpen(false);
                      onNavigate('notifications');
                    }}
                    className="w-full mt-3 py-2 bg-gradient-to-r from-rose-600/20 to-violet-600/20 hover:from-rose-600/40 hover:to-violet-600/40 border border-violet-500/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center block"
                  >
                    View all 👁️
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Profile Avatar with Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer focus:outline-none"
            >
              <img 
                src={currentUser.avatar} 
                alt={currentUser.username} 
                className="w-10 h-10 rounded-full border border-violet-500/30 object-cover"
              />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 max-w-[calc(100vw-2rem)] glass-panel rounded-2xl p-4 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3 pb-3 border-b border-white/5 mb-3 text-left">
                  <img src={currentUser.avatar} alt={currentUser.username} className="w-12 h-12 rounded-full border border-violet-500/20" />
                  <div>
                    <h4 className="font-bold text-sm text-white">{currentUser.username}</h4>
                    <span className="text-xs text-violet-400">{currentUser.email}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  {currentUser.role !== 'GUEST' && (
                    <div className="px-2 py-1.5 bg-white/5 rounded-xl flex justify-between text-xs text-purple-300 mb-2">
                      <span>Level {currentUser.level}</span>
                      <span>XP {currentUser.xp}</span>
                    </div>
                  )}

                  {currentUser.role === 'GUEST' ? (
                    <button 
                      onClick={() => { setLoginModalOpen(true); setProfileOpen(false); }}
                      className="flex items-center justify-between w-full p-2.5 bg-gradient-to-r from-violet-600 to-rose-500 rounded-xl text-xs font-bold text-white hover:brightness-110 transition-all text-left cursor-pointer shadow-md"
                    >
                      <LogIn size={14} />
                      <span>Sign in / Create account</span>
                    </button>
                  ) : (
                    <>
                      {(currentUser.role === 'OWNER' || currentUser.email?.toLowerCase() === 'mistvil112@gmail.com') && (
                        <button 
                          onClick={() => { onNavigate('admin'); setProfileOpen(false); }}
                          className="flex items-center justify-between w-full p-2 hover:bg-white/5 rounded-xl text-sm text-purple-200 hover:text-white transition-all text-left cursor-pointer"
                        >
                          <Shield size={16} className="text-violet-400" />
                          <span>Owner & Admin Panel</span>
                        </button>
                      )}

                      {(currentUser.role === 'TRANSLATOR' || currentUser.role === 'OWNER' || currentUser.role === 'WRITER' || currentUser.email?.toLowerCase() === 'mistvil112@gmail.com') && (
                        <button 
                          onClick={() => { onNavigate('translator-panel'); setProfileOpen(false); }}
                          className="flex items-center justify-between w-full p-2 hover:bg-white/5 rounded-xl text-sm text-purple-200 hover:text-white transition-all text-left cursor-pointer"
                        >
                          <FileText size={16} className="text-rose-400" />
                          <span>Work Panel (Translator/Writer)</span>
                        </button>
                      )}

                      <button 
                        onClick={() => { onNavigate('profile'); setProfileOpen(false); }}
                        className="flex items-center justify-between w-full p-2 hover:bg-white/5 rounded-xl text-sm text-purple-200 hover:text-white transition-all text-left cursor-pointer"
                      >
                        <UserIcon size={16} className="text-purple-400" />
                        <span>My Profile</span>
                      </button>

                      <button 
                        onClick={() => { onNavigate('ads'); setProfileOpen(false); }}
                        className="flex items-center justify-between w-full p-2 hover:bg-white/5 rounded-xl text-sm text-purple-200 hover:text-white transition-all text-left cursor-pointer"
                      >
                        <Megaphone size={16} className="text-fuchsia-400" />
                        <span>Public Ads Page</span>
                      </button>

                      <button 
                        onClick={() => { onNavigate('explore'); setProfileOpen(false); }}
                        className="flex items-center justify-between w-full p-2 hover:bg-white/5 rounded-xl text-sm text-purple-200 hover:text-white transition-all text-left cursor-pointer"
                      >
                        <Layers size={16} className="text-purple-400" />
                        <span>My Novel Library</span>
                      </button>

                      <button 
                        onClick={() => { onRoleChange('GUEST'); setProfileOpen(false); }}
                        className="flex items-center justify-between w-full p-2 hover:bg-red-500/10 rounded-xl text-sm text-red-400 transition-all text-left cursor-pointer"
                      >
                        <LogOut size={16} className="text-red-400" />
                        <span>Sign out</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Floating Interactive Role Control Center Widget */}
      {roleSelectorOpen && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm glass-panel p-4 rounded-2xl shadow-2xl border border-violet-500/40 animate-bounce-short">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full font-bold">Role simulation feature</span>
            <button onClick={() => setRoleSelectorOpen(false)} className="text-purple-400 hover:text-white text-xs font-bold">Close ×</button>
          </div>
          <h3 className="font-bold text-sm text-purple-100 text-left mb-1">Membership role control center</h3>
          <p className="text-xs text-purple-300/95 text-left mb-4">Choose your role to simulate the full site experience as a reader, a translator who reserves and writes novels, or the owner and admin:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button 
              onClick={() => { onRoleChange('GUEST'); setRoleSelectorOpen(false); }}
              className={`p-2.5 rounded-xl border font-semibold transition-all ${currentUser.role === 'GUEST' ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 text-purple-300 border-white/5 hover:bg-white/10'}`}
            >
              🌐 Guest (browse only)
            </button>
            <button 
              onClick={() => { onRoleChange('MEMBER'); setRoleSelectorOpen(false); }}
              className={`p-2.5 rounded-xl border font-semibold transition-all ${currentUser.role === 'MEMBER' ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 text-purple-300 border-white/5 hover:bg-white/10'}`}
            >
              👤 Member reader (interact)
            </button>
            <button 
              onClick={() => { onRoleChange('TRANSLATOR'); setRoleSelectorOpen(false); }}
              className={`p-2.5 rounded-xl border font-semibold transition-all ${currentUser.role === 'TRANSLATOR' ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 text-purple-300 border-white/5 hover:bg-white/10'}`}
            >
              ✍️ Translator (author & reserve)
            </button>
            <button 
              onClick={() => { onRoleChange('WRITER'); setRoleSelectorOpen(false); }}
              className={`p-2.5 rounded-xl border font-semibold transition-all ${currentUser.role === 'WRITER' ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 text-purple-300 border-white/5 hover:bg-white/10'}`}
            >
              ✒️ Writer & author
            </button>
            {currentUser.email?.toLowerCase() === 'mistvil112@gmail.com' ? (
              <button 
                onClick={() => { onRoleChange('OWNER'); setRoleSelectorOpen(false); }}
                className={`p-2.5 col-span-2 rounded-xl border font-semibold transition-all ${currentUser.role === 'OWNER' ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 text-purple-300 border-white/5 hover:bg-white/10'}`}
              >
                👑 Owner & admin (full control)
              </button>
            ) : (
              <button 
                onClick={() => alert('Security error: this role is reserved for the site owner only! Please sign in with the owner account first.')}
                className="p-2.5 col-span-2 rounded-xl border border-white/5 bg-white/5 text-purple-400/50 cursor-not-allowed font-semibold text-center"
              >
                🔒 Owner role locked (owner sign-in required)
              </button>
            )}
          </div>
          <p className="text-[10px] text-purple-400 text-center mt-3">MistVil simulation data is saved automatically in LocalStorage</p>
        </div>
      )}

      {/* Advanced Command Palette Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex justify-center pt-24 px-4">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl shadow-2xl border border-white/10 h-fit max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <span className="text-purple-300 font-bold text-lg text-left">Advanced quick search</span>
              <button 
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="p-1.5 hover:bg-white/5 rounded-full text-purple-400 hover:text-white transition-all font-bold text-sm"
              >
                Close (Esc)
              </button>
            </div>

            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Search by novel title, author, translator, or genre (e.g. Shadow, Action)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-2xl py-4.5 pr-12 pl-4 text-white text-left placeholder-purple-300/40 text-sm outline-none transition-all"
              />
              <Search className="absolute right-4 top-4 text-purple-400" size={20} />
            </div>

            <div className="flex-1 overflow-y-auto max-h-96 pr-1">
              {searchResults.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {searchResults.map((novel) => (
                    <div 
                      key={novel.id} 
                      onClick={() => {
                        onNavigate('novel', { id: novel.id });
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-4 p-3 bg-white/5 hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/20 rounded-2xl cursor-pointer transition-all text-left"
                    >
                      <img src={novel.cover} alt={novel.titleAr} className="w-12 h-16 rounded-xl object-cover border border-white/5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-white">{novel.titleAr}</h4>
                        <span className="text-xs text-purple-300">{novel.titleEn}</span>
                        <div className="flex gap-2 flex-wrap mt-1">
                          {novel.genres.slice(0, 3).map((g: string) => (
                            <span key={g} className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">{g}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-left text-xs text-purple-400">
                        <span>{novel.chaptersCount} ch</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() !== '' ? (
                <div className="text-center py-12 text-purple-300">
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                  <p className="text-xs text-purple-400 mt-1">Check your spelling or try a valid genre.</p>
                </div>
              ) : (
                <div className="text-left py-6">
                  <h4 className="font-bold text-xs text-purple-400 uppercase tracking-wider mb-3">Suggested novels & quick search</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Action', 'Fantasy', 'Isekai', 'System', 'Adventure', 'Murim'].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setSearchQuery(tag)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-left rounded-xl text-purple-300 hover:text-white transition-all text-xs"
                      >
                        🔍 Genre: {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[140] bg-black/95 backdrop-blur-xl flex flex-col justify-between gap-6 p-6 overflow-y-auto animate-in fade-in duration-300 lg:hidden">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-8">
              <div className="flex items-center gap-2">
                {isImageSource(safeSiteLogo) ? (
                  <img src={safeSiteLogo} alt="Logo" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <img src="/site_logo_v2.png" alt="Logo" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                )}
                <span className="font-extrabold text-2xl bg-gradient-to-r from-violet-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
                  {safeSiteName}
                </span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-full bg-white/5 border border-white/5 text-purple-200 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-4 text-left text-lg font-bold text-purple-100">
              <button 
                onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} 
                className={`py-3.5 px-5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${currentPage === 'home' ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span>🏠 Home</span>
                <span className="text-xs text-purple-400 font-normal">Show all sections</span>
              </button>
              <button 
                onClick={() => { onNavigate('explore'); setMobileMenuOpen(false); }} 
                className={`py-3.5 px-5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${currentPage === 'explore' ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span>📚 Library & Explore</span>
                <span className="text-xs text-purple-400 font-normal">Browse and filter novels</span>
              </button>
              <button 
                onClick={() => { onNavigate('suggestions'); setMobileMenuOpen(false); }} 
                className={`py-3.5 px-5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${currentPage === 'suggestions' ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span>💡 Suggest a Novel</span>
                <span className="text-xs text-purple-400 font-normal">Share your great suggestions</span>
              </button>
              <button 
                onClick={() => { onNavigate('teams'); setMobileMenuOpen(false); }} 
                className={`py-3.5 px-5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${currentPage === 'teams' ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span>⚔️ Translators</span>
                <span className="text-xs text-purple-400 font-normal">Editing & translation team</span>
              </button>
              <button
                onClick={() => { onNavigate('ads'); setMobileMenuOpen(false); }}
                className={`py-3.5 px-5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${currentPage === 'ads' ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span>📢 Public Ads Page</span>
                <span className="text-xs text-purple-400 font-normal">Latest news and ads</span>
              </button>

              {/* Control panels — shown per role so the owner sees all panels */}
              {(currentUser.role === 'TRANSLATOR' || currentUser.role === 'WRITER' || currentUser.role === 'OWNER') && (
                <button
                  onClick={() => { onNavigate('translator-panel'); setMobileMenuOpen(false); }}
                  className={`py-3.5 px-5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${currentPage === 'translator-panel' ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <span>✍️ Work Panel (Translator/Writer)</span>
                  <span className="text-xs text-purple-400 font-normal">Create and publish your novels</span>
                </button>
              )}
              {currentUser.role === 'OWNER' && (
                <button
                  onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
                  className={`py-3.5 px-5 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${currentPage === 'admin' ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <span>🛡️ Owner & Admin Panel</span>
                  <span className="text-xs text-purple-400 font-normal">Manage the entire platform</span>
                </button>
              )}
            </nav>
          </div>

          {/* Mobile role switch shortcut & profile link in menu bottom */}
          <div className="border-t border-white/5 pt-6 flex flex-col gap-4">
            <button 
              onClick={() => { onNavigate('profile'); setMobileMenuOpen(false); }}
              className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-between text-sm font-semibold transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <img src={currentUser.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-violet-500/30" />
                <span>My Profile ({currentUser.username})</span>
              </span>
              <span className="text-xs text-violet-400">Edit profile</span>
            </button>
            <div className="text-center text-[9px] text-purple-500">
              © 2026 MistVil 🌫️ - All rights reserved
            </div>
          </div>
        </div>
      )}

      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
        onLoginSuccess={onLoginSuccess} 
      />
    </>
  );
}
