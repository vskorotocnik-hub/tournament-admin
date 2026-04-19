/**
 * Sandbox tab — lets operators dry-run the smartDebit algorithm
 * against arbitrary pocket balances without touching the DB. Useful
 * for verifying "what will happen if user X buys item Y" before
 * approving an edge case, and for explaining spread math to new hires.
 */
import { useState } from 'react';
import { adminCurrencyApi, type Currency } from '../../lib/currencyApi';

const CURRENCIES: Currency[] = ['USD', 'UAH', 'RUB', 'EUR', 'PLN'];

interface DebitPlan {
  plan: {
    steps: Array<{ pocket: string; amountInPocket: string; amountInTarget: string }>;
    spreadInTarget: string;
    totalInTarget: string;
  };
}

interface ConvertResult {
  from: Currency; to: Currency;
  input: string; output: string; crossRate: string;
}

export default function CurrencySandboxTab() {
  const [op, setOp] = useState<'smartDebit' | 'convert'>('smartDebit');

  // smartDebit inputs
  const [pocketUsd, setPocketUsd] = useState('100');
  const [pocketUah, setPocketUah] = useState('0');
  const [pocketRub, setPocketRub] = useState('0');
  const [targetAmount, setTargetAmount] = useState('50');
  const [targetCurrency, setTargetCurrency] = useState<Currency>('UAH');
  const [applySpread, setApplySpread] = useState(true);
  const [spreadPct, setSpreadPct] = useState('3');

  // convert inputs
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState<Currency>('USD');
  const [convTo, setConvTo] = useState<Currency>('UAH');

  const [result, setResult] = useState<DebitPlan | ConvertResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null); setResult(null);
    try {
      if (op === 'smartDebit') {
        const res = await adminCurrencyApi.simulate({
          op: 'smartDebit',
          pockets: { USD: pocketUsd, UAH: pocketUah, RUB: pocketRub },
          amount: targetAmount,
          currency: targetCurrency,
          applySpread,
          spreadPct: Number(spreadPct),
        });
        setResult(res as DebitPlan);
      } else {
        const res = await adminCurrencyApi.simulate({
          op: 'convert',
          amount: convAmount,
          from: convFrom,
          to: convTo,
        });
        setResult(res as ConvertResult);
      }
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setOp('smartDebit'); setResult(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${op === 'smartDebit' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 border border-zinc-700 text-zinc-400'}`}
          >
            Списание за покупку
          </button>
          <button
            onClick={() => { setOp('convert'); setResult(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${op === 'convert' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 border border-zinc-700 text-zinc-400'}`}
          >
            Конвертация по курсу
          </button>
        </div>

        {op === 'smartDebit' && (
          <div className="space-y-3">
            <h4 className="text-white font-semibold">Карманы пользователя (синтетические)</h4>
            <div className="grid grid-cols-3 gap-3">
              <PocketInput label="USD" value={pocketUsd} onChange={setPocketUsd} />
              <PocketInput label="UAH" value={pocketUah} onChange={setPocketUah} />
              <PocketInput label="RUB" value={pocketRub} onChange={setPocketRub} />
            </div>

            <h4 className="text-white font-semibold mt-4">Параметры списания</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PocketInput label="Сумма покупки" value={targetAmount} onChange={setTargetAmount} />
              <div>
                <label className="text-xs text-zinc-500 uppercase">Валюта цены</label>
                <select
                  value={targetCurrency}
                  onChange={e => setTargetCurrency(e.target.value as Currency)}
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={applySpread} onChange={e => setApplySpread(e.target.checked)} />
                Применять спред
              </label>
              {applySpread && (
                <div>
                  <input
                    type="number" step="0.1"
                    value={spreadPct}
                    onChange={e => setSpreadPct(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-white text-xs w-20"
                  />
                  <span className="text-zinc-500 text-xs ml-1">%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {op === 'convert' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <PocketInput label="Сумма" value={convAmount} onChange={setConvAmount} />
            <div>
              <label className="text-xs text-zinc-500 uppercase">Из</label>
              <select
                value={convFrom}
                onChange={e => setConvFrom(e.target.value as Currency)}
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase">В</label>
              <select
                value={convTo}
                onChange={e => setConvTo(e.target.value as Currency)}
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        <button
          onClick={run}
          disabled={loading}
          className="mt-5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold"
        >
          {loading ? 'Расчёт...' : 'Выполнить'}
        </button>

        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
      </div>

      {/* Result */}
      {result && op === 'smartDebit' && 'plan' in result && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">План списания</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Stat label="Всего к списанию" value={`${result.plan.totalInTarget} ${targetCurrency}`} />
            <Stat label="Из них — маржа платформы" value={`${result.plan.spreadInTarget} ${targetCurrency}`} />
          </div>
          <table className="w-full text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className="text-left py-1.5">Карман</th>
                <th className="text-right py-1.5">Списать из кармана</th>
                <th className="text-right py-1.5">Вклад в сумму покупки</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {result.plan.steps.map((s, i) => (
                <tr key={i} className="border-b border-zinc-800">
                  <td className="py-1.5">{s.pocket}</td>
                  <td className="py-1.5 text-right font-mono">{s.amountInPocket}</td>
                  <td className="py-1.5 text-right font-mono">{s.amountInTarget}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && op === 'convert' && 'crossRate' in result && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">Результат конверсии</h3>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Списано" value={`${result.input} ${result.from}`} />
            <Stat label="Получено" value={`${result.output} ${result.to}`} />
            <Stat label="Кросс-курс" value={result.crossRate} />
          </div>
        </div>
      )}
    </div>
  );
}

function PocketInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500 uppercase">{label}</span>
      <input
        type="number" step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
      <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
      <p className="text-lg font-bold text-white mt-1 font-mono">{value}</p>
    </div>
  );
}
