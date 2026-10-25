/* Keily – Zeichnungsschein als PDF, ohne externe Bibliothek.
   Nutzt die PDF-Standardschriften (Helvetica) mit WinAnsi-Kodierung
   und bettet das Logo als JPEG ein. Läuft im Browser und in Node. */
(function (root) {
  'use strict';

  /* Zeichenbreiten (1/1000 em) der Standardschriften, WinAnsi-Reihenfolge */
  const W_H=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
  const W_HB=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];

  var WIN_SPECIAL = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86,
    0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
    0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
  };

  function winAnsi(str) {
    var out = [];
    var s = String(str);
    for (var i = 0; i < s.length; i++) {
      var c = s.codePointAt(i);
      if (c > 0xffff) i++;
      if (c >= 32 && c <= 126) { out.push(c); continue; }
      if (c >= 0xA0 && c <= 0xFF) { out.push(c); continue; }
      if (WIN_SPECIAL[c]) { out.push(WIN_SPECIAL[c]); continue; }
      /* Unbekannte Zeichen: Akzent entfernen, sonst Fragezeichen */
      var base = String.fromCodePoint(c).normalize('NFD').charCodeAt(0);
      out.push(base >= 32 && base <= 126 ? base : 63);
    }
    return out;
  }

  function pdfString(bytes) {
    var s = '(';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      if (b === 40 || b === 41 || b === 92) s += '\\' + String.fromCharCode(b);
      else if (b < 32 || b > 126) s += '\\' + ('00' + b.toString(8)).slice(-3);
      else s += String.fromCharCode(b);
    }
    return s + ')';
  }

  function textWidth(str, font, size) {
    var w = font === 'F2' ? W_HB : W_H;
    var bytes = winAnsi(str), sum = 0;
    for (var i = 0; i < bytes.length; i++) sum += w[bytes[i]] || 556;
    return sum / 1000 * size;
  }

  function jpegSize(u8) {
    var i = 2;
    while (i < u8.length) {
      if (u8[i] !== 0xFF) { i++; continue; }
      var m = u8[i + 1];
      if (m >= 0xC0 && m <= 0xC3) {
        return { h: (u8[i + 5] << 8) | u8[i + 6], w: (u8[i + 7] << 8) | u8[i + 8] };
      }
      i += 2 + ((u8[i + 2] << 8) | u8[i + 3]);
    }
    throw new Error('JPEG ohne Größenangabe');
  }

  function rgb(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
      .map(function (v) { return +v.toFixed(3); }).join(' ');
  }

  function euro(n) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  /* Baut den Inhalt der Seite (A4: 595 x 842 pt) */
  function buildContent(d, img) {
    var ops = [];
    var W = 595, H = 842;
    function fill(c) { ops.push(rgb(c) + ' rg'); }
    function stroke(c) { ops.push(rgb(c) + ' RG'); }
    function rect(x, y, w, h, mode) { ops.push(x + ' ' + y + ' ' + w + ' ' + h + ' re ' + mode); }
    function line(x1, y1, x2, y2, w, c) {
      stroke(c); ops.push(w + ' w ' + x1 + ' ' + y1 + ' m ' + x2 + ' ' + y2 + ' l S');
    }
    function text(str, x, y, font, size, color, align) {
      var tw = textWidth(str, font, size);
      if (align === 'center') x = x - tw / 2;
      if (align === 'right') x = x - tw;
      fill(color || '#000000');
      ops.push('BT /' + font + ' ' + size + ' Tf ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Td ' +
        pdfString(winAnsi(str)) + ' Tj ET');
    }
    function fitSize(str, font, max, maxW) {
      var s = max;
      while (s > 12 && textWidth(str, font, s) > maxW) s -= 1;
      return s;
    }

    var INK = '#000000', GREEN = '#2F6B22', GREY = '#5A5148', PAPER = '#F1E2BB', MUSTARD = '#FED01A';

    /* Rahmen */
    stroke(INK); ops.push('2.5 w'); rect(24, 24, W - 48, H - 48, 'S');
    line(31, 31, W - 31, 31, 0.8, GREEN); line(31, H - 31, W - 31, H - 31, 0.8, GREEN);
    line(31, 31, 31, H - 31, 0.8, GREEN); line(W - 31, 31, W - 31, H - 31, 0.8, GREEN);

    /* Kopfband mit Logo */
    fill(PAPER); rect(31, H - 221, W - 62, 190, 'f');
    line(31, H - 221, W - 31, H - 221, 2, INK);
    var ih = 172, iw = Math.round(ih * img.w / img.h);
    ops.push('q ' + iw + ' 0 0 ' + ih + ' 46 ' + (H - 212) + ' cm /Im1 Do Q');
    text('Genussrechtsschein', 196, H - 104, 'F2', 31, INK);
    text('Deklaratorische Zeichnungsbestätigung', 197, H - 128, 'F1', 13, INK);
    fill(MUSTARD); stroke(INK); ops.push('1.5 w'); rect(196, H - 172, 186, 26, 'B');
    text('Schein-Nr. ' + d.schein_nr, 289, H - 163, 'F2', 12, INK, 'center');

    /* Hauptteil */
    var cx = W / 2;
    text('Hiermit bestätigt Keily, dass', cx, 560, 'F1', 13, INK, 'center');
    var ns = fitSize(d.name, 'F2', 28, 440);
    text(d.name, cx, 518, 'F2', ns, INK, 'center');
    line(110, 505, W - 110, 505, 0.8, INK);
    text('Genussrechte im Gesamtnennbetrag von', cx, 476, 'F1', 13, INK, 'center');
    text(euro(d.betrag), cx, 432, 'F2', 36, GREEN, 'center');
    text('(' + d.anteile + (d.anteile === 1 ? ' Genussrecht' : ' Genussrechte') +
      ' zu je 20,00 €) gezeichnet hat.', cx, 406, 'F1', 13, INK, 'center');

    /* Bedingungen */
    var rows = [
      ['Emission', 'Keily Genussrecht 2026'],
      ['Emissionsvolumen', '7.840,00 €'],
      ['Verzinsung', '5,0 % p. a.'],
      ['Laufzeit', '8 Jahre'],
      ['Zeichnungszeitpunkt', d.zeitpunktText]
    ];
    var top = 360, rh = 21, x1 = 120, x2 = W - 120;
    line(x1, top + 6, x2, top + 6, 1.2, INK);
    rows.forEach(function (r, i) {
      var y = top - 10 - i * rh;
      text(r[0], x1, y, 'F1', 11, GREY);
      text(r[1], x2, y, 'F2', 11, INK, 'right');
      line(x1, y - 7, x2, y - 7, 0.4, '#B9AE93');
    });

    /* Unterschriften */
    text('Für das Gründungsteam', cx, 196, 'F1', 10, GREY, 'center');
    var team = d.team || [];
    var colW = (W - 120) / team.length;
    team.forEach(function (p, i) {
      var mx = 60 + colW * i + colW / 2;
      text(p.name, mx, 150, 'F3', 15, INK, 'center');
      line(mx - colW / 2 + 12, 142, mx + colW / 2 - 12, 142, 0.8, INK);
      if (p.beruf) text(p.beruf, mx, 129, 'F1', 8.5, GREY, 'center');
    });

    /* Fußzeile */
    line(60, 92, W - 60, 92, 0.4, '#B9AE93');
    text('Symbolischer Schein, erstellt im Rahmen der Abschlusspräsentation der Samstagsschule 2026 für begabte Handwerker.',
      cx, 76, 'F1', 8, GREY, 'center');
    text('Er verbrieft keine Rechte, ist keine Vermögensanlage und begründet keine Zahlungspflicht.',
      cx, 64, 'F1', 8, GREY, 'center');
    return ops.join('\n');
  }

  function concat(parts) {
    var len = 0, i;
    for (i = 0; i < parts.length; i++) len += parts[i].length;
    var out = new Uint8Array(len), off = 0;
    for (i = 0; i < parts.length; i++) { out.set(parts[i], off); off += parts[i].length; }
    return out;
  }
  function ascii(s) {
    var u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
    return u;
  }

  /* d: {name, betrag, anteile, schein_nr, zeitpunktText, team:[{name,beruf}]}
     jpeg: Uint8Array des Logos. Rückgabe: Uint8Array mit dem PDF */
  function buildPdf(d, jpeg) {
    var img = jpegSize(jpeg);
    var content = ascii(buildContent(d, img));
    var objs = [];
    objs[1] = ascii('<< /Type /Catalog /Pages 2 0 R >>');
    objs[2] = ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objs[3] = ascii('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> /XObject << /Im1 7 0 R >> >> ' +
      '/Contents 8 0 R >>');
    function font(n) { return ascii('<< /Type /Font /Subtype /Type1 /BaseFont /' + n + ' /Encoding /WinAnsiEncoding >>'); }
    objs[4] = font('Helvetica'); objs[5] = font('Helvetica-Bold'); objs[6] = font('Helvetica-Oblique');
    objs[7] = concat([ascii('<< /Type /XObject /Subtype /Image /Width ' + img.w + ' /Height ' + img.h +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n'),
      jpeg, ascii('\nendstream')]);
    objs[8] = concat([ascii('<< /Length ' + content.length + ' >>\nstream\n'), content, ascii('\nendstream')]);
    objs[9] = concat([ascii('<< /Title '), ascii(pdfString(winAnsi('Keily Genussrechtsschein ' + d.schein_nr))),
      ascii(' /Author (Keily) /Creator (keily.pages.dev) >>')]);

    var parts = [ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
    var offsets = [], pos = parts[0].length;
    for (var n = 1; n < objs.length; n++) {
      offsets[n] = pos;
      var chunk = concat([ascii(n + ' 0 obj\n'), objs[n], ascii('\nendobj\n')]);
      parts.push(chunk); pos += chunk.length;
    }
    var xref = 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (n = 1; n < objs.length; n++) xref += ('0000000000' + offsets[n]).slice(-10) + ' 00000 n \n';
    xref += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R /Info 9 0 R >>\nstartxref\n' + pos + '\n%%EOF\n';
    parts.push(ascii(xref));
    return concat(parts);
  }

  var api = { buildPdf: buildPdf, textWidth: textWidth };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KeilyPdf = api;
})(typeof window !== 'undefined' ? window : this);
