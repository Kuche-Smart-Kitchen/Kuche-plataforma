import { SeguimientoAuthProvider } from "@/contexts/SeguimientoAuthContext";

export default function SeguimientoLayout({ children }: { children: React.ReactNode }) {
  return <SeguimientoAuthProvider>{children}</SeguimientoAuthProvider>;
}
