"use client";

import { useState } from "react";
import Captcha from "@/components/Captcha";
import MotionSection from "./MotionSection";

export default function LeadForm() {
  const [captchaToken, setCaptchaToken] = useState("");

  return (
    <MotionSection className="bg-accent py-20 mx-4 md:mx-6 rounded-3xl">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg shadow-black/10 md:p-12">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-primary md:text-4xl">
                Inicia tu proyecto
              </h2>
              <p className="mt-4 text-base leading-relaxed text-secondary">
                Cuéntanos lo esencial y en breve un especialista Küche te
                compartirá ideas y recomendaciones personalizadas.
              </p>
            </div>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!captchaToken) return;
              }}
            >
              <input
                type="text"
                placeholder="Nombre"
                className="w-full rounded-2xl border border-secondary/20 bg-[#F9F9F9] px-4 py-3 text-sm text-primary outline-none focus:border-accent"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                className="w-full rounded-2xl border border-secondary/20 bg-[#F9F9F9] px-4 py-3 text-sm text-primary outline-none focus:border-accent"
              />
              <div className="rounded-2xl border border-secondary/20 bg-[#F4F4F4] px-4 py-3">
                <p className="text-xs text-secondary">Verificación de seguridad</p>
                <Captcha
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken("")}
                  onError={() => setCaptchaToken("")}
                  className="mt-3"
                />
              </div>
              <button
                type="submit"
                disabled={!captchaToken}
                className="rounded-full bg-[#6F1414] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Solicitar detalles
              </button>
            </form>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
