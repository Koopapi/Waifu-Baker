# Validación — Spec 033

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-10. Vitest: 968 de 968 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (19 de 19 RF con al menos un test en verde).

**E2E (9 y 10 nov 2026):** en `chromium-desktop`, la E2E de la spec y las afectadas pasaron. `admin-panel` se quedó
sin tiempo en la corrida grande y pasó al repetirla sola. La suite completa en los cuatro proyectos queda pendiente:
satura la máquina del dueño, así que corre en la CI y antes de pasar a producción. `pnpm build` y `pnpm budget` están
en verde: la colección del panel pesa 247,8 kB de 260 y «Abrir todos», 194,4 kB de 250.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | EL SISTEMA mostrará sobre la cuadrícula de cartas un filtro por personaje con los personajes de la colección y | ✓ filtra_por_personaje_y_sin_personaje<br>✓ la_tesela_lleva_el_personaje_para_filtrar | RF-1, RF-4 y RF-8: filtrar por personaje, con los recuentos y el contador | Cumplido |
| RF-2 | EL SISTEMA mostrará sobre la cuadrícula un filtro por rareza con las cinco rarezas (Común, Rara, Épica, | ✓ filtra_por_rareza | RF-2, RF-5 y RF-6: varias rarezas suman y se combinan con el personaje | Cumplido |
| RF-3 | EL SISTEMA mostrará sobre la cuadrícula un filtro de pendientes con cuatro opciones: sin armar, procesando, | ✓ pendientes_sin_armar_procesando_capas_y_18_sin_revisar_solo_en_18<br>✓ la_tesela_dice_si_la_carta_esta_armada_sin_llevar_las_capas | RF-3 y RF-9: un pendiente sin cartas deja la cuadrícula vacía con «Quitar filtros» | Cumplido |
| RF-4 | EL SISTEMA mostrará en cada opción de filtro cuántas cartas de la colección le corresponden. | ✓ cada_opcion_dice_cuantas_cartas_tiene<br>✓ cada_ficha_es_un_boton_con_su_estado_y_su_numero | RF-1, RF-4 y RF-8: filtrar por personaje, con los recuentos y el contador | Cumplido |
| RF-5 | CUANDO el administrador elija varias opciones de un mismo filtro, EL SISTEMA mostrará las cartas que cumplan | ✓ varias_opciones_de_un_filtro_suman | RF-2, RF-5 y RF-6: varias rarezas suman y se combinan con el personaje | Cumplido |
| RF-6 | CUANDO el administrador combine filtros distintos, EL SISTEMA mostrará solo las cartas que cumplan todos. | ✓ filtros_distintos_se_combinan | RF-2, RF-5 y RF-6: varias rarezas suman y se combinan con el personaje | Cumplido |
| RF-7 | CUANDO el administrador escriba en la búsqueda, EL SISTEMA mostrará las cartas cuyo nombre contenga el texto o | ✓ busca_por_nombre_sin_acentos_ni_mayusculas_y_por_numero | RF-7: buscar por número o por nombre | Cumplido |
| RF-8 | MIENTRAS haya algún filtro o búsqueda puesto, EL SISTEMA mostrará cuántas cartas se ven de cuántas hay (por | ✓ el_orden_no_cuenta_como_filtro | RF-1, RF-4 y RF-8: filtrar por personaje, con los recuentos y el contador | Cumplido |
| RF-9 | SI ninguna carta cumple los filtros, ENTONCES EL SISTEMA dirá que no hay cartas con esos filtros y mostrará | — | RF-3 y RF-9: un pendiente sin cartas deja la cuadrícula vacía con «Quitar filtros» | Cumplido |
| RF-10 | EL SISTEMA permitirá ordenar la vista por número, rareza o nombre, con número como orden inicial. | ✓ ordena_por_numero_rareza_o_nombre | RF-10: ordenar por rareza, de la más alta a la más baja | Cumplido |
| RF-11 | EL SISTEMA no cambiará el número de ninguna carta al ordenar la vista. | ✓ ordenar_no_cambia_el_numero_ni_la_lista_original | — | Cumplido |
| RF-12 | MIENTRAS haya algún filtro o búsqueda puesto, EL SISTEMA hará que «Seleccionar todas» seleccione solo las | — | RF-12, RF-13 y RF-15: seleccionar las visibles, cambiarlas en bloque y conservar el filtro | Cumplido |
| RF-13 | CUANDO cambien los filtros, EL SISTEMA quitará de la selección las cartas que dejen de verse. | — | RF-12, RF-13 y RF-15: seleccionar las visibles, cambiarlas en bloque y conservar el filtro | Cumplido |
| RF-14 | CUANDO el administrador pulse «Reordenar», EL SISTEMA quitará los filtros, la búsqueda y el orden de la vista, | — | RF-14: «Reordenar» quita los filtros y muestra toda la colección | Cumplido |
| RF-15 | CUANDO el administrador guarde una carta o aplique un cambio en bloque, EL SISTEMA mantendrá los filtros | — | RF-12, RF-13 y RF-15: seleccionar las visibles, cambiarlas en bloque y conservar el filtro | Cumplido |
| RF-16 | CUANDO cambien los filtros, la búsqueda o el orden, EL SISTEMA los guardará en la dirección de la página sin | ✓ rf19_la_direccion_guarda_solo_lo_puesto | RF-16 y RF-17: los filtros van en la dirección, sin llenar el historial, y vuelven al recargar | Cumplido |
| RF-17 | CUANDO el administrador abra la dirección de una colección con filtros, EL SISTEMA mostrará la cuadrícula con | ✓ la_direccion_vuelve_a_dar_los_mismos_filtros | RF-16 y RF-17: los filtros van en la dirección, sin llenar el historial, y vuelven al recargar | Cumplido |
| RF-18 | SI la dirección trae un filtro que no existe en la colección (un personaje que ya no está o una rareza | ✓ lo_que_no_existe_en_la_coleccion_se_ignora | — | Cumplido |
| RF-19 | CUANDO el administrador entre a una colección desde «Sets», EL SISTEMA mostrará la cuadrícula sin filtros. | ✓ rf19_la_direccion_guarda_solo_lo_puesto | RF-19: al entrar desde «Sets», sin filtros | Cumplido |
