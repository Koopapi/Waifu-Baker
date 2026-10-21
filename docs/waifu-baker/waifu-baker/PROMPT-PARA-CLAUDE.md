# Prompt para aplicar Street pop con Claude Code

## Preparación (una vez)

1. Copia la carpeta `.claude/skills/waifu-baker-street-pop/` a la raíz de tu proyecto (queda en `tu-proyecto/.claude/skills/waifu-baker-street-pop/`). Claude Code la carga sola cuando trabaja en algo visual.
2. Copia `codigo/carta-capas/carta-capas.js` (v3) a la carpeta de scripts o componentes del front de tu proyecto.
3. Opcional: copia `CONTEXTO.md` como `CLAUDE.md` en la raíz para que Claude conozca todo el proyecto.

## Prompt 1 · Plan (pégalo tal cual)

```
Vamos a cambiar todo lo visual de Waifu Baker al estilo Street pop.
Usa el skill waifu-baker-street-pop: lee street-pop.css y las referencias de su carpeta.

Antes de tocar nada:
1. Revisa cómo maneja estilos este proyecto y dime cómo vas a integrar los tokens.
2. Haz una lista de todas las pantallas y componentes visuales que existen.
3. Dime dónde se muestran cartas y cómo mapearías nuestras rarezas a n, r, sr, ssr y ur.
4. Propón el orden de trabajo, empezando por los tokens y el catálogo del sistema de diseño.

No cambies lógica, rutas ni llamadas a la API. Espera mi visto bueno antes de editar.
```

## Prompt 2 · Ejecutar (después de aprobar el plan)

```
Adelante con el plan. Trabaja pantalla por pantalla, en este orden:
1. Tokens y estilos base (fuentes, colores, botones, inputs, paneles).
2. Catálogo del sistema de diseño.
3. Cabecera, menú y pie.
4. Portada, login y bienvenida.
5. Mis sobres y la apertura de sobres (escena oscura), incluida la carta revelada.
6. Mi colección, álbum, ficha de carta y álbum público.
7. Recompensas y Mi cuenta.
8. Panel de administración en la variante calmada.

Todas las cartas deben mostrarse con carta-capas.js como dice el skill
(interactivas en ficha y apertura, estáticas en rejillas).
Al terminar cada paso, dime qué archivos cambiaste y qué debo revisar en el navegador.
```

## Prompt 3 · Creador de cartas en el panel de administración

```
Integra el creador de cartas por capas en el editor de carta del panel de administración.
Referencia: docs/waifu-baker/codigo/carta-capas/creador-cartas.html (es una herramienta
independiente; úsala como guía de funciones y de interfaz, no la copies tal cual).

Lo que necesito:
1. En el editor de carta, una sección "Carta por capas" con la vista previa en vivo
   (CartaCapas.montar) y estas funciones del creador: subir varias capas, ordenarlas,
   ocultarlas, profundidad, margen, modo de mezcla y opacidad por capa, capas de partículas,
   marco de rareza, sello (texto o imagen) y el botón "Aplicar estilo de la rareza".
2. Las imágenes se suben al almacenamiento que ya usa el proyecto para las cartas.
3. La configuración (el mismo JSON que exporta el creador) se guarda en la base de datos
   junto a la carta, en un campo nuevo, por ejemplo capas_json. Haz la migración necesaria.
4. Si una carta no tiene capas_json, el sitio la muestra con
   CartaCapas.montarRareza(el, rareza, imagen) como dice el skill.
5. Solo los administradores pueden editar esto, igual que el resto del panel.

Primero dime qué tablas, rutas y archivos vas a cambiar, y espera mi visto bueno.
```

## Prompt 4 · Revisión final

```
Revisa toda la interfaz contra las reglas del skill waifu-baker-street-pop:
contraste, un solo botón rosa por pantalla, nada inclinado que sea texto largo,
foco visible, 390 px de ancho sin scroll horizontal y prefers-reduced-motion.
Dame la lista de lo que no cumple y corrígelo.
```

## Consejos

- Trabaja en una rama nueva de git (`git checkout -b estilo-street-pop`) para poder volver atrás.
- Revisa cada paso en el navegador antes de pasar al siguiente.
- Si algo no se parece a la referencia, dile a Claude cuál referencia abrir y qué parte no coincide.
