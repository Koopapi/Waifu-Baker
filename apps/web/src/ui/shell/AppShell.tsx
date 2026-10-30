"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "@/ui/icons/glyphs";
import { useT } from "@/i18n/client";
import { Avatar } from "../content/Avatar";
import { Badge } from "../content/Badge";
import { Icon, type IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  /** Activo solo con la ruta exacta (p. ej. el resumen del panel). */
  exact?: boolean;
  external?: boolean;
  /** Spec 015, RF-2: nombre de destino de los premios que vuelan (`data-fly-target`); al recibir uno, rebota. */
  flyTarget?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}
export interface RailItem {
  href: string;
  label: string;
  initials: string;
  image?: string | null;
  badge?: number;
}
export interface ShellProps {
  kind: "collector" | "admin";
  header: { title: string; subtitle: string };
  rail: RailItem[];
  railExtra?: { href: string; label: string; icon: IconName };
  emptyRail?: string;
  groups: NavGroup[];
  tabs?: NavItem[];
  user: { name: string; detail: React.ReactNode };
  /** Idioma y salir: los da el servidor (la salida es una server action). */
  userActions: React.ReactNode;
  /** A la derecha de la barra superior (el selector de idioma). */
  topActions?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}

const isActive = (path: string, item: { href: string; exact?: boolean }) =>
  item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);

