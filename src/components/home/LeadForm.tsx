"use client";

import { useState } from "react";
import Captcha from "@/components/Captcha";
import MotionSection from "./MotionSection";

export default function LeadForm() {
  const [captchaToken, setCaptchaToken] = useState("");

  return (
    <MotionSection className="mx-4 rounded-3xl bg-accent py-24 shadow-xl shadow-black/5 md:mx-6">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold text-white md:text-5xl">
          Inicia tu proyecto
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/90">
          Cuéntanos lo esencial y en breve un especialista Küche te
          compartirá ideas y recomendaciones personalizadas.
        </p>

        <form
          className="mx-auto mt-10 grid w-full max-w-md gap-5 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            if (!captchaToken) return;
          }}
        >
          <input
            type="text"
            placeholder="Nombre"
            className="w-full rounded-2xl border-none bg-white px-5 py-4 text-sm text-primary shadow-inner outline-none transition-all focus:ring-4 focus:ring-white/30"
          />
          <input
            type="tel"
            placeholder="Teléfono"
            className="w-full rounded-2xl border-none bg-white px-5 py-4 text-sm text-primary shadow-inner outline-none transition-all focus:ring-4 focus:ring-white/30"
          />

          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-5 backdrop-blur-sm">
            <p className="mb-3 text-center text-xs font-medium text-white/90">
              Verificación de seguridad
            </p>
            <div className="flex justify-center">
              <Captcha
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken("")}
                onError={() => setCaptchaToken("")}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!captchaToken}
            className="mt-2 rounded-full bg-white px-5 py-4 text-base font-bold text-accent shadow-lg shadow-black/20 transition-all enabled:hover:scale-105 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Solicitar detalles
          </button>
        </form>
      </div>
    </MotionSection>
  );
}
