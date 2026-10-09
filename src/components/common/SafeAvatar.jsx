import React, { useState } from 'react';
import { User } from 'lucide-react';

const DEFAULT_FEMALE = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
const DEFAULT_MALE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400';

/**
 * SafeAvatar
 * Renders user avatar photo with automatic error fallback to gender avatar or initials.
 * Guarantees zero broken images on web or admin screens.
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

  const [imgSrc, setImgSrc] = useState(src || fallbackUrl);
  const [hasError, setHasError] = useState(!src);

  // Sync if prop changes
  React.useEffect(() => {
    if (src && src.trim() !== '') {
      setImgSrc(src);
      setHasError(false);
    } else {
      setImgSrc(fallbackUrl);
      setHasError(true);
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
    }
  };

  const initial = (alt || 'U').trim().charAt(0).toUpperCase();

  return (
    <div 
      className={`relative inline-block shrink-0 rounded-full overflow-hidden bg-slate-800 border border-slate-700 ${sizeClasses} ${className}`}
      onClick={onClick}
    >
      <img
        src={imgSrc}
        alt={alt}
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
