'use strict';
let installPrompt;
const installButton = document.querySelector('#install-app');
const storageStatus = document.querySelector('#storage-status');
const offlineStatus = document.querySelector('#offline-status');
const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function updateStorageStatus() {
  try {
    const persistent = await navigator.storage?.persisted?.();
    const estimate = await navigator.storage?.estimate?.();
    const format = bytes => bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(1)} GB` : `${(bytes / 1048576).toFixed(1)} MB`;
    storageStatus.textContent = `${persistent ? 'Persistent storage enabled' : 'Stored on this device'}${estimate?.quota ? ` · ${format(estimate.usage || 0)} used of approximately ${format(estimate.quota)}` : ''}`;
  } catch { storageStatus.textContent = 'Stored on this device · storage estimate unavailable'; }
}
document.querySelector('#protect-storage').onclick = async () => {
  try {
    const granted = await navigator.storage?.persist?.();
    toast(granted ? 'Persistent storage enabled. Keep exporting backups too.' : 'Persistent storage was not granted by this browser. Your records are still saved; keep a backup.');
  } catch { toast('This browser could not grant persistent storage. Your records are still saved.'); }
  await updateStorageStatus();
};
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; installButton.textContent = 'Install app';
});
window.addEventListener('appinstalled', () => { installPrompt = null; installButton.hidden = true; });
installButton.hidden = installed();
installButton.onclick = async () => {
  if (installPrompt) {
    const prompt = installPrompt; installPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; } catch { toast('Use your browser menu to install this app.'); }
  } else document.querySelector('#install-dialog').showModal();
};
document.querySelector('#close-install').onclick = () => document.querySelector('#install-dialog').close();
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').then(async registration => {
    await navigator.serviceWorker.ready;
    offlineStatus.textContent = 'Ready to use offline';
    if (registration.waiting) offlineStatus.textContent = 'Update ready · close all app windows and reopen';
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offlineStatus.textContent = 'Update ready · close all app windows and reopen';
      });
    });
  }).catch(() => { offlineStatus.textContent = 'Offline setup failed · reload while online to retry'; });
} else offlineStatus.textContent = 'Offline installation requires HTTPS or localhost';
updateStorageStatus();
