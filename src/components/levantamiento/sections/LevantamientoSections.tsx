import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const cardClassName = "rounded-3xl border border-white/70 bg-white/90 p-6 shadow-md";

export function LevantamientoSectionA({ children }: Props) {
  return (
    <section className={cardClassName}>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function LevantamientoSectionB({ children }: Props) {
  return (
    <section className={cardClassName}>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export function LevantamientoSectionC({ children }: Props) {
  return (
    <section className={cardClassName}>
      {children}
    </section>
  );
}

export function LevantamientoSectionD({ children }: Props) {
  return (
    <section className={cardClassName}>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

export function LevantamientoSectionE({ children }: Props) {
  return (
    <section className={cardClassName}>
      {children}
    </section>
  );
}
