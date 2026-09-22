import React from 'react';

export type LogoVariant = 'horizontal' | 'mark' | 'wordmark';
export type LogoTheme = 'primary' | 'on-dark' | 'monochrome-black' | 'monochrome-white';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface RaloaLogoProps {
  className?: string;
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: LogoSize;
  isRtl?: boolean;
  showTagline?: boolean;
  width?: number;
  height?: number;
}

const asset = (name: string) => `/brand/${name}`;

const horizontalSources: Record<LogoTheme, { webp?: string; png: string }> = {
  primary: { webp: asset('raloa-logo-horizontal-primary.webp'), png: asset('raloa-logo-horizontal-primary.png') },
  'on-dark': { webp: asset('raloa-logo-horizontal-on-dark.webp'), png: asset('raloa-logo-horizontal-on-dark.png') },
  'monochrome-black': { webp: asset('raloa-logo-horizontal-monochrome-black.webp'), png: asset('raloa-logo-horizontal-monochrome-black.png') },
  'monochrome-white': { webp: asset('raloa-logo-horizontal-on-dark.webp'), png: asset('raloa-logo-horizontal-on-dark.png') }
};

const wordmarkSources: Record<LogoTheme, { webp?: string; png: string }> = {
  primary: { webp: asset('raloa-wordmark-navy.webp'), png: asset('raloa-wordmark-navy.webp') },
  'on-dark': { webp: asset('raloa-wordmark-white.webp'), png: asset('raloa-wordmark-white.png') },
  'monochrome-black': { webp: asset('raloa-wordmark-black.webp'), png: asset('raloa-wordmark-black.png') },
  'monochrome-white': { webp: asset('raloa-wordmark-white.webp'), png: asset('raloa-wordmark-white.png') }
};

const markSources: Record<LogoTheme, { webp?: string; png?: string; svg?: string }> = {
  primary: { svg: asset('raloa-mark-primary.svg') },
  'on-dark': { webp: asset('raloa-mark-white.webp'), png: asset('raloa-mark-white.png') },
  'monochrome-black': { webp: asset('raloa-mark-black.webp'), png: asset('raloa-mark-black.png') },
  'monochrome-white': { webp: asset('raloa-mark-white.webp'), png: asset('raloa-mark-white.png') }
};

const BrandPicture: React.FC<{
  sources: { webp?: string; png?: string; svg?: string };
  alt: string;
  className?: string;
  pictureClassName?: string;
  style?: React.CSSProperties;
}> = ({ sources, alt, className = '', pictureClassName = '', style }) => (
  <picture className={`block shrink-0 ${pictureClassName}`}>
    {sources.webp && <source srcSet={sources.webp} type="image/webp" />}
    <img src={sources.svg || sources.png} alt={alt} className={`block ${className}`} style={style} draggable={false} />
  </picture>
);

export const RaloaMark: React.FC<{ size?: number; className?: string; theme?: LogoTheme }> = ({
  size = 36,
  className = '',
  theme = 'primary'
}) => (
  <BrandPicture
    sources={markSources[theme]}
    alt="RALOA mark"
    className={`h-full w-full object-contain ${className}`}
    style={{ width: size, height: size }}
  />
);

export const RaloaWordmark: React.FC<{ height?: number; className?: string; theme?: LogoTheme }> = ({
  height = 24,
  className = '',
  theme = 'primary'
}) => (
  <BrandPicture
    sources={wordmarkSources[theme]}
    alt="RALOA"
    className={`h-full w-full object-cover object-center ${className}`}
    style={{ width: height * 5.17, height }}
  />
);

export const RaloaLogo: React.FC<RaloaLogoProps> = ({
  className = '',
  variant = 'horizontal',
  theme = 'primary',
  size = 'md',
  isRtl = false,
  showTagline = false,
  width,
  height
}) => {
  const sizes = {
    sm: { width: 132, height: 40 },
    md: { width: 166, height: 46 },
    lg: { width: 198, height: 54 },
    xl: { width: 240, height: 66 }
  };
  const current = sizes[size];

  if (variant === 'mark') {
    return <RaloaMark size={width || height || current.height} className={className} theme={theme} />;
  }

  if (variant === 'wordmark') {
    return <RaloaWordmark height={height || current.height * 0.55} className={className} theme={theme} />;
  }

  return (
    <div
      className={`inline-flex items-center select-none overflow-hidden ${className}`}
      role="banner"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ width: width || current.width, height: height || current.height }}
    >
      <BrandPicture
      sources={horizontalSources[theme]}
      alt="RALOA"
      pictureClassName="w-full h-full"
      className="h-full w-full object-cover object-center"
      />
      {showTagline && (
        <span className={`absolute translate-y-7 text-[10px] font-semibold tracking-tight ${
          theme === 'on-dark' || theme === 'monochrome-white' ? 'text-slate-300' : 'text-slate-500'
        }`}>
          {isRtl ? 'مواقع مصغرة تركز على التصميم' : 'Design-first mini-sites'}
        </span>
      )}
    </div>
  );
};
