/**
 * Login - Página de Autenticación
 * 
 * Punto de entrada para la autenticación de usuarios.
 * Soporta múltiples roles: admin, arquitecto, empleado.
 * 
 * Funcionalidades:
 * - Formulario de login con validación
 * - Captcha de seguridad
 * - Redirección basada en rol del usuario
 * - Manejo de errores con mensajes descriptivos
 * - Toggle para mostrar/ocultar contraseña
 * 
 * Estado actual:
 * - ✅ Integrado con AuthContext y authApi
 * - ✅ Merge conflicts resueltos
 * - ✅ Validaciones implementadas
 * 
 * @author Frontend Team
 * @version 2.0 - Merge conflicts resueltos
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Captcha from "@/components/Captcha";
import { getLoginRedirectForUser } from "@/lib/role-routes";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  // Estado del formulario
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  // Estado de la petición
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Maneja el envío del formulario de login
   * Valida el captcha y realiza la autenticación con el backend
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validar captcha
    if (!captchaToken) {
      setStatus("error");
      setErrorMessage("Por favor completa el captcha");
      return;
    }
    
    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await login(correo, password);
      
      if (result.success && result.user) {
        router.push(getLoginRedirectForUser(result.user));
      } else {
        setStatus("error");
        setErrorMessage(result.error || "Credenciales inválidas");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Error al conectar con el servidor");
    }
  };

  return (
    <main className="min-h-screen bg-background text-primary">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-4 py-10 lg:grid-cols-2">
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
            <h1 className="mt-3 text-3xl font-semibold">
              Ecosistema Interno
            </h1>
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
              <h2 className="text-2xl font-semibold">Inicia sesión</h2>
              <p className="mt-2 text-sm text-secondary">
                Acceso interno KUCHE. Ingresa tu correo y contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-secondary">
                Correo electrónico
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3">
                  <User className="h-4 w-4 text-secondary" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    placeholder="Correo electrónico"
                    className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary/60"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block text-sm font-medium text-secondary">
                Contraseña
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-3">
                  <Lock className="h-4 w-4 text-secondary" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="⬢⬢⬢⬢⬢⬢⬢⬢"
                    className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary/60"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-secondary hover:text-primary transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>

              {/* Captcha */}
              <div className="pt-2">
                <Captcha
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => {
                    setCaptchaToken(null);
                    setStatus("error");
                    setErrorMessage("Error al verificar el captcha");
                  }}
                  className="flex justify-center"
                />
              </div>

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
                  className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-600"
                >
                  {errorMessage}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

