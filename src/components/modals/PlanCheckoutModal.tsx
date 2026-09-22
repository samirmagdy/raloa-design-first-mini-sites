import React, { useState } from 'react';
import { X, Check, ShieldCheck, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { Locale, PricingPlan } from '../../types';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface PlanCheckoutModalProps {
  plan: PricingPlan | null;
  isYearly: boolean;
  locale: Locale;
  onClose: () => void;
  onConfirmPlan: (plan: PricingPlan) => void;
}

export const PlanCheckoutModal: React.FC<PlanCheckoutModalProps> = ({
  plan,
  isYearly,
  locale,
  onClose,
  onConfirmPlan
}) => {
  const isRtl = locale === 'ar';
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dialogRef = useModalAccessibility<HTMLDivElement>(true);

  if (!plan) return null;

  const price = plan.priceMonthly === 0 ? 0 : isYearly ? plan.priceYearly : plan.priceMonthly;
  const annualTotal = (price * 12).toFixed(2);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (plan.priceMonthly === 0) {
      onConfirmPlan(plan);
      return;
    }

    const endpoint = import.meta.env.VITE_CHECKOUT_ENDPOINT;
    if (!endpoint) {
      setErrorMessage(
        isRtl
          ? 'الدفع غير مهيأ في هذه النسخة. لم يتم تحصيل أي مبلغ.'
          : 'Checkout is not configured for this deployment. No payment was taken.'
      );
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, billing: isYearly ? 'yearly' : 'monthly', email: email.trim() })
      });
      if (!response.ok) throw new Error(`Checkout request failed: ${response.status}`);
      setSuccess(true);
      onConfirmPlan(plan);
    } catch {
      setErrorMessage(
        isRtl
          ? 'تعذر إتمام الدفع حالياً. لم يتم تحصيل أي مبلغ.'
          : 'Checkout could not be completed. No payment was taken.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-checkout-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span id="plan-checkout-modal-title" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              {isRtl ? 'اختيار باقة الاشتراك' : 'Plan Selection & Activation'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {isRtl ? 'تم تفعيل باقتك بنجاح!' : 'Plan Activated Successfully!'}
              </h3>
              <p className="text-xs text-slate-600">
                {isRtl
                  ? `أنت الآن مشترك في باقة ${plan.nameAr}. جاري نقلك إلى الاستوديو...`
                  : `You are now on the ${plan.name} plan. Redirecting to your Studio...`}
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-5">
              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900">
                    {isRtl ? plan.nameAr : plan.name}
                  </h4>
                  <p className="text-xs text-indigo-700">
                    {isYearly ? (isRtl ? 'الفاتورة تُدفع سنوياً (وفرت ٢٠٪)' : 'Billed annually (Saved 20%)') : (isRtl ? 'الفاتورة شهرية' : 'Billed monthly')}
                  </p>
                </div>
                <div className="text-right rtl:text-left">
                  <span className="text-2xl font-black text-[#0F172A]">
                    {plan.priceMonthly === 0 ? '$0' : `$${price.toFixed(price % 1 === 0 ? 0 : 2)}`}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    / {isRtl ? plan.periodAr : plan.period}
                  </span>
                </div>
              </div>

              {/* Feature summary */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  {isRtl ? 'المزايا المشمولة' : 'Included in this plan'}
                </span>
                {(isRtl ? plan.featuresAr : plan.features).slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Email field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRtl ? 'بريدك الإلكتروني للحساب' : 'Account Email'}
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

              {plan.priceMonthly > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isRtl
                      ? 'ضمان استرداد كامل خلال ١٤ يوماً دون أي قيود.'
                      : '14-day no-questions-asked money-back guarantee.'}
                  </span>
                </div>
              )}

              {errorMessage && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {plan.priceMonthly === 0
                    ? isRtl ? 'ابدأ مجاناً الآن' : 'Start Free Now'
                    : isRtl ? `تأكيد الاشتراك ($${price}/شهر)` : `Activate ${plan.name} ($${price}/mo)`}
                </span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
