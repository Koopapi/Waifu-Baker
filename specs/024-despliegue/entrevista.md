# Entrevista — Spec 024, despliegue en el VPS

El dueño compró un VPS en Contabo (Cloud VPS 4, región US-east, IP 13.140.231.48) el 28 oct 2026 y quiere «la onda de
los deploys» (publicar al fusionar, como Vercel) y empezar desde cero a subir las cartas con Bruno, con todo guardado
en el servidor. Preguntas del 28 oct 2026:

1. **Despliegues:** Coolify en el propio VPS (panel tipo Vercel, $0 extra), elegido tras comparar costes con GitHub
   Actions + Docker (también $0 extra, sin panel).
2. **Dominio:** el dueño ya tiene dominio. [Nombre por confirmar.]
3. **Administradores:** usuario y contraseña propios (no Patreon), para él y para Bruno. Se propone segundo factor.
4. **Imágenes y copias:** en el disco del VPS, con copia nocturna cifrada fuera (Cloudflare R2: 10 GB gratis al mes).

Valores por defecto (no preguntados): producción empieza con la base vacía; los coleccionistas siguen entrando con
Patreon; las webs de prueba por PR quedan para más adelante.
