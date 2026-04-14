/**
 * Normalize i18n value to display string.
 * DB stores {ru: "text", en: "text", uk: "text"} as Json,
 * but admin UI expects plain strings for display.
 */

export function i18nStr(val: unknown, lang = 'ru'): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    return String(obj[lang] || obj.ru || '');
  }
  return String(val);
}

/** Extract the i18n object for editing (form state) */
export function i18nObj(val: unknown): { ru: string; en: string; uk: string } {
  if (!val) return { ru: '', en: '', uk: '' };
  if (typeof val === 'string') return { ru: val, en: '', uk: '' };
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    return { ru: String(obj.ru || ''), en: String(obj.en || ''), uk: String(obj.uk || '') };
  }
  return { ru: '', en: '', uk: '' };
}

/**
 * Recursively normalize all i18n JSON objects to strings in API response.
 * Detects objects with 'ru' key and converts to string value.
 */
export function normalizeI18nResponse(data: unknown, lang = 'ru'): unknown {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => normalizeI18nResponse(item, lang));
  }
  const obj = data as Record<string, unknown>;
  // Check if this is an i18n object (has 'ru' key and looks like {ru, en, uk})
  if ('ru' in obj && typeof obj.ru === 'string' && Object.keys(obj).length <= 3) {
    return i18nStr(obj, lang);
  }
  // Recursively process nested objects
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = normalizeI18nResponse(value, lang);
  }
  return result;
}
