# Entrevista — Spec 013, rendimiento y sonido de la apertura

1. **Origen de los sonidos** (16 oct 2026): A — bibliotecas con licencia libre (CC0, por ejemplo Kenney o
   Freesound CC0): sin coste, uso comercial sin atribución; la licencia de cada sonido queda anotada en el repo.
2. **Sonido por defecto** (16 oct 2026): A — activado, con un botón de silencio visible en la pantalla de
   apertura; la elección se recuerda. Empieza con el primer gesto (rasgar), como exigen los navegadores.
3. **Presupuesto de peso** (16 oct 2026): A — 250 kB comprimidos, comprobado en la integración continua: si
   una página clave se pasa, falla. Se recorta lo necesario (cargar GSAP y las partículas solo al usarlos).
4. **Cómo se mide la fluidez** (16 oct 2026): C — solo en un teléfono real, con una lista de comprobación
   (el usuario la cambió desde A; no hay prueba automática de fotogramas).
5. **Vibración** (16 oct 2026): A — breve al revelar una rara o mejor, más larga en legendaria y secreta, solo
   en Android (iPhone no deja vibrar a las webs). La controla el mismo botón de silencio.
6. **Sonidos por rareza y «Abrir todos»** (16 oct 2026): A — rasgado y volteo iguales para todas; el reveal
   sube en 4 niveles (rara, épica, legendaria, secreta); comunes y poco comunes solo suenan al voltearse. En
   «Abrir todos», un solo sonido al final, el de la mejor carta.

Entrevista terminada (6 de 6).
