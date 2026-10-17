"use client";

import { useState } from "react";
import { SOUNDS } from "@/domain/opening/feedback";
import { sound, useSoundMuted } from "@/features/opening/sound";
import { Bell, Gift, Package, Settings, Sparkles, Trash2 } from "@/ui/icons/glyphs";
import {
  Alert,
  AnimatedCounter,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Countdown,
  EmptyState,
  FocusView,
  IconButton,
  Menu,
  Modal,
  Progress,
  RadioGroup,
  Select,
  Skeleton,
  SoundToggle,
  Switch,
  Table,
  Tabs,
  TextArea,
  TextField,
  Tooltip,
  useConfirm,
  useOptimisticAction,
  useToast,
} from "@/ui";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SETS = Array.from({ length: 12 }, (_, i) => ({ value: `s${i + 1}`, label: `Set ${String(i + 1).padStart(2, "0")}`, description: i === 0 ? "Fan Art · Vol. 1" : undefined }));

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-6" data-testid={`catalog-${id}`}>
      <h2 className="text-xs font-bold uppercase tracking-widest text-ui-accent-text">{title}</h2>
      {children}
    </section>
  );
}

/** Spec 011, RF-15: todos los componentes con sus variantes y estados. */
export function Catalog() {
  const toast = useToast();
  const confirm = useConfirm();
  const [modal, setModal] = useState(false);
  const [focus, setFocus] = useState(false);
  const [confirmed, setConfirmed] = useState("—");
  const [count, setCount] = useState(240);
  const [set, setSet] = useState("s1");
  const [until] = useState(() => new Date(Date.now() + 4 * 3600_000 + 12 * 60_000).toISOString());
  const [favs, setFavs] = useState(0);
  const [liked, like] = useOptimisticAction<number, number>({ value: favs, apply: (v, d) => v + d, run: async (d) => (await wait(400), setFavs((f) => f + d), { ok: true }), undo: async (d) => (setFavs((f) => f - d), { ok: true }), successTitle: "Added to favourites" });
  const [, fail] = useOptimisticAction<number, number>({ value: 0, apply: (v, d) => v + d, run: async () => (await wait(400), { ok: false, error: "The server said no" }), successTitle: "Saved" });

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 text-ui-text md:px-8" data-testid="catalog">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Design system</h1>
        <p className="text-ui-text-2">Spec 011 · every component, variant and state. Development only.</p>
      </header>

      <Section id="action" title="Action">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<Sparkles className="size-4" aria-hidden />}>Open a pack</Button>
          <Button variant="secondary">See odds</Button>
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />}>
            Delete
          </Button>
          <Button variant="success">Claim</Button>
          <Button variant="ghost">Cancel</Button>
          <Button loading>Opening</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <IconButton label="Settings">
            <Settings className="size-[18px]" aria-hidden />
          </IconButton>
        </div>
      </Section>

      <Section id="form" title="Form">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Alias" placeholder="Your public name" hint="2 to 30 characters" />
          <TextField label="Alias (error)" defaultValue="!!!" error="Use letters or numbers" />
          <TextArea label="Reason" placeholder="Why?" />
          <Select label="Set" options={SETS} value={set} onValueChange={setSet} searchable searchPlaceholder="Search sets" emptyText="No sets" data-testid="catalog-select" />
          <Checkbox label="I accept the terms" />
          <Switch label="Public album" description="Anyone with the link can see it" />
          <RadioGroup label="Minimum age" appearance="cards" defaultValue="16" options={[{ value: "16", label: "16+" }, { value: "18", label: "18+" }]} />
          <RadioGroup label="Sort by" defaultValue="number" options={[{ value: "number", label: "Number" }, { value: "rarity", label: "Rarity" }]} />
        </div>
        <p className="text-sm text-ui-text-2" data-testid="catalog-select-value">
          Selected: {set}
        </p>
      </Section>

      <Section id="feedback" title="Feedback">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast({ kind: "success", title: "Pack claimed" })} data-testid="toast-success">
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast({ kind: "error", title: "That didn’t work", action: { label: "Try again", onAction: () => {} } })}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => toast({ kind: "info", title: "Card archived", action: { label: "Undo", onAction: () => toast({ kind: "success", title: "Restored" }) } })} data-testid="toast-undo">
            Toast with undo
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info" title="Heads up">Drop rates are public.</Alert>
          <Alert tone="success" title="Published">The set is live.</Alert>
          <Alert tone="warning" title="Almost there">2 cards still need a rarity.</Alert>
          <Alert tone="danger" title="Couldn’t publish">Slot 3 does not add up to 100 %.</Alert>
        </div>
        <EmptyState title="No packs yet" icon={<Package className="size-8" aria-hidden />} action={<Button variant="secondary">See what you can get</Button>}>
          Packs you receive will show up here.
        </EmptyState>
        <div className="flex gap-3" aria-hidden>
          <Skeleton className="h-28 w-20 rounded-l" />
          <Skeleton className="h-28 w-20 rounded-l" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </Section>

      <Section id="overlay" title="Overlays">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setModal(true)} data-testid="open-modal">
            Open modal
          </Button>
          <Button
            variant="danger"
            data-testid="open-confirm"
            onClick={async () => setConfirmed((await confirm({ title: "Delete your account?", body: "Your cards are deleted for good after 30 days.", confirmLabel: "Delete account", tone: "danger" })) ? "yes" : "no")}
          >
            Delete account…
          </Button>
          <span className="text-sm text-ui-text-2" data-testid="confirm-result">
            Answer: {confirmed}
          </span>
          <Menu
            trigger={
              <IconButton label="More actions" variant="secondary" data-testid="open-menu">
                <Settings className="size-[18px]" aria-hidden />
              </IconButton>
            }
            items={[{ label: "Rename", onSelect: () => toast({ kind: "info", title: "Rename" }) }, { label: "Duplicate", onSelect: () => {} }, "separator", { label: "Delete", tone: "danger", onSelect: () => {} }]}
          />
          <Tooltip content="You have 3 notifications">
            <IconButton label="Notifications">
              <Bell className="size-[18px]" aria-hidden />
            </IconButton>
          </Tooltip>
        </div>
        <Modal open={modal} onOpenChange={setModal} title="Edit card" description="Changes are saved when you press Save." footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => setModal(false)}>Save</Button></>}>
          <TextField label="Name" defaultValue="Silk Robe" />
        </Modal>
      </Section>

      <Section id="content" title="Content">
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Free pack" aside="1 of 2">
            <p className="text-sm text-ui-text-2">Next one in 7 h.</p>
          </Card>
          <Card title="Interactive card" interactive>
            <p className="text-sm text-ui-text-2">Lifts on hover.</p>
          </Card>
          <Card title="People">
            <div className="flex items-center gap-2">
              <Avatar name="Demo Collector" online />
              <Avatar name="Rosa Noir" size="sm" />
              <Avatar name="Kira Steel" size="lg" />
            </div>
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["neutral", "accent", "success", "warning", "danger", "info"] as const).map((t) => (
            <Badge key={t} tone={t}>
              {t}
            </Badge>
          ))}
          <Badge count={3} />
          <Badge count={120} />
        </div>
        <Progress label="Collection" value={12} max={26} showValue />
        <Tabs label="Filter" defaultValue="all" items={[{ value: "all", label: "All", content: <p className="text-sm text-ui-text-2">All cards</p> }, { value: "owned", label: "Owned", content: <p className="text-sm text-ui-text-2">Owned cards</p> }, { value: "missing", label: "Missing", content: <p className="text-sm text-ui-text-2">Missing cards</p> }]} />
        <Table caption="Users" columns={[{ key: "name", header: "User" }, { key: "tier", header: "Patreon" }, { key: "cookies", header: "Cookies", align: "end" }]} rows={[{ id: "1", name: "Demo Collector", tier: "Adult tier", cookies: 240 }, { id: "2", name: "sakura_fan", tier: "Free", cookies: 90 }]} />
      </Section>

      <Section id="game" title="Game pieces">
        <div className="flex flex-wrap items-center gap-6">
          <Card title="Countdown">
            <Countdown until={until} className="font-display text-3xl font-bold" />
          </Card>
          <Card title="Animated counter">
            <div className="flex items-center gap-3">
              <AnimatedCounter value={count} className="font-display text-3xl font-bold" />
              <Button size="sm" variant="secondary" onClick={() => setCount((c) => c + 40)} icon={<Gift className="size-4" aria-hidden />} data-testid="counter-add">
                +40
              </Button>
            </div>
          </Card>
          <Card title="Sound toggle">
            <SoundPreview />
          </Card>
          <Button variant="secondary" onClick={() => setFocus(true)} data-testid="open-focus">
            Open focus view
          </Button>
        </div>
        {focus && (
          <FocusView label="Focus view" onClose={() => setFocus(false)}>
            <div className="grid size-full place-items-center">
              <Button onClick={() => setFocus(false)}>Close focus view</Button>
            </div>
          </FocusView>
        )}
      </Section>

      <Section id="optimistic" title="Optimistic actions">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => like(1)} data-testid="optimistic-ok">
            Add to favourites ({liked})
          </Button>
          <Button variant="secondary" onClick={() => fail(1)} data-testid="optimistic-fail">
            Action that fails
          </Button>
        </div>
      </Section>
    </main>
  );
}

/** Spec 013: botón de silencio con el motor real y los sonidos de la apertura, para escucharlos. */
function SoundPreview() {
  const muted = useSoundMuted();
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="sound-preview">
      <SoundToggle muted={muted} onToggle={(m) => sound.setMuted(m)} />
      {SOUNDS.map((name) => (
        <Button
          key={name}
          size="sm"
          variant="ghost"
          onClick={async () => {
            await sound.preload();
            sound.unlock();
            sound.play(name);
          }}
        >
          {name}
        </Button>
      ))}
    </div>
  );
}
