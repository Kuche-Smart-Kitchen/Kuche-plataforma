"use client";

import { useState } from "react";
import Captcha from "@/components/ui/Captcha";
import MotionSection from "./MotionSection";

export default function LeadForm() {
  const [captchaToken, setCaptchaToken] = useState("");

  return (
    <MotionSection className="mx-0 rounded-none bg-accent py-14 shadow-xl shadow-black/5 md:mx-auto md:w-[95%] md:max-w-7xl md:rounded-3xl">
      <div className="mx-auto w-full px-6 text-center lg:px-12">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Inicia tu proyecto
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
          Cuéntanos lo esencial y en breve un especialista Küche te compartirá ideas y
          recomendaciones personalizadas.
        </p>

        <form
          className="mx-auto mt-10 flex flex-col gap-4 text-left md:mt-12 md:flex-row md:items-center md:justify-center md:gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!captchaToken) return;
          }}
        >
          <div className="w-full md:w-64 lg:w-72">
            <input
              type="text"
              placeholder="Nombre"
              className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-sm text-white placeholder-white/60 shadow-sm outline-none backdrop-blur-sm transition-all focus:border-white focus:bg-white focus:text-primary focus:placeholder-gray-400 focus:ring-4 focus:ring-white/20"
            />
          </div>

          <div className="w-full md:w-64 lg:w-72">
            <input
              type="tel"
              placeholder="Teléfono"
              className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-sm text-white placeholder-white/60 shadow-sm outline-none backdrop-blur-sm transition-all focus:border-white focus:bg-white focus:text-primary focus:placeholder-gray-400 focus:ring-4 focus:ring-white/20"
            />
          </div>

          <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm md:rounded-full md:p-1">
              <Captcha
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken("")}
                onError={() => setCaptchaToken("")}
              />
            </div>

            <button
              type="submit"
              disabled={!captchaToken}
              className="w-full rounded-full bg-white px-8 py-3.5 text-sm font-bold text-accent shadow-md transition-all duration-300 enabled:hover:scale-105 enabled:hover:bg-gray-50 enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:whitespace-nowrap"
            >
              Solicitar detalles
            </button>
          </div>
        </form>
      </div>
    </MotionSection>
  );
}
