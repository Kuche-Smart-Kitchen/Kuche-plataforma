"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, type User } from "@/lib/axios";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      if (authApi.isAuthenticated()) {
        const storedUser = authApi.getUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
        } else {
          const response = await authApi.getCurrentUser();
          if (response.success) {
            setUser(response.data);
          }
        }
      }
    } catch (error) {
      console.error("Error verificando autenticacion:", error);
      await authApi.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (correo: string, password: string, captchaToken?: string) => {
    try {
      const response = await authApi.login({ correo, password }, captchaToken);
      if (response.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false, error: response.message || "Error al iniciar sesion" };
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Error al conectar con el servidor";
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };
}