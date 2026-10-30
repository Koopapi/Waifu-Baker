import { describe, expect, it } from "vitest";
import { r2ConfigFromEnv, signPut } from "./r2";

const cfg = { endpoint: "https://abc123.r2.cloudflarestorage.com", bucket: "waifubaker-backups", accessKeyId: "AKID", secretAccessKey: "SECRET" };

describe("spec 024 — copias en R2", () => {
  it("test_s024_rf23_firma_el_put_para_el_bucket_y_la_clave", () => {
    const { url, headers } = signPut(cfg, "copias/wb-2026.enc", new Date("2026-10-29T09:00:00Z"));
    expect(url.toString()).toBe("https://abc123.r2.cloudflarestorage.com/waifubaker-backups/copias/wb-2026.enc");
    expect(headers["x-amz-date"]).toBe("20261029T090000Z");
    expect(headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\/20261029\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
    expect(JSON.stringify(headers)).not.toContain("SECRET");
  });

  it("test_s024_rf23_sin_las_cuatro_variables_no_hay_copia_fuera", () => {
    expect(r2ConfigFromEnv({ R2_ENDPOINT: "x", R2_BUCKET: "b", R2_ACCESS_KEY_ID: "k" })).toBeNull();
    expect(r2ConfigFromEnv({ R2_ENDPOINT: "x", R2_BUCKET: "b", R2_ACCESS_KEY_ID: "k", R2_SECRET_ACCESS_KEY: "s" })).not.toBeNull();
  });
});
