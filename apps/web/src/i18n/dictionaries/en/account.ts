// Textos de «Mi cuenta» (spec 001). La versión en español vive en ../es/account.ts con la misma forma.
export const account = {
  title: "My account",
  subscription: "Patreon subscription",
  tier: "Tier",
  noTier: "No paid tier",
  status: "Status",
  statusLabel: { active_patron: "Active patron", declined_patron: "Payment declined", former_patron: "Former patron", none: "Not a patron" } as Record<string, string>,
  packsPerMonth: "Packs per month",
  lastCharge: "Last charge",
  noCharge: "None yet",
  syncedAt: (when: string) => `Updated from Patreon: ${when}`,
  joinPatreon: "Become a patron to get packs every month.",
  adult: {
    title: "18+ content",
    verified: "Verified: you can see and open 18+ sets.",
    needTier: "To see 18+ sets you need an active adult tier on Patreon. Once verified, you keep access even if you cancel later.",
    canDeclare: "Your Patreon tier includes 18+ sets. Confirm your age to unlock them.",
    confirm: "I confirm I am 18 years old or older.",
    submit: "Unlock 18+ content",
    done: "Age verified. 18+ sets are now unlocked.",
  },
  delete: {
    title: "Delete account",
    body: "Your account will be deactivated and you will be signed out. If you sign in again with the same Patreon within 30 days, you get everything back. After 30 days your cards, packs and album are deleted for good.",
    button: "Delete my account",
    confirm: "Delete your account? You have 30 days to change your mind by signing in again.",
  },
};
