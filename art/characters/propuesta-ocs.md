# Propuesta de OCs para el piloto (borrador para elegir 5 de 7)

Punto de partida: los 7 personajes genéricos adultos de la portada de Patreon
(`ART_DIR/output/patreon-cover/01…07`). Ya existen, salen bien con el estilo `merunyaa` y tienen
prompt, seed e imagen guardados, así que sirven de referencia para img2img sin gastar créditos en
diseñarlas de cero. Los nombres son provisionales.

## Reglas para que una OC sea reconocible sin LoRA

1. **Bloque de identidad fijo**: pelo (color, largo, peinado), ojos, un rasgo físico y un
   **accesorio distintivo** que aparezca en todas las cartas. Es lo que hace que se la reconozca
   en poses distintas.
2. **Siempre** `mature female, adult, tall` y, en el negativo, `loli, child, petite, young, flat chest`.
3. **Dos vestuarios**: uno **SFW** para `WB01` (apto para el público de 16 años o más: sin escote
   pronunciado, sin poses insinuantes) y otro para `WB01A` (18+), con la capa sugerente de
   `personajes.md`.
4. En `WB01` se usa el estilo `merunyaa` con `medium breasts`; la portada usó `large breasts`, que
   queda para `WB01A`.

## Candidatas

| # | Nombre provisional | Concepto | Identidad fija (todas las cartas) | Vestuario SFW (`WB01`) | Vestuario 18+ (`WB01A`) |
|---|---|---|---|---|---|
| 01 | Rei Kurosawa | Secretaria seria con lado juguetón | `long black hair, grey eyes, sharp eyes, glasses, black-framed eyewear, small earrings` | `white shirt, black blazer, black pencil skirt, pantyhose` | `white shirt, partially unbuttoned, black pencil skirt, pantyhose` |
| 02 | Selene Vesper | Vampira aristócrata | `long silver hair, red eyes, fang, black cross choker, cross earrings` | `black gothic dress, long sleeves, frills, corset` | `black gothic dress, off shoulder, bare shoulders, corset` |
| 03 | Aria Summers | Deportista alegre | `blonde hair, high ponytail, black scrunchie, green eyes, toned` | `red track jacket, white t-shirt, black shorts, sneakers` | `open track jacket, sports bra, midriff, black shorts` |
| 04 | Sylvie Verdelune | Elfa del bosque | `elf, pointy ears, long green hair, golden eyes, gold circlet, leaf hair ornament` | `white and gold dress, long dress, gold armlet` | `white and gold dress, side slit, thighs, bare shoulders` |
| 05 | Mika Haruno | Barista dulce | `brown hair, bob cut, brown eyes, mole under eye` | `black turtleneck sweater, brown apron, long skirt` | `black turtleneck sweater, sleeveless, apron, wide hips` |
| 06 | Rin Amane | Punk rebelde | `short pink hair, undercut, blue eyes, multiple ear piercings` | `black leather jacket, band t-shirt, ripped jeans, boots` | `open leather jacket, black crop top, fishnet, midriff` |
| 07 | Morgana Vell | Bruja traviesa | `long wavy purple hair, purple eyes, witch hat, orange buckle, gem choker` | `black witch robe, long sleeves, thigh boots` | `black off-shoulder dress, bare shoulders, thigh boots` |

**Mi recomendación para las 5**: 02 Selene, 07 Morgana, 03 Aria, 06 Rin y 05 Mika. Son las más
distintas entre sí por color de pelo y silueta, y cada una tiene un accesorio muy marcado
(gargantilla con cruz, sombrero de bruja, coleta con coletero, rapado con piercings, lunar con
delantal). 01 y 04 quedan de reserva para el segundo set.

## Prueba A0 (antes de gastar en las 5)

- **OC**: Selene Vesper (la de rasgos más marcados; si ella no es consistente, ninguna lo será).
- **Referencia**: `02-vampira` de la portada (seed y prompt ya guardados).
- **6 poses** de `poses.md` con el vestuario SFW: de pie a tres cuartos, sentada, de espaldas
  mirando atrás, primer plano, sosteniendo una copa, y una pose dinámica.
- **Método**: img2img desde la referencia con `--strength 0.4` y el bloque de identidad fijo; si
  la pose no cambia lo suficiente, prompt de texto con la misma seed.
- **Gasto**: 6 imágenes más 2 a 4 repeticiones, menos de 12 créditos (el límite de A0 es 20).
- **Hecho cuando**: tú reconoces a la misma Selene en las 6.

## Lo que necesito de ti

1. Elegir las 5 (o confirmar la recomendación) y cambiar nombres si quieres.
2. Autorizar los créditos de la prueba A0 (unos 12).
