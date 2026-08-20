"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Lock, User } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import Captcha from "@/components/ui/Captcha";
import { getLoginRedirectForUser } from "@/lib/role-routes";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading, login, user } = useAuthContext();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(getLoginRedirectForUser(user));
    }
  }, [isAuthenticated, loading, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!captchaToken) {
      setStatus("error");
      setErrorMessage("Por favor completa el captcha");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const result = await login(correo.trim(), password, captchaToken);
    if (result.success && result.user) {
      router.push(getLoginRedirectForUser(result.user));
      return;
    }

    setStatus("error");
    setErrorMessage(result.error || "No fue posible iniciar sesion.");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background pt-28 text-primary md:pt-32">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-secondary">Cargando acceso...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-28 text-primary md:pt-32">
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl grid-cols-1 gap-6 px-4 pb-10 md:min-h-[calc(100vh-8rem)] lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl"
        >
          <Image
            src="/images/pagina-login/hero-lateral/fondo-cocina.jpg"
            alt="Cocina Küche"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
          <div className="absolute inset-0 flex flex-col items-start justify-end p-10 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Küche</p>
            <h1 className="mt-3 text-3xl font-semibold">Ecosistema Interno</h1>
            <p className="mt-2 max-w-sm text-sm text-white/80">
              Diseño, producción y clientes conectados en un solo flujo premium.
            </p>
          </div>
          <div className="absolute right-10 top-10 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
            Acceso Restringido
          </div>
        </motion.section>

        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur-md"
          >
            <div className="mb-6">
              <Link
                href="/"
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent/90 hover:underline"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                Volver al sitio web (inicio)
              </Link>
              <h2 className="text-2xl font-semibold">Inicia sesión</h2>
              {status === "error" ? <p className="mt-2 text-sm text-secondary">{errorMessage}</p> : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-secondary">
                Correo
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3">
                  <User className="h-4 w-4 text-secondary" />
                  <input
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    placeholder="correo@empresa.com"
                    className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary/60"
                    autoComplete="username"
                  />
                </div>
              </label>

              <label className="block text-sm font-medium text-secondary">
                Contraseña
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3">
                  <Lock className="h-4 w-4 text-secondary" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="⬢⬢⬢⬢⬢⬢⬢⬢"
                    className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary/60"
                    autoComplete="current-password"
                  />
                </div>
              </label>

              <Captcha
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />

              <button
                type="submit"
                disabled={status === "loading" || !correo || !password || !captchaToken}
                className="flex w-full items-center justify-center rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "loading" ? "Validando..." : "Entrar"}
              </button>
            </form>

            <AnimatePresence>
              {status === "error" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 space-y-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent"
                >
                  <p>{errorMessage}</p>
                  {errorMessage.includes("NEXT_PUBLIC_API_URL") ||
                  errorMessage.includes("backend") ||
                  errorMessage.includes("/api/health/backend") ? (
                    <p className="text-secondary">
                      En Vercel → Settings → Environment Variables, define{" "}
                      <strong className="text-primary">NEXT_PUBLIC_API_URL</strong> con una sola URL, por
                      ejemplo{" "}
                      <code className="rounded bg-white/80 px-1 py-0.5 text-primary">
                        https://backend-cocinas-inteligentes.vercel.app
                      </code>
                      , vuelve a desplegar y prueba{" "}
                      <code className="rounded bg-white/80 px-1 py-0.5 text-primary">/api/health/backend</code>.
                    </p>
                  ) : (
                    <p className="text-secondary">
                      El login usa usuarios registrados en el backend (correo + contraseña). Las variables de
                      entorno no contienen contraseñas; solo la URL del API.
                    </p>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

