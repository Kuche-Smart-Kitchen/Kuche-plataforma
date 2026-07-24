"use client";

import { motion } from "framer-motion";

type CatalogFiltersProps = {
  primaryCategories: string[];
  secondaryCategories: string[];
  activePrimary: string;
  activeSecondary: string;
  onPrimaryChange: (category: string) => void;
  onSecondaryChange: (category: string) => void;
};

export default function CatalogFilters({
  primaryCategories,
  secondaryCategories,
  activePrimary,
  activeSecondary,
  onPrimaryChange,
  onSecondaryChange,
}: CatalogFiltersProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/80 p-2 shadow-lg shadow-black/5 backdrop-blur">
        {primaryCategories.map((category) => {
          const isActive = category === activePrimary;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onPrimaryChange(category)}
              className="relative px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              {isActive && (
                <motion.span
                  layoutId="activePrimaryCategory"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 ${
                  isActive ? "text-white" : "text-secondary"
                }`}
              >
                {category}
              </span>
            </button>
          );
        })}
      </div>

      <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/70 p-2 shadow-lg shadow-black/5 backdrop-blur">
        {secondaryCategories.map((category) => {
          const isActive = category === activeSecondary;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onSecondaryChange(category)}
              className="relative px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]"
            >
              {isActive && (
                <motion.span
                  layoutId="activeSecondaryCategory"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 ${
                  isActive ? "text-white" : "text-secondary"
                }`}
              >
                {category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
