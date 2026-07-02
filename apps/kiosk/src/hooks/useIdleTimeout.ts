import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_TIMEOUT_MS = 90_000; // 90 seconds total
const WARNING_MS = 30_000;         // warn at 30 seconds remaining

export function useIdleTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const enabled = timeoutMs > 0;
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const warnRef = useRef<ReturnType<typeof setTimeout>>();
  const [warningVisible, setWarningVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const clearWarning = useCallback(() => {
    setWarningVisible(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
    clearWarning();
    if (!enabled) return;

    // Show warning banner WARNING_MS before timeout
    warnRef.current = setTimeout(() => {
      setWarningVisible(true);
      setCountdown(Math.round(WARNING_MS / 1000));
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }, timeoutMs - WARNING_MS);

    timerRef.current = setTimeout(() => {
      clearWarning();
      navigate('/', { replace: true });
    }, timeoutMs);
  }, [navigate, enabled, timeoutMs, clearWarning]);

  useEffect(() => {
    if (!enabled) return;
    const events = ['touchstart', 'mousedown', 'keydown'] as const;
    events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnRef.current) clearTimeout(warnRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      events.forEach((e) => document.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, enabled]);

  return { warningVisible, countdown, dismiss: resetTimer };
}
