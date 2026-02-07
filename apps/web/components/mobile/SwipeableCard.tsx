'use client';

import { useRef, useState, useCallback } from 'react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Approve',
  leftLabel = 'Review',
  disabled = false,
}: SwipeableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const THRESHOLD = 100;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    setStartX(e.touches[0].clientX);
    setSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping || disabled) return;
    const diff = e.touches[0].clientX - startX;
    setOffset(diff);
  }, [swiping, startX, disabled]);

  const handleTouchEnd = useCallback(() => {
    if (!swiping || disabled) return;
    setSwiping(false);

    if (offset > THRESHOLD && onSwipeRight) {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      onSwipeRight();
    } else if (offset < -THRESHOLD && onSwipeLeft) {
      if (navigator.vibrate) navigator.vibrate(50);
      onSwipeLeft();
    }

    setOffset(0);
  }, [swiping, offset, onSwipeRight, onSwipeLeft, disabled]);

  const bgColor = offset > THRESHOLD
    ? 'bg-green-100'
    : offset < -THRESHOLD
    ? 'bg-yellow-100'
    : '';

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background labels */}
      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
        <span className={`text-sm font-medium ${offset < -30 ? 'text-yellow-600' : 'text-transparent'}`}>
          {leftLabel}
        </span>
        <span className={`text-sm font-medium ${offset > 30 ? 'text-green-600' : 'text-transparent'}`}>
          {rightLabel}
        </span>
      </div>

      {/* Swipeable content */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative transition-colors ${bgColor} ${disabled ? 'cursor-default' : 'cursor-grab'}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
