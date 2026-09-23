import React, { useState } from 'react';
import { X, ArrowRight, Check, Mail, Lock, AlertCircle } from 'lucide-react';
import { Locale } from '../../types';
import { RaloaMark } from '../brand/RaloaLogo';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';
import { useRepository } from '../../services/RepositoryContext';
import { text } from '../../i18n/ui';
import type { AuthMode } from '../../services/contracts/auth';

interface AuthModalProps {
  initialMode?: 'signin' | 'signup';
  locale: Locale;
  onClose: () => void;
  onSuccess: (email: string, mode: AuthMode) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'signin',
  locale,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isRtl = locale === 'ar';
  const dialogRef = useModalAccessibility<HTMLDivElement>(true);
  const repository = useRepository();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setErrorMessage('');
    const result = await repository.auth.signIn({ email, password }, mode);
    if ('error' in result) {
      setErrorMessage(text(result.error.message, locale));
      return;
    }
    setSubmitted(true);
    onSuccess(email, mode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <RaloaMark size={24} theme="monochrome-black" />
            <span id="auth-modal-title" className="text-xs font-bold text-slate-800">
              {mode === 'signin'
                ? isRtl ? 'تسجيل الدخول إلى رالوا' : 'Sign in to RALOA'
                : isRtl ? 'إنشاء حساب جديد' : 'Create your RALOA account'}
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

        {/* Body */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {isRtl ? 'مرحباً بك مجدداً!' : 'Welcome back!'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRtl ? 'جاري تحويلك إلى لوحة التحكم...' : 'Redirecting to your dashboard...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label htmlFor="auth-email" className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 rtl:left-auto rtl:right-3" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full min-h-11 pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 rtl:left-auto rtl:right-3" />
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-11 pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-11 py-3 rounded-xl bg-ink hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{mode === 'signin' ? (isRtl ? 'تسجيل الدخول' : 'Sign In') : (isRtl ? 'إنشاء حساب جديد' : 'Sign Up Free')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>

              {errorMessage && (
                <div role="alert" className="flex items-center gap-2 text-xs text-rose-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="min-h-11 px-3 text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  {mode === 'signin'
                    ? isRtl ? 'ليس لديك حساب؟ سجل مجاناً الآن' : "Don't have an account? Sign up free"
                    : isRtl ? 'لديك حساب بالفعل؟ سجل دخولك' : 'Already have an account? Sign in'}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
