const menu = document.querySelector('.menu-toggle'),
	nav = document.querySelector('.nav');
menu.addEventListener('click', () => {
	const open = menu.getAttribute('aria-expanded') === 'true';
	menu.setAttribute('aria-expanded', String(!open));
	nav.classList.toggle('open', !open);
});
nav.addEventListener('click', (event) => {
	if (event.target.closest('a')) {
		nav.classList.remove('open');
		menu.setAttribute('aria-expanded', 'false');
	}
});
document.querySelector('#quote-form').addEventListener('submit', (event) => {
	event.preventDefault();
	document.querySelector('#form-status').textContent = 'Your request could not be sent. Please try again later.';
});
// Reveal elements once as they enter the viewport.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
	const items = document.querySelectorAll('.reveal-up, .reveal-fade');
	document.documentElement.classList.add('reveal-ready');
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.1 },
	);
	items.forEach((item) => observer.observe(item));
}
// Keep the native details controls while animating their answers.
const faqItems = [...document.querySelectorAll('.faq-list details')];
function setFaq(item, open) {
	const answer = item.querySelector('p');
	if (item.faqAnimation) {
		item.faqAnimation.cancel();
		item.faqAnimation = null;
	}
	if (open) item.open = true;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches || !answer.animate) {
		item.open = open;
		return;
	}
	const height = answer.offsetHeight;
	item.faqAnimation = answer.animate(
		open
			? [
					{ height: '0px', opacity: 0, paddingBottom: '0px' },
					{ height: height + 'px', opacity: 1, paddingBottom: getComputedStyle(answer).paddingBottom },
				]
			: [
					{ height: height + 'px', opacity: 1 },
					{ height: '0px', opacity: 0, paddingBottom: '0px' },
				],
		{ duration: 250, easing: 'ease', fill: 'both' },
	);
	item.faqAnimation.onfinish = () => {
		item.open = open;
		item.faqAnimation.cancel();
		item.faqAnimation = null;
	};
}
faqItems.forEach((item) =>
	item.querySelector('summary').addEventListener('click', (event) => {
		event.preventDefault();
		const opening = !item.open;
		faqItems.forEach((other) => {
			if (other !== item && other.open) setFaq(other, false);
		});
		setFaq(item, opening);
	}),
);

// Show one price list at a time when scripting is available.
const pricesTabList = document.querySelector('.prices-tabs');
const pricesTabs = [...pricesTabList.querySelectorAll('[role="tab"]')];
const pricesPanels = pricesTabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

function selectPricesTab(index) {
	pricesTabs.forEach((tab, tabIndex) => {
		const selected = tabIndex === index;
		tab.setAttribute('aria-selected', String(selected));
		tab.tabIndex = selected ? 0 : -1;
		pricesPanels[tabIndex].hidden = !selected;
	});
}

pricesTabs.forEach((tab, index) => {
	const panel = pricesPanels[index];
	panel.setAttribute('role', 'tabpanel');
	panel.setAttribute('aria-labelledby', tab.id);
	panel.tabIndex = 0;
	panel.querySelector('h3').hidden = true;

	tab.addEventListener('click', () => selectPricesTab(index));
	tab.addEventListener('keydown', (event) => {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

		const last = pricesTabs.length - 1;
		const nextIndex = {
			ArrowLeft: index === 0 ? last : index - 1,
			ArrowRight: index === last ? 0 : index + 1,
			Home: 0,
			End: last,
		}[event.key];
		if (nextIndex === undefined) return;

		event.preventDefault();
		selectPricesTab(nextIndex);
		pricesTabs[nextIndex].focus();
	});
});

selectPricesTab(0);
pricesTabList.hidden = false;

