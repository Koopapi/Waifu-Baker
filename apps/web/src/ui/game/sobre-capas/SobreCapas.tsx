"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { CartaCapasApi } from "../carta-capas/carta-capas";
import type { SobreCapasApi, SobreEstado, SobreInstancia, SobreRegistro, SobreTextos } from "./sobre-capas";

import { ONDAS_DE_FABRICA, SOBRE_RECURSOS } from "./recursos";

let loading: Promise<SobreCapasApi> | null = null;

/**
 * Descarga carta-capas.js y sobre-capas.js (en ese orden: el sobre usa `CartaCapas.motor`) la primera vez que hace falta,
 * fuera de la primera carga de la página (RNF peso), y deja configurados los recursos una sola vez.
 */
export function loadSobreCapas(): Promise<SobreCapasApi> {
  loading ??= (async () => {
    const carta = (await import("../carta-capas/carta-capas.js")).default as unknown as CartaCapasApi;
    const w = window as unknown as { CartaCapas?: CartaCapasApi };
    if (!w.CartaCapas) w.CartaCapas = carta;
    carta.texturas.ondas ??= ONDAS_DE_FABRICA;
    const lib = (await import("./sobre-capas.js")).default as unknown as SobreCapasApi;
    Object.assign(lib.recursos, SOBRE_RECURSOS);
    return lib;
  })();
  return loading;
}

export interface SobreCapasProps {
  /** El registro del sobre (spec 030: el diseño de la colección o el sobre básico), con sus enlaces. */
  registro: SobreRegistro;
  textos?: SobreTextos;
  inclinacion?: number;
  reposo?: boolean;
  flotar?: boolean;
  sonido?: boolean;
  /** Vista fija: sin bucle de animación ni escuchas. */
  estatica?: boolean;
  /** `false`: no se abre con el dedo (movimiento reducido: solo el botón y el teclado). */
  gestos?: boolean;
  guias?: boolean;
  /** Elemento que escucha el puntero para inclinar (por defecto, el padre). */
  zone?: React.RefObject<HTMLElement | null>;
  label?: string;
  onOpen?: () => void;
  onHint?: () => void;
  onVibrate?: (pattern: number[]) => void;
  onSound?: (name: "rasgon") => void;
  /** Se monta (las librerías ya cargaron). */
  onReady?: (sobre: SobreInstancia) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface SobreCapasHandle {
  abrir(): void;
  reiniciar(): void;
  ocultar(): Promise<void>;
  readonly estado: SobreEstado | null;
  readonly textoIndicacion: string;
  readonly elemento: HTMLElement | null;
}

/**
 * Spec 030: el sobre por capas de Bruno (`sobre-capas.js`) en React. Se monta una vez; si cambia el registro, se le
 * aplica con `set` (vista previa del editor, sin volver a montarlo). Se destruye con sus escuchas al desmontarse.
 */
export const SobreCapas = forwardRef<SobreCapasHandle, SobreCapasProps>(function SobreCapas(
  { registro, textos, inclinacion = 1, reposo = true, flotar = true, sonido = true, estatica = false, gestos = true, guias = false, zone, label, onOpen, onHint, onVibrate, onSound, onReady, className, style },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const inst = useRef<SobreInstancia | null>(null);
  const cb = useRef({ onOpen, onHint, onVibrate, onSound, onReady });
  cb.current = { onOpen, onHint, onVibrate, onSound, onReady };
  const json = useMemo(() => JSON.stringify(registro), [registro]);
  const textJson = useMemo(() => JSON.stringify(textos ?? null), [textos]);
  const live = useRef({ registro, textos, inclinacion, reposo, sonido, guias, label });
  live.current = { registro, textos, inclinacion, reposo, sonido, guias, label };

  useEffect(() => {
    let alive = true;
    void loadSobreCapas().then((lib) => {
      if (!alive || !box.current) return;
      const v = live.current;
      inst.current = lib.montar(box.current, {
        ...v.registro,
        textos: v.textos ?? null,
        etiqueta: v.label ?? null,
        inclinacion: v.inclinacion,
        reposo: v.reposo,
        flotar,
        sonido: v.sonido,
        estatica,
        gestos,
        zona: zone?.current ?? null,
        alAbrir: () => cb.current.onOpen?.(),
        alPista: () => cb.current.onHint?.(),
        alVibrar: (p) => cb.current.onVibrate?.(Array.isArray(p) ? p : [p]),
        alSonido: (n) => cb.current.onSound?.(n),
      });
      inst.current.guias(v.guias);
      cb.current.onReady?.(inst.current);
    });
    return () => {
      alive = false;
      inst.current?.destruir();
      inst.current = null;
    };
    // El registro y los ajustes vivos se aplican abajo sin volver a montar; `zone` es un ref estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estatica, gestos, flotar]);

  // Registro o textos nuevos (el editor): se vuelve a dibujar cerrado con `set`.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    inst.current?.set({ ...live.current.registro, textos: live.current.textos ?? null, etiqueta: live.current.label ?? null });
  }, [json, textJson, label]);

  useEffect(() => {
    const op = inst.current?.opciones;
    if (op) Object.assign(op, { inclinacion, reposo, sonido });
  }, [inclinacion, reposo, sonido]);

  useEffect(() => inst.current?.guias(guias), [guias]);

  useImperativeHandle(ref, () => ({
    abrir: () => inst.current?.abrir(),
    reiniciar: () => inst.current?.reiniciar(),
    ocultar: () => inst.current?.ocultar() ?? Promise.resolve(),
    get estado() {
      return inst.current?.estado ?? null;
    },
    get textoIndicacion() {
      return inst.current?.textoIndicacion ?? "";
    },
    get elemento() {
      return inst.current?.elemento ?? null;
    },
  }), []);

  // El script pone sus clases en el elemento de dentro: React solo maneja las del de fuera (no se pisan al volver a pintar).
  return (
    <div className={className} style={style} data-sobre-capas="">
      <div ref={box} />
    </div>
  );
});
