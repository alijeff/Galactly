/* js/ui.js — UI: dropdown, mobile, tabs, anchors, and text entrance + heroFlow init */

(function(){
  // dropdown & mobile
  const company = document.getElementById('companyMenu');
  const list = document.getElementById('companyList');
  if(company && list){
    company.addEventListener('mouseenter', ()=> list.style.display='block');
    company.addEventListener('mouseleave', ()=> list.style.display='none');
    const link = company.querySelector('.link');
    link && link.addEventListener('click', function(e){
      if(window.innerWidth < 900){ e.preventDefault(); list.style.display = (list.style.display==='block') ? 'none' : 'block'; }
    });
  }
  const hamb = document.getElementById('hambtn'), mobile = document.getElementById('mobileMenu');
  if(hamb && mobile) hamb.addEventListener('click', ()=> mobile.style.display = mobile.style.display === 'block' ? 'none' : 'block');

  // home logo
  const homeBtn = document.getElementById('homeBtn');
  if(homeBtn) homeBtn.addEventListener('click', ()=> location.href = '#hero');

  // top and hero Get buttons: go to AI Hub
  const topGet = document.getElementById('topGet'), heroGet = document.getElementById('heroGet');
  if(topGet) topGet.addEventListener('click', ()=> document.getElementById('ai').scrollIntoView({behavior:'smooth'}));
  if(heroGet) heroGet.addEventListener('click', ()=> document.getElementById('ai').scrollIntoView({behavior:'smooth'}));

  // tabs - fire dept change event
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', ()=> {
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      window.dispatchEvent(new CustomEvent('gg:dept-change', { detail: { key: tab.dataset.key } }));
    });
  });

  // Open buttons
  const openManager = document.getElementById('openManager'), openAcq = document.getElementById('openAcq'), openRet = document.getElementById('openRet');
  if(openManager) openManager.addEventListener('click', ()=> { document.querySelector('.tab[data-key="manager"]').click(); document.getElementById('ai').scrollIntoView({behavior:'smooth'}); });
  if(openAcq) openAcq.addEventListener('click', ()=> { document.querySelector('.tab[data-key="acq"]').click(); document.getElementById('ai').scrollIntoView({behavior:'smooth'}); });
  if(openRet) openRet.addEventListener('click', ()=> { document.querySelector('.tab[data-key="ret"]').click(); document.getElementById('ai').scrollIntoView({behavior:'smooth'}); });

  // smooth anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const target = document.querySelector(a.getAttribute('href'));
      if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });

  /* STAGGERED HERO TEXT entrance (like aiacquisition) */
  window.addEventListener('load', ()=> {
    const heroTitle = document.querySelector('.hero-title');
    const heroSub = document.querySelector('.hero-sub');
    const heroTag = document.querySelector('.hero-tagline');
    const heroCtas = document.querySelector('.hero-ctas');

    // small stagger function
    function staggerAdd(el, delay){
      if(!el) return;
      setTimeout(()=> el.classList.add('animate-in'), delay);
    }
    staggerAdd(heroTitle, 160);
    staggerAdd(heroSub, 360);
    staggerAdd(heroCtas, 620);
    staggerAdd(heroTag, 880);

    // lazy-init hero flow if canvas present
    setTimeout(()=> {
      if(window.initHeroFlow) try{ window.initHeroFlow(); } catch(e){}
    }, 900);
  });

  /* animate-in on scroll for other sections (simple reveal) */
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e => {
      if(e.isIntersecting) { e.target.classList.add('animate-in'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.step, .metric-card, .power-card, .details').forEach(n => observer.observe(n));
})();
