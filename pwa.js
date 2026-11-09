/* Installation mobile du Book de vente — aucune donnée métier stockée par la PWA. */
(() => {
  'use strict';
  const installButton = document.getElementById('pwaInstallBtn');
  const help = document.getElementById('pwaInstallHelp');
  const helpText = document.getElementById('pwaHelpText');
  const status = document.getElementById('pwaNetworkStatus');
  if (!installButton || !help || !helpText || !status) return;

  let installPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isAppleMobile = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;
  function updateInstallButton() {
    installButton.hidden = isStandalone() || (!isMobile() && !installPrompt);
  }
  function updateConnectionStatus() {
    status.hidden = navigator.onLine !== false;
  }
  function openHelp() {
    if (isAppleMobile()) {
      helpText.textContent = 'Sur iPhone ou iPad : ouvrez ce site dans Safari, touchez le bouton Partager, puis « Sur l’écran d’accueil » et « Ajouter ».';
    } else if (/Android/i.test(navigator.userAgent)) {
      helpText.textContent = 'Sur Android : ouvrez ce site dans Chrome, puis dans le menu ⋮ choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».';
    } else {
      helpText.textContent = 'Dans le menu de votre navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil » si l’option est proposée.';
    }
    if (typeof help.showModal === 'function') help.showModal();
    else window.alert(helpText.textContent);
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallButton();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    updateInstallButton();
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return openHelp();
    const prompt = installPrompt;
    installPrompt = null;
    installButton.disabled = true;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (_) {
      openHelp();
    } finally {
      installButton.disabled = false;
      updateInstallButton();
    }
  });
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  updateConnectionStatus();
  updateInstallButton();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(error => {
        console.warn('Service worker non enregistré :', error);
      });
    });
  }
})();
