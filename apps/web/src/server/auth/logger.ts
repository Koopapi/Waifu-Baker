// Registro de Auth.js. Una cookie de sesión que no se puede leer (firmada con otra clave, por ejemplo tras
// reiniciar la demo, o caducada) no es un fallo: se trata como «sin sesión» y basta con volver a entrar.
type AuthLogError = Error & { type?: string };

export const authLogger = {
  error(error: AuthLogError) {
    if (error.type === "JWTSessionError") {
      console.warn("[auth] Cookie de sesión no válida (otra clave o caducada): se trata como sin sesión.");
      return;
    }
    console.error(error);
  },
};
