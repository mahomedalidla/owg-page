(function () {
  'use strict';

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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      body: JSON.stringify({
        order_id: orderId,
        session_id: sessionId,
      }),
    });
    var body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || body.error || 'No se pudo confirmar el pago.');
    }
    return body;
  }

  function renderQr(canvasId, value) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !window.QRCode || !value) return;
    window.QRCode.toCanvas(canvas, value, {
      width: 200,
      margin: 1,
      color: { dark: '#0F0F12', light: '#FFFFFF' },
    });
  }

  function renderTickets(data) {
    if (!elTickets) return;
    elTickets.innerHTML = '';
    var tickets = Array.isArray(data.tickets) ? data.tickets : [];
    if (tickets.length === 0) return;

    tickets.forEach(function (ticket, index) {
      var canvasId = 'qr-' + index;
      var card = document.createElement('div');
      card.className = 'ticket-card';
      card.innerHTML =
        '<p class="ticket-card__label">BOLETO ' + (index + 1) + '</p>' +
        '<p class="ticket-card__tier">' + escapeHtml(ticket.tier_name || 'General') + '</p>' +
        '<canvas id="' + canvasId + '" class="ticket-card__qr"></canvas>' +
        '<p class="ticket-card__hint">Presenta este código en la entrada.</p>';
      elTickets.appendChild(card);
      renderQr(canvasId, ticket.qr_code);
    });
  }

  function setOpenAppLink() {
    if (!elOpenApp || !orderId) return;
    elOpenApp.href = '/boletos/index.html?order=' + encodeURIComponent(orderId);
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
        if (last.payment_status && last.payment_status !== 'paid') {
          return last;
        }
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
          var email = data.recovery_email || '';
          elEmailNote.textContent = email
            ? 'También enviamos tus boletos a ' + email + '.'
            : 'Revisa tu correo: ahí está la copia con QR.';
          if (data.email_skipped === 'resend_not_configured') {
            elEmailNote.textContent =
              'Guarda esta pantalla o abre la app: el correo puede tardar unos minutos.';
          }
        }
        renderTickets(data);
        try {
          localStorage.removeItem(PENDING_KEY);
        } catch (_) {}
        show(elSuccess);
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
