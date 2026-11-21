const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));nav.classList.toggle('open',!open)});nav.addEventListener('click',event=>{if(event.target.closest('a')){nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}});document.querySelector('#quote-form').addEventListener('submit',event=>{event.preventDefault();document.querySelector('#form-status').textContent='Your request could not be sent. Please try again later.'});
// Reveal elements once as they enter the viewport.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const items = document.querySelectorAll('.reveal-up, .reveal-fade');
  document.documentElement.classList.add('reveal-ready');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
  }, { threshold: 0.1 });
  items.forEach((item) => observer.observe(item));
}
// Keep the native details controls while animating their answers.
const faqItems = [...document.querySelectorAll('.faq-list details')];
function setFaq(item, open) {
  const answer = item.querySelector('p');
  if (item.faqAnimation) { item.faqAnimation.cancel(); item.faqAnimation = null; }
  if (open) item.open = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !answer.animate) { item.open = open; return; }
  const height = answer.offsetHeight;
  item.faqAnimation = answer.animate(open
    ? [{height:'0px', opacity:0, paddingBottom:'0px'}, {height:height+'px', opacity:1, paddingBottom:getComputedStyle(answer).paddingBottom}]
    : [{height:height+'px', opacity:1}, {height:'0px', opacity:0, paddingBottom:'0px'}],
    {duration:250, easing:'ease', fill:'both'});
  item.faqAnimation.onfinish = () => { item.open = open; item.faqAnimation.cancel(); item.faqAnimation = null; };
}
faqItems.forEach((item) => item.querySelector('summary').addEventListener('click', (event) => {
  event.preventDefault();
  const opening = !item.open;
  faqItems.forEach((other) => { if (other !== item && other.open) setFaq(other, false); });
  setFaq(item, opening);
}));

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
      End: last
    }[event.key];
    if (nextIndex === undefined) return;

    event.preventDefault();
    selectPricesTab(nextIndex);
    pricesTabs[nextIndex].focus();
  });
});

selectPricesTab(0);
pricesTabList.hidden = false;
