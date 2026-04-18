/**
 * Admin UI capability catalogue — mirrors server/src/domains/rbac/capabilities.ts.
 *
 * Kept as a plain JS object so the StaffPage can render labelled checkboxes
 * without an extra round trip. If you add a cap on the server, add it here
 * too (server is the source of truth for enforcement; this file is just UX).
 */

export interface CapabilityGroup {
  label: string;
  caps: Array<{ id: string; label: string }>;
}

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    label: '📊 Дашборд',
    caps: [
      { id: 'dashboard.view',     label: 'Просматривать главный дашборд' },
      { id: 'dashboard.finances', label: 'Видеть суммы выручки и статистику денег' },
    ],
  },
  {
    label: '👥 Пользователи',
    caps: [
      { id: 'users.view',         label: 'Просматривать список и профили' },
      { id: 'users.ban',          label: 'Банить / разбанивать' },
      { id: 'users.restrict',     label: 'Ставить ограничения на разделы' },
      { id: 'users.balance',      label: 'Менять баланс $' },
      { id: 'users.uc_balance',   label: 'Менять UC-баланс' },
      { id: 'users.role',         label: 'Менять роль пользователя' },
      { id: 'users.delete',       label: 'Удалять аккаунты' },
      { id: 'users.ip_logs',      label: 'Смотреть IP-логи юзера' },
      { id: 'users.transactions', label: 'Смотреть историю транзакций' },
    ],
  },
  {
    label: '💰 Финансы',
    caps: [
      { id: 'finances.view',          label: 'Видеть раздел финансов' },
      { id: 'finances.revenue',       label: 'Видеть суммы выручки (без этого цифры скрыты)' },
      { id: 'finances.withdrawals',   label: 'Обрабатывать заявки на вывод' },
      { id: 'finances.platform_fees', label: 'Менять комиссии платформы' },
    ],
  },
  {
    label: '🛒 Маркетплейс',
    caps: [
      { id: 'listings.view',     label: 'Смотреть объявления' },
      { id: 'listings.moderate', label: 'Модерировать / удалять объявления' },
    ],
  },
  {
    label: '🔑 Аренда',
    caps: [
      { id: 'rental.view',     label: 'Смотреть аренды' },
      { id: 'rental.moderate', label: 'Модерировать аренды и разрешать споры' },
    ],
  },
  {
    label: '🚀 Буст',
    caps: [
      { id: 'boost.view',     label: 'Смотреть буст-заявки' },
      { id: 'boost.moderate', label: 'Модерировать буст-сделки' },
    ],
  },
  {
    label: '🏆 Турниры',
    caps: [
      { id: 'tournaments.view',     label: 'Смотреть турниры' },
      { id: 'tournaments.moderate', label: 'Отправлять сообщения, отменять' },
      { id: 'tournaments.disputes', label: 'Разрешать споры, назначать победителя' },
      { id: 'tournaments.global',   label: 'Управлять глобальными турнирами' },
    ],
  },
  {
    label: '🏰 Клан',
    caps: [
      { id: 'clan.view',   label: 'Смотреть клан' },
      { id: 'clan.manage', label: 'Управлять заявками, башней, выплатами' },
    ],
  },
  {
    label: '🎨 Контент',
    caps: [
      { id: 'banners.view', label: 'Смотреть баннеры' },
      { id: 'banners.edit', label: 'Создавать и редактировать баннеры' },
      { id: 'lessons.view', label: 'Смотреть уроки' },
      { id: 'lessons.edit', label: 'Создавать и редактировать уроки' },
      { id: 'quests.view',  label: 'Смотреть квесты' },
      { id: 'quests.edit',  label: 'Создавать и редактировать квесты' },
    ],
  },
  {
    label: '🎁 Рефералы',
    caps: [
      { id: 'referrals.view',   label: 'Смотреть реферальную систему' },
      { id: 'referrals.manage', label: 'Настраивать реферальную программу' },
    ],
  },
  {
    label: '💬 Поддержка',
    caps: [
      { id: 'support.view',  label: 'Читать обращения' },
      { id: 'support.reply', label: 'Отвечать пользователям' },
    ],
  },
  {
    label: '🛡 Безопасность',
    caps: [
      { id: 'audit.view',      label: 'Смотреть журнал действий' },
      { id: 'ip_monitor.view', label: 'Смотреть IP-мониторинг' },
      { id: 'security.view',   label: 'Смотреть сессии / 2FA статистику' },
    ],
  },
  {
    label: '⚙ Настройки',
    caps: [
      { id: 'settings.view',          label: 'Видеть раздел настроек' },
      { id: 'config.feature_flags',   label: 'Вкл/выкл модули и режим обслуживания' },
      { id: 'config.dispute_fees',    label: 'Менять комиссии за споры' },
      { id: 'config.username_change', label: 'Менять настройки смены ника' },
      { id: 'push.send',              label: 'Отправлять push-уведомления' },
    ],
  },
  {
    label: '👮 Персонал',
    caps: [
      { id: 'staff.view',   label: 'Видеть список админов и модераторов' },
      { id: 'staff.manage', label: 'Выдавать и отзывать права, удалять персонал' },
    ],
  },
];

/** Flat `{ id: label }` lookup for pretty-printing individual caps. */
export const CAPABILITY_LABELS: Record<string, string> = CAPABILITY_GROUPS
  .flatMap(g => g.caps)
  .reduce<Record<string, string>>((acc, c) => { acc[c.id] = c.label; return acc; }, {});
