/**
 * Post-compra OWG: experiencia móvil (app) vs escritorio (solo web).
 */
(function (global) {
  'use strict';

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function storeUrl() {
    var cfg = global.OWG_APP_CONFIG || {};
    var playStore = cfg.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.owg.app';
    var appStore = typeof cfg.appStoreUrl === 'function' ? cfg.appStoreUrl() : cfg.appStoreUrl;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? appStore : playStore;
  }

  /** Intenta abrir la app; si no, ejecuta fallback (p. ej. tienda o formulario web). */
  function tryAppThen(deepLink, fallbackMs, onFallback) {
    if (!isMobile() || !deepLink) {
      if (onFallback) onFallback();
      return;
    }
    var done = false;
    function runFallback() {
      if (done) return;
      done = true;
      if (onFallback) onFallback();
    }
    document.addEventListener('visibilitychange', function onHide() {
      if (document.hidden) done = true;
    }, { once: true });
    window.location.href = deepLink;
    setTimeout(runFallback, fallbackMs || 1800);
  }

  function textos() {
    if (isMobile()) {
      return {
        crearCuenta: 'GUARDAR BOLETO EN LA APP',
        misBoletos: 'VER BOLETOS AQUÍ EN EL NAVEGADOR',
        abrirApp: 'ABRIR O DESCARGAR OWG',
        upsell:
          'Guarda tus boletos en la app, recibe recordatorios y no te pierdas ninguna función.',
        signupIntro: 'Si prefieres no instalar la app, crea tu cuenta aquí:',
        signupOk: '¡Cuenta lista! Tus boletos están guardados.',
      };
    }
    return {
      crearCuenta: 'CREAR CUENTA OWG',
      misBoletos: 'VER MIS BOLETOS AQUÍ',
      abrirApp: null,
      upsell:
        'Tus boletos están en esta página y en tu correo. Preséntalos en la entrada desde aquí o desde el email.',
      signupIntro: 'Crea tu cuenta para guardar este y futuros boletos:',
      signupOk: '¡Cuenta lista! Tus boletos están guardados en OWG.',
    };
  }

  /** Ajusta botones y textos según dispositivo. */
  function aplicarUi(root) {
    root = root || document;
    var t = textos();
    var btnCrear = root.getElementById('btn-crear-cuenta');
    var btnMis = root.getElementById('btn-mis-boletos');
    var btnApp = root.getElementById('btn-abrir-app') || root.getElementById('open-app');
    var upsell = root.getElementById('upsell-text');
    var signupIntro = root.getElementById('signup-intro');

    if (btnCrear && t.crearCuenta) btnCrear.textContent = t.crearCuenta;
    if (btnMis && t.misBoletos) btnMis.textContent = t.misBoletos;
    if (upsell) upsell.innerHTML = t.upsell;

    if (btnApp) {
      if (t.abrirApp) {
        btnApp.textContent = t.abrirApp;
        btnApp.hidden = false;
      } else {
        btnApp.hidden = true;
      }
    }

    var mobileDl = root.getElementById('mobile-download-row');
    if (mobileDl) mobileDl.hidden = !isMobile();

    if (signupIntro) signupIntro.textContent = t.signupIntro;
  }

  global.OwgDeviceFlow = {
    isMobile: isMobile,
    storeUrl: storeUrl,
    tryAppThen: tryAppThen,
    textos: textos,
    aplicarUi: aplicarUi,
  };
})(window);
