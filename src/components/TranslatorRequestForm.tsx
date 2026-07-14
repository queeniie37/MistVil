import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, Clock, Send, Globe, MessageSquare, Briefcase } from 'lucide-react';
import { User, TranslatorRequest } from '../types';
import { MistVilDatabase } from '../data';

interface TranslatorRequestFormProps {
  currentUser: User;
  onRequestSubmitted: () => void;
}

export default function TranslatorRequestForm({ currentUser, onRequestSubmitted }: TranslatorRequestFormProps) {
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [discord, setDiscord] = useState('');
  const [telegram, setTelegram] = useState('');
  
  const [myRequests, setMyRequests] = useState<TranslatorRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const languagesOptions = ['Korean', 'Chinese', 'Japanese', 'English', 'Other'];

  const loadRequests = () => {
    const allReqs = MistVilDatabase.get<TranslatorRequest[]>('translator_requests', []);
    setMyRequests(allReqs.filter(r => r.email.toLowerCase() === currentUser.email.toLowerCase()));
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser]);

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (languages.length === 0) {
      setError('Please select at least one translation language.');
      return;
    }
    if (!experience.trim() || !reason.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    const newRequest: TranslatorRequest = {
      id: `req-${Date.now()}`,
      username: currentUser.username,
      email: currentUser.email,
      discord: discord || currentUser.discord,
      telegram: telegram || currentUser.telegram,
      experience: experience,
      languages: languages,
      reason: reason,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    // Save to DB
    const allReqs = MistVilDatabase.get<TranslatorRequest[]>('translator_requests', []);
    MistVilDatabase.set('translator_requests', [newRequest, ...allReqs]);

    // Send notifications to owner
    const allNotifs = MistVilDatabase.get<any[]>('notifications', []);
    const newNotif = {
      id: `notif-req-${Date.now()}`,
      userId: 'mistvil-owner',
      title: '📥 New translator application',
      message: `Member "${currentUser.username}" submitted a translator application for review and approval.`,
      type: 'ROLE',
      isRead: false,
      createdAt: 'now'
    };
    MistVilDatabase.set('notifications', [...allNotifs, newNotif]);

    setTimeout(() => {
      setLoading(false);
      setSuccess('Your application was submitted successfully! It’s now under review by the platform owner. 🌫️');
      setExperience('');
      setLanguages([]);
      setReason('');
      setDiscord('');
      setTelegram('');
      loadRequests();
      onRequestSubmitted();
    }, 1500);
  };

  const hasPending = myRequests.some(r => r.status === 'PENDING');

  return (
    <div className="w-full text-left mt-6 animate-in fade-in duration-300">
      <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-[40px] pointer-events-none" />

        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
          <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
            <Award size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Apply to Become an Official Translator ✍️</h3>
            <p className="text-[10px] text-purple-400 mt-0.5">Translate your favorite novels, publish chapters live, and earn support and rewards from the MistVil community.</p>
          </div>
        </div>

        {/* Existing requests status */}
        {myRequests.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <span className="text-xs font-bold text-purple-300">Your previous applications:</span>
            {myRequests.map((req) => (
              <div 
                key={req.id} 
                className={`p-4 rounded-2xl border text-xs flex justify-between items-center ${
                  req.status === 'PENDING' 
                    ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300' 
                    : req.status === 'ACCEPTED' 
                      ? 'bg-green-500/5 border-green-500/20 text-green-300' 
                      : 'bg-red-500/5 border-red-500/20 text-red-300'
                }`}
              >
                <div className="flex flex-col gap-1 text-left">
                  <span className="font-bold">Application date: {new Date(req.createdAt).toLocaleDateString('en-US')}</span>
                  <span className="text-[10px] text-purple-400">Languages: {req.languages.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">
                    {req.status === 'PENDING' && '⏳ Under review'}
                    {req.status === 'ACCEPTED' && '✅ Accepted (congrats!)'}
                    {req.status === 'REJECTED' && '❌ Rejected'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasPending ? (
          <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-200 text-center font-semibold">
            You have a pending application under review. Please wait for the platform owner to review and approve it. 🌫️
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Experience */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5 justify-start">
                  <span>Previous experience & work (required)</span>
                  <Briefcase size={14} className="text-purple-400" />
                </label>
                <textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. I’ve translated 50+ chapters with other teams, or this is my first time but my language skills are excellent..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors h-28 text-left resize-none"
                  required
                />
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5 justify-start">
                  <span>Why do you want to join us? (required)</span>
                  <MessageSquare size={14} className="text-purple-400" />
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us about your motivation and desire to enrich the platform’s novel content..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors h-28 text-left resize-none"
                  required
                />
              </div>
            </div>

            {/* Languages checkbox */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5 justify-start">
                <span>Which languages do you translate from? (select one or more)</span>
                <Globe size={14} className="text-purple-400" />
              </label>
              <div className="flex flex-wrap gap-2 justify-start">
                {languagesOptions.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      languages.includes(lang)
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-white/5 border-white/5 text-purple-300 hover:bg-white/10'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Discord */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-purple-200">Discord (optional)</label>
                <input
                  type="text"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="username#0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors text-left"
                />
              </div>

              {/* Telegram */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-purple-200">Telegram (optional)</label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors text-left"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-fit md:px-8 py-3 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl text-xs font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 ml-auto shadow-lg shadow-violet-500/10"
            >
              <Send size={14} />
              <span>{loading ? 'Submitting...' : 'Submit translator application'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
