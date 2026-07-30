/**
 * URLs de tienda OWG — no dependen de que exista /owg-app-config.js
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

  function storeUrlForDevice() {
    return isIOS() ? appStoreUrl() : playStoreUrl();
  }

  /** Abre la ficha de tienda (misma pestaña; fiable en Safari/Chrome móvil). */
  function goToStore(url) {
    var href = url || storeUrlForDevice();
    window.location.assign(href);
  }

  /**
   * Intenta abrir la app sin romper la página si no está instalada.
   * iOS: iframe + owg:// (location.href a custom scheme deja Safari inutilizable).
   * Android: intent con fallback a la tienda.
   */
  function tryOpenApp(opts) {
    opts = opts || {};
    var deepLink = opts.deepLink || 'owg://';
    var intentLink = opts.intentLink;
    var storeUrl = opts.storeUrl || storeUrlForDevice();

    if (isAndroid()) {
      window.location.href =
        intentLink ||
        'intent://#Intent;scheme=owg;package=com.owg.app;S.browser_fallback_url=' +
          encodeURIComponent(storeUrl) +
          ';end';
      return;
    }

    if (isIOS()) {
      var ifr = document.createElement('iframe');
      ifr.setAttribute('aria-hidden', 'true');
      ifr.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute';
      ifr.src = deepLink;
      document.body.appendChild(ifr);
      setTimeout(function () {
        try {
          document.body.removeChild(ifr);
        } catch (_) {}
      }, 2000);
      return;
    }

    window.location.assign(storeUrl);
  }

  function bindStoreLink(el, url) {
    if (!el) return;
    var href = url || storeUrlForDevice();
    el.setAttribute('href', href);
    el.removeAttribute('target');
    el.setAttribute('rel', 'noopener noreferrer');
    el.addEventListener('click', function (e) {
      e.preventDefault();
      goToStore(href);
    });
  }

  function bindOpenAppLink(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.setAttribute('href', opts.deepLink || '#');
    el.addEventListener('click', function (e) {
      e.preventDefault();
      tryOpenApp(opts);
    });
  }

  global.OwgStore = {
    playStoreUrl: playStoreUrl,
    appStoreUrl: appStoreUrl,
    storeUrlForDevice: storeUrlForDevice,
    isAndroid: isAndroid,
    isIOS: isIOS,
    goToStore: goToStore,
    tryOpenApp: tryOpenApp,
    bindStoreLink: bindStoreLink,
    bindOpenAppLink: bindOpenAppLink,
  };
})(window);
