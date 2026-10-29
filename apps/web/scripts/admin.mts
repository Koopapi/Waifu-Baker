// Spec 024, RF-15 y RF-21: cuentas de administrador desde el servidor (en Coolify: Terminal del contenedor).
//   pnpm admin create <usuario>          crea la cuenta y muestra una contraseña temporal (se cambia al entrar)
//   pnpm admin reset-password <usuario>  contraseña temporal nueva y desbloqueo
//   pnpm admin reset-telegram <usuario>  desvincula Telegram (se vuelve a vincular al entrar)
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { createAdminAccount, resetAdminPassword, resetAdminTelegram } from "@/server/services/admin-accounts";

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(sql, { schema });
const [cmd, username] = process.argv.slice(2);
const usage = "Uso: pnpm admin create|reset-password|reset-telegram <usuario>";
try {
  if (!username) throw new Error(usage);
  if (cmd === "create") {
    const { password } = await createAdminAccount(db, username);
    console.log(`Cuenta «${username}» creada. Contraseña temporal (se pide cambiarla al entrar):\n\n  ${password}\n`);
    console.log("Entra en /login/team. Esta contraseña no se vuelve a mostrar.");
  } else if (cmd === "reset-password") {
    const { password } = await resetAdminPassword(db, username);
    console.log(`Contraseña temporal nueva para «${username}» (se pide cambiarla al entrar):\n\n  ${password}\n`);
  } else if (cmd === "reset-telegram") {
    await resetAdminTelegram(db, username);
    console.log(`Telegram desvinculado de «${username}». Se vuelve a vincular al entrar.`);
  } else throw new Error(usage);
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
