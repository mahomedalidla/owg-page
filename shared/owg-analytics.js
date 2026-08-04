/**
 * Google Analytics 4 (gtag) para OWG.
 * Si OWG_APP_CONFIG.gaMeasurementId está vacío, no carga nada.
 */
(function (global) {
  'use strict';

  var ready = false;
  var queue = [];
  var scriptRequested = false;

  function cfg() {
    return global.OWG_APP_CONFIG || {};
  }

  function resolveId() {
    var id = String(cfg().gaMeasurementId || '').trim();
    if (!id || /^G-X+$/i.test(id) || id === 'G-XXXXXXXX') return '';
    return id;
  }

  function flushQueue() {
    while (queue.length) {
      var item = queue.shift();
      send(item.name, item.params, item.callback);
    }
  }

  function ensureGtag() {
    var measurementId = resolveId();
    if (!measurementId) return false;

    if (!global.dataLayer) global.dataLayer = [];
    if (typeof global.gtag !== 'function') {
      global.gtag = function () {
        global.dataLayer.push(arguments);
      };
    }

    if (!scriptRequested) {
      scriptRequested = true;
      global.gtag('js', new Date());
      global.gtag('config', measurementId, {
        anonymize_ip: true,
        send_page_view: true,
      });

      var s = document.createElement('script');
      s.id = 'owg-ga4';
      s.async = true;
      s.src =
        'https://www.googletagmanager.com/gtag/js?id=' +
        encodeURIComponent(measurementId);
      s.onload = function () {
        ready = true;
        flushQueue();
      };
      s.onerror = function () {
        ready = true;
        flushQueue();
      };
      document.head.appendChild(s);
    }

    return true;
  }

  function send(name, params, callback) {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (typeof callback === 'function') callback();
    }

    if (typeof global.gtag !== 'function') {
      finish();
      return;
    }

    var payload = Object.assign(
      {
        transport_type: 'beacon',
      },
      params || {},
    );

    if (typeof callback === 'function') {
      payload.event_callback = finish;
      payload.event_timeout = 1500;
      setTimeout(finish, 1600);
    }

    global.gtag('event', name, payload);
  }

  function track(name, params, callback) {
    if (!name) {
      if (typeof callback === 'function') callback();
      return;
    }

    if (!ensureGtag()) {
      if (typeof callback === 'function') callback();
      return;
    }

    if (!ready) {
      queue.push({ name: name, params: params || {}, callback: callback });
      return;
    }

    send(name, params, callback);
  }

  function platform() {
    var store = global.OwgStore;
    if (store && store.isIOS && store.isIOS()) return 'ios';
    if (store && store.isAndroid && store.isAndroid()) return 'android';
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent || '')) return 'ios';
    if (/Android/i.test(navigator.userAgent || '')) return 'android';
    return 'desktop';
  }

  function baseParams() {
    var store = global.OwgStore;
    var inApp = !!(store && store.isInAppBrowser && store.isInAppBrowser());
    return {
      platform: platform(),
      in_app_browser: inApp ? '1' : '0',
      page_path: (location.pathname || '/') + (location.search || ''),
    };
  }

  function init() {
    ensureGtag();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.OwgAnalytics = {
    track: track,
    platform: platform,
    baseParams: baseParams,
    isEnabled: function () {
      return !!resolveId();
    },
  };
})(window);
