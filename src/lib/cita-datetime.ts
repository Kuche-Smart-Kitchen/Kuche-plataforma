export const MEXICO_CITY_TIME_ZONE = "America/Mexico_City";

const pad2 = (value: number | string) => String(value).padStart(2, "0");

const getPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string =>
  parts.find((part) => part.type === type)?.value ?? "";

/** Clave YYYY-MM-DD en el calendario local del navegador (no UTC). */
export const toLocalDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Interpreta `fechaAgendada` (ISO UTC o local) en America/Mexico_City. */
export function parseFechaAgendadaInMexicoCity(value: unknown): { date: string; time: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { date: toLocalDateKey(new Date()), time: "09:00" };
  }

  const raw = value.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return {
      date: raw.slice(0, 10),
      time: raw.length >= 16 ? raw.slice(11, 16) : "09:00",
    };
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_CITY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);

  const hourRaw = getPart(parts, "hour");
  const hour = hourRaw === "24" ? "00" : pad2(hourRaw);

  return {
    date: `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")}`,
    time: `${hour}:${pad2(getPart(parts, "minute"))}`,
  };
}

/** Convierte fecha+hora de pared en Mexico City a ISO UTC. */
export function mexicoCityDateTimeToISO(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "09:00").split(":").map(Number);
  const utcGuess = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0);
  const { date: zoneDate, time: zoneTime } = parseFechaAgendadaInMexicoCity(new Date(utcGuess).toISOString());
  const zoneAsUtc = Date.UTC(
    Number(zoneDate.slice(0, 4)),
    Number(zoneDate.slice(5, 7)) - 1,
    Number(zoneDate.slice(8, 10)),
    Number(zoneTime.slice(0, 2)),
    Number(zoneTime.slice(3, 5)),
    0,
  );
  const offset = zoneAsUtc - utcGuess;
  return new Date(utcGuess - offset).toISOString();
}

export function fechaAgendadaToKanbanDueDate(value: string): string {
  const { date, time } = parseFechaAgendadaInMexicoCity(value);
  return `${date}T${time}`;
}
