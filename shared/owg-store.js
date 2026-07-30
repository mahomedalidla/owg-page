/**
 * URLs de tienda OWG + salida de navegadores in-app (Instagram, Facebook, etc.).
 * En esos WebViews https://apps.apple.com / Play a menudo no abre la tienda.
 */
(function (global) {
  'use strict';

  var PLAY_STORE =
    'https://play.google.com/store/apps/details?id=com.owg.app&pcampaignid=web_share';
  var APP_STORE_HTTPS =
    'https://apps.apple.com/us/app/owg-wrestling-y-lucha-libre/id6780648941';
  var IOS_APP_ID = '6780648941';
  var ANDROID_PKG = 'com.owg.app';

  function cfg() {
    return global.OWG_APP_CONFIG || {};
  }

  function iosAppId() {
    var id = String(cfg().iosAppStoreId || '').trim();
    return id || IOS_APP_ID;
  }

  function playStoreUrl() {
    return cfg().playStoreUrl || PLAY_STORE;
  }

  function appStoreUrl() {
    var c = cfg();
    var id = String(c.iosAppStoreId || '').trim() || IOS_APP_ID;
    if (typeof c.appStoreUrl === 'function') {
      try {
        var fromFn = c.appStoreUrl();
        if (fromFn) return fromFn;
      } catch (_) {}
    }
    if (c.appStoreUrl && typeof c.appStoreUrl === 'string') return c.appStoreUrl;
    return c.appStoreSearchUrl || ('https://apps.apple.com/app/id' + id);
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

  /**
   * Instagram, Facebook, TikTok, Snapchat, LinkedIn, Twitter/X, Line, Messenger…
   * Bloquean o limitan abrir App Store / Play desde su WebView.
   */
  function isInAppBrowser() {
    var ua = navigator.userAgent || '';
    return /Instagram|FBAN|FBAV|FB_IAB|Messenger|Line\/|Twitter|TikTok|Bytedance|Snapchat|LinkedInApp|MicroMessenger|GSA\//i.test(
      ua,
    );
  }

  function inAppName() {
    var ua = navigator.userAgent || '';
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/FBAN|FBAV|FB_IAB|Messenger/i.test(ua)) return 'Facebook';
    if (/TikTok|Bytedance/i.test(ua)) return 'TikTok';
    if (/Twitter/i.test(ua)) return 'X';
    if (/Snapchat/i.test(ua)) return 'Snapchat';
    return 'esta app';
  }

  /** Esquemas nativos: suelen romper el WebView hacia la tienda real. */
  function nativeStoreUrl() {
    if (isIOS()) {
      return 'itms-apps://apps.apple.com/app/id' + iosAppId();
    }
    if (isAndroid()) {
      return 'market://details?id=' + ANDROID_PKG;
    }
    return storeUrlForDevice();
  }

  function openExternalBrowserHint() {
    if (isIOS()) {
      return 'Toca ··· (arriba a la derecha) → Abrir en Safari';
    }
    if (isAndroid()) {
      return 'Toca ··· (arriba a la derecha) → Abrir en Chrome / el navegador';
    }
    return 'Abre este enlace en Safari o Chrome';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Abre la tienda. En in-app browser: itms-apps / market primero;
   * en Android también intenta salir a Chrome.
   */
  function goToStore(url) {
    var httpsUrl = url || storeUrlForDevice();
    var native = nativeStoreUrl();

    if (isInAppBrowser()) {
      // 1) Esquema nativo (mejor chance de salir del WebView de Instagram).
      try {
        window.location.href = native;
      } catch (_) {}

      // 2) Android: forzar Chrome con la ficha HTTPS.
      if (isAndroid()) {
        setTimeout(function () {
          var hostPath = httpsUrl.replace(/^https?:\/\//i, '');
          window.location.href =
            'intent://' +
            hostPath +
            '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
            encodeURIComponent(httpsUrl) +
            ';end';
        }, 400);
        return;
      }

      // 3) iOS: si itms-apps no abrió, el banner guía a Safari.
      //    Segundo intento HTTPS por si el WebView lo permite.
      setTimeout(function () {
        if (document.visibilityState === 'visible') {
          try {
            window.location.href = httpsUrl;
          } catch (_) {}
        }
      }, 900);
      return;
    }

    // Navegador normal: HTTPS (o native si preferimos).
    window.location.assign(httpsUrl);
  }

  /**
   * Banner visible cuando el usuario está en Instagram/FB/etc.
   * Inserta instrucciones + Copiar enlace + Descargar.
   */
  function mountInAppHelp(hostEl, opts) {
    opts = opts || {};
    if (!hostEl || !isInAppBrowser()) return null;

    var existing = hostEl.querySelector('.owg-inapp-help');
    if (existing) return existing;

    var name = inAppName();
    var box = document.createElement('div');
    box.className = 'owg-inapp-help';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<p class="owg-inapp-help__title">Estás dentro de ' +
      name +
      '</p>' +
      '<p class="owg-inapp-help__body">' +
      openExternalBrowserHint() +
      '. Así sí podrás descargar OWG.</p>' +
      '<div class="owg-inapp-help__actions">' +
      '<button type="button" class="owg-btn owg-btn--secondary" data-owg-copy>Copiar enlace de descarga</button>' +
      '</div>' +
      '<p class="owg-inapp-help__copied" hidden>Enlace copiado. Pégalo en Safari o Chrome.</p>';

    hostEl.insertBefore(box, hostEl.firstChild);

    var copyBtn = box.querySelector('[data-owg-copy]');
    var copied = box.querySelector('.owg-inapp-help__copied');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var link = opts.copyUrl || storeUrlForDevice();
        copyText(link).then(
          function () {
            if (copied) {
              copied.hidden = false;
              copyBtn.textContent = '¡Copiado!';
            }
          },
          function () {
            window.prompt('Copia este enlace:', link);
          },
        );
      });
    }

    return box;
  }

  function tryOpenApp(opts) {
    opts = opts || {};
    var deepLink = opts.deepLink || 'owg://';
    var intentLink = opts.intentLink;
    var storeUrl = opts.storeUrl || storeUrlForDevice();

    if (isInAppBrowser() && !opts.forceDeepLink) {
      // En Instagram, owg:// casi nunca funciona; mejor tienda + guía.
      goToStore(storeUrl);
      return;
    }

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
    nativeStoreUrl: nativeStoreUrl,
    isAndroid: isAndroid,
    isIOS: isIOS,
    isInAppBrowser: isInAppBrowser,
    inAppName: inAppName,
    openExternalBrowserHint: openExternalBrowserHint,
    goToStore: goToStore,
    tryOpenApp: tryOpenApp,
    bindStoreLink: bindStoreLink,
    bindOpenAppLink: bindOpenAppLink,
    mountInAppHelp: mountInAppHelp,
    copyText: copyText,
  };

  // Auto: si hay pantalla puente con Descargar y estamos en Instagram/FB,
  // monta el aviso aunque el HTML viejo no llame mountInAppHelp.
  function autoMountInAppHelp() {
    if (!isInAppBrowser()) return;
    var card =
      document.querySelector('.owg-card') ||
      document.getElementById('chooser') ||
      document.body;
    if (!card) return;
    mountInAppHelp(card, { copyUrl: storeUrlForDevice() });

    var getBtn =
      document.getElementById('get-app') ||
      document.getElementById('chooser-store') ||
      document.getElementById('btn-app-store');
    if (getBtn && !getBtn.getAttribute('data-owg-store-bound')) {
      getBtn.setAttribute('data-owg-store-bound', '1');
      bindStoreLink(getBtn, storeUrlForDevice());
    }

    var hint = document.getElementById('hint') || document.getElementById('status');
    if (hint) {
      hint.textContent = openExternalBrowserHint();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountInAppHelp);
  } else {
    autoMountInAppHelp();
  }
})(window);
