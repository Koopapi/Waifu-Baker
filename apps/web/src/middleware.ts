import { NextResponse, type NextRequest } from "next/server";

// Expone la ruta a los layouts: el panel registra intentos denegados (spec 003, RF-2) y «Mis
// sobres» vuelve a la misma página tras el login (spec 004, RF-2).
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/admin/:path*", "/sobres/:path*", "/coleccion/:path*"] };
