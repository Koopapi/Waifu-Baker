// Spec 018: los tests usan un dibujo rápido de la imagen fija y cierran el Chromium del real al terminar cada archivo.
import { afterAll } from "vitest";
import { closeFlattenBrowser } from "@/server/cards/flatten";
import { setFlattener } from "@/server/cards/flat-store";
import { fastFlatten } from "./fast-flatten";

setFlattener(fastFlatten);
// Para firmar enlaces de imagen y de capas (spec 018) hace falta un secreto; en los tests vale uno fijo.
process.env.AUTH_SECRET ??= "secreto-de-los-tests";
afterAll(() => closeFlattenBrowser());
