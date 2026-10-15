import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, MIN_UPLOAD_WIDTH, validateUpload } from "./upload-rules";

const ok = { mime: "image/webp", bytes: 1_500_000, width: 832 };

describe("RF-12 reglas de subida", () => {
  it("test_rf12_acepta PNG, JPEG y WebP válidos", () => {
    for (const mime of ["image/png", "image/jpeg", "image/webp"]) {
      expect(validateUpload({ ...ok, mime })).toEqual({ ok: true });
    }
  });

  it("test_rf12_rechaza otros tipos con su motivo", () => {
    const r = validateUpload({ ...ok, mime: "image/gif" });
    expect(r).toMatchObject({ ok: false, code: "unsupported_type" });
  });

  it("test_rf12_rechaza más de 20 MB y acepta justo 20 MB", () => {
    expect(validateUpload({ ...ok, bytes: MAX_UPLOAD_BYTES })).toEqual({ ok: true });
    expect(validateUpload({ ...ok, bytes: MAX_UPLOAD_BYTES + 1 })).toMatchObject({ ok: false, code: "too_large" });
  });

  it("test_rf12_rechaza menos de 600 px de ancho y acepta justo 600", () => {
    expect(validateUpload({ ...ok, width: MIN_UPLOAD_WIDTH })).toEqual({ ok: true });
    expect(validateUpload({ ...ok, width: MIN_UPLOAD_WIDTH - 1 })).toMatchObject({ ok: false, code: "too_narrow" });
  });

  it("test_rf12_rechaza un archivo que no se pudo decodificar", () => {
    expect(validateUpload({ ...ok, width: null })).toMatchObject({ ok: false, code: "unreadable" });
  });

  it("test_rf12_los mensajes están en español y explican la causa", () => {
    const r = validateUpload({ ...ok, mime: "application/pdf" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/PNG, JPEG o WebP/);
  });
});
