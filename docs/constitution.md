# Constitución — Waifu Baker TCG

Aprobada el 14 de octubre de 2026.

Principios innegociables. Toda spec, plan y tarea debe cumplirlos.

1. **Stack único**: Next.js + TypeScript, PostgreSQL y Redis, en Docker sobre VPS propio. Toda dependencia nueva se justifica antes en el plan de la spec.
2. **La spec manda en el motor; el prototipo manda en la experiencia**: nada de Patreon, concesiones, sorteo o cumplimiento se implementa sin RF en la spec activa. La apertura de sobres se descubre en `/lab` y su spec documenta lo validado antes de pasar a producción.
3. **El servidor decide, el cliente solo anima**: el contenido de un sobre nace en una transacción del servidor con RNG criptográfico, se guarda antes de responder y nunca depende del navegador.
4. **Lógica separada de interfaz**: reglas puras en `domain/`, casos de uso en `services/` con puertos inyectables (reloj, RNG, Patreon); los handlers traducen HTTP y la UI solo muestra.
5. **Tests como puerta**: cada RF tiene al menos un test (Vitest o Playwright); la apertura tiene test de concurrencia; ninguna tarea cierra con la suite en rojo.
6. **Datos mínimos y protegidos**: solo id y nombre de Patreon; tokens cifrados; esquema solo por migración; arte servido con URL firmada y caducidad; arte 18+ nunca sin doble gate (declaración más tier adulto).
7. **Cumplimiento por diseño**: probabilidades públicas y versionadas, rara garantizada por sobre, sin intercambio ni cash-out, sin premio por completar set, bloqueo de Bélgica, divulgación de IA.
8. **Arte solo con personajes originales y adultos**: ningún personaje con licencia en contenido de pago; ninguna imagen sugerente entra en un set sin revisión de aspecto adulto.
9. **Rendimiento de animación**: solo `transform` y `opacity`, `prefers-reduced-motion` respetado, 60 fps en Pixel 6a e iPhone 12 como umbral de aceptación.
10. **Idioma**: código e identificadores en inglés; la interfaz en inglés por defecto y en español con selector, sin textos sueltos fuera de los diccionarios (`src/i18n`); documentación y specs en español. (Enmienda del 15 oct 2026, spec 008.)
