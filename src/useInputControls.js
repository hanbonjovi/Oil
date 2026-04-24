import { useEffect } from 'react';
import { SWIPE_THRESHOLD } from './constants';

export default function useInputControls(changeDirection, gameContainerRef) {
  useEffect(() => {
    const handler = (e) => {
      // Don't intercept when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const map = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
        W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
      };
      if (map[e.key]) {
        e.preventDefault();
        changeDirection(map[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [changeDirection]);

  useEffect(() => {
    const el = gameContainerRef.current;
    if (!el) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const onTouchStart = (e) => {
      // Don't block touch on inputs, buttons, or overlays with interactive elements
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    };

    const onTouchMove = (e) => {
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
    };

    const onTouchEnd = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [changeDirection, gameContainerRef]);
}
