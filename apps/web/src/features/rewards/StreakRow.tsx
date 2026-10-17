"use client";

import { useT } from "@/i18n/client";
import { Sticker } from "@/ui/icons/Sticker";
import { cx } from "@/ui/variants";

type Reward = { kind: "cookies"; amount: number } | { kind: "pack" };

/**
 * Spec 014, RF-17: la racha como pegatinas por día: hechos (menta, con ✓), el de hoy (chicle, con brillo) y los
 * siguientes. A la vista solo el número y su pegatina; el texto completo, para lectores de pantalla.
 */
export function StreakRow({ schedule, day, claimedToday }: { schedule: Reward[]; day: number; claimedToday: boolean }) {
  const t = useT().rewards;
  return (
    <ol className="grid grid-cols-7 gap-1.5" data-testid="streak">
      {schedule.map((r, i) => {
        const n = i + 1;
        const done = claimedToday ? n <= day : n < day;
        const current = !claimedToday && n === day;
        const state = done ? "done" : current ? "current" : "next";
        return (
          <li key={n} data-day={n} data-state={state} className="flex min-w-0 flex-col items-center gap-1">
            <span className="sr-only">{`${t.daily.day(n)}: ${r.kind === "cookies" ? t.daily.cookies(r.amount) : t.daily.pack}`}</span>
            <span
              aria-hidden
              className={cx(
                "grid size-10 place-items-center rounded-full border-[3px] font-display text-base font-semibold",
                state === "done" && "border-k-blanco bg-k-menta text-k-tinta shadow-[var(--shadow-relief-soft)]",
                state === "current" && "border-k-blanco bg-k-chicle text-k-tinta shadow-[0_0_14px_2px_var(--ui-k-chicle)]",
                state === "next" && (r.kind === "pack" ? "border-k-blanco bg-k-limon text-k-tinta" : "border-k-lavanda/40 bg-ui-hover text-ui-text-3"),
              )}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span aria-hidden className={cx("flex items-center gap-0.5 text-xs font-black tabular-nums", current ? "text-ui-accent-text" : "text-ui-text-2")}>
              {r.kind === "cookies" ? (
                <>
                  {r.amount}
                  <Sticker name="cookie" className="size-4" />
                </>
              ) : (
                <Sticker name="pack" className="size-5" />
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
