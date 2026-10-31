import React, { useState } from 'react';
import { addCacheBuster } from '../../utils/cacheBuster';

const DEFAULT_FEMALE = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
const DEFAULT_MALE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400';

/**
 * SafeAvatar
 * Renders user avatar photo with automatic error fallback to gender avatar or initials.
 * Includes cache-busting mechanisms for Cloudflare R2 / Supabase Storage URLs so web users
 * never see stale cached profile photos.
 */
export default function SafeAvatar({
  src,
  alt = 'Candidate',
  gender = 'Female',
  size = 'md', // sm, md, lg, xl
  className = '',
  showBadge = false,
  badgeContent = null,
  onClick = null
}) {
  const isMale = String(gender).toLowerCase() === 'male';
  const fallbackUrl = isMale ? DEFAULT_MALE : DEFAULT_FEMALE;

  const resolveSafeSrc = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return fallbackUrl;
    }
    return addCacheBuster(url);
  };

  const [imgSrc, setImgSrc] = useState(() => resolveSafeSrc(src));
  const [hasError, setHasError] = useState(!src);
  const [imgFailed, setImgFailed] = useState(false);

  // Sync reactively if prop changes
  React.useEffect(() => {
    if (src && src.trim() !== '') {
      setImgSrc(resolveSafeSrc(src));
      setHasError(false);
      setImgFailed(false);
    } else {
      setImgSrc(fallbackUrl);
      setHasError(true);
      setImgFailed(false);
    }
  }, [src, fallbackUrl]);

  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-2xl'
  }[size] || 'w-10 h-10 text-sm';

  const handleError = () => {
    if (!hasError && imgSrc !== fallbackUrl) {
      setImgSrc(fallbackUrl);
      setHasError(true);
    } else {
      setImgFailed(true);
    }
  };

  const getInitials = (str) => {
    if (!str || typeof str !== 'string') return 'C';
    const words = str.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'C';
    if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
    return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
  };

  if (imgFailed) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none bg-gradient-to-tr from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-[#DFB76C] border border-[#DFB76C]/40 font-bold ${sizeClasses} ${className}`}
        onClick={onClick}
        title={alt}
      >
        <span>{getInitials(alt)}</span>
        {showBadge && badgeContent && (
          <div className="absolute bottom-0 right-0">
            {badgeContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`relative inline-block shrink-0 rounded-full overflow-hidden bg-slate-800 border border-slate-700 ${sizeClasses} ${className}`}
      onClick={onClick}
    >
      <img
        src={imgSrc}
        alt=""
        onError={handleError}
        className="w-full h-full object-cover transition-transform duration-200"
        loading="lazy"
      />
      {showBadge && badgeContent && (
        <div className="absolute bottom-0 right-0">
          {badgeContent}
        </div>
      )}
    </div>
  );
}
