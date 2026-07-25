import { NextResponse } from "next/server";

const DEFAULT_INSTAGRAM_URL =
  "https://www.instagram.com/cocinasinteligenteskuche?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v22.0";

function getMetaAccessToken(): string | null {
  const directToken = process.env.META_OEMBED_ACCESS_TOKEN?.trim();
  if (directToken) return directToken;

  const appId = process.env.META_APP_ID?.trim();
  const appClientToken = process.env.META_APP_CLIENT_TOKEN?.trim();

  if (appId && appClientToken) {
    return `${appId}|${appClientToken}`;
  }

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const instagramUrl = requestUrl.searchParams.get("url")?.trim() || DEFAULT_INSTAGRAM_URL;

  const accessToken = getMetaAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_meta_access_token",
        message:
          "Define META_OEMBED_ACCESS_TOKEN o META_APP_ID + META_APP_CLIENT_TOKEN para usar oEmbed de Meta.",
        instagramUrl,
      },
      { status: 200 },
    );
  }

  const endpoint = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/instagram_oembed`);
  endpoint.searchParams.set("url", instagramUrl);
  endpoint.searchParams.set("access_token", accessToken);
  endpoint.searchParams.set("omitscript", "true");
  endpoint.searchParams.set("maxwidth", "540");

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      next: { revalidate: 300 },
    });

    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "meta_oembed_error",
          status: response.status,
          metaError: payload,
          instagramUrl,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      instagramUrl,
      html: payload.html as string | undefined,
      authorName: payload.author_name as string | undefined,
      authorUrl: payload.author_url as string | undefined,
      title: payload.title as string | undefined,
      thumbnailUrl: payload.thumbnail_url as string | undefined,
      providerName: payload.provider_name as string | undefined,
      providerUrl: payload.provider_url as string | undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "meta_oembed_network_error",
        message: error instanceof Error ? error.message : "No se pudo consultar Meta oEmbed.",
        instagramUrl,
      },
      { status: 200 },
    );
  }
}
