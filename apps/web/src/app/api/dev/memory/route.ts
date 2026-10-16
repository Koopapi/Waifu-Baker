import v8 from "node:v8";
import { isDevLoginEnabled } from "@/domain/auth/access";

export const runtime = "nodejs";

const allowed = () => isDevLoginEnabled(process.env) && process.env.NODE_ENV !== "production";

// Código con el que `next dev` vuelve a lanzar su proceso servidor (el mismo que usa su vigilante de memoria).
const RESTART_EXIT_CODE = 77;
// `next dev` se reinicia solo, a mitad de lo que esté sirviendo, al pasar del 80 % del montón: aquí se
// reinicia antes y entre dos tests, que es cuando no rompe ninguna navegación.
const RESTART_RATIO = 0.4;

/**
 * Solo desarrollo y E2E: el servidor de desarrollo de Next retiene memoria en cada página servida y,
 * en una batería larga, acaba reiniciándose solo en mitad de un test. Los E2E llaman aquí antes de
 * cada test: se recoge la basura (si el proceso arrancó con `--expose-gc`) y, si aun así queda poca
 * memoria, se reinicia el servidor de forma controlada (`{ restarting: true }`).
 */
export async function POST() {
  if (!allowed()) return new Response("Not found", { status: 404 });
  (globalThis as { gc?: () => void }).gc?.();
  const { used_heap_size: used, heap_size_limit: limit } = v8.getHeapStatistics();
  const restarting = used > RESTART_RATIO * limit;
  if (restarting) setTimeout(() => process.exit(RESTART_EXIT_CODE), 200);
  return Response.json({ usedMb: Math.round(used / 2 ** 20), limitMb: Math.round(limit / 2 ** 20), restarting });
}
