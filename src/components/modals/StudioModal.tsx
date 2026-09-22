import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Share2,
  Copy,
  ExternalLink,
  ArrowRight,
  ChevronLeft,
  Smartphone,
  Eye,
  Sliders,
  Globe,
  Upload,
  QrCode,
  Printer
} from 'lucide-react';
import { Locale, TemplateItem, MiniSiteUserConfig } from '../../types';
import { templatesData } from '../../data/content';
import { PhoneMockup } from '../PhoneMockup';
import { RaloaMark } from '../brand/RaloaLogo';
import { fireSiteLaunchConfetti } from '../../utils/confetti';
import { SocialPreviewGenerator } from '../studio/SocialPreviewGenerator';
import { copyTextToClipboard } from '../../utils/clipboard';

interface StudioModalProps {
  initialUsername?: string;
  initialTemplate?: TemplateItem;
  locale: Locale;
  onClose: () => void;
}

export const StudioModal: React.FC<StudioModalProps> = ({
  initialUsername = 'creator',
  initialTemplate,
  locale,
  onClose
}) => {
  const isRtl = locale === 'ar';
  const defaultTemplate = initialTemplate || templatesData[0];

  const [username, setUsername] = useState(initialUsername || 'alex');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(defaultTemplate);
  const [displayName, setDisplayName] = useState(defaultTemplate.name);
  const [role, setRole] = useState(defaultTemplate.role);
  const [bio, setBio] = useState(isRtl ? defaultTemplate.bioAr : defaultTemplate.bio);
  const [avatar, setAvatar] = useState(defaultTemplate.avatar);
  
  const [links, setLinks] = useState(
    defaultTemplate.sampleLinks.map((l) => ({
      id: l.id,
      title: isRtl ? l.titleAr : l.title,
      url: l.url,
      subtitle: (isRtl ? l.subtitleAr : l.subtitle) || '',
      type: l.type || 'link'
    }))
  );

  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newType, setNewType] = useState<'link' | 'gallery' | 'booking' | 'shop'>('link');

  const [activeTab, setActiveTab] = useState<'design' | 'content' | 'social' | 'share'>('design');
  const [previewMode, setPreviewMode] = useState<'phone' | 'social'>('phone');
  const [isPublished, setIsPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Trigger site launch with celebratory confetti explosion
  const handleStartOrPublishSite = () => {
    setIsPublished(true);
    setActiveTab('share');
    fireSiteLaunchConfetti();
  };

  // Sync when template changes
  const handleTemplateSwitch = (tmpl: TemplateItem) => {
    setSelectedTemplate(tmpl);
    setDisplayName(tmpl.name);
    setRole(tmpl.role);
    setBio(isRtl ? tmpl.bioAr : tmpl.bio);
    setAvatar(tmpl.avatar);
    setLinks(
      tmpl.sampleLinks.map((l) => ({
        id: l.id,
        title: isRtl ? l.titleAr : l.title,
        url: l.url,
        subtitle: (isRtl ? l.subtitleAr : l.subtitle) || '',
        type: l.type || 'link'
      }))
    );
  };

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    setLinks([
      ...links,
      {
        id: `link-${Date.now()}`,
        title: newTitle.trim(),
        url: newUrl.trim(),
        subtitle: newSubtitle.trim(),
        type: newType
      }
    ]);
    setNewTitle('');
    setNewUrl('');
    setNewSubtitle('');
  };

  const removeLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleCopyLink = async () => {
    const url = `https://raloa.app/@${username}`;
    if (await copyTextToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Preview template constructed from user state
  const livePreviewTemplate: TemplateItem = {
    ...selectedTemplate,
    name: displayName,
    role: role,
    bio: bio,
    bioAr: bio,
    avatar: avatar,
    sampleLinks: links.map((l) => ({
      id: l.id,
      title: l.title,
      titleAr: l.title,
      subtitle: l.subtitle,
      subtitleAr: l.subtitle,
      url: l.url,
      type: l.type as any
    }))
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 raloa-studio-modal-container"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[860px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col raloa-studio-modal-card">
        
        {/* Studio Top Navigation Bar */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 print:border-b-2 print:border-slate-800">
          <div className="flex items-center gap-3">
            <RaloaMark size={34} />
            <div>
              <h2 className="text-sm font-extrabold text-[#0F172A] leading-tight flex items-center gap-1.5">
                <span>RALOA Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 print:hidden">
                  {isRtl ? 'مباشر' : 'Live Editor'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                raloa.app/@{username}
              </p>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl print:hidden">
            <button
              onClick={() => setActiveTab('design')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'design'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'القالب والمظهر' : 'Templates & Design'}
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'content'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'الروابط والمحتوى' : 'Links & Bio'}
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'social'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Share2 className="w-3 h-3 text-indigo-500" />
              <span>{isRtl ? 'المعاينة الاجتماعية' : 'Social Preview'}</span>
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'share'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'النشر والمشاركة' : 'Publish & Share'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label={isRtl ? 'طباعة معاينة الموقع' : 'Print Mini-Site Preview'}
              title={isRtl ? 'طباعة معاينة الموقع' : 'Print Mini-Site Preview'}
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleStartOrPublishSite}
              className="px-4 py-2 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isPublished ? (isRtl ? 'تم النشر بنجاح' : 'Live & Published') : (isRtl ? 'نشر وتفعيل الموقع' : 'Launch Site')}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Workspace: Split 2-Column (Left: Editor Panels, Right: Live Phone Screen) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50 print:bg-white print:block">
          
          {/* Left Column: Editor Controls (lg:col-span-7) */}
          <div className="lg:col-span-7 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white border-r border-slate-200 studio-editor-sidebar print:hidden">
            
            {/* Mobile Tab Switcher */}
            <div className="sm:hidden flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'design' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {isRtl ? 'القالب' : 'Template'}
              </button>
              <button
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'content' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {isRtl ? 'المحتوى' : 'Content'}
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'social' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {isRtl ? 'المعاينة' : 'Social'}
              </button>
              <button
                onClick={() => setActiveTab('share')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'share' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {isRtl ? 'المشاركة' : 'Share'}
              </button>
            </div>

            {/* TAB 1: DESIGN & TEMPLATE SELECTION */}
            {activeTab === 'design' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">
                    {isRtl ? 'اختر قالب التصميم الأساسي' : 'Select a Design Template'}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isRtl
                      ? 'جميع القوالب مصممة باحترافية وتتكيف تلقائياً مع محتواك وروابطك.'
                      : 'All templates are crafted with responsive typography, curated colors and conversion-focused cards.'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {templatesData.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleTemplateSwitch(tmpl)}
                        className={`p-2.5 rounded-2xl border text-left rtl:text-right transition-all flex flex-col items-center group cursor-pointer ${
                          selectedTemplate.id === tmpl.id
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={tmpl.avatar}
                          alt={tmpl.name}
                          className="w-14 h-14 rounded-full object-cover mb-2 border border-slate-200 group-hover:scale-105 transition-transform"
                        />
                        <span className="font-bold text-xs text-slate-900 text-center truncate w-full">
                          {tmpl.name}
                        </span>
                        <span className="text-[10px] text-slate-500 text-center truncate w-full">
                          {tmpl.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Handle & Username settings */}
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    {isRtl ? 'رابط الصفحة المخصص' : 'Your Page Handle'}
                  </h4>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white">
                    <span className="text-xs font-bold text-slate-400 select-none ltr:mr-1 rtl:ml-1">
                      raloa.app/@
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full"
                    />
                  </div>

                  {/* Tab 1 Navigation & Launch Button */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('content')}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      {isRtl ? 'متابعة لتعديل الروابط ←' : 'Next: Edit Links →'}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartOrPublishSite}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'بدء ونشر الموقع الآن' : 'Start & Launch Site'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONTENT & LINKS MANAGER */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">
                    {isRtl ? 'الملف الشخصي والنبذة' : 'Profile & Bio'}
                  </h3>
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isRtl ? 'الاسم الظاهر' : 'Display Name'}
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isRtl ? 'المسمى الوظيفي أو التخصص' : 'Role or Tagline'}
                      </label>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isRtl ? 'النبذة التعريفية' : 'Bio description'}
                      </label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Add New Link Section */}
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    {isRtl ? 'إضافة رابط جديد أو خدمة' : 'Add New Link or Feature'}
                  </h4>

                  <form onSubmit={addLink} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          {isRtl ? 'عنوان الرابط' : 'Link Title'}
                        </label>
                        <input
                          type="text"
                          placeholder={isRtl ? 'مثال: معرض أعمالي' : 'e.g. My Portfolio'}
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          {isRtl ? 'الرابط URL' : 'Target URL'}
                        </label>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          {isRtl ? 'الوصف الفرعي (اختياري)' : 'Subtitle (Optional)'}
                        </label>
                        <input
                          type="text"
                          placeholder={isRtl ? 'تفاصيل موجزة' : 'Short helper text'}
                          value={newSubtitle}
                          onChange={(e) => setNewSubtitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          {isRtl ? 'نوع البطاقة' : 'Card Type'}
                        </label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="link">Regular Link</option>
                          <option value="booking">Calendar Booking</option>
                          <option value="shop">Product / Checkout</option>
                          <option value="gallery">Photo Gallery</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'إضافة هذا الرابط' : 'Add to Mini-Site'}</span>
                    </button>
                  </form>

                  {/* Active Links List */}
                  <div className="mt-4 space-y-2">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-2 rtl:mr-0 rtl:ml-2">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {link.title}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {link.url}
                          </span>
                        </div>
                        <button
                          onClick={() => removeLink(link.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          aria-label="Remove link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Tab 2 Navigation & Launch Button */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('design')}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      {isRtl ? '← العودة للقوالب' : '← Back to Templates'}
                    </button>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab('social')}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isRtl ? 'معاينة بطاقة المشاركة' : 'Social Preview'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStartOrPublishSite}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'بدء ونشر الموقع الآن' : 'Start & Launch Site'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SOCIAL PREVIEW & OPENGRAPH GENERATOR */}
            {activeTab === 'social' && (
              <div className="space-y-6">
                <SocialPreviewGenerator
                  username={username}
                  displayName={displayName}
                  role={role}
                  bio={bio}
                  avatar={avatar}
                  linksCount={links.length}
                  locale={locale}
                />

                {/* Tab Navigation Controls */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('content')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {isRtl ? '← العودة لتعديل الروابط' : '← Back to Links'}
                  </button>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('share')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isRtl ? 'متابعة إلى النشر والمشاركة' : 'Continue to Publish'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PUBLISH & SHARE */}
            {activeTab === 'share' && (
              <div className="space-y-6 text-center sm:text-left rtl:sm:text-right">
                <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-3xl">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto sm:mx-0 mb-3 shadow-md">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">
                    {isRtl ? 'موقعك المصغر منشور ويعمل مباشرة!' : 'Your RALOA Mini-Site is Live!'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mb-4 leading-relaxed">
                    {isRtl
                      ? `تم حفظ ونشر جميع تعديلاتك على الرابط العالمي raloa.app/@${username}. يمكنك مشاركته فوراً في بايو انستغرام وتيك توك ولينكدإن.`
                      : `Your updates are published instantly to the global edge network at raloa.app/@${username}. Share your link anywhere.`}
                  </p>

                  {/* Share Link Box */}
                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex-1 px-3 py-1 text-xs font-mono text-slate-700 font-bold truncate">
                      https://raloa.app/@{username}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الرابط' : 'Copy Link')}</span>
                    </button>
                  </div>
                </div>

                {/* Social OpenGraph Preview Quick-Jump Banner */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left rtl:text-right">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {isRtl ? 'معاينة بطاقة المشاركة الاجتماعية (OpenGraph)' : 'Social Share & OpenGraph Preview'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isRtl
                          ? 'تحقق من كيفية ظهور بطاقة موقعك على تويتر، لينكدإن، ورسائل iMessage.'
                          : 'See exactly how your link appears on Twitter (X), LinkedIn, and messaging apps.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('social')}
                    className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-indigo-600 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer text-center"
                  >
                    {isRtl ? 'تخصيص بطاقة المشاركة ←' : 'Open Social Preview →'}
                  </button>
                </div>

                {/* QR Code, Celebrate & Direct Actions */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    onClick={fireSiteLaunchConfetti}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isRtl ? 'احتفل بالنشر 🎉' : 'Celebrate Launch 🎉'}</span>
                  </button>

                  <button
                    onClick={() => setShowQr(!showQr)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-slate-600" />
                    <span>{showQr ? (isRtl ? 'إخفاء رمز QR' : 'Hide QR') : (isRtl ? 'عرض رمز QR' : 'View QR Code')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(`https://raloa.app/@${encodeURIComponent(username)}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>{isRtl ? 'فتح في علامة تبويب جديدة' : 'Open in New Tab'}</span>
                  </button>
                </div>

                {showQr && (
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl inline-flex flex-col items-center justify-center shadow-md animate-in fade-in">
                    {/* SVG Clean Vector QR Mockup */}
                    <div className="w-40 h-40 bg-slate-900 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <div className="w-10 h-10 bg-white rounded-md p-1.5"><div className="w-full h-full bg-slate-900 rounded-xs" /></div>
                        <div className="w-10 h-10 bg-white rounded-md p-1.5"><div className="w-full h-full bg-slate-900 rounded-xs" /></div>
                      </div>
                      <div className="flex justify-center gap-1">
                        <div className="w-4 h-4 bg-white rounded-xs" />
                        <div className="w-4 h-4 bg-white rounded-xs" />
                        <div className="w-4 h-4 bg-white rounded-xs" />
                      </div>
                      <div className="flex justify-between">
                        <div className="w-10 h-10 bg-white rounded-md p-1.5"><div className="w-full h-full bg-slate-900 rounded-xs" /></div>
                        <div className="w-6 h-6 bg-white rounded-xs ml-auto" />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 mt-2">
                      Scan to visit raloa.app/@{username}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column: Live Phone / Social Mockup Stage (lg:col-span-5) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-indigo-50/30 to-purple-50/20 overflow-y-auto studio-preview-column print:flex! print:p-2! print:bg-white! print:overflow-visible!">
            
            {/* View Mode Switcher Pill */}
            <div className="mb-3 flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-2xs print:hidden">
              <button
                type="button"
                onClick={() => setPreviewMode('phone')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewMode === 'phone'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isRtl ? 'معاينة الهاتف' : 'Phone Mockup'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('social')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewMode === 'social'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isRtl ? 'بطاقة التواصل' : 'Social Card'}</span>
              </button>
            </div>

            {previewMode === 'phone' ? (
              <div className="w-full max-w-[320px] scale-[0.92] origin-top print:scale-100 print:max-w-[420px]">
                <div className="text-center mb-2 print:hidden">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {isRtl ? 'المعاينة الحية التفاعلية' : 'Live Interactive Preview'}
                  </span>
                </div>
                <PhoneMockup
                  template={livePreviewTemplate}
                  isRtl={isRtl}
                  interactive={true}
                />
              </div>
            ) : (
              <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-200 p-2">
                <div className="text-center mb-2 print:hidden">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {isRtl ? 'معاينة بطاقة OpenGraph التفاعلية' : 'Dynamic OpenGraph Mockup'}
                  </span>
                </div>
                <SocialPreviewGenerator
                  username={username}
                  displayName={displayName}
                  role={role}
                  bio={bio}
                  avatar={avatar}
                  linksCount={links.length}
                  locale={locale}
                  isCompact={true}
                />
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
