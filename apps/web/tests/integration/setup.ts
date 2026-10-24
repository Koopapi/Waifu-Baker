// Spec 018: los tests usan un dibujo rápido de la imagen fija y cierran el Chromium del real al terminar cada archivo.
import { afterAll } from "vitest";
import { closeFlattenBrowser } from "@/server/cards/flatten";
import { setFlattener } from "@/server/cards/flat-store";
import { fastFlatten } from "./fast-flatten";

setFlattener(fastFlatten);
afterAll(() => closeFlattenBrowser());
