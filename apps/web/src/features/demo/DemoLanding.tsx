import { ArrowRight, FlaskConical, ShieldCheck, Sparkles } from "@/ui/icons/glyphs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, sets } from "@/db/schema";
import { enterDemoAction } from "@/app/demo/actions";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Alert } from "@/ui/feedback/Alert";
import { CardFan } from "@/ui/game/CardFan";
import { getDict } from "@/i18n/server";

/** Spec 010, RF-13: portada de la demo con los dos papeles. */
export async function DemoLanding() {
  const t = await getDict();
  const d = t.site.demo;
  const list = await db.select({ number: cards.number, rarity: cards.rarity }).from(cards).innerJoin(sets, eq(sets.id, cards.setId)).where(eq(sets.isWelcome, true));
  // Las cartas más raras al frente del abanico.
  const order = ["ex", "legendary", "epic", "rare", "common"];
  const picks = [...list].sort((a, b) => order.indexOf(a.rarity ?? "common") - order.indexOf(b.rarity ?? "common") || a.number - b.number).slice(0, 5);
  const fan = [picks[3], picks[1], picks[0], picks[2], picks[4]].filter(Boolean);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-ui-rail bg-[radial-gradient(90%_70%_at_50%_30%,rgb(214_51_108/0.22),transparent_70%)] px-4 py-12 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        {/* Spec 028: el abanico es un componente del sistema (CardFan), el mismo de la portada pública. */}
        <CardFan cards={fan.map((c) => ({ key: String(c!.number), src: `/api/demo/card/${c!.number}` }))} />
        <div className="space-y-3">
          <Badge tone="accent" className="uppercase tracking-wider">
            <FlaskConical className="size-3.5" aria-hidden />
            {d.tag}
          </Badge>
          <h1 className="font-display text-5xl font-bold sm:text-6xl">Waifu Baker</h1>
          <p className="mx-auto max-w-xl text-base text-ui-text-2 sm:text-lg">{t.site.home.tagline}</p>
        </div>
        {fan.length === 0 && <Alert tone="warning">{d.notSeeded}</Alert>}
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <form action={enterDemoAction.bind(null, "collector")}>
            <Button type="submit" size="block" width="full" data-testid="demo-enter-collector">
              <span className="grid size-11 shrink-0 place-items-center rounded-l bg-ui-text/15">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-[17px] font-bold">{d.enterCollector}</span>
                <span className="block text-[13px] font-normal opacity-90">{d.enterCollectorDetail}</span>
              </span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Button>
          </form>
          <form action={enterDemoAction.bind(null, "admin")}>
            <Button type="submit" size="block" variant="secondary" width="full" data-testid="demo-enter-admin">
              <span className="grid size-11 shrink-0 place-items-center rounded-l bg-ui-hover">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-[17px] font-bold">{d.enterAdmin}</span>
                <span className="block text-[13px] font-normal text-ui-text-2">{d.enterAdminDetail}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-ui-text-2" aria-hidden />
            </Button>
          </form>
        </div>
        <p className="text-xs text-ui-text-3">{d.note}</p>
      </div>
    </main>
  );
}
