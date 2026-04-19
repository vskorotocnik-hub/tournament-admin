/**
 * Admin CurrencyPage — single entry point for operators to monitor
 * and tune the multicurrency subsystem. Organized as a horizontal tab
 * strip to reuse the layout idiom from other admin pages:
 *
 *   ┌─ Dashboard ─ Rates ─ Config ─ Payments ─ Conversions ─ Audit ─ Sandbox ─┐
 *
 * Each tab is rendered as a sibling component — keep this file as a
 * router, not a god-component. All business logic lives in
 * `currencyApi`.
 */
import { useState } from 'react';
import CurrencyDashboardTab from './currency/CurrencyDashboardTab';
import CurrencyRatesTab from './currency/CurrencyRatesTab';
import CurrencyConfigTab from './currency/CurrencyConfigTab';
import CurrencyPaymentsTab from './currency/CurrencyPaymentsTab';
import CurrencyConversionsTab from './currency/CurrencyConversionsTab';
import CurrencyAuditTab from './currency/CurrencyAuditTab';
import CurrencySandboxTab from './currency/CurrencySandboxTab';

type TabId = 'dashboard' | 'rates' | 'config' | 'payments' | 'conversions' | 'audit' | 'sandbox';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'dashboard',   label: 'Дашборд',    icon: '📊' },
  { id: 'rates',       label: 'Курсы',      icon: '📈' },
  { id: 'config',      label: 'Настройки',  icon: '⚙️' },
  { id: 'payments',    label: 'Платежи',    icon: '💳' },
  { id: 'conversions', label: 'Конверсии',  icon: '🔁' },
  { id: 'audit',       label: 'Аудит',      icon: '📋' },
  { id: 'sandbox',     label: 'Песочница',  icon: '🧪' },
];

export default function CurrencyPage() {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Мультивалютность</h1>
        <p className="text-zinc-500 text-sm">Мониторинг и управление кошельками, курсами и платежами.</p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-emerald-400 border-emerald-500'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="pt-2">
        {tab === 'dashboard'   && <CurrencyDashboardTab />}
        {tab === 'rates'       && <CurrencyRatesTab />}
        {tab === 'config'      && <CurrencyConfigTab />}
        {tab === 'payments'    && <CurrencyPaymentsTab />}
        {tab === 'conversions' && <CurrencyConversionsTab />}
        {tab === 'audit'       && <CurrencyAuditTab />}
        {tab === 'sandbox'     && <CurrencySandboxTab />}
      </div>
    </div>
  );
}
