/**
 * Post-compra OWG — experiencia unificada (móvil y escritorio).
 */
(function (global) {
  'use strict';

  function storeUrls() {
    var cfg = global.OWG_APP_CONFIG || {};
    var playStore = cfg.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.owg.app';
    var appStore = typeof cfg.appStoreUrl === 'function' ? cfg.appStoreUrl() : cfg.appStoreUrl;
    if (!appStore) {
      appStore = cfg.appStoreSearchUrl || 'https://apps.apple.com/search?term=OWG+wrestling+lucha+libre';
    }
    return { playStore: playStore, appStore: appStore };
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

  function renderTickets(container, tickets) {
    if (!container) return;
    container.innerHTML = '';
    var list = Array.isArray(tickets) ? tickets : [];
    list.forEach(function (ticket, index) {
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
        fallback.textContent = 'Tu QR también está en el correo de confirmación.';
        wrap.appendChild(fallback);
      }

      var hint = document.createElement('p');
      hint.className = 'ticket-card__hint';
      hint.textContent = 'Presenta este código en la entrada.';

      card.appendChild(label);
      card.appendChild(tier);
      card.appendChild(wrap);
      card.appendChild(hint);
      container.appendChild(card);
    });
  }

  function fillEvent(root, event) {
    if (!event) return;
    var title = root.getElementById('event-title');
    var meta = root.getElementById('event-meta');
    if (title) title.textContent = event.title || 'Tu evento';
    if (meta) {
      meta.textContent = [formatFecha(event.event_date), event.venue, event.city]
        .filter(Boolean)
        .join(' · ');
    }
  }

  function fillRecoveryEmail(root, email) {
    var el = root.getElementById('recovery-email');
    if (el) el.textContent = email || 'tu correo de compra';
  }

  function initStoreButtons(root) {
    var urls = storeUrls();
    var appBtn = root.getElementById('btn-app-store');
    var playBtn = root.getElementById('btn-play-store');
    if (appBtn) appBtn.href = urls.appStore;
    if (playBtn) playBtn.href = urls.playStore;
  }

  function showSuccess(root, data) {
    var email = data.recovery_email || '';
    fillEvent(root, data.event);
    fillRecoveryEmail(root, email);
    renderTickets(root.getElementById('tickets'), data.tickets);
    initStoreButtons(root);
  }

  global.OwgPostCompra = {
    storeUrls: storeUrls,
    formatFecha: formatFecha,
    renderTickets: renderTickets,
    fillEvent: fillEvent,
    fillRecoveryEmail: fillRecoveryEmail,
    initStoreButtons: initStoreButtons,
    showSuccess: showSuccess,
  };
})(window);
