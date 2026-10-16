import { describe, expect, it } from "vitest";
import { scrubEvent, sentryDsn } from "./sentry-scrub";

describe("spec 007 — avisos de errores", () => {
  it("test_s007_rf9_a_sentry_solo_llega_el_identificador_interno", () => {
    const ev = scrubEvent({
      message: "boom",
      user: { id: "9d1c", username: "Nombre Real", ip_address: "1.2.3.4", email: "x@y.z" },
      request: { url: "http://localhost/sobres", cookies: "authjs.session=abc", headers: { cookie: "x" }, data: "{}", query_string: "a=1" },
    });
    expect(ev.user).toEqual({ id: "9d1c" });
    expect(ev.request).toEqual({ url: "http://localhost/sobres" });
    expect(JSON.stringify(ev)).not.toMatch(/Nombre Real|1\.2\.3\.4|session=abc|x@y\.z/);
    expect(scrubEvent({ user: { username: "sin id" } }).user).toBeUndefined();
  });

  it("test_s007_rf10_sin_dsn_no_se_inicia_sentry", () => {
    expect(sentryDsn({}, "server")).toBeNull();
    expect(sentryDsn({ SENTRY_DSN: "  " }, "server")).toBeNull();
    expect(sentryDsn({ SENTRY_DSN: "https://k@o.ingest.sentry.io/1" }, "server")).toBe("https://k@o.ingest.sentry.io/1");
    expect(sentryDsn({ SENTRY_DSN: "https://k@o.ingest.sentry.io/1" }, "client")).toBeNull();
    expect(sentryDsn({ NEXT_PUBLIC_SENTRY_DSN: "https://p@o.ingest.sentry.io/2" }, "client")).toBe("https://p@o.ingest.sentry.io/2");
  });
});
