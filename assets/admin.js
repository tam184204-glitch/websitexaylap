// Trang quản trị Xây lắp Cát Tường – lưu thẳng vào kho GitHub qua GitHub API (website tĩnh, không có máy chủ).
// Khoá GitHub được mã hoá AES-GCM bằng mật khẩu quản trị (PBKDF2) và lưu ở admin/auth.json.
(function () {
  'use strict';

  // ---------- cấu hình kho ----------
  const onPages = /\.github\.io$/.test(location.hostname);
  const OWNER = onPages ? location.hostname.split('.')[0] : 'tam184204-glitch';
  const REPO = onPages ? (location.pathname.split('/')[1] || 'websitexaylap') : 'websitexaylap';
  const BRANCH = 'main';
  const AUTH_PATH = 'admin/auth.json';
  const SITE = new URL('.', location.href).href;
  const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
  document.querySelectorAll('.repoName').forEach(e => e.textContent = `${OWNER}/${REPO}`);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const imgUrl = n => !n ? '' : /^(https?:|data:)/.test(n) ? n : `${SITE}img/${n}.jpg`;
  const show = id => ['vLogin', 'vSetup', 'vApp'].forEach(v => $('#' + v).classList.toggle('hide', v !== id));

  function toast(msg, kind = '', ms = 4000) {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
    document.body.append(t); setTimeout(() => t.remove(), ms);
  }

  // ---------- base64 / utf-8 ----------
  const b64FromBytes = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const bytesFromB64 = b64 => Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0));
  const b64FromText = t => b64FromBytes(new TextEncoder().encode(t));
  const textFromB64 = b => new TextDecoder().decode(bytesFromB64(b));

  // ---------- mã hoá khoá GitHub ----------
  async function keyFrom(password, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(token, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(password, salt), new TextEncoder().encode(token));
    return { salt: b64FromBytes(salt), iv: b64FromBytes(iv), data: b64FromBytes(new Uint8Array(data)) };
  }
  async function unseal(acc, password) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytesFromB64(acc.iv) }, await keyFrom(password, bytesFromB64(acc.salt)), bytesFromB64(acc.data));
    return new TextDecoder().decode(plain);
  }

  // ---------- GitHub API ----------
  let TOKEN = '', ME = '';
  async function gh(path, opts = {}, token = TOKEN) {
    const r = await fetch(path.startsWith('http') ? path : `${API}/${path}`, {
      ...opts, cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
    });
    if (r.status === 404) return null;
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(`GitHub ${r.status}: ${j.message || r.statusText}`); }
    return r.status === 204 ? {} : r.json();
  }
  const encPath = p => p.split('/').map(encodeURIComponent).join('/');
  async function getFile(p, token) {
    const j = await gh(`contents/${encPath(p)}?ref=${BRANCH}`, {}, token);
    if (!j) return null;
    if (j.content === '' && j.size > 0) { // tệp > 1MB: lấy qua blob
      const b = await gh(`git/blobs/${j.sha}`, {}, token); return { sha: j.sha, b64: b.content, text: null };
    }
    return { sha: j.sha, b64: j.content, get text() { return textFromB64(j.content); } };
  }
  async function putFile(p, b64, message, sha, token) {
    return gh(`contents/${encPath(p)}`, { method: 'PUT', body: JSON.stringify({ message, content: b64, branch: BRANCH, ...(sha ? { sha } : {}) }) }, token);
  }
  async function shaOf(p) { const f = await gh(`contents/${encPath(p)}?ref=${BRANCH}`); return f && f.sha; }
  async function saveText(p, text, message) { return putFile(p, b64FromText(text), message, await shaOf(p)); }
  async function deleteFile(p, message) { const sha = await shaOf(p); if (!sha) return; return gh(`contents/${encPath(p)}`, { method: 'DELETE', body: JSON.stringify({ message, sha, branch: BRANCH }) }); }
  const msg = what => `Quản trị (${ME}): ${what}`;

  // ---------- tài khoản ----------
  async function loadAuth() {
    // đọc công khai, không cần khoá (kho public)
    const j = await gh(`contents/${AUTH_PATH}?ref=${BRANCH}`, {}, '');
    return j ? { sha: j.sha, data: JSON.parse(textFromB64(j.content)) } : null;
  }

  async function doLogin(e) {
    e.preventDefault();
    const u = $('#lu').value.trim(), p = $('#lp').value, err = $('#lErr'), btn = $('#lBtn');
    err.textContent = ''; btn.disabled = true; btn.textContent = 'Đang kiểm tra…';
    try {
      const auth = await loadAuth();
      if (!auth) { err.textContent = 'Chưa có tài khoản quản trị nào. Hãy thiết lập lần đầu.'; return; }
      const acc = auth.data.accounts.find(a => a.u.toLowerCase() === u.toLowerCase());
      if (!acc) throw new Error('bad');
      const token = await unseal(acc, p).catch(() => { throw new Error('bad'); });
      sessionStorage.setItem('ctAdmin', JSON.stringify({ u: acc.u, token }));
      start(acc.u, token);
    } catch (x) {
      err.textContent = x.message === 'bad' ? 'Sai tên đăng nhập hoặc mật khẩu.' : x.message;
    } finally { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
  }

  async function doSetup(e) {
    e.preventDefault();
    const t = $('#st').value.trim(), u = $('#su').value.trim(), p = $('#sp').value, p2 = $('#sp2').value, err = $('#sErr'), btn = $('#sBtn');
    err.textContent = '';
    if (p !== p2) { err.textContent = 'Hai mật khẩu không khớp.'; return; }
    if (p.length < 10) { err.textContent = 'Mật khẩu cần ít nhất 10 ký tự.'; return; }
    btn.disabled = true; btn.textContent = 'Đang kiểm tra khoá…';
    try {
      const repo = await gh('', {}, t);
      if (!repo) throw new Error(`Khoá không truy cập được kho ${OWNER}/${REPO}.`);
      const auth = await loadAuth();
      const data = auth ? auth.data : { v: 1, accounts: [] };
      data.accounts = data.accounts.filter(a => a.u.toLowerCase() !== u.toLowerCase());
      data.accounts.push({ u, ...(await seal(t, p)), created: new Date().toISOString() });
      ME = u;
      await putFile(AUTH_PATH, b64FromText(JSON.stringify(data, null, 2)), `Quản trị: tạo tài khoản ${u}`, auth && auth.sha, t);
      sessionStorage.setItem('ctAdmin', JSON.stringify({ u, token: t }));
      toast('Đã tạo tài khoản quản trị.', 'ok');
      start(u, t);
    } catch (x) {
      err.textContent = /401|Bad credentials/.test(x.message) ? 'Khoá GitHub không hợp lệ.' : /403|404|Resource not accessible/.test(x.message) ? 'Khoá chưa có quyền ghi (Contents: Read and write) vào kho này.' : x.message;
    } finally { btn.disabled = false; btn.textContent = 'Tạo tài khoản quản trị'; }
  }

  // ---------- dữ liệu website (assets/data.js) ----------
  let CT = null;
  async function loadCT() {
    const f = await getFile('assets/data.js');
    const win = {}; new Function('window', f.text)(win);
    CT = win.CT;
    ['news', 'projects', 'diary', 'jobs', 'legacy'].forEach(k => CT[k] = CT[k] || []);
    return CT;
  }
  async function saveCT(what) {
    const text = '// Dữ liệu website – được trang quản trị (admin.html) ghi đè khi lưu. Có thể sửa tay nhưng phải giữ đúng cú pháp JSON.\nwindow.CT = ' + JSON.stringify(CT, null, 2) + ';\n';
    await saveText('assets/data.js', text, msg(what));
    toast('Đã lưu. Website cập nhật sau khoảng 1–2 phút.', 'ok', 5000);
  }

  // ---------- ảnh ----------
  const pickFile = () => new Promise(res => { const f = $('#filePick'); f.value = ''; f.onchange = () => res(f.files[0] || null); f.click(); });
  async function toJpeg(file, max = 1800, q = .82) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
    return new Uint8Array(await blob.arrayBuffer());
  }
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'anh';
  // tải ảnh mới lên img/up/… → trả về tên dùng trong dữ liệu ("up/…")
  async function uploadNew(file) {
    toast('Đang tải ảnh lên…', '', 2500);
    const d = new Date(), stamp = d.toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const name = `up/${stamp}-${slug(file.name.replace(/\.[^.]+$/, ''))}`;
    await putFile(`img/${name}.jpg`, b64FromBytes(await toJpeg(file)), msg(`tải ảnh ${name}.jpg`));
    return name;
  }
  // thay ảnh tại đúng đường dẫn cũ → mọi nơi dùng ảnh đó đổi theo
  async function replaceAt(path, file) {
    const isPng = /\.png$/i.test(path);
    const bytes = isPng ? new Uint8Array(await file.arrayBuffer()) : await toJpeg(file);
    await putFile(path, b64FromBytes(bytes), msg(`thay ảnh ${path}`), await shaOf(path));
  }
  let mediaCache = null;
  async function listMedia(force) {
    if (mediaCache && !force) return mediaCache;
    const [a, b] = await Promise.all([gh(`contents/img?ref=${BRANCH}`), gh(`contents/img/up?ref=${BRANCH}`)]);
    mediaCache = [...(b || []), ...(a || [])].filter(f => f.type === 'file' && /\.(jpe?g|png|webp|gif)$/i.test(f.name)).map(f => ({ path: f.path, name: f.path.replace(/^img\//, ''), size: f.size }));
    return mediaCache;
  }
  // hộp chọn ảnh: trả về tên ảnh jpg (không đuôi) hoặc null
  function choosePicture() {
    return new Promise(async res => {
      const m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = `<div class="box"><div class="hd"><h3>Chọn ảnh</h3><div><button class="btn p sm" data-up>Tải ảnh mới lên</button> <button class="btn sm" data-x>Đóng</button></div></div><div class="bd"><div class="media">Đang tải…</div></div></div>`;
      document.body.append(m);
      const close = v => { m.remove(); res(v); };
      m.querySelector('[data-x]').onclick = () => close(null);
      m.querySelector('[data-up]').onclick = async () => { const f = await pickFile(); if (!f) return; try { const n = await uploadNew(f); mediaCache = null; close(n); } catch (x) { toast(x.message, 'bad'); } };
      const list = (await listMedia()).filter(f => /\.jpg$/i.test(f.name));
      m.querySelector('.media').innerHTML = list.map(f => `<div class="mi" data-n="${esc(f.name.replace(/\.jpg$/i, ''))}"><img loading="lazy" src="${SITE}${encPath(f.path)}"><div class="n">${esc(f.name)}</div></div>`).join('');
      m.querySelectorAll('.mi').forEach(el => el.onclick = () => close(el.dataset.n));
    });
  }

  // ---------- cấu hình các danh sách ----------
  const STATUS = [['run', 'Đang thi công'], ['done', 'Đã hoàn thành'], ['plan', 'Chuẩn bị triển khai']];
  const MS = [['done', 'Đã xong'], ['cur', 'Đang làm'], ['next', 'Sắp tới']];
  const today = () => new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const SCHEMAS = {
    news: {
      label: 'Tin tức', one: 'tin', title: x => x.title, sub: x => `${x.tag || ''} · ${x.date || ''}`, thumb: x => x.img, addTop: true,
      blank: () => ({ id: '', title: '', tag: 'Tin công ty', date: today(), img: '', summary: '', body: '<p></p>' }),
      fields: [['title', 'Tiêu đề', 'text', { full: 1, req: 1 }], ['tag', 'Chuyên mục', 'text', { list: ['Sự kiện', 'Bàn giao', 'PCCC', 'Tin công ty', 'Tuyển dụng', 'Khác'] }], ['date', 'Ngày đăng', 'text', { ph: 'dd/mm/yyyy' }],
        ['img', 'Ảnh đại diện', 'image', { full: 1 }], ['summary', 'Tóm tắt (hiện dưới tiêu đề)', 'textarea', { full: 1 }], ['body', 'Nội dung bài viết', 'rich', { full: 1 }], ['id', 'Mã đường dẫn (tự tạo nếu để trống)', 'text', { full: 1 }]],
      fix: x => { if (!x.id) x.id = slug(x.title); },
      link: x => `tin-tuc-chi-tiet.html?id=${encodeURIComponent(x.id)}`,
    },
    projects: {
      label: 'Dự án', one: 'dự án', title: x => x.name, sub: x => `${(STATUS.find(s => s[0] === x.status) || [, ''])[1]} · ${x.location || ''}${x.status === 'run' ? ' · ' + x.progress + '%' : ''}`, thumb: x => x.cover,
      blank: () => ({ id: '', name: '', type: '', status: 'run', progress: 0, location: '', owner: '', scope: '', scale: '', time: '', phase: '', summary: '', cover: '', images: [], story: [], milestones: [], log: [] }),
      fields: [['name', 'Tên dự án', 'text', { full: 1, req: 1 }], ['type', 'Loại công trình', 'text'], ['status', 'Trạng thái', 'select', { opts: STATUS }], ['progress', 'Tiến độ (%)', 'number'],
        ['location', 'Địa điểm', 'text'], ['owner', 'Chủ đầu tư', 'text'], ['time', 'Thời gian', 'text'], ['scale', 'Quy mô', 'text'], ['scope', 'Phạm vi công việc', 'textarea', { full: 1 }],
        ['phase', 'Giai đoạn hiện tại', 'text', { full: 1 }], ['summary', 'Tóm tắt', 'textarea', { full: 1 }], ['cover', 'Ảnh bìa', 'image', { full: 1 }], ['images', 'Thư viện ảnh dự án', 'images', { full: 1 }],
        ['story', 'Câu chuyện công trình (mỗi đoạn cách nhau một dòng trống)', 'paras', { full: 1 }],
        ['milestones', 'Mốc tiến độ', 'tuples', { full: 1, cols: [['select', 'Trạng thái', MS], ['text', 'Thời gian'], ['text', 'Nội dung']] }],
        ['log', 'Nhật ký công trường', 'tuples', { full: 1, cols: [['text', 'Thời gian'], ['image', 'Ảnh'], ['text', 'Nội dung']] }], ['id', 'Mã đường dẫn (tự tạo nếu để trống)', 'text', { full: 1 }]],
      fix: x => { if (!x.id) x.id = slug(x.name); x.progress = Math.max(0, Math.min(100, +x.progress || 0)); if (!x.log || !x.log.length) delete x.log; },
      link: x => `du-an-chi-tiet.html?id=${encodeURIComponent(x.id)}`,
    },
    diary: {
      label: 'Nhật ký công trường', one: 'mục nhật ký', title: x => `${x.date} – ${x.project}`, sub: x => x.text, thumb: x => (x.images || [])[0], addTop: true,
      blank: () => ({ date: '', project: '', images: [], text: '' }),
      fields: [['date', 'Thời gian (VD: Tháng 10/2026)', 'text', { req: 1 }], ['project', 'Dự án / chủ đề', 'text'], ['text', 'Nội dung', 'textarea', { full: 1 }], ['images', 'Ảnh (nên 3–4 ảnh)', 'images', { full: 1 }]],
      link: () => 'tien-do.html#nhat-ky',
    },
    jobs: {
      label: 'Tuyển dụng', one: 'vị trí', title: x => x.title, sub: x => `${x.group} · ${x.place} · ${x.type}`,
      blank: () => ({ group: 'Kỹ thuật', title: '', place: 'Bắc Ninh', type: 'Toàn thời gian', desc: '', req: '' }),
      fields: [['title', 'Tên vị trí', 'text', { full: 1, req: 1 }], ['group', 'Nhóm', 'text', { list: ['Kỹ thuật', 'PCCC', 'Văn phòng', 'Công nhân'] }], ['place', 'Nơi làm việc', 'text'], ['type', 'Hình thức', 'text', { list: ['Toàn thời gian', 'Bán thời gian', 'Theo dự án', 'Thực tập'] }],
        ['desc', 'Mô tả công việc', 'textarea', { full: 1 }], ['req', 'Yêu cầu', 'textarea', { full: 1 }]],
      link: () => 'tuyen-dung.html#vi-tri',
    },
    legacy: {
      label: 'Dòng thời gian (trang chủ)', one: 'mốc', title: x => `${x.year} – ${x.title}`, sub: x => x.place, thumb: x => x.img,
      blank: () => ({ year: '', place: '', title: '', desc: '', img: '', link: 'gioi-thieu.html#cau-chuyen' }),
      fields: [['year', 'Năm', 'text', { req: 1 }], ['place', 'Địa điểm', 'text'], ['title', 'Tiêu đề', 'text', { full: 1 }], ['desc', 'Mô tả', 'textarea', { full: 1 }], ['img', 'Ảnh', 'image', { full: 1 }], ['link', 'Liên kết khi bấm', 'text', { full: 1 }]],
      link: () => 'index.html#legacy',
    },
  };
  const COMPANY = [['name', 'Tên công ty'], ['mst', 'Mã số doanh nghiệp'], ['capital', 'Vốn điều lệ'], ['address', 'Địa chỉ trụ sở'], ['phone', 'Điện thoại (hiển thị)'], ['phoneRaw', 'Điện thoại (chỉ số, dùng cho nút gọi/Zalo)'], ['email', 'Email'], ['web', 'Website tập đoàn']];
  const PAGES = [['index.html', 'Trang chủ'], ['gioi-thieu.html', 'Giới thiệu'], ['nang-luc.html', 'Hồ sơ năng lực'], ['du-an.html', 'Dự án (đầu trang)'], ['tien-do.html', 'Tiến độ'], ['kinh-nghiem.html', 'Kinh nghiệm thi công'], ['tuyen-dung.html', 'Tuyển dụng'], ['lien-he.html', 'Liên hệ'], ['tin-tuc.html', 'Tin tức (đầu trang)']];

  // ---------- điều hướng ----------
  const NAV = [
    ['dash', 'Tổng quan'], ['g', 'Nội dung'], ['news', 'Tin tức'], ['projects', 'Dự án'], ['diary', 'Nhật ký công trường'], ['jobs', 'Tuyển dụng'], ['legacy', 'Dòng thời gian'], ['company', 'Thông tin công ty'],
    ['g', 'Giao diện'], ['pages', 'Sửa chữ & ảnh trên trang'], ['media', 'Thư viện ảnh'], ['g', 'Hệ thống'], ['accounts', 'Tài khoản quản trị'],
  ];
  let current = 'dash';
  function renderNav() {
    $('#nav').innerHTML = NAV.map(([k, t]) => k === 'g' ? `<div class="grp">${t}</div>` : `<button data-k="${k}" class="${k === current ? 'on' : ''}">${t}</button>`).join('');
    $$('#nav button').forEach(b => b.onclick = () => go(b.dataset.k));
  }
  let leaveGuard = null;
  function go(k) {
    if (leaveGuard && !leaveGuard()) return;
    leaveGuard = null; current = k; renderNav(); scrollTo(0, 0);
    const V = $('#view');
    if (k === 'dash') return viewDash(V);
    if (SCHEMAS[k]) return viewList(V, k);
    if (k === 'company') return viewCompany(V);
    if (k === 'pages') return viewPages(V);
    if (k === 'media') return viewMedia(V);
    if (k === 'accounts') return viewAccounts(V);
  }

  // ---------- tổng quan ----------
  async function viewDash(V) {
    V.innerHTML = `<div class="top"><h2>Xin chào, ${esc(ME)}</h2><div class="acts"><a class="btn" href="index.html" target="_blank">Xem website ↗</a></div></div>
      <div class="help">Mọi thay đổi được lưu thẳng lên website. Sau khi bấm <b>Lưu</b>, website tự cập nhật sau khoảng 1–2 phút (khách đang mở trang có thể cần tải lại trang).</div>
      <div class="dash">
        <button data-k="news"><b>Đăng tin mới</b><span>${CT.news.length} tin đã đăng</span></button>
        <button data-k="projects"><b>Dự án</b><span>${CT.projects.length} dự án · cập nhật tiến độ, ảnh</span></button>
        <button data-k="diary"><b>Nhật ký công trường</b><span>${CT.diary.length} mục trên trang Tiến độ</span></button>
        <button data-k="jobs"><b>Tuyển dụng</b><span>${CT.jobs.length} vị trí đang tuyển</span></button>
        <button data-k="pages"><b>Sửa chữ & ảnh</b><span>Bấm trực tiếp vào chữ/ảnh trên từng trang</span></button>
        <button data-k="media"><b>Thư viện ảnh</b><span>Tải ảnh mới, thay ảnh cũ, đổi logo</span></button>
      </div>
      <h3 style="margin:30px 0 12px">Thay đổi gần đây</h3><div class="panel" id="commits">Đang tải…</div>`;
    $$('.dash button', V).forEach(b => b.onclick = () => go(b.dataset.k));
    try {
      const cs = await gh('commits?per_page=10&sha=' + BRANCH);
      $('#commits').innerHTML = `<table class="acc">${cs.map(c => `<tr><td>${new Date(c.commit.author.date).toLocaleString('vi-VN')}</td><td>${esc(c.commit.message.split('\n')[0])}</td></tr>`).join('')}</table>`;
    } catch (x) { $('#commits').textContent = x.message; }
  }

  // ---------- danh sách (tin, dự án, …) ----------
  function viewList(V, key) {
    const S = SCHEMAS[key], arr = CT[key];
    V.innerHTML = `<div class="top"><h2>${S.label}</h2><div class="acts"><button class="btn p" data-add>+ Thêm ${S.one}</button></div></div>
      <div class="items">${arr.length ? arr.map((x, i) => `<div class="item">${S.thumb ? `<img src="${imgUrl(S.thumb(x))}" alt="" loading="lazy">` : '<span></span>'}
        <div class="t"><b>${esc(S.title(x) || '(chưa có tiêu đề)')}</b><span>${esc(S.sub(x) || '')}</span></div>
        <div class="a"><button class="btn sm" data-up="${i}" ${i ? '' : 'disabled'} title="Lên">↑</button><button class="btn sm" data-dn="${i}" ${i < arr.length - 1 ? '' : 'disabled'} title="Xuống">↓</button>
        ${S.link ? `<a class="btn sm" target="_blank" href="${S.link(x)}">Xem</a>` : ''}<button class="btn sm" data-ed="${i}">Sửa</button><button class="btn sm d" data-del="${i}">Xoá</button></div></div>`).join('') : '<div class="panel">Chưa có mục nào.</div>'}</div>`;
    $('[data-add]', V).onclick = () => editItem(V, key, -1);
    $$('[data-ed]', V).forEach(b => b.onclick = () => editItem(V, key, +b.dataset.ed));
    $$('[data-del]', V).forEach(b => b.onclick = async () => {
      const i = +b.dataset.del; if (!confirm(`Xoá "${S.title(arr[i])}"? Không thể hoàn tác trên trang này.`)) return;
      const old = arr.splice(i, 1)[0];
      try { await saveCT(`xoá ${S.one} "${S.title(old)}"`); } catch (x) { arr.splice(i, 0, old); toast(x.message, 'bad'); }
      viewList(V, key);
    });
    const move = async (i, d) => { [arr[i], arr[i + d]] = [arr[i + d], arr[i]]; try { await saveCT(`sắp xếp ${S.label.toLowerCase()}`); } catch (x) { [arr[i], arr[i + d]] = [arr[i + d], arr[i]]; toast(x.message, 'bad'); } viewList(V, key); };
    $$('[data-up]', V).forEach(b => b.onclick = () => move(+b.dataset.up, -1));
    $$('[data-dn]', V).forEach(b => b.onclick = () => move(+b.dataset.dn, 1));
  }

  function editItem(V, key, idx) {
    const S = SCHEMAS[key], isNew = idx < 0;
    const item = JSON.parse(JSON.stringify(isNew ? S.blank() : CT[key][idx]));
    V.innerHTML = `<div class="top"><h2>${isNew ? 'Thêm ' + S.one : 'Sửa ' + S.one}</h2><div class="acts"><button class="btn" data-back>← Quay lại</button><button class="btn p" data-save>Lưu</button></div></div>
      <div class="panel"><form class="form" onsubmit="return false"></form></div>
      <div class="top" style="margin-top:16px;justify-content:flex-end"><div class="acts"><button class="btn" data-back>Huỷ</button><button class="btn p" data-save>Lưu</button></div></div>`;
    const F = $('.form', V);
    const getters = S.fields.map(f => buildField(F, item, f));
    let dirty = false; F.addEventListener('input', () => dirty = true);
    leaveGuard = () => !dirty || confirm('Bạn có thay đổi chưa lưu. Bỏ qua?');
    $$('[data-back]', V).forEach(b => b.onclick = () => { if (leaveGuard()) { leaveGuard = null; viewList(V, key); } });
    $$('[data-save]', V).forEach(b => b.onclick = async () => {
      getters.forEach(g => g());
      const miss = S.fields.find(([k, l, t, o]) => o && o.req && !String(item[k] || '').trim());
      if (miss) return toast(`Vui lòng nhập "${miss[1]}".`, 'bad');
      S.fix && S.fix(item);
      const before = JSON.stringify(CT[key]);
      if (isNew) S.addTop ? CT[key].unshift(item) : CT[key].push(item); else CT[key][idx] = item;
      $$('[data-save]', V).forEach(x => { x.disabled = true; x.textContent = 'Đang lưu…'; });
      try { await saveCT(`${isNew ? 'thêm' : 'sửa'} ${S.one} "${S.title(item)}"`); dirty = false; leaveGuard = null; viewList(V, key); }
      catch (x) { CT[key] = JSON.parse(before); toast(x.message, 'bad', 8000); $$('[data-save]', V).forEach(x => { x.disabled = false; x.textContent = 'Lưu'; }); }
    });
  }

  // dựng 1 ô nhập; trả về hàm ghi giá trị vào item
  function buildField(F, item, [k, label, type, o = {}]) {
    const w = document.createElement('div'); w.className = 'fld' + (o.full ? ' full' : ''); F.append(w);
    const id = 'f_' + k + Math.random().toString(36).slice(2, 6);
    w.innerHTML = `<label for="${id}">${label}${o.req ? ' *' : ''}</label>`;
    if (type === 'text' || type === 'number') {
      w.insertAdjacentHTML('beforeend', `<input id="${id}" type="${type}" ${o.ph ? `placeholder="${o.ph}"` : ''} ${o.list ? `list="${id}l"` : ''} value="${esc(item[k])}">${o.list ? `<datalist id="${id}l">${o.list.map(v => `<option value="${esc(v)}">`).join('')}</datalist>` : ''}`);
      return () => item[k] = type === 'number' ? +$('#' + id).value : $('#' + id).value.trim();
    }
    if (type === 'textarea') { w.insertAdjacentHTML('beforeend', `<textarea id="${id}" rows="4">${esc(item[k])}</textarea>`); return () => item[k] = $('#' + id).value.trim(); }
    if (type === 'paras') { w.insertAdjacentHTML('beforeend', `<textarea id="${id}" rows="7">${esc((item[k] || []).join('\n\n'))}</textarea>`); return () => item[k] = $('#' + id).value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean); }
    if (type === 'select') { w.insertAdjacentHTML('beforeend', `<select id="${id}">${o.opts.map(([v, t]) => `<option value="${v}" ${v === item[k] ? 'selected' : ''}>${t}</option>`).join('')}</select>`); return () => item[k] = $('#' + id).value; }
    if (type === 'image') {
      const box = document.createElement('div'); box.className = 'imgf'; w.append(box);
      const paint = () => { box.innerHTML = `<img src="${imgUrl(item[k])}" alt=""><button class="btn sm" type="button">Chọn / tải ảnh</button>${item[k] ? `<small>${esc(item[k])}.jpg</small>` : ''}`; box.querySelector('button').onclick = async () => { const n = await choosePicture(); if (n) { item[k] = n; paint(); F.dispatchEvent(new Event('input')); } }; };
      paint(); return () => { };
    }
    if (type === 'images') {
      item[k] = item[k] || [];
      const box = document.createElement('div'); box.className = 'imgs'; w.append(box);
      const paint = () => {
        box.innerHTML = item[k].map((n, i) => `<div class="im"><img src="${imgUrl(n)}" alt=""><button type="button" data-rm="${i}" title="Bỏ ảnh">×</button>${i ? `<button type="button" class="mv" data-l="${i}" title="Đưa lên trước">‹</button>` : ''}</div>`).join('') + `<button class="btn sm" type="button" data-add style="height:80px">+ Thêm ảnh</button>`;
        box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { item[k].splice(+b.dataset.rm, 1); paint(); F.dispatchEvent(new Event('input')); });
        box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { const i = +b.dataset.l;[item[k][i - 1], item[k][i]] = [item[k][i], item[k][i - 1]]; paint(); F.dispatchEvent(new Event('input')); });
        box.querySelector('[data-add]').onclick = async () => { const n = await choosePicture(); if (n) { item[k].push(n); paint(); F.dispatchEvent(new Event('input')); } };
      };
      paint(); return () => { };
    }
    if (type === 'tuples') {
      item[k] = item[k] || [];
      const box = document.createElement('div'); box.className = 'tup'; w.append(box);
      const cols = o.cols, tmpl = `grid-template-columns:${cols.map(c => c[0] === 'image' ? '70px' : c[0] === 'select' ? '130px' : c[1] === 'Nội dung' ? '1fr' : '140px').join(' ')} 34px`;
      const read = () => $$('.row', box).forEach((r, i) => cols.forEach((c, j) => { if (c[0] !== 'image') item[k][i][j] = r.querySelector(`[data-c="${j}"]`).value; }));
      const paint = () => {
        box.innerHTML = item[k].map((row, i) => `<div class="row" style="${tmpl}">${cols.map((c, j) => c[0] === 'select' ? `<select data-c="${j}">${c[2].map(([v, t]) => `<option value="${v}" ${v === row[j] ? 'selected' : ''}>${t}</option>`).join('')}</select>` : c[0] === 'image' ? `<img data-img="${i}:${j}" src="${imgUrl(row[j])}" title="Bấm để đổi ảnh" alt="">` : `<input data-c="${j}" placeholder="${c[1]}" value="${esc(row[j])}">`).join('')}<button type="button" class="btn sm d" data-rm="${i}">×</button></div>`).join('') + `<div><button type="button" class="btn sm" data-add>+ Thêm dòng</button></div>`;
        box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { read(); item[k].splice(+b.dataset.rm, 1); paint(); F.dispatchEvent(new Event('input')); });
        box.querySelectorAll('[data-img]').forEach(im => im.onclick = async () => { read(); const [i, j] = im.dataset.img.split(':').map(Number); const n = await choosePicture(); if (n) { item[k][i][j] = n; paint(); F.dispatchEvent(new Event('input')); } });
        box.querySelector('[data-add]').onclick = () => { read(); item[k].push(cols.map(c => c[0] === 'select' ? c[2][0][0] : '')); paint(); };
      };
      paint(); return read;
    }
    if (type === 'rich') {
      w.insertAdjacentHTML('beforeend', `<div class="rich-bar">
        <button type="button" data-c="formatBlock" data-v="P">Đoạn văn</button><button type="button" data-c="formatBlock" data-v="H2">Tiêu đề</button><button type="button" data-c="formatBlock" data-v="H3">Tiêu đề nhỏ</button>
        <button type="button" data-c="bold"><b>B</b></button><button type="button" data-c="italic"><i>I</i></button><button type="button" data-c="insertUnorderedList">• Danh sách</button><button type="button" data-c="insertOrderedList">1. Danh sách</button>
        <button type="button" data-c="formatBlock" data-v="BLOCKQUOTE">“ Trích dẫn</button><button type="button" data-link>Liên kết</button><button type="button" data-img>Chèn ảnh</button><button type="button" data-c="removeFormat">Xoá định dạng</button></div>
        <div class="rich" id="${id}" contenteditable="true">${item[k] || '<p></p>'}</div>`);
      const ed = $('#' + id);
      $$('.rich-bar [data-c]', w).forEach(b => b.onclick = () => { ed.focus(); document.execCommand(b.dataset.c, false, b.dataset.v ? `<${b.dataset.v}>` : null); });
      $('.rich-bar [data-link]', w).onclick = () => { const u = prompt('Địa chỉ liên kết (https://…):'); if (u) { ed.focus(); document.execCommand('createLink', false, u); } };
      $('.rich-bar [data-img]', w).onclick = async () => {
        const sel = window.getSelection(), range = sel.rangeCount && ed.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
        const n = await choosePicture(); if (!n) return;
        ed.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); }
        document.execCommand('insertHTML', false, `<img src="img/${n}.jpg" alt="">`);
      };
      // ảnh trong bài dùng đường dẫn tương đối img/…: hiển thị đúng trong trình soạn
      ed.querySelectorAll('img').forEach(i => { const s = i.getAttribute('src'); if (s && s.startsWith('img/')) i.src = SITE + s; });
      return () => {
        const c = ed.cloneNode(true);
        c.querySelectorAll('img').forEach(i => { if (i.src.startsWith(SITE)) i.setAttribute('src', i.src.slice(SITE.length)); });
        item[k] = c.innerHTML.trim();
      };
    }
  }

  // ---------- thông tin công ty ----------
  function viewCompany(V) {
    const c = CT.company;
    V.innerHTML = `<div class="top"><h2>Thông tin công ty</h2><div class="acts"><button class="btn p" data-save>Lưu</button></div></div>
      <div class="help">Thông tin này hiện ở đầu trang, chân trang, nút gọi điện/Zalo và các form liên hệ.</div>
      <div class="panel"><form class="form" onsubmit="return false">${COMPANY.map(([k, l]) => `<div class="fld ${k === 'address' || k === 'name' ? 'full' : ''}"><label for="c_${k}">${l}</label><input id="c_${k}" value="${esc(c[k])}"></div>`).join('')}</form></div>`;
    $('[data-save]', V).onclick = async e => {
      const old = { ...c }; COMPANY.forEach(([k]) => c[k] = $('#c_' + k).value.trim());
      e.target.disabled = true;
      try { await saveCT('sửa thông tin công ty'); } catch (x) { Object.assign(c, old); toast(x.message, 'bad'); }
      e.target.disabled = false;
    };
  }

  // ---------- sửa trực tiếp chữ & ảnh trên trang ----------
  const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'P', 'LI', 'BLOCKQUOTE', 'FIGCAPTION', 'TD', 'TH', 'DT', 'DD', 'LABEL', 'SUMMARY', 'SMALL', 'SPAN', 'B', 'STRONG', 'EM', 'I', 'A', 'BUTTON', 'DIV', 'CITE']);
  const hasText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  function viewPages(V) {
    V.innerHTML = `<div class="top"><h2>Sửa chữ & ảnh trên trang</h2></div>
      <div class="help"><b>Cách dùng:</b> chọn trang → bấm vào chữ bất kỳ để sửa như soạn văn bản → bấm vào ảnh để thay ảnh mới → bấm <b>Lưu trang</b>. Phần danh sách tự động (dự án, tin tức, tuyển dụng, nhật ký, dòng thời gian) sửa ở các mục bên trái.</div>
      <div class="ve"><div class="ve-bar"><select id="pg" class="btn">${PAGES.map(([f, t]) => `<option value="${f}">${t}</option>`).join('')}</select>
        <button class="btn sm" data-x="bold"><b>B</b></button><button class="btn sm" data-x="italic"><i>I</i></button><button class="btn sm" data-link>Sửa liên kết</button>
        <span style="flex:1"></span><span id="pgState" style="color:var(--muted);font-size:13px"></span><a class="btn sm" id="pgView" target="_blank">Xem trang ↗</a><button class="btn p" id="pgSave" disabled>Lưu trang</button></div>
        <iframe id="pgFrame" title="Trình sửa trang"></iframe></div>`;
    const fr = $('#pgFrame'), sel = $('#pg'), save = $('#pgSave'), st = $('#pgState');
    let file = '', dirty = false;
    leaveGuard = () => !dirty || confirm('Trang có thay đổi chưa lưu. Bỏ qua?');
    const setDirty = v => { dirty = v; save.disabled = !v; st.textContent = v ? 'Có thay đổi chưa lưu' : ''; };
    async function load(f) {
      file = f; setDirty(false); $('#pgView').href = f; st.textContent = 'Đang tải…';
      const src = (await getFile(f)).text;
      const html = src.replace(/<script\b/gi, '<script type="text/x-cms-off"')
        .replace(/<head>/i, `<head><base href="${SITE}"><style data-cms>.rv{opacity:1!important;transform:none!important}[contenteditable]{outline:1px dashed transparent;outline-offset:3px;cursor:text}[contenteditable]:hover{outline-color:rgba(220,5,0,.5)}[contenteditable]:focus{outline:2px solid #DC0500}img[data-cms-img]{cursor:pointer}img[data-cms-img]:hover{outline:3px solid #DC0500;outline-offset:-3px}.cms-note{position:fixed;left:12px;bottom:12px;z-index:9999;background:#1B2E37;color:#fff;font:13px system-ui;padding:8px 12px;border-radius:6px}</style>`);
      fr.srcdoc = html;
      fr.onload = () => {
        const d = fr.contentDocument, main = d.querySelector('main') || d.body;
        main.querySelectorAll('*').forEach(el => {
          if (!TEXT_TAGS.has(el.tagName) || el.closest('[contenteditable]')) return;
          const block = /^(H\d|P|LI|BLOCKQUOTE|FIGCAPTION|TD|TH|DT|DD|SUMMARY|LABEL)$/.test(el.tagName);
          if ((block && el.textContent.trim()) || hasText(el)) { el.setAttribute('contenteditable', 'true'); el.spellcheck = false; }
        });
        main.querySelectorAll('img').forEach(im => im.setAttribute('data-cms-img', ''));
        d.addEventListener('click', async e => {
          const im = e.target.closest('img[data-cms-img]');
          if (e.target.closest('a,button,summary') || im) e.preventDefault();
          if (!im) return;
          const n = await choosePicture(); if (!n) return;
          im.setAttribute('src', `img/${n}.jpg`); setDirty(true);
        }, true);
        d.addEventListener('submit', e => e.preventDefault(), true);
        d.addEventListener('input', () => setDirty(true));
        d.addEventListener('paste', e => { e.preventDefault(); d.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
        const note = d.createElement('div'); note.className = 'cms-note'; note.setAttribute('data-cms', ''); note.textContent = 'Chế độ sửa: bấm vào chữ để sửa, bấm vào ảnh để thay'; d.body.append(note);
        st.textContent = '';
      };
    }
    sel.onchange = () => { if (dirty && !confirm('Trang có thay đổi chưa lưu. Bỏ qua?')) { sel.value = file; return; } load(sel.value); };
    $$('[data-x]', V).forEach(b => b.onclick = () => { fr.contentDocument.execCommand(b.dataset.x); setDirty(true); });
    $('[data-link]', V).onclick = () => {
      const d = fr.contentDocument, s = d.getSelection(), a = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).closest('a');
      if (!a) return toast('Hãy đặt con trỏ vào một liên kết trên trang trước.', '', 3500);
      const u = prompt('Địa chỉ liên kết:', a.getAttribute('href') || ''); if (u === null) return;
      a.setAttribute('href', u); setDirty(true);
    };
    save.onclick = async () => {
      const d = fr.contentDocument, root = d.documentElement.cloneNode(true);
      root.querySelectorAll('[data-cms],base').forEach(n => n.remove());
      root.querySelectorAll('[contenteditable]').forEach(n => {
        n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck');
        // trình duyệt chèn &nbsp; khi gõ dấu cách → đổi lại thành dấu cách thường
        const w = d.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) t.nodeValue = t.nodeValue.replace(/ /g, ' ');
      });
      root.querySelectorAll('[style=""]').forEach(n => n.removeAttribute('style'));
      root.querySelectorAll('[data-cms-img]').forEach(n => n.removeAttribute('data-cms-img'));
      root.querySelectorAll('script[type="text/x-cms-off"]').forEach(n => n.removeAttribute('type'));
      const out = '<!doctype html>\n' + root.outerHTML + '\n';
      save.disabled = true; st.textContent = 'Đang lưu…';
      try { await saveText(file, out, msg(`sửa trang ${file}`)); setDirty(false); toast('Đã lưu trang. Website cập nhật sau khoảng 1–2 phút.', 'ok', 5000); }
      catch (x) { toast(x.message, 'bad', 8000); setDirty(true); }
    };
    load(sel.value);
  }

  // ---------- thư viện ảnh ----------
  async function viewMedia(V) {
    V.innerHTML = `<div class="top"><h2>Thư viện ảnh</h2><div class="acts"><input class="btn" id="mq" placeholder="Tìm tên ảnh…"><button class="btn p" id="mUp">+ Tải ảnh mới</button></div></div>
      <div class="help"><b>Thay ảnh</b> giữ nguyên tên tệp nên mọi chỗ đang dùng ảnh đó trên website đổi theo (VD thay <b>logo.png</b> để đổi logo). Ảnh mới tải lên nằm trong thư mục <b>up/</b>.</div>
      <div class="media" id="mGrid">Đang tải…</div>`;
    const paint = async force => {
      const list = await listMedia(force), q = ($('#mq').value || '').toLowerCase(), t = Date.now();
      $('#mGrid').innerHTML = list.filter(f => f.name.toLowerCase().includes(q)).map(f => `<div class="mi"><a href="${SITE}${encPath(f.path)}" target="_blank"><img loading="lazy" src="${SITE}${encPath(f.path)}?t=${t}" alt=""></a><div class="n">${esc(f.name)} · ${Math.round(f.size / 1024)} KB</div>
        <div class="a"><button class="btn sm" data-rep="${esc(f.path)}">Thay ảnh</button>${f.name.startsWith('up/') ? `<button class="btn sm d" data-del="${esc(f.path)}">Xoá</button>` : ''}</div></div>`).join('') || 'Không có ảnh.';
      $$('[data-rep]', V).forEach(b => b.onclick = async () => { const fl = await pickFile(); if (!fl) return; b.disabled = true; b.textContent = 'Đang tải…'; try { await replaceAt(b.dataset.rep, fl); toast('Đã thay ảnh. Website cập nhật sau 1–2 phút.', 'ok'); paint(true); } catch (x) { toast(x.message, 'bad'); b.disabled = false; b.textContent = 'Thay ảnh'; } });
      $$('[data-del]', V).forEach(b => b.onclick = async () => { if (!confirm('Xoá ảnh này? Nếu ảnh đang được dùng ở đâu đó, chỗ đó sẽ mất ảnh.')) return; try { await deleteFile(b.dataset.del, msg(`xoá ảnh ${b.dataset.del}`)); toast('Đã xoá ảnh.', 'ok'); paint(true); } catch (x) { toast(x.message, 'bad'); } });
    };
    $('#mq').oninput = () => paint(false);
    $('#mUp').onclick = async () => { const f = await pickFile(); if (!f) return; try { const n = await uploadNew(f); toast(`Đã tải lên: ${n}.jpg`, 'ok'); paint(true); } catch (x) { toast(x.message, 'bad'); } };
    paint(true).catch(x => $('#mGrid').textContent = x.message);
  }

  // ---------- tài khoản ----------
  async function viewAccounts(V) {
    V.innerHTML = `<div class="top"><h2>Tài khoản quản trị</h2></div><div class="panel" id="accBox">Đang tải…</div>
      <div class="panel" style="margin-top:16px"><h3 style="margin-bottom:12px">Thêm quản trị viên</h3><form class="form" id="fAdd"><div class="fld"><label>Tên đăng nhập</label><input id="au" required></div><div class="fld"><label>Mật khẩu (≥ 10 ký tự)</label><input id="ap" type="password" minlength="10" required autocomplete="new-password"></div><div class="fld full"><button class="btn p">Thêm tài khoản</button></div></form></div>
      <div class="panel" style="margin-top:16px"><h3 style="margin-bottom:12px">Đổi mật khẩu của tôi</h3><form class="form" id="fPw"><div class="fld"><label>Mật khẩu mới (≥ 10 ký tự)</label><input id="np" type="password" minlength="10" required autocomplete="new-password"></div><div class="fld"><label>Nhập lại</label><input id="np2" type="password" minlength="10" required autocomplete="new-password"></div><div class="fld full"><button class="btn p">Đổi mật khẩu</button></div></form></div>`;
    const write = async (data, sha, what) => putFile(AUTH_PATH, b64FromText(JSON.stringify(data, null, 2)), msg(what), sha);
    const paint = async () => {
      const auth = await loadAuth();
      $('#accBox').innerHTML = `<table class="acc"><tr><th>Tên đăng nhập</th><th>Ngày tạo</th><th></th></tr>${auth.data.accounts.map(a => `<tr><td><b>${esc(a.u)}</b>${a.u === ME ? ' (bạn)' : ''}</td><td>${a.created ? new Date(a.created).toLocaleDateString('vi-VN') : ''}</td><td style="text-align:right">${a.u === ME ? '' : `<button class="btn sm d" data-del="${esc(a.u)}">Xoá</button>`}</td></tr>`).join('')}</table>`;
      $$('[data-del]', V).forEach(b => b.onclick = async () => {
        if (!confirm(`Xoá tài khoản ${b.dataset.del}?`)) return;
        const a = await loadAuth(); a.data.accounts = a.data.accounts.filter(x => x.u !== b.dataset.del);
        try { await write(a.data, a.sha, `xoá tài khoản ${b.dataset.del}`); toast('Đã xoá tài khoản.', 'ok'); paint(); } catch (x) { toast(x.message, 'bad'); }
      });
    };
    $('#fAdd').onsubmit = async e => {
      e.preventDefault(); const u = $('#au').value.trim(), p = $('#ap').value;
      const a = await loadAuth(); if (a.data.accounts.some(x => x.u.toLowerCase() === u.toLowerCase())) return toast('Tên đăng nhập đã tồn tại.', 'bad');
      a.data.accounts.push({ u, ...(await seal(TOKEN, p)), created: new Date().toISOString() });
      try { await write(a.data, a.sha, `thêm tài khoản ${u}`); toast(`Đã thêm ${u}.`, 'ok'); e.target.reset(); paint(); } catch (x) { toast(x.message, 'bad'); }
    };
    $('#fPw').onsubmit = async e => {
      e.preventDefault(); const p = $('#np').value; if (p !== $('#np2').value) return toast('Hai mật khẩu không khớp.', 'bad');
      const a = await loadAuth(), i = a.data.accounts.findIndex(x => x.u === ME);
      a.data.accounts[i] = { ...a.data.accounts[i], ...(await seal(TOKEN, p)) };
      try { await write(a.data, a.sha, `đổi mật khẩu ${ME}`); toast('Đã đổi mật khẩu.', 'ok'); e.target.reset(); } catch (x) { toast(x.message, 'bad'); }
    };
    paint().catch(x => $('#accBox').textContent = x.message);
  }

  // ---------- khởi động ----------
  async function start(u, token) {
    ME = u; TOKEN = token; $('#meName').textContent = u;
    show('vApp'); $('#view').innerHTML = '<div class="panel">Đang tải dữ liệu website…</div>';
    try { await loadCT(); go('dash'); }
    catch (x) {
      if (/401|Bad credentials/.test(x.message)) { sessionStorage.removeItem('ctAdmin'); show('vLogin'); $('#lErr').textContent = 'Khoá GitHub đã hết hạn hoặc bị thu hồi. Hãy thiết lập lại bằng khoá mới.'; }
      else $('#view').innerHTML = `<div class="panel">Không tải được dữ liệu: ${esc(x.message)}</div>`;
    }
  }
  $('#fLogin').onsubmit = doLogin;
  $('#fSetup').onsubmit = doSetup;
  $('#toSetup').onclick = () => show('vSetup');
  $('#toLogin').onclick = () => show('vLogin');
  $('#logout').onclick = () => { if (leaveGuard && !leaveGuard()) return; sessionStorage.removeItem('ctAdmin'); location.reload(); };

  const saved = JSON.parse(sessionStorage.getItem('ctAdmin') || 'null');
  if (saved) start(saved.u, saved.token);
  else loadAuth().then(a => show(a ? 'vLogin' : 'vSetup')).catch(() => show('vLogin'));
})();
