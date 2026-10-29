// Textos de las páginas públicas: inicio, entrar, probabilidades, 404 y error (spec 008).
// La versión en español vive en ../es/site.ts con la misma forma.
export const site = {
  home: {
    tagline: "Anime illustration trading cards. Open packs, collect your favorites and complete every set.",
    aiNotice: "AI-generated illustrations. Cards are digital, have no monetary value and cannot be traded.",
  },
  login: {
    title: "Sign in",
    withPatreon: "Sign in with Patreon",
    patreonMissing: "Patreon is not configured yet (AUTH_PATREON_ID and AUTH_PATREON_SECRET are missing).",
    devLogin: "Development login",
    namePlaceholder: "Name",
    asAdmin: "Sign in as administrator",
    devSubmit: "Sign in (development)",
  },
  dropRates: {
    metaTitle: "Drop rates",
    metaDescription: "Published drop rates for every set.",
    heading: "Pack drop rates",
    intro:
      "Each pack has several slots. Each slot gives one card, and its rarity is rolled with the percentages in that row. Within a rarity, every card has the same chance. A pack never repeats a card: if a slot lands on a card already in that pack, another card of the same rarity is chosen (it only repeats when that rarity has no other cards left); the rarity percentages do not change. Every set has two tables: one for the silver pack and one for the gold pack, which gives a higher chance of Legendary and EX. These tables are fixed when the set is published and never change afterwards. Cards have no monetary value and cannot be traded. Card illustrations are AI-generated.",
    empty: "No sets have been published yet.",
    published: (p: { date: string; version: number; packSize: number; holo: string }) =>
      `Published on ${p.date} · version ${p.version} · ${p.packSize} cards per pack · holo (any rarity): ${p.holo}`,
    pity: (n: number) =>
      `Bad-luck protection (silver packs only): if you open ${n} silver packs in a row from this set without any Epic or better card, the next one brings at least one (it replaces the card in the last slot). The counter is yours and for this set only.`,
    noPity: "This set has no bad-luck protection.",
    // Spec 022, RF-14, RF-15 and RF-20.
    guarantee: { silver: "Every silver pack brings at least one Rare or better.", gold: "Every gold pack brings at least one Epic or better." },
    slot: "Slot",
    pack: "Pack",
    guaranteedSlot: "(guaranteed)",
    // Spec 021, RF-10: how each set is obtained.
    how: { free: "Free", patreon: "With the subscription" },
  },
  notFound: {
    title: "Page not found",
    heading: "This page does not exist",
    body: "The link may have changed, or the album may no longer be public.",
    home: "Back to home",
  },
  error: {
    heading: "Something went wrong",
    body: "It's not your fault. Your packs and cards are safe: please try again in a moment.",
    code: (digest: string) => `Code: ${digest}`,
    home: "Go to home",
  },
  lab: {
    metaTitle: "Opening lab",
    metaDescription: "Local prototype of the pack opening with fake data.",
  },
  demo: {
    tag: "Local demo",
    roles: { collector: "collector", admin: "admin" },
    banner: (role: string) => `Demo mode · you are viewing as ${role === "admin" ? "an admin" : "a collector"}`,
    bannerShort: (role: string) => `Demo · ${role}`,
    switchTo: (role: string) => `Switch to ${role}`,
    enterCollector: "Enter as a collector",
    enterCollectorDetail: "Sealed packs, a collection in progress, cookies and a 4-day streak.",
    enterAdmin: "Enter as an admin",
    enterAdminDetail: "Sets, cards, users, metrics, backups and settings.",
    note: "Demo data is recreated every time you run pnpm demo. Never available in production.",
    notSeeded: "The demo has no data yet. Run pnpm demo to create it.",
  },
};
