(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var orderId = params.get('order') || params.get('order_id') || '';
  var accion = params.get('accion') || '';
  var emailParam = params.get('email') || '';

  var elLoading = document.getElementById('view-loading');
  var elSuccess = document.getElementById('view-success');
  var elPending = document.getElementById('view-pending');
  var elSticky = document.getElementById('sticky-bar');
  var elTickets = document.getElementById('tickets');
  var elEventTitle = document.getElementById('event-title');
  var elEventMeta = document.getElementById('event-meta');
  var elSignupPanel = document.getElementById('signup-panel');
  var elRegEmail = document.getElementById('reg-email');
  var elRegNombre = document.getElementById('reg-nombre');
  var elRegPass = document.getElementById('reg-pass');
  var elSignupError = document.getElementById('signup-error');
  var elSignupSuccess = document.getElementById('signup-success');

  var supabase = null;
  var orderData = null;
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

  function deepLink(extra) {
    var q = new URLSearchParams();
    if (orderId) q.set('order', orderId);
    if (extra && extra.accion) q.set('accion', extra.accion);
    var email = extra && extra.email ? extra.email : recoveryEmail;
    if (email) q.set('email', email);
    var suffix = q.toString();
    return 'owg://boletos' + (suffix ? '?' + suffix : '');
  }

  var flow = window.OwgDeviceFlow;

  function isMobileWeb() {
    return flow ? flow.isMobile() : /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function storeUrl() {
    return flow ? flow.storeUrl() : 'https://play.google.com/store/apps/details?id=com.owg.app';
  }

  function showSignupPanel() {
    if (!elSignupPanel) return;
    elSignupPanel.hidden = false;
    if (elRegEmail && recoveryEmail) elRegEmail.value = recoveryEmail;
    var btnCrear = document.getElementById('btn-crear-cuenta');
    if (btnCrear) btnCrear.hidden = true;
    var dl = document.getElementById('mobile-download-link');
    if (dl) dl.href = storeUrl();
    if (flow) flow.aplicarUi(document);
    elSignupPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onCrearCuenta() {
    if (!isMobileWeb()) {
      showSignupPanel();
      return;
    }
    var link = deepLink({ accion: 'crear-cuenta', email: recoveryEmail });
    if (flow) {
      flow.tryAppThen(link, 1800, showSignupPanel);
    } else {
      window.location.href = link;
      setTimeout(showSignupPanel, 1800);
    }
  }

  function onMisBoletos() {
    if (isMobileWeb()) {
      var link = deepLink({ accion: 'mis-boletos', email: recoveryEmail });
      if (flow) {
        flow.tryAppThen(link, 1600, function () {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      } else {
        window.location.href = link;
      }
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onAbrirApp() {
    if (!isMobileWeb()) return;
    var link = deepLink({ email: recoveryEmail });
    if (flow) {
      flow.tryAppThen(link, 1500, function () {
        window.location.href = storeUrl();
      });
    } else {
      window.location.href = link;
      setTimeout(function () { window.location.href = storeUrl(); }, 1500);
    }
  }

  async function initSupabase() {
    var cfg = await loadSupabaseConfig();
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('No se cargó Supabase.');
    }
    supabase = window.supabase.createClient(cfg.url, cfg.anonKey);
    return cfg;
  }

  async function ensureSession() {
    var existing = await supabase.auth.getSession();
    if (existing.data.session) return existing.data.session;
    var anon = await supabase.auth.signInAnonymously();
    if (anon.error || !anon.data.session) {
      throw new Error('No se pudo iniciar sesión.');
    }
    return anon.data.session;
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
        fallback.textContent = ticket.qr_code
          ? 'QR en tu correo. Recarga la página en unos segundos.'
          : 'Generando QR… recarga en unos segundos.';
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

  function showSignupError(msg) {
    if (!elSignupError) return;
    elSignupError.textContent = msg;
    elSignupError.hidden = !msg;
    if (elSignupSuccess) elSignupSuccess.hidden = true;
  }

  function showSignupOk(msg) {
    if (!elSignupSuccess) return;
    elSignupSuccess.textContent = msg;
    elSignupSuccess.hidden = !msg;
    if (elSignupError) elSignupError.hidden = true;
  }

  async function registrarCuenta() {
    var email = (elRegEmail && elRegEmail.value || recoveryEmail || '').trim().toLowerCase();
    var nombre = (elRegNombre && elRegNombre.value || '').trim();
    var pass = (elRegPass && elRegPass.value || '').trim();

    if (!email || email.indexOf('@') < 1) {
      showSignupError('Indica un correo válido.');
      return;
    }
    if (!nombre) {
      showSignupError('Indica tu apodo.');
      return;
    }
    if (pass.length < 6) {
      showSignupError('La llave secreta debe tener al menos 6 caracteres.');
      return;
    }

    showSignupError('');
    var btn = document.getElementById('btn-registrar');
    if (btn) btn.disabled = true;

    try {
      await ensureSession();
      var user = (await supabase.auth.getUser()).data.user;
      var response;

      if (user && user.is_anonymous) {
        response = await supabase.auth.updateUser({
          email: email,
          password: pass,
          data: { name: nombre, recovery_email: email },
        });
        if (response.error) throw response.error;
        try {
          await supabase.rpc('completar_vinculacion_cuenta', { p_name: nombre });
        } catch (_) {}
      } else {
        response = await supabase.auth.signUp({
          email: email,
          password: pass,
          options: { data: { name: nombre, recovery_email: email } },
        });
        if (response.error) throw response.error;
      }

      await supabase.rpc('reclamar_boletos_por_email');
      var okMsg = flow ? flow.textos().signupOk : '¡Cuenta lista! Tus boletos están guardados en OWG.';
      showSignupOk(okMsg);
      if (elSticky) elSticky.hidden = true;
    } catch (e) {
      var msg = e && e.message ? e.message : 'No se pudo crear la cuenta.';
      if (/already registered|already exists|User already registered/i.test(msg)) {
        try {
          var login = await supabase.auth.signInWithPassword({ email: email, password: pass });
          if (login.error) throw login.error;
          await supabase.rpc('reclamar_boletos_por_email');
          showSignupOk('¡Sesión iniciada! Tus boletos están en tu cuenta.');
          if (elSticky) elSticky.hidden = true;
          return;
        } catch (loginErr) {
          msg = 'Ya existe una cuenta con este correo. Inicia sesión en la app OWG.';
        }
      }
      showSignupError(msg);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bindActions() {
    var btnCrear = document.getElementById('btn-crear-cuenta');
    var btnMis = document.getElementById('btn-mis-boletos');
    var btnApp = document.getElementById('btn-abrir-app');
    var btnReg = document.getElementById('btn-registrar');
    if (btnCrear) btnCrear.addEventListener('click', onCrearCuenta);
    if (btnMis) btnMis.addEventListener('click', onMisBoletos);
    if (btnApp) btnApp.addEventListener('click', onAbrirApp);
    if (btnReg) btnReg.addEventListener('click', registrarCuenta);
  }

  async function init() {
    bindActions();

    if (!orderId) {
      show(elPending);
      return;
    }

    try {
      var cfg = await initSupabase();
      orderData = await fetchOrder(cfg);

      if (!orderData || !orderData.ready) {
        show(elPending);
        return;
      }

      recoveryEmail = recoveryEmail || orderData.recovery_email || '';
      if (elEventTitle && orderData.event) {
        elEventTitle.textContent = orderData.event.title || 'Tu evento';
      }
      if (elEventMeta && orderData.event) {
        elEventMeta.textContent = [
          formatFecha(orderData.event.event_date),
          orderData.event.venue,
          orderData.event.city,
        ].filter(Boolean).join(' · ');
      }

      show(elSuccess);
      if (flow) flow.aplicarUi(document);
      var dl = document.getElementById('mobile-download-link');
      if (dl) dl.href = storeUrl();
      if (elSticky) elSticky.hidden = false;
      requestAnimationFrame(function () {
        renderTickets(orderData);
      });

      if (accion === 'crear-cuenta') {
        onCrearCuenta();
      } else if (accion === 'mis-boletos') {
        onMisBoletos();
      }
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
