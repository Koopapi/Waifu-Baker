# Waifu Baker TCG

Cartas coleccionables digitales de estilo anime con apertura de sobres interactiva y
colección persistente. Patreon cobra y verifica 18+; esta web abre los sobres.

- `docs/constitution.md` — principios innegociables (propuesta pendiente de aprobación).
- `docs/roadmap.md` — specs en orden y estrategia híbrida.
- `docs/architecture.md` — línea base técnica común a todos los planes.
- `specs/NNN-nombre/` — `spec.md` (EARS), `plan.md`, `tasks.md` por funcionalidad.
- `art/` — definiciones del set y pista de arte; el taller está en `ART_DIR`.
- `.claude/skills/spec-generator/` — entrevista y plantilla de specs.

## Probar la beta en tu máquina

La beta vive en la rama **`pruebas`**; `main` es la versión estable. Necesitas macOS o Linux con:

- **Node.js 22 o superior** y **pnpm 10** (`corepack enable`, que ya viene con Node).
- **PostgreSQL 16** en local, escuchando en el puerto 5432 sin contraseña para tu usuario
  (en Mac: `brew install postgresql@16 && brew services start postgresql@16`).

```bash
git clone https://github.com/Koopapi/Waifu-Baker.git
cd Waifu-Baker
git switch pruebas
corepack enable
pnpm install
cd apps/web
DEMO_MANIFEST=e2e/demo-manifest.json ART_DIR=public/lab pnpm demo
```

`pnpm demo` crea desde cero una base de datos aparte (`waifu_baker_demo`), compila la versión optimizada (la
primera vez tarda unos minutos) y abre la web en **http://localhost:3300**, con un coleccionista y un administrador
de prueba: se entra desde la portada, sin Patreon. Cada vez que se lanza vuelve a empezar de cero.

- `DEMO_MANIFEST=e2e/demo-manifest.json ART_DIR=public/lab` usa las 10 ilustraciones de muestra que vienen en el repo
  (`apps/web/public/lab`). Si tienes la carpeta de arte de la demo completa (26 cartas, fuera del repo), usa en su
  lugar `ART_DIR=/ruta/a/la/carpeta pnpm demo`.
- `pnpm demo --dev` arranca en modo desarrollo, con recarga en caliente (más lento, pero ves tus cambios al momento).
- Para probar en el teléfono, abre la dirección «Network» que aparece al arrancar (misma wifi).
- Ctrl+C la detiene.

Para trabajar en el código, el flujo de ramas y los comandos (tests, E2E, migraciones) están en `AGENTS.md`.

## Estado

Estado (15 oct 2026):

- **Spec 003 — Panel de administración: terminada.** 29 de 29 tareas, 27 de 27 RF cubiertos
  (`specs/003-panel-admin/validation.md`), 113 tests de Vitest y un E2E de punta a punta en verde.
- Marco de carta diseñado en Pencil (sin textos: marco por rareza, sello WB y número); ver `docs/DESIGN.md`.
- Prototipo de apertura en `/lab`; el panel la reutiliza para simular sobres con cartas reales.
- **Spec 004 — Sobres: concesión y apertura: terminada.** 21 de 21 RF (`specs/004-sobres-apertura/validation.md`).
  El coleccionista entra, ve «Mis sobres», los abre con la animación, recupera aperturas a medias y usa «Abrir todos».
- **Spec 006 — Colección y álbum público: terminada.** 17 de 17 RF (`specs/006-coleccion-album/validation.md`).
  «Mi colección» en `/coleccion`, ajustes del álbum en `/coleccion/album` y álbum público en `/album/<enlace>`.
- **Spec 008 — Idiomas: terminada.** 10 de 10 RF. Inglés por defecto y español con el selector EN/ES de cada página.
- **Spec 001 — Cuentas y vínculo con Patreon: terminada.** 26 de 26 RF. Login real, bienvenida, sobres por cobro, 18+, «Mi cuenta» en `/cuenta` y borrado de cuenta.
- Reglas de negocio en un solo sitio: `docs/reglas-de-negocio.md`.
- **Spec 009 — Sobres gratis y recompensa diaria: terminada.** 21 de 21 RF. Tarjetas en «Mis sobres», galletas en «Mi cuenta» y en el panel.
- **Spec 007 (parte beta) — Operación y cumplimiento: terminada.** 18 de 18 RF. Bienvenida con edad y términos,
  páginas legales en `/legal/*`, Sentry, métricas y copias en `/admin/metricas`, CI en GitHub.
- Copias: `pnpm backup` y `pnpm backup:restore` (ver `AGENTS.md`).
- Siguiente: contenido real (pista de arte) y despliegue (parte 2 de la spec 007).
