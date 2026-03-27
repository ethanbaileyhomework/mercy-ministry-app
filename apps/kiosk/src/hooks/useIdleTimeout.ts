import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const IDLE_TIMEOUT_MS = 90_000; // 90 seconds

export function useIdleTimeout(enabled = true) {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled) return;
    timerRef.current = setTimeout(() => {
      navigate('/', { replace: true });
    }, IDLE_TIMEOUT_MS);
  }, [navigate, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['touchstart', 'mousedown', 'keydown'] as const;
    events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => document.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, enabled]);
}
