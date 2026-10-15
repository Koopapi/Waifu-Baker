# Pista de arte — Waifu Baker TCG

El taller de generación está en `ART_DIR` (`/Users/koopa/Documents/Waifu Baker`): `bw.py`,
`styles/*.json`, `poses.md`, `personajes.md`. Aquí viven solo las definiciones del set
(`characters/`, `sets/wb01/cards.csv`) y los criterios de hecho. Los renders no se versionan.

Regla fija: solo personajes originales; en el set 18+ solo OCs de aspecto adulto verificado.
El fan art existente queda fuera de cualquier set de pago.

## Estado

**Pausa de créditos (14 oct 2026):** el usuario pidió no gastar más créditos por ahora. A0 y
siguientes quedan en espera. Mientras tanto, el esqueleto y el prototipo `/lab` usan como arte
de relleno renders SFW ya existentes en `ART_DIR/output/` (fan art de calibración). Son solo
para desarrollo local: nunca entran en un set, en un bucket ni en material de venta.

## Pasos

- [ ] **A0 — Prueba de consistencia con una sola OC**
  - Hecho cuando: una OC definida en `characters/<slug>.md` sale reconocible en 6 poses
    distintas (misma cara, pelo, ojos y accesorio) a juicio del usuario, usando seed fija e
    img2img `--strength 0.4` desde su referencia; gasto ≤ 20 créditos. Si falla, se replantea
    el enfoque antes de seguir.
- [ ] **A1 — Character sheets de las 5 OCs**
  - Depende de: A0
  - Hecho cuando: cada `characters/<slug>.md` tiene bloque de identidad (pelo, ojos, accesorio
    distintivo, outfit canónico, `mature female, adult`), negativos (`loli, child, petite,
    young`), seed e image id de referencia, y el usuario aprueba la referencia.
- [ ] **A2 — 32 cartas del set SFW (`WB01`)**
  - Depende de: A1
  - Hecho cuando: `sets/wb01/cards.csv` tiene 32 filas (por OC 2 common, 1 uncommon, 1 rare,
    1 epic, 1 legendary, más 2 secret alt-art) con `bw_label` y `lote` resueltos en el
    `log.jsonl` del taller; revisión visual aprobada.
- [x] **A3 — Marco de carta en Pencil** (14 oct 2026, ver `docs/DESIGN.md`)
  - Hecho cuando: el `.pen` exporta `frame_<rarity>.png` @2x con ventana transparente y el
    compositor del panel compone una carta de prueba por rareza.
- [ ] **A4 — 32 cartas del set 18+ (`WB01A`)**
  - Depende de: A1, A3
  - Hecho cuando: 32 filas en `sets/wb01a/cards.csv`, cada imagen marcada como revisada en la
    columna `adult_review` (quién y cuándo), sin ninguna con aspecto infantil.
- [ ] **A5 — Material promocional**
  - Hecho cuando: 10 imágenes SFW para portada, Patreon y redes.

Presupuesto estimado: ~300 créditos para todo; saldo de partida 348.
