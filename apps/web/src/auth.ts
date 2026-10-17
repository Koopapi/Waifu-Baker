import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { db } from "@/db/client";
import { isDevLoginEnabled, parseAdminIds, resolveRole, type Role } from "@/domain/auth/access";
import { patreonProvider } from "@/server/auth/patreon-provider";
import { getPatreonClient } from "@/server/patreon/client-instance";
import { prepareLogin } from "@/server/services/account";
import { syncOnLogin } from "@/server/services/membership";
import { upsertUserFromLogin } from "@/server/services/users";
import { grantWelcomePack } from "@/server/services/welcome";
import { authLogger } from "@/server/auth/logger";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

export const devLoginEnabled = isDevLoginEnabled(process.env);
export const patreonLoginEnabled = Boolean(process.env.AUTH_PATREON_ID && process.env.AUTH_PATREON_SECRET);
const adminIds = parseAdminIds(process.env.ADMIN_PATREON_IDS);

const providers: Provider[] = [];
if (patreonLoginEnabled) {
  providers.push(patreonProvider());
}
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Desarrollo",
      credentials: { name: { label: "Nombre" }, admin: { label: "Administrador" } },
      authorize(c) {
        const name = String(c?.name ?? "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "");
        if (!name) return null;
        return { id: `dev:${name}`, name, devAdmin: c?.admin === "on" } as { id: string; name: string };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  logger: authLogger,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        const patreonUserId = account.provider === "dev" ? String(user.id) : account.providerAccountId;
        const role = resolveRole({
          patreonUserId,
          adminIds,
          devAdmin: Boolean((user as { devAdmin?: boolean }).devAdmin),
          devEnabled: devLoginEnabled,
        });
        // Spec 001: reactivar (o terminar de borrar) antes de crear o actualizar la cuenta.
        await prepareLogin(db, patreonUserId);
        const row = await upsertUserFromLogin(db, {
          patreonUserId,
          displayName: user.name ?? patreonUserId,
          avatarUrl: user.image ?? null,
          role,
        });
        // Spec 001: bienvenida y membresía. Un fallo aquí nunca impide entrar (RF-4).
        try {
          await grantWelcomePack(db, row);
          await syncOnLogin(db, getPatreonClient().client, {
            userId: row.id,
            patreonUserId,
            userAccessToken: account.provider === "patreon" ? (account.access_token ?? null) : null,
          });
        } catch (e) {
          console.warn("[auth] no se pudo completar la sincronización al entrar:", (e as Error).message);
        }
        token.uid = row.id;
        token.role = row.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.role = (token.role as Role) ?? "user";
      return session;
    },
  },
});
