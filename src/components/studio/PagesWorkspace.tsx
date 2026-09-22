import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { Locale } from '../../types';
import { useRepository } from '../../services/RepositoryContext';
import type { ProfilePage, PublicProfile, RepositoryError } from '../../services';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Surface } from '../ui/Surface';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Switch } from '../ui/Switch';
import { ui, text, tx } from '../../i18n/ui';

interface PagesWorkspaceProps {
  profile: PublicProfile;
  pages: ProfilePage[];
  activePageId: string;
  locale: Locale;
  onPagesChange: (pages: ProfilePage[]) => void;
  onError: (error: RepositoryError, retry?: () => void) => void;
  onOpenPage: (pageId: string) => void;
}

const clone = <T,>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T));

export const PagesWorkspace: React.FC<PagesWorkspaceProps> = ({
  profile,
  pages,
  activePageId,
  locale,
  onPagesChange,
  onError,
  onOpenPage
}) => {
  const repository = useRepository();
  const isRtl = locale === 'ar';
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProfilePage | null>(null);
  const ordered = [...pages].sort((left, right) => left.position - right.position);

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const result = await repository.pages.create(profile.id, {
      title: title.trim(),
      slug: '',
      description: title.trim(),
      visibility: 'draft'
    });
    setBusy(false);
    if (!result.ok) return onError(result.error);
    onPagesChange([...pages, result.data]);
    setTitle('');
  };

  const rename = async (page: ProfilePage, nextTitle: string) => {
    const optimistic = pages.map((item) => (item.id === page.id ? { ...item, title: nextTitle } : item));
    onPagesChange(optimistic);
    const result = await repository.pages.update(page.id, { title: nextTitle }, page.version);
    if (!result.ok) return onError(result.error);
    onPagesChange(optimistic.map((item) => (item.id === page.id ? { ...item, version: result.data.version } : item)));
  };

  const duplicate = async (page: ProfilePage) => {
    setBusy(true);
    const result = await repository.pages.duplicate(page.id);
    setBusy(false);
    if (!result.ok) return onError(result.error);
    onPagesChange([...pages, result.data]);
  };

  const remove = async (page: ProfilePage) => {
    setBusy(true);
    const result = await repository.pages.remove(page.id);
    setBusy(false);
    if (!result.ok) {
      onError(result.error);
      setConfirmDelete(null);
      return;
    }
    onPagesChange(pages.filter((item) => item.id !== page.id));
    setConfirmDelete(null);
  };

  const move = async (page: ProfilePage, direction: -1 | 1) => {
    const ordered2 = [...pages].sort((left, right) => left.position - right.position);
    const index = ordered2.findIndex((item) => item.id === page.id);
    const target = index + direction;
    if (target < 0 || target >= ordered2.length) return;
    const swapped = ordered2.slice();
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    const reordered = swapped.map((item, position) => ({ ...item, position }));
    onPagesChange(reordered);
    const result = await repository.pages.reorder(profile.id, reordered.map((item) => item.id));
    if (!result.ok) onError(result.error);
  };

  const togglePublished = async (page: ProfilePage) => {
    const result = await repository.pages.setPublished(page.id, !page.published);
    if (!result.ok) return onError(result.error);
    onPagesChange(pages.map((item) => (item.id === page.id ? result.data : item)));
  };

  return (
    <div className="space-y-4">
      <Surface className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold">{tx(ui.pages.heading, locale)}</h3>
            <p className="mt-1 text-xs text-slate-500">{tx(ui.pages.help, locale)}</p>
          </div>
          <div className="flex w-full items-end gap-2 sm:w-auto">
            <Input
              label={tx(ui.pages.newPage, locale)}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={isRtl ? 'صفحة جديدة' : 'New page'}
              className="sm:w-56"
            />
            <Button onClick={() => void create()} disabled={!title.trim() || busy}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {tx(ui.common.create, locale)}
            </Button>
          </div>
        </div>
      </Surface>

      <div className="space-y-2">
        {ordered.map((page, index) => (
          <Surface key={page.id} className={`p-3 sm:p-4 ${page.id === activePageId ? 'ring-2 ring-indigo-200' : ''}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-slate-100 text-2xs font-extrabold text-slate-600 tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <input
                  value={text(page.title, locale)}
                  onChange={(event) => void rename(page, event.target.value)}
                  aria-label={tx(ui.pages.pageTitle, locale)}
                  className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-extrabold text-ink hover:border-slate-200 focus:border-indigo-400 focus:outline-none"
                />
                <p className="mt-0.5 truncate px-1 text-xs text-slate-500">
                  raloa.app/@{profile.username}/{page.slug} · {page.blocks.length} {tx(ui.editor.blocks, locale).toLowerCase()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-pill px-2.5 py-1 text-2xs font-bold ${
                  page.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {page.published ? tx(ui.common.published, locale) : tx(ui.common.draft, locale)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <RowAction label={tx(ui.pages.moveUp, locale)} onClick={() => void move(page, -1)} disabled={index === 0}>
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </RowAction>
                <RowAction label={tx(ui.pages.moveDown, locale)} onClick={() => void move(page, 1)} disabled={index === ordered.length - 1}>
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </RowAction>
                <RowAction label={tx(ui.common.duplicate, locale)} onClick={() => void duplicate(page)}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </RowAction>
                <RowAction label={page.published ? tx(ui.common.hide, locale) : tx(ui.common.show, locale)} onClick={() => void togglePublished(page)}>
                  {page.published ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                </RowAction>
                <RowAction label={tx(ui.common.delete, locale)} onClick={() => setConfirmDelete(page)} disabled={ordered.length <= 1}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </RowAction>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onOpenPage(page.id)}>
                {tx(ui.pages.openPage, locale)}
              </Button>
            </div>
            <div className="mt-3">
              <Switch
                checked={page.published}
                onChange={() => void togglePublished(page)}
                label={tx(ui.pages.publishPage, locale)}
                description={page.published ? tx(ui.common.published, locale) : tx(ui.common.draft, locale)}
              />
            </div>
          </Surface>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={tx(ui.pages.deletePageTitle, locale)}
        body={tx(ui.pages.deletePageBody, locale)}
        confirm={{ label: tx(ui.common.delete, locale), tone: 'danger' }}
        cancelLabel={tx(ui.common.cancel, locale)}
        busy={busy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && void remove(confirmDelete)}
      />
    </div>
  );
};

const RowAction: React.FC<{ label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({
  label,
  onClick,
  disabled,
  children
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
  >
    {children}
  </button>
);
