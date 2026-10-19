// Textos de sobres gratis, recompensa diaria y galletas (spec 009).
// La versión en español vive en ../es/rewards.ts con la misma forma.
export const rewards = {
  free: {
    title: "Free pack",
    ready: (n: number, max: number) => `${n} of ${max} ready`,
    full: "Full: claim one so the next starts charging.",
    nextIn: "Next one in",
    nextShort: "until the next",
    chooseSet: "Set",
    claim: "Claim free pack",
    claimed: "Free pack added to your packs.",
    none: "No sets available right now.",
  },
  daily: {
    title: "Daily reward",
    day: (n: number) => `Day ${n}`,
    cookies: (n: number) => `${n} cookies`,
    pack: "1 pack",
    claim: "Claim today's reward",
    claimed: "Claimed today. Come back tomorrow.",
    gotCookies: (n: number) => `+${n} cookies!`,
    gotPack: "Pack added to your packs!",
    graceHint: "You can miss one day without losing your streak.",
    chooseSetForPack: "Set for your day 7 pack",
  },
  cookies: {
    title: "Cookies",
    balance: (n: number) => `${n} cookies`,
    about: "Cookies are earned with your daily streak. Soon you'll be able to spend them on games and packs. They have no monetary value and cannot be bought, sold or transferred.",
    history: "History",
    empty: "No cookies yet.",
    reason: (r: string) => (r.startsWith("daily:") ? `Daily reward · day ${r.slice(6)}` : r.startsWith("admin:") ? `Adjustment · ${r.slice(6).trim()}` : r),
  },
  countdown: (h: number, m: number, s: number) => `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
  // Spec 015: premios con vida (celebraciones, vuelos, racha en peligro, errores junto al botón).
  fx: {
    close: "Awesome!",
    goToPacks: "See my packs",
    arrivals: {
      title: (n: number) => (n === 1 ? "A pack arrived!" : `${n} packs arrived!`),
      welcome: "Welcome!",
      gift: "A gift for you",
      tier: "Your subscription this month",
      mixed: "New packs",
    },
    streak: {
      kicker: "Day 7 of your streak",
      title: "Streak complete!",
      detail: (set: string) => `Your ${set} pack is now in My packs. A new streak starts tomorrow.`,
      atRisk: "Claim today or you lose your streak!",
    },
    sr: {
      gotCookies: (n: number, total: number) => `You got ${n} cookies. You have ${total}.`,
      gotPack: "You got a pack. It is in My packs.",
    },
    failed: "Something went wrong",
    failedDetail: "Check your connection and try again.",
    retry: "Retry",
    newPacks: (n: number) => (n === 1 ? "New!" : `${n} new`),
  },
};
