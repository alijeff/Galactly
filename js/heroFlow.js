/* js/heroFlow.js — minimal vector-only hero flow (no text popups)
   - Auto-initializes
   - Uses crisp DPR scaling
   - No floating explanatory text; only vectors and motion
*/

(function(){
  const REDUCE_MOTION = (matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function initHeroFlow(){
    const canvas = document.getElementById('heroFlowCanvas');
    const cta = document.getElementById('heroFlowCTA');
    if(!canvas) return;

    if(REDUCE_MOTION){
      // static minimal fallback
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      // draw simple icons only
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.arc(80, canvas.height/2, 6,0,Math.PI*2); ctx.fill(); // source
      ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height/2, 22,0,Math.PI*2); ctx.fill(); // AI
      ctx.beginPath(); ctx.arc(canvas.width-80, canvas.height/2, 8,0,Math.PI*2); ctx.fill(); // rep
      if(cta) cta.addEventListener('click', ()=> window.open('#', '_blank'));
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    let W = canvas.clientWidth, H = canvas.clientHeight;
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);

    // layout positions (relative to canvas)
    const leftX = Math.round(W * 0.12);
    const centerX = Math.round(W * 0.5);
    const rightX = Math.round(W * 0.88);
    const midY = Math.round(H * 0.5);

    // source nodes (left), static
    const sources = Array.from({length:8}).map((_,i) => {
      return { x: leftX + (Math.random()*20 - 10), y: 40 + i*(H-80)/8 + (Math.random()*20 - 10), r: 3 + Math.random()*2 };
    });

    // particles in flight
    const particles = [];

    // grouped blocks that form on the right as particles arrive
    const aggregation = [];

    // spawn logic parameters
    const spawnChance = 0.12;
    const maxParticles = 90;

    // small helper for crisp circle drawing
    function drawCircle(x,y,r,fill){
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle = fill; ctx.fill();
    }

    // main loop
    let lastTime = performance.now();

    function step(now){
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // clear subtle background
      ctx.clearRect(0,0,W,H);
      // optional very faint background vignette for depth
      const vg = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)/1.2);
      vg.addColorStop(0,'rgba(0,0,0,0)');
      vg.addColorStop(1,'rgba(0,0,0,0.5)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

      // draw sources (left) — minimal small dots
      for(const s of sources){
        drawCircle(s.x, s.y, s.r, 'rgba(255,255,255,0.08)');
      }

      // spawn new particles occasionally and only up to max
      if(particles.length < maxParticles && Math.random() < spawnChance){
        const src = sources[Math.floor(Math.random()*sources.length)];
        particles.push({
          x: src.x + (Math.random()*4 - 2),
          y: src.y + (Math.random()*4 - 2),
          tx: centerX + (Math.random()*26 - 13),
          ty: midY + (Math.random()*26 - 13),
          vx: 0,
          vy: 0,
          life: 0,
          color: Math.random() < 0.06 ? 'rgba(160,255,170,1)' : 'rgba(255,255,255,1)'
        });
      }

      // draw center AI node (aggregate circle)
      // shadow halo
      const halo = ctx.createRadialGradient(centerX, midY, 0, centerX, midY, 90);
      halo.addColorStop(0, 'rgba(88,166,255,0.06)');
      halo.addColorStop(1, 'rgba(88,166,255,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(centerX, midY, 90, 0, Math.PI*2); ctx.fill();

      // center core
      drawCircle(centerX, midY, 24, 'rgba(255,255,255,0.04)');
      drawCircle(centerX, midY, 8, 'rgba(255,255,255,0.9)');

      // update particles: approach center, then move from center to right as grouped flow
      for(let i = particles.length - 1; i >= 0; i--){
        const p = particles[i];

        // if not reached center yet -> move toward center
        const dx = p.tx - p.x, dy = p.ty - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;

        if(!p.reached){
          const speed = 60 * (0.5 + Math.random()*0.8); // px/sec
          p.vx = (dx / dist) * speed * dt;
          p.vy = (dy / dist) * speed * dt;
          p.x += p.vx; p.y += p.vy;
          p.life += dt;

          // show subtle trail (short)
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 1;
          ctx.moveTo(p.x - p.vx*2, p.y - p.vy*2);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();

          // draw particle head
          drawCircle(p.x, p.y, 1.8, p.color);

          // if near center, mark as reached and schedule to move to right aggregated
          if(dist < 8 || p.life > 3){ // safety
            p.reached = true;
            // generate an aggregated parcel that will move to the right
            aggregation.push({
              x: centerX + (Math.random()*36 - 18),
              y: midY + (Math.random()*36 - 18),
              tx: rightX - 36,
              ty: midY + (Math.random()*10 - 5),
              progress: 0,
              size: 12 + Math.random()*8,
              color: p.color
            });
            // remove particle
            particles.splice(i,1);
          }
        }
      }

      // update aggregation parcels: move from center to right and cluster visually into a stream
      for(let j = aggregation.length - 1; j >= 0; j--){
        const a = aggregation[j];
        // ease movement
        a.progress += 0.01 + Math.random()*0.01;
        // lerp
        const nx = a.x + (a.tx - a.x) * a.progress;
        const ny = a.y + (a.ty - a.y) * a.progress;

        // draw a smooth rounded rectangle to indicate a grouped parcel (minimal)
        ctx.fillStyle = a.color === 'rgba(160,255,170,1)' ? 'rgba(160,255,170,0.95)' : 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        const w = Math.max(8, a.size * (0.8 + a.progress*0.6));
        const h = Math.max(6, a.size * 0.5);
        ctx.roundRect(nx - w/2, ny - h/2, w, h, 4);
        ctx.fill();

        // faint trailing line
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath(); ctx.moveTo(centerX, midY); ctx.lineTo(nx, ny); ctx.stroke();

        // when done moving, shrink into final stack on right area
        if(a.progress >= 1){
          // small jitter to create stacking visual
          a.done = true;
          // nudge into a final grid location
          a.finalX = a.tx - Math.random()*18;
          a.finalY = a.ty + Math.random()*12;
          // keep it in place for a while then slowly fade (to avoid infinite memory growth)
          a.ttl = 4 + Math.random()*6;
        }

        // if done and ttl exists, draw final smaller dot and decrease ttl
        if(a.done){
          drawCircle(a.finalX, a.finalY, 2.6, a.color);
          a.ttl -= dt;
          if(a.ttl <= 0) aggregation.splice(j,1);
        }
      }

      // draw final salesperson node on right (clean avatar minimal)
      drawCircle(rightX, midY, 10, 'rgba(255,255,255,0.06)');
      drawCircle(rightX, midY, 4, 'rgba(255,255,255,0.9)');

      // subtle connecting line between center and right to emphasize logical flow
      ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
      ctx.moveTo(centerX + 24, midY); ctx.lineTo(rightX - 24, midY); ctx.stroke();

      requestAnimationFrame(step);
    }

    // small polyfill for roundRect if not present
    if(!CanvasRenderingContext2D.prototype.roundRect){
      CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
        if(typeof r==='undefined') r=6;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
      };
    }

    // initial call
    requestAnimationFrame(step);

    // wire CTA (you control action; default does nothing or you can open Calendly)
    if(cta) cta.addEventListener('click', ()=> {
      // default behaviour — scroll to contact section or open calendly if you set it
      // window.open('https://calendly.com/your-link', '_blank');
      document.getElementById('ai') && document.getElementById('ai').scrollIntoView({behavior:'smooth'});
    });

    // responsive: recompute sizes on resize
    window.addEventListener('resize', () => {
      W = canvas.clientWidth; H = canvas.clientHeight;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    });
  }

  // expose
  if(!window.initHeroFlow) window.initHeroFlow = initHeroFlow;
  // auto-init after small delay
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(initHeroFlow, 90);
  } else {
    document.addEventListener('DOMContentLoaded', ()=> setTimeout(initHeroFlow, 90));
  }
})();
