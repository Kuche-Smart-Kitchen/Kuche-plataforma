"use client";

import { DateInput } from "@/components/ui/DateInput";
import { DatetimeLocalInput } from "@/components/ui/DatetimeLocalInput";
import {
  dateInputValueToDueDate,
  datetimeLocalValueToDueDate,
  dueDateHasTime,
  dueDateToDateInputValue,
  dueDateToDatetimeLocalValue,
} from "@/lib/kanban-due-datetime";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  className?: string;
};

/**
 * Cita / vencimiento: solo fecha (YYYY-MM-DD) o fecha+hora (YYYY-MM-DDTHH:mm).
 */
export function DueDateInput({ value, onChange, className = "" }: Props) {
  const raw = value?.trim() ?? "";
  const includeTime = dueDateHasTime(value);

  const datePart = raw.split("T")[0] ?? "";

  const toggleTime = (checked: boolean) => {
    if (!checked) {
      onChange(datePart ? datePart : undefined);
      return;
    }
    if (datePart) {
      onChange(`${datePart}T09:00`);
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-secondary">
        <input
          type="checkbox"
          checked={includeTime}
          onChange={(e) => toggleTime(e.target.checked)}
          className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary/30"
        />
        Incluir hora específica
      </label>

      {includeTime ? (
        <DatetimeLocalInput
          value={dueDateToDatetimeLocalValue(value)}
          onChange={(e) => onChange(datetimeLocalValueToDueDate(e.target.value))}
          className="w-full"
        />
      ) : (
        <DateInput
          value={dueDateToDateInputValue(value)}
          onChange={(e) => onChange(dateInputValueToDueDate(e.target.value))}
          className="w-full"
        />
      )}
    </div>
  );
}
