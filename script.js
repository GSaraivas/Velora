const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.mobile-nav');
if (location.hash === '#frame') document.documentElement.classList.add('frame-mode');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menu.hidden = !open;
});
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir menu');
}));

const track = document.querySelector('.scroll-track');
const hero = track?.querySelector('.hero');
const film = document.querySelector('#floral-film');
const stage = document.querySelector('.static-stage');
const chapterLinks = [...document.querySelectorAll('[data-chapter-link]')];
const chapters = [...document.querySelectorAll('.chapter')];
const progressBar = document.querySelector('.progress');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const frameMode = location.hash === '#frame';
const touchDevice = navigator.maxTouchPoints > 0;
let seekPending = false;
let smoothTime = 0;
let targetTime = 0;
let filmDuration = 10;
let activeChapter = -1;

if (film && !reduceMotion && !frameMode) {
  film.src = touchDevice ? 'assets/floral-mobile.mp4' : 'assets/floral-desktop.mp4';
  if (touchDevice) film.poster = 'assets/floral-mobile-poster.png';
  film.load();
  film.addEventListener('loadedmetadata', () => { filmDuration = film.duration || 10; });
  film.addEventListener('seeked', () => { seekPending = false; });
  film.addEventListener('error', () => { seekPending = false; hero?.classList.add('film-error'); });
  if (touchDevice) {
    document.addEventListener('touchstart', () => {
      film.play().then(() => { film.pause(); }).catch(() => {});
    }, { once: true, passive: true });
  }
}

function scrollProgress() {
  const span = Math.max(1, track.offsetHeight - window.innerHeight);
  return Math.min(1, Math.max(0, (window.scrollY - track.offsetTop) / span));
}

function tick() {
  if (!track) return;
  const p = scrollProgress();
  const dissolve = Math.min(1, p / .03);
  const filmVisible = !reduceMotion && !frameMode && !hero.classList.contains('film-error');
  hero.style.setProperty('--static-opacity', filmVisible ? String(1 - dissolve) : '1');
  hero.style.setProperty('--film-opacity', filmVisible ? String(dissolve) : '0');
  const chapterOpacity = Math.min(1, Math.max(0, (p - .03) / .03));
  hero.style.setProperty('--chapter-opacity', frameMode ? '0' : String(chapterOpacity));
  hero.style.setProperty('--progress', `${(p * 100).toFixed(2)}%`);
  stage.classList.toggle('is-gone', filmVisible && dissolve >= 1);
  progressBar?.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  const storyP = Math.max(0, (p - .03) / .97);
  const chapter = Math.min(2, Math.floor(storyP * 3));
  if (chapter !== activeChapter) {
    activeChapter = chapter;
    chapters.forEach((item, i) => item.classList.toggle('is-active', i === chapter));
    chapterLinks.forEach((item, i) => i === chapter ? item.setAttribute('aria-current', 'true') : item.removeAttribute('aria-current'));
  }
  if (filmVisible && film.readyState >= 2) {
    targetTime = p <= .03 ? 0 : Math.min(filmDuration - .04, storyP * (filmDuration - .04));
    smoothTime += (targetTime - smoothTime) * .22;
    if (Math.abs(targetTime - smoothTime) < .012) smoothTime = targetTime;
    if (!seekPending && !film.seeking && Math.abs(film.currentTime - smoothTime) > .035) {
      seekPending = true;
      film.currentTime = Math.min(filmDuration - .04, Math.max(0, smoothTime));
    }
  }
  requestAnimationFrame(tick);
}

chapterLinks.forEach((item, i) => item.addEventListener('click', event => {
  event.preventDefault();
  const span = Math.max(1, track.offsetHeight - innerHeight);
  window.scrollTo({ top: track.offsetTop + span * (.03 + i * .97 / 3), behavior: reduceMotion ? 'instant' : 'smooth' });
}));

if (track) requestAnimationFrame(tick);

// Continuation navigation: the original opening header remains visually untouched.
const siteHeader = document.querySelector('#site-header');
const siteMenuButton = document.querySelector('.site-menu-button');
const siteMobileNav = document.querySelector('#site-mobile-nav');
const sectionLinks = [...document.querySelectorAll('[data-section-link]')];
const siteSections = ['inicio','essencia','colecao','atelier','encomendas'].map(id => document.getElementById(id)).filter(Boolean);
function updateSiteHeader() {
  const show = window.scrollY > Math.max(30, track.offsetHeight * .03);
  siteHeader?.classList.toggle('is-visible', show);
  siteHeader?.setAttribute('aria-hidden', String(!show));
  if (!show && siteMobileNav && !siteMobileNav.hidden) closeSiteMenu();
}
function closeSiteMenu() {
  if (!siteMobileNav) return;
  siteMobileNav.hidden = true;
  siteMenuButton?.setAttribute('aria-expanded', 'false');
  siteMenuButton?.setAttribute('aria-label', 'Abrir navegação');
}
siteMenuButton?.addEventListener('click', () => {
  const open = siteMobileNav.hidden;
  siteMobileNav.hidden = !open;
  siteMenuButton.setAttribute('aria-expanded', String(open));
  siteMenuButton.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
});
siteMobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSiteMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSiteMenu(); });
window.addEventListener('scroll', updateSiteHeader, { passive: true });
updateSiteHeader();

function setActiveSection(id) {
  sectionLinks.forEach(link => {
    if (link.dataset.sectionLink === id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
setActiveSection('inicio');
const sectionObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) setActiveSection(entry.target.id);
  }
}, { rootMargin: '-22% 0px -62% 0px', threshold: 0 });
siteSections.forEach(section => sectionObserver.observe(section));

const revealItems = [...document.querySelectorAll('.section .reveal')];
if (!reduceMotion && window.gsap) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach(entry => {
      const element = entry.target;
      revealObserver.unobserve(element);
      gsap.fromTo(element, { opacity: .15, y: 28 }, { opacity: 1, y: 0, duration: .95, ease: 'power3.out', clearProps: 'all' });
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  revealItems.forEach(element => revealObserver.observe(element));
}

const imageDialog = document.querySelector('.image-dialog');
let previousFocus = null;
document.querySelectorAll('.gallery-open').forEach(button => button.addEventListener('click', () => {
  if (!imageDialog?.showModal) return;
  previousFocus = document.activeElement;
  imageDialog.querySelector('img').src = button.dataset.full;
  imageDialog.querySelector('img').alt = button.querySelector('img').alt;
  imageDialog.querySelector('p').textContent = button.dataset.caption;
  imageDialog.showModal();
}));
imageDialog?.querySelector('.dialog-close')?.addEventListener('click', () => imageDialog.close());
imageDialog?.addEventListener('click', event => { if (event.target === imageDialog) imageDialog.close(); });
imageDialog?.addEventListener('close', () => previousFocus?.focus());

const orderButton = document.querySelector('.order-button');
const contactNote = document.querySelector('.contact-note');
const whatsappNumber = (document.body.dataset.whatsappNumber || '').replace(/\D/g, '');
if (!whatsappNumber && orderButton) {
  orderButton.disabled = true;
  orderButton.setAttribute('aria-describedby', 'contact-note');
}
orderButton?.addEventListener('click', () => {
  if (!whatsappNumber) {
    contactNote.textContent = 'Contato por WhatsApp ainda não configurado.';
    return;
  }
  const message = 'Olá! Gostaria de conhecer as opções de arranjos florais e fazer uma encomenda.';
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});
if (whatsappNumber) contactNote.hidden = true;
