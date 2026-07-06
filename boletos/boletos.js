(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var orderId = params.get('order') || params.get('order_id') || '';
  var emailParam = params.get('email') || '';

  var elLoading = document.getElementById('view-loading');
  var elSuccess = document.getElementById('view-success');
  var elPending = document.getElementById('view-pending');
  var pc = window.OwgPostCompra;
  var recoveryEmail = emailParam;

  function hideAll() {
    [elLoading, elSuccess, elPending].forEach(function (el) {
      if (el) el.hidden = true;
    });
  }

  function show(el) {
    hideAll();
    if (el) el.hidden = false;
  }

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

  async function loadSupabaseConfig() {
    var paths = ['/api/supabase-config', '../api/supabase-config'];
    for (var i = 0; i < paths.length; i++) {
      try {
        var res = await fetch(paths[i]);
        var data = await res.json();
        if (res.ok && data.url && data.anonKey) {
          return { url: normalizeUrl(data.url), anonKey: stripQuotes(data.anonKey) };
        }
      } catch (_) {}
    }
    throw new Error('No se pudo conectar con el servidor.');
  }

  async function fetchOrder(cfg) {
    if (!orderId) return null;
    var fnUrl = cfg.url + '/functions/v1/resumen-orden-boleto-web';
    var res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId }),
    });
    var body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || body.error || 'No se pudo cargar la orden.');
    }
    return body;
  }

  async function init() {
    if (pc) pc.initStoreButtons(document);

    if (!orderId) {
      show(elPending);
      return;
    }

    try {
      var cfg = await loadSupabaseConfig();
      var data = await fetchOrder(cfg);

      if (!data || !data.ready) {
        show(elPending);
        return;
      }

      recoveryEmail = recoveryEmail || data.recovery_email || '';
      data.recovery_email = recoveryEmail;

      if (pc) pc.showSuccess(document, data);
      show(elSuccess);
    } catch (e) {
      console.error(e);
      show(elPending);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
