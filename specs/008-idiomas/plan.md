# Plan 008 — Idiomas

Respeta `docs/constitution.md`. Sin dependencias nuevas (principio 1): `next-intl` resolvería lo
mismo, pero con dos idiomas y sin rutas por idioma basta un diccionario tipado.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `i18n/locales.ts` | Idiomas, idioma por defecto, nombre de la cookie, normalización | RF-1, RF-4 |
| `i18n/dictionaries/en/*.ts` | Fuente de verdad por área (`common`, `public`, `packs`, `collection`, `admin`, `errors`) | RF-5 |
| `i18n/dictionaries/es/*.ts` | Misma forma, obligada por el tipo `Dict` | RF-5, RF-10 |
| `i18n/server.ts` | `getLocale()` y `getDict()` desde la cookie en servidor y en acciones | RF-1, RF-5 |
| `i18n/client.tsx` | `I18nProvider` y `useT()` para componentes cliente | RF-5 |
| `i18n/LocaleToggle.tsx` + acción `setLocale` | Selector EN/ES: guarda la cookie y refresca | RF-2 a RF-4 |
| `i18n/errors.ts` | Traduce un error de negocio por su código y parámetros | RF-5, RF-10 |

## 2. Decisiones
- Cookie `wb_locale` (`en` o `es`), 1 año, `SameSite=Lax`. Sin cookie, inglés.
- Los textos con variables son funciones (`(n: number) => …`). El proveedor cliente recibe solo el
  idioma e importa los dos diccionarios, porque las funciones no viajan del servidor al cliente.
- `AdminError` gana `params`; los servicios siguen lanzando código + mensaje original, y la acción
  traduce con `errors[code](params)`. Los problemas del dominio (publicación, probabilidades,
  subida) ya llevan código; ganan `params` y la interfaz los traduce.
- Fechas y números con `Intl` y el idioma activo.
- Los E2E existentes fijan `wb_locale=es` por defecto (sus textos son en español); el E2E de esta
  spec prueba inglés y el cambio.

## 3. Riesgos
- Olvidar un texto: el test de RF-10 compara claves y busca códigos de error en el código fuente.
