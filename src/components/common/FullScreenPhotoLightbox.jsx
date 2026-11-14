import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';

/**
 * FullScreenPhotoLightbox
 *
 * Unified Full-Screen Photo Gallery for the currently viewed user.
 * - Combines the currently viewed user's profile photos (up to 5) and family photos (up to 2) in a single continuous list.
 * - Renders directly into document.body via ReactDOM.createPortal at z-[9990].
 * - Protected by "I 4 YOU SECURITY SHIELD" at z-[99999] so any capture attempt or blur activates black curtain.
 * - Shows ONLY the full-size photo with object-contain (no profile text or clutter).
 * - Full zoom support: Double-click / Double-tap zoom (1x <-> 2x), pinch-to-zoom (mobile), and mouse wheel zoom.
 * - Panning when zoomed in.
 * - Next/Previous navigation (swipe for mobile, left/right arrow buttons for web, keyboard arrow keys) exclusively cycling photos of the current user.
 * - Strict User Isolation: NEVER switches to any other user's profile.
 * - Top-right Close button and Escape key dismiss.
 * - Right-click, drag, and mobile long-press disabled for privacy protection.
 */
export default function FullScreenPhotoLightbox({
  isOpen,
  photos = [],
  initialIndex = 0,
  onClose
}) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const { triggerScreenshotBlock, screenshotRestricted } = usePhotoPrivacy();

  // Gesture tracking refs
  const touchStartRef = useRef(null);
  const touchInitialDistRef = useRef(null);
  const touchInitialScaleRef = useRef(1);
  const lastTapRef = useRef(0);
  const mouseDragStartRef = useRef(null);
  const initialPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize photos list into uniform slide objects with valid url strings
  const slides = useMemo(() => {
    if (!Array.isArray(photos)) return [];
    return photos
      .map((p) => {
        if (!p) return null;
        if (typeof p === 'string') return { url: p, isFamily: false };
        if (typeof p === 'object' && p.url) {
          return {
            url: p.url,
            isFamily: Boolean(p.isFamily),
            title: p.title || null
          };
        }
        return null;
      })
      .filter((p) => p && typeof p.url === 'string' && p.url.trim().length > 0);
  }, [photos]);

  // Synchronize initial slide index when opened
  useEffect(() => {
    if (isOpen) {
      const safeIdx = Math.max(0, Math.min(initialIndex, Math.max(0, slides.length - 1)));
      setCurrentIndex(safeIdx);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, initialIndex, slides.length]);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Next / Previous navigation within current user's photos only
  const goToNext = useCallback(
    (e) => {
      e?.stopPropagation();
      if (slides.length <= 1) return;
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    },
    [slides.length]
  );

  const goToPrev = useCallback(
    (e) => {
      e?.stopPropagation();
      if (slides.length <= 1) return;
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    },
    [slides.length]
  );

  // Toggle Zoom: 1x <-> 2x
  const toggleZoom = useCallback((e) => {
    e?.stopPropagation();
    setScale((prev) => {
      if (prev > 1.1) {
        setPosition({ x: 0, y: 0 });
        return 1;
      }
      return 2;
    });
  }, []);

  // Keyboard navigation (Escape closes photo viewer, Left/Right arrows navigate)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrev, onClose]);

  // DRM Protection Context Menu and Drag Handlers
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (screenshotRestricted && triggerScreenshotBlock) {
      triggerScreenshotBlock('right-click');
    }
    return false;
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Mouse wheel zoom on desktop
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
    setScale((prev) => {
      const next = Math.min(Math.max(prev * zoomFactor, 1), 3.5);
      if (next <= 1.05) {
        setPosition({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  };

  // Touch Gesture Handlers (Swipe, Pinch-to-Zoom, Double-Tap)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // 2-finger pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchInitialDistRef.current = dist;
      touchInitialScaleRef.current = scale;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      initialPosRef.current = { ...position };
    }
  };

  const handleTouchMove = (e) => {
    // 2-finger pinch zoom
    if (e.touches.length === 2 && touchInitialDistRef.current) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / touchInitialDistRef.current;
      const newScale = Math.min(Math.max(touchInitialScaleRef.current * factor, 1), 3.5);
      setScale(newScale);
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return;
    }

    // 1-finger pan if zoomed in
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      if (scale > 1) {
        setPosition({
          x: initialPosRef.current.x + deltaX,
          y: initialPosRef.current.y + deltaY
        });
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      touchInitialDistRef.current = null;

      if (scale > 1) {
        // If pinched down near normal size, snap back cleanly
        if (scale < 1.08) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
      } else if (touchStartRef.current) {
        const deltaX = (e.changedTouches[0]?.clientX || 0) - touchStartRef.current.x;
        const deltaY = (e.changedTouches[0]?.clientY || 0) - touchStartRef.current.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Mobile swipe navigation when not zoomed in (swipe left -> next, swipe right -> prev)
        if (scale <= 1 && slides.length > 1 && absX > 40 && absX > absY * 1.3) {
          if (deltaX < 0) {
            goToNext();
          } else {
            goToPrev();
          }
        } else if (absX < 15 && absY < 15) {
          // Double-tap zoom check
          const now = Date.now();
          if (now - lastTapRef.current < 320) {
            toggleZoom();
            lastTapRef.current = 0;
          } else {
            lastTapRef.current = now;
          }
        }
      }

      touchStartRef.current = null;
    }
  };

  // Desktop Mouse Handlers (Double-click zoom, drag to pan when zoomed)
  const handleDoubleClick = (e) => {
    toggleZoom(e);
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !mouseDragStartRef.current || scale <= 1) return;
    const deltaX = e.clientX - mouseDragStartRef.current.x;
    const deltaY = e.clientY - mouseDragStartRef.current.y;
    setPosition({
      x: initialPosRef.current.x + deltaX,
      y: initialPosRef.current.y + deltaY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    mouseDragStartRef.current = null;
  };

  if (!isOpen || !mounted || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];
  const currentUrl = currentSlide?.url || null;
  const isFamily = Boolean(currentSlide?.isFamily);

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9990] bg-black/95 flex items-center justify-center select-none overflow-hidden touch-none photo-protected animate-in fade-in duration-200"
      data-drm-protected="true"
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.96)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Full-Screen Photo Viewer"
      onClick={(e) => {
        // Clicking backdrop directly closes the viewer
        if (e.target === e.currentTarget && scale <= 1) {
          onClose?.();
        }
      }}
    >
      {/* Top Bar Controls */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Zoom Controls & Family Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={toggleZoom}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-xl hover:border-white/40"
            title={scale > 1 ? "Zoom Out (1x)" : "Zoom In (2x)"}
            aria-label={scale > 1 ? "Zoom Out" : "Zoom In"}
          >
            {scale > 1 ? <ZoomOut className="w-5 h-5 text-white" /> : <ZoomIn className="w-5 h-5 text-white" />}
          </button>

          {isFamily && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/90 text-white border border-blue-400/40 backdrop-blur-md flex items-center gap-1.5 shadow-md">
              <HeartHandshake className="w-3.5 h-3.5 text-blue-200" />
              <span>Family Photo</span>
            </span>
          )}
        </div>

        {/* Right: Prominent Top-Right Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-xl hover:border-white/40"
          title="Close (Esc)"
          aria-label="Close photo viewer"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Web Left Chevron Navigation Button (Exclusively navigates photos of currently viewed user) */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={goToPrev}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-xl hover:border-white/40"
          title="Previous Photo"
          aria-label="Previous Photo"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Web Right Chevron Navigation Button (Exclusively navigates photos of currently viewed user) */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={goToNext}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-xl hover:border-white/40"
          title="Next Photo"
          aria-label="Next Photo"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Main Full-Size Image Container (Clean distraction-free full photo) */}
      <div
        className="w-full h-full flex items-center justify-center p-0 sm:p-2 select-none photo-protected overflow-hidden"
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
        onDoubleClick={handleDoubleClick}
      >
        {currentUrl ? (
          <img
            key={currentUrl}
            src={currentUrl}
            alt="Protected Member Photograph"
            draggable={false}
            onDragStart={handleDragStart}
            onContextMenu={handleContextMenu}
            className="w-full h-full max-w-full max-h-full object-contain pointer-events-none select-none transition-transform duration-150 ease-out"
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 150ms ease-out',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitUserDrag: 'none',
              touchAction: 'none'
            }}
          />
        ) : null}
      </div>

      {/* Photo Counter at Bottom Center (Current user's photo list) */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-black/60 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/10 pointer-events-none select-none tracking-wider shadow-lg flex items-center gap-2">
          {isFamily && <HeartHandshake className="w-3.5 h-3.5 text-blue-300" />}
          <span>{currentIndex + 1} / {slides.length}</span>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(lightboxContent, document.body) : null;
}
