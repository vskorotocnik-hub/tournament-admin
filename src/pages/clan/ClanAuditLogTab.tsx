import { useState, useEffect } from 'react';
import { getAuditLog } from '../../lib/clanApi';
import type { AuditLogEntry } from '../../lib/clanApi';

const AL: Record<string, [string, string, string]> = {
  settings_update:        ['⚙️', 'Изменение настроек', 'text-blue-400'],
  application_approve:    ['✅', 'Одобрение заявки', 'text-emerald-400'],
  application_reject:     ['❌', 'Отклонение заявки', 'text-red-400'],
  application_reassign:   ['🔄', 'Переназначение оппонента', 'text-amber-400'],
  match_resolve_dispute:  ['⚖️', 'Решение спора', 'text-purple-400'],
  member_add:             ['➕', 'Добавление участника', 'text-emerald-400'],
  member_kick:            ['🚫', 'Исключение участника', 'text-red-400'],
  member_floor_update:    ['🗼', 'Изменение этажа', 'text-amber-400'],
  distribution_timer_update: ['⏰', 'Таймер распределения', 'text-blue-400'],
  distribution_start:     ['🏁', 'Старт распределения', 'text-emerald-400'],
  distribution_finish:    ['🏆', 'Завершение распределения', 'text-amber-400'],
  tournament_prize:       ['💰', 'Запись приза', 'text-yellow-400'],
  clan_reset:             ['💥', 'Сброс клана', 'text-red-500'],
  clear_applications:     ['🧹', 'Очистка заявок', 'text-orange-400'],
  admin_chat_message:     ['💬', 'Сообщение в чат матча', 'text-blue-300'],
};

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function Details({ details }: { details: string }) {
  let parsed: any = null;
  try { parsed = JSON.parse(details); } catch { return <span className="text-xs text-zinc-500 italic">{details}</span>; }
  const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined);
  return (
    <div className="flex flex-wrap gap-0.5">
      {entries.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 text-xs bg-zinc-800 rounded px-1.5 py-0.5">
          <span className="text-zinc-500">{k}:</span>
          <span className="text-zinc-300 max-w-[180px] truncate">{String(v)}</span>
        </span>
      ))}
    </div>
  );
}

export default function ClanAuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getAuditLog(300).then(r => setLogs(r.logs)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter ? logs.filter(l => l.action === filter) : logs;
  const actions = [...new Set(logs.map(l => l.action))];

  if (loading) return <div className="text-center py-10 text-zinc-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">История действий админов</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-1.5">
          <option value="">Все действия ({logs.length})</option>
          {actions.map(a => { const m = AL[a]; return <option key={a} value={a}>{m ? m[1] : a} ({logs.filter(l=>l.action===a).length})</option>; })}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-zinc-500">Нет записей</div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.map(log => {
            const m = AL[log.action] || ['📝', log.action, 'text-zinc-400'];
            return (
              <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-3">
                <div className="text-xl mt-0.5">{m[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${m[2]}`}>{m[1]}</span>
                    <span className="text-xs text-zinc-600">{fmtDate(log.createdAt)}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">Админ: <span className="text-zinc-300">{log.adminName || log.adminUserId}</span></div>
                  {log.targetId && <div className="text-xs text-zinc-500 mt-0.5">Цель: {log.targetName || log.targetId}</div>}
                  <div className="mt-1.5"><Details details={log.details} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
