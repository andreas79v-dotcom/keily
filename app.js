(function () {
  'use strict';

  var SB_URL = 'https://ntwydmezshfjxvhwwhli.supabase.co';
  var SB_KEY = 'sb_publishable_GiWbUts3EQShmZlCSjuBJw_EzED6FMh';
  var ZIEL = 7840;

  /* Team – Fotos liegen in assets/team/. Fehlt ein Foto, erscheinen Initialen. */
  var TEAM = [
    { name: 'Mara D.', beruf: 'Hörakustikerin', foto: 'assets/team/mara.jpg' },
    { name: 'Simone H.', beruf: 'Informationselektronikerin', foto: 'assets/team/simone.jpg' },
    { name: 'Flo H.', beruf: 'Metallbauer', foto: 'assets/team/flo.jpg' },
    { name: 'Julian H.', beruf: 'Orthopädietechniker', foto: 'assets/team/julian.jpg' }
  ];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function euro(n) { return Math.round(n).toLocaleString('de-DE') + ' €'; }
  function euro2(n) { return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function initials(n) { return n.split(/\s+/).map(function (p) { return p.charAt(0); }).join('').replace(/\./g, '').slice(0, 2); }

  /* Team aufbauen */
  var list = $('#team-liste');
  TEAM.forEach(function (p) {
    var li = document.createElement('li');
    li.className = 'member';
    var fig = document.createElement('figure');
    var ph = document.createElement('div');
    ph.className = 'photo';
    if (p.foto) {
      var img = document.createElement('img');
      img.src = p.foto; img.alt = 'Portrait von ' + p.name; img.loading = 'lazy';
      img.width = 560; img.height = 700;
      ph.appendChild(img);
    } else {
      var ini = document.createElement('span');
      ini.className = 'initials'; ini.setAttribute('aria-hidden', 'true');
      ini.textContent = initials(p.name);
      ph.appendChild(ini);
    }
    var cap = document.createElement('figcaption');
    cap.innerHTML = '<p class="name"></p>' + (p.beruf ? '<p class="role"></p>' : '');
    cap.querySelector('.name').textContent = p.name;
    if (p.beruf) cap.querySelector('.role').textContent = p.beruf;
    fig.appendChild(ph); fig.appendChild(cap); li.appendChild(fig); list.appendChild(li);
  });

  /* Supabase-Aufrufe */
  function rpc(fn, body) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    return fetch(SB_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(t);
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.message || 'Fehler ' + r.status); e.fachlich = r.status < 500; throw e; }
        return j;
      });
    }, function (err) { clearTimeout(t); throw err; });
  }

  /* Live-Stand */
  var shown = 0, stand = { summe: 0, anzahl: 0, ziel: ZIEL };
  function animateTo(target) {
    var start = shown, t0 = null, dur = reduced ? 0 : 900;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = dur ? Math.min(1, (ts - t0) / dur) : 1;
      var v = start + (target - start) * (1 - Math.pow(1 - k, 3));
      $$('[data-summe]').forEach(function (el) { el.textContent = euro(v); });
      if (k < 1) requestAnimationFrame(step); else shown = target;
    }
    requestAnimationFrame(step);
  }
  function render(s) {
    stand = s;
    var pct = Math.min(100, s.summe / s.ziel * 100);
    if (s.summe !== shown) animateTo(s.summe);
    $$('[data-fill]').forEach(function (el) { el.style.width = pct + '%'; });
    var pb = $('.bar-big'); if (pb) pb.setAttribute('aria-valuenow', String(Math.round(pct)));
    $$('[data-anzahl]').forEach(function (el) { el.textContent = s.anzahl.toLocaleString('de-DE'); });
    $$('[data-rest]').forEach(function (el) { el.textContent = euro(Math.max(0, s.ziel - s.summe)); });
    var voll = s.summe >= s.ziel;
    $('#full').hidden = !voll || !$('#done').hidden;
    $('#form').hidden = voll || !$('#done').hidden;
    updateCalc();
  }
  function poll() {
    if (document.hidden) return;
    rpc('stand').then(render).catch(function () { /* nächster Versuch beim nächsten Intervall */ });
  }
  poll();
  setInterval(poll, 5000);
  document.addEventListener('visibilitychange', poll);

  /* Formular */
  var form = $('#form'), free = $('#free'), freeInput = $('#frei-betrag'), calc = $('#calc'), errorBox = $('#error');
  function selectedAmount() {
    var r = $('input[name="betrag"]:checked', form);
    if (!r) return NaN;
    if (r.value === 'frei') return parseInt(freeInput.value, 10);
    return parseInt(r.value, 10);
  }
  function updateCalc() {
    var b = selectedAmount();
    if (!b || b < 20) { calc.textContent = 'Mindestens 20 €, in Schritten von 20 €'; return; }
    if (b % 20) { calc.textContent = 'Bitte einen Betrag in Schritten von 20 € wählen'; return; }
    var n = b / 20;
    calc.textContent = '= ' + n.toLocaleString('de-DE') + (n === 1 ? ' Genussrecht' : ' Genussrechte');
  }
  $$('input[name="betrag"]', form).forEach(function (r) {
    r.addEventListener('change', function () {
      free.hidden = r.value !== 'frei' || !r.checked;
      if (r.value === 'frei' && r.checked) freeInput.focus();
      updateCalc();
    });
  });
  freeInput.addEventListener('input', updateCalc);
  updateCalc();

  function showError(msg, field) {
    errorBox.textContent = msg; errorBox.hidden = false;
    if (field) field.focus();
  }

  /* Logo für den Schein vorladen */
  var logoBytes = null;
  fetch('assets/keily-schein.jpg').then(function (r) { return r.arrayBuffer(); })
    .then(function (b) { logoBytes = new Uint8Array(b); }).catch(function () {});

  var lastUrl = null;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    var nameEl = $('#name');
    var name = nameEl.value.replace(/\s+/g, ' ').trim();
    var betrag = selectedAmount();
    var rest = stand.ziel - stand.summe;
    if (name.length < 2) return showError('Bitte geben Sie Ihren Vor- und Nachnamen ein.', nameEl);
    if (!betrag || betrag < 20 || betrag % 20) return showError('Bitte wählen Sie einen Betrag ab 20 € in Schritten von 20 €.', freeInput.offsetParent ? freeInput : null);
    if (betrag > rest) return showError('Es sind nur noch ' + euro(rest) + ' verfügbar. Bitte wählen Sie einen kleineren Betrag.');

    var btn = $('#submit');
    btn.disabled = true; btn.textContent = 'Wird gezeichnet …';
    rpc('zeichnen', { p_name: name, p_betrag: betrag }).then(function (res) {
      var zp = new Date(res.zeitpunkt);
      var zpText = zp.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
      var bytes = logoBytes ? Promise.resolve(logoBytes)
        : fetch('assets/keily-schein.jpg').then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); });
      return bytes.then(function (logo) {
        var pdf = window.KeilyPdf.buildPdf({
          name: res.name, betrag: res.betrag, anteile: res.anteile, schein_nr: res.schein_nr,
          zeitpunktText: zpText, team: TEAM.map(function (p) { return { name: p.name, beruf: p.beruf }; })
        }, logo);
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
        var dl = $('#download');
        dl.href = lastUrl;
        dl.setAttribute('download', 'Keily-Zeichnungsschein-' + res.schein_nr + '.pdf');
        var vorname = res.name.split(' ')[0];
        $('#done-h').textContent = 'Vielen Dank, ' + vorname + '!';
        $('#done-text').textContent = 'Sie haben ' + res.anteile.toLocaleString('de-DE') +
          (res.anteile === 1 ? ' Genussrecht' : ' Genussrechte') + ' über ' + euro2(res.betrag) +
          ' gezeichnet. Ihr Zeichnungsschein ist fertig.';
        $('#done-nr').textContent = res.schein_nr;
        form.hidden = true;
        $('#done').hidden = false;
        $('#done').focus({ preventScroll: true });
        $('#zeichnung').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        render({ summe: res.summe, anzahl: stand.anzahl + 1, ziel: res.ziel });
      });
    }).catch(function (err) {
      if (err && err.fachlich) showError(err.message);
      else showError('Die Zeichnung konnte nicht übertragen werden. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
    }).then(function () {
      btn.disabled = false; btn.textContent = 'Anteil zeichnen';
    });
  });

  $('#again').addEventListener('click', function () {
    $('#done').hidden = true;
    form.reset();
    free.hidden = true;
    render(stand);
    $('#name').focus();
  });

  /* Mobile Leiste ausblenden, sobald die Beteiligung sichtbar ist */
  var dock = $('#dock');
  if ('IntersectionObserver' in window) {
    var sichtbar = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { sichtbar.set(en.target, en.isIntersecting); });
      var an = false; sichtbar.forEach(function (v) { if (v) an = true; });
      dock.classList.toggle('is-hidden', an);
    }, { threshold: 0.05 });
    io.observe($('#beteiligen'));
    io.observe($('.foot'));
  }
})();
