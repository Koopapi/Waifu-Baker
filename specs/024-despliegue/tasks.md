# Tareas — Spec 024

- [x] T1 Servidor: actualizaciones automáticas, SSH solo con llave, cortafuegos. RF: 26, 27.
- [ ] T2 Coolify instalado; cuenta del dueño por túnel SSH con segundo factor. RF: 5, 6.
- [ ] T3 DNS en HostGator y dominios con HTTPS (producción, www, deploy, pruebas). RF: 6, 10.
- [ ] T4 Imagen de la web (Dockerfile, salud, migraciones al arrancar) y aplicaciones de producción y pruebas con su
  Postgres y volúmenes; pruebas con contraseña y sin indexar. RF: 1 a 5, 7 a 9, 11 a 13, 22, 28.
- [x] T5 Administradores con contraseña y Telegram (esquema, servicios, pantallas, comandos, bot). RF: 14 a 21.
  (Pruebas escritas; se corren con la suite antes de producción.)
- [ ] T6 Copias nocturnas a R2 con aviso (hecho en código); restauración documentada (`docs/despliegue.md`) y probada
  en el servidor. RF: 23 a 25.
- [ ] T7 Patreon en el dominio, avisos de Coolify por Telegram, validación y primera carta en producción.
