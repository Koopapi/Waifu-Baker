// Textos legales, puerta de bienvenida y pie (spec 007). La versión en español vive en ../es/legal.ts.
// «{contact}» se sustituye por la vía de contacto configurada.
export interface LegalSection {
  h: string;
  p: string[];
}

export const legal = {
  footer: {
    terms: "Terms",
    privacy: "Privacy",
    content: "Content & AI",
    odds: "Drop rates",
    rights: "© Waifu Baker",
  },
  meta: (version: number, updated: string) => `Version ${version} · last updated ${updated}`,
  contactLabel: "Contact",
  contactPatreon: "Message us on Patreon",
  gate: {
    title: "Before you start",
    intro: "Waifu Baker is a digital trading card collection. To continue, please confirm the following.",
    updated: "We updated our terms. Please review and accept them to continue.",
    age: (n: number) => `I am ${n} years old or older.`,
    ageRaised: (n: number) => `The minimum age is now ${n}. Please confirm it to continue.`,
    termsBefore: "I have read and accept the",
    termsLink: "Terms of use",
    and: "and the",
    privacyLink: "Privacy policy",
    submit: "Continue",
    signOut: "Sign out",
    required: "Please tick both boxes to continue.",
  },
  docs: {
    terms: {
      title: "Terms of use",
      sections: [
        { h: "Who we are", p: ["This website is operated under the trade name “Waifu Baker” (“we”). You can reach us at {contact}."] },
        {
          h: "Who can use Waifu Baker",
          p: [
            "You must be at least {minAge} years old to use the website. By continuing, you confirm that you are.",
            "18+ sets are only available to people who declare they are adults and hold an active adult membership tier on Patreon. Once verified, access is kept.",
            "We may suspend or close accounts that break these terms.",
          ],
        },
        {
          h: "Your account",
          p: ["You sign in with your Patreon account. Each account is for one person. Do not share it or create several accounts to obtain more rewards."],
        },
        {
          h: "Digital cards, packs and cookies",
          p: [
            "Cards, packs and cookies are digital items for entertainment inside this website only.",
            "They have no monetary value. They cannot be exchanged for money, sold, transferred or traded between users, and there is no prize for completing a collection.",
            "We may correct or remove items obtained by mistake, through a bug or through abuse.",
          ],
        },
        {
          h: "Packs and drop rates",
          p: [
            "Pack contents are random and decided by our server using the published drop rates of each set, including its bad-luck protection. Published rates never change for that set.",
            "Because of local law, packs cannot be opened from Belgium. Your packs are kept.",
          ],
        },
        {
          h: "Payments",
          p: [
            "Paid memberships are handled entirely by Patreon. Each paid monthly charge grants the packs of your tier.",
            "Refunds follow Patreon's policies. If a charge is refunded or marked as fraud, the unopened packs granted by that charge are voided.",
          ],
        },
        {
          h: "Free packs and daily rewards",
          p: ["Free packs and daily rewards are a gift and may change or end. Abusing them (for example with several accounts or by manipulating the time zone) may lead to their removal."],
        },
        {
          h: "Content",
          p: ["Card illustrations are AI-generated and feature fictional adult characters. See the Content & AI page for details. To report a problem or a rights claim, contact us at {contact}."],
        },
        {
          h: "Public albums",
          p: ["Public albums are optional and off by default. Choose an alias that is not offensive or misleading. We may hide albums that break these terms."],
        },
        {
          h: "Deleting your account",
          p: [
            "You can delete your account from My account. You have 30 days to change your mind by signing in again.",
            "After 30 days your cards, packs, cookies and album are deleted for good. Anonymous records of pack openings are kept to audit the drop rates.",
          ],
        },
        { h: "Changes", p: ["We may update these terms. When we do, we will ask you to accept the new version before you continue."] },
        {
          h: "Beta and liability",
          p: ["Waifu Baker is in beta and is provided as it is. We work to keep it available and your collection safe, but errors can happen. To the extent permitted by law, we are not liable for indirect losses."],
        },
      ] as LegalSection[],
    },
    privacy: {
      title: "Privacy policy",
      sections: [
        {
          h: "What we collect",
          p: [
            "From Patreon: your Patreon user ID, name and avatar, and your membership status (tiers, patron status and the date and status of your last charge). We never receive your email or payment details.",
            "From your use of the website: your packs, cards, openings, public album, cookies, daily rewards, the days you were active, and when you confirmed your age and accepted the terms.",
            "Your country is checked on each request only to apply the Belgium rule; it is not stored.",
          ],
        },
        {
          h: "Why we use it",
          p: ["To run the website: grant and open your packs, keep your collection, check age requirements, prevent abuse, fix errors and see aggregated usage statistics."],
        },
        {
          h: "Cookies",
          p: ["We only use essential cookies: your session, your language and your time zone (used for the daily reward). No advertising or tracking cookies, so there is no cookie banner."],
        },
        {
          h: "Error reports",
          p: ["When something breaks, technical details are sent to Sentry, our error monitoring service. They identify you only by an internal number, never by your name or Patreon ID."],
        },
        {
          h: "Who we share it with",
          p: ["Patreon (to sign you in and read your membership) and Sentry (error reports). We do not sell your data or share it for advertising."],
        },
        {
          h: "How long we keep it",
          p: [
            "While your account is active. If you delete it, everything is removed after 30 days, except anonymous records of pack openings.",
            "Backups are kept for up to 30 days.",
          ],
        },
        {
          h: "Your rights",
          p: ["You can see most of your data in My account and delete your account there. For a copy of your data, corrections or any question, contact us at {contact}."],
        },
        { h: "Minimum age", p: ["The website is for people aged {minAge} or older. If we learn that an account belongs to someone younger, we will delete it."] },
        { h: "Changes", p: ["We may update this policy. The version and date at the top tell you when it last changed."] },
      ] as LegalSection[],
    },
    content: {
      title: "Content & AI",
      sections: [
        {
          h: "AI-generated illustrations",
          p: ["All card illustrations are generated with artificial intelligence tools and then selected, styled and reviewed by Waifu Baker."],
        },
        {
          h: "Original, fictional, adult characters",
          p: ["Paid sets only use original characters. All characters are fictional adults. No real people are depicted, and no licensed characters appear in paid content."],
        },
        {
          h: "SFW and 18+ sets",
          p: [
            "SFW sets are suitable for everyone allowed on the website. 18+ sets are only shown to verified adults with an active adult tier, and they never appear in public albums.",
            "Before an 18+ card is published, an administrator reviews it to confirm the character is clearly an adult.",
          ],
        },
        { h: "Report a problem", p: ["If you think a card breaks these rules or your rights, contact us at {contact} and we will review it."] },
      ] as LegalSection[],
    },
  },
};
