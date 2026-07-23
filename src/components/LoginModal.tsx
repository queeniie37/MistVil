import React, { useState } from 'react';
import { LogIn, UserPlus, X, Shield, Mail, Lock, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../types';
import { MistVilDatabase, DEFAULT_USERS } from '../data';
import { hashPassword, verifyOwnerLogin, registerAccount, loginAccount, ensureAccountOnServer } from '../utils/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || (isRegister && !username)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isRegister && !acceptPolicy) {
      setError('You must accept the platform’s policy and rules to continue and register.');
      return;
    }

    const usersDb = MistVilDatabase.get<any[]>('users_db', []);

    if (isRegister) {
      // Sign Up — new accounts are always created as regular MEMBER readers.
      // The owner account can never be (re)registered; the owner signs in
      // through the login form only. Otherwise anyone knowing the owner's
      // email could register it and gain full admin control.
      if (email.toLowerCase() === 'mistvil112@gmail.com') {
        setError('This email is reserved for the platform owner. Please use the sign-in form instead of registering.');
        return;
      }

      const emailExists = usersDb.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        setError('This email is already registered.');
        return;
      }

      const passwordHash = await hashPassword(password);
      const newUser: User & { password?: string; passwordHash?: string } = {
        id: `user-${Date.now()}`,
        username: username,
        email: email.toLowerCase(),
        role: 'MEMBER',
        xp: 0,
        level: 1,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        bio: 'A passionate reader and new member of the MistVil family.',
        // Store only a salted hash — never the plaintext password
        passwordHash
      };

      // Create the account on the server so it works from every device. If the
      // email is already taken there, stop; if the server can't be reached,
      // fall back to a local-only account so the site still works.
      const reg = await registerAccount({ id: newUser.id, email: newUser.email, username, password, avatar: newUser.avatar, bio: newUser.bio });
      if (!reg.ok && !reg.offline) {
        setError(reg.error || 'This email is already registered.');
        return;
      }
      // Keep the server-assigned identity when available, but always keep the
      // local hash so this device can also sign in offline later.
      const stored = reg.ok && reg.user ? { ...newUser, ...reg.user, passwordHash } : newUser;

      MistVilDatabase.set('users_db', [...usersDb, stored]);
      MistVilDatabase.set('current_user_data', stored);
      MistVilDatabase.set('current_role', 'MEMBER');

      setSuccess('Account created successfully as a reader! 👤');
      setTimeout(() => {
        onLoginSuccess(stored);
        onClose();
      }, 1500);

    } else {
      // Sign In
      // Owner login is verified against a salted hash — the plaintext
      // password no longer exists anywhere in the shipped bundle.
      if (await verifyOwnerLogin(email, password)) {
        const customOwner = MistVilDatabase.get<any>('custom_user_OWNER', null);
        const ownerUser = customOwner && customOwner.email?.toLowerCase() === 'mistvil112@gmail.com' ? customOwner : {
          ...DEFAULT_USERS.OWNER,
          email: 'mistvil112@gmail.com'
        };
        MistVilDatabase.set('current_user_data', ownerUser);
        MistVilDatabase.set('current_role', 'OWNER' as UserRole);
        setSuccess('Owner signed in successfully! 👑');
        setTimeout(() => {
          onLoginSuccess(ownerUser);
          onClose();
        }, 1500);
        return;
      }

      const inputHash = await hashPassword(password);

      // Try the shared account server first so a reader can sign in from ANY
      // device — not only the one they registered on. On success, cache the
      // account locally (with the hash) so this device also works offline.
      const srv = await loginAccount(email, password);
      if (srv.ok && srv.user) {
        const user = { ...srv.user, passwordHash: inputHash };
        const existingIdx = usersDb.findIndex(u => u && (u.id === user.id || (u.email || '').toLowerCase() === email.toLowerCase()));
        if (existingIdx !== -1) usersDb[existingIdx] = { ...usersDb[existingIdx], ...user };
        else usersDb.push(user);
        MistVilDatabase.set('users_db', usersDb);
        MistVilDatabase.set('current_user_data', user);
        MistVilDatabase.set('current_role', user.role);
        setSuccess(`Welcome back, ${user.username}! ✨`);
        setTimeout(() => { onLoginSuccess(user); onClose(); }, 1500);
        return;
      }
      // The server explicitly rejected the credentials (not a network error).
      if (!srv.offline) {
        setError(srv.error || 'Incorrect email or password.');
        return;
      }

      // Offline / no server: fall back to the local account database. Accounts
      // created before hashing still hold a plaintext `password` — verify once,
      // then migrate them to `passwordHash` and drop the plaintext.
      const userIndex = usersDb.findIndex(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        (u.passwordHash === inputHash || (u.password && u.password === password))
      );
      if (userIndex === -1) {
        setError('Incorrect email or password.');
        return;
      }
      let user = usersDb[userIndex];
      if (user.password) {
        const { password: _plain, ...rest } = user;
        user = { ...rest, passwordHash: inputHash };
        usersDb[userIndex] = user;
        MistVilDatabase.set('users_db', usersDb);
      }

      // Opportunistically publish this local account to the shared server so
      // it becomes usable from other devices from now on.
      ensureAccountOnServer({ ...user, passwordHash: user.passwordHash || inputHash }).catch(() => { /* offline */ });

      MistVilDatabase.set('current_user_data', user);
      MistVilDatabase.set('current_role', user.role);
      setSuccess(`Welcome back, ${user.username}! ✨`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex justify-center items-center p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto glass-panel p-6 rounded-3xl shadow-2xl border border-white/10 relative animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-rose-600/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 text-purple-200 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <img src="/site_logo_v2.png" alt="Logo" className="w-12 h-12 rounded-full object-cover filter drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] mx-auto mb-3 block" referrerPolicy="no-referrer" />
          <h3 className="font-extrabold text-2xl text-white bg-gradient-to-r from-violet-400 to-rose-400 bg-clip-text text-transparent">
            {isRegister ? 'Create a New Account' : 'Sign In'}
          </h3>
          <p className="text-xs text-purple-300 mt-1">
            {isRegister ? 'Join the MistVil community for novels' : 'Sign in to track your reading and requests'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-semibold text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-300 font-semibold text-center">
              🎉 {success}
            </div>
          )}

          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-purple-200">Username</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. mist_reader"
                  className="w-full pr-3 pl-10 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors text-left"
                  required
                />
                <UserIcon size={14} className="absolute top-3.5 left-3.5 text-purple-400" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-purple-200">Email</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full pr-3 pl-10 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors text-left"
                dir="ltr"
                required
              />
              <Mail size={14} className="absolute top-3.5 left-3.5 text-purple-400" />
            </div>
            {/* Owner credentials display hidden for privacy and security */}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-purple-200">Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-3 pl-10 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors text-left"
                required
              />
              <Lock size={14} className="absolute top-3.5 left-3.5 text-purple-400" />
            </div>
          </div>

          {isRegister && (
            <label className="flex items-start gap-2.5 cursor-pointer mt-1 select-none text-left">
              <input 
                type="checkbox"
                checked={acceptPolicy}
                onChange={(e) => setAcceptPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-violet-600 rounded cursor-pointer"
                required
              />
              <span className="text-[10px] text-purple-300 leading-relaxed">
                I agree to the <span className="font-bold text-white text-[11px]">platform policy</span>: no offensive language, respect for other readers, no stealing translators’ work, and all rights reserved.
              </span>
            </label>
          )}

          <button 
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl text-xs font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-lg shadow-violet-500/20"
          >
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            <span>{isRegister ? 'Create account & reader membership' : 'Sign in'}</span>
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-purple-300">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button onClick={() => setIsRegister(false)} className="text-violet-400 hover:text-violet-300 font-bold underline cursor-pointer">
                Sign in here
              </button>
            </span>
          ) : (
            <span>
              Don’t have an account yet?{' '}
              <button onClick={() => setIsRegister(true)} className="text-violet-400 hover:text-violet-300 font-bold underline cursor-pointer">
                Create a reader account now
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
