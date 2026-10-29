(function () {
  const C = window.CT.company;
  const page = document.body.dataset.page || '';
  const img = n => `img/${n}.jpg`;

  // ---------- header ----------
  const menu = [
    ['gioi-thieu', 'Giới thiệu', 'gioi-thieu.html', 'ttg-2', [['Câu chuyện hình thành', 'gioi-thieu.html#cau-chuyen'], ['Thư ngỏ', 'gioi-thieu.html#thu-ngo'], ['Tầm nhìn & giá trị', 'gioi-thieu.html#gia-tri'], ['Cơ cấu tổ chức', 'gioi-thieu.html#to-chuc']]],
    ['nang-luc', 'Hồ sơ năng lực', 'nang-luc.html', 'doc-nlxd', [['Năng lực pháp lý', 'nang-luc.html#phap-ly'], ['Năng lực nhân sự', 'nang-luc.html#nhan-su'], ['Năng lực tài chính', 'nang-luc.html#tai-chinh'], ['Máy móc thiết bị', 'nang-luc.html#thiet-bi'], ['Hợp đồng tương tự', 'nang-luc.html#hop-dong']]],
    ['du-an', 'Dự án', 'du-an.html', 'sc-01', [['Tất cả dự án', 'du-an.html'], ['Đã thi công', 'du-an.html#done'], ['Đang thi công', 'du-an.html#run'], ['Chuẩn bị triển khai', 'du-an.html#plan']]],
    ['tien-do', 'Tiến độ', 'tien-do.html', 'yp-ct2', [['Tổng quan tiến độ', 'tien-do.html'], ['Nhật ký công trường', 'tien-do.html#nhat-ky']]],
    ['kinh-nghiem', 'Kinh nghiệm thi công', 'kinh-nghiem.html', 'pccc-bom', [['Lĩnh vực chuyên sâu', 'kinh-nghiem.html#linh-vuc'], ['Quy trình thi công', 'kinh-nghiem.html#quy-trinh'], ['Chất lượng & an toàn', 'kinh-nghiem.html#chat-luong'], ['Hỏi đáp', 'kinh-nghiem.html#hoi-dap']]],
  ];
  const hdr = document.createElement('header');
  hdr.className = 'hdr' + (document.body.dataset.solid ? ' light' : '');
  hdr.innerHTML = `<a class="skip" href="#main">Bỏ qua đến nội dung</a>
  <div class="wrap hdr-in">
    <a class="brand" href="index.html"><img src="img/logo.png" alt="Logo Cát Tường"><span>XÂY LẮP CÁT TƯỜNG<small>Construction · Since 2013</small></span></a>
    <ul class="nav" id="nav">
      ${menu.map(([k, t, h, im, sub]) => `<li><a href="${h}" class="${k === page ? 'on' : ''}">${t}</a><button class="sub-t" aria-label="Mở mục ${t}">+</button>
        <div class="mega"><img src="${img(im)}" alt="" loading="lazy"><ul><li><h4>${t}</h4></li>${sub.map(([a, b]) => `<li><a href="${b}">${a}</a></li>`).join('')}</ul></div></li>`).join('')}
      <li><a href="lien-he.html" class="${page === 'lien-he' ? 'on' : ''}">Liên hệ</a></li>
    </ul>
    <a class="cta" href="tel:${C.phoneRaw}">☎ ${C.phone}</a>
    <button class="burger" aria-label="Mở menu" aria-controls="nav"><span></span><span></span><span></span></button>
  </div>`;
  document.body.prepend(hdr);
  hdr.querySelector('.burger').onclick = () => document.body.classList.toggle('menu-open');
  hdr.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  hdr.querySelectorAll('.sub-t').forEach(b => b.onclick = () => { const li = b.parentElement; li.classList.toggle('open'); b.textContent = li.classList.contains('open') ? '−' : '+'; });

  // thanh hành động cố định trên điện thoại
  const mbar = document.createElement('nav');
  mbar.className = 'mbar'; mbar.setAttribute('aria-label', 'Liên hệ nhanh');
  mbar.innerHTML = `<a href="tel:${C.phoneRaw}"><span>☎</span>Gọi ngay</a><a href="https://zalo.me/${C.phoneRaw}" target="_blank" rel="noopener"><span>💬</span>Zalo</a><a href="du-an.html"><span>🏗️</span>Dự án</a><a href="lien-he.html" class="hi"><span>📄</span>Nhận hồ sơ</a>`;
  document.body.append(mbar);

  // bảng → dạng thẻ trên điện thoại: gắn nhãn cột cho từng ô
  window.ctLabelTables = () => document.querySelectorAll('table.tbl').forEach(t => {
    const hs = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
    const ti = hs[0] === 'STT' ? 1 : 0;
    t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { td.dataset.l = hs[i] || ''; if (i === ti) td.classList.add('tt'); if (i < ti) td.classList.add('stt'); }));
  });
  ctLabelTables();
  const onScroll = () => hdr.classList.toggle('solid', scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- footer ----------
  const ftr = document.createElement('footer');
  ftr.className = 'ftr';
  ftr.innerHTML = `<div class="wrap">
    <div class="ftr-top">
      <div><a class="brand" href="index.html"><img src="img/logo.png" alt=""><span>XÂY LẮP CÁT TƯỜNG<small>Thành viên Cát Tường Group</small></span></a>
        <p>${C.name}<br>MSDN: ${C.mst}<br>Vốn điều lệ: ${C.capital}</p></div>
      <div><h4>Về chúng tôi</h4><ul><li><a href="gioi-thieu.html#cau-chuyen">Câu chuyện hình thành</a></li><li><a href="gioi-thieu.html#to-chuc">Cơ cấu tổ chức</a></li><li><a href="nang-luc.html">Hồ sơ năng lực</a></li><li><a href="kinh-nghiem.html">Kinh nghiệm thi công</a></li></ul></div>
      <div><h4>Dự án</h4><ul><li><a href="du-an.html#done">Đã thi công</a></li><li><a href="du-an.html#run">Đang thi công</a></li><li><a href="tien-do.html">Tiến độ công trình</a></li><li><a href="${C.web}" target="_blank" rel="noopener">Cát Tường Group ↗</a></li></ul></div>
      <div><h4>Liên hệ</h4><ul><li>${C.address}</li><li><a href="tel:${C.phoneRaw}">${C.phone}</a></li><li><a href="mailto:${C.email}">${C.email}</a></li></ul></div>
    </div>
    <div class="ftr-bot"><span>© ${new Date().getFullYear()} ${C.name}. Mang đến những không gian vẹn tròn.</span><span class="note">Một số số liệu (tiến độ %, quy mô, tài chính) là dữ liệu mẫu, đang được cập nhật.</span></div>
  </div>`;
  document.body.append(ftr);

  // ---------- reveal + progress bars + counters ----------
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    el.querySelectorAll('.bar i[data-w]').forEach(i => i.style.width = i.dataset.w + '%');
    if (el.matches('.bar i[data-w]')) el.style.width = el.dataset.w + '%';
    el.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(el);
  }), { threshold: .15 });
  function countUp(el) {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 1600), v = end * (1 - Math.pow(1 - p, 3)); el.textContent = v.toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  window.ctObserve = root => (root || document).querySelectorAll('.rv,.bar i[data-w],.stats').forEach(el => io.observe(el));
  ctObserve();

  // ---------- carousel ----------
  document.querySelectorAll('.car').forEach(car => {
    const tr = car.querySelector('.car-track'), cnt = car.querySelector('.car-count');
    const w = () => (tr.children[0] ? tr.children[0].getBoundingClientRect().width : 400) + 24;
    car.querySelector('.pv').onclick = () => tr.scrollBy({ left: -w(), behavior: 'smooth' });
    car.querySelector('.nx').onclick = () => tr.scrollBy({ left: w(), behavior: 'smooth' });
    const upd = () => { const n = tr.children.length, i = Math.round(tr.scrollLeft / w()) + 1; cnt.textContent = `${String(Math.min(i, n)).padStart(2, '0')} — ${String(n).padStart(2, '0')}`; };
    tr.addEventListener('scroll', upd, { passive: true }); upd();
  });

  // ---------- tabs (timeline) ----------
  document.querySelectorAll('[data-tabs]').forEach(box => {
    const btns = box.querySelectorAll('.tl-years button'), panes = box.querySelectorAll('.tl-pane');
    btns.forEach((b, i) => b.onclick = () => { btns.forEach(x => x.classList.remove('on')); panes.forEach(x => x.classList.remove('on')); b.classList.add('on'); panes[i].classList.add('on'); });
  });

  // ---------- lightbox ----------
  const lb = document.createElement('div');
  lb.className = 'lb'; lb.innerHTML = '<img alt=""><p></p><button class="x" aria-label="Đóng">×</button><button class="pv" aria-label="Ảnh trước">‹</button><button class="nx" aria-label="Ảnh sau">›</button>';
  document.body.append(lb);
  let set = [], idx = 0;
  const show = () => { lb.querySelector('img').src = set[idx].href; lb.querySelector('p').textContent = set[idx].dataset.cap || ''; };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-lb]'); if (!a) return;
    e.preventDefault(); set = [...document.querySelectorAll(`[data-lb="${a.dataset.lb}"]`)]; idx = set.indexOf(a); show(); lb.classList.add('on');
  });
  lb.querySelector('.x').onclick = () => lb.classList.remove('on');
  lb.onclick = e => { if (e.target === lb) lb.classList.remove('on'); };
  lb.querySelector('.pv').onclick = () => { idx = (idx - 1 + set.length) % set.length; show(); };
  lb.querySelector('.nx').onclick = () => { idx = (idx + 1) % set.length; show(); };
  addEventListener('keydown', e => { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') lb.classList.remove('on'); if (e.key === 'ArrowLeft') lb.querySelector('.pv').click(); if (e.key === 'ArrowRight') lb.querySelector('.nx').click(); });

  // ---------- subnav active ----------
  const sn = document.querySelector('.subnav');
  if (sn) {
    const links = [...sn.querySelectorAll('a')], secs = links.map(a => document.querySelector(a.getAttribute('href')));
    addEventListener('scroll', () => { let k = 0; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < 180) k = i; }); links.forEach((a, i) => a.classList.toggle('on', i === k)); }, { passive: true });
  }

  // helpers for pages
  window.ctImg = img;
  window.ctStatus = s => ({ done: ['done', 'Đã hoàn thành'], run: ['run', 'Đang thi công'], plan: ['plan', 'Chuẩn bị triển khai'] }[s]);
  window.ctCard = p => { const [c, t] = ctStatus(p.status); return `<a class="card rv" href="du-an-chi-tiet.html?id=${p.id}"><div class="ph"><img src="${img(p.cover)}" alt="${p.name}" loading="lazy"></div><div class="bd"><span class="tag ${c}">${t}</span><h3>${p.name}</h3><p>${p.type} · ${p.location}</p>${p.status === 'run' ? `<div class="prog"><div class="prog-top"><span>Tiến độ</span><b>${p.progress}%</b></div><div class="bar"><i data-w="${p.progress}"></i></div></div>` : ''}</div></a>`; };
})();
