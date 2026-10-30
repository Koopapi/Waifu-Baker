"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RarityTier } from "@/domain/catalog/rarity-tier";
import type { CartaConfig, CartaInstancia } from "./carta-capas/carta-capas";

/** Proporción de las cartas compuestas (1500 × 2100, marco de Pencil incluido). */
export const CARD_RATIO = 5 / 7;
/** Proporción del arte suelto en carta-capas (700 × 991). */
const RAW_RATIO = 700 / 991;

export interface CartaCapasProps {
  /** Escalón visual (marco, partículas y sello del preset). */
  tier: RarityTier;
  /** Imagen de la carta: compuesta con su marco de Pencil o, con `rawArt`, solo la ilustración. */
  image: string;
  /** La imagen es arte sin marco (laboratorio, catálogo): se usa el marco metálico del escalón. */
  rawArt?: boolean;
  /** Nombre para lectores de pantalla (p. ej. «Aiko, Legendaria»). */
  label: string;
  /** Configuración por capas guardada para la carta; si falta, se usa el preset del escalón con la imagen. */
  config?: CartaConfig | null;
  holo?: boolean;
  /** Rejillas: sin inclinación ni escuchas del ratón, con menos partículas. */
  estatica?: boolean;
  /** Sin el sello que sobresale (miniaturas apretadas). */
  noSeal?: boolean;
  /** Apertura: el sello espera escondido hasta `entrar()`. */
  sealHidden?: boolean;
  /** Spec 018, RF-6: al cargar sus capas, hace su entrada (brillo que barre y el sello que salta). */
  entrance?: boolean;
  /** Elemento donde se escucha el ratón (por defecto, el padre). */
  zone?: React.RefObject<HTMLElement | null>;
  /**
   * Spec 025, RF-8: ajustes de la vista previa del editor (parallax, inclinación, movimiento solo e intensidad del holo).
   * Cambiarlos no vuelve a montar la carta.
   */
  view?: Pick<CartaConfig, "profundidad" | "inclinacion" | "reposo" | "holoIntensidad">;
  className?: string;
  style?: React.CSSProperties;
}

export interface CartaCapasHandle {
  entrar(): void;
  ocultarSello(): void;
  /** Spec 018, RF-12: sigue la inclinación del teléfono (pide permiso si el dispositivo lo exige). */
  habilitarGiroscopio(): Promise<boolean>;
  deshabilitarGiroscopio(): void;
}

/**
 * Carta por capas (carta-capas.js v4, paquete de diseño): brillo que sigue al cursor, partículas y sello flotante
 * según su rareza. Con una imagen ya compuesta (marco de Pencil incluido) se monta con `marco: "ninguno"`; con arte
 * suelto (`rawArt`) usa el marco metálico del escalón. El script se descarga aparte la primera vez que hace falta y la carta se
 * destruye (con sus escuchas) al desmontarse.
 */
export const CartaCapas = forwardRef<CartaCapasHandle, CartaCapasProps>(function CartaCapas(
  { tier, image, label, rawArt = false, config, holo = false, estatica = false, noSeal = false, sealHidden = false, entrance = false, zone, view, className, style },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const card = useRef<CartaInstancia | null>(null);
  const hidden = useRef(sealHidden);
  hidden.current = sealHidden;
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    let alive = true;
    import("./carta-capas/carta-capas.js").then((mod) => {
      const lib = mod.default;
      if (!alive || !box.current || !lib) return;
      const extra: CartaConfig = {
        // Una configuración por capas trae su marco y su proporción; una imagen compuesta ya lleva el marco de Pencil.
        ...(rawArt || config ? {} : { marco: "ninguno", proporcion: CARD_RATIO }),
        etiqueta: label,
        estatica,
        zona: zone?.current ?? undefined,
        // Con una imagen, el holo es la versión holo del juego (no el del preset: la UR lo trae siempre); con
        // capas, también el que elija la configuración.
        holo: holo || Boolean(config?.holo),
        ...(noSeal ? { sello: null } : {}),
        ...viewRef.current,
      };
      card.current = config ? lib.montar(box.current, { ...config, ...extra }) : lib.montarRareza(box.current, tier, image, extra);
      if (hidden.current || entrance) card.current.ocultarSello();
      if (entrance) {
        const inst = card.current;
        void inst.listo.then(() => alive && inst.entrar());
      }
    });
    return () => {
      alive = false;
      card.current?.destruir();
      card.current = null;
    };
    // `zone` es un ref estable; `label` solo cambia con la carta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, image, rawArt, config, estatica, noSeal, entrance]);

  useEffect(() => {
    card.current?.set({ holo: holo || Boolean(config?.holo) });
  }, [holo, config]);

  useEffect(() => {
    if (view) card.current?.set(view);
  }, [view?.profundidad, view?.inclinacion, view?.reposo, view?.holoIntensidad]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    entrar: () => card.current?.entrar(),
    ocultarSello: () => card.current?.ocultarSello(),
    habilitarGiroscopio: () => card.current?.habilitarGiroscopio() ?? Promise.resolve(false),
    deshabilitarGiroscopio: () => card.current?.deshabilitarGiroscopio(),
  }), []);

  return <div ref={box} className={className} style={{ aspectRatio: rawArt || config ? RAW_RATIO : CARD_RATIO, ...style }} data-carta-capas={tier} />;
});
