"use client";

import { useState } from "react";
import type { LibraryKind, ParticlePreset } from "@/domain/cards/library";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button } from "@/ui/action/Button";
import { TextField } from "@/ui/form/TextField";
import { Modal } from "@/ui/overlay/Modal";

/** Un elemento de la biblioteca tal como lo recibe el editor. */
export interface LibraryEntry {
  id: string;
  kind: LibraryKind;
  name: string;
  key: string | null;
  url: string | null;
  particles: ParticlePreset | null;
}

const FILTERS: LibraryKind[] = ["adorno", "particulas", "fondo", "sello"];

/**
 * Spec 017 (ampliación), RF-8: ventana «Añadir de la biblioteca» del editor. Se filtra por tipo y por nombre; los
 * adornos y las partículas se eligen varios a la vez, el fondo y el sello de uno en uno (la carta solo lleva uno).
 */
export function LibraryPicker({ open, onOpenChange, items, onPick }: { open: boolean; onOpenChange: (open: boolean) => void; items: LibraryEntry[]; onPick: (picked: LibraryEntry[]) => void }) {
  const t = useAdminLayersT();
  const [kind, setKind] = useState<LibraryKind>("adorno");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const single = kind === "fondo" || kind === "sello";
  const shown = items.filter((i) => i.kind === kind && i.name.toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = (id: string) => setPicked((p) => (single ? (p[0] === id ? [] : [id]) : p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const close = () => {
    setPicked([]);
    setQuery("");
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title={t.pick.title}
      size="xl"
      testId="library-picker"
      closeLabel={t.pick.cancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            {t.pick.cancel}
          </Button>
          <Button
            disabled={picked.length === 0}
            onClick={() => {
              onPick(items.filter((i) => picked.includes(i.id)));
              close();
            }}
            data-testid="library-picker-add"
          >
            {t.pick.add(picked.length)}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.pick.title}>
          {FILTERS.map((k) => (
            <Button
              key={k}
              size="sm"
              variant={k === kind ? "primary" : "secondary"}
              aria-pressed={k === kind}
              onClick={() => {
                setKind(k);
                setPicked([]);
              }}
            >
              {t.library.kinds[k]}
            </Button>
          ))}
        </div>
        <TextField label={t.pick.search} hideLabel placeholder={t.pick.search} value={query} onChange={(e) => setQuery(e.target.value)} />
        {shown.length === 0 ? (
          <p className="text-sm text-ui-text-3">{t.pick.empty}</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
            {shown.map((i) => {
              const on = picked.includes(i.id);
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={t.pick.choose(i.name)}
                    onClick={() => toggle(i.id)}
                    className={`block w-full space-y-1 rounded-m border-2 p-1.5 text-left ${on ? "border-ui-accent" : "border-transparent hover:border-ui-line"}`}
                    data-testid="library-picker-item"
                  >
                    {i.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagen privada del panel, servida por la API
                      <img src={i.url} alt="" className={i.kind === "sello" ? "h-20 w-full rounded-s bg-ui-rail object-contain p-2" : "aspect-[700/991] w-full rounded-s bg-ui-rail object-cover"} />
                    ) : (
                      <span aria-hidden className="grid h-20 place-items-center rounded-s bg-ui-rail">
                        <span className="size-8 rounded-full border border-ui-line" style={{ background: i.particles?.color ?? "var(--ui-k-lavanda)" }} />
                      </span>
                    )}
                    <span className="block truncate text-xs font-semibold">{i.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
