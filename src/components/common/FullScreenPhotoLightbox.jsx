import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';

/**
 * FullScreenPhotoLightbox
 *
 * Dedicated, distraction-free full-screen photo viewer for member profiles.
 * - Shows ONLY the full-size photo without any profile text or details cluttering the view.
 * - Fitted cleanly via object-contain across mobile and desktop viewports.
 * - Supports pinch-to-zoom (mobile), double-tap / double-click zoom, and panning when zoomed.
 * - Swipe left/right and Next/Previous navigation buttons cycle through the exact combined photo list.
 * - Protected by the "I 4 YOU SECURITY SHIELD":
 *   - Security Shield sits at z-[99999], strictly above this lightbox (z-50).
 *   - Suppresses context menu (right-click), dragging, and mobile long-press image saving.
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
        if (typeof p === 'string') return { url: p };
        if (typeof p === 'object' && p.url) return p;
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

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight)
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
        const duration = Date.now() - touchStartRef.current.time;

        // Check horizontal swipe if scale is 1
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && duration < 450) {
          if (deltaX > 0) {
            goToPrev();
          } else {
            goToNext();
          }
        } else if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) {
          // Double-tap zoom check
          const now = Date.now();
          if (now - lastTapRef.current < 320) {
            if (scale > 1) {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            } else {
              setScale(2.2);
            }
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
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.2);
    }
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

  const lightboxContent = (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none overflow-hidden touch-none photo-protected animate-in fade-in duration-200"
      data-drm-protected="true"
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ backgroundColor: '#000000' }}
      role="dialog"
      aria-modal="true"
      aria-label="Full-Screen Photo Viewer"
    >
      {/* Top Right Close Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className="absolute top-4 right-4 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-xl hover:border-white/40"
        title="Close (Esc)"
        aria-label="Close photo viewer"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Left Chevron Button */}
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

      {/* Right Chevron Button */}
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

      {/* Main Full-Size Image Container (Clean view showing ONLY the photo) */}
      <div
        className="w-full h-full flex items-center justify-center p-0 sm:p-2 select-none photo-protected overflow-hidden"
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
            className="w-full h-full max-w-full max-h-full object-contain pointer-events-none select-none transition-transform duration-150 ease-out animate-in fade-in duration-200"
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

      {/* Subtle Slide Counter at Bottom Center */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-black/60 text-white/90 text-xs font-semibold backdrop-blur-md border border-white/10 pointer-events-none select-none tracking-wider shadow-lg">
          {currentIndex + 1} / {slides.length}
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(lightboxContent, document.body) : null;
}
