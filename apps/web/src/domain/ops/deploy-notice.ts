// Spec 035: el aviso en Telegram al terminar un despliegue. Reglas puras: qué cambios entraron y cómo se dice.

export type Commit = { sha: string; parents: string[]; message: string };
export type Change = { number: number | null; title: string };

const MERGE_RE = /^Merge pull request #(\d+) from ([^\s]+)/;
const SQUASH_RE = /^(.*\S)\s+\(#(\d+)\)$/;
/** RF-7. */
export const MAX_LINES = 15;
/** RNF de brevedad: renglones de menos de 90 caracteres. */
export const MAX_LINE = 89;

/**
 * RF-4: los cambios que entraron entre dos versiones, del más reciente al más antiguo. Se sigue la línea principal
 * (primer padre) desde `head`: cada merge de un PR es un cambio con su título; un commit con «(#N)» (squash), su título;
 * un commit directo, su primera línea. El paso de `pruebas` a `main` no es un cambio: cuentan los PR que trae.
 */
export function changesFromCommits(commits: readonly Commit[], head: string): Change[] {
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  const out: Change[] = [];
  const walk = (start: string | undefined) => {
    for (let c = start ? bySha.get(start) : undefined; c; c = bySha.get(c.parents[0])) {
      const [first, ...rest] = c.message.split("\n");
      const merge = first.match(MERGE_RE);
      if (merge) {
        if (/\/pruebas$/.test(merge[2])) {
          walk(c.parents[1]);
          continue;
        }
        const title = rest.map((l) => l.trim()).find(Boolean) ?? first;
        out.push({ number: Number(merge[1]), title });
        continue;
      }
      const squash = first.match(SQUASH_RE);
      out.push(squash ? { number: Number(squash[2]), title: squash[1] } : { number: null, title: first.trim() });
    }
  };
  walk(head);
  return out;
}

/** RF-3: «Pruebas» o «Producción», por la dirección del entorno. */
export function envLabel(siteUrl: string): "Pruebas" | "Producción" {
  try {
    return new URL(siteUrl).hostname.startsWith("pruebas.") ? "Pruebas" : "Producción";
  } catch {
    return "Producción";
  }
}

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** RF-3: fecha y hora de Ciudad de México, p. ej. «9 nov 2026, 14:32». */
export function mexicoTime(at: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day} ${String(p.month).replace(".", "")} ${p.year}, ${p.hour}:${p.minute}`;
}

/** RF-3 a RF-7 y RF-11: el texto del aviso. */
export function deployMessage(input: { siteUrl: string; at: Date; changes: readonly Change[]; first?: boolean; listFailed?: boolean }): string {
  const env = envLabel(input.siteUrl);
  const head = `✅ ${env} actualizada · ${mexicoTime(input.at)}`;
  const host = input.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  let body: string[];
  if (input.first) body = ["Primer aviso de este entorno."];
  else if (input.listFailed) body = ["No se pudo leer la lista de cambios."];
  else {
    body = input.changes.slice(0, MAX_LINES).map((c) => {
      const tail = c.number ? ` (#${c.number})` : "";
      return `• ${cut(c.title, MAX_LINE - 2 - tail.length)}${tail}`;
    });
    if (input.changes.length > MAX_LINES) body.push(`… y ${input.changes.length - MAX_LINES} más`);
  }
  return [head, "", ...body, "", host].join("\n");
}
