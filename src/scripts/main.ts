import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) =>
	root.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) =>
	Array.from(root.querySelectorAll<T>(sel));
const pad = (n: number) => String(n).padStart(2, '0');

let lenis: Lenis | null = null;
let menuOpen = false;
let menuTl: gsap.core.Timeline | null = null;

/* ---------- Smooth scroll ---------- */
function initSmoothScroll() {
	if (reduceMotion) return;
	lenis = new Lenis({ lerp: 0.085 });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis?.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);
}

function initAnchors() {
	$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
		a.addEventListener('click', (e) => {
			const id = a.getAttribute('href')!;
			e.preventDefault();
			if (id === '#') return;
			const target = id === '#top' ? 0 : $(id);
			if (target === null) return;
			closeMenu();
			if (lenis) lenis.scrollTo(target, { duration: 1.6 });
			else if (target === 0) window.scrollTo({ top: 0 });
			else target.scrollIntoView();
		});
	});
}

/* ---------- Preloader ---------- */
function runPreloader(): Promise<void> {
	const el = $('[data-preloader]');
	if (!el) return Promise.resolve();

	let seen = false;
	try {
		seen = sessionStorage.getItem('veta-loaded') === '1';
		sessionStorage.setItem('veta-loaded', '1');
	} catch {}

	if (reduceMotion || seen) {
		el.remove();
		return Promise.resolve();
	}

	lenis?.stop();
	const count = $('[data-preloader-count]', el)!;
	const counter = { v: 0 };

	return new Promise((resolve) => {
		gsap
			.timeline({
				onComplete: () => {
					el.remove();
					lenis?.start();
				},
			})
			.from('[data-preloader-sun]', { scale: 0, rotate: -180, duration: 1.3, ease: 'expo.out' }, 0)
			.from('[data-preloader-word]', { yPercent: 110, duration: 1, ease: 'expo.out' }, 0.25)
			.to(
				counter,
				{
					v: 100,
					duration: 1.7,
					ease: 'power2.inOut',
					onUpdate: () => {
						count.textContent = String(Math.round(counter.v)).padStart(3, '0');
					},
				},
				0,
			)
			.to('[data-preloader-word]', { yPercent: -110, duration: 0.6, ease: 'power3.in' }, 1.6)
			.to('[data-preloader-sun]', { scale: 0.5, rotate: 160, autoAlpha: 0, duration: 0.7, ease: 'power3.in' }, 1.6)
			.to(count, { autoAlpha: 0, duration: 0.4 }, 1.8)
			.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'expo.inOut' }, 2)
			.add(() => resolve(), 2.3);
	});
}

/* ---------- Nav + menu ---------- */
function initNav() {
	const nav = $('[data-nav]');
	if (!nav) return;

	ScrollTrigger.create({
		start: 0,
		end: 'max',
		onUpdate: (self) => {
			nav.dataset.hidden = String(self.direction === 1 && self.scroll() > 200 && !menuOpen);
		},
	});

	$$('[data-nav-theme]').forEach((section) => {
		ScrollTrigger.create({
			trigger: section,
			start: 'top 50px',
			end: 'bottom 50px',
			onToggle: (self) => {
				if (self.isActive) nav.dataset.theme = section.dataset.navTheme!;
			},
		});
	});
}

function initMenu() {
	const menu = $('[data-menu]');
	const toggle = $('[data-menu-toggle]');
	if (!menu || !toggle) return;

	menuTl = gsap
		.timeline({ paused: true })
		.set(menu, { visibility: 'visible' })
		.to(menu, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' })
		.from($$('[data-menu-link]', menu), { yPercent: 110, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out' }, '-=0.35');

	toggle.addEventListener('click', () => {
		menuOpen = true;
		toggle.setAttribute('aria-expanded', 'true');
		lenis?.stop();
		menuTl?.timeScale(1).play();
	});
	$('[data-menu-close]')?.addEventListener('click', closeMenu);
	document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
}

function closeMenu() {
	if (!menuOpen) return;
	menuOpen = false;
	$('[data-menu-toggle]')?.setAttribute('aria-expanded', 'false');
	lenis?.start();
	menuTl?.timeScale(1.6).reverse();
}

/* ---------- Cursor + magnetic ---------- */
function initCursor() {
	const cursor = $('[data-cursor]');
	if (!cursor || !finePointer) return;

	gsap.set(cursor, { xPercent: -50, yPercent: -50 });
	const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
	const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });

	window.addEventListener('pointermove', (e) => {
		cursor.style.opacity = '1';
		xTo(e.clientX);
		yTo(e.clientY);
	});
	document.documentElement.addEventListener('pointerleave', () => (cursor.style.opacity = '0'));
	document.addEventListener('pointerover', (e) => {
		const hit = (e.target as Element).closest('a, button, input, label');
		cursor.dataset.active = String(Boolean(hit));
	});
}

function initMagnetic() {
	if (!finePointer || reduceMotion) return;
	$$('[data-magnetic]').forEach((el) => {
		const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
		const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
		el.addEventListener('pointermove', (e) => {
			const r = el.getBoundingClientRect();
			xTo((e.clientX - r.left - r.width / 2) * 0.3);
			yTo((e.clientY - r.top - r.height / 2) * 0.4);
		});
		el.addEventListener('pointerleave', () => {
			xTo(0);
			yTo(0);
		});
	});
}

/* ---------- Hero ---------- */
function heroIntro() {
	const title = $('[data-hero-title]');
	const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

	if (title) {
		const split = SplitText.create(title, { type: 'lines,chars', mask: 'lines' });
		gsap.set(title, { visibility: 'visible' });
		tl.from(split.chars, { yPercent: 120, rotate: 6, duration: 1.5, stagger: 0.035 }, 0.1);
	}

	tl.fromTo(
		'[data-hero-image]',
		{ clipPath: 'inset(100% 0% 0% 0%)' },
		{ clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'expo.inOut' },
		0,
	)
		.fromTo('[data-hero-image-inner]', { scale: 1.6 }, { scale: 1.12, duration: 2.4 }, 0)
		.fromTo(
			'[data-hero-sun]',
			{ autoAlpha: 0, scale: 0, rotate: -140 },
			{ autoAlpha: 1, scale: 1, rotate: 0, duration: 1.8 },
			0.8,
		)
		.fromTo('[data-hero-in]', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.1 }, 0.5);
}

