import React, { useState } from 'react';
import { X, Send, Check, MessageSquare } from 'lucide-react';
import { Locale } from '../../types';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface ContactModalProps {
  locale: Locale;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ locale, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const isRtl = locale === 'ar';
  const dialogRef = useModalAccessibility<HTMLDivElement>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`RALOA support request from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:support@raloa.app?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span id="contact-modal-title" className="text-xs font-bold text-slate-800">
              {isRtl ? 'تواصل مع فريق دعم رالوا' : 'Contact RALOA Support'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label={isRtl ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {sent ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {isRtl ? 'تم فتح مسودة البريد الإلكتروني' : 'Email draft opened'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'تم فتح تطبيق البريد لديك. أرسل الرسالة لإكمال التواصل مع فريق الدعم.'
                  : 'Your email client was opened. Send the draft to contact support.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'الاسم' : 'Your Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRtl ? 'سارة المنصوري' : 'Alex Rivera'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'كيف يمكننا مساعدتك؟' : 'How can we help?'}
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isRtl ? 'اكتب استفسارك هنا...' : 'Questions about custom domains, Arabic localization, or enterprise plans...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-ink hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isRtl ? 'إرسال الرسالة' : 'Send Inquiry'}</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
