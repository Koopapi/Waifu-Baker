import Patreon from "next-auth/providers/patreon";

/** Identidad de Patreon API v2 (la v1 que trae Auth.js por defecto responde 410 Gone desde 2026). */
export const PATREON_IDENTITY_URL = "https://www.patreon.com/api/oauth2/v2/identity";

interface PatreonIdentity {
  data: { id: string; attributes: { full_name?: string; image_url?: string } };
}

/** Perfil mínimo (constitución, principio 6): id y nombre de Patreon, y avatar. Sin email. */
export function patreonProfile(profile: PatreonIdentity) {
  return {
    id: profile.data.id,
    name: profile.data.attributes.full_name ?? null,
    email: null,
    image: profile.data.attributes.image_url ?? null,
  };
}

export function patreonProvider() {
  return Patreon({
    authorization: { params: { scope: "identity identity.memberships" } },
    userinfo: { url: PATREON_IDENTITY_URL, params: { "fields[user]": "full_name,image_url" } },
    // El tipo de Auth.js describe el perfil v1; la v2 tiene la misma forma en `data`.
    profile: (p) => patreonProfile(p as unknown as PatreonIdentity),
  });
}
