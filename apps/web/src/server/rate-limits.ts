import "server-only";
import { SlidingWindowLimiter } from "@/domain/rate-limit";

// RF-21: 10 peticiones de apertura por minuto y usuario. En memoria: vale con un solo proceso.
const g = globalThis as unknown as { openLimiter?: SlidingWindowLimiter };
export const openLimiter = (g.openLimiter ??= new SlidingWindowLimiter(10, 60_000));
