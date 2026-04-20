/**
 * Normalize i18n value to display string.
 * DB stores {ru: "text", en: "text", uk: "text"} as Json,
 * but admin UI expects plain strings for display.
 */

/** The three languages the backend fills. Anything else is treated as
 * a regular Json blob (e.g. `conditionParams`) and not touched. */
const LANG_KEYS = ['ru', 'en', 'uk'] as const;
type Lang = typeof LANG_KEYS[number];
const LANG_SET = new Set<string>(LANG_KEYS);

/** Coerce any possibly-null/undefined i18n field value to a string,
 * preferring the requested language and falling back through ru → en → uk
 * → any other stringy value. */
export function i18nStr(val: unknown, lang: Lang = 'ru'): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const pick =
      obj[lang] ??
      obj.ru ??
      obj.en ??
      obj.uk ??
      Object.values(obj).find(v => typeof v === 'string' && v.length > 0);
    if (typeof pick === 'string') return pick;
    if (pick != null) return String(pick);
    return '';
  }
  return '';
}

/** Extract the i18n object for editing (form state) */
export function i18nObj(val: unknown): { ru: string; en: string; uk: string } {
  if (!val) return { ru: '', en: '', uk: '' };
  if (typeof val === 'string') return { ru: val, en: '', uk: '' };
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    const s = (k: string) => {
      const v = obj[k];
      return typeof v === 'string' ? v : v == null ? '' : String(v);
    };
    return { ru: s('ru'), en: s('en'), uk: s('uk') };
  }
  return { ru: '', en: '', uk: '' };
}

/**
 * Recursively normalize all i18n JSON objects to strings in API response.
 *
 * Detection rule: an object is treated as an i18n blob iff
 *   - it has at least one of {ru, en, uk} keys, AND
 *   - every own key is one of {ru, en, uk}.
 *
 * That correctly distinguishes `{ru, en, uk}` / `{ru}` / `{ru: null, en: ''}`
 * (all i18n) from arbitrary Json payloads like `conditionParams` or
 * `_count` (left untouched). The previous heuristic (`typeof obj.ru === 'string' && length <= 3`)
 * failed on partial blobs where `ru` was null/empty, leaking the raw object
 * into JSX and tripping React error #31.
 */
export function normalizeI18nResponse(data: unknown, lang: Lang = 'ru'): unknown {
  if (data == null) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => normalizeI18nResponse(item, lang));
  }
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length > 0 && keys.every(k => LANG_SET.has(k)) && keys.some(k => LANG_SET.has(k))) {
    return i18nStr(obj, lang);
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = normalizeI18nResponse(value, lang);
  }
  return result;
}
