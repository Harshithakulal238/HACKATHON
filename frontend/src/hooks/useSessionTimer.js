import { useEffect, useMemo, useState } from "react";

export function useSessionTimer(endsAt) {
  const target = useMemo(() => endsAt ? new Date(endsAt).getTime() : null, [endsAt]);
  const [remainingSeconds, setRemainingSeconds] = useState(() => target ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0);

  useEffect(() => {
    if (!target) {
      setRemainingSeconds(0);
      return undefined;
    }
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return { remainingSeconds, minutes, seconds, expired: target !== null && remainingSeconds === 0 };
}