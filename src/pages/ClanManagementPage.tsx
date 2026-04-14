import { useState, useEffect, useCallback } from 'react';
import ClanApplicationsTab from './clan/ClanApplicationsTab';
import ClanMembersTab from './clan/ClanMembersTab';
import ClanDistributionTab from './clan/ClanDistributionTab';
import ClanTowerTab from './clan/ClanTowerTab';
import ClanFinancesTab from './clan/ClanFinancesTab';
import ClanSettingsTab from './clan/ClanSettingsTab';
import ClanDisputesTab from './clan/ClanDisputesTab';
import ClanAuditLogTab from './clan/ClanAuditLogTab';
import ClanPayoutsTab from './clan/ClanPayoutsTab';
import { getClanAdminData } from '../lib/clanApi';
import type { ClanAdminData } from '../lib/clanApi';

type Tab = 'apps'|'members'|'disputes'|'dist'|'tower'|'fin'|'payouts'|'settings'|'audit';
const tabs:[Tab,string,string][] = [['apps','📋','Заявки'],['members','👥','Участники'],['disputes','⚠️','Споры'],['dist','🏆','Распределение'],['tower','🗼','Башня'],['fin','💰','Финансы'],['payouts','�','Выплаты'],['settings','⚙️','Настройки'],['audit','📜','История']];

export default function ClanManagementPage() {
  const [tab, setTab] = useState<Tab>('apps');
  const [data, setData] = useState<ClanAdminData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await getClanAdminData();
      setData(d);
    } catch (err) {
      console.error('Clan admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const distActive = data?.clan.distributionActive ?? false;

  // Summary stats
  const memberCount = data?.members.length ?? 0;
  const maxMembers = data?.clan.maxMembers ?? 10;
  const pendingApps = data?.applications.filter(a => ['PENDING','MATCHED','PLAYED','DISPUTED'].includes(a.status)).length ?? 0;
  const approvedCount = data?.applications.filter(a => a.status === 'APPROVED').length ?? 0;
  const maxFloor = data?.members.length ? Math.max(...data.members.map(m => m.floor)) : 0;
  const treasury = data?.clan.treasury ?? 0;
  const season = data?.clan.season ?? 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Загрузка клана...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-white">Управление кланом</h1><p className="text-zinc-500 text-sm mt-1">Заявки, участники, распределение, башня</p></div>
        <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${distActive?'bg-amber-500 animate-pulse':'bg-emerald-500'}`}/><span className="text-sm text-zinc-400">{distActive?'Идёт распределение...':'Клан активен'}</span></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[['👥','Участников',`${memberCount}/${maxMembers}`],['📋','Заявки',`${pendingApps}`],['✅','Допущены',`${approvedCount}`],['🗼','Макс.этаж',`${maxFloor}`],['💰','Казна',`$${treasury}`],['📅','Сезон',`#${season}`]].map(([i,l,v])=>(
          <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><span className="text-lg">{i}</span><span className="text-zinc-500 text-xs">{l}</span></div><p className="text-white font-bold text-lg">{v}</p></div>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-zinc-800 pb-px">
        {tabs.map(([k,ic,lb])=>(<button key={k} onClick={()=>setTab(k)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${tab===k?'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-400':'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}><span>{ic}</span><span>{lb}</span></button>))}
      </div>
      {tab==='apps' && data && <ClanApplicationsTab applications={data.applications} members={data.members} onRefresh={refresh}/>}
      {tab==='members' && data && <ClanMembersTab members={data.members} maxMembers={data.clan.maxMembers} onRefresh={refresh}/>}
      {tab==='disputes' && <ClanDisputesTab onRefresh={refresh}/>}
      {tab==='dist' && data && <ClanDistributionTab clan={data.clan} members={data.members} applications={data.applications} distributions={data.distributions} onRefresh={refresh}/>}
      {tab==='tower' && data && <ClanTowerTab members={data.members} checkpoints={data.checkpoints} onRefresh={refresh}/>}
      {tab==='fin' && <ClanFinancesTab/>}
      {tab==='payouts' && <ClanPayoutsTab members={data?.members || []} onRefresh={refresh}/>}
      {tab==='settings' && data && <ClanSettingsTab clan={data.clan} onRefresh={refresh}/>}
      {tab==='audit' && <ClanAuditLogTab/>}
    </div>
  );
}
