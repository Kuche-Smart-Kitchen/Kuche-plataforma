"use client";

type CatalogFiltersProps = {
  primaryCategories: string[];
  secondaryCategories: string[];
  activePrimary: string;
  activeSecondary: string;
  onPrimaryChange: (category: string) => void;
  onSecondaryChange: (category: string) => void;
};

const rowClassName =
  "scrollbar-hide flex w-full snap-x gap-3 overflow-x-auto whitespace-nowrap pb-2 md:flex-wrap md:justify-center md:overflow-visible";

const pillBaseClassName =
  "shrink-0 snap-center rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:tracking-[0.15em]";

function pillClassName(isActive: boolean) {
  return [
    pillBaseClassName,
    isActive
      ? "bg-[#6F1414] text-white shadow-md"
      : "border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-accent/30 hover:text-primary",
  ].join(" ");
}

export default function CatalogFilters({
  primaryCategories,
  secondaryCategories,
  activePrimary,
  activeSecondary,
  onPrimaryChange,
  onSecondaryChange,
}: CatalogFiltersProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className={rowClassName}>
        {primaryCategories.map((category) => {
          const isActive = category === activePrimary;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onPrimaryChange(category)}
              className={pillClassName(isActive)}
              aria-pressed={isActive}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className={rowClassName}>
        {secondaryCategories.map((category) => {
          const isActive = category === activeSecondary;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onSecondaryChange(category)}
              className={pillClassName(isActive)}
              aria-pressed={isActive}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
