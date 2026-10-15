"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

export type TiltMode = "auto" | "pointer" | "gyro";

/** Inclinación normalizada en [-1, 1] en cada eje. */
export interface Tilt {
  x: number;
  y: number;
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

interface DeviceOrientationEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/**
 * Fuente única de inclinación para las cartas: ratón en escritorio, giroscopio en móvil
 * (iOS exige pedir permiso dentro de un gesto del usuario) y balanceo automático si no hay
 * ninguna de las dos. El valor vive en una ref para no re-renderizar en cada movimiento.
 */
export function useTiltSource() {
  const target = useRef<Tilt>({ x: 0, y: 0 });
  const modeRef = useRef<TiltMode>("auto");
  const [mode, setModeState] = useState<TiltMode>("auto");
  const [gyroAvailable, setGyroAvailable] = useState(false);

  const setMode = useCallback((m: TiltMode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  useEffect(() => {
    const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    setGyroAvailable(touch && typeof window !== "undefined" && "DeviceOrientationEvent" in window);
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (modeRef.current === "gyro" || e.pointerType === "touch") return;
      const r = e.currentTarget.getBoundingClientRect();
      target.current = {
        x: clamp(((e.clientX - r.left) / r.width) * 2 - 1),
        y: clamp(((e.clientY - r.top) / r.height) * 2 - 1),
      };
      if (modeRef.current === "auto") setMode("pointer");
    },
    [setMode],
  );

  const onPointerLeave = useCallback(() => {
    if (modeRef.current === "gyro") return;
    target.current = { x: 0, y: 0 };
  }, []);

  const requestGyro = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return false;
    const DOE = window.DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;
    try {
      if (typeof DOE.requestPermission === "function") {
        const result = await DOE.requestPermission();
        if (result !== "granted") return false;
      }
    } catch {
      return false;
    }
    const handler = (ev: DeviceOrientationEvent) => {
      const gamma = ev.gamma ?? 0; // izquierda/derecha, -90..90
      const beta = ev.beta ?? 0; // adelante/atrás, -180..180; ~40 es sostener el móvil normal
      target.current = { x: clamp(gamma / 25), y: clamp((beta - 40) / 25) };
    };
    window.addEventListener("deviceorientation", handler);
    setMode("gyro");
    return true;
  }, [setMode]);

  return { target, mode, gyroAvailable, requestGyro, onPointerMove, onPointerLeave };
}
