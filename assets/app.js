(function () {
  const C = window.CT.company;
  const page = document.body.dataset.page || '';
  const img = n => `img/${n}.jpg`;

  // ---------- header (kiểu Bechtel: viền đỏ trên, menu in hoa, nút tròn mở meganav) ----------
  const menu = [
    ['gioi-thieu', 'Giới thiệu', 'gioi-thieu.html', 'ttg-2', [['Câu chuyện hình thành', 'gioi-thieu.html#cau-chuyen'], ['Thư ngỏ', 'gioi-thieu.html#thu-ngo'], ['Tầm nhìn & giá trị', 'gioi-thieu.html#gia-tri'], ['Cơ cấu tổ chức', 'gioi-thieu.html#to-chuc'], ['Đội ngũ quản lý', 'gioi-thieu.html#lanh-dao']]],
    ['du-an', 'Dự án', 'du-an.html', 'sc-01', [['Tất cả dự án', 'du-an.html'], ['Đã thi công', 'du-an.html#done'], ['Đang thi công', 'du-an.html#run'], ['Chuẩn bị triển khai', 'du-an.html#plan'], ['Tiến độ công trình', 'tien-do.html']]],
    ['nang-luc', 'Năng lực', 'nang-luc.html', 'pccc-bom', [['Năng lực pháp lý', 'nang-luc.html#phap-ly'], ['Năng lực nhân sự', 'nang-luc.html#nhan-su'], ['Năng lực tài chính', 'nang-luc.html#tai-chinh'], ['Máy móc thiết bị', 'nang-luc.html#thiet-bi'], ['Hợp đồng tương tự', 'nang-luc.html#hop-dong']]],
    ['kinh-nghiem', 'Kinh nghiệm', 'kinh-nghiem.html', 'yp-ct1', [['Lĩnh vực chuyên sâu', 'kinh-nghiem.html#linh-vuc'], ['Quy trình thi công', 'kinh-nghiem.html#quy-trinh'], ['Chất lượng & an toàn', 'kinh-nghiem.html#chat-luong'], ['Hỏi đáp', 'kinh-nghiem.html#hoi-dap']]],
  ];
  const tienDoOn = page === 'tien-do';
  const hdr = document.createElement('header');
  hdr.className = 'hdr' + (document.body.dataset.solid ? ' light' : '');
  hdr.innerHTML = `<a class="skip" href="#main">Bỏ qua đến nội dung</a>
  <div class="wrap hdr-in">
    <a class="brand" href="index.html"><img src="img/logo.png" alt="Logo Cát Tường"><span>XÂY LẮP<br>CÁT TƯỜNG<small>Construction</small></span></a>
    <ul class="nav" id="nav">
      ${menu.map(([k, t, h, im, sub]) => `<li><a href="${h}" class="${k === page || (k === 'du-an' && tienDoOn) ? 'on' : ''}">${t}</a>
        <div class="mega"><img src="${img(im)}" alt="" loading="lazy"><ul><li><h4>${t}</h4></li>${sub.map(([a, b]) => `<li><a href="${b}">${a}</a></li>`).join('')}</ul></div></li>`).join('')}
    </ul>
    <div class="icons">
      <a class="search" href="du-an.html" aria-label="Tìm dự án"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg></a>
      <button class="burger" aria-label="Mở menu"><span></span><span></span><span></span></button>
    </div>
  </div>`;
  document.body.prepend(hdr);

  // meganav toàn màn hình
  const news = window.CT.news || [];
  const mn = document.createElement('div');
  mn.className = 'meganav'; mn.setAttribute('aria-label', 'Menu');
  mn.innerHTML = `<a class="brand mtop" href="index.html"><img src="img/logo.png" alt=""><span>XÂY LẮP<br>CÁT TƯỜNG<small>Construction</small></span></a>
    <button class="close" aria-label="Đóng menu">×</button>
    <div class="col-l"><h5>Tin mới nhất</h5>${news.slice(0, 4).map(n => `<a class="post" href="tien-do.html#nhat-ky"><img src="${img(n.img)}" alt="" loading="lazy"><span><small>${n.tag} · ${n.date}</small><b>${n.title}</b></span></a>`).join('')}</div>
    <div class="col-r">
      ${menu.map(([k, t, h, im, sub]) => `<div class="grp"><a href="${h}">${t}</a><ul>${sub.map(([a, b]) => `<li><a href="${b}">${a}</a></li>`).join('')}</ul></div>`).join('')}
      <div class="grp"><a href="tien-do.html">Tiến độ</a><ul><li><a href="tien-do.html">Tổng quan tiến độ</a></li><li><a href="tien-do.html#nhat-ky">Nhật ký công trường</a></li></ul></div>
      <div class="grp"><a href="lien-he.html">Liên hệ</a><ul><li><a href="lien-he.html">Gửi yêu cầu</a></li><li><a href="${C.web}" target="_blank" rel="noopener">Cát Tường Group ↗</a></li></ul></div>
      <div class="contact"><a href="tel:${C.phoneRaw}">${C.phone}</a><a href="mailto:${C.email}">${C.email}</a></div>
    </div>`;
  document.body.append(mn);
  const toggleMenu = on => document.body.classList.toggle('menu-open', on);
  hdr.querySelector('.burger').onclick = () => toggleMenu(true);
  mn.querySelector('.close').onclick = () => toggleMenu(false);
  mn.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

  // header ẩn khi cuộn xuống, hiện khi cuộn lên (headroom)
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    hdr.classList.toggle('solid', y > 80);
    const hide = y > 400 && y > lastY;
    hdr.classList.toggle('hide', hide);
    document.body.classList.toggle('hdr-up', y > 80 && !hide);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

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

  // ---------- footer (tail) ----------
  const ftr = document.createElement('footer');
  ftr.className = 'ftr';
  ftr.innerHTML = `<div class="wrap">
    <div class="ftr-top">
      ${menu.map(([k, t, h, im, sub]) => `<div><h4><a href="${h}">${t}</a></h4><ul>${sub.slice(0, 4).map(([a, b]) => `<li><a href="${b}">${a}</a></li>`).join('')}</ul></div>`).join('')}
      <div class="bold"><ul><li><a href="gioi-thieu.html#cau-chuyen">Lịch sử</a></li><li><a href="lien-he.html">Liên hệ</a></li><li><a href="tien-do.html">Tiến độ</a></li><li><a href="tien-do.html#nhat-ky">Tin tức</a></li><li><a href="nang-luc.html">Hồ sơ năng lực</a></li><li><a href="${C.web}" target="_blank" rel="noopener">Cát Tường Group</a></li></ul></div>
    </div>
    <div class="ftr-bot">
      <img class="logo" src="img/logo.png" alt="Cát Tường">
      <div class="ct"><a href="tel:${C.phoneRaw}">${C.phone}</a><a href="mailto:${C.email}">${C.email}</a></div>
      <div class="lg"><a href="gioi-thieu.html#thong-tin">${C.name}</a><a href="gioi-thieu.html#thong-tin">MSDN ${C.mst}</a></div>
      <div class="lg"><a href="lien-he.html">${C.address}</a></div>
      <div><div class="soc"><a href="https://zalo.me/${C.phoneRaw}" target="_blank" rel="noopener" aria-label="Zalo">Za</a><a href="tel:${C.phoneRaw}" aria-label="Gọi điện">☎</a><a href="mailto:${C.email}" aria-label="Email">@</a><a href="${C.web}" target="_blank" rel="noopener" aria-label="Website">www</a></div>
        <div class="copy">© ${new Date().getFullYear()} Xây lắp Cát Tường</div><div class="note">Một số số liệu là dữ liệu mẫu, đang cập nhật.</div></div>
    </div>
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
    const w = () => (tr.children[0] ? tr.children[0].getBoundingClientRect().width : 400) + parseFloat(getComputedStyle(tr).columnGap || 32);
    car.querySelector('.pv').onclick = () => tr.scrollBy({ left: -w(), behavior: 'smooth' });
    car.querySelector('.nx').onclick = () => tr.scrollBy({ left: w(), behavior: 'smooth' });
    const upd = () => { const n = tr.children.length, vis = Math.max(1, Math.round(tr.clientWidth / w())), i = Math.round(tr.scrollLeft / w()) + 1, j = Math.min(n, i + vis - 1); cnt.textContent = vis > 1 ? `${i} – ${j} / ${n}` : `${i} / ${n}`; };
    addEventListener('resize', upd);
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
  window.ctCard = p => { const [c, t] = ctStatus(p.status); return `<a class="pc rv" href="du-an-chi-tiet.html?id=${p.id}"><img src="${img(p.cover)}" alt="${p.name}" loading="lazy"><span class="tag ${c}" style="position:absolute;left:24px;top:24px;z-index:2">${t}${p.status === 'run' ? ' · ' + p.progress + '%' : ''}</span><div class="t"><small>${p.location}</small><h3>${p.name}</h3></div><span class="go"></span></a>`; };
})();
