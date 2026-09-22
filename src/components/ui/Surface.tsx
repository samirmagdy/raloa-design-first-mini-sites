import React from 'react';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  muted?: boolean;
}

export const Surface: React.FC<SurfaceProps> = ({ muted = false, className = '', ...props }) => (
  <div
    className={`rounded-2xl border border-slate-200 ${muted ? 'bg-slate-50' : 'bg-white shadow-sm'} ${className}`}
    {...props}
  />
);

