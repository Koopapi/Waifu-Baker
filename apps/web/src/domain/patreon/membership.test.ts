import { describe, expect, it } from "vitest";
import { cycleKey, entitledPacks, grantKeys, hasAdultTier, isPatron, isVoidableCharge, type MemberState, type RuleForGrant } from "./membership";

const base: MemberState = {
  memberId: "m1",
  patreonUserId: "u1",
  patronStatus: "active_patron",
  lastChargeDate: new Date("2026-10-01T10:00:00Z"),
  lastChargeStatus: "Paid",
  nextChargeDate: new Date("2026-11-01T10:00:00Z"),
  entitledTierIds: ["sfw"],
};
const rules: RuleForGrant[] = [
  { patreonTierId: "sfw", setId: "WB01", packsPerMonth: 3, active: true, setIsAdult: false, setGrantable: true },
  { patreonTierId: "adult", setId: "WB01", packsPerMonth: 3, active: true, setIsAdult: false, setGrantable: true },
  { patreonTierId: "adult", setId: "WB01A", packsPerMonth: 3, active: true, setIsAdult: true, setGrantable: true },
  { patreonTierId: "free", setId: "WB01", packsPerMonth: 1, active: false, setIsAdult: false, setGrantable: true },
];

describe("spec 001 — membresía y concesiones", () => {
  it("test_s001_rf9_un_cobro_pagado_da_los_sobres_de_las_reglas_de_su_tier", () => {
    expect(entitledPacks(base, rules)).toEqual(new Map([["WB01", 3]]));
  });

  it("test_s001_rf9_varios_tiers_suman_y_las_reglas_inactivas_o_no_publicadas_no_cuentan", () => {
    const both = { ...base, entitledTierIds: ["sfw", "adult", "free"] };
    expect(entitledPacks(both, rules)).toEqual(new Map([["WB01", 6], ["WB01A", 3]]));
    const unpublished = rules.map((r) => (r.setId === "WB01A" ? { ...r, setGrantable: false } : r));
    expect(entitledPacks(both, unpublished)).toEqual(new Map([["WB01", 6]]));
  });

  it("test_s001_rf13_sin_pago_o_sin_ser_patron_activo_no_hay_sobres", () => {
    for (const s of [
      { ...base, lastChargeStatus: "Pending" },
      { ...base, lastChargeStatus: "Declined" },
      { ...base, patronStatus: "former_patron" as const },
      { ...base, patronStatus: "declined_patron" as const },
      { ...base, lastChargeDate: null, nextChargeDate: null },
    ]) {
      expect(entitledPacks(s, rules).size).toBe(0);
    }
  });

  it("test_s001_rf11_el_ciclo_es_estable_si_sube_de_tier_a_mitad_de_mes", () => {
    expect(cycleKey(base)).toBe("2026-11-01");
    // Una subida a mitad de ciclo cambia la fecha del último cobro, no la del siguiente.
    expect(cycleKey({ ...base, lastChargeDate: new Date("2026-10-15T09:00:00Z") })).toBe("2026-11-01");
    expect(cycleKey({ ...base, nextChargeDate: null })).toBe("last-2026-10-01");
  });

  it("test_s001_rf10_las_claves_crecen_con_el_total_y_se_repiten_al_bajar_y_subir", () => {
    const three = grantKeys("u1", "2026-11-01", "WB01", 3);
    const six = grantKeys("u1", "2026-11-01", "WB01", 6);
    expect(three).toEqual(["tier:u1:2026-11-01:WB01:1", "tier:u1:2026-11-01:WB01:2", "tier:u1:2026-11-01:WB01:3"]);
    expect(six.slice(0, 3)).toEqual(three);
    expect(six).toHaveLength(6);
  });

  it("test_s001_rf14_reembolsos_y_fraude_anulan_lo_demas_no", () => {
    for (const s of ["Refunded", "Refunded by Patreon", "Fraud", "Partially Refunded"]) expect(isVoidableCharge(s)).toBe(true);
    for (const s of ["Paid", "Pending", "Declined", "Deleted", "Other", null]) expect(isVoidableCharge(s)).toBe(false);
  });

  it("test_s001_rf18_el_tier_adulto_es_el_que_da_una_coleccion_18", () => {
    expect(hasAdultTier(base, rules)).toBe(false);
    expect(hasAdultTier({ ...base, entitledTierIds: ["adult"] }, rules)).toBe(true);
  });
});

describe("spec 021 — patron", () => {
  const base = { memberId: "m", patreonUserId: "u", patronStatus: "active_patron" as const, lastChargeDate: new Date("2026-10-01"), lastChargeStatus: "Paid", nextChargeDate: new Date("2026-11-01"), entitledTierIds: ["sfw"] };
  const rules = [{ patreonTierId: "sfw", setId: "s", packsPerMonth: 8, active: true, setIsAdult: false, setGrantable: true }];

  it("test_s021_rf11_es_patron_con_membresia_pagada_y_una_regla_con_sobres", () => {
    expect(isPatron(base, rules)).toBe(true);
  });

  it("test_s021_rf11_rf12_no_es_patron_sin_enlace_con_cobro_pendiente_reembolsado_o_tier_sin_reglas", () => {
    expect(isPatron(null, rules)).toBe(false);
    expect(isPatron({ ...base, patronStatus: "declined_patron" }, rules)).toBe(false);
    expect(isPatron({ ...base, patronStatus: "former_patron" }, rules)).toBe(false);
    expect(isPatron({ ...base, lastChargeStatus: "Refunded" }, rules)).toBe(false);
    expect(isPatron({ ...base, entitledTierIds: ["free"] }, rules)).toBe(false);
    expect(isPatron(base, [{ ...rules[0], active: false }])).toBe(false);
    expect(isPatron(base, [{ ...rules[0], packsPerMonth: 0 }])).toBe(false);
  });
});
