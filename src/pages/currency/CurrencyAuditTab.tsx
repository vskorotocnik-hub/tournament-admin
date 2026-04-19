/**
 * Audit tab — tamper-evident feed of admin actions (config updates,
 * balance adjustments, payment approvals). Every row is one
 * AdminAuditLog entry.
 */
import { useEffect, useState } from 'react';
import { adminCurrencyApi, type AdminAuditEntry } from '../../lib/currencyApi';

const ENTITIES = ['ALL', 'DynamicConfig', 'ExchangeRate', 'User', 'Payment'] as const;
const ACTIONS = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'ADJUST'] as const;

type EntityFilter = typeof ENTITIES[number];
type ActionFilter = typeof ACTIONS[number];

export default function CurrencyAuditTab() {
  const [rows, setRows] = useState<AdminAuditEntry[]>([]);
  const [entity, setEntity] = useState<EntityFilter>('ALL');
  const [action, setAction] = useState<ActionFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await adminCurrencyApi.audit({
        entity: entity === 'ALL' ? undefined : entity,
        action: action === 'ALL' ? undefined : action,
        limit: 200,
      });
      setRows(res.audit);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [entity, action]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mr-2">Entity</label>
          <select
            value={entity}
            onChange={e => setEntity(e.target.value as EntityFilter)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs"
          >
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mr-2">Action</label>
          <select
            value={action}
            onChange={e => setAction(e.target.value as ActionFilter)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs"
          >
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button onClick={load} className="ml-auto text-zinc-500 hover:text-white text-sm">↻ обновить</button>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8 text-center">Загрузка...</div>
      ) : rows.length === 0 ? (
        <div className="text-zinc-500 py-8 text-center">Нет записей</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950 text-zinc-500">
              <tr>
                <th className="text-left px-3 py-2">Дата</th>
                <th className="text-left px-3 py-2">Кто</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Действие</th>
                <th className="text-left px-3 py-2">Сущность</th>
                <th className="text-left px-3 py-2">Причина</th>
                <th className="text-left px-3 py-2">IP</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map(r => (
                <>
                  <tr key={r.id} className="hover:bg-zinc-950/50">
                    <td className="px-3 py-2 text-zinc-400">{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-3 py-2 text-white">{r.actor?.username ?? (r.actorId ? r.actorId.slice(0, 8) : '—')}</td>
                    <td className="px-3 py-2 text-zinc-400">{r.actorRole}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${actionTone(r.action)}`}>{r.action}</span>
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {r.entity}
                      {r.entityId && <span className="text-zinc-600"> ({r.entityId.slice(0, 8)})</span>}
                    </td>
                    <td className="px-3 py-2 text-zinc-400 max-w-xs truncate">{r.reason ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-500">{r.ip ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="text-emerald-400 hover:text-emerald-300 text-[10px]"
                      >
                        {expanded === r.id ? 'скрыть' : 'детали'}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="bg-zinc-950">
                      <td colSpan={8} className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase mb-1">Before</p>
                            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-300 overflow-auto max-h-48">
                              {JSON.stringify(r.before ?? '—', null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase mb-1">After</p>
                            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-300 overflow-auto max-h-48">
                              {JSON.stringify(r.after ?? '—', null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function actionTone(action: string): string {
  switch (action) {
    case 'CREATE': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'UPDATE': return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'DELETE': return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'ADJUST': return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    default:       return 'bg-zinc-700 text-zinc-300 border-zinc-600';
  }
}
