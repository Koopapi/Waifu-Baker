import type { LegalSection, legal as en } from "../en/legal";

export const legal: typeof en = {
  footer: {
    terms: "Términos",
    privacy: "Privacidad",
    content: "Contenido e IA",
    odds: "Probabilidades",
    rights: "© Waifu Baker",
  },
  meta: (version, updated) => `Versión ${version} · última actualización ${updated}`,
  contactLabel: "Contacto",
  contactPatreon: "Escríbenos por Patreon",
  gate: {
    title: "Antes de empezar",
    intro: "Waifu Baker es una colección de cartas digitales. Para continuar, confirma lo siguiente.",
    updated: "Hemos actualizado los términos. Revísalos y acéptalos para continuar.",
    age: (n) => `Tengo ${n} años o más.`,
    ageRaised: (n) => `La edad mínima ahora es de ${n} años. Confírmala para continuar.`,
    termsBefore: "He leído y acepto los",
    termsLink: "Términos de uso",
    and: "y la",
    privacyLink: "Política de privacidad",
    submit: "Continuar",
    signOut: "Salir",
    required: "Marca las dos casillas para continuar.",
  },
  docs: {
    terms: {
      title: "Términos de uso",
      sections: [
        { h: "Quiénes somos", p: ["Esta web la gestiona el nombre comercial «Waifu Baker» («nosotros»). Puedes contactarnos en {contact}."] },
        {
          h: "Quién puede usar Waifu Baker",
          p: [
            "Debes tener al menos {minAge} años para usar la web. Al continuar, confirmas que los tienes.",
            "Las colecciones 18+ solo están disponibles para quien declara ser mayor de edad y tiene un tier adulto activo en Patreon. Una vez verificado, el acceso se conserva.",
            "Podemos suspender o cerrar las cuentas que incumplan estos términos.",
          ],
        },
        {
          h: "Tu cuenta",
          p: ["Entras con tu cuenta de Patreon. Cada cuenta es de una sola persona. No la compartas ni crees varias para conseguir más recompensas."],
        },
        {
          h: "Cartas, sobres y galletas digitales",
          p: [
            "Las cartas, los sobres y las galletas son objetos digitales de entretenimiento que solo existen dentro de esta web.",
            "No tienen valor monetario. No se pueden cambiar por dinero, vender, transferir ni intercambiar entre usuarios, y no hay premio por completar una colección.",
            "Podemos corregir o retirar los objetos obtenidos por error, por un fallo o por abuso.",
          ],
        },
        {
          h: "Sobres y probabilidades",
          p: [
            "El contenido de los sobres es aleatorio y lo decide nuestro servidor con las probabilidades publicadas de cada colección, incluida su protección de mala suerte. Las probabilidades publicadas de una colección no cambian nunca.",
            "Por la ley local, los sobres no se pueden abrir desde Bélgica. Tus sobres se conservan.",
          ],
        },
        {
          h: "Pagos",
          p: [
            "Las membresías de pago las gestiona por completo Patreon. Cada cobro mensual pagado concede los sobres de tu tier.",
            "Los reembolsos siguen las políticas de Patreon. Si un cobro se reembolsa o se marca como fraude, se anulan los sobres sin abrir que concedió ese cobro.",
          ],
        },
        {
          h: "Sobres gratis y recompensas diarias",
          p: ["Los sobres gratis y las recompensas diarias son un regalo y pueden cambiar o terminar. Abusar de ellos (por ejemplo, con varias cuentas o cambiando la zona horaria) puede llevar a retirarlos."],
        },
        {
          h: "Contenido",
          p: ["Las ilustraciones de las cartas están generadas con IA y muestran personajes ficticios adultos. Tienes los detalles en la página Contenido e IA. Para avisar de un problema o reclamar derechos, escríbenos a {contact}."],
        },
        {
          h: "Álbumes públicos",
          p: ["Los álbumes públicos son opcionales y están desactivados por defecto. Elige un alias que no sea ofensivo ni engañoso. Podemos ocultar los álbumes que incumplan estos términos."],
        },
        {
          h: "Borrar tu cuenta",
          p: [
            "Puedes borrar tu cuenta desde Mi cuenta. Tienes 30 días para arrepentirte volviendo a entrar.",
            "Pasados 30 días se borran para siempre tus cartas, sobres, galletas y álbum. Se conservan registros anónimos de las aperturas para poder auditar las probabilidades.",
          ],
        },
        { h: "Cambios", p: ["Podemos actualizar estos términos. Cuando lo hagamos, te pediremos aceptar la versión nueva antes de continuar."] },
        {
          h: "Beta y responsabilidad",
          p: ["Waifu Baker está en beta y se ofrece tal cual. Trabajamos para que esté disponible y tu colección esté a salvo, pero pueden ocurrir errores. En la medida en que la ley lo permita, no respondemos de pérdidas indirectas."],
        },
      ] as LegalSection[],
    },
    privacy: {
      title: "Política de privacidad",
      sections: [
        {
          h: "Qué datos guardamos",
          p: [
            "De Patreon: tu identificador de usuario, tu nombre y tu avatar, y el estado de tu membresía (tiers, estado de patron y fecha y estado de tu último cobro). Nunca recibimos tu correo ni tus datos de pago.",
            "De tu uso de la web: tus sobres, cartas, aperturas, álbum público, galletas, recompensas diarias, los días en que estuviste activo y cuándo confirmaste tu edad y aceptaste los términos.",
            "Tu país se comprueba en cada petición solo para aplicar la regla de Bélgica; no se guarda.",
          ],
        },
        {
          h: "Para qué los usamos",
          p: ["Para que la web funcione: conceder y abrir tus sobres, guardar tu colección, comprobar los requisitos de edad, evitar abusos, arreglar errores y ver estadísticas de uso agregadas."],
        },
        {
          h: "Cookies",
          p: ["Solo usamos cookies esenciales: tu sesión, tu idioma y tu zona horaria (para la recompensa diaria). Ninguna cookie de publicidad ni de seguimiento, por eso no hay aviso de cookies."],
        },
        {
          h: "Informes de errores",
          p: ["Cuando algo falla, los detalles técnicos se envían a Sentry, nuestro servicio de avisos de errores. Te identifican solo con un número interno, nunca con tu nombre ni tu identificador de Patreon."],
        },
        {
          h: "Con quién los compartimos",
          p: ["Con Patreon (para que entres y leer tu membresía) y con Sentry (informes de errores). No vendemos tus datos ni los compartimos para publicidad."],
        },
        {
          h: "Cuánto tiempo los guardamos",
          p: [
            "Mientras tu cuenta esté activa. Si la borras, todo se elimina a los 30 días, salvo los registros anónimos de aperturas.",
            "Las copias de seguridad se guardan como máximo 30 días.",
          ],
        },
        {
          h: "Tus derechos",
          p: ["Puedes ver la mayoría de tus datos en Mi cuenta y borrar tu cuenta desde allí. Para pedir una copia de tus datos, corregirlos o cualquier duda, escríbenos a {contact}."],
        },
        { h: "Edad mínima", p: ["La web es para personas de {minAge} años o más. Si sabemos que una cuenta es de alguien menor, la borraremos."] },
        { h: "Cambios", p: ["Podemos actualizar esta política. La versión y la fecha de arriba indican cuándo cambió por última vez."] },
      ] as LegalSection[],
    },
    content: {
      title: "Contenido e IA",
      sections: [
        {
          h: "Ilustraciones generadas con IA",
          p: ["Todas las ilustraciones de las cartas se generan con herramientas de inteligencia artificial y después Waifu Baker las selecciona, les da estilo y las revisa."],
        },
        {
          h: "Personajes originales, ficticios y adultos",
          p: ["Las colecciones de pago solo usan personajes originales. Todos los personajes son adultos ficticios. No aparecen personas reales ni personajes con licencia en el contenido de pago."],
        },
        {
          h: "Colecciones SFW y 18+",
          p: [
            "Las colecciones SFW son aptas para todas las personas que pueden usar la web. Las colecciones 18+ solo se muestran a adultos verificados con un tier adulto activo y nunca aparecen en los álbumes públicos.",
            "Antes de publicar una carta 18+, un administrador la revisa para confirmar que el personaje es claramente adulto.",
          ],
        },
        { h: "Avisar de un problema", p: ["Si crees que una carta incumple estas normas o tus derechos, escríbenos a {contact} y la revisaremos."] },
      ] as LegalSection[],
    },
  },
};