/** Spec 010, RF-1 a RF-5 y RF-16; spec 011, RF-9 (componente del sistema): barra de colecciones, panel de navegación, contenido, cajón y pestañas. */
export function AppShell(p: ShellProps) {
  const path = usePathname();
  const t = useT().common.shell;
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const all = p.groups.flatMap((g) => g.items);
  // La sección actual es la de ruta más larga que coincide (así /collection/album gana a /collection).
  const current = all.filter((i) => !i.external && isActive(path, i)).sort((a, b) => b.href.length - a.href.length)[0];

  const close = useCallback(() => {
    setOpen(false);
    menuButton.current?.focus();
  }, []);

  // Al navegar se cierra el cajón.
  useEffect(() => setOpen(false), [path]);

  // RF-4 y RF-11: Escape cierra; el foco entra en el cajón y no se escapa de él mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const el = drawer.current;
    el?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !el) return;
      const f = [...el.querySelectorAll<HTMLElement>("a,button,input,select")].filter((x) => !x.hasAttribute("disabled"));
      if (f.length === 0) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // RF-4: deslizar desde el borde izquierdo abre el cajón; hacia la izquierda, lo cierra.
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    let start: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if (!mobile.matches) return;
      start = !open && e.clientX <= 24 ? { x: e.clientX, y: e.clientY } : open ? { x: e.clientX, y: e.clientY } : null;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (Math.abs(e.clientY - start.y) > Math.abs(dx)) return;
      if (!open && dx > 60) {
        setOpen(true);
        start = null;
      } else if (open && dx < -60) {
        setOpen(false);
        start = null;
      }
    };
    const up = () => (start = null);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [open]);

  return (
    <div
      className="app-shell min-h-dvh bg-ui-bg text-ui-text"
      data-shell={p.kind}
      style={{ "--banner-h": p.banner ? "34px" : "0px" } as React.CSSProperties}
    >
      {p.banner && <div className="sticky top-0 z-30 h-[34px]">{p.banner}</div>}
      <div className="flex">
        {/* Velo del cajón en móvil. */}
        <div
          aria-hidden
          onClick={close}
          className={`fixed inset-0 z-30 bg-black/55 transition-opacity duration-200 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <div
          ref={drawer}
          id="app-drawer"
          data-testid="app-drawer"
          data-open={open}
          className={`ui-ink fixed inset-y-0 left-0 z-40 flex w-[312px] max-w-[88vw] transition-transform duration-200 ease-out md:sticky md:top-[var(--banner-h)] md:h-[calc(100dvh-var(--banner-h))] md:max-w-none md:translate-x-0 ${
            open ? "translate-x-0 shadow-3" : "-translate-x-full"
          }`}
          {...(open ? { role: "dialog", "aria-modal": true, "aria-label": t.menu } : {})}
        >
          <Rail {...p} path={path} />
          <nav aria-label={p.header.title} className="flex min-w-0 flex-1 flex-col bg-ui-nav">
            <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-ui-rail px-4 shadow-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{p.header.title}</p>
                <p className="truncate text-[11px] text-ui-text-3">{p.header.subtitle}</p>
              </div>
              <button type="button" onClick={close} aria-label={t.closeMenu} className="rounded p-1 text-ui-text-2 hover:bg-ui-hover md:hidden">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3" data-testid="app-nav">
              {p.groups.map((g) => (
                <div key={g.label} className="space-y-0.5">
                  <p className="ui-nav-group px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-ui-text-3">{g.label}</p>
                  {g.items.map((i) => (
                    <NavLink key={i.href} item={i} active={i === current} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2.5 bg-ui-rail/80 px-3 py-2.5">
              <Avatar name={p.user.name} online />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{p.user.name}</p>
                <p className="truncate text-[11px] text-ui-text-2" data-testid="shell-user-detail">
                  {p.user.detail}
                </p>
              </div>
              {p.userActions}
            </div>
          </nav>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="ui-topbar sticky top-[var(--banner-h)] z-20 flex h-[52px] shrink-0 items-center gap-3 border-b border-ui-rail bg-ui-bg/95 px-4 backdrop-blur md:px-6">
            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t.menu}
              aria-expanded={open}
              aria-controls="app-drawer"
              className="-ml-1 rounded p-1 text-ui-text hover:bg-ui-hover md:hidden"
              data-testid="menu-button"
            >
              <Menu className="size-6" aria-hidden />
            </button>
            {current && <Icon name={current.icon} className="hidden size-5 text-ui-text-3 md:block" />}
            <p className="ui-topbar-title truncate text-base font-bold" data-testid="section-title">
              {current?.label ?? p.header.title}
            </p>
            <div className="ml-auto flex items-center gap-2">{p.topActions}</div>
          </header>
          <div className={`flex-1 ${p.tabs ? "pb-20 md:pb-0" : ""}`}>{p.children}</div>
        </div>
      </div>

      {p.tabs && (
        <nav aria-label={t.tabs.packs} className="ui-ink ui-tabbar fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-ui-rail bg-ui-rail pb-[env(safe-area-inset-bottom)] md:hidden" data-testid="tab-bar">
          {p.tabs.map((i) => {
            const active = isActive(path, i) && current?.href.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active ? "page" : undefined}
                data-fly-target={i.flyTarget}
                className={`ui-tab-link relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-bold text-ui-text" : "text-ui-text-3 hover:text-ui-text-2"}`}
              >
                <Icon name={i.icon} className={`size-[22px] ${active ? "text-ui-accent-text" : ""}`} />
                {i.label}
                {!!i.badge && <Badge count={i.badge} className="absolute right-[calc(50%-22px)] top-1.5" />}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function Rail(p: ShellProps & { path: string }) {
  const t = useT().common.shell;
  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-ui-rail py-3" aria-label={t.collections} role="navigation" data-testid="collection-rail">
      <RailLink href={p.kind === "admin" ? "/admin" : "/packs"} label={t.home} active={p.path === (p.kind === "admin" ? "/admin" : "/packs")}>
        <span className="font-display text-base font-bold">WB</span>
      </RailLink>
      <span aria-hidden className="h-0.5 w-8 rounded-full bg-ui-line" />
      {p.rail.length === 0 && p.emptyRail && <p className="sr-only">{p.emptyRail}</p>}
      {p.rail.map((r) => (
        <RailLink key={r.href} href={r.href} label={r.label} active={p.path === r.href || p.path.startsWith(`${r.href}/`)} badge={r.badge} image={r.image}>
          <span className="font-display text-[15px] font-bold">{r.initials}</span>
        </RailLink>
      ))}
      {p.railExtra && (
        <RailLink href={p.railExtra.href} label={p.railExtra.label} active={false} tone="success">
          <Icon name={p.railExtra.icon} className="size-5" />
        </RailLink>
      )}
    </div>
  );
}

/** Icono de la barra: círculo que se redondea en cuadrado al pasar el ratón o al estar activo, con indicador a la izquierda. */
function RailLink(p: { href: string; label: string; active: boolean; badge?: number; image?: string | null; tone?: "success"; children: React.ReactNode }) {
  return (
    <div className="group relative flex w-full justify-center">
      <span
        aria-hidden
        className={`absolute left-0 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-ui-text transition-[height,opacity] duration-150 ${
          p.active ? "h-10 opacity-100" : "h-2 opacity-0 group-hover:h-5 group-hover:opacity-100"
        }`}
      />
      <Link
        href={p.href}
        title={p.label}
        aria-label={p.label}
        aria-current={p.active ? "page" : undefined}
        className={`ui-rail-link relative grid size-12 place-items-center overflow-hidden transition-[border-radius,background-color,color] duration-150 ${
          p.active ? "rounded-2xl" : "rounded-3xl hover:rounded-2xl"
        } ${
          p.image
            ? ""
            : p.tone === "success"
              ? "bg-ui-raised text-ui-success-text hover:bg-ui-success hover:text-ui-on-accent"
              : p.active
                ? "bg-ui-accent text-ui-on-accent"
                : "bg-ui-raised text-ui-text hover:bg-ui-accent hover:text-ui-on-accent"
        }`}
      >
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- enlace firmado y de vida corta: no pasa por el optimizador
          <img src={p.image} alt="" className="size-full object-cover object-top" />
        ) : (
          p.children
        )}
      </Link>
      {!!p.badge && <Badge count={p.badge} className="absolute bottom-0 right-2.5 border-[3px] border-ui-rail" />}
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      aria-current={active ? "page" : undefined}
      data-fly-target={item.flyTarget}
      className={`ui-nav-link flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${
        active ? "bg-ui-hover font-semibold text-ui-text" : "font-medium text-ui-text-2 hover:bg-ui-raised hover:text-ui-text"
      }`}
    >
      <Icon name={item.icon} className={`size-[18px] shrink-0 ${active ? "text-ui-text" : "text-ui-text-3"}`} />
      <span className="flex-1 truncate">{item.label}</span>
      {!!item.badge && <Badge count={item.badge} />}
    </Link>
  );
}
