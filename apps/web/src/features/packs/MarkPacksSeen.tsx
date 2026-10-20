"use client";

import { useEffect } from "react";
import { markPacksSeenAction } from "@/app/sobres/arrivals-actions";

/** Spec 015, RF-8: al visitar «Mis sobres», las llegadas de hasta ahora dejan de ser nuevas (en la siguiente visita). */
export function MarkPacksSeen() {
  useEffect(() => {
    void markPacksSeenAction();
  }, []);
  return null;
}
