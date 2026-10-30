/// <reference lib="webworker" />
/**
 * Service worker : fait marcher l'appli hors ligne (fichiers en cache) et, quand Chrome
 * l'autorise (appli installée), vérifie de temps en temps les rappels pour notifier appli fermée.
 * Il ne contacte aucun serveur.
 */
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

interface RappelPlanifie {
  cle: string;
  titre: string;
  texte: string;
  chemin: string;
  aPartirDu: string;
}

function requete<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, ko) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

/** Lit les rappels préparés par l'appli dans la base locale (table app_reglages). */
async function verifierRappels() {
  const ouverture = indexedDB.open('outil-orga');
  const base = await requete(ouverture);
  try {
    if (!base.objectStoreNames.contains('app_reglages')) return;
    const lire = (cle: string) =>
      requete(base.transaction('app_reglages').objectStore('app_reglages').get(cle)) as Promise<{ valeur: unknown } | undefined>;
    const planifies = ((await lire('rappelsPlanifies'))?.valeur ?? []) as RappelPlanifie[];
    const montres = ((await lire('rappelsMontres'))?.valeur ?? []) as string[];
    const auj = new Date().toISOString().slice(0, 10);
    const dus = planifies.filter((r) => r.aPartirDu <= auj && !montres.includes(r.cle));
    for (const r of dus) {
      await self.registration.showNotification(r.titre, { body: r.texte, tag: r.cle, icon: 'icone-192.png', data: { chemin: r.chemin } });
    }
    if (dus.length) {
      const tx = base.transaction('app_reglages', 'readwrite');
      tx.objectStore('app_reglages').put({ cle: 'rappelsMontres', valeur: [...montres, ...dus.map((r) => r.cle)].slice(-50) });
    }
  } finally {
    base.close();
  }
}

self.addEventListener('periodicsync', (e) => {
  const ev = e as ExtendableEvent & { tag: string };
  if (ev.tag === 'rappels') ev.waitUntil(verifierRappels());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const chemin = (e.notification.data as { chemin?: string } | null)?.chemin ?? '/';
  e.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const url = new URL(`./#${chemin}`, self.registration.scope).href;
      for (const f of fenetres) {
        if ('focus' in f) {
          await (f as WindowClient).navigate(url);
          return (f as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
