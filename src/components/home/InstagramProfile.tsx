"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Instagram } from "lucide-react";

import MotionSection from "./MotionSection";

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

type InstagramOEmbedResponse = {
  ok: boolean;
  html?: string;
  instagramUrl?: string;
  message?: string;
  error?: string;
};

const INSTAGRAM_PROFILE_URL =
  "https://www.instagram.com/cocinasinteligenteskuche?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

export default function InstagramProfile() {
  const [embedData, setEmbedData] = useState<InstagramOEmbedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEmbed() {
      try {
        const params = new URLSearchParams({ url: INSTAGRAM_PROFILE_URL });
        const response = await fetch(`/api/instagram-oembed?${params.toString()}`);
        const data = (await response.json()) as InstagramOEmbedResponse;

        if (!isMounted) return;
        setEmbedData(data);
      } catch {
        if (!isMounted) return;
        setEmbedData({
          ok: false,
          error: "fetch_error",
          message: "No se pudo cargar Instagram en este momento.",
          instagramUrl: INSTAGRAM_PROFILE_URL,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEmbed();
    return () => {
      isMounted = false;
    };
  }, []);

  const embedHtml = useMemo(() => embedData?.html?.trim() || "", [embedData?.html]);
  const fallbackEmbedHtml = useMemo(
    () =>
      `<blockquote class="instagram-media" data-instgrm-permalink="${INSTAGRAM_PROFILE_URL}" data-instgrm-version="14" style="background:#FFF;border:0;border-radius:12px;box-shadow:0 1px 10px rgba(0,0,0,0.12);margin:1px;max-width:540px;min-width:326px;padding:0;width:100%;"></blockquote>`,
    [],
  );
  const htmlToRender = embedHtml || fallbackEmbedHtml;

  useEffect(() => {
    if (!htmlToRender) return;
    window.instgrm?.Embeds?.process();
  }, [htmlToRender]);

  const profileUrl = embedData?.instagramUrl || INSTAGRAM_PROFILE_URL;

  return (
    <MotionSection className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold text-primary md:text-4xl">Instagram</h2>
            <p className="mt-3 max-w-2xl text-sm text-secondary md:text-base">
              Perfil oficial de Cocinas Inteligentes Kuche integrado con oEmbed de Meta.
            </p>
          </div>
          <Link
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary transition hover:border-accent/40 hover:bg-accent/10"
          >
            <Instagram className="h-4 w-4" aria-hidden />
            Ver perfil
          </Link>
        </div>

        {isLoading ? (
          <div className="h-[420px] animate-pulse rounded-3xl border border-primary/10 bg-white/70" />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-primary/10 bg-white p-4 shadow-xl shadow-black/5">
            <div
              className="instagram-embed-wrap [&_blockquote.instagram-media]:mx-auto [&_blockquote.instagram-media]:!w-full [&_blockquote.instagram-media]:max-w-[540px]"
              dangerouslySetInnerHTML={{ __html: htmlToRender }}
            />
            <Script
              src="https://www.instagram.com/embed.js"
              strategy="lazyOnload"
              onLoad={() => window.instgrm?.Embeds?.process()}
            />
            {!embedData?.ok ? (
              <p className="mt-4 text-xs text-secondary">
                Mostrando vista embebida directa de Instagram. Para oEmbed completo, configura credenciales del Graph API.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </MotionSection>
  );
}
