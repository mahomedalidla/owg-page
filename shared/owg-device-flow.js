/**
 * Post-compra OWG — dos mundos:
 * · Escritorio: boleto en pantalla + “revisa tu correo”.
 * · Móvil: llevar el boleto en la app OWG.
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Abre el webmail más probable según el dominio del correo. */
  function inboxUrl(email) {
    var domain = String(email || '').split('@')[1];
    domain = domain ? domain.toLowerCase().trim() : '';
    if (!domain) return 'https://mail.google.com';
    if (domain === 'gmail.com' || domain === 'googlemail.com') return 'https://mail.google.com';
    if (
      domain.indexOf('outlook') >= 0 ||
      domain.indexOf('hotmail') >= 0 ||
      domain.indexOf('live.') === 0 ||
      domain === 'msn.com'
    ) {
      return 'https://outlook.live.com/mail/';
    }
    if (domain.indexOf('yahoo') >= 0) return 'https://mail.yahoo.com';
    if (domain.indexOf('icloud') >= 0 || domain === 'me.com') return 'https://www.icloud.com/mail';
    if (domain.indexOf('proton') >= 0) return 'https://mail.proton.me';
    return 'https://mail.google.com';
  }

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
    document.addEventListener(
      'visibilitychange',
      function onHide() {
        if (document.hidden) done = true;
      },
      { once: true },
    );
    global.location.href = deepLink;
    setTimeout(runFallback, fallbackMs || 1800);
  }

  function textos() {
    if (isMobile()) {
      return {
        headline: '¡LISTO!',
        subtitle: 'Tu boleto también está en el correo.',
        upsell:
          '<strong style="color:#fff">Llévalo en el bolsillo.</strong> Guarda tus boletos en la app OWG: QR a mano, recordatorios y tu historial de eventos.',
        crearCuenta: 'GUARDAR BOLETO Y CREAR CUENTA',
        misBoletos: null,
        abrirApp: 'DESCARGAR O ABRIR LA APP',
        signupIntro: 'Crea tu cuenta OWG y tus boletos quedarán guardados aquí:',
        signupOk: '¡Listo! Tus boletos quedaron en tu cuenta OWG.',
      };
    }
    return {
      headline: '¡PAGO CONFIRMADO!',
      subtitle: 'También enviamos tus boletos a tu correo.',
      upsell:
        '<strong style="color:#fff">Para la entrada:</strong> muestra el QR de abajo. También está en tu bandeja — guárdalo o imprime esta página.',
      emailNote: null,
      irCorreo: 'REVISAR MI CORREO',
      desktopHint:
        '¿No lo ves? Revisa spam o promociones. En el celular puedes llevar todos tus boletos con la app OWG.',
      crearCuenta: null,
      misBoletos: null,
      abrirApp: null,
      signupIntro: 'Crea tu cuenta OWG:',
      signupOk: '¡Cuenta lista! Tus boletos están guardados.',
    };
  }

  /**
   * @param {Document|Element} root
   * @param {{ recoveryEmail?: string, signupOpen?: boolean }} ctx
   */
  function aplicarUi(root, ctx) {
    root = root || document;
    ctx = ctx || {};
    var email = String(ctx.recoveryEmail || '').trim();
    var signupOpen = !!ctx.signupOpen;
    var mobile = isMobile();
    var t = textos();

    var headline = root.getElementById('page-headline');
    var subtitle = root.getElementById('subtitle') || root.getElementById('email-note');
    var upsell = root.getElementById('upsell-text');
    var signupIntro = root.getElementById('signup-intro');

    if (headline && t.headline) headline.textContent = t.headline;
    if (upsell) upsell.innerHTML = t.upsell;
    if (signupIntro && t.signupIntro) signupIntro.textContent = t.signupIntro;

    var desktopActions = root.getElementById('actions-desktop');
    var mobileActions = root.getElementById('actions-mobile');
    var sticky = root.getElementById('sticky-bar');
    var signup = root.getElementById('signup-panel');

    if (desktopActions) desktopActions.hidden = mobile;
    if (mobileActions) mobileActions.hidden = !mobile || signupOpen;
    if (sticky) sticky.hidden = !mobile || signupOpen;
    if (signup && !mobile) signup.hidden = true;

    var emailSent = root.getElementById('email-sent-note');
    if (emailSent) {
      if (!mobile && email) {
        emailSent.innerHTML =
          'Copia enviada a <strong style="color:#fff;">' +
          escapeHtml(email) +
          '</strong>. Ábrela en tu correo para guardar el boleto.';
        emailSent.hidden = false;
      } else {
        emailSent.hidden = true;
      }
    }

    if (subtitle) {
      if (!mobile && email) {
        subtitle.textContent = 'El QR está aquí abajo y en tu correo.';
      } else if (mobile) {
        subtitle.textContent = t.subtitle;
      }
    }

    var btnInbox = root.getElementById('btn-ir-correo');
    if (btnInbox) {
      if (!mobile && email) {
        btnInbox.href = inboxUrl(email);
        btnInbox.target = '_blank';
        btnInbox.rel = 'noopener noreferrer';
        btnInbox.textContent = t.irCorreo || 'REVISAR MI CORREO';
        btnInbox.hidden = false;
      } else {
        btnInbox.hidden = true;
      }
    }

    var desktopHint = root.getElementById('desktop-hint');
    if (desktopHint) {
      if (!mobile) {
        desktopHint.textContent = t.desktopHint || '';
        desktopHint.hidden = !t.desktopHint;
      } else {
        desktopHint.hidden = true;
      }
    }

    var btnCrear = root.getElementById('btn-crear-cuenta');
    var btnMis = root.getElementById('btn-mis-boletos');
    var btnApp = root.getElementById('btn-abrir-app') || root.getElementById('open-app');

    if (btnCrear) {
      if (mobile && t.crearCuenta) {
        btnCrear.textContent = t.crearCuenta;
        btnCrear.hidden = false;
      } else {
        btnCrear.hidden = true;
      }
    }
    if (btnMis) {
      if (mobile && t.misBoletos) {
        btnMis.textContent = t.misBoletos;
        btnMis.hidden = false;
      } else {
        btnMis.hidden = true;
      }
    }
    if (btnApp) {
      if (mobile && t.abrirApp) {
        btnApp.textContent = t.abrirApp;
        btnApp.hidden = false;
      } else {
        btnApp.hidden = true;
      }
    }

    var mobileDl = root.getElementById('mobile-download-row');
    if (mobileDl) mobileDl.hidden = !mobile;

    var dl = root.getElementById('mobile-download-link');
    if (dl) dl.href = storeUrl();
  }

  global.OwgDeviceFlow = {
    isMobile: isMobile,
    storeUrl: storeUrl,
    inboxUrl: inboxUrl,
    tryAppThen: tryAppThen,
    textos: textos,
    aplicarUi: aplicarUi,
    escapeHtml: escapeHtml,
  };
})(window);
