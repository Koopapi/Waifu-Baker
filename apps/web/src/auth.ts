import NextAuth, { type DefaultSession } from "next-auth";
import Patreon from "next-auth/providers/patreon";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { db } from "@/db/client";
import { isDevLoginEnabled, parseAdminIds, resolveRole, type Role } from "@/domain/auth/access";
import { upsertUserFromLogin } from "@/server/services/users";

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
  providers.push(Patreon({ authorization: { params: { scope: "identity identity.memberships" } } }));
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
        const row = await upsertUserFromLogin(db, {
          patreonUserId,
          displayName: user.name ?? patreonUserId,
          avatarUrl: user.image ?? null,
          role,
        });
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
