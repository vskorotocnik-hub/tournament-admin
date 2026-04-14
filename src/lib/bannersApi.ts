import { apiFetch } from './api';

export type BannerPage = 'home' | 'currency' | 'accounts' | 'rental' | 'boost' | 'partner';

export interface PageBanner {
  id: string;
  page: BannerPage;
  title: string;
  subtitle: string;
  imageUrl: string;
  gradient: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PAGE_LABELS: Record<BannerPage, string> = {
  home: 'Главная',
  currency: 'Игровая валюта',
  accounts: 'Аккаунты',
  rental: 'Аренда аккаунтов',
  boost: 'Буст',
  partner: 'Напарник',
};

export const GRADIENTS = [
  { label: 'Фиолетово-синий', value: 'from-purple-600/80 via-blue-600/60 to-transparent' },
  { label: 'Жёлто-оранжевый', value: 'from-yellow-600/80 via-orange-600/60 to-transparent' },
  { label: 'Красно-оранжевый', value: 'from-red-600/80 via-orange-500/60 to-transparent' },
  { label: 'Сине-голубой', value: 'from-blue-600/80 via-cyan-500/60 to-transparent' },
  { label: 'Зелёный', value: 'from-emerald-600/80 via-teal-500/60 to-transparent' },
  { label: 'Розово-красный', value: 'from-pink-600/80 via-red-500/60 to-transparent' },
  { label: 'Тёмный', value: 'from-zinc-900/90 via-zinc-800/60 to-transparent' },
];

export async function getBanners(page?: BannerPage): Promise<PageBanner[]> {
  const q = page ? `?page=${page}` : '';
  const data = await apiFetch<{ banners: PageBanner[] }>(`/api/admin/banners${q}`);
  return data.banners;
}

export async function createBanner(payload: {
  page: BannerPage;
  title: string;
  subtitle: string;
  imageUrl: string;
  gradient: string;
  sortOrder?: number;
  active?: boolean;
}): Promise<PageBanner> {
  const data = await apiFetch<{ banner: PageBanner }>('/api/admin/banners', {
    method: 'POST',
    body: payload,
  });
  return data.banner;
}

export async function updateBanner(id: string, payload: Partial<{
  title: string;
  subtitle: string;
  imageUrl: string;
  gradient: string;
  sortOrder: number;
  active: boolean;
}>): Promise<PageBanner> {
  const data = await apiFetch<{ banner: PageBanner }>(`/api/admin/banners/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return data.banner;
}

export async function deleteBanner(id: string): Promise<void> {
  await apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
}

export async function uploadBannerImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const data = await apiFetch<{ url: string }>('/api/admin/banners/upload', {
          method: 'POST',
          body: { image: base64 },
        });
        resolve(data.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

export async function reorderBanners(items: { id: string; sortOrder: number }[]): Promise<void> {
  await apiFetch('/api/admin/banners/reorder', {
    method: 'PUT',
    body: { items },
  });
}
