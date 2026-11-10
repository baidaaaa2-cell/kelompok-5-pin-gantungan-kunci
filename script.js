/* Dashboard SPK Supplier (SAW)
   Alur: berkas CSV/Excel -> tabel (array of arrays) -> model (kriteria, alternatif)
         -> hitung SAW -> gambar grafik. Semua berjalan di browser. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. DATA CONTOH (Modul 4). Sekaligus dipakai sebagai isi template.
     Baris 1 judul kolom, baris "Jenis", baris "Bobot", lalu data supplier.
  ------------------------------------------------------------------ */
  var SAMPLE_AOA = [
    ['Alternatif', 'Harga per set', 'Kualitas bahan', 'Kecepatan pengiriman', 'Pelayanan', 'Retur barang', 'Tempo pembayaran', 'Diskon pembelian'],
    ['Jenis', 'Cost', 'Benefit', 'Benefit', 'Benefit', 'Benefit', 'Benefit', 'Benefit'],
    ['Bobot', 25, 25, 15, 10, 10, 10, 5],
    ['A1', 129000, 0.75, 0.75, 0.75, 0.75, 0.50, 0.50],
    ['A2', 120000, 0.50, 0.50, 0.50, 0.50, 0.25, 0.75],
    ['A3', 135000, 1.00, 0.75, 1.00, 1.00, 0.75, 0.50],
    ['A4', 115000, 0.50, 0.50, 0.50, 0.25, 0.25, 1.00],
    ['A5', 125000, 0.75, 1.00, 0.75, 0.75, 0.50, 0.75],
    ['A6', 140000, 1.00, 1.00, 1.00, 0.75, 0.75, 0.50],
    ['A7', 118000, 0.75, 0.75, 0.75, 0.50, 0.50, 0.75],
    ['A8', 130000, 0.75, 0.50, 0.75, 0.75, 0.50, 0.50]
  ];
  var SAMPLE_NAME = 'Data contoh Modul 4';
  var PALET = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)'];
  var ABU = 'var(--gray-bar)';

  /* ------------------------------------------------------------------
     2. PEMBACAAN BERKAS
  ------------------------------------------------------------------ */
  function detectDelimiter(text) {
    var first = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; })[0] || '';
    var count = { ';': 0, '\t': 0, ',': 0 }, inQuote = false, i, ch;
    for (i = 0; i < first.length; i++) {
      ch = first.charAt(i);
      if (ch === '"') inQuote = !inQuote;
      else if (!inQuote && count.hasOwnProperty(ch)) count[ch]++;
    }
    var best = ',', max = 0;
    [';', '\t', ','].forEach(function (d) { if (count[d] > max) { max = count[d]; best = d; } });
    return best;
  }

  function parseCSV(text, delim) {
    var rows = [], row = [], field = '', inQuote = false, i, ch;
    text = text.replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (inQuote) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i++; } else inQuote = false;
        } else field += ch;
      } else if (ch === '"') inQuote = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* Mengubah teks angka gaya Indonesia atau Inggris: "0,75", "0.75", "129.000", "Rp 129.000", "25%". */
  function parseNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var s = String(v == null ? '' : v).replace(/rp|%|\s| /gi, '');
    if (!s) return NaN;
    var neg = false, out;
    if (s.charAt(0) === '-') { neg = true; s = s.slice(1); } else if (s.charAt(0) === '+') s = s.slice(1);
    if (!/^[0-9.,]+$/.test(s)) return NaN;
    var hasDot = s.indexOf('.') >= 0, hasCom = s.indexOf(',') >= 0;
    if (hasDot && hasCom) {
      var dec = s.charAt(Math.max(s.lastIndexOf('.'), s.lastIndexOf(',')));
      out = s.split(dec === '.' ? ',' : '.').join('');
      if (dec === ',') out = out.replace(',', '.');
    } else if (hasCom) {
      out = /^[1-9]\d{0,2}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (hasDot) {
      out = /^[1-9]\d{0,2}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
    } else out = s;
    var n = Number(out);
    return isFinite(n) ? (neg ? -n : n) : NaN;
  }

  function cleanText(v) { return String(v == null ? '' : v).replace(/ /g, ' ').trim(); }
  function norm(v) { return cleanText(v).toLowerCase(); }

  /* Tabel -> model. Melempar Error berisi pesan yang bisa dibaca pengguna. */
  function buildModel(aoa) {
    var rows = aoa.filter(function (r) { return r.some(function (c) { return cleanText(c) !== ''; }); });
    if (rows.length < 4) throw new Error('Data terlalu pendek. Dibutuhkan baris judul, baris Jenis, baris Bobot, dan minimal 2 supplier.');
    var header = rows[0];
    var iJenis = -1, iBobot = -1, i;
    for (i = 1; i < rows.length; i++) {
      if (iJenis < 0 && norm(rows[i][0]) === 'jenis') iJenis = i;
      else if (iBobot < 0 && norm(rows[i][0]) === 'bobot') iBobot = i;
    }
    if (iJenis < 0) throw new Error('Baris "Jenis" tidak ditemukan. Isi kolom pertama dengan kata Jenis, lalu tulis Cost atau Benefit untuk tiap kriteria.');
    if (iBobot < 0) throw new Error('Baris "Bobot" tidak ditemukan. Isi kolom pertama dengan kata Bobot, lalu tulis bobot tiap kriteria.');

    var lastCol = 0, j;
    for (j = 1; j < header.length; j++) if (cleanText(header[j]) !== '') lastCol = j;
    if (lastCol < 2) throw new Error('Dibutuhkan minimal 2 kriteria (kolom setelah kolom pertama pada baris judul).');

    var warnings = [], criteria = [], sumW = 0;
    for (j = 1; j <= lastCol; j++) {
      var name = cleanText(header[j]) || ('Kriteria ' + j);
      var t = norm(rows[iJenis][j]), type;
      if (t === 'cost' || t === 'biaya') type = 'Cost';
      else if (t === 'benefit' || t === 'keuntungan' || t === 'manfaat') type = 'Benefit';
      else throw new Error('Jenis kriteria "' + name + '" harus Cost atau Benefit (ditemukan: "' + cleanText(rows[iJenis][j]) + '").');
      var w = parseNum(rows[iBobot][j]);
      if (!isFinite(w) || w <= 0) throw new Error('Bobot kriteria "' + name + '" harus berupa angka lebih dari 0.');
      criteria.push({ name: name, type: type, w: w });
      sumW += w;
    }
    if (Math.abs(sumW - 1) < 0.001) { /* sudah pecahan */ }
    else if (Math.abs(sumW - 100) < 0.5) criteria.forEach(function (c) { c.w = c.w / 100; });
    else {
      criteria.forEach(function (c) { c.w = c.w / sumW; });
      warnings.push('Total bobot pada berkas adalah ' + String(Math.round(sumW * 1000) / 1000).replace('.', ',') + ' (bukan 100 atau 1). Bobot dinormalkan otomatis sehingga totalnya 100%.');
    }

    var alts = [], seen = {};
    for (i = 1; i < rows.length; i++) {
      if (i === iJenis || i === iBobot) continue;
      var aname = cleanText(rows[i][0]);
      if (!aname) throw new Error('Ada baris data tanpa nama alternatif pada kolom pertama.');
      if (seen[aname]) throw new Error('Nama alternatif "' + aname + '" muncul lebih dari sekali.');
      seen[aname] = true;
      var xs = [];
      for (j = 1; j <= lastCol; j++) {
        var x = parseNum(rows[i][j]);
        if (!isFinite(x)) throw new Error('Nilai "' + cleanText(rows[i][j]) + '" pada alternatif ' + aname + ', kriteria "' + criteria[j - 1].name + '" bukan angka yang valid.');
        xs.push(x);
      }
      alts.push({ name: aname, x: xs });
    }
    if (alts.length < 2) throw new Error('Dibutuhkan minimal 2 alternatif supplier.');

    criteria.forEach(function (c, k) {
      var col = alts.map(function (a) { return a.x[k]; });
      if (col.some(function (x) { return x < 0; })) throw new Error('Kriteria "' + c.name + '" memiliki nilai negatif. Gunakan nilai 0 atau lebih.');
      if (c.type === 'Cost' && col.some(function (x) { return x === 0; })) throw new Error('Kriteria Cost "' + c.name + '" tidak boleh bernilai 0 karena dipakai sebagai pembagi.');
      if (c.type === 'Benefit' && Math.max.apply(null, col) === 0) throw new Error('Kriteria Benefit "' + c.name + '" bernilai 0 untuk semua alternatif.');
    });
    return { criteria: criteria, alts: alts, warnings: warnings };
  }

  /* ------------------------------------------------------------------
     3. PERHITUNGAN SAW
  ------------------------------------------------------------------ */
  function computeSAW(m) {
    var ref = m.criteria.map(function (c, j) {
      var col = m.alts.map(function (a) { return a.x[j]; });
      return c.type === 'Cost' ? Math.min.apply(null, col) : Math.max.apply(null, col);
    });
    m.alts.forEach(function (a) {
      a.r = a.x.map(function (x, j) { return m.criteria[j].type === 'Cost' ? ref[j] / x : x / ref[j]; });
      a.p = a.r.map(function (r, j) { return r * m.criteria[j].w; });
      a.v = a.p.reduce(function (s, p) { return s + p; }, 0);
    });
    m.sorted = m.alts.slice().sort(function (a, b) { return b.v - a.v; });
    m.sorted.forEach(function (a, i) {
      a.rank = (i > 0 && Math.abs(a.v - m.sorted[i - 1].v) < 1e-12) ? m.sorted[i - 1].rank : i + 1;
    });
    return m;
  }

  /* ------------------------------------------------------------------
     4. FORMAT DAN BANTUAN TAMPILAN
  ------------------------------------------------------------------ */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function f4(n) { return n.toFixed(4).replace('.', ','); }
  function f2(n) { return n.toFixed(2).replace('.', ','); }
  function pct(n) { return (Math.round(n * 1000) / 10).toString().replace('.', ',') + '%'; }
  function numID(n) {
    if (Math.abs(n) >= 1000 && Math.round(n) === n) return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (Math.round(n * 10000) / 10000).toString().replace('.', ',');
  }
  function listID(a) {
    if (a.length <= 1) return a.join('');
    return a.slice(0, -1).join(', ') + ' dan ' + a[a.length - 1];
  }
  function $(id) { return document.getElementById(id); }

  /* Kriteria ke-8 dan seterusnya digabung menjadi satu warna abu pada grafik. */
  function groupsOf(m) {
    var g = [], j;
    for (j = 0; j < Math.min(PALET.length, m.criteria.length); j++) {
      g.push({ name: 'C' + (j + 1) + ' ' + m.criteria[j].name, color: PALET[j], idx: [j] });
    }
    if (m.criteria.length > PALET.length) {
      var rest = [];
      for (j = PALET.length; j < m.criteria.length; j++) rest.push(j);
      g.push({ name: 'Kriteria lain (' + rest.length + ')', color: ABU, idx: rest });
    }
    return g;
  }
  function colorOfCriterion(j) { return j < PALET.length ? PALET[j] : ABU; }

  /* ------------------------------------------------------------------
     5. GAMBAR DASHBOARD
  ------------------------------------------------------------------ */
  var state = { model: null, source: '', sample: false, current: -1 };

  function axisHtml(ticks) {
    return '<div class="axis" aria-hidden="true">' + ticks.map(function (t) {
      return '<i style="left:' + (t.p * 100) + '%">' + t.l + '</i>';
    }).join('') + '</div>';
  }
  var VTICKS = [0, 0.25, 0.5, 0.75, 1].map(function (v) { return { p: v, l: f2(v) }; });

  function render() {
    var m = state.model;
    if (!m) return;
    var best = m.sorted[0], second = m.sorted[1], cur = state.current >= 0 ? m.alts[state.current] : null;
    var gap = best.v - second.v, gapPct = second.v > 0 ? gap / second.v * 100 : 0;
    var nCost = m.criteria.filter(function (c) { return c.type === 'Cost'; }).length;

    /* ringkasan */
    var t2;
    if (cur) {
      t2 = '<div class="tile"><span class="lbl">Supplier saat ini (' + esc(cur.name) + ')</span><span class="val">Peringkat ' + cur.rank +
        '</span><span class="note">' + (cur === best ? 'Sudah yang terbaik, Vi ' + f4(cur.v) : 'Vi ' + f4(cur.v) + ', selisih ' + f4(best.v - cur.v) + ' dari ' + esc(best.name)) + '</span></div>';
    } else {
      t2 = '<div class="tile"><span class="lbl">Peringkat kedua</span><span class="val">' + esc(second.name) +
        '</span><span class="note">Vi ' + f4(second.v) + '</span></div>';
    }
    $('kpis').innerHTML =
      '<div class="tile hero"><span class="lbl">Supplier terbaik</span><span class="val">' + esc(best.name) + '<small>Vi ' + f4(best.v) +
      '</small></span><span class="note">Peringkat 1 dari ' + m.alts.length + ' alternatif</span></div>' + t2 +
      '<div class="tile"><span class="lbl">Selisih ' + esc(best.name) + ' dan ' + esc(second.name) + '</span><span class="val">' + f4(gap) +
      '</span><span class="note">' + String(gapPct.toFixed(2)).replace('.', ',') + '%' + (gapPct < 1 ? ', hampir setara' : '') + '</span></div>' +
      '<div class="tile"><span class="lbl">Cakupan analisis</span><span class="val">' + m.alts.length + ' × ' + m.criteria.length +
      '</span><span class="note">' + m.alts.length + ' alternatif, ' + m.criteria.length + ' kriteria (' + nCost + ' cost, ' + (m.criteria.length - nCost) + ' benefit)</span></div>';

    /* kalimat temuan, disusun dari data */
    var s1 = esc(best.name) + (gap < 1e-12 ? ' setara dengan ' : ' unggul' + (gapPct < 1 ? ' tipis' : '') + ' atas ') + esc(second.name) + '.';
    if (cur) s1 += cur === best ? ' ' + esc(cur.name) + ' (supplier saat ini) sudah menjadi yang terbaik.' : ' Supplier saat ini (' + esc(cur.name) + ') berada di peringkat ' + cur.rank + '.';
    var ci = -1;
    m.criteria.forEach(function (c, j) { if (c.type === 'Cost' && (ci < 0 || c.w > m.criteria[ci].w)) ci = j; });
    if (ci >= 0) {
      var cheap = m.alts[0];
      m.alts.forEach(function (a) { if (a.x[ci] < cheap.x[ci]) cheap = a; });
      s1 += ' Nilai ' + esc(m.criteria[ci].name) + ' terendah dimiliki ' + esc(cheap.name) + ', yang berada di peringkat ' + cheap.rank + '.';
    }
    $('f-rank').innerHTML = s1;

    var wsorted = m.criteria.map(function (c, j) { return { c: c, j: j }; }).sort(function (a, b) { return b.c.w - a.c.w; });
    $('f-weights').textContent = 'Bobot terbesar: ' + listID(wsorted.slice(0, 2).map(function (o) { return o.c.name + ' (' + pct(o.c.w) + ')'; })) +
      '. Kriteria bertipe cost: ' + (nCost ? listID(m.criteria.filter(function (c) { return c.type === 'Cost'; }).map(function (c) { return c.name; })) : 'tidak ada') + '.';

    var leads = [], trails = [];
    m.criteria.forEach(function (c, j) {
      var d = best.p[j] - second.p[j];
      if (d > 1e-9) leads.push({ n: c.name, d: d }); else if (d < -1e-9) trails.push({ n: c.name, d: -d });
    });
    leads.sort(function (a, b) { return b.d - a.d; }); trails.sort(function (a, b) { return b.d - a.d; });
    var nm = function (o) { return o.n; };
    $('f-stack').innerHTML = 'Panjang batang = Vi; tiap warna = bobot × rij satu kriteria. ' + esc(best.name) +
      (leads.length ? ' unggul dari ' + esc(second.name) + ' pada ' + esc(listID(leads.slice(0, 3).map(nm))) : ' tidak unggul pada kriteria mana pun') +
      (trails.length ? ' tetapi tertinggal pada ' + esc(listID(trails.slice(0, 3).map(nm))) : '') + '.';

    /* peringkat */
    var h = axisHtml(VTICKS);
    m.sorted.forEach(function (a) {
      var isCur = cur && a === cur, isBest = a === best;
      var col = isBest ? 'var(--c1)' : (isCur ? 'var(--c2)' : ABU);
      var tag = isBest && isCur ? 'terbaik, saat ini' : isBest ? 'terbaik' : isCur ? 'saat ini' : '';
      var tip = '<b>' + esc(a.name) + '</b> peringkat ' + a.rank + '<br>Vi ' + f4(a.v);
      h += '<div class="row"><div class="name">' + esc(a.name) + (tag ? '<em>' + tag + '</em>' : '') + '</div><div class="plot">' +
        '<div class="bar" tabindex="0" role="img" aria-label="' + esc(a.name) + ' peringkat ' + a.rank + ', Vi ' + f4(a.v) + '" data-tip="' + esc(tip) +
        '" style="width:' + (a.v * 100) + '%;background:' + col + '"></div><span class="tipval" style="left:' + (a.v * 100) + '%">' + f4(a.v) + '</span></div></div>';
    });
    $('rank').innerHTML = h;
    $('rank-legend').innerHTML = '<span><i class="dot" style="background:var(--c1)"></i>Terbaik</span>' +
      (cur && cur !== best ? '<span><i class="dot" style="background:var(--c2)"></i>Supplier saat ini</span>' : '') +
      '<span><i class="dot" style="background:var(--gray-bar)"></i>Alternatif lain</span>';

    /* bobot */
    var maxW = Math.max.apply(null, m.criteria.map(function (c) { return c.w; }));
    var wmax = Math.ceil((maxW + 0.001) * 10) / 10, wticks = [], v;
    for (v = 0; v <= wmax + 1e-9; v += 0.1) wticks.push({ p: v / wmax, l: Math.round(v * 100) + '%' });
    h = axisHtml(wticks);
    m.criteria.forEach(function (c, j) {
      var tip = '<b>C' + (j + 1) + ' ' + esc(c.name) + '</b><br>Bobot ' + pct(c.w) + '<br>Jenis ' + c.type.toLowerCase();
      h += '<div class="row"><div class="name">C' + (j + 1) + ' ' + esc(c.name) + '<em>' + c.type + '</em></div><div class="plot" style="--gs:' + (0.1 / wmax * 100) + '%">' +
        '<div class="bar" tabindex="0" role="img" aria-label="' + esc(c.name) + ', bobot ' + pct(c.w) + '" data-tip="' + esc(tip) + '" style="width:' + (c.w / wmax * 100) +
        '%;background:' + colorOfCriterion(j) + '"></div><span class="tipval" style="left:' + (c.w / wmax * 100) + '%">' + pct(c.w) + '</span></div></div>';
    });
    $('weights').innerHTML = h;

    /* komposisi nilai */
    var groups = groupsOf(m);
    $('stack-legend').innerHTML = groups.map(function (g) { return '<span><i class="dot" style="background:' + g.color + '"></i>' + esc(g.name) + '</span>'; }).join('');
    h = axisHtml(VTICKS);
    m.sorted.forEach(function (a) {
      var isCur = cur && a === cur;
      var segs = groups.map(function (g) {
        var p = g.idx.reduce(function (s, j) { return s + a.p[j]; }, 0);
        var line = g.idx.length === 1 ? f2(m.criteria[g.idx[0]].w) + ' × ' + f4(a.r[g.idx[0]]) + ' = ' + f4(p) : 'Kontribusi gabungan ' + f4(p);
        var tip = '<b>' + esc(a.name) + ' · ' + esc(g.name) + '</b><br>' + line;
        return '<div class="seg" tabindex="0" role="img" aria-label="' + esc(a.name) + ', ' + esc(g.name) + ', kontribusi ' + f4(p) + '" data-tip="' + esc(tip) +
          '" style="flex:' + (p * 1000) + ' 1 0;background:' + g.color + '"></div>';
      }).join('');
      h += '<div class="row"><div class="name">' + esc(a.name) + (isCur ? '<em>saat ini</em>' : '') + '</div><div class="plot"><div class="stack" style="width:' + (a.v * 100) +
        '%">' + segs + '</div><span class="tipval" style="left:' + (a.v * 100) + '%">' + f4(a.v) + '</span></div></div>';
    });
    $('stack').innerHTML = h;

    /* tabel */
    var t = '<thead><tr><th>Alternatif</th>' + m.criteria.map(function (c, j) {
      return '<th>C' + (j + 1) + '<small>' + esc(c.name) + '</small><small>' + c.type.toLowerCase() + ', bobot ' + pct(c.w) + '</small></th>';
    }).join('') + '<th>Vi</th><th>Peringkat</th></tr></thead><tbody>';
    m.sorted.forEach(function (a) {
      t += '<tr><td>' + esc(a.name) + (cur && a === cur ? ' <span style="color:var(--muted);font-size:12px">(saat ini)</span>' : '') + '</td>' +
        a.r.map(function (r, j) {
          return '<td class="heat" style="background:rgba(var(--heat),' + (0.06 + 0.46 * Math.min(1, r)).toFixed(3) + ')" title="nilai awal: ' + esc(numID(a.x[j])) + '">' + f4(r) + '</td>';
        }).join('') + '<td class="v">' + f4(a.v) + '</td><td>' + a.rank + '</td></tr>';
    });
    $('tbl').innerHTML = t + '</tbody>';
  }

  function fillCurrentSelect(preferred) {
    var m = state.model, sel = $('current');
    sel.innerHTML = '<option value="-1">Tidak ada</option>' + m.alts.map(function (a, i) {
      return '<option value="' + i + '">' + esc(a.name) + '</option>';
    }).join('');
    state.current = preferred;
    sel.value = String(preferred);
  }

  function showNotice() {
    var m = state.model, html;
    if (state.sample) {
      html = '<span class="ic" aria-hidden="true">!</span><div><b>Data contoh.</b> Harga A1 (Rp129.000) berasal dari Modul 1. Data A2 sampai A8 dan seluruh rating kriteria C2 sampai C7 bersifat hipotetik, sehingga peringkat ini belum menjadi dasar keputusan pembelian. Unggah berkas Anda untuk mengganti data.</div>';
    } else {
      html = '<span class="ic info" aria-hidden="true">i</span><div><b>' + esc(state.source) + '</b>: ' + m.alts.length + ' alternatif dan ' + m.criteria.length + ' kriteria berhasil dibaca.' +
        (m.warnings.length ? '<ul>' + m.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    }
    $('notice').innerHTML = html;
  }

  function loadModel(model, source, isSample) {
    state.model = computeSAW(model);
    state.source = source;
    state.sample = isSample;
    fillCurrentSelect(isSample ? 0 : -1);
    showNotice();
    render();
    $('error').hidden = true;
    $('status').textContent = 'Menampilkan: ' + source + '.';
  }

  function showError(msg) {
    var box = $('error');
    box.textContent = msg + ' Dashboard di bawah masih menampilkan data sebelumnya.';
    box.hidden = false;
    $('status').textContent = '';
  }

  /* ------------------------------------------------------------------
     6. UNGGAH, UNDUH, DAN TOOLTIP
  ------------------------------------------------------------------ */
  function decodeText(buf) {
    var txt = new TextDecoder('utf-8').decode(buf);
    if (txt.indexOf('�') >= 0) { try { txt = new TextDecoder('windows-1252').decode(buf); } catch (e) { /* biarkan */ } }
    return txt;
  }

  function handleFile(file) {
    if (!file) return;
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    $('status').textContent = 'Membaca ' + file.name + ' ...';
    file.arrayBuffer().then(function (buf) {
      var aoa;
      if (ext === 'xlsx' || ext === 'xls') {
        if (!window.XLSX) throw new Error('Pustaka pembaca Excel belum termuat (periksa koneksi internet). Simpan data sebagai CSV lalu unggah ulang.');
        var wb = window.XLSX.read(buf, { type: 'array' });
        aoa = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
      } else if (ext === 'csv' || ext === 'txt') {
        var text = decodeText(buf);
        aoa = parseCSV(text, detectDelimiter(text));
      } else throw new Error('Format berkas ".' + ext + '" tidak didukung. Gunakan CSV atau Excel (.xlsx).');
      loadModel(buildModel(aoa), file.name, false);
    }).catch(function (err) { showError(err.message || String(err)); });
  }

  function toCSV(aoa) {
    return aoa.map(function (r) {
      return r.map(function (c) {
        var s = typeof c === 'number' ? String(c).replace('.', ',') : String(c);
        return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\r\n');
  }
  function downloadBlob(name, text, mime) {
    var blob = new Blob(['﻿' + text], { type: mime + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function downloadResults() {
    var m = state.model;
    if (!m) return;
    var head = ['Peringkat', 'Alternatif'].concat(m.criteria.map(function (c) { return c.name + ' (nilai)'; }))
      .concat(m.criteria.map(function (c) { return c.name + ' (rij)'; })).concat(['Vi']);
    var rows = m.sorted.map(function (a) { return [a.rank, a.name].concat(a.x).concat(a.r).concat([a.v]); });
    if (window.XLSX) {
      var wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([head].concat(rows)), 'Hasil SAW');
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([['Kode', 'Kriteria', 'Jenis', 'Bobot']].concat(
        m.criteria.map(function (c, j) { return ['C' + (j + 1), c.name, c.type, c.w]; }))), 'Kriteria');
      window.XLSX.writeFile(wb, 'hasil_saw.xlsx');
    } else downloadBlob('hasil_saw.csv', toCSV([head].concat(rows)), 'text/csv');
  }

  function downloadTemplateXlsx() {
    if (!window.XLSX) { showError('Pustaka Excel belum termuat, jadi template Excel tidak dapat dibuat. Gunakan template CSV.'); return; }
    var wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(SAMPLE_AOA), 'Data');
    window.XLSX.writeFile(wb, 'template_data_spk.xlsx');
  }

  var tip = $('tip');
  function placeTip(x, y) {
    var w = tip.offsetWidth, hh = tip.offsetHeight;
    tip.style.left = Math.min(Math.max(8, x + 12), window.innerWidth - w - 8) + 'px';
    var top = y + 16; if (top + hh > window.innerHeight - 8) top = y - hh - 12;
    tip.style.top = Math.max(8, top) + 'px';
  }
  function showTip(el, x, y) { tip.innerHTML = el.getAttribute('data-tip'); tip.hidden = false; placeTip(x, y); }

  function init() {
    var drop = $('drop');
    $('file').addEventListener('change', function (e) { handleFile(e.target.files[0]); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { handleFile(e.dataTransfer && e.dataTransfer.files[0]); });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });

    $('btn-sample').addEventListener('click', function () { loadModel(buildModel(SAMPLE_AOA), SAMPLE_NAME, true); });
    $('btn-tpl-xlsx').addEventListener('click', downloadTemplateXlsx);
    $('btn-tpl-csv').addEventListener('click', function () { downloadBlob('template_data_spk.csv', toCSV(SAMPLE_AOA), 'text/csv'); });
    $('btn-download').addEventListener('click', downloadResults);
    $('current').addEventListener('change', function (e) { state.current = parseInt(e.target.value, 10); render(); });

    document.addEventListener('pointermove', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true; });
    document.addEventListener('click', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true; });
    document.addEventListener('focusin', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) { var r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); } });
    document.addEventListener('focusout', function () { tip.hidden = true; });

    loadModel(buildModel(SAMPLE_AOA), SAMPLE_NAME, true);
  }

  /* dibuka untuk pengujian */
  window.SPK = { parseNum: parseNum, buildModel: buildModel, computeSAW: computeSAW, parseCSV: parseCSV, detectDelimiter: detectDelimiter };
  init();
})();
