import { NextRequest, NextResponse } from "next/server";
import { env, resolveBackendApiUrl } from "@/lib/env";

const METHOD_ALLOWLIST = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

const shouldForwardBody = (method: string) => !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

const buildUpstreamUrl = (request: NextRequest) => {
  const backendBaseUrl = resolveBackendApiUrl().trim() || env.backendApiUrl.trim();
  if (!backendBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL o BACKEND_API_URL no está configurada");
  }

  const pathname = request.nextUrl.pathname.replace(/^\/api\/proxy/, "") || "/";
  const upstreamUrl = new URL(pathname + request.nextUrl.search, backendBaseUrl);
  return upstreamUrl;
};

const applyCorsHeaders = (response: NextResponse): NextResponse => {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Vary", "Origin");
  return response;
};

const forwardRequest = async (request: NextRequest) => {
  let upstreamUrl: URL;
  try {
    upstreamUrl = buildUpstreamUrl(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Configuración de backend inválida";
    return NextResponse.json(
      {
        success: false,
        message,
        hint: "Configura NEXT_PUBLIC_API_URL en Vercel con una sola URL, por ejemplo https://backend-cocinas-inteligentes.vercel.app",
      },
      { status: 503 },
    );
  }

  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  if (!headers.has("x-forwarded-host")) {
    headers.set("x-forwarded-host", request.headers.get("host") ?? "localhost");
  }

  if (!headers.has("x-forwarded-proto")) {
    headers.set("x-forwarded-proto", request.headers.get("x-forwarded-proto") ?? "https");
  }

  const method = request.method.toUpperCase();
  const body = shouldForwardBody(method) ? await request.arrayBuffer() : undefined;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      if (["transfer-encoding", "content-encoding", "connection"].includes(key.toLowerCase())) {
        return;
      }
      responseHeaders.set(key, value);
    });

    if (!responseHeaders.has("cache-control")) {
      responseHeaders.set("cache-control", "no-store");
    }

    const response = new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });

    return applyCorsHeaders(response);
  } catch (error) {
    console.error("[api/proxy] upstream fetch failed", {
      url: upstreamUrl.toString(),
      error,
    });
    return applyCorsHeaders(
      NextResponse.json(
        {
          success: false,
          message: "No se pudo conectar con el backend configurado.",
          hint: "Verifica que NEXT_PUBLIC_API_URL apunte a un backend activo y vuelve a desplegar.",
        },
        { status: 502 },
      ),
    );
  }
};

export async function GET(request: NextRequest) {
  return forwardRequest(request);
}

export async function POST(request: NextRequest) {
  return forwardRequest(request);
}

export async function PUT(request: NextRequest) {
  return forwardRequest(request);
}

export async function PATCH(request: NextRequest) {
  return forwardRequest(request);
}

export async function DELETE(request: NextRequest) {
  return forwardRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Allow", METHOD_ALLOWLIST.join(", "));
  response.headers.set("Access-Control-Allow-Methods", METHOD_ALLOWLIST.join(","));
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");
  return applyCorsHeaders(response);
}

export const dynamic = "force-dynamic";
