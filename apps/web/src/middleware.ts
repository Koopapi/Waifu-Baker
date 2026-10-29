import { NextResponse, type NextRequest } from "next/server";

/** Comparación en tiempo constante (sin `node:crypto`: el middleware corre en el entorno edge). */
function sameText(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Spec 024, RF-9: el servidor de pruebas pide una contraseña compartida (`SITE_BASIC_AUTH=usuario:contraseña`). */
function basicAuthOk(req: NextRequest) {
  const expected = process.env.SITE_BASIC_AUTH;
  if (!expected) return true;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  try {
    return sameText(atob(header.slice(6)), expected);
  } catch {
    return false;
  }
}

// Expone la ruta a los layouts: el panel registra intentos denegados (spec 003, RF-2) y «Mis
// sobres» vuelve a la misma página tras el login (spec 004, RF-2).
export function middleware(req: NextRequest) {
  if (!basicAuthOk(req)) {
    return new NextResponse("Autenticación requerida", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Waifu Baker pruebas", charset="UTF-8"' } });
  }
  // El laboratorio usa imágenes de relleno de fan art: solo existe en desarrollo.
  if (req.nextUrl.pathname.startsWith("/lab") && process.env.NODE_ENV === "production" && process.env.ENABLE_LAB !== "1") {
    return new NextResponse("Not found", { status: 404 });
  }
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

// Todo salvo los ficheros estáticos de Next y la comprobación de salud (la usa Coolify, sin contraseña).
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"] };
