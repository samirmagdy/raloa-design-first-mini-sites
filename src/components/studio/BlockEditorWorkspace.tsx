import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers3,
  Plus,
  Trash2
} from 'lucide-react';
import { Locale } from '../../types';
import { blockRegistry } from '../profile/BlockRenderer';
import { BlockDataValue, BlockType, ProfileBlock, ProfilePage } from '../../services/repository';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Surface } from '../ui/Surface';

interface BlockEditorWorkspaceProps {
  page: ProfilePage | null;
  locale: Locale;
  onPageChange: (page: ProfilePage) => void;
  onDirty: () => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createDefaultBlock = (type: BlockType, index: number): ProfileBlock => {
  const base: ProfileBlock = {
    id: `block-${Date.now()}-${index}`,
    type,
    title: blockRegistry.find((item) => item.type === type)?.label ?? 'New block',
    subtitle: '',
    visible: true,
    data: {}
  };

  if (type === 'link') return { ...base, title: 'New link', subtitle: 'Add a short description', url: 'https://example.com' };
  if (type === 'section') return { ...base, title: 'New section' };
  if (type === 'rich-text') return { ...base, title: '', content: 'Add your story here.' };
  if (type === 'image') return { ...base, title: 'Image', data: { imageUrl: '', alt: '' } };
  if (['gallery', 'carousel', 'instagram-grid'].includes(type)) return { ...base, title: 'Image gallery', data: { images: [] } };
  if (['video', 'direct-video'].includes(type)) return { ...base, title: 'Video', data: { videoUrl: '', poster: '' } };
  if (['youtube', 'vimeo', 'tiktok', 'spotify', 'apple-music', 'soundcloud'].includes(type)) return { ...base, title: blockRegistry.find((item) => item.type === type)?.label, data: { embedUrl: '' } };
  if (type === 'product') return { ...base, title: 'New product', subtitle: 'Describe your offer', url: 'https://example.com', data: { price: '$0' } };
  if (type === 'event') return { ...base, title: 'New event', subtitle: 'Add event details', data: { date: '' } };
  if (type === 'testimonial') return { ...base, title: 'Your customer', content: 'Add a testimonial quote.' };
  if (type === 'faq') return { ...base, title: 'A common question', content: 'Add the answer here.' };
  if (type === 'password-gate') return { ...base, title: 'Protected content', content: 'Demo content unlocked.', data: { password: 'raloa-demo' } };
  if (type === 'audio' || type === 'mp3') return { ...base, title: 'Audio player', data: { audioUrl: '' } };
  if (type === 'file-download') return { ...base, title: 'Download file', subtitle: 'PDF or other resource', url: '' };
  return base;
};

const displayValue = (value: BlockDataValue | undefined) => Array.isArray(value) ? value.join(', ') : value === undefined ? '' : String(value);

export const BlockEditorWorkspace: React.FC<BlockEditorWorkspaceProps> = ({ page, locale, onPageChange, onDirty }) => {
  const isRtl = locale === 'ar';
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [activeCategory, setActiveCategory] = useState('Essentials');
  const selectedBlock = page?.blocks.find((block) => block.id === selectedBlockId) ?? page?.blocks[0] ?? null;

  useEffect(() => {
    setSelectedBlockId(page?.blocks[0]?.id ?? '');
  }, [page?.id]);

  const categories = useMemo(() => Array.from(new Set(blockRegistry.map((item) => item.category))), []);
  const visibleRegistry = blockRegistry.filter((item) => item.category === activeCategory);

  const updatePageBlocks = (blocks: ProfileBlock[], nextSelectedId?: string) => {
    if (!page) return;
    onPageChange({ ...page, blocks });
    if (nextSelectedId) setSelectedBlockId(nextSelectedId);
    onDirty();
  };

  const updateBlock = (patch: Partial<ProfileBlock>) => {
    if (!page || !selectedBlock) return;
    updatePageBlocks(page.blocks.map((block) => block.id === selectedBlock.id ? { ...block, ...patch } : block));
  };

  const updateData = (key: string, value: string) => {
    if (!selectedBlock) return;
    const nextValue: BlockDataValue = key === 'images' ? value.split(',').map((item) => item.trim()).filter(Boolean) : value;
    updateBlock({ data: { ...selectedBlock.data, [key]: nextValue } });
  };

  const moveBlock = (direction: -1 | 1) => {
    if (!page || !selectedBlock) return;
    const index = page.blocks.findIndex((block) => block.id === selectedBlock.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= page.blocks.length) return;
    const blocks = [...page.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    updatePageBlocks(blocks);
  };

  const addBlock = (type: BlockType) => {
    if (!page) return;
    const block = createDefaultBlock(type, page.blocks.length);
    const selectedIndex = selectedBlock ? page.blocks.findIndex((item) => item.id === selectedBlock.id) : page.blocks.length - 1;
    const blocks = [...page.blocks];
    blocks.splice(Math.max(0, selectedIndex + 1), 0, block);
    updatePageBlocks(blocks, block.id);
  };

  const duplicateBlock = () => {
    if (!page || !selectedBlock) return;
    const duplicate = { ...clone(selectedBlock), id: `block-${Date.now()}`, title: `${selectedBlock.title || 'Block'} copy` };
    const index = page.blocks.findIndex((item) => item.id === selectedBlock.id);
    const blocks = [...page.blocks];
    blocks.splice(index + 1, 0, duplicate);
    updatePageBlocks(blocks, duplicate.id);
  };

  const removeBlock = () => {
    if (!page || !selectedBlock) return;
    const blocks = page.blocks.filter((block) => block.id !== selectedBlock.id);
    updatePageBlocks(blocks, blocks[Math.max(0, page.blocks.findIndex((block) => block.id === selectedBlock.id) - 1)]?.id ?? blocks[0]?.id);
  };

  if (!page) {
    return <Surface className="p-8 text-center"><Layers3 className="mx-auto h-8 w-8 text-indigo-500" /><h3 className="mt-4 text-lg font-extrabold">{isRtl ? 'لا توجد صفحة' : 'No page selected'}</h3><p className="mt-2 text-sm text-slate-600">{isRtl ? 'اختر صفحة لبدء تحريرها.' : 'Choose a page to start editing.'}</p></Surface>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
      <Surface className="overflow-hidden p-3">
        <div className="flex items-center justify-between px-2 py-2"><h3 className="text-sm font-extrabold">{isRtl ? 'الكتل' : 'Blocks'}</h3><span className="text-xs font-bold text-slate-400">{page.blocks.length}</span></div>
        <div className="mt-2 space-y-1" role="list" aria-label={isRtl ? 'كتل الصفحة' : 'Page blocks'}>
          {page.blocks.length === 0 && <p className="px-2 py-5 text-xs leading-relaxed text-slate-500">{isRtl ? 'أضف أول كتلة من القائمة.' : 'Add your first block from the library.'}</p>}
          {page.blocks.map((block, index) => (
            <button key={block.id} type="button" role="listitem" onClick={() => setSelectedBlockId(block.id)} className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-start text-xs font-bold transition ${selectedBlock?.id === block.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{block.title || block.type}</span><span className="text-[10px] text-slate-400">{index + 1}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3"><p className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{isRtl ? 'مكتبة الكتل' : 'Block library'}</p><div className="mt-2 flex gap-1 overflow-x-auto pb-1 xl:block xl:space-y-1">{categories.map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`min-h-9 shrink-0 rounded-lg px-2 text-xs font-bold xl:block xl:w-full xl:text-start ${activeCategory === category ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>{category}</button>)}</div></div>
      </Surface>

      <Surface className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">{isRtl ? 'هيكل الصفحة' : 'Page structure'}</p><h3 className="mt-1 text-lg font-extrabold">{page.title}</h3></div><span className="text-xs text-slate-500">{isRtl ? 'انقر على كتلة لتعديلها' : 'Select a block to edit it'}</span></div>
        <div className="mt-4 space-y-2" aria-live="polite">
          {page.blocks.map((block, index) => <button key={block.id} type="button" onClick={() => setSelectedBlockId(block.id)} className={`group flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-start transition ${selectedBlock?.id === block.id ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-slate-300'} ${!block.visible ? 'opacity-55' : ''}`}><GripVertical className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" /><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{block.title || block.type}</strong><span className="block truncate text-xs text-slate-500">{blockRegistry.find((item) => item.type === block.type)?.label ?? block.type}</span></span>{block.visible ? <Eye className="h-4 w-4 text-emerald-600" aria-label="Visible" /> : <EyeOff className="h-4 w-4 text-slate-400" aria-label="Hidden" />}</button>)}
          {page.blocks.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><Layers3 className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-700">{isRtl ? 'صفحة فارغة' : 'This page is empty'}</p><p className="mt-1 text-xs text-slate-500">{isRtl ? 'اختر نوع كتلة من المكتبة للبدء.' : 'Choose a block type from the library to begin.'}</p></div>}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{visibleRegistry.map((item) => <button key={item.type} type="button" onClick={() => addBlock(item.type)} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-start text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Plus className="h-4 w-4 text-indigo-600" aria-hidden="true" />{item.label}</button>)}</div></div>
      </Surface>

      <Surface className="min-w-0 p-4 sm:p-5">
        {!selectedBlock ? <div className="flex min-h-56 flex-col items-center justify-center text-center"><Layers3 className="h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-700">{isRtl ? 'اختر كتلة' : 'Select a block'}</p><p className="mt-1 text-xs text-slate-500">{isRtl ? 'ستظهر إعداداتها هنا.' : 'Its settings will appear here.'}</p></div> : <>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4"><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{isRtl ? 'إعدادات الكتلة' : 'Block settings'}</p><h3 className="mt-1 truncate text-base font-extrabold">{blockRegistry.find((item) => item.type === selectedBlock.type)?.label ?? selectedBlock.type}</h3></div><button type="button" onClick={() => updateBlock({ visible: !selectedBlock.visible })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label={selectedBlock.visible ? 'Hide block' : 'Show block'}>{selectedBlock.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button></div>
          <div className="mt-4 space-y-4">
            {selectedBlock.type !== 'spacer' && selectedBlock.type !== 'icon' && <Input label={isRtl ? 'العنوان' : 'Title'} value={selectedBlock.title ?? ''} onChange={(event) => updateBlock({ title: event.target.value })} />}
            {!['section', 'spacer', 'icon'].includes(selectedBlock.type) && <Input label={isRtl ? 'الوصف المختصر' : 'Subtitle'} value={selectedBlock.subtitle ?? ''} onChange={(event) => updateBlock({ subtitle: event.target.value })} />}
            {['link', 'product', 'file-download', 'location', 'map', 'phone', 'email', 'calendly', 'music-pre-save'].includes(selectedBlock.type) && <Input label={isRtl ? 'الرابط' : 'URL'} value={selectedBlock.url ?? ''} onChange={(event) => updateBlock({ url: event.target.value })} placeholder="https://" />}
            {['rich-text', 'faq', 'testimonial', 'password-gate'].includes(selectedBlock.type) && <label className="block text-start"><span className="mb-2 block text-sm font-bold text-slate-800">{isRtl ? 'المحتوى' : 'Content'}</span><textarea value={selectedBlock.content ?? ''} onChange={(event) => updateBlock({ content: event.target.value })} rows={5} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" /></label>}
            {selectedBlock.type === 'image' && <><Input label={isRtl ? 'رابط الصورة' : 'Image URL'} value={displayValue(selectedBlock.data?.imageUrl)} onChange={(event) => updateData('imageUrl', event.target.value)} placeholder="https://" /><Input label={isRtl ? 'النص البديل' : 'Alt text'} value={displayValue(selectedBlock.data?.alt)} onChange={(event) => updateData('alt', event.target.value)} /></>}
            {['gallery', 'carousel', 'instagram-grid'].includes(selectedBlock.type) && <Input label={isRtl ? 'روابط الصور' : 'Image URLs'} value={displayValue(selectedBlock.data?.images)} onChange={(event) => updateData('images', event.target.value)} placeholder="https://image-1, https://image-2" />}
            {['video', 'direct-video'].includes(selectedBlock.type) && <><Input label={isRtl ? 'رابط الفيديو' : 'Video URL'} value={displayValue(selectedBlock.data?.videoUrl)} onChange={(event) => updateData('videoUrl', event.target.value)} placeholder="https://" /><Input label={isRtl ? 'رابط صورة الغلاف' : 'Poster URL'} value={displayValue(selectedBlock.data?.poster)} onChange={(event) => updateData('poster', event.target.value)} /></>}
            {['youtube', 'vimeo', 'tiktok', 'spotify', 'apple-music', 'soundcloud'].includes(selectedBlock.type) && <Input label={isRtl ? 'رابط التضمين' : 'Embed URL'} value={displayValue(selectedBlock.data?.embedUrl)} onChange={(event) => updateData('embedUrl', event.target.value)} placeholder="https://" />}
            {['audio', 'mp3'].includes(selectedBlock.type) && <Input label={isRtl ? 'رابط الصوت' : 'Audio URL'} value={displayValue(selectedBlock.data?.audioUrl)} onChange={(event) => updateData('audioUrl', event.target.value)} placeholder="https://" />}
            {selectedBlock.type === 'product' && <Input label={isRtl ? 'السعر' : 'Price'} value={displayValue(selectedBlock.data?.price)} onChange={(event) => updateData('price', event.target.value)} />}
            {selectedBlock.type === 'event' && <Input label={isRtl ? 'التاريخ' : 'Date'} value={displayValue(selectedBlock.data?.date)} onChange={(event) => updateData('date', event.target.value)} placeholder="2026-10-01" />}
            {selectedBlock.type === 'password-gate' && <Input label={isRtl ? 'كلمة المرور التجريبية' : 'Demo password'} value={displayValue(selectedBlock.data?.password)} onChange={(event) => updateData('password', event.target.value)} />}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4"><Button size="sm" variant="secondary" onClick={() => moveBlock(-1)} disabled={page.blocks[0]?.id === selectedBlock.id}><ChevronUp className="h-4 w-4" />{isRtl ? 'لأعلى' : 'Move up'}</Button><Button size="sm" variant="secondary" onClick={() => moveBlock(1)} disabled={page.blocks[page.blocks.length - 1]?.id === selectedBlock.id}><ChevronDown className="h-4 w-4" />{isRtl ? 'لأسفل' : 'Move down'}</Button><Button size="sm" variant="secondary" onClick={duplicateBlock}><Copy className="h-4 w-4" />{isRtl ? 'نسخ' : 'Duplicate'}</Button><Button size="sm" variant="danger" onClick={removeBlock}><Trash2 className="h-4 w-4" />{isRtl ? 'حذف' : 'Delete'}</Button></div>
        </>}
      </Surface>
    </div>
  );
};
