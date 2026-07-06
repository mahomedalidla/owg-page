/* owg-callback-build: 2026-07-06-v4 — respaldo si HTML cacheado aún carga este archivo */
(function () {
  'use strict';
  if (document.body && document.body.getAttribute('data-owg-callback-build')) return;

  var params = new URLSearchParams(window.location.search);
  var status = params.get('status') || 'success';
  var orderId = params.get('order_id') || '';
  var sessionId = params.get('session_id') || '';
  var PENDING_KEY = 'owg_boletaje_pago_pendiente';

  if ((!orderId || !sessionId) && window.localStorage) {
    try {
      var pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      if (pending) {
        if (!orderId && pending.order_id) orderId = pending.order_id;
        if (!sessionId && pending.session_id) sessionId = pending.session_id;
      }
    } catch (_) {}
  }

  var elLoading = document.getElementById('view-loading');
  var elSuccess = document.getElementById('view-success');
  var elPending = document.getElementById('view-pending');
  var elCancelled = document.getElementById('view-cancelled');
  var elTickets = document.getElementById('tickets');
  var elEventTitle = document.getElementById('event-title');
  var elEventMeta = document.getElementById('event-meta');
  var elEmailNote = document.getElementById('email-note');
  var elOpenApp = document.getElementById('open-app');
  var elBtnCrear = document.getElementById('btn-crear-cuenta');
  var elBtnMis = document.getElementById('btn-mis-boletos');
  var recoveryEmail = '';

  function hideAll() {
    [elLoading, elSuccess, elPending, elCancelled].forEach(function (el) {
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
    var paths = ['/api/supabase-config', '../../api/supabase-config'];
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

  function formatFecha(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return String(iso);
    }
  }

  async function confirmarPagoWeb(cfg) {
    var fnUrl = cfg.url + '/functions/v1/confirmar-pago-boleto-web';
    var res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId, session_id: sessionId }),
    });
    var body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || body.error || 'No se pudo confirmar el pago.');
    }
    return body;
  }

  function renderTickets(data) {
    if (!elTickets) return;
    elTickets.innerHTML = '';
    var tickets = Array.isArray(data.tickets) ? data.tickets : [];
    if (tickets.length === 0) return;

    tickets.forEach(function (ticket, index) {
      var card = document.createElement('div');
      card.className = 'ticket-card';

      var label = document.createElement('p');
      label.className = 'ticket-card__label';
      label.textContent = 'BOLETO ' + (index + 1);

      var tier = document.createElement('p');
      tier.className = 'ticket-card__tier';
      tier.textContent = ticket.tier_name || 'General';

      var wrap = document.createElement('div');
      wrap.className = 'ticket-card__qr-wrap';

      if (ticket.qr_image) {
        var img = document.createElement('img');
        img.src = ticket.qr_image;
        img.alt = 'Código QR del boleto';
        img.className = 'ticket-card__qr';
        img.width = 220;
        img.height = 220;
        wrap.appendChild(img);
      } else {
        var fallback = document.createElement('p');
        fallback.style.cssText = 'margin:0;font-size:12px;color:#666;text-align:center;';
        fallback.textContent = 'Actualiza confirmar-pago-boleto-web en Supabase y recarga.';
        wrap.appendChild(fallback);
      }

      var hint = document.createElement('p');
      hint.className = 'ticket-card__hint';
      hint.textContent = 'Presenta este código en la entrada.';

      card.appendChild(label);
      card.appendChild(tier);
      card.appendChild(wrap);
      card.appendChild(hint);
      elTickets.appendChild(card);
    });
  }

  function boletosLandingUrl(accion) {
    var q = new URLSearchParams();
    if (orderId) q.set('order', orderId);
    if (accion) q.set('accion', accion);
    if (recoveryEmail) q.set('email', recoveryEmail);
    return '/boletos/index.html?' + q.toString();
  }

  function deepLink(accion) {
    var q = new URLSearchParams();
    if (orderId) q.set('order', orderId);
    if (accion) q.set('accion', accion);
    if (recoveryEmail) q.set('email', recoveryEmail);
    var suffix = q.toString();
    return 'owg://boletos' + (suffix ? '?' + suffix : '');
  }

  function setOpenAppLink() {
    if (!orderId) return;
    if (elOpenApp) elOpenApp.href = deepLink('');
    if (elBtnCrear) elBtnCrear.href = boletosLandingUrl('crear-cuenta');
  }

  if (elBtnMis) {
    elBtnMis.addEventListener('click', function () {
      window.location.href = boletosLandingUrl('mis-boletos');
    });
  }

  async function pollConfirm(cfg, attempts) {
    var last = null;
    for (var i = 0; i < attempts; i++) {
      try {
        last = await confirmarPagoWeb(cfg);
        if (last.tickets && last.tickets.length > 0) return last;
        if (last.status === 'completed' && last.tickets && last.tickets.length === 0) {
          await new Promise(function (r) { setTimeout(r, 1500); });
          continue;
        }
        if (last.payment_status && last.payment_status !== 'paid') return last;
      } catch (e) {
        if (i === attempts - 1) throw e;
      }
      await new Promise(function (r) { setTimeout(r, 2000); });
    }
    return last;
  }

  async function onSuccess() {
    show(elLoading);
    setOpenAppLink();

    if (!orderId || !sessionId) {
      show(elPending);
      return;
    }

    try {
      var cfg = await loadSupabaseConfig();
      var data = await pollConfirm(cfg, 6);

      if (data && data.tickets && data.tickets.length > 0) {
        if (elEventTitle && data.event) {
          elEventTitle.textContent = data.event.title || 'Tu evento';
        }
        if (elEventMeta && data.event) {
          elEventMeta.textContent = [
            formatFecha(data.event.event_date),
            data.event.venue,
            data.event.city,
          ].filter(Boolean).join(' · ');
        }
        if (elEmailNote) {
          recoveryEmail = data.recovery_email || '';
          setOpenAppLink();
          elEmailNote.textContent = recoveryEmail
            ? 'También enviamos tus boletos a ' + recoveryEmail + '.'
            : 'Revisa tu correo: ahí está la copia con QR.';
        }
        show(elSuccess);
        requestAnimationFrame(function () { renderTickets(data); });
        try { localStorage.removeItem(PENDING_KEY); } catch (_) {}
        return;
      }

      show(elPending);
    } catch (e) {
      console.error(e);
      show(elPending);
    }
  }

  function init() {
    setOpenAppLink();
    if (status === 'cancelled' || status === 'failure') {
      show(elCancelled);
      return;
    }
    if (status === 'success') {
      onSuccess();
      return;
    }
    show(elPending);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
