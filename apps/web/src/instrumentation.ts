// Next.js llama a register() una vez al arrancar el servidor. La condición va en línea para que Next
// deje fuera del paquete edge todo lo que usa Node (base de datos, Patreon).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSchedulerIfEnabled } = await import("./server/scheduler");
    startSchedulerIfEnabled();
  }
}
