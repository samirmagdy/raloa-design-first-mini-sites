import React, { useCallback, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers3,
  Plus,
  Search,
  Undo2
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Locale } from '../../types';
import { useRepository } from '../../services/RepositoryContext';
import {
  blockCategories,
  blockDefinitions,
  getBlockDefinition
} from '../../services/contracts/blockRegistry';
import type { BlockFieldDefinition } from '../../services/contracts/blockRegistry';
import { createBlock, defaultConfigFor, validateBlock } from '../../services/contracts/blockSchema';
import type { BlockConfigValue, BlockType, ProfileBlock, ProfilePage, PublicProfile, RepositoryError, Result } from '../../services';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Surface } from '../ui/Surface';
import { ProfileBlockView } from '../profile/BlockRenderer';
import { ui, text, tx } from '../../i18n/ui';

interface BlockEditorWorkspaceProps {
  page: ProfilePage;
  profile: PublicProfile;
  locale: Locale;
  onPagesChange: (updater: (pages: ProfilePage[]) => ProfilePage[]) => void;
  onError: (error: RepositoryError, retry?: () => void) => void;
}

interface UndoCommand {
  label: string;
  invert: () => Promise<void>;
}

const MAX_HISTORY = 20;

const findBlock = (blocks: ProfileBlock[], id: string): ProfileBlock | null => {
  for (const block of blocks) {
    if (block.id === id) return block;
    const found = findBlock(block.children ?? [], id);
    if (found) return found;
  }
  return null;
};

/** Replaces one block inside the tree, wherever it is nested. */
const mapBlock = (blocks: ProfileBlock[], id: string, updater: (block: ProfileBlock) => ProfileBlock): ProfileBlock[] =>
  blocks.map((block) => {
    if (block.id === id) return updater(block);
    const children = block.children ?? [];
    return children.length ? { ...block, children: mapBlock(children, id, updater) } : block;
  });

const withoutBlock = (blocks: ProfileBlock[], id: string): ProfileBlock[] =>
  blocks
    .filter((block) => block.id !== id)
    .map((block) => (block.children?.length ? { ...block, children: withoutBlock(block.children, id) } : block));

const withInserted = (blocks: ProfileBlock[], parentId: string | null, block: ProfileBlock, index: number): ProfileBlock[] => {
  if (parentId === null) {
    const next = [...blocks];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, block);
    return next;
  }
  return blocks.map((item) =>
    item.id === parentId
      ? {
          ...item,
          children: (() => {
            const next = [...(item.children ?? [])];
            next.splice(Math.max(0, Math.min(index, next.length)), 0, block);
            return next;
          })()
        }
      : item.children?.length
        ? { ...item, children: withInserted(item.children, parentId, block, index) }
        : item
  );
};

