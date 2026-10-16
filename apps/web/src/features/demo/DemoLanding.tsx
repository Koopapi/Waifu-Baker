import { ArrowRight, FlaskConical, ShieldCheck, Sparkles } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, sets } from "@/db/schema";
import { enterDemoAction } from "@/app/demo/actions";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";

// Abanico de la portada: cartas de la colección de bienvenida, con su giro y desplazamiento.
const FAN = [
  { rot: -14, x: -190, y: 34 },
  { rot: -7, x: -95, y: 10 },
  { rot: 0, x: 0, y: 0 },
  { rot: 7, x: 95, y: 10 },
  { rot: 14, x: 190, y: 34 },
];

/** Spec 010, RF-13: portada de la demo con los dos papeles. */
export async function DemoLanding() {
  const t = await getDict();
  const d = t.site.demo;
  const list = await db.select({ number: cards.number, rarity: cards.rarity }).from(cards).innerJoin(sets, eq(sets.id, cards.setId)).where(eq(sets.isWelcome, true));
  // Las cartas más raras al frente del abanico.
  const order = ["secret", "legendary", "epic", "rare", "uncommon", "common"];
  const picks = [...list].sort((a, b) => order.indexOf(a.rarity ?? "common") - order.indexOf(b.rarity ?? "common") || a.number - b.number).slice(0, 5);
  const fan = [picks[3], picks[1], picks[0], picks[2], picks[4]].filter(Boolean);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-ui-rail bg-[radial-gradient(90%_70%_at_50%_30%,rgb(214_51_108/0.22),transparent_70%)] px-4 py-12 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        {fan.length > 0 && (
          <div aria-hidden className="relative h-[250px] w-full max-w-[560px] scale-[0.62] sm:scale-100">
            {fan.map((c, i) => (
              // La posición va en el contenedor: la animación de entrada solo mueve la carta de dentro.
              <span
                key={c!.number}
                className="absolute left-1/2 top-0 h-[210px] w-[150px]"
                style={{ transform: `translateX(calc(-50% + ${FAN[i].x}px)) translateY(${FAN[i].y}px) rotate(${FAN[i].rot}deg)`, zIndex: i === 2 ? 3 : i === 1 || i === 3 ? 2 : 1 }}
              >
                <span className="card-in block size-full overflow-hidden rounded-xl border-2 border-white/20 shadow-[0_14px_34px_rgb(0_0_0/0.55)]" style={{ "--i": i } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por la ruta de la demo */}
                  <img src={`/api/demo/card/${c!.number}`} alt="" className="size-full object-cover object-top" />
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ui-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ui-accent-text">
            <FlaskConical className="size-3.5" aria-hidden />
            {d.tag}
          </span>
          <h1 className="font-display text-5xl font-bold sm:text-6xl">Waifu Baker</h1>
          <p className="mx-auto max-w-xl text-base text-ui-text-2 sm:text-lg">{t.site.home.tagline}</p>
        </div>
        {fan.length === 0 && <p className="text-sm text-amber-200">{d.notSeeded}</p>}
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <form action={enterDemoAction.bind(null, "collector")}>
            <button className="btn w-full justify-start gap-4 bg-ui-accent p-5 text-left text-ui-on-accent hover:bg-ui-accent-hover" data-testid="demo-enter-collector">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-[17px] font-bold">{d.enterCollector}</span>
                <span className="block text-[13px] font-normal opacity-90">{d.enterCollectorDetail}</span>
              </span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </button>
          </form>
          <form action={enterDemoAction.bind(null, "admin")}>
            <button className="btn w-full justify-start gap-4 border border-ui-line bg-ui-raised p-5 text-left text-ui-text hover:bg-ui-hover" data-testid="demo-enter-admin">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ui-hover">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-[17px] font-bold">{d.enterAdmin}</span>
                <span className="block text-[13px] font-normal text-ui-text-2">{d.enterAdminDetail}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-ui-text-2" aria-hidden />
            </button>
          </form>
        </div>
        <p className="text-xs text-ui-text-3">{d.note}</p>
      </div>
    </main>
  );
}
