import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "kuche_session";

type SessionPayload = {
  token: string;
  user: unknown;
};

const buildCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SessionPayload>;
    const token = typeof body?.token === "string" ? body.token : "";
    const user = body?.user;

    if (!token || !user) {
      return NextResponse.json({ success: false, message: "Sesión inválida" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: JSON.stringify({ token, user }),
      ...buildCookieOptions(),
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, message: "No se pudo guardar la sesión" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionValue) {
    return NextResponse.json({ success: false, message: "No hay sesión activa" }, { status: 401 });
  }

  try {
    const parsed = JSON.parse(sessionValue) as SessionPayload;
    return NextResponse.json({
      success: true,
      data: {
        token: parsed.token,
        user: parsed.user,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Sesión inválida" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    ...buildCookieOptions(),
    maxAge: 0,
  });
  return response;
}