// Draw the soap bubbles behind the new hero's HTML content.
(() => {
	const section = document.querySelector('.hero-animated');
	if (!section) return;

	const canvas = section.querySelector('canvas');
	const context = canvas?.getContext('2d');
	if (!context) return;

	const pauseButton = section.querySelector('.hero-animated-pause');
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const narrowScreen = matchMedia('(max-width: 700px)');
	const sprites = [0.4, 2.5, 4.6].map(makeBubbleSprite);
	const desktopPositions = [
		[0.025, 0.2, 62],
		[0.15, 0.12, 25],
		[0.34, 0.13, 46],
		[0.52, 0.1, 23],
		[0.55, 0.29, 75],
		[0.47, 0.61, 34],
		[0.035, 0.66, 46],
		[0.18, 0.88, 60],
		[0.38, 0.91, 27],
		[0.51, 0.82, 47],
		[0.66, 0.95, 26],
		[0.96, 0.1, 36],
		[0.97, 0.44, 67],
		[0.96, 0.81, 43],
	];
	const mobilePositions = [
		[0.05, 0.12, 45],
		[0.43, 0.045, 23],
		[0.91, 0.11, 74],
		[0.73, 0.27, 32],
		[0.16, 0.32, 39],
		[0.94, 0.35, 51],
		[0.09, 0.45, 60],
		[0.98, 0.64, 40],
		[0.08, 0.92, 52],
		[0.68, 0.97, 26],
	];
	const sparks = [];
	const burstDotColors = ['#699e9b', '#a78eac', '#bd92a0', '#a39876'];
	let bubbles = [];
	let isCompact;
	let width = 0;
	let height = 0;
	let elapsed = 0;
	let frame = null;
	let previousTime = null;
	let pointer = null;
	let lastTrail = -Infinity;
	let inView = true;
	let paused = false;

	function makeBubbleSprite(angle) {
		// Cache each variation so the animation only composites images.
		const sprite = document.createElement('canvas');
		sprite.width = sprite.height = 256;
		const paint = sprite.getContext('2d');
		const radius = 112;
		paint.translate(128, 128);

		const film = paint.createRadialGradient(-30, -44, 8, 0, 0, radius);
		film.addColorStop(0, '#ffffffb0');
		film.addColorStop(0.54, '#ffffff10');
		film.addColorStop(0.84, '#92c8cf16');
		film.addColorStop(1, '#7cb8b44f');
		paint.beginPath();
		paint.arc(0, 0, radius, 0, Math.PI * 2);
		paint.fillStyle = film;
		paint.fill();

		const rim = paint.createConicGradient?.(angle, 0, 0) ?? paint.createLinearGradient(-radius, radius, radius, -radius);
		rim.addColorStop(0, '#438e898c');
		rim.addColorStop(0.21, '#74a4857d');
		rim.addColorStop(0.43, '#5690b291');
		rim.addColorStop(0.67, '#9581b794');
		rim.addColorStop(0.85, '#c88f9b91');
		rim.addColorStop(1, '#438e898c');
		paint.lineWidth = 3.5;
		paint.strokeStyle = rim;
		paint.stroke();

		paint.beginPath();
		paint.arc(0, 0, radius - 9, 0.25, 1.8);
		paint.lineWidth = 6;
		paint.lineCap = 'round';
		paint.strokeStyle = '#76b3bf54';
		paint.stroke();

		paint.beginPath();
		paint.ellipse(-51, -64, 19, 8, -0.63, 0, Math.PI * 2);
		paint.fillStyle = '#ffffffee';
		paint.fill();
		paint.beginPath();
		paint.ellipse(58, 68, 10, 4, -0.63, 0, Math.PI * 2);
		paint.fillStyle = '#ffffffab';
		paint.fill();
		return sprite;
	}

	function draw(delta) {
		context.clearRect(0, 0, width, height);
		const scale = Math.max(0.66, Math.min(1.15, width / 1050));
		const response = 1 - Math.exp(-8 * delta);
		for (const bubble of bubbles) {
			const { anchorX, anchorY, size, index } = bubble;
			const phase = elapsed * (0.45 + (index % 4) * 0.11) + index * 1.7;
			const x = anchorX * width + Math.sin(phase) * 17 * scale;
			const y = anchorY * height + Math.cos(phase * 0.73) * 29 * scale;
			const radius = size * scale;
			const growth = Math.max(0, Math.min(1, (elapsed - bubble.poppedAt - 1.2) / 0.65));
			let pushX = 0;
			let pushY = 0;
			if (pointer) {
				const dx = x - pointer.x;
				const dy = y - pointer.y;
				const distance = Math.hypot(dx, dy);
				const range = radius + 75;
				if (distance > 0 && distance < range) {
					const strength = 24 * (1 - distance / range);
					pushX = (dx / distance) * strength;
					pushY = (dy / distance) * strength;
				}
			}
			bubble.offsetX += (pushX - bubble.offsetX) * response;
			bubble.offsetY += (pushY - bubble.offsetY) * response;
			bubble.x = x + bubble.offsetX;
			bubble.y = y + bubble.offsetY;
			bubble.radius = radius * growth;
			if (!growth) continue;

			const half = bubble.radius * (128 / 112);
			context.globalAlpha = 0.5 * growth;
			context.drawImage(sprites[index % sprites.length], bubble.x - half, bubble.y - half, half * 2, half * 2);
		}

		for (let index = sparks.length - 1; index >= 0; index--) {
			const spark = sparks[index];
			spark.life -= delta;
			if (spark.life <= 0) {
				sparks.splice(index, 1);
				continue;
			}
			spark.x += spark.vx * delta;
			spark.y += spark.vy * delta;
			spark.vy += 20 * delta;

			const { x, y, size, dot, rotation = 0, color = '#448f90' } = spark;
			context.globalAlpha = Math.min(1, spark.life * 2);
			context.fillStyle = color;
			context.beginPath();
			if (dot) {
				context.arc(x, y, size, 0, Math.PI * 2);
			} else {
				context.save();
				context.translate(x, y);
				context.rotate(rotation);
				context.moveTo(0, -size);
				context.lineTo(size * 0.24, -size * 0.24);
				context.lineTo(size * 0.75, 0);
				context.lineTo(size * 0.24, size * 0.24);
				context.lineTo(0, size);
				context.lineTo(-size * 0.24, size * 0.24);
				context.lineTo(-size * 0.75, 0);
				context.lineTo(-size * 0.24, -size * 0.24);
				context.closePath();
				context.restore();
			}
			context.fill();
		}
		context.globalAlpha = 1;
	}

	function resize() {
		const bounds = section.getBoundingClientRect();
		width = bounds.width;
		height = bounds.height;
		if (!width || !height) return;

		if (isCompact !== narrowScreen.matches) {
			isCompact = narrowScreen.matches;
			const positions = isCompact ? mobilePositions : desktopPositions;
			bubbles = positions.map(([anchorX, anchorY, size], index) => ({
				anchorX,
				anchorY,
				size,
				index,
				x: 0,
				y: 0,
				radius: 0,
				offsetX: 0,
				offsetY: 0,
				poppedAt: -Infinity,
			}));
		}

		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.ceil(width * pixelRatio);
		canvas.height = Math.ceil(height * pixelRatio);
		context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
		draw(0);
	}

	function tick(time) {
		const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
		previousTime = time;
		elapsed += delta;
		draw(delta);
		frame = requestAnimationFrame(tick);
	}

	function syncPlayback() {
		const label = paused ? 'Resume bubble animation' : 'Pause bubble animation';
		pauseButton.hidden = reducedMotion.matches;
		pauseButton.toggleAttribute('data-paused', paused);
		pauseButton.setAttribute('aria-label', label);
		pauseButton.title = label;
		if (inView && !document.hidden && !paused && !reducedMotion.matches) {
			if (frame === null) frame = requestAnimationFrame(tick);
		} else {
			if (frame !== null) cancelAnimationFrame(frame);
			frame = previousTime = null;
			pointer = null;
		}
	}

	function localPoint(event) {
		const bounds = section.getBoundingClientRect();
		return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
	}

	section.addEventListener('pointermove', (event) => {
		if (frame === null || event.pointerType === 'touch') return;
		pointer = localPoint(event);
		if (elapsed - lastTrail < 0.08) return;
		lastTrail = elapsed;
		sparks.push({ ...pointer, vx: 0, vy: -17, size: 4, life: 0.5 });
	});
	section.addEventListener('pointerleave', () => {
		pointer = null;
	});
	section.addEventListener('pointerdown', (event) => {
		if (frame === null || event.button !== 0 || event.target.closest('a, button, .hero-photo')) return;
		const point = localPoint(event);
		// Overlapping bubbles should pop in the same order in which they are drawn.
		for (let index = bubbles.length - 1; index >= 0; index--) {
			const bubble = bubbles[index];
			if (Math.hypot(point.x - bubble.x, point.y - bubble.y) >= bubble.radius) continue;
			const radius = bubble.radius;
			bubble.poppedAt = elapsed;
			bubble.radius = 0;
			const particleScale = Math.max(0.75, Math.min(1.15, radius / 48));
			const dotCount = 4 + Math.floor(Math.random() * 4);
			const starCount = 8 + Math.floor(Math.random() * 4);
			for (let particle = 0; particle < dotCount + starCount; particle++) {
				const dot = particle < dotCount;
				const angle = Math.random() * Math.PI * 2;
				const distance = radius * (0.15 + Math.random() * 0.8);
				const speed = (18 + Math.random() * 75) * particleScale;
				const dx = Math.cos(angle);
				const dy = Math.sin(angle);
				sparks.push({
					x: bubble.x + dx * distance,
					y: bubble.y + dy * distance,
					vx: dx * speed,
					vy: dy * speed,
					size: (dot ? 0.8 + Math.random() * 1.8 : 1.7 + Math.random() * 4.3) * particleScale,
					life: 0.3 + Math.random() * 0.5,
					dot,
					rotation: Math.random() * Math.PI * 2,
					color: dot ? burstDotColors[Math.floor(Math.random() * burstDotColors.length)] : '#448f90',
				});
			}
			break;
		}
	});

	pauseButton.addEventListener('click', () => {
		paused = !paused;
		syncPlayback();
	});
	reducedMotion.addEventListener('change', syncPlayback);
	document.addEventListener('visibilitychange', syncPlayback);
	window.addEventListener('resize', resize);
	if ('ResizeObserver' in window) new ResizeObserver(resize).observe(section);
	if ('IntersectionObserver' in window) {
		new IntersectionObserver(([entry]) => {
			inView = entry.isIntersecting;
			syncPlayback();
		}).observe(section);
	}

	resize();
	syncPlayback();
})();
