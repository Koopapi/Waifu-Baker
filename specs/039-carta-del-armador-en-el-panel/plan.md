# Plan 039 — La carta del armador también en el panel

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`. Reutiliza lo de las specs 034 y 037:
`finalCardConfig`, la carta viva de `Card3D` y `CartaCapas`, y la elección de imagen fija de `flatImageFor`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/cards/admin-card.ts` (nuevo) | `adminAssetUrl(key)` y `adminCardView(card, holoCopy)`: la imagen fija (normal u holo) y la carta viva de una carta para el panel, con enlaces del panel, sin efectos del vínculo y con la configuración vigente (nunca la pendiente) | 1, 4–9, 13, 15 |
| `app/admin/sets/card-actions.ts` | `simulatePackAction` usa `adminCardView`: cada carta va con `live`, `holoFinish` y su imagen fija | 1–9 |
| `features/admin/cards/LayersEditor.tsx` | usa `adminAssetUrl` en vez de su copia local | — |
| `features/admin/cards/CardEditor.tsx` | sin `CardPreview` ni su pista de inclinación; el cambio de arte y la nota del arte pendiente se quedan | 10–12 |
| `features/admin/cards/CardPreview.tsx` | se borra (sin otros usos); los textos `tiltHint` y `previewHolo` también | 10 |
| `domain/packs/designer-samples.ts` (nuevo) | `designerSamples(cards, fallback)`: las cartas de muestra del diseñador, cada una con su carta viva si está armada | 13, 15, 16 |
| `app/admin/sets/[id]/pack/[kind]/page.tsx` | usa `designerSamples` | 13, 15, 16 |
| `features/opening/opening.css` | con la carta viva ya cargada, la cara de `Card3D` no la recorta (`overflow: visible`, sin `contain: paint`) | 17 |
| `features/admin/packs/DesignerStage.tsx` | `SampleCard.live`: si la hay, `CartaCapas` monta la configuración viva (como `Card3D`), solo en la carta a la vista | 13, 14 |

## 2. Modelo de datos

Sin cambios ni migración.

## 3. Algoritmos

**Carta del panel (RF-1, RF-4 a RF-9).** Con capas: `live = { tier: rarityTier(rarity), config: finalCardConfig(layers,
adminAssetUrl) }`, sin `applyBondEffects`. Sin capas: `live = null`, y la escena la muestra como hoy, con su insignia. La
imagen fija sale de `flatImageFor("mid", { holoCopy, holoImage: Boolean(keyHoloMid) })`: la holo si la hay o, si no, la
normal con el acabado holo. `layers` y `keyMid` son siempre lo aprobado; lo pendiente de revisión 18+ vive aparte
(`layers_pending`, `pending_keys`) y no se lee.

**Cartas de muestra (RF-13, RF-15, RF-16).** Las primeras 15 cartas con rareza e imagen fija, cada una con
`adminCardView(card, false)`. Si no hay ninguna, la carta de ejemplo del paquete de diseño, como hoy.

## 4. Contrato de la API

`simulatePackAction` devuelve además `live` y `holoFinish` en cada carta (el tipo `LabCard` ya los tiene).

## 5. Decisiones técnicas

- La carta viva del panel usa los enlaces de `/api/admin/assets`, los mismos del armador: solo los ve un administrador.
- `DesignerStage` monta viva solo la carta a la vista; las demás se quedan con la imagen fija (RNF de rendimiento).
- Sin componente nuevo de carta: el simulador ya usa `Card3D` y el diseñador ya usa `CartaCapas`.

## 6. Dependencias

Ninguna.

## 7. Estrategia de tests

- **Unit**:
  - `adminCardView`: carta viva con enlaces del panel; sin efectos del vínculo; lo vigente aunque haya pendiente; holo
    con y sin imagen holo; sin capas, sin carta viva.
  - `designerSamples`: carta armada con carta viva, carta sin capas con imagen fija, colección sin cartas con rareza con
    la carta de ejemplo.
- **E2E** (`e2e/carta-del-armador-en-el-panel.spec.ts`), en una colección armada y toda holo:
  - el simulador revela la carta viva, con el sello una sola vez y sin la insignia de la escena;
  - el resumen del simulador muestra la imagen fija holo, sin insignia;
  - el editor de una carta, sin la vista previa anterior y con la del armador;
  - el diseñador de sobres saca la carta de muestra viva;
  - el sello sobresale sin recortarse en el simulador y en la apertura del coleccionista (el punto del sello fuera de la
    carta es el sello, no el fondo).
- `admin-panel.spec.ts`: el paso de la vista previa anterior (spec 003, RF-22) pasa a comprobar que ya no está.

## 8. Entregas

1. Simulador.
2. Editor de una carta.
3. Diseñador de sobres, E2E y validación.
