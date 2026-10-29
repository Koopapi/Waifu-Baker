// Spec 024, RF-23: sube una copia cifrada a Cloudflare R2 (API compatible con S3, firma SigV4, cuerpo en streaming).
// La retención de 30 días la hace una regla de ciclo de vida del bucket en Cloudflare.
import { createHash, createHmac } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { request } from "node:https";

export interface R2Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function r2ConfigFromEnv(env: Record<string, string | undefined> = process.env): R2Config | null {
  const endpoint = env.R2_ENDPOINT?.trim();
  const bucket = env.R2_BUCKET?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  return endpoint && bucket && accessKeyId && secretAccessKey ? { endpoint, bucket, accessKeyId, secretAccessKey } : null;
}

const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();
const hex = (data: string) => createHash("sha256").update(data).digest("hex");

/** Cabeceras firmadas (SigV4, región `auto`, cuerpo sin firmar) para un PUT. Pura salvo el reloj. */
export function signPut(cfg: R2Config, key: string, now: Date) {
  const url = new URL(`${cfg.endpoint.replace(/\/$/, "")}/${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`);
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const headers = { host: url.host, "x-amz-content-sha256": "UNSIGNED-PAYLOAD", "x-amz-date": amzDate };
  const signed = "host;x-amz-content-sha256;x-amz-date";
  const canonical = ["PUT", url.pathname, "", `host:${url.host}`, "x-amz-content-sha256:UNSIGNED-PAYLOAD", `x-amz-date:${amzDate}`, "", signed, "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(canonical)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${cfg.secretAccessKey}`, day), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");
  return {
    url,
    headers: { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}` },
  };
}

export async function uploadToR2(cfg: R2Config, file: string, key: string, now = new Date()) {
  const { size } = await stat(file);
  const { url, headers } = signPut(cfg, key, now);
  await new Promise<void>((resolve, reject) => {
    const req = request(url, { method: "PUT", headers: { ...headers, "content-length": String(size) } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => (res.statusCode && res.statusCode < 300 ? resolve() : reject(new Error(`R2 respondió ${res.statusCode}: ${body.slice(0, 200)}`))));
    });
    req.on("error", reject);
    req.setTimeout(30 * 60 * 1000, () => req.destroy(new Error("R2: tiempo agotado")));
    createReadStream(file).on("error", reject).pipe(req);
  });
}
