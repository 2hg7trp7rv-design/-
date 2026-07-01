function dispatchUpdateAvailable(registration: ServiceWorkerRegistration): void {
  window.dispatchEvent(
    new CustomEvent('mogumogu:update-available', {
      detail: { registration },
    }),
  );
}

function watchForUpdates(registration: ServiceWorkerRegistration): void {
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        dispatchUpdateAvailable(registration);
      }
    });
  });

  if (registration.waiting && navigator.serviceWorker.controller) {
    dispatchUpdateAvailable(registration);
  }
}

export function registerAppServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        watchForUpdates(registration);
        registration.update().catch(() => undefined);
      })
      .catch(() => undefined);
  });
}
