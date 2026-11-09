// Spec 035: los commits entre dos versiones, desde la API pública de GitHub (el repositorio es público: sin token).
import type { Commit } from "@/domain/ops/deploy-notice";

const REPO = "Koopapi/Waifu-Baker";

export type CompareCommits = (base: string, head: string) => Promise<Commit[]>;

export const githubCompare: CompareCommits = async (base, head) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=250`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "waifu-baker-deploy-notice" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub compare: ${res.status}`);
  const body = (await res.json()) as { commits?: { sha: string; parents: { sha: string }[]; commit: { message: string } }[] };
  return (body.commits ?? []).map((c) => ({ sha: c.sha, parents: c.parents.map((p) => p.sha), message: c.commit.message }));
};
