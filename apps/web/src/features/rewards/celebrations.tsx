"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CELEBRATION_VIBRATION } from "@/domain/feedback/sounds";
import { current, dismiss, enqueue, isOpeningRoute } from "@/domain/rewards/celebrations";
import { sound } from "@/features/sound/engine";
import { useT } from "@/i18n/client";
import { Celebration } from "@/ui/game/Celebration";

export interface CelebrationData {
  key: string;
  kicker?: string;
  kickerTone?: "lemon" | "mint";
  title: string;
  detail?: string;
  count?: number;
  /** El premio en grande. */
  art: React.ReactNode;
  primary?: { label: string; href?: string; onAction?: () => void };
  /** Al mostrarse (p. ej. marcar las llegadas como celebradas). */
  onShown?: () => void;
  /** Al cerrarse (p. ej. hacer volar el sobre). */
  onClosed?: () => void;
}

const Ctx = createContext<{ celebrate: (c: CelebrationData) => void }>({ celebrate: () => {} });

/**
 * Spec 015, RF-5, RF-6, RF-9, RF-12 y RF-13: quien tenga algo que celebrar lo encola; aquí salen de una en una, con
 * fanfarria y una vibración suave al abrirse, y nunca encima de la apertura (se esperan a la siguiente página).
 */
export function CelebrationsProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CelebrationData[]>([]);
  const path = usePathname();
  const router = useRouter();
  const t = useT().rewards.fx;
  const cur = current(queue, isOpeningRoute(path));
  const celebrate = useCallback((c: CelebrationData) => setQueue((q) => enqueue(q, c)), []);

  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (!cur || shown.current === cur.key) return;
    shown.current = cur.key;
    sound.play("fanfare");
    sound.vibrate(CELEBRATION_VIBRATION);
    cur.onShown?.();
  }, [cur]);

  const close = () => {
    cur?.onClosed?.();
    setQueue((q) => dismiss(q));
  };

  return (
    <Ctx.Provider value={{ celebrate }}>
      {children}
      {cur && (
        <Celebration
          open
          onClose={close}
          kicker={cur.kicker}
          kickerTone={cur.kickerTone}
          title={cur.title}
          detail={cur.detail}
          count={cur.count}
          closeLabel={t.close}
          primary={
            cur.primary && {
              label: cur.primary.label,
              onAction: () => {
                const { href, onAction } = cur.primary!;
                close();
                if (href) router.push(href);
                onAction?.();
              },
            }
          }
        >
          {cur.art}
        </Celebration>
      )}
    </Ctx.Provider>
  );
}

export const useCelebrations = () => useContext(Ctx);
