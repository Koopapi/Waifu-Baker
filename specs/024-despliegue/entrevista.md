# Entrevista — Spec 024, despliegue en el VPS

El dueño compró un VPS en Contabo (Cloud VPS 4, región US-east, IP 13.140.231.48) el 28 oct 2026 y quiere «la onda de
los deploys» (publicar al fusionar, como Vercel) y empezar desde cero a subir las cartas con Bruno, con todo guardado
en el servidor. Preguntas del 28 oct 2026:

1. **Despliegues:** Coolify en el propio VPS (panel tipo Vercel, $0 extra), elegido tras comparar costes con GitHub
   Actions + Docker (también $0 extra, sin panel).
2. **Dominio:** `waifubaker.com` (DNS hoy en HostGator Brasil).
3. **Administradores:** usuario y contraseña propios (no Patreon), para él y para Bruno, con segundo factor obligatorio
   por Telegram.
4. **Imágenes y copias:** en el disco del VPS, con copia nocturna cifrada fuera (Cloudflare R2: 10 GB gratis al mes).

5. **Producción:** empieza en cero; las cartas e imágenes se suben allí.
6. **Servidor de pruebas:** sí, con la rama `pruebas`, antes de producción. Nada 18+ hasta la confirmación de Contabo.

Valores por defecto (no preguntados): los coleccionistas siguen entrando con Patreon.
