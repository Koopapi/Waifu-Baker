import { NextResponse, type NextRequest } from "next/server";

// Expone la ruta a los layouts: el panel registra intentos denegados (spec 003, RF-2) y «Mis
// sobres» vuelve a la misma página tras el login (spec 004, RF-2).
export function middleware(req: NextRequest) {
  // El laboratorio usa imágenes de relleno de fan art: solo existe en desarrollo.
  if (req.nextUrl.pathname.startsWith("/lab") && process.env.NODE_ENV === "production" && process.env.ENABLE_LAB !== "1") {
    return new NextResponse("Not found", { status: 404 });
  }
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/admin/:path*", "/sobres/:path*", "/coleccion/:path*", "/lab", "/lab/:path*"] };
