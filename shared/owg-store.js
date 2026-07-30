/**
 * URLs de tienda OWG — no dependen de que exista /owg-app-config.js
 * (en producción ese archivo a veces no está desplegado → botón Descargar muerto).
 */
(function (global) {
  'use strict';

  var PLAY_STORE =
    'https://play.google.com/store/apps/details?id=com.owg.app&pcampaignid=web_share';
  var APP_STORE_FALLBACK =
    'https://apps.apple.com/us/app/owg-wrestling-y-lucha-libre/id6780648941';

  function cfg() {
    return global.OWG_APP_CONFIG || {};
  }

  function playStoreUrl() {
    return cfg().playStoreUrl || PLAY_STORE;
  }

  function appStoreUrl() {
    var c = cfg();
    var id = String(c.iosAppStoreId || '').trim();
    if (id) return 'https://apps.apple.com/app/id' + id;
    if (typeof c.appStoreUrl === 'function') {
      try {
        var fromFn = c.appStoreUrl();
        if (fromFn) return fromFn;
      } catch (_) {}
    }
    if (c.appStoreUrl && typeof c.appStoreUrl === 'string') return c.appStoreUrl;
    return c.appStoreSearchUrl || APP_STORE_FALLBACK;
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  }

  /** URL de tienda según el dispositivo (desktop → Play como fallback útil). */
  function storeUrlForDevice() {
    return isIOS() ? appStoreUrl() : playStoreUrl();
  }

  /**
   * Enlaza un <a> a la tienda. Siempre deja href usable + click de respaldo.
   */
  function bindStoreLink(el, url) {
    if (!el) return;
    var href = url || storeUrlForDevice();
    el.setAttribute('href', href);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
    el.addEventListener('click', function (e) {
      // Evita quedarse en href="#" si algo falló al setear.
      var go = el.getAttribute('href') || href;
      if (!go || go === '#' || go === window.location.href) {
        e.preventDefault();
        window.location.href = href;
        return;
      }
      // En WebViews a veces target=_blank no abre la tienda.
      if (isIOS() || isAndroid()) {
        e.preventDefault();
        window.location.href = go;
      }
    });
  }

  global.OwgStore = {
    playStoreUrl: playStoreUrl,
    appStoreUrl: appStoreUrl,
    storeUrlForDevice: storeUrlForDevice,
    isAndroid: isAndroid,
    isIOS: isIOS,
    bindStoreLink: bindStoreLink,
  };
})(window);
