# Spec 021 — Prueba en un teléfono real

Sin animaciones nuevas: la lista es corta. Se prueba en la demo (`pnpm demo`: la colección de fan art es gratuita y de
bienvenida; no hay colección de Patreon ni membresía simulada, así que lo de patron se mira en escritorio con el login de
desarrollo y `/api/dev/patreon-member`, como en el E2E).

| # | Qué hacer | Qué debe pasar | ✓ |
|---|---|---|---|
| 1 | Recompensas → sobre gratis | El desplegable solo ofrece la colección gratuita | |
| 2 | Panel → una colección → «Marcar como de Patreon» | La etiqueta cambia; en Probabilidades sale «Con la suscripción» | |
| 3 | Como coleccionista, Mi colección y Mis sobres con esa colección | Aparece el aviso con el enlace a Patreon y el enlace abre Patreon en otra pestaña | |
| 4 | Juegos → Expediciones | «0 de 2 en uso» y el tercer espacio con candado y enlace | |
| 5 | (Escritorio) con membresía simulada activa | Insignia «Patron» en Mi cuenta y en el álbum público; «de 3» en Expediciones; sin avisos | |

Firma del dueño: ____________ Fecha: ____________