export const BlockEditorWorkspace: React.FC<BlockEditorWorkspaceProps> = ({ page, profile, locale, onPagesChange, onError }) => {
  const repository = useRepository();
  const isRtl = locale === 'ar';
  const [selectedId, setSelectedId] = useState<string>(page.blocks[0]?.id ?? '');
  const [category, setActiveCategory] = useState<string>('Basics');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<UndoCommand[]>([]);
  const [busy, setBusy] = useState(false);

  const blocks = page.blocks;
  const selected = findBlock(blocks, selectedId) ?? blocks[0] ?? null;
  const definition = selected ? getBlockDefinition(selected.type) : undefined;
  const errors = selected ? validateBlock(selected) : [];
  const errorFor = (key: string) => errors.find((error) => error.field === key)?.message;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const setPageBlocks = useCallback(
    (next: ProfileBlock[]) => {
      onPagesChange((current) => current.map((item) => (item.id === page.id ? { ...item, blocks: next } : item)));
    },
    [onPagesChange, page.id]
  );

  const remember = (command: UndoCommand) => setHistory((current) => [...current.slice(-(MAX_HISTORY - 1)), command]);

  const write = async <T,>(
    run: () => Promise<Result<T>>,
    onOk: (value: T) => void,
    command?: UndoCommand
  ) => {
    setBusy(true);
    const response = await run();
    setBusy(false);
    if (!response.ok) {
      // The retry re-issues this exact mutation, not the whole document.
      onError(response.error, () => void write(run, onOk, command));
      return;
    }
    onOk(response.data);
    if (command) remember(command);
  };

  const addBlock = (type: BlockType) => {
    const parentId = selected?.parentId ?? null;
    const siblings = parentId ? findBlock(blocks, parentId)?.children ?? [] : blocks;
    const afterIndex = selected && selected.parentId === parentId ? siblings.findIndex((block) => block.id === selected.id) + 1 : siblings.length;
    const draft = createBlock(type, page.id, afterIndex, parentId);
    const previous = clone(blocks);

    setPageBlocks(withInserted(blocks, parentId, draft, afterIndex));
    setSelectedId(draft.id);
    void write(
      () => repository.blocks.create(page.id, {
        type: draft.type,
        title: draft.title,
        subtitle: draft.subtitle,
        content: draft.content,
        url: draft.url,
        config: draft.config,
        position: draft.position,
        parentId,
        visible: true
      }),
      (created) => setPageBlocks(mapBlock(withInserted(blocks, parentId, created, afterIndex), created.id, () => created)),
      {
        label: tx(ui.editor.addBlock, locale),
        invert: async () => {
          await repository.blocks.remove(page.id, draft.id);
          setPageBlocks(previous);
        }
      }
    );
  };

  const patchSelected = (patch: Partial<ProfileBlock>) => {
    if (!selected) return;
    const before = clone(selected);
    const optimistic = mapBlock(blocks, selected.id, (block) => ({ ...block, ...patch }));
    setPageBlocks(optimistic);
    void write(
      () => repository.blocks.update(page.id, selected.id, patch, selected.version),
      (updated) => setPageBlocks(mapBlock(optimistic, updated.id, () => updated)),
      {
        label: tx(ui.editor.blockSettings, locale),
        invert: async () => {
          const reverted = mapBlock(optimistic, before.id, () => before);
          setPageBlocks(reverted);
          await repository.blocks.update(page.id, before.id, revertablePatch(before, patch), before.version);
        }
      }
    );
  };

  const patchConfig = (key: string, value: BlockConfigValue) => {
    if (!selected) return;
    patchSelected({ config: { ...selected.config, [key]: value } });
  };

  const removeSelected = () => {
    if (!selected) return;
    const previous = clone(blocks);
    const parentId = selected.parentId;
    const index = (parentId ? findBlock(blocks, parentId)?.children ?? blocks : blocks).findIndex((block) => block.id === selected.id);
    setPageBlocks(withoutBlock(blocks, selected.id));
    setSelectedId(previous[Math.max(0, index - 1)]?.id ?? '');
    void write(
      () => repository.blocks.remove(page.id, selected.id),
      () => undefined,
      {
        label: tx(ui.editor.removeBlockTitle, locale),
        invert: async () => {
          setPageBlocks(previous);
          await repository.blocks.create(page.id, stripIds(selected));
        }
      }
    );
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const previous = clone(blocks);
    let copyId = '';
    void write(
      () => repository.blocks.duplicate(page.id, selected.id),
      (copy) => {
        copyId = copy.id;
        setPageBlocks(withInserted(blocks, selected.parentId ?? null, copy, selected.position + 1));
        setSelectedId(copy.id);
      },
      {
        label: tx(ui.common.duplicate, locale),
        invert: async () => {
          setPageBlocks(previous);
          if (copyId) await repository.blocks.remove(page.id, copyId);
        }
      }
    );
  };

  const canMoveDown = (block: ProfileBlock): boolean => {
    const siblings = block.parentId ? findBlock(blocks, block.parentId)?.children ?? [] : blocks;
    return block.position < siblings.length - 1;
  };

  const move = (blockId: string, direction: -1 | 1) => {
    const parentId = findBlock(blocks, blockId)?.parentId ?? null;
    const siblings = parentId ? findBlock(blocks, parentId)?.children ?? [] : blocks;
    const index = siblings.findIndex((block) => block.id === blockId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const ordered = arrayMove(siblings, index, target);
    applyOrder(ordered.map((block) => block.id), parentId, ordered);
  };

  const applyOrder = (orderedIds: string[], parentId: string | null, ordered: ProfileBlock[]) => {
    const previous = clone(blocks);
    const next = parentId
      ? mapBlock(blocks, parentId, (folder) => ({ ...folder, children: ordered.map((block, position) => ({ ...block, position })) }))
      : ordered.map((block, position) => ({ ...block, position }));
    setPageBlocks(next);
    void write(
      () => repository.blocks.reorder(page.id, orderedIds, parentId),
      (list) => setPageBlocks(Array.isArray(list) ? list : next),
      {
        label: tx(ui.editor.dragHandle, locale),
        invert: async () => {
          setPageBlocks(previous);
          const restoreIds = (parentId ? findBlock(previous, parentId)?.children ?? previous : previous).map((block) => block.id);
          await repository.blocks.reorder(page.id, restoreIds, parentId);
        }
      }
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = blocks.map((block) => block.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const ordered = arrayMove(blocks, from, to);
    applyOrder(ordered.map((block) => block.id), null, ordered);
  };

  const undo = async () => {
    const command = history[history.length - 1];
    if (!command) return;
    setHistory((current) => current.slice(0, -1));
    setBusy(true);
    await command.invert();
    setBusy(false);
  };

  const library = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return blockDefinitions.filter((item) => {
      if (needle) {
        return (
          item.key.includes(needle) ||
          text(item.label, locale).toLowerCase().includes(needle) ||
          text(item.description, locale).toLowerCase().includes(needle)
        );
      }
      return item.category === category;
    });
  }, [query, category, locale]);

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
      <Surface className="overflow-hidden p-3">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="text-sm font-extrabold">{tx(ui.editor.blocks, locale)}</h3>
          <span className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 tabular-nums">{blocks.length}</span>
            <button
              type="button"
              onClick={() => void undo()}
              disabled={!history.length || busy}
              aria-label={tx(ui.editor.undo, locale)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-2 space-y-1" role="list" aria-label={tx(ui.editor.structure, locale)}>
              {blocks.length === 0 && (
                <p className="px-2 py-5 text-xs leading-relaxed text-slate-500">{tx(ui.editor.emptyPageBody, locale)}</p>
              )}
              {blocks.map((block, index) => (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  selected={block.id === selected?.id}
                  collapsed={collapsed[block.id] === true}
                  onToggleCollapse={() => setCollapsed((current) => ({ ...current, [block.id]: !current[block.id] }))}
                  onSelect={() => setSelectedId(block.id)}
                  locale={locale}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Surface>

      <Surface className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">{tx(ui.editor.blockLibrary, locale)}</p>
            <h3 className="mt-1 truncate text-lg font-extrabold">{text(page.title, locale)}</h3>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <label className="sr-only" htmlFor="block-search">{tx(ui.editor.searchBlocks, locale)}</label>
            <input
              id="block-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tx(ui.editor.searchBlocks, locale)}
              className="min-h-11 w-full rounded-control border border-slate-300 bg-white ps-9 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
            />
          </div>
        </div>

        {!query && (
          <div className="mt-4 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={tx(ui.editor.blockLibrary, locale)}>
            {blockCategories.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                onClick={() => setActiveCategory(item)}
                className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold transition ${
                  category === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {library.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => addBlock(item.key)}
              className="flex min-h-11 items-center gap-2 rounded-control border border-slate-200 px-3 text-start text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Plus className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{text(item.label, locale)}</span>
            </button>
          ))}
          {!library.length && <p className="col-span-full px-1 py-6 text-xs text-slate-500">{tx(ui.editor.noBlocksMatch, locale)}</p>}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{tx(ui.editor.structure, locale)}</p>
          <div className="mt-3 space-y-2">
            {blocks.map((block, ordinal) => (
              <div
                key={block.id}
                className={`flex min-h-14 items-center gap-2 rounded-control border px-3 text-start ${
                  block.id === selected?.id ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-white'
                } ${!block.visible ? 'opacity-60' : ''}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xs font-extrabold text-slate-600 tabular-nums">
                  {ordinal + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-900">{text(block.title, locale, definitionLabel(block.type, locale))}</strong>
                  <span className="block truncate text-xs text-slate-500">
                    {definitionLabel(block.type, locale)}
                    {block.children?.length ? ` · ${block.children.length}` : ''}
                  </span>
                </span>
                {block.schedule && <span className="rounded-pill bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-600">{tx(ui.editor.scheduledBadge, locale)}</span>}
                {block.emphasis === 'highlight' && <span className="rounded-pill bg-indigo-100 px-2 py-0.5 text-2xs font-bold text-indigo-700">{tx(ui.editor.highlightBadge, locale)}</span>}
                <span className="flex shrink-0 items-center gap-1">
                  <IconAction label={tx(ui.editor.moveUp, locale)} onClick={() => move(block.id, -1)} disabled={block.position === 0}>
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </IconAction>
                  <IconAction label={tx(ui.editor.moveDown, locale)} onClick={() => move(block.id, 1)} disabled={!canMoveDown(block)}>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </IconAction>
                  <IconAction label={block.visible ? tx(ui.common.hide, locale) : tx(ui.common.show, locale)} onClick={() => patchSelected({ visible: !block.visible })} disabled={busy}>
                    {block.visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                  </IconAction>
                </span>
              </div>
            ))}
            {!blocks.length && (
              <div className="rounded-panel border border-dashed border-slate-300 bg-surface-alt p-10 text-center">
                <Layers3 className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-700">{tx(ui.editor.emptyPage, locale)}</p>
                <p className="mt-1 text-xs text-slate-500">{tx(ui.editor.emptyPageBody, locale)}</p>
              </div>
            )}
          </div>
        </div>
      </Surface>

      <Surface className="min-w-0 p-4 sm:p-5">
        {!selected ? (
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <Layers3 className="h-7 w-7 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-slate-700">{tx(ui.editor.selectBlock, locale)}</p>
            <p className="mt-1 text-xs text-slate-500">{tx(ui.editor.selectBlockBody, locale)}</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{tx(ui.editor.blockSettings, locale)}</p>
                <h3 className="mt-1 truncate text-base font-extrabold">{definitionLabel(selected.type, locale)}</h3>
                {selected.parentId && (
                  <p className="mt-0.5 truncate text-2xs text-slate-500">
                    {tx(ui.editor.nestedIn, locale)} {text(findBlock(blocks, selected.parentId)?.title, locale, '')}
                  </p>
                )}
              </div>
              <IconAction
                label={selected.visible ? tx(ui.common.hide, locale) : tx(ui.common.show, locale)}
                onClick={() => patchSelected({ visible: !selected.visible })}
              >
                {selected.visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
              </IconAction>
            </div>

            <div className="mt-4 space-y-4">
              {definition?.textSlots.includes('title') && (
                <LocalizedField
                  label={tx(ui.editor.title, locale)}
                  value={selected.title}
                  error={errorFor('title') ? text(errorFor('title')!, locale) : undefined}
                  required={definition.titleRequired}
                  locale={locale}
                  onChange={(next) => patchSelected({ title: next })}
                />
              )}
              {definition?.textSlots.includes('subtitle') && (
                <LocalizedField
                  label={tx(ui.editor.subtitle, locale)}
                  value={selected.subtitle}
                  locale={locale}
                  onChange={(next) => patchSelected({ subtitle: next })}
                />
              )}
              {definition?.textSlots.includes('content') && (
                <LocalizedField
                  label={tx(ui.editor.content, locale)}
                  value={selected.content}
                  multiline
                  locale={locale}
                  onChange={(next) => patchSelected({ content: next })}
                />
              )}
              {definition?.hasUrl && (
                <Input
                  label={tx(ui.editor.url, locale)}
                  value={selected.url ?? ''}
                  onChange={(event) => patchSelected({ url: event.target.value })}
                  placeholder="https://"
                  error={errorFor('url') ? text(errorFor('url')!, locale) : undefined}
                />
              )}

              {(definition?.fields ?? []).map((field) => (
                <ConfigField
                  key={field.key}
                  field={field}
                  value={selected.config[field.key]}
                  locale={locale}
                  error={errorFor(field.key) ? text(errorFor(field.key)!, locale) : undefined}
                  onChange={(value) => patchConfig(field.key, value)}
                />
              ))}

              <div className="grid gap-3 rounded-control bg-surface-alt p-3">
                <Switch
                  checked={selected.visible}
                  onChange={(checked) => patchSelected({ visible: checked })}
                  label={tx(ui.common.visible, locale)}
                  description={isRtl ? 'تظهر هذه الكتلة للزوار.' : 'Visitors see this block.'}
                />
                <Switch
                  checked={selected.emphasis === 'highlight'}
                  onChange={(checked) => patchSelected({ emphasis: checked ? 'highlight' : 'none' })}
                  label={tx(ui.editor.highlightBadge, locale)}
                  description={isRtl ? 'إطار بلون مميز حول الكتلة.' : 'Accent border around the block.'}
                />
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-500">{tx(ui.editor.scheduledBadge, locale)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="from"
                      type="date"
                      value={selected.schedule?.startsAt?.slice(0, 10) ?? ''}
                      onChange={(event) =>
                        patchSelected({ schedule: { ...selected.schedule, startsAt: event.target.value ? new Date(event.target.value).toISOString() : undefined } })
                      }
                    />
                    <Input
                      label="until"
                      type="date"
                      value={selected.schedule?.endsAt?.slice(0, 10) ?? ''}
                      onChange={(event) =>
                        patchSelected({ schedule: { ...selected.schedule, endsAt: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : undefined } })
                      }
                    />
                  </div>
                </div>
                <Input
                  label={tx(ui.editor.hiddenBadge, locale) === 'Hidden' ? 'Badge label' : 'وسم'}
                  value={typeof selected.badge?.label === 'string' ? selected.badge.label : selected.badge?.label?.en ?? ''}
                  onChange={(event) => patchSelected({ badge: event.target.value ? { label: event.target.value } : undefined })}
                  placeholder="New"
                />
              </div>

              {errors.length > 0 && (
                <p role="alert" className="rounded-control bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                  {tx(ui.editor.validationHeading, locale)}: {errors.map((error) => text(error.message, locale)).join(' · ')}
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">{tx(ui.studio.editor, locale)}</p>
              <div className="mt-2 rounded-panel bg-slate-100/70 p-3">
                <ProfileBlockView block={selected} locale={locale} theme={profile.theme} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" variant="secondary" onClick={duplicateSelected} disabled={busy}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                {tx(ui.common.duplicate, locale)}
              </Button>
              <Button size="sm" variant="danger" onClick={removeSelected} disabled={busy}>
                {tx(ui.common.delete, locale)}
              </Button>
            </div>
          </>
        )}
      </Surface>
    </div>
  );
};

const SortableBlockRow: React.FC<{
  block: ProfileBlock;
  index: number;
  selected: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: () => void;
  locale: Locale;
}> = ({ block, index, selected, collapsed, onToggleCollapse, onSelect, locale }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const isRtl = locale === 'ar';
  const hasChildren = Boolean(block.children?.length);

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-h-11 items-center gap-1 rounded-control px-1 text-start text-xs font-bold transition ${
        selected ? 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'
      } ${isDragging ? 'opacity-70 shadow-lg' : ''} ${!block.visible ? 'opacity-55' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={tx(ui.editor.dragHandle, locale)}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate px-1 text-start">
        {text(block.title, locale, definitionLabel(block.type, locale))}
      </button>
      {hasChildren && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? tx(ui.editor.collapsed, locale) : tx(ui.editor.expanded, locale)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition ${collapsed ? (isRtl ? 'rotate-90' : '-rotate-90') : ''}`} aria-hidden="true" />
        </button>
      )}
      <span className="shrink-0 text-2xs text-slate-400 tabular-nums">{index + 1}</span>
    </div>
  );
};

const IconAction: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
  >
    {children}
  </button>
);

const definitionLabel = (type: BlockType, locale: Locale): string => {
  const definition = getBlockDefinition(type);
  return definition ? text(definition.label, locale) : type;
};

const ConfigField: React.FC<{
  field: BlockFieldDefinition;
  value: BlockConfigValue | undefined;
  locale: Locale;
  error?: string;
  onChange: (value: BlockConfigValue) => void;
}> = ({ field, value, locale, error, onChange }) => {
  const label = `${text(field.label, locale)}${field.required ? ' *' : ''}`;
  if (field.kind === 'toggle') {
    return <Switch checked={value === true} onChange={onChange} label={label} description={field.help ? text(field.help, locale) : undefined} variant="inline" />;
  }
  if (field.kind === 'select') {
    return (
      <Select
        label={label}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        options={(field.options ?? []).map((option) => ({ value: option.value, label: text(option.label, locale) }))}
      />
    );
  }
  if (field.kind === 'textarea' || field.kind === 'richtext') {
    return (
      <Textarea
        label={label}
        rows={3}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.kind === 'image-list' || field.kind === 'options') {
    const list = Array.isArray(value) ? value : [];
    return (
      <Textarea
        label={label}
        rows={3}
        value={list.join('\n')}
        hint={locale === 'ar' ? 'رابط في كل سطر.' : 'One URL per line.'}
        onChange={(event) => onChange(event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
        error={error}
      />
    );
  }
  if (field.kind === 'number' || field.kind === 'currency') {
    return (
      <Input
        label={label}
        type="number"
        min={field.min}
        max={field.max}
        step={field.kind === 'currency' ? 0.01 : field.step}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        error={error}
        placeholder={field.placeholder}
      />
    );
  }
  return (
    <Input
      label={label}
      type={field.kind === 'date' ? 'date' : field.kind === 'password' ? 'password' : field.kind === 'email' ? 'email' : field.kind === 'phone' ? 'tel' : 'text'}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      placeholder={field.placeholder}
      hint={field.help ? text(field.help, locale) : undefined}
    />
  );
};

/** D1 in the editor: the same field carries both language versions, side by side. */
const LocalizedField: React.FC<{
  label: string;
  value: PublicProfile['role'] | undefined;
  locale: Locale;
  required?: boolean;
  multiline?: boolean;
  error?: string;
  onChange: (value: NonNullable<PublicProfile['role']>) => void;
}> = ({ label, value, locale, required, multiline, error, onChange }) => {
  const en = typeof value === 'string' ? value : value?.en ?? '';
  const ar = typeof value === 'string' ? value : value?.ar ?? '';
  const merge = (key: 'en' | 'ar', next: string) => {
    const other = key === 'en' ? ar : en;
    // One language filled in stays a plain string; divergence becomes a keyed value (D1).
    onChange(other && other !== next ? { en: key === 'en' ? next : en, ar: key === 'ar' ? next : ar } : next);
  };
  const setEn = (next: string) => merge('en', next);
  const setAr = (next: string) => merge('ar', next);
  const Field = multiline ? Textarea : Input;

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-slate-800">
        {label}
        {required && <span className="text-rose-500"> *</span>}
        <span className="ms-1 text-2xs font-medium text-slate-400">EN · AR</span>
      </p>
      <Field
        aria-label={`${label} (EN)`}
        value={en}
        onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEn(event.target.value)}
        error={error}
        {...(multiline ? { rows: 4 } : {})}
      />
      <Field
        aria-label={`${label} (AR)`}
        dir="rtl"
        value={ar}
        onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAr(event.target.value)}
        {...(multiline ? { rows: 4 } : {})}
      />
    </div>
  );
};

const revertablePatch = (before: ProfileBlock, patch: Partial<ProfileBlock>): Partial<ProfileBlock> => {
  const keys = Object.keys(patch) as Array<keyof ProfileBlock>;
  return keys.reduce<Partial<ProfileBlock>>((accumulator, key) => {
    accumulator[key] = before[key] as never;
    return accumulator;
  }, {});
};

const clone = <T,>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T));



const stripIds = (block: ProfileBlock) => ({
  type: block.type,
  title: block.title,
  subtitle: block.subtitle,
  content: block.content,
  url: block.url,
  config: { ...defaultConfigFor(block.type), ...block.config },
  position: block.position,
  parentId: block.parentId,
  visible: block.visible
});
