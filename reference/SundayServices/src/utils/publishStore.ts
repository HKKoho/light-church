import { ChurchService } from '../types/bulletin';

const STORAGE_KEY = 'bulletinpro_published_services';
const EVENT_NAME = 'bulletinpro:published-changed';

export function getPublishedServices(): ChurchService[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChurchService[]) : [];
  } catch {
    return [];
  }
}

function setPublishedServices(services: ChurchService[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function publishService(service: ChurchService) {
  const current = getPublishedServices();
  const next = [service, ...current.filter((s) => s.id !== service.id)];
  setPublishedServices(next);
}

export function unpublishService(id: string) {
  setPublishedServices(getPublishedServices().filter((s) => s.id !== id));
}

export function subscribeToPublishedServices(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}