function initHeroScroll() {
	const trigger = { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true };
	gsap.to('[data-hero-image-inner]', { yPercent: 12, ease: 'none', scrollTrigger: trigger });
	gsap.to('[data-hero-sun]', { y: -140, ease: 'none', scrollTrigger: trigger });
	gsap.to('[data-hero-title]', { yPercent: 18, ease: 'none', scrollTrigger: trigger });
}

function initSpin() {
	gsap.to('[data-spin]', { rotate: 360, duration: 40, ease: 'none', repeat: -1 });
}

/* ---------- Marquee ---------- */
function initMarquee() {
	const track = $('[data-marquee]');
	if (!track) return;
	const loop = gsap.to(track, { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
	gsap.to('[data-marquee-sun]', { rotate: 360, duration: 12, ease: 'none', repeat: -1 });

	ScrollTrigger.create({
		trigger: track.parentElement,
		start: 'top bottom',
		end: 'bottom top',
		onUpdate: (self) => {
			const boost = Math.min(Math.abs(self.getVelocity()) / 220, 7);
			gsap
				.timeline()
				.to(loop, { timeScale: 1 + boost, duration: 0.25, overwrite: true })
				.to(loop, { timeScale: 1, duration: 1.4, ease: 'power2.out' });
		},
	});
}

/* ---------- Text ---------- */
function initManifesto() {
	const text = $('[data-manifesto]');
	if (text) {
		SplitText.create(text, {
			type: 'words',
			autoSplit: true,
			onSplit: (self) =>
				gsap.fromTo(
					self.words,
					{ opacity: 0.12 },
					{
						opacity: 1,
						stagger: 0.1,
						ease: 'none',
						scrollTrigger: { trigger: text, start: 'top 80%', end: 'bottom 50%', scrub: true },
					},
				),
		});
	}
	gsap.fromTo(
		'[data-manifesto-pose]',
		{ xPercent: -30, rotate: -10 },
		{
			xPercent: 0,
			rotate: 0,
			ease: 'none',
			scrollTrigger: { trigger: '#manifesto', start: 'top bottom', end: 'bottom top', scrub: true },
		},
	);
}

function initSplitHeadings() {
	$$('[data-split]').forEach((el) => {
		SplitText.create(el, {
			type: 'lines',
			mask: 'lines',
			autoSplit: true,
			onSplit: (self) => {
				gsap.set(el, { visibility: 'visible' });
				return gsap.from(self.lines, {
					yPercent: 110,
					duration: 1.4,
					ease: 'expo.out',
					stagger: 0.12,
					scrollTrigger: { trigger: el, start: 'top 85%', once: true },
				});
			},
		});
	});
}

function initReveals() {
	ScrollTrigger.batch('[data-reveal]', {
		start: 'top 88%',
		once: true,
		onEnter: (els) =>
			gsap.fromTo(
				els,
				{ autoAlpha: 0, y: 60 },
				{ autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, overwrite: true },
			),
	});
}

function initCounters() {
	$$('[data-counter]').forEach((el) => {
		const end = Number(el.dataset.counter);
		const state = { v: 0 };
		el.textContent = '0';
		gsap.to(state, {
			v: end,
			duration: 2.4,
			ease: 'power3.out',
			onUpdate: () => (el.textContent = String(Math.round(state.v))),
			scrollTrigger: { trigger: el, start: 'top 90%', once: true },
		});
	});
}

/* ---------- Pinned sections (desktop only) ---------- */
function initClasses(mm: gsap.MatchMedia) {
	mm.add('(min-width: 1024px)', () => {
		const pin = $('[data-classes-pin]');
		const track = $('[data-classes-track]');
		const progress = $('[data-classes-progress]');
		if (!pin || !track) return;

		const distance = () => track.scrollWidth - window.innerWidth;
		gsap.to(track, {
			x: () => -distance(),
			ease: 'none',
			scrollTrigger: {
				trigger: pin,
				pin: true,
				scrub: 0.8,
				start: 'top top',
				end: () => `+=${distance()}`,
				invalidateOnRefresh: true,
				onUpdate: (self) => progress && gsap.set(progress, { scaleX: self.progress }),
			},
		});
	});
}

function initStudio(mm: gsap.MatchMedia) {
	mm.add('(min-width: 1024px)', () => {
		const wrap = $('[data-studio]');
		if (!wrap) return;
		const frames = $$('[data-studio-frame]', wrap);
		const imgs = $$('[data-studio-img]', wrap);
		const captions = $$('[data-studio-caption]', wrap);
		const dots = $$('[data-studio-dot]', wrap);

		const tl = gsap.timeline({
			defaults: { ease: 'none' },
			scrollTrigger: {
				trigger: wrap,
				pin: true,
				start: 'top top',
				end: () => `+=${window.innerHeight * frames.length}`,
				scrub: 1,
				invalidateOnRefresh: true,
			},
		});

		tl.fromTo(imgs[0], { scale: 1.15 }, { scale: 1, duration: 1 }).to(dots[0], { scaleX: 1, duration: 1 }, 0);

		for (let i = 1; i < frames.length; i++) {
			tl.to(frames[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' })
				.fromTo(imgs[i], { scale: 1.35, yPercent: 8 }, { scale: 1, yPercent: 0, duration: 1.2, ease: 'power2.out' }, '<')
				.to(imgs[i - 1], { scale: 1.12, yPercent: -6, duration: 1 }, '<')
				.to(captions[i - 1], { autoAlpha: 0, y: -40, duration: 0.4 }, '<')
				.fromTo(captions[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<0.45')
				.to(dots[i], { scaleX: 1, duration: 1 }, '<-0.45');
		}
		tl.to({}, { duration: 0.4 });
	});
}

/* ---------- Testimonials ---------- */
function initTestimonials() {
	const root = $('[data-testimonials]');
	if (!root) return;
	const quotes = $$('[data-quote]', root);
	const progress = $('[data-quote-progress]', root);
	const index = $('[data-quote-index]', root);
	let current = 0;
	let timer: gsap.core.Tween | null = null;
	let inView = false;

	const restart = () => {
		timer?.kill();
		timer = gsap.fromTo(
			progress,
			{ scaleX: 0 },
			{ scaleX: 1, duration: 7, ease: 'none', paused: !inView, onComplete: () => go(current + 1) },
		);
	};

	const go = (n: number) => {
		const next = (n + quotes.length) % quotes.length;
		if (next === current) return;
		const out = quotes[current];
		const inn = quotes[next];
		gsap.to(out, { autoAlpha: 0, y: -30, duration: 0.6, ease: 'power3.in' });
		gsap.fromTo(inn, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: 0.45 });
		out.setAttribute('aria-hidden', 'true');
		inn.removeAttribute('aria-hidden');
		current = next;
		if (index) index.textContent = pad(current + 1);
		restart();
	};

	$('[data-quote-prev]', root)?.addEventListener('click', () => go(current - 1));
	$('[data-quote-next]', root)?.addEventListener('click', () => go(current + 1));

	restart();
	ScrollTrigger.create({
		trigger: root,
		start: 'top 75%',
		end: 'bottom 25%',
		onToggle: (self) => {
			inView = self.isActive;
			if (inView) timer?.resume();
			else timer?.pause();
		},
	});
}

/* ---------- CTA ---------- */
function initCta() {
	gsap.fromTo(
		'[data-cta-pose]',
		{ xPercent: 45, yPercent: 15, rotate: 12 },
		{
			xPercent: 0,
			yPercent: 0,
			rotate: 0,
			ease: 'none',
			scrollTrigger: { trigger: '[data-cta]', start: 'top bottom', end: 'bottom bottom', scrub: 1 },
		},
	);
}

/* ---------- Boot ---------- */
async function init() {
	initSmoothScroll();
	const preloaderDone = runPreloader();
	await document.fonts.ready;

	initNav();
	initMenu();
	initAnchors();
	initCursor();
	initMagnetic();
	initTestimonials();

	if (reduceMotion) {
		gsap.set('[data-reveal], [data-split], [data-hero-in], [data-hero-title], [data-hero-sun]', {
			visibility: 'visible',
		});
		return;
	}

	initSpin();
	initHeroScroll();
	initMarquee();
	initManifesto();
	initSplitHeadings();
	const mm = gsap.matchMedia();
	initClasses(mm);
	initStudio(mm);
	initReveals();
	initCounters();
	initCta();

	ScrollTrigger.sort();
	ScrollTrigger.refresh();

	await preloaderDone;
	heroIntro();
}

init();
window.addEventListener('load', () => ScrollTrigger.refresh());
