import type { account as en } from "../en/account";

export const account: typeof en = {
  title: "Mi cuenta",
  subscription: "Suscripción de Patreon",
  tier: "Tier",
  noTier: "Sin tier de pago",
  status: "Estado",
  statusLabel: { active_patron: "Patron activo", declined_patron: "Pago rechazado", former_patron: "Ex patron", none: "No eres patron" },
  packsPerMonth: "Sobres al mes",
  lastCharge: "Último cobro",
  noCharge: "Todavía ninguno",
  syncedAt: (when) => `Actualizado desde Patreon: ${when}`,
  joinPatreon: "Hazte patron para recibir sobres cada mes.",
  albumHidden: "Tu álbum público está oculto. Mira por qué y pide una revisión.",
  albumHiddenLink: "Ir a los ajustes del álbum",
  adult: {
    title: "Contenido 18+",
    verified: "Verificado: puedes ver y abrir las colecciones 18+.",
    needTier: "Para ver las colecciones 18+ necesitas un tier adulto activo en Patreon. Una vez verificado, conservas el acceso aunque canceles después.",
    canDeclare: "Tu tier de Patreon incluye colecciones 18+. Confirma tu edad para desbloquearlas.",
    confirm: "Confirmo que tengo 18 años o más.",
    submit: "Desbloquear contenido 18+",
    done: "Edad verificada. Las colecciones 18+ ya están desbloqueadas.",
  },
  delete: {
    title: "Borrar cuenta",
    body: "Tu cuenta se desactivará y se cerrará tu sesión. Si vuelves a entrar con el mismo Patreon antes de 30 días, recuperas todo. Pasados 30 días se borran para siempre tus cartas, sobres y álbum.",
    button: "Borrar mi cuenta",
    confirm: "¿Borrar tu cuenta? Tienes 30 días para arrepentirte entrando de nuevo.",
  },
};
