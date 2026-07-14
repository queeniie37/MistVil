import React, { useState } from 'react';
import { Shield, Edit3, Save, CheckCircle, RefreshCw, Eye, ArrowLeft, Lock } from 'lucide-react';
import { User } from '../types';
import { MistVilDatabase } from '../data';

interface PrivacyPolicyProps {
  currentUser: User;
  onNavigate: (page: string, params?: any) => void;
}

const DEFAULT_PRIVACY_POLICY = `## MistVil Privacy Policy 🌫️

Last updated: July 9, 2026

Welcome to MistVil. We are committed to protecting the privacy of our users and to handling their personal data transparently and securely. By using the site, you agree to the privacy policy described below.

---

### 1. Information We Collect

We may collect the following information:
- Name or username.
- Email address.
- Password (stored encrypted; we cannot read it).
- Profile picture (if the user adds one).
- Reading history, bookmarks, and saved chapters.
- Comments, ratings, and reviews the user posts.
- Technical data such as IP address, browser type, device type, operating system, and language.
- Cookies to improve the user experience.

---

### 2. How We Use Information

We use information to:
- Create and manage the user's account.
- Save reading progress and personal settings.
- Improve site performance and the user experience.
- Deliver relevant content based on the user's interests.
- Respond to inquiries and technical support requests.
- Protect the site from misuse or unlawful activity.
- Send account-related notifications or important updates when needed.

---

### 3. Cookies

MistVil uses cookies to improve performance, remember user preferences, and analyze site usage. Users can disable cookies through their browser settings, though this may affect some site functionality.

---

### 4. Sharing Information

We do not sell, rent, or share users' personal data with any third party for marketing purposes.

Data may only be shared in the following cases:
- When there is a legal obligation.
- To protect the rights of MistVil or its users.
- With technical service providers who help operate the site, provided they are bound to protect the data.

---

### 5. Data Protection

We apply appropriate security measures and technologies to help protect user data from unauthorized access, alteration, disclosure, or destruction.

Nevertheless, no data transmission over the internet can be guaranteed to be 100% secure.

---

### 6. User Accounts

The user is responsible for keeping their login credentials confidential and is responsible for all activity carried out using their account.

---

### 7. Content and Comments

The user bears full responsibility for any content, comment, or review they post.

MistVil reserves the right to delete any content that violates the law, infringes the rights of others, or conflicts with the site's policy.

---

### 8. Intellectual Property Rights

All designs, logos, trademarks, and software of MistVil are protected by intellectual property rights.

Rights to novels, their covers, titles, and original works remain owned by their creators and publishers, and all applicable copyrights must be respected.

---

### 9. External Site Links

The site may contain links to external sites or services, and MistVil bears no responsibility for the privacy policies or content of those sites.

---

### 10. User Rights

Subject to applicable laws, users may request to:
- Access their personal data.
- Modify their data.
- Delete their account and data.
- Withdraw their consent to data processing where possible.

---

### 11. Children's Privacy

MistVil does not target the collection of personal data from children below the age set by local laws. If we discover that we have collected data from a child without parental consent, we will take appropriate action to remove it.

---

### 12. Changes to the Privacy Policy

We may update this policy from time to time. Any change will be published on this page with an updated last-reviewed date.

Continued use of the site after changes are posted constitutes acceptance of the updated policy.

---

### 13. Contact Us

If you have any questions or comments about the privacy policy, you can reach us through the Contact Us page or the site's official email when available.

---

By using MistVil, you acknowledge that you have read, understood, and agree to be bound by this privacy policy.`;

export default function PrivacyPolicy({ currentUser, onNavigate }: PrivacyPolicyProps) {
  const isOwner = currentUser?.role === 'OWNER';
  
  const [content, setContent] = useState(() => {
    const saved = MistVilDatabase.get<string>('privacy_policy_text', '');
    if (!saved || saved.trim() === '' || saved.includes('سياسة الخصوصية وحماية البيانات لمنصة ميست فيل') || saved.includes('سياسة الخصوصية لموقع')) {
      MistVilDatabase.set('privacy_policy_text', DEFAULT_PRIVACY_POLICY);
      return DEFAULT_PRIVACY_POLICY;
    }
    return saved;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(content);
  const [success, setSuccess] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    MistVilDatabase.set('privacy_policy_text', editVal);
    setContent(editVal);
    setIsEditing(false);
    setSuccess('Privacy policy saved and updated successfully! 💾');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleResetDefault = () => {
    if (window.confirm('Are you sure you want to restore the default privacy policy text?')) {
      setEditVal(DEFAULT_PRIVACY_POLICY);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-left min-h-[70vh]">
      
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 border-b border-white/5 pb-6">
        <button 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
        >
          <ArrowLeft size={14} />
          <span>Back to home</span>
        </button>
        
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 justify-start">
              <span>Privacy Policy</span>
              <Shield className="text-violet-400" size={24} />
            </h1>
            <p className="text-[10px] text-purple-400 mt-1">Last updated: July 9, 2026</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold rounded-2xl mb-6 flex items-center justify-start gap-2 animate-in slide-in-from-top duration-300">
          <span>{success}</span>
          <CheckCircle size={16} />
        </div>
      )}

      {/* Owner controls */}
      {isOwner && (
        <div className="mb-6 p-4 bg-violet-950/15 border border-violet-500/25 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <Lock className="text-violet-400" size={16} />
            <div>
              <span className="text-xs font-extrabold text-white block">Welcome, site owner 👤</span>
              <span className="text-[10px] text-purple-300 block">You have full permission to edit and shape this privacy policy to match your vision.</span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              if (!isEditing) setEditVal(content);
            }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-violet-600/10"
          >
            {isEditing ? (
              <>
                <Eye size={14} />
                <span>View policy</span>
              </>
            ) : (
              <>
                <Edit3 size={14} />
                <span>Edit privacy policy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* View or Edit mode */}
      {isEditing && isOwner ? (
        <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Restore default text</span>
            </button>
            <span className="text-xs text-purple-300 font-bold">Policy editor (supports text formatting and Markdown) ✍️</span>
          </div>

          <textarea
            required
            rows={18}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl p-4 text-white text-xs font-sans leading-relaxed min-h-[50vh] resize-y"
            placeholder="Write the privacy policy here..."
          />

          <div className="flex gap-2 justify-start border-t border-white/5 pt-4 mt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-purple-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel editing
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-violet-500/10"
            >
              <Save size={14} />
              <span>Save & update policy 💾</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/5 leading-relaxed text-xs md:text-sm text-purple-100 flex flex-col gap-4 text-left">
          {/* Simple parser or markdown display */}
          <div className="whitespace-pre-wrap select-text selection:bg-violet-500/30">
            {content.split('\n').map((line, idx) => {
              if (line.startsWith('## ')) {
                return <h2 key={idx} className="text-base md:text-lg font-extrabold text-white mt-4 mb-2 pb-1 border-b border-white/5">{line.substring(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={idx} className="text-xs md:text-sm font-extrabold text-violet-400 mt-4 mb-1.5">{line.substring(4)}</h3>;
              }
              if (line.startsWith('- ')) {
                return <li key={idx} className="mr-4 list-disc text-purple-200 my-1">{line.substring(2)}</li>;
              }
              if (line.startsWith('---')) {
                return <hr key={idx} className="border-white/5 my-4" />;
              }
              return <p key={idx} className="text-[12.5px] leading-relaxed text-purple-200/90 mb-2">{line}</p>;
            })}
          </div>
        </div>
      )}

    </div>
  );
}
