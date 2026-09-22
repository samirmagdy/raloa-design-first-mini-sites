import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export interface ConfirmTone {
  label: string;
  tone?: 'primary' | 'danger';
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirm: ConfirmTone;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Destructive confirmations require typing, e.g. deleting a profile. */
  busy?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirm,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false
}) => (
  <Dialog
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirm.tone === 'danger' ? 'danger' : 'primary'}
          className="flex-1"
          onClick={onConfirm}
          loading={busy}
        >
          {confirm.label}
        </Button>
      </div>
    }
  >
    <p className="text-sm leading-relaxed text-slate-600">{body}</p>
  </Dialog>
);
