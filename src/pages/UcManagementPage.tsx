import { useState, useEffect, useCallback } from 'react';
import * as ucApi from '../lib/ucApi';
import type { UcProduct, CodeStats, PendingOrder, AdminOrder, UcStats, AdminWithdrawal, MarketplaceStats } from '../lib/ucApi';
import * as siteTopupApi from '../lib/siteTopupApi';
import type { TopupOrder } from '../lib/siteTopupApi';

type Tab = 'pending' | 'products' | 'codes' | 'history' | 'withdrawals' | 'site_topup' | 'sellers';

export default function UcManagementPage() {
  const [tab, setTab] = useState<Tab>('pending');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Игровая валюта (UC)</h1>

      {/* Stats Dashboard */}
      <StatsDashboard />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { id: 'pending', label: 'Новые заказы', icon: '🔔' },
          { id: 'products', label: 'Продукты', icon: '📦' },
          { id: 'codes', label: 'Коды', icon: '🔑' },
          { id: 'history', label: 'История', icon: '📋' },
          { id: 'withdrawals', label: 'Вывод UC', icon: '💎' },
          { id: 'site_topup', label: 'Пополнение сайта', icon: '💰' },
          { id: 'sellers', label: 'Аналитика', icon: '📊' },
        ] as { id: Tab; label: string; icon: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingOrdersTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'codes' && <CodesTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'site_topup' && <SiteTopupTab />}
      {tab === 'sellers' && <SellersTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATS DASHBOARD — revenue, profit, orders, codes
// ═══════════════════════════════════════════════════════════════

function StatsDashboard() {
  const [stats, setStats] = useState<UcStats | null>(null);

  useEffect(() => {
    ucApi.getStats().then(setStats).catch(() => {});
    const t = setInterval(() => ucApi.getStats().then(setStats).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {/* Today */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 col-span-2">
        <p className="text-xs text-zinc-500 mb-1">Сегодня</p>
        <div className="flex items-baseline gap-3">
          <p className="text-2xl font-bold text-emerald-400">${stats.revenue.today.toFixed(2)}</p>
          <p className="text-sm text-zinc-400">{stats.revenue.todayOrders} заказов</p>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 mb-1">Выручка</p>
        <p className="text-xl font-bold text-white">${stats.revenue.total.toFixed(2)}</p>
      </div>

      {/* Profit */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 mb-1">Прибыль</p>
        <p className={`text-xl font-bold ${stats.revenue.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          ${stats.revenue.profit.toFixed(2)}
        </p>
      </div>

      {/* Orders */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 mb-1">Заказы</p>
        <p className="text-xl font-bold text-white">{stats.orders.total}</p>
        <div className="flex gap-2 mt-1 text-xs flex-wrap">
          <span className="text-emerald-400">✅{stats.orders.completed}</span>
          <span className="text-red-400">❌{stats.orders.failed}</span>
          {stats.orders.manual > 0 && <span className="text-orange-400">🔧{stats.orders.manual}</span>}
          {stats.orders.refunded > 0 && <span className="text-purple-400">↩️{stats.orders.refunded}</span>}
          {stats.orders.pending > 0 && <span className="text-amber-400">⏳{stats.orders.pending}</span>}
        </div>
      </div>

      {/* Codes */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 mb-1">Коды</p>
        <p className={`text-xl font-bold ${stats.codes.available > 5 ? 'text-emerald-400' : stats.codes.available > 0 ? 'text-amber-400' : 'text-red-400'}`}>
          {stats.codes.available}
        </p>
        <p className="text-xs text-zinc-500 mt-1">из {stats.codes.total} доступно</p>
      </div>

      {/* Total UC held by users */}
      <div className="bg-zinc-900 rounded-xl border border-yellow-500/20 p-4">
        <p className="text-xs text-zinc-500 mb-1">💎 UC у пользователей</p>
        <p className="text-xl font-bold text-yellow-400">{stats.totalUserUcBalance.toLocaleString()}</p>
        <p className="text-xs text-zinc-500 mt-1">суммарный UC-баланс</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PENDING ORDERS TAB — main workflow for admin
// ═══════════════════════════════════════════════════════════════

function PendingOrdersTab() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    ucApi.getPendingOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const handleComplete = async (id: string) => {
    if (!confirm('Вы активировали код на Midasbuy? Подтвердить выполнение?')) return;
    setProcessing(id);
    try {
      await ucApi.completeOrder(id);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleFail = async (id: string) => {
    const reason = prompt('Причина отказа (необязательно):');
    if (reason === null) return;
    setProcessing(id);
    try {
      await ucApi.failOrder(id, reason || undefined);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading && orders.length === 0) {
    return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-900 rounded-xl border border-zinc-800">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-zinc-400">Нет заказов на обработку</p>
        <p className="text-zinc-600 text-xs mt-1">Обновляется автоматически каждые 10 сек</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">Заказов на обработку: <span className="text-emerald-400 font-bold">{orders.length}</span></p>
      {orders.map(order => (
        <div key={order.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center text-lg">💎</div>
              <div>
                <p className="text-white font-bold">{order.productLabel}</p>
                <p className="text-xs text-zinc-500">от {order.user.nick} • {new Date(order.createdAt).toLocaleString('ru')}</p>
              </div>
            </div>
            <span className="text-emerald-400 font-bold">${order.price.toFixed(2)}</span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-800/50 rounded-lg p-3 text-sm">
            <div>
              <span className="text-zinc-500">Player ID:</span>
              <p className="text-white font-mono font-bold">{order.playerId}</p>
            </div>
            <div>
              <span className="text-zinc-500">Никнейм:</span>
              <p className="text-white font-bold">{order.playerNick || '—'}</p>
            </div>
          </div>

          {/* Code — THE KEY PART */}
          {order.fullCode && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-400 mb-1">Код для активации на Midasbuy:</p>
              <p className="text-white font-mono font-bold text-lg tracking-wider select-all">{order.fullCode}</p>
              <button
                onClick={() => navigator.clipboard.writeText(order.fullCode!)}
                className="mt-1 text-xs text-amber-400 hover:text-amber-300"
              >
                📋 Скопировать код
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-zinc-800/30 rounded-lg p-2 text-xs text-zinc-500">
            <p>1. Откройте <a href="https://www.midasbuy.com/midasbuy/ru/redeem/pubgm" target="_blank" className="text-emerald-400 underline">Midasbuy Redeem</a></p>
            <p>2. Введите Player ID: <span className="text-white font-mono">{order.playerId}</span></p>
            <p>3. Введите код и подтвердите</p>
            <p>4. Нажмите "Выполнено" ниже</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleComplete(order.id)}
              disabled={processing === order.id}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white font-semibold text-sm transition-all"
            >
              {processing === order.id ? '...' : '✅ Выполнено'}
            </button>
            <button
              onClick={() => handleFail(order.id)}
              disabled={processing === order.id}
              className="px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-medium text-sm transition-all"
            >
              ❌ Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════

function ImageUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Только изображения'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Макс. размер 5 МБ'); return; }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await ucApi.uploadImage(base64);
      onChange(url);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative w-20 h-14 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-500"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="w-20 h-14 rounded-lg border-2 border-dashed border-zinc-700 flex items-center justify-center shrink-0">
          <span className="text-zinc-600 text-xs">Нет</span>
        </div>
      )}
      <label className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
        uploading ? 'bg-zinc-700 text-zinc-500' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
      }`}>
        {uploading ? 'Загрузка...' : value ? 'Заменить' : 'Загрузить'}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
      </label>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<UcProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ucAmount: '', label: '', price: '', costPrice: '', bonusUc: '0', imageUrl: null as string | null, originalPrice: '', discountPercent: '0', sortOrder: '0' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    ucApi.getProducts().then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ ucAmount: '', label: '', price: '', costPrice: '', bonusUc: '0', imageUrl: null, originalPrice: '', discountPercent: '0', sortOrder: '0' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (p: UcProduct) => {
    setForm({
      ucAmount: String(p.ucAmount),
      label: p.label,
      price: String(Number(p.price)),
      costPrice: String(Number(p.costPrice)),
      bonusUc: String(p.bonusUc),
      imageUrl: p.imageUrl || null,
      originalPrice: p.originalPrice ? String(Number(p.originalPrice)) : '',
      discountPercent: String(p.discountPercent ?? 0),
      sortOrder: String(p.sortOrder),
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.ucAmount || !form.label || !form.price) { alert('Заполните все поля'); return; }
    setSaving(true);
    try {
      const data = {
        ucAmount: parseInt(form.ucAmount),
        label: form.label,
        price: parseFloat(form.price),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
        bonusUc: parseInt(form.bonusUc) || 0,
        imageUrl: form.imageUrl,
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        discountPercent: parseInt(form.discountPercent) || 0,
        sortOrder: parseInt(form.sortOrder) || 0,
      };
      if (editingId) {
        await ucApi.updateProduct(editingId, data);
      } else {
        await ucApi.createProduct(data);
      }
      resetForm();
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: UcProduct) => {
    try {
      await ucApi.updateProduct(p.id, { isActive: !p.isActive });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (p: UcProduct) => {
    if (!confirm(`Удалить "${p.label}" со ВСЕМИ кодами и историей заказов? Это действие необратимо!`)) return;
    try {
      await ucApi.deleteProduct(p.id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Продуктов: {products.length}</p>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all">
          + Новый продукт
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
          <p className="text-white font-semibold text-sm">{editingId ? 'Редактировать продукт' : 'Новый продукт'}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input value={form.ucAmount} onChange={e => setForm({...form, ucAmount: e.target.value})} placeholder="Кол-во UC (660)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
            <input value={form.label} onChange={e => setForm({...form, label: e.target.value})} placeholder="Название (660 UC)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
            <input value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="Цена продажи ($)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
            <input value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} placeholder="Себестоимость ($)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
            <input value={form.bonusUc} onChange={e => setForm({...form, bonusUc: e.target.value})} placeholder="Бонус UC" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
            <input value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} placeholder="Старая цена (зачёркнутая)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
            <input value={form.discountPercent} onChange={e => setForm({...form, discountPercent: e.target.value})} placeholder="Скидка %" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
            <input value={form.sortOrder} onChange={e => setForm({...form, sortOrder: e.target.value})} placeholder="Порядок" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm" />
          </div>

          {/* Image upload */}
          <div>
            <p className="text-xs text-zinc-400 mb-2">Картинка пакета:</p>
            <ImageUploader value={form.imageUrl} onChange={url => setForm({...form, imageUrl: url})} />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg">
              {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать'}
            </button>
            {editingId && (
              <button onClick={resetForm} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg">
                Отмена
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {products.map(p => (
            <div key={p.id} className={`flex items-center justify-between bg-zinc-900 rounded-xl border p-4 ${p.isActive ? 'border-zinc-800' : 'border-red-500/30 opacity-60'}`}>
              <div className="flex items-center gap-3">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.label} className="w-12 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-zinc-600 shrink-0">UC</div>
                )}
                <div>
                  <p className="text-white font-bold">{p.label}</p>
                  <p className="text-xs text-zinc-500">{p.ucAmount} UC {p.bonusUc > 0 ? `+ ${p.bonusUc} бонус` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-white font-bold">${Number(p.price).toFixed(2)}</p>
                  <p className="text-xs text-zinc-500">себест: ${Number(p.costPrice).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">{(p as any)._count?.codes ?? '?'}</p>
                  <p className="text-xs text-zinc-500">кодов</p>
                </div>
                <button onClick={() => startEdit(p)} className="px-3 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all" title="Редактировать">
                  ✏️
                </button>
                <button onClick={() => toggleActive(p)} className={`px-3 py-1 rounded text-xs font-medium ${p.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {p.isActive ? 'Активен' : 'Выключен'}
                </button>
                <button onClick={() => handleDelete(p)} className="px-3 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all" title="Удалить продукт и все коды">
                  🗑
                </button>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CODES TAB
// ═══════════════════════════════════════════════════════════════

function CodesTab() {
  const [stats, setStats] = useState<CodeStats[]>([]);
  const [products, setProducts] = useState<UcProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [codesText, setCodesText] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    Promise.all([ucApi.getCodeStats(), ucApi.getProducts()])
      .then(([s, p]) => { setStats(s); setProducts(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!selectedProduct) { alert('Выберите продукт'); return; }
    const codes = codesText.split('\n').map(c => c.trim()).filter(c => c.length > 0);
    if (codes.length === 0) { alert('Введите коды'); return; }
    setAdding(true);
    try {
      const result = await ucApi.addCodes(selectedProduct, codes);
      alert(`Добавлено ${result.added} из ${result.total} кодов`);
      setCodesText('');
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.productId} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-bold">{s.label}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${s.available > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {s.available > 0 ? `${s.available} в наличии` : 'Нет кодов!'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="text-emerald-400 font-bold">{s.available}</p><p className="text-zinc-500">Доступно</p></div>
              <div><p className="text-blue-400 font-bold">{s.redeemed}</p><p className="text-zinc-500">Использ.</p></div>
              <div><p className="text-zinc-400 font-bold">{s.total}</p><p className="text-zinc-500">Всего</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Add codes */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
        <p className="text-white font-semibold">Загрузить коды</p>
        <select
          value={selectedProduct}
          onChange={e => setSelectedProduct(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
        >
          <option value="">Выберите продукт</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.label} (${Number(p.price).toFixed(2)})</option>
          ))}
        </select>
        <textarea
          value={codesText}
          onChange={e => setCodesText(e.target.value)}
          placeholder="Вставьте коды (по одному на строку)"
          rows={6}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm font-mono resize-y"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">{codesText.split('\n').filter(c => c.trim()).length} кодов</p>
          <button onClick={handleAdd} disabled={adding} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg">
            {adding ? 'Загрузка...' : 'Загрузить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════

function HistoryTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    ucApi.getOrders(statusFilter || undefined, page)
      .then(r => { setOrders(r.orders); setPages(r.pages); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    PENDING:    { label: 'Ожидает',     color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',   icon: '⏳' },
    PROCESSING: { label: 'В обработке', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',      icon: '🔄' },
    COMPLETED:  { label: 'Выполнен',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✅' },
    FAILED:     { label: 'Ошибка',      color: 'bg-red-500/20 text-red-400 border-red-500/30',         icon: '❌' },
    MANUAL:     { label: 'Вручную',     color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🔧' },
    REFUNDED:   { label: 'Возврат',     color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '↩️' },
  };

  const filterButtons: { value: string; label: string }[] = [
    { value: '', label: 'Все' },
    { value: 'PENDING', label: '⏳ Ожидает' },
    { value: 'PROCESSING', label: '🔄 В обработке' },
    { value: 'COMPLETED', label: '✅ Выполнен' },
    { value: 'MANUAL', label: '🔧 Вручную' },
    { value: 'FAILED', label: '❌ Ошибка' },
    { value: 'REFUNDED', label: '↩️ Возврат' },
  ];

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Фильтры по статусу */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {filterButtons.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                statusFilter === f.value
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Всего: {total}</p>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-xl border border-zinc-800">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-zinc-400">Нет заказов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(o => {
            const st = statusLabels[o.status] || { label: o.status, color: 'bg-zinc-700 text-zinc-400 border-zinc-600', icon: '❓' };
            const isExpanded = expanded === o.id;
            return (
              <div key={o.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                {/* Основная строка */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : o.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{st.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{o.productLabel}</p>
                        <span className="text-zinc-600 text-xs">→</span>
                        <p className="text-amber-400 text-sm font-medium truncate">{o.playerNick || o.playerId}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>👤 {o.user.nick}</span>
                        <span>•</span>
                        <span>{new Date(o.createdAt).toLocaleString('ru')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-white font-bold text-sm">${o.price.toFixed(2)}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${st.color}`}>
                      {st.label}
                    </span>
                    <span className={`text-zinc-500 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {/* Развёрнутые детали */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-4 space-y-3 bg-zinc-900/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Покупатель */}
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Покупатель</p>
                        <p className="text-white text-sm font-medium">{o.user.nick}</p>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{o.user.id.slice(0, 12)}…</p>
                      </div>
                      {/* Игрок */}
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Игрок (PUBG)</p>
                        <p className="text-white text-sm font-medium">{o.playerNick || '—'}</p>
                        <p className="text-xs text-amber-400 font-mono mt-0.5">ID: {o.playerId}</p>
                      </div>
                      {/* Продукт */}
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Продукт</p>
                        <p className="text-white text-sm font-medium">{o.productLabel}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{o.ucAmount} UC • ${o.price.toFixed(2)}</p>
                      </div>
                      {/* Даты */}
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Даты</p>
                        <p className="text-xs text-zinc-400">Создан: {new Date(o.createdAt).toLocaleString('ru')}</p>
                        {o.completedAt && <p className="text-xs text-emerald-400">Выполнен: {new Date(o.completedAt).toLocaleString('ru')}</p>}
                        {o.refundedAt && <p className="text-xs text-purple-400">Возврат: {new Date(o.refundedAt).toLocaleString('ru')}</p>}
                      </div>
                    </div>

                    {/* Код активации */}
                    {(o.fullCode || o.code) && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Код активации</p>
                        <div className="flex items-center gap-3">
                          <p className="text-white font-mono font-bold text-sm tracking-wider select-all">
                            {o.fullCode || o.code}
                          </p>
                          {o.fullCode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); copyCode(o.fullCode!, o.id); }}
                              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              {copiedCode === o.id ? '✅ Скопировано' : '📋 Копировать'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ошибка бота */}
                    {o.botError && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Ошибка бота (попыток: {o.botAttempts})</p>
                        <p className="text-red-300 text-sm">{o.botError}</p>
                      </div>
                    )}

                    {/* Действия */}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      {o.status === 'MANUAL' && (
                        <>
                          <button
                            onClick={async () => {
                              if (!confirm('Вы активировали код на Midasbuy вручную? Подтвердить выполнение заказа?')) return;
                              try { await ucApi.completeOrder(o.id); load(); } catch (err: any) { alert(err.message); }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all"
                          >
                            ✅ Выполнить
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Вернуть заказ в очередь бота?')) return;
                              setRetrying(o.id);
                              try { await ucApi.retryOrder(o.id); load(); } catch (err: any) { alert(err.message); } finally { setRetrying(null); }
                            }}
                            disabled={retrying === o.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
                          >
                            {retrying === o.id ? '...' : '🔄 В очередь бота'}
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt('Причина отклонения (необязательно):');
                              if (reason === null) return;
                              try { await ucApi.failOrder(o.id, reason || undefined); load(); } catch (err: any) { alert(err.message); }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
                          >
                            ❌ Отклонить + возврат
                          </button>
                        </>
                      )}
                      {o.status === 'FAILED' && (
                        <button
                          onClick={async () => {
                            if (!confirm('Вернуть заказ в очередь? Деньги снова заморозятся у пользователя.')) return;
                            setRetrying(o.id);
                            try { await ucApi.retryOrder(o.id); load(); } catch (err: any) { alert(err.message); } finally { setRetrying(null); }
                          }}
                          disabled={retrying === o.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
                        >
                          {retrying === o.id ? '...' : '🔄 Повторить заказ'}
                        </button>
                      )}
                      {o.status === 'COMPLETED' && (
                        <button
                          onClick={async () => {
                            if (!confirm('Вернуть деньги пользователю? Это необратимо.')) return;
                            try { await ucApi.refundOrder(o.id); load(); } catch (err: any) { alert(err.message); }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 transition-all"
                        >
                          ↩️ Возврат средств
                        </button>
                      )}
                      <p className="text-[10px] text-zinc-600 self-center ml-auto font-mono">{o.id}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Пагинация */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700 transition-all"
          >
            ← Назад
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(pages, 10) }, (_, i) => {
              const p = pages <= 10 ? i + 1 : 
                page <= 5 ? i + 1 :
                page >= pages - 4 ? pages - 9 + i :
                page - 5 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    page === p ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700 transition-all"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WITHDRAWALS TAB — bot-automated UC balance withdrawals
// ═══════════════════════════════════════════════════════════════

const W_STATUS: Record<string, string> = {
  PENDING: '⏳ Ожидает',
  PROCESSING: '🔄 Обработка',
  COMPLETED: '✅ Выполнен',
  FAILED: '❌ Ошибка',
  MANUAL: '🛠 Ручная',
  REFUNDED: '↩️ Возврат',
};

function WithdrawalsTab() {
  const [items, setItems] = useState<AdminWithdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    ucApi.getWithdrawals(filter || undefined, page)
      .then(r => { setItems(r.orders); setTotal(r.total); setPages(r.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (id: string) => {
    if (!confirm('Вернуть UC пользователю и отменить вывод?')) return;
    setBusy(id);
    try {
      await ucApi.adminRefundWithdrawal(id);
      load();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(null);
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Подтвердить вывод? UC уже зачислены в игру.')) return;
    setBusy(id);
    try {
      await ucApi.adminCompleteWithdrawal(id);
      load();
    } catch (e: any) { alert(e.message || 'Ошибка'); }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm">Всего: <span className="text-white font-semibold">{total}</span></p>
        <div className="flex gap-2">
          {['', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL', 'REFUNDED'].map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {s || 'Все'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">Нет заявок на вывод</div>
      ) : (
        <div className="space-y-2">
          {items.map(w => (
            <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      w.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                      w.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                      w.status === 'MANUAL' ? 'bg-amber-500/20 text-amber-400' :
                      w.status === 'REFUNDED' ? 'bg-zinc-500/20 text-zinc-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {W_STATUS[w.status] || w.status}
                    </span>
                    <span className="text-yellow-400 font-bold text-sm">💎 {w.ucCost} UC</span>
                    <span className="text-zinc-400 text-xs">{w.productLabel}</span>
                  </div>
                  <p className="text-white text-sm font-medium">{w.playerNick || '—'} <span className="text-zinc-500 font-mono text-xs">({w.playerId})</span></p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    👤 {w.user.nick} · {new Date(w.createdAt).toLocaleString('ru-RU')}
                    {w.botAttempts > 0 && <span className="ml-2">🤖 попыток: {w.botAttempts}</span>}
                  </p>
                  {w.botError && (
                    <p className="text-red-400 text-xs mt-1 bg-red-500/10 rounded px-2 py-1 font-mono">{w.botError}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {(w.status === 'MANUAL' || w.status === 'PENDING' || w.status === 'PROCESSING') && (
                    <>
                      <button
                        onClick={() => handleComplete(w.id)}
                        disabled={busy === w.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium disabled:opacity-50 transition-all"
                      >
                        ✅ Выполнен
                      </button>
                      <button
                        onClick={() => handleRefund(w.id)}
                        disabled={busy === w.id}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium disabled:opacity-50 transition-all"
                      >
                        ↩️ Вернуть UC
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700">
            ← Назад
          </button>
          <span className="text-zinc-400 text-xs">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700">
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SITE TOPUP — orders list (auto-processed, read-only)
// ═══════════════════════════════════════════════════════════════

function SiteTopupTab() {
  const [orders, setOrders] = useState<TopupOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await siteTopupApi.getOrders({ status: filter || undefined, page, limit: 20 });
      setOrders(res.orders);
      setTotal(res.total);
      setFailed(res.pending);
      setPages(res.pages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (s: string) => {
    if (s === 'APPROVED') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">Зачислено</span>;
    if (s === 'REJECTED') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Ошибка</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{s}</span>;
  };

  return (
    <div className="space-y-4">
      <p className="text-zinc-500 text-xs">Зачисление автоматическое · Пакеты берутся из каталога UC</p>

      <div className="flex gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-1">
          <p className="text-zinc-500 text-xs">Всего операций</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-1">
          <p className="text-zinc-500 text-xs">Ошибок</p>
          <p className={`text-2xl font-bold ${failed > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{failed}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}>
            {s === '' ? 'Все' : s === 'APPROVED' ? 'Зачислены' : 'Ошибки'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Нет операций</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left pb-2 pl-3">Пользователь</th>
                <th className="text-left pb-2">Пакет</th>
                <th className="text-right pb-2">UC</th>
                <th className="text-right pb-2">Цена</th>
                <th className="text-center pb-2">Статус</th>
                <th className="text-right pb-2">Дата</th>
                <th className="text-left pb-2 pl-3">Ошибка</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition ${o.status === 'REJECTED' ? 'bg-red-950/10' : ''}`}>
                  <td className="py-3 pl-3">
                    <div className="flex items-center gap-2">
                      {o.user.avatar ? <img src={o.user.avatar} className="w-7 h-7 rounded-full" alt="" /> : (
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                          {(o.user.displayName || o.user.username)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-xs font-medium">{o.user.displayName || o.user.username}</p>
                        <p className="text-zinc-500 text-[10px]">@{o.user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-zinc-400 text-xs">{o.label || '—'}</td>
                  <td className="py-3 text-right">
                    <span className="text-white font-medium">{o.ucAmount}</span>
                    {o.bonusUc > 0 && <span className="text-amber-400 text-xs ml-1">+{o.bonusUc}</span>}
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-medium">${Number(o.price).toFixed(2)}</td>
                  <td className="py-3 text-center">{statusBadge(o.status)}</td>
                  <td className="py-3 text-right text-zinc-500 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="py-3 pl-3 text-xs max-w-[200px]">
                    {o.status === 'REJECTED' && o.adminNote ? <span className="text-red-400 break-words">{o.adminNote}</span> : <span className="text-zinc-700">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700">← Назад</button>
          <span className="text-zinc-400 text-xs">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-700">Вперёд →</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS — UC purchase/withdrawal analytics by user and product
// ═══════════════════════════════════════════════════════════════

function SellersTab() {
  const [data, setData] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ucApi.getMarketplaceStats().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-12 text-zinc-500 text-sm">Ошибка загрузки</div>;

  const { sellers: buyers, totals } = data;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-zinc-500 text-xs">Покупок UC</p>
          <p className="text-2xl font-bold text-white">{totals.deals}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-zinc-500 text-xs">Сумма покупок</p>
          <p className="text-2xl font-bold text-emerald-400">${totals.revenue.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-zinc-500 text-xs">Выводов UC</p>
          <p className="text-2xl font-bold text-yellow-400">{totals.platformFees.toFixed(0)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-zinc-500 text-xs">Сумма выводов</p>
          <p className="text-2xl font-bold text-blue-400">${totals.sellerEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Top buyers / withdrawers */}
      {buyers.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Нет данных</div>
      ) : (
        <div className="overflow-x-auto">
          <h3 className="text-white font-bold text-sm mb-3">Топ пользователей по UC операциям</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-center pb-2 w-10">#</th>
                <th className="text-left pb-2">Пользователь</th>
                <th className="text-right pb-2">Покупок</th>
                <th className="text-right pb-2">Потрачено</th>
                <th className="text-right pb-2">Выводов</th>
                <th className="text-right pb-2 pr-3">Выведено</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map(s => (
                <tr key={s.userId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                  <td className="py-3 text-center">
                    <span className={`text-sm font-bold ${s.rank <= 3 ? 'text-amber-400' : 'text-zinc-600'}`}>
                      {s.rank <= 3 ? ['🥇', '🥈', '🥉'][s.rank - 1] : s.rank}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {s.avatar ? <img src={s.avatar} className="w-7 h-7 rounded-full" alt="" /> : (
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                          {(s.displayName || s.username)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-xs font-medium">{s.displayName || s.username}</p>
                        <p className="text-zinc-500 text-[10px]">@{s.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right text-white font-medium">{s.deals}</td>
                  <td className="py-3 text-right text-emerald-400 font-medium">${s.revenue.toFixed(2)}</td>
                  <td className="py-3 text-right text-yellow-400">{Math.round(s.platformFees)}</td>
                  <td className="py-3 text-right pr-3 text-blue-400 font-bold">${s.sellerEarnings.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

