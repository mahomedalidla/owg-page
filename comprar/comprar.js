(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var fromPath = window.location.pathname.match(/\/comprar\/(\d+)/);
  var eventId = params.get('id') || (fromPath ? fromPath[1] : null);

  var elStatus = document.getElementById('status');
  var elChooser = document.getElementById('chooser');
  var elCheckoutFlow = document.getElementById('checkout-flow');
  var elEvent = document.getElementById('event-card');
  var elTiersCard = document.getElementById('tiers-card');
  var elTiers = document.getElementById('tiers');
  var elForm = document.getElementById('checkout-form');
  var elEmail = document.getElementById('email');
  var elQty = document.getElementById('quantity');
  var elTotal = document.getElementById('total');
  var elSubmit = document.getElementById('submit-btn');
  var elError = document.getElementById('error');
  var elChooserApp = document.getElementById('chooser-app');
  var elChooserWeb = document.getElementById('chooser-web');
  var elChooserStore = document.getElementById('chooser-store');
  var WEB_PREF_KEY = 'owg_comprar_web_' + String(eventId || '');

  var supabase = null;
  var session = null;
  var eventData = null;
  var selectedTier = null;
  var supabaseCfg = null;
  var PENDING_KEY = 'owg_boletaje_pago_pendiente';

  function stripQuotes(s) {
    return String(s).trim().replace(/^["']+|["']+$/g, '');
  }

  function normalizeUrl(raw) {
    if (raw == null) return '';
    var u = stripQuotes(raw);
    if (!u) return '';
    u = u.replace(/\\/g, '/');
    if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) {
      u = 'https://' + u.replace(/^\/+/, '');
    }
    return u.replace(/\/+$/, '');
  }

  function normalizeConfig(c) {
    return {
      url: normalizeUrl(c && c.url),
      anonKey: stripQuotes(c && c.anonKey),
    };
  }

  function configValid(c) {
    var n = normalizeConfig(c);
    if (!n.url || !n.anonKey) return false;
    if (n.url.indexOf('TU_PROYECTO') >= 0) return false;
    return n.url.indexOf('http://') === 0 || n.url.indexOf('https://') === 0;
  }

  async function loadSupabaseConfig() {
    if (supabaseCfg) return supabaseCfg;

    var inline = window.OWG_SUPABASE_CONFIG;
    if (configValid(inline)) {
      supabaseCfg = normalizeConfig(inline);
      return supabaseCfg;
    }

    var paths = ['/api/supabase-config', '../api/supabase-config'];
    var lastMsg = '';
    for (var i = 0; i < paths.length; i++) {
      try {
        var res = await fetch(paths[i]);
        var data = {};
        try {
          data = await res.json();
        } catch (_) {}
        if (!res.ok) {
          if (data.message) lastMsg = data.message;
          continue;
        }
        if (configValid(data)) {
          supabaseCfg = normalizeConfig(data);
          return supabaseCfg;
        }
        if (data.message) lastMsg = data.message;
      } catch (_) {}
    }

    throw new Error(
      lastMsg ||
        'Supabase no configurado. En Vercel: SUPABASE_URL=https://xxx.supabase.co y ' +
          'SUPABASE_ANON_KEY (sin comillas). Luego Redeploy.'
    );
  }

  function money(n) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(n) || 0);
  }

  function formatFecha(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.toLocaleString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return String(iso);
    }
  }

  function showError(msg) {
    elError.textContent = msg;
    elError.hidden = false;
  }

  function clearError() {
    elError.hidden = true;
    elError.textContent = '';
  }

  function disponibles(tier) {
    if (tier.capacity == null) return null;
    return Math.max(Number(tier.capacity) - Number(tier.sold_count || 0), 0);
  }

  function updateTotal() {
    if (!selectedTier) {
      elTotal.textContent = money(0);
      return;
    }
    var qty = Math.min(10, Math.max(1, parseInt(elQty.value, 10) || 1));
    elQty.value = String(qty);
    elTotal.textContent = money(Number(selectedTier.price) * qty);
  }

  function renderTiers(tiers) {
    elTiers.innerHTML = '';
    var disponiblesCount = 0;

    tiers.forEach(function (tier) {
      var rest = disponibles(tier);
      var agotado = rest !== null && rest <= 0;
      if (!agotado) disponiblesCount += 1;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tier' + (agotado ? ' tier--sold' : '');
      btn.disabled = agotado;
      btn.innerHTML =
        '<span class="tier__name">' + escapeHtml(tier.name) + '</span>' +
        '<span class="tier__price">' + money(tier.price) + '</span>' +
        (rest !== null
          ? '<span class="tier__stock">' +
            (agotado ? 'Agotado' : rest + ' disponible(s)') +
            '</span>'
          : '');

      if (!agotado) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.tier').forEach(function (n) {
            n.classList.remove('tier--active');
          });
          btn.classList.add('tier--active');
          selectedTier = tier;
          elSubmit.disabled = false;
          var maxQty = rest !== null ? Math.min(10, rest) : 10;
          elQty.max = String(maxQty);
          if (parseInt(elQty.value, 10) > maxQty) elQty.value = String(maxQty);
          updateTotal();
          clearError();
        });
      }

      elTiers.appendChild(btn);
    });

    if (disponiblesCount === 0) {
      showError('No hay boletos disponibles para este evento en este momento.');
      elForm.hidden = true;
    } else {
      elForm.hidden = false;
      elSubmit.disabled = true;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function ensureSupabase() {
    var c = await loadSupabaseConfig();
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('No se cargó la librería de Supabase.');
    }
    supabase = window.supabase.createClient(c.url, c.anonKey);
    var existing = await supabase.auth.getSession();
    if (existing.data.session) {
      session = existing.data.session;
      return;
    }
    var anon = await supabase.auth.signInAnonymously();
    if (anon.error || !anon.data.session) {
      throw new Error('No se pudo iniciar sesión para comprar. Revisa tu conexión.');
    }
    session = anon.data.session;
  }

  async function loadEvent() {
    var res = await supabase.rpc('boletaje_web_resumen_evento', {
      p_event_id: Number(eventId),
    });
    if (res.error) throw new Error(res.error.message || 'No se pudo cargar el evento.');
    if (!res.data || !res.data.event_id) {
      throw new Error('Evento no encontrado.');
    }
    eventData = res.data;
    var tiers = Array.isArray(res.data.tiers) ? res.data.tiers : [];
    if (tiers.length === 0) {
      throw new Error('Este evento no tiene boletos a la venta por OWG.');
    }

    document.getElementById('event-title').textContent = res.data.title || 'Evento';
    document.getElementById('event-meta').textContent =
      [formatFecha(res.data.event_date), res.data.venue, res.data.city]
        .filter(Boolean)
        .join(' · ');
    if (res.data.promotion_name) {
      document.getElementById('event-promo').textContent = res.data.promotion_name;
    }

    elEvent.hidden = false;
    elTiersCard.hidden = false;
    renderTiers(tiers);
    elStatus.hidden = true;
  }

  async function checkout(ev) {
    ev.preventDefault();
    clearError();
    if (!selectedTier || !session) return;

    var email = elEmail.value.trim();
    if (!email || email.indexOf('@') < 1) {
      showError('Indica un correo válido. Te enviaremos tus boletos con QR.');
      return;
    }

    var qty = Math.min(10, Math.max(1, parseInt(elQty.value, 10) || 1));
    elSubmit.disabled = true;
    elSubmit.textContent = 'Preparando pago…';

    try {
      var c = await loadSupabaseConfig();
      var fnUrl = c.url.replace(/\/$/, '') + '/functions/v1/crear-checkout-boleto';
      var res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + session.access_token,
          apikey: c.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: Number(eventId),
          tier_id: selectedTier.id,
          quantity: qty,
          recovery_email: email,
        }),
      });

      var body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || body.error || 'No se pudo iniciar el pago.');
      }
      if (!body.checkout_url) {
        throw new Error('Stripe no devolvió enlace de pago.');
      }

      try {
        localStorage.setItem(
          PENDING_KEY,
          JSON.stringify({
            order_id: body.order_id,
            session_id: body.session_id || '',
            event_title: eventData && eventData.title ? eventData.title : '',
            started_at: new Date().toISOString(),
          })
        );
      } catch (_) {}

      if (body.checkout_hint && body.sandbox) {
        alert(body.checkout_hint);
      }

      window.location.href = body.checkout_url;
    } catch (e) {
      showError(e.message || 'Error al iniciar el pago.');
      elSubmit.disabled = false;
      elSubmit.textContent = 'PAGAR CON TARJETA';
    }
  }

  function preferWebCheckout() {
    if (params.get('web') === '1') return true;
    try {
      return sessionStorage.getItem(WEB_PREF_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function markWebPreference() {
    try {
      sessionStorage.setItem(WEB_PREF_KEY, '1');
    } catch (_) {}
  }

  function setupChooser() {
    if (!elChooser || !elChooserApp || !elChooserWeb || !elChooserStore) {
      startWebCheckout();
      return;
    }

    var cfg = window.OWG_APP_CONFIG || {};
    var playStore = cfg.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.owg.app';
    var appStore =
      typeof cfg.appStoreUrl === 'function' ? cfg.appStoreUrl() : cfg.appStoreSearchUrl;
    var isAndroid = /Android/i.test(navigator.userAgent);
    var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    var storeUrl = isIOS ? appStore : playStore;
    var deepLink = 'owg://evento/' + eventId;
    var intentLink =
      'intent://evento/' +
      eventId +
      '#Intent;scheme=owg;package=com.owg.app;S.browser_fallback_url=' +
      encodeURIComponent(storeUrl) +
      ';end';

    elChooserStore.href = storeUrl;
    elChooserApp.href = isAndroid ? intentLink : deepLink;
    elChooserApp.addEventListener('click', function (e) {
      if (!isAndroid) return;
      e.preventDefault();
      window.location.href = intentLink;
    });
    elChooserWeb.addEventListener('click', function () {
      markWebPreference();
      startWebCheckout();
    });

    elChooser.hidden = false;
    elStatus.hidden = true;
    if (elCheckoutFlow) elCheckoutFlow.hidden = true;
  }

  async function startWebCheckout() {
    if (elChooser) elChooser.hidden = true;
    if (elCheckoutFlow) elCheckoutFlow.hidden = false;
    elStatus.hidden = false;
    elStatus.textContent = 'Cargando evento…';

    elQty.addEventListener('change', updateTotal);
    elQty.addEventListener('input', updateTotal);
    elForm.addEventListener('submit', checkout);

    try {
      await ensureSupabase();
      await loadEvent();
    } catch (e) {
      elStatus.hidden = false;
      elStatus.textContent = e.message || 'No se pudo cargar la compra.';
    }
  }

  async function init() {
    if (!eventId || !/^\d+$/.test(String(eventId))) {
      elStatus.hidden = false;
      elStatus.textContent = 'Enlace inválido. Necesitas el ID del evento (?id=123).';
      return;
    }

    if (preferWebCheckout()) {
      await startWebCheckout();
      return;
    }

    setupChooser();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
