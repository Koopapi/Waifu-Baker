# Comprobación en un teléfono real — Spec 013 (RF-14)

La hace el usuario antes de cerrar la spec. Lo más sencillo es la demo: en el Mac, `pnpm demo` (deja la base
de la demo como nueva, con 3 sobres para el coleccionista); en el teléfono, conectado a la misma wifi, abrir
`http://<IP del Mac>:3300` (la IP sale en Ajustes del sistema → Wi-Fi → Detalles) y pulsar «Coleccionista».
Para más sobres: entrar como «Administrador» → Usuarios → Demo Collector → regalar sobres. El giroscopio solo
funciona con HTTPS; el resto de puntos se hacen con HTTP.

Teléfono usado: iPhone (Chrome y Safari, por wifi, en modo desarrollo) · Fecha: 16 oct 2026

| # | Qué comprobar | ¿Bien? | Notas |
|---|---|---|---|
| 1 | Rasgar, abanico y volteo de las cartas sin tirones visibles; el holo sigue al mover el teléfono (tras «Activar giroscopio» en iPhone). | ◐ | Rasgado, abanico y volteo fluidos: bien. El holo con el giroscopio, sin probar (necesita HTTPS): se comprueba en la web publicada (etapa 3). |
| 2 | El reveal de una rara o mejor (destello y partículas) no se atasca. | ☑ | Bien. |
| 3 | El primer rasgado hace sonar el sobre (en iPhone, con el interruptor de silencio quitado). Cada volteo suena y las raras tienen su sonido. | ☑ | Bien. |
| 4 | El botón del altavoz (abajo, junto a «Mis sobres») corta sonido y vibración, y sigue silenciado al recargar. | ☑ | Bien. |
| 5 | En Android, una rara o mejor vibra; una legendaria vibra más. | ☐ Pendiente | Sin probar: iPhone no vibra. Se comprueba en un Android con la web publicada (etapa 3). |
| 6 | «Abrir todos» suena una sola vez al final. | ☑ | Bien. |
| 7 | La pantalla de apertura aparece en menos de 3 s con datos móviles (4G). | ☐ Pendiente | Sin medir: en modo desarrollo la carga es mucho más lenta que en producción (medido: 0,5–1 s frente a 0,2 s para que la página responda). Se mide con datos móviles en la web publicada (etapa 3). |

Para escuchar cada sonido por separado y pedir que se cambie alguno: `/sistema` → «Game pieces» → «Sound toggle».

Firmado: ☑ La apertura va fluida y suena bien en mi teléfono (el usuario, 16 oct 2026). Los puntos 1, 5 y 7 se
comprueban en la web publicada, dentro de la etapa 3.

Observación del usuario: la navegación y las casillas de la bienvenida se sintieron lentas. Causa principal: el
modo desarrollo. Las casillas solo respondían tras hidratar la página; pasan a ser casillas nativas en un
arreglo aparte.
