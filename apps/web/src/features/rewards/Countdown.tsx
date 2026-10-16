"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

/** Cuenta atrás hasta `until`; al llegar a cero pide al servidor el estado nuevo. */
export function Countdown({ until, serverNow }: { until: string; serverNow: string }) {
  const t = useT();
  const router = useRouter();
  // El reloj del servidor puede ir adelantado en desarrollo: se calcula el desfase una vez.
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [left, setLeft] = useState(() => new Date(until).getTime() - (Date.now() + skew));
  useEffect(() => {
    const id = window.setInterval(() => {
      const ms = new Date(until).getTime() - (Date.now() + skew);
      setLeft(ms);
      if (ms <= 0) {
        window.clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [until, skew, router]);
  const s = Math.max(0, Math.floor(left / 1000));
  return (
    <span className="tabular-nums" data-testid="countdown">
      {t.rewards.countdown(Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60)}
    </span>
  );
}
