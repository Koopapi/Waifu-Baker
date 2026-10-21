# Waifu Baker · Paquete de diseño y código

Todo lo trabajado en las sesiones de diseño, listo para un proyecto en VS Code.

```
waifu-baker/
├─ CONTEXTO.md                    resumen del proyecto para personas y asistentes de IA
├─ PROMPT-PARA-CLAUDE.md          pasos y prompts para que Claude Code aplique Street pop
├─ .claude/skills/waifu-baker-street-pop/   skill de estilo para Claude Code (carpeta oculta)
├─ docs/
│  ├─ expediciones-diseno.md      diseño completo de Expediciones
│  ├─ decisiones-y-estrategia.md  rarezas, cartas raras, vínculo, monetización, Patreon, marketing
│  ├─ guia-de-arte.md             tamaños, formatos, capas y zona segura
│  └─ estilo-visual.md            las dos paletas y sus reglas
├─ tokens/
│  ├─ tema-a-pop-pastel.css       variables CSS del tema oscuro
│  └─ tema-b-street-pop.css       variables CSS del tema claro
├─ disenos/                       pantallas de referencia en HTML (a-* = Pop pastel, b-* = Street pop)
└─ codigo/
   ├─ carta-capas/                carta con parallax, creador de cartas, React y Vue
   └─ expediciones/               reglas, datos, prototipo jugable y servidor de ejemplo
```

## Aplicar el estilo Street pop con Claude Code

Sigue `PROMPT-PARA-CLAUDE.md`. La carpeta `.claude` empieza con punto, así que en Mac y Windows puede verse oculta: en VS Code sí aparece en el explorador de archivos (en Mac, Cmd+Shift+. muestra las carpetas ocultas en Finder).

## Cómo meterlo en tu proyecto

1. Copia la carpeta `waifu-baker/` dentro de tu proyecto, por ejemplo como `docs/waifu-baker/`, o reparte sus partes:
   - `codigo/carta-capas/carta-capas.js` → donde tengas tus scripts o componentes del front.
   - `codigo/expediciones/expediciones-logica.js` → compartido entre servidor y front.
   - `tokens/` → importa el tema que elijas en tu CSS global.
2. Si usas un asistente de IA en VS Code, copia `CONTEXTO.md` como `CLAUDE.md` (Claude Code) o `.github/copilot-instructions.md` (Copilot).

## Cómo ver las demos

- **Pantallas y demos HTML** (`disenos/`, `ejemplo.html`, `creador-cartas.html`, `expediciones.html`): ábrelas en el navegador. En VS Code, la extensión **Live Server** las sirve con un clic.
- **Servidor de expediciones:**
  ```
  cd codigo/expediciones
  npm install
  npm start        # http://localhost:3000
  ```

## Notas

- Las personajes y cartas de ejemplo, salvo Yuki, son inventadas.
- Las pantallas de `disenos/` son estáticas: sirven de referencia visual, no son componentes finales.
- El diseño editable sigue en el canvas de diseño y el documento de Expediciones en Claude.
