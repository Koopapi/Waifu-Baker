"use client";

// Spec 028, RF-2, RF-5 y RF-15: los valores por defecto vigentes (sello de texto y borde) llegan del servidor a la ventana
// de la carta, que los usa al aplicar el estilo de la rareza, al poner un sello de texto y al importar.
import { createContext, useContext } from "react";
import { FACTORY_CARD_DEFAULTS, type CardDefaults } from "@/domain/cards/card-defaults";

export const CardDefaultsContext = createContext<CardDefaults>(FACTORY_CARD_DEFAULTS);

export const useCardDefaults = () => useContext(CardDefaultsContext);
