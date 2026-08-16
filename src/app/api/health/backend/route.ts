import { NextResponse } from "next/server";
import { resolveBackendApiUrl } from "@/lib/env";

export async function GET() {
  const backendUrl = resolveBackendApiUrl();

  if (!backendUrl) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message: "Falta NEXT_PUBLIC_API_URL o BACKEND_API_URL",
        hint: "En Vercel usa una sola URL: https://backend-cocinas-inteligentes.vercel.app",
      },
      { status: 503 },
    );
  }

  try {
    const probe = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    return NextResponse.json({
      ok: probe.ok || probe.status < 500,
      configured: true,
      backendUrl,
      probeStatus: probe.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        backendUrl,
        message: "No se pudo contactar el backend configurado",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}

export const dynamic = "force-dynamic";
