"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi, type User } from "@/lib/axios";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (correo: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const storedUser = authApi.getUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
        }

        const restoredSession = await authApi.restoreSession();
        if (!cancelled && restoredSession.success && restoredSession.data) {
          setUser(restoredSession.data.user);
        } else if (!cancelled && !storedUser) {
          setUser(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (correo: string, password: string) => {
    try {
      const response = await authApi.login({ correo, password });
      if (response.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false, error: response.message || "Error al iniciar sesion" };
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number; data?: { message?: string; hint?: string } } })
          .response === "object"
      ) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string; hint?: string } };
        };
        const status = axiosError.response?.status;
        const backendMessage = axiosError.response?.data?.message?.trim();
        const hint = axiosError.response?.data?.hint?.trim();

        if (backendMessage) {
          return {
            success: false,
            error: hint ? `${backendMessage}. ${hint}` : backendMessage,
          };
        }

        if (status === 502 || status === 503) {
          return {
            success: false,
            error:
              "El backend no respondió. Revisa NEXT_PUBLIC_API_URL en Vercel (debe ser una sola URL del backend).",
          };
        }
      }

      if (error instanceof Error && error.message.includes("No se pudo iniciar sesion")) {
        return {
          success: false,
          error: "Credenciales incorrectas o usuario no registrado en el backend.",
        };
      }

      return { success: false, error: "Error al conectar con el servidor. Comprueba /api/health/backend" };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  }
  return context;
}