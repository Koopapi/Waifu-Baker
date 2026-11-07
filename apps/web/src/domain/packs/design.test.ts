// Spec 030: validación del diseño del sobre, registro del componente y sobre básico.
import { describe, expect, it } from "vitest";
import { basicRegistro, checkPackDesign, designRefs, emptyDesign, isPackDesignKey, mapRefs, packDesignKey, toRegistro, withoutParticles, type PackDesign } from "./design";

const SET = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const key = (n: number) => packDesignKey(SET, String(n).repeat(64).slice(0, 64));
const INFO = { nombre: "Fan Art Vol. 1", codigo: "FA01", cartas: 5 };

const fa01 = (): PackDesign => ({
  ...emptyDesign("silver"),
  capas: [
    { key: key(1), nombre: "sobre_fa01_fondo.webp", profundidad: 0.25, margen: 3, brillo: { tipo: "ondas", intensidad: 0.8 } },
    { particulas: "destellos-arcoiris", cantidad: 18, tamano: 0.9, semilla: 41, profundidad: 0.6, margen: 4 },
    { key: key(2), nombre: "sobre_fa01_personaje.webp", profundidad: 1, margen: 2 },
    { key: key(3), nombre: "sobre_fa01_efecto.webp", profundidad: 1.3, margen: 3, mezcla: "overlay" },
  ],
  sellos: { arriba: "#FF3EA5", abajo: "#C6F432", patron: { incluido: "liquido" }, patronTamano: 40 },
  insignia: { texto: "Edición especial", color: "#C6F432" },
});

