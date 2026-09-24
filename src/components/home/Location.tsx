"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

import {
  getGoogleMapsEmbedSrc,
  getGoogleMapsSearchUrl,
  SHOWROOM_ADDRESS_LINE,
} from "@/lib/site-location";
import MotionSection from "./MotionSection";

export default function Location() {
  const embedSrc = getGoogleMapsEmbedSrc();
  const mapsLink = getGoogleMapsSearchUrl();

  return (
    <MotionSection className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-semibold text-primary md:text-4xl">
          Ubicación
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-secondary md:text-base">
          Visítanos en nuestro showroom. Si el mapa no se ve bien en tu red, abre la ubicación
          en Google Maps con el enlace de abajo.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-2 text-primary shadow-sm">
            <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="font-medium">{SHOWROOM_ADDRESS_LINE}</span>
          </span>
          <Link
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary transition hover:border-accent/40 hover:bg-accent/10"
          >
            Abrir en Google Maps
          </Link>
        </div>
        <div className="mt-8 overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-black/10">
          <iframe
            title={`Mapa: ${SHOWROOM_ADDRESS_LINE}`}
            src={embedSrc}
            className="h-[420px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </MotionSection>
  );
}
