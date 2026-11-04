/* Єлизавета Соло Студіо — Pages CMS → статичний сайт (без бази даних).
   Редаговані файли: content/pages/*.json, content/galleries.json.
   Ніякі токени GitHub, секрети або паролі тут не використовуються. */
(() => {
  'use strict';
  const body = document.body;
  const page = body.dataset.cmsPage;
  const slug = body.dataset.cmsGallery;
  const byId = (id) => document.getElementById(id);
  const isSafeUrl = (u) => typeof u === 'string' &&
    /^(?:\/(?!\/)|\.\.?\/|#|https?:\/\/|mailto:|tel:)/i.test(u.trim());
  const url = (u) => isSafeUrl(u) ? u.trim() : '';
  // Посилання на власні сторінки мають залишатися на поточному домені.
  // Це працює для Vercel Preview та production, без зміни JSON у Pages CMS.
  const localLink = (value) => {
    const safe = url(value);
    if (!safe) return '';
    try {
      const parsed = new URL(safe, window.location.href);
      if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
          parsed.hostname.toLowerCase() === 'portfolio-liziko.vercel.app') {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch (_) { /* залишити початкову безпечну адресу */ }
    return safe;
  };
  const repairInternalAnchors = () => {
    document.querySelectorAll('a[href]').forEach((anchor) => {
      const current = anchor.getAttribute('href');
      const fixed = localLink(current);
      if (fixed && fixed !== current) anchor.setAttribute('href', fixed);
    });
  };
  const text = (u) => String(u == null ? '' : u);
  const el = (tag, className, textContent) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = text(textContent);
    return node;
  };
  const fetchJson = async (path) => {
    const response = await fetch(path, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  };
  const records = (array) => new Map((Array.isArray(array) ? array : [])
    .filter(x => x && typeof x.id === 'string')
    .map(x => [x.id, x]));

  function renderPage(data) {
    if (!data) return;
    if (data.seo) {
      if (typeof data.seo.title === 'string') document.title = data.seo.title;
      const m = document.querySelector('meta[name="description"]');
      if (m && typeof data.seo.description === 'string') m.content = data.seo.description;
    }
    const texts = records(data.texts), links = records(data.links), images = records(data.images);
    document.querySelectorAll('[data-cms-texts]').forEach((node) => {
      const keys = node.dataset.cmsTexts.split(',');
      const slots = Array.from(node.childNodes).filter(n => n.nodeType === 3 && n.nodeValue.trim());
      keys.forEach((key, i) => {
        const record = texts.get(key), slot = slots[i];
        if (!record || !slot || typeof record.value !== 'string') return;
        const original = slot.nodeValue;
        const leading = original.match(/^\s*/u)?.[0] || '';
        const trailing = original.match(/\s*$/u)?.[0] || '';
        slot.nodeValue = leading + record.value + trailing;
      });
    });
    document.querySelectorAll('[data-cms-link]').forEach((node) => {
      const entry = links.get(node.dataset.cmsLink);
      if (entry && localLink(entry.url)) node.href = localLink(entry.url);
    });
    document.querySelectorAll('[data-cms-media]').forEach((node) => {
      const entry = images.get(node.dataset.cmsMedia);
      if (!entry || !url(entry.src)) return;
      if (node.tagName === 'SOURCE') node.srcset = url(entry.src);
      else if (node.tagName === 'VIDEO') node.poster = url(entry.src);
      else {
        node.src = url(entry.src);
        if (typeof entry.alt === 'string') node.alt = entry.alt;
      }
    });
  }

  function galleryMedia(item, kind) {
    const media = kind === 'video' ? (item.video || item.media) : (item.image || item.media);
    return url(media);
  }
  function makeImageCard(item, direct = false) {
    const src = galleryMedia(item, 'image');
    if (!src) return null;
    const card = el('div','gallery__item');
    const preview = el('div', 'gallery__preview');
    const img = el('img');
    img.src = src; img.alt = text(item.alt || item.title);
    img.loading = 'lazy';
    img.addEventListener('error', () => card.remove());
    img.addEventListener('load', () => {if(typeof window.refreshGallery === 'function') window.refreshGallery();});
    if (direct) card.append(img);
    else { preview.append(img); card.append(preview); }
    card.append(el('p', 'gallery__caption', item.title));
    return card;
  }
  function showVideo(src) {
    if (!url(src)) return;
    if (typeof window.openVideoLightbox === 'function') {
      window.openVideoLightbox(src);
      return;
    }
    const modal = byId('cms-video-lightbox');
    if (!modal) return;
    const player = modal.querySelector('video');
    player.src = src;
    modal.hidden = false; modal.classList.add('active');
    player.play().catch(()=>{});
  }
  function makeVideoCard(item) {
    const src = galleryMedia(item, 'video');
    if (!src) return null;
    const card = el('div','gallery__item');
    const media = el('div','gallery__media');
    const video = el('video');
    video.muted = true; video.playsInline = true; video.preload = 'none';
    if (url(item.poster)) video.poster = url(item.poster);
    const source = el('source');source.src = src;source.type = 'video/mp4';
    video.append(source);media.append(video);card.append(media);
    card.append(el('p','gallery__caption',item.title));
    card.addEventListener('click', () => showVideo(src));
    card.tabIndex = 0; card.setAttribute('role','button');
    card.setAttribute('aria-label', 'Відкрити відео: '+text(item.title));
    card.addEventListener('keydown', e => {if (e.key==='Enter'||e.key===' ') {e.preventDefault();showVideo(src);}});
    return card;
  }
  function makeWebCard(item) {
    const card = el('article','web-project');
    const frame = el('div','web-project__preview web-project__preview--image');
    const img = el('img');img.alt = text(item.alt || item.title);img.loading='lazy';
    img.src = galleryMedia(item,'image');
    img.addEventListener('error',()=>{frame.hidden=true;});
    frame.append(img);
    const content = el('div','web-project__content');
    content.append(el('h2','web-project__title',item.title));
    content.append(el('p','web-project__desc',item.description));
    if (url(item.url)) {
      const a = el('a','web-project__site-btn','Переглянути сайт →');
      a.href=localLink(item.url); a.target='_blank';a.rel='noopener noreferrer';
      content.append(a);
    }
    card.append(frame,content);return card;
  }
  function closeCmsVideo(e) {
    const modal = byId('cms-video-lightbox');
    if (!modal || (e && e.target!==modal && !e.target.closest('.video-lightbox__close'))) return;
    const player = modal.querySelector('video');
    player.pause();player.removeAttribute('src');player.load();
    modal.classList.remove('active');modal.hidden = true;
  }
  const videoModal = byId('cms-video-lightbox');
  if (videoModal) {
    videoModal.addEventListener('click', closeCmsVideo);
    document.addEventListener('keydown', e => {if(e.key === 'Escape') closeCmsVideo();});
  }
  function selectedSlugIsDesign() { return slug === "design"; }
  function galleryPage(gallery) {
    if (!gallery || gallery.visible === false) {
      const content=document.querySelector('.portfolio-content');
      if (content) content.hidden = true;
      const title=document.querySelector('.portfolio-hero h1');
      if (title) title.textContent = 'Галерея тимчасово недоступна';
      return;
    }
    const dynamic = slug === 'dynamic';
    if (dynamic) {
      document.title = gallery.title + ' | Єлизавета Соло Студіо';
      const h1=document.querySelector('.portfolio-hero h1');
      if(h1) h1.textContent = text(gallery.title);
      const note=document.querySelector('.portfolio-hero__note');
      if(note) note.textContent = text(gallery.description);
    }
    body.classList.toggle('portfolio-page--video',gallery.kind === 'video');
    const list=(Array.isArray(gallery.items)?gallery.items:[]).filter(item=>item.visible!==false);
    const web = document.querySelector('.web-projects');
    const grid = document.querySelector('.gallery');
    if (gallery.kind === 'web') {
      let target = web;
      if (!target && grid) {
        target = el('section','web-projects');
        target.setAttribute('aria-label','Вебпроєкти');grid.replaceWith(target);
      }
      if (!target) return;
      target.replaceChildren(...list.map(makeWebCard));
    } else if (grid) {
      grid.replaceChildren(...list.map(item => gallery.kind === 'video' ? makeVideoCard(item) : makeImageCard(item, selectedSlugIsDesign())).filter(Boolean));
      if(gallery.kind==='image' && typeof window.refreshGallery==='function') {
        window.refreshGallery();
      }
    }
    if (dynamic && gallery.kind==='video') {
      const hint=document.querySelector('.portfolio-content__hint');
      if(hint)hint.textContent='Натисніть на відео, щоб відкрити програвач.';
    }
  }
  function addNewGalleryLinks(galleries) {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    const fixed = {'web':'gallery-webdesign.html','design':'gallery-smm-site.html',
      'ai-images':'gallery-images.html','ai-video':'gallery-video.html'};
    const visible = (galleries||[]).filter(g=>g && g.visible!==false);
    for (const g of (galleries||[])) {
      const existing = fixed[g.slug];
      if (existing) {
        const node = Array.from(grid.querySelectorAll('a')).find(a=>a.getAttribute('href')?.endsWith(existing) || a.getAttribute('href')?.includes('/'+existing));
        if (node) node.style.display=g.visible===false?'none':'';
        continue;
      }
      if(!g.slug || !/^[a-z0-9-]{1,48}$/.test(g.slug) || g.visible===false) continue;
      const href='gallery-collection.html?g='+encodeURIComponent(g.slug);
      const cover=(g.items||[]).find(x=>x.visible!==false && url(x.image || x.poster || (g.kind!=='video'?x.media:'')));
      const a=el('a','gallery-card');a.href=href;
      const n=el('span','gallery-number',String(visible.indexOf(g)+1).padStart(2,'0'));
      a.append(n);
      if(cover) {
        const img=el('img');img.src=url(cover.image||cover.poster||cover.media);img.alt=text(g.title);img.loading='lazy';
        a.append(img);
      }
      const lab=el('span','gallery-label',g.title);
      const arrow=el('b',null,'↗');arrow.setAttribute('aria-hidden','true');lab.append(' ',arrow);
      a.append(lab);grid.append(a);
    }
  }
  async function init() {
    repairInternalAnchors(); // статичні посилання — до завантаження JSON
    const selectedSlug = slug === 'dynamic'
      ? new URLSearchParams(window.location.search).get('g') : slug;
    const requests=[];
    if(page && page!=='gallery-collection') {
      requests.push(fetchJson('content/pages/'+page+'.json').then(renderPage));
    }
    requests.push(fetchJson('content/galleries.json').then(data=>{
      const galleries=Array.isArray(data.galleries)?data.galleries:[];
      if (page === 'index') addNewGalleryLinks(galleries);
      if (selectedSlug && /^[a-z0-9-]{1,48}$/.test(selectedSlug)) {
        const gallery=galleries.find(x=>x.slug===selectedSlug);
        if(gallery && gallery.visible!==false) galleryPage(gallery);
        else if (slug==='dynamic') {
          const h=document.querySelector('.portfolio-hero h1');
          if(h)h.textContent='Галерею не знайдено';
          const grid=document.querySelector('.gallery');if(grid)grid.replaceChildren();
        }
      }
    }));
    const results=await Promise.allSettled(requests);
    for(const r of results)if(r.status==='rejected')console.warn('CMS: не вдалося завантажити дані; використовується вміст сторінки.',r.reason);
    repairInternalAnchors(); // включно з посиланнями, створеними після завантаження JSON
  }
  init();
})();