describe("spec 030 — diseño del sobre", () => {
  it("test_s030_rf12_un_diseno_valido_pasa_y_uno_invalido_dice_que_campo_falla", () => {
    expect(checkPackDesign(fa01(), SET)).toMatchObject({ ok: true });
    const blend = { ...fa01(), capas: [{ key: key(1), mezcla: "hue" }] };
    expect(checkPackDesign(blend, SET)).toEqual({ ok: false, issue: { code: "invalid_pack_design", path: "capas.0" } });
    const color = { ...fa01(), sellos: { arriba: "red;background:url(https://evil)", abajo: "#C6F432" } };
    expect(checkPackDesign(color, SET)).toEqual({ ok: false, issue: { code: "invalid_pack_design", path: "sellos.arriba" } });
    const badge = { ...fa01(), insignia: { texto: "x".repeat(23), color: "#ffffff" } };
    expect(checkPackDesign(badge, SET)).toMatchObject({ ok: false, issue: { path: "insignia.texto" } });
    expect(checkPackDesign({ ...fa01(), vista: "2d" }, SET)).toMatchObject({ ok: false, issue: { path: "vista" } });
    expect(checkPackDesign(null, SET)).toMatchObject({ ok: false });
  });

  it("test_s030_rnf_solo_acepta_imagenes_del_almacen_propio_de_la_coleccion", () => {
    const url = { ...fa01(), capas: [{ key: "https://evil.example/x.webp" }] };
    expect(checkPackDesign(url, SET)).toEqual({ ok: false, issue: { code: "invalid_pack_design", path: "capas.0.key" } });
    const other = { ...fa01(), logo: { key: packDesignKey(OTHER, "a".repeat(64)) } };
    expect(checkPackDesign(other, SET)).toEqual({ ok: false, issue: { code: "invalid_pack_design", path: "logo.key" } });
    const pattern = { ...fa01(), sellos: { arriba: "#000000", abajo: "#000000", patron: { key: "../../etc/passwd" } } };
    expect(checkPackDesign(pattern, SET)).toMatchObject({ ok: false, issue: { path: "sellos.patron.key" } });
    // Las marcas de subida solo valen en lo que manda el editor, antes de guardar sus imágenes.
    const upload = { ...fa01(), capas: [{ key: "upload:1" }] };
    expect(checkPackDesign(upload, SET).ok).toBe(false);
    expect(checkPackDesign(upload, SET, { allowUploads: true }).ok).toBe(true);
    expect(isPackDesignKey(SET, key(1))).toBe(true);
    expect(isPackDesignKey(SET, `sets/${SET}/pack-design/../x.webp`)).toBe(false);
  });

  it("test_s030_rf8_el_diseno_no_guarda_nombre_codigo_ni_cartas", () => {
    const parsed = checkPackDesign({ ...fa01(), nombre: "OTRO", codigo: "X", cartas: 15 }, SET);
    expect(parsed.ok && Object.keys(parsed.design)).not.toContain("nombre");
    // El registro los toma siempre de la colección.
    const r = toRegistro(fa01(), INFO, (k) => `/u/${k}`);
    expect([r.nombre, r.codigo, r.cartas]).toEqual(["Fan Art Vol. 1", "FA01", 5]);
  });

  it("test_s030_rf14_el_registro_lleva_enlaces_y_los_patrones_incluidos", () => {
    const r = toRegistro(fa01(), INFO, (k) => `/firmado?k=${k.slice(-9)}`);
    expect(r.capas[0]).toEqual({ profundidad: 0.25, margen: 3, src: `/firmado?k=${key(1).slice(-9)}`, brillo: { tipo: "ondas", intensidad: 0.8 } });
    expect(r.capas[1]).toMatchObject({ particulas: "destellos-arcoiris", semilla: 41 });
    expect(r.capas[0]).not.toHaveProperty("nombre");
    expect(r.sellos.patron).toBe("/sobres/patrones/liquido.webp");
    expect(r.insignia).toEqual({ texto: "Edición especial", color: "#C6F432" });
    expect(r.logo).toBe(true);
    // Ondas con arcos CSS (null) o con un patrón propio.
    const waves = mapRefs(fa01(), (k) => k);
    waves.capas[0] = { key: key(1), brillo: { tipo: "ondas", patron: null } };
    expect(toRegistro(waves, INFO, (k) => k).capas[0]).toMatchObject({ brillo: { tipo: "ondas", patron: null } });
    waves.capas[0] = { key: key(1), brillo: { tipo: "ondas", patron: { key: key(4) } } };
    expect(toRegistro(waves, INFO, (k) => `U${k.length}`).capas[0]).toMatchObject({ brillo: { patron: `U${key(4).length}` } });
  });

  it("test_s030_rf10_las_imagenes_del_diseno_se_cuentan_y_se_cambian_juntas", () => {
    const d = { ...fa01(), logo: { key: key(5) }, sellos: { arriba: "#000000", abajo: "#000000", patron: { key: key(6) } } };
    expect(designRefs(d)).toEqual([key(1), key(2), key(3), key(6), key(5)]);
    const mapped = mapRefs(d, (k) => `x${k.charAt(k.length - 6)}`);
    expect(designRefs(mapped)).toEqual(["x1", "x2", "x3", "x6", "x5"]);
  });

  it("test_s030_rf15_el_sobre_basico_lleva_la_portada_y_sellos_plata_o_dorados", () => {
    const silver = basicRegistro("silver", INFO, "/api/sets/x/art?k=cover&v=1");
    expect(silver.capas).toEqual([{ src: "/api/sets/x/art?k=cover&v=1", profundidad: 0.25, margen: 3 }]);
    expect(silver).toMatchObject({ vista: "3d", apertura: "rasgar", logo: true, nombre: "Fan Art Vol. 1", codigo: "FA01", cartas: 5 });
    const gold = basicRegistro("gold", INFO, null);
    expect(gold.capas).toEqual([]);
    expect(gold.sellos.arriba).not.toBe(silver.sellos.arriba);
    expect(gold.sellos.arriba).toBe("#F5C451");
  });

  it("test_s030_rnf_con_movimiento_reducido_el_sobre_va_sin_particulas", () => {
    const r = withoutParticles(toRegistro(fa01(), INFO, (k) => k));
    expect(r.capas.some((c) => "particulas" in c)).toBe(false);
    expect(r.capas).toHaveLength(3);
  });
});
