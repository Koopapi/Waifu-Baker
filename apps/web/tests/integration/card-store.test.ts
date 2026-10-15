import { describe, expect, it } from "vitest";
import { tempStore } from "./store";

describe("RF-11 almacenamiento local de imágenes", () => {
  it("guarda, lee y borra por clave con su tipo", async () => {
    const store = tempStore();
    await store.put("sets/a/original/x.png", Buffer.from("hola"));
    const got = await store.get("sets/a/original/x.png");
    expect(got?.body.toString()).toBe("hola");
    expect(got?.contentType).toBe("image/png");
    await store.delete("sets/a/original/x.png");
    expect(await store.get("sets/a/original/x.png")).toBeNull();
  });

  it("rechaza claves que intentan salir de la carpeta", async () => {
    const store = tempStore();
    await expect(store.put("../fuera.png", Buffer.from("x"))).rejects.toThrow();
    expect(await store.get("../../etc/passwd")).toBeNull();
  });
});
