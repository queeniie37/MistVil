import React, { useState } from 'react';
import { FileText, Edit3, Save, CheckCircle, RefreshCw, Eye, ArrowLeft, Lock } from 'lucide-react';
import { User } from '../types';
import { MistVilDatabase } from '../data';

interface TermsOfServiceProps {
  currentUser: User;
  onNavigate: (page: string, params?: any) => void;
}

const DEFAULT_TERMS = `## MistVil Terms of Service 🌫️

Last updated: July 9, 2026

Welcome to MistVil. Please read the following terms of service carefully before using the site. By accessing the site or using any of its services, you agree to be bound by these terms.

---

### 1. Acceptance of Terms
By using MistVil you agree to comply with all terms of service, the privacy policy, and any other policies published on the site.
If you do not agree to any of these terms, please do not use the site.

---

### 2. Use of the Site
The site may only be used for personal and lawful purposes.
The user agrees not to:
- Use the site for any activity that violates regulations or laws.
- Attempt to hack the site or gain unauthorized access to its systems.
- Publish any offensive or unlawful content, or content that infringes the rights of others.
- Use automated software or tools that affect the site's performance or collect data without permission.

---

### 3. User Accounts
When creating an account on MistVil, the user agrees to:
- Provide true and accurate information.
- Keep their login credentials confidential.
- Take full responsibility for all activity carried out through their account.
- Notify site administration immediately upon suspecting any unauthorized use of the account.
MistVil reserves the right to suspend or terminate any account that violates these terms.

---

### 4. Content
MistVil strives to provide an outstanding reading experience, but we do not guarantee that all published material is free of errors or complete.
Any content may be modified, updated, or deleted at any time without prior notice.

---

### 5. Comments and Contributions
Users may post comments and reviews in accordance with general etiquette and applicable regulations.
The following are prohibited:
- Abuse, defamation, or hate speech.
- Spam or unauthorized advertising.
- Any content that infringes intellectual property or the rights of others.
- Any misleading or harmful information.
MistVil reserves the right to delete any violating content or comment without prior notice.

---

### 6. Intellectual Property Rights
All elements of the site, including the design, logo, interface, software, and the site's own text, are protected by intellectual property rights.
No part of the site may be copied, republished, or distributed without prior permission from MistVil or the rights holder, as applicable.
The user is responsible for respecting the intellectual property rights of the content they share through the site.

---

### 7. Advertising and External Services
The site may display ads or links to external services and sites.
MistVil bears no responsibility for the content, policies, or services of those external parties.

---

### 8. Service Suspension
MistVil reserves the right to:
- Suspend or terminate the account of any user who violates these terms.
- Modify or discontinue any part of the site's services at any time.
- Remove any content it deems to be in violation or that may cause harm to the site or its users.

---

### 9. Limitation of Liability
MistVil makes reasonable efforts to keep the site stable, but we do not guarantee uninterrupted operation or freedom from technical errors.
The site bears no responsibility for any losses or damages resulting from the use of, or inability to use, the site, to the extent permitted by law.

---

### 10. Changes to the Terms
MistVil may modify the terms of service at any time.
The updated version will be published on this page, and continued use of the site after changes are posted constitutes acceptance of the new terms.

---

### 11. Account Termination
Users may request deletion of their account at any time.
MistVil administration may also suspend or delete any account that violates the terms of service or misuses the site's services.

---

### 12. Governing Law
These terms are governed by and interpreted in accordance with applicable regulations and laws, and any dispute related to the use of the site is subject to the competent judicial authority under those regulations.

---

### 13. Contact Us
If you have any questions or comments about the terms of service, you can reach us through the Contact Us page or via the site's official email when available.

---

By using MistVil, you acknowledge that you have read, understood, and agree to be bound by these terms of service.`;

export default function TermsOfService({ currentUser, onNavigate }: TermsOfServiceProps) {
  const isOwner = currentUser?.role === 'OWNER';

  const [content, setContent] = useState(() => {
    const saved = MistVilDatabase.get<string>('terms_of_service_text', '');
    if (!saved || saved.trim() === '') {
      MistVilDatabase.set('terms_of_service_text', DEFAULT_TERMS);
      return DEFAULT_TERMS;
    }
    return saved;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(content);
  const [success, setSuccess] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    MistVilDatabase.set('terms_of_service_text', editVal);
    setContent(editVal);
    setIsEditing(false);
    setSuccess('Terms of service saved and updated successfully! 💾');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleResetDefault = () => {
    if (window.confirm('Are you sure you want to restore the default terms of service text?')) {
      setEditVal(DEFAULT_TERMS);
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
              <span>Terms of Service</span>
              <FileText className="text-violet-400" size={24} />
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
              <span className="text-[10px] text-purple-300 block">You have full permission to edit and shape these terms of service to match your vision.</span>
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
                <span>View terms</span>
              </>
            ) : (
              <>
                <Edit3 size={14} />
                <span>Edit terms of service</span>
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
            <span className="text-xs text-purple-300 font-bold">Terms editor (supports text formatting and Markdown) ✍️</span>
          </div>

          <textarea
            required
            rows={18}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            className="bg-[#131F33] border border-white/10 focus:border-violet-500 outline-none rounded-xl p-4 text-white text-xs font-sans leading-relaxed min-h-[50vh] resize-y"
            placeholder="Write the terms of service here..."
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
              <span>Save & update terms 💾</span>
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
