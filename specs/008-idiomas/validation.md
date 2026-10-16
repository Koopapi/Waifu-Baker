# Validación — Spec 008

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-10-16. Vitest: 212 de 212 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (10 de 10 RF con al menos un test en verde).

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | CUANDO alguien entra sin haber elegido idioma, EL SISTEMA mostrará la web en inglés. | ✓ sin_eleccion_o_con_valor_raro_se_usa_ingles | RF-1 y RF-7: sin elegir idioma, la web está en inglés y lo declara | Cumplido |
| RF-2 | EL SISTEMA mostrará en todas las páginas (públicas, del coleccionista y del panel) un selector EN/ES. | — | RF-2: el selector está en las páginas públicas | Cumplido |
| RF-3 | CUANDO alguien elige un idioma, EL SISTEMA mostrará la misma página en ese idioma sin perder la sesión ni lo que estaba viendo. | — | RF-3 y RF-4: cambiar a español mantiene la página y se recuerda un año<br>RF-5 y RF-3: el panel y sus errores en inglés; al cambiar, sigue en la misma página<br>RF-3 y RF-9: el coleccionista cambia a inglés; los nombres de las cartas no se traducen | Cumplido |
| RF-4 | EL SISTEMA recordará el idioma elegido en ese navegador durante al menos un año. | — | RF-3 y RF-4: cambiar a español mantiene la página y se recuerda un año | Cumplido |
| RF-5 | EL SISTEMA mostrará en el idioma elegido todos los textos de la interfaz: navegación, botones, avisos, títulos de página, mensajes de error y de validación, y la página 404. | ✓ un_error_se_traduce_por_codigo_y_sin_traduccion_conserva_el_original<br>✓ no_quedan_textos_en_espanol_fuera_de_los_diccionarios | RF-5: la página 404 también se traduce<br>RF-5 y RF-3: el panel y sus errores en inglés; al cambiar, sigue en la misma página | Cumplido |
| RF-6 | EL SISTEMA formateará fechas y números según el idioma elegido. | ✓ fechas_segun_el_idioma<br>✓ numeros_porcentajes_y_precios_segun_el_idioma | RF-6: las fechas siguen el idioma | Cumplido |
| RF-7 | EL SISTEMA declarará el idioma de la página al navegador (`<html lang>`). | — | RF-1 y RF-7: sin elegir idioma, la web está en inglés y lo declara | Cumplido |
| RF-8 | EL SISTEMA mostrará el álbum público y su vista previa para redes en el idioma de quien lo visita (la vista previa, en inglés). | — | RF-8: el álbum público sale en el idioma de quien lo visita | Cumplido |
| RF-9 | EL SISTEMA no traducirá el contenido creado por el administrador: nombres y textos de cartas, colecciones y personajes, ni el alias de un álbum. | — | RF-3 y RF-9: el coleccionista cambia a inglés; los nombres de las cartas no se traducen | Cumplido |
| RF-10 | EL SISTEMA tendrá para cada texto su versión en los dos idiomas; un test fallará si falta alguna, incluidos los mensajes de error del servidor. | ✓ los_dos_diccionarios_tienen_las_mismas_claves<br>✓ cada_codigo_de_error_tiene_traduccion_en_los_dos_idiomas | — | Cumplido |
