# Expediciones · Waifu Baker

Prototipo funcional de Expediciones (fase 1 del documento de diseño) y un servidor de referencia que usa las mismas reglas.

## Qué trae

```
expediciones.html          el prototipo: mapa, preparar equipo, en curso, reporte y vínculo
expediciones-logica.js     las reglas como funciones puras (poder, calificación, botín, eventos)
expediciones-datos.js      catálogo de ejemplo: zonas, personajes, cartas, botín y plantillas
servidor-ejemplo.js        servidor Express con la API del documento, usando la misma lógica
yuki/yuki_mini.webp        miniatura de Yuki
```

## Probarlo

- **Solo el prototipo:** abre `expediciones.html` en el navegador. Guarda el avance en el navegador y trae un modo de tiempo rápido (30 min = 5 s) para probar sin esperar.
- **Con el servidor:** `npm install express` y `node servidor-ejemplo.js`. La API queda en `http://localhost:3000/api/...`. El servidor guarda todo en memoria y se borra al reiniciarlo.

## Qué va en el servidor y qué en el navegador

El prototipo hace todo en el navegador para poder probarlo solo. En el sitio real, **el servidor decide** y el navegador solo muestra:

| Paso | Servidor | Navegador |
|---|---|---|
| Ver mapa y espacios | Manda zonas abiertas, fragmentos y expediciones en curso | Dibuja el mapa y los temporizadores |
| Armar equipo | `POST /previa` calcula poder y calificación | Muestra la barra; puede calcular localmente con `expediciones-logica.js` para que sea instantáneo |
| Enviar | Valida cartas, espacio y zona. Guarda hora de fin, semilla y poder | Muestra la expedición en curso |
| Reclamar | Revisa la hora, corre `resolver()`, entrega botín y vínculo en una transacción | Muestra el reporte que le devuelven |

`expediciones-logica.js` funciona igual en Node y en el navegador, así que no hay que reescribir las reglas.

## API (la del documento)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/expediciones/zonas` | Zonas con su estado para este usuario |
| GET | `/api/expediciones` | Recursos, espacios y expediciones en curso |
| POST | `/api/expediciones/previa` | `{ zona, cartas, duracion }` → poder, calificación, sinergias, botín esperado |
| POST | `/api/expediciones` | `{ zona, duracion, cartas }` → envía |
| POST | `/api/expediciones/:id/reclamar` | Tira el botín y lo entrega. Reclamar dos veces devuelve el mismo resultado |
| POST | `/api/expediciones/:id/cancelar` | Devuelve las cartas sin botín |
| POST | `/api/zonas/:id/abrir` | Gasta fragmentos y abre la siguiente zona |
| GET | `/api/probabilidades/expediciones` | Tablas públicas de botín |

Los rechazos vuelven con estado 400 y `{ error, mensaje }`. Códigos: `zona_cerrada`, `equipo_invalido`, `carta_ajena`, `carta_ocupada`, `personaje_repetido`, `sin_espacio`, `aun_no`, `fuera_de_orden`, `faltan_fragmentos`.

## Reglas que el servidor hace cumplir

- Una carta solo puede estar en una expedición a la vez, y una personaje solo una vez por equipo.
- La hora de fin usa el reloj del servidor, nunca el del teléfono.
- El poder y la calificación se congelan al enviar.
- La semilla se guarda al enviar y no se manda al navegador. Con ella, el mismo envío siempre da el mismo resultado, lo que ayuda en soporte.
- Reclamar dos veces no entrega nada de nuevo.
- Las zonas se abren en orden.

## Para pasarlo a su base de datos

```
personaje         + terreno, rol, duo_id
carta             + terreno_extra (solo SSR y UR)
zona              id, nombre, terreno, dificultad, fragmentos_req, orden, x, y,
                  carta_exclusiva_id, galletas_min, galletas_max, activa
zona_botin        zona_id, tipo, peso
evento_plantilla  id, tipo, n, rol_req, solo_duo, zona_id, texto
expedicion        id, usuario_id, zona_id, duracion, inicia_en, termina_en, semilla,
                  poder, calificacion, estado, resultado_json
expedicion_carta  expedicion_id, carta_id, personaje_id, posicion
vinculo           usuario_id, personaje_id, xp
usuario           + fragmentos, sobres_pendientes, expediciones_completadas
zona_abierta      usuario_id, zona_id, abierta_en
```

En el servidor de ejemplo, cada `jugador(...)` y cada cambio a `j.` es una lectura o escritura de estas tablas.

## Pendiente para el sitio real

- Conectar `usuario(req)` con la sesión de Patreon.
- Sacar el catálogo del panel de administración en vez de `expediciones-datos.js`.
- Que los sobres ganados aparezcan en **Mis sobres**.
- Textos en inglés: las plantillas de eventos necesitan su versión `texto_en`.
- Quitar el botón **Adelantar** y el modo de tiempo rápido.
