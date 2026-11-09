# Tareas — Spec 035

| T | Qué | RF | Depende de | Hecho cuando |
|---|---|---|---|---|
| T1 | Dominio `deploy-notice.ts` (cambios desde los commits, mensaje, entorno) con sus tests | RF-3 a RF-7, RF-11 | — | Vitest en verde |
| T2 | Adaptador `github.ts` y servicio `notifyDeploy` (un aviso por versión, errores), con tests de integración | RF-1, RF-2, RF-6, RF-8, RF-10, RF-11 | T1 | Vitest en verde |
| T3 | Arranque: espera la salud y avisa; `SOURCE_COMMIT` en el Dockerfile | RF-1, RF-2 | T2 | tipos y lint en verde |
| T4 | `docs/despliegue.md` (pasos en Coolify, también el aviso de fallo), reglas, roadmap y `validation.md` | RF-9, todos | T1–T3 | suite en verde |
| T5 | Prueba real en pruebas (el dueño configura Coolify) | RF-1, RF-9 | T4 y merge | mensajes recibidos |

## Cobertura
RF-1 T2, T3, T5 · RF-2 T2, T3 · RF-3 T1 · RF-4 T1 · RF-5 T1 · RF-6 T1, T2 · RF-7 T1 · RF-8 T2 · RF-9 T4, T5 ·
RF-10 T2 · RF-11 T1, T2
