import { useState } from 'react';

const LANGS = [
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'uk', flag: '🇺🇦', label: 'UK' },
] as const;

type I18nValue = { ru: string; en?: string; uk?: string };

/** Normalize any incoming value to i18n shape */
export function toI18n(val: unknown): I18nValue {
  if (!val) return { ru: '' };
  if (typeof val === 'string') return { ru: val };
  if (typeof val === 'object' && val !== null && 'ru' in val) return val as I18nValue;
  return { ru: '' };
}

/** Extract display string from i18n (for table cells etc.) */
export function i18nDisplay(val: unknown, lang = 'ru'): string {
  if (typeof val === 'string') return val;
  if (!val || typeof val !== 'object') return '';
  const obj = val as Record<string, string>;
  return obj[lang] || obj.ru || '';
}

interface I18nInputProps {
  value: I18nValue;
  onChange: (val: I18nValue) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  label?: string;
  required?: boolean;
}

export default function I18nInput({ value, onChange, placeholder, multiline, rows = 2, label, required }: I18nInputProps) {
  const [activeLang, setActiveLang] = useState<'ru' | 'en' | 'uk'>('ru');

  const handleChange = (text: string) => {
    onChange({ ...value, [activeLang]: text });
  };

  const currentValue = value[activeLang] || '';

  return (
    <div>
      {label && (
        <label className="block text-xs text-zinc-400 mb-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="flex items-center gap-1 mb-1.5">
        {LANGS.map(lang => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setActiveLang(lang.code)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              activeLang === lang.code
                ? 'bg-blue-600 text-white'
                : value[lang.code]
                  ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
            {value[lang.code] && activeLang !== lang.code && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>
      {multiline ? (
        <textarea
          value={currentValue}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none resize-none"
        />
      ) : (
        <input
          value={currentValue}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
        />
      )}
    </div>
  );
}
