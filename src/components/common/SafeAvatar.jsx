import React, { useState } from 'react';
import { addCacheBuster } from '../../utils/cacheBuster';
import { isFakeAvatarUrl } from '../../services/api';

/**
 * SafeAvatar
 * Renders user avatar photo with automatic error fallback to initials or silhouette.
 * NEVER renders fake Unsplash or AI placeholder faces.
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
  const isValidSrc = src && typeof src === 'string' && src.trim() !== '' && !isFakeAvatarUrl(src);

  const resolveSafeSrc = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || isFakeAvatarUrl(url)) {
      return null;
    }
    return addCacheBuster(url);
  };

  const [imgSrc, setImgSrc] = useState(() => resolveSafeSrc(src));
  const [imgFailed, setImgFailed] = useState(!isValidSrc);

  // Sync reactively if prop changes
  React.useEffect(() => {
    if (src && src.trim() !== '' && !isFakeAvatarUrl(src)) {
      setImgSrc(resolveSafeSrc(src));
      setImgFailed(false);
    } else {
      setImgSrc(null);
      setImgFailed(true);
    }
  }, [src]);

  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-2xl'
  }[size] || 'w-10 h-10 text-sm';

  const handleError = () => {
    setImgFailed(true);
  };

  const getInitials = (str) => {
    if (!str || typeof str !== 'string') return 'C';
    const lower = str.toLowerCase().trim();
    if (lower === 'verified candidate' || lower === 'a verified candidate') return 'C';
    if (lower === 'verified member' || lower === 'a verified member') return 'M';
    const words = str.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'C';
    if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
    return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
  };

  if (imgFailed || !imgSrc) {
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
