// ====== Code Summary ======
// The panel's words in the user's language: English or French, from the
// language Home Assistant gives the panel (English for any other). The
// panel sets the language once `hass` arrives; every view reads it through
// `t()`, and numbers and dates through `locale()`.

import { STRINGS, type StringKey } from "./strings";

let language: keyof typeof STRINGS = "en";
let localeTag = "en";

/** Follows Home Assistant's language ("fr", "fr-FR", "en-GB"…). */
export function setLanguage(tag: string | undefined): void {
  localeTag = tag || "en";
  const base = localeTag.split("-")[0]?.toLowerCase() ?? "en";
  language = base in STRINGS ? (base as keyof typeof STRINGS) : "en";
}

/** The locale numbers and dates are written in. */
export function locale(): string {
  return localeTag;
}

/** A sentence in the user's language, `{name}` replaced by its value. */
export function t(key: StringKey, values: Record<string, string | number> = {}): string {
  const text = STRINGS[language][key] ?? STRINGS.en[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** One or many: `{key}_one` or `{key}_other`, with `{count}`. */
export function plural(
  key: string,
  count: number,
  values: Record<string, string | number> = {},
): string {
  const form = count === 1 ? "one" : "other";
  return t(`${key}_${form}` as StringKey, { count, ...values });
}

export type { StringKey };

/** When a memory was saved: "at 18:03" today, "yesterday at 22:10", else "on 12 Nov at 9:30". */
export function savedWhen(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" });
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days === 0) return t("when_today", { time });
  if (days === 1) return t("when_yesterday", { time });
  const day = date.toLocaleDateString(localeTag, { day: "numeric", month: "short" });
  return t("when_date", { date: day, time });
}
