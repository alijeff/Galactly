/* js/cluster.js — HIGHER QUALITY rendering (replace file) */

(function(){
  const canvas = document.getElementById('clusterCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let W, H, dpr = Math.max(1, window.devicePixelRatio || 1);
  let angleX = 0.38, angleY = 0, dragging=false, lastX=0, lastY=0;
  let current = 'manager';
  const clusters = {
    manager: { count:180, sizeRange:[1.2,3.2], speed:0.002, cohesion:0.93, greenChance:0.02 },
    acq:     { count:260, sizeRange:[1.0,3.0], speed:0.004, cohesion:0.78, greenChance:0.06 },
    ret:     { count:120, sizeRange:[1.8,3.8], speed:0.0016, cohesion:0.96, greenChance:0.01 }
  };
  let points = [];

  function resize(){
    // high-DPI scaling for crispness
    dpr = Math.max(1, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing operations
    initPoints();
  }

  function initPoints(){
    points = [];
    const cfg = clusters[current];
    for(let i=0;i<cfg.count;i++){
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 150 + (Math.random()*44);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const green = Math.random() < cfg.greenChance;
      points.push({
        x,y,z,
        size: cfg.sizeRange[0] + Math.random()*(cfg.sizeRange[1]-cfg.sizeRange[0]),
        color: green ? '#9fffbf' : '#ffffff',
        baseR: r,
        wobble: Math.random()*0.6
      });
    }
  }

  function project(pt, rx, ry){
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    let x = pt.x * cosY - pt.z * sinY;
    let z = pt.x * sinY + pt.z * cosY;
    let y = pt.y * cosX - z * sinX;
    z = pt.y * sinX + z * cosX;
    const zoom = 950;
    const scale = zoom / (zoom + z + 260);
    const sx = (W / 2) + x * scale;
    const sy = (H / 2) + y * scale;
    return { sx, sy, scale, z };
  }

  function drawGlow(x,y,r,color,alpha){
    const g = ctx.createRadialGradient(x,y,0,x,y,r*3);
    g.addColorStop(0, color.replace('1)', `${alpha})`));
    g.addColorStop(0.4, color.replace('1)', `${Math.max(alpha*0.35, 0.06)})`));
    g.addColorStop(1, color.replace('1)', '0)'));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  function draw(){
    // clear using transparent fill to preserve crispness
    ctx.clearRect(0,0,W,H);

    // soft vignette
    const vg = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)/1.2);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.6)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

    const projected = points.map(p => ({ p, pr: project(p, angleX, angleY) }));
    projected.sort((a,b)=> a.pr.scale - b.pr.scale);

    // faint links
    for(let i=0;i<projected.length;i++){
      const A = projected[i];
      for(let j=i+1;j<i+5 && j<projected.length;j++){
        const B = projected[j];
        const dx = A.pr.sx - B.pr.sx, dy = A.pr.sy - B.pr.sy;
        const d2 = dx*dx + dy*dy;
        if (d2 < 7000){
          ctx.strokeStyle = `rgba(255,255,255,${0.012 + Math.min(0.06, (7000 - d2)/7000 * 0.06)})`;
          ctx.lineWidth = Math.max(0.5, 0.9 * A.pr.scale);
          ctx.beginPath(); ctx.moveTo(A.pr.sx, A.pr.sy); ctx.lineTo(B.pr.sx, B.pr.sy); ctx.stroke();
        }
      }
    }

    // nodes with higher-quality radial gradients
    for(const item of projected){
      const p = item.p, pr = item.pr;
      const alpha = 0.54 * pr.scale;
      const r = Math.max(0.9, p.size * pr.scale * 1.5);
      // use RGBA center color and draw glow
      if(p.color !== '#ffffff'){
        // greenish
        drawGlow(pr.sx, pr.sy, r, 'rgba(143,255,176,1)', alpha*0.9);
      } else {
        drawGlow(pr.sx, pr.sy, r, 'rgba(255,255,255,1)', alpha);
      }
      // crisp center dot
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.arc(pr.sx, pr.sy, Math.max(0.6, r*0.25), 0, Math.PI*2);
      ctx.fill();
    }

    // gentle motion + cohesion
    const cfg = clusters[current];
    for(const p of points){
      // slower, smoother wander using sinusoidal wobble for natural motion
      p.x += Math.sin(perfTime() * 0.001 + p.wobble) * cfg.speed * 2.4 + (Math.random()-0.5) * cfg.speed * 10;
      p.y += Math.cos(perfTime() * 0.0015 + p.wobble) * cfg.speed * 2.2 + (Math.random()-0.5) * cfg.speed * 10;
      p.z += (Math.random()-0.5) * cfg.speed * 10;
      const dist = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) || 1;
      const desired = p.baseR;
      p.x += (p.x / dist) * (desired - dist) * 0.0009 * (cfg.cohesion*3);
      p.y += (p.y / dist) * (desired - dist) * 0.0009 * (cfg.cohesion*3);
      p.z += (p.z / dist) * (desired - dist) * 0.0009 * (cfg.cohesion*3);
    }

    requestAnimationFrame(draw);
  }

  function perfTime(){ return (typeof performance !== 'undefined') ? performance.now() : Date.now(); }

  // drag rotate
  canvas.addEventListener('pointerdown', function(e){ dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function(e){ if(!dragging) return; const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; angleY += dx * 0.008; angleX += dy * 0.006; });
  function release(e){ dragging = false; try{ canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId);}catch(err){} }
  ['pointerup','pointercancel','pointerleave'].forEach(ev => canvas.addEventListener(ev, release));

  // dept switching
  window.addEventListener('gg:dept-change', (ev) => {
    const key = ev.detail && ev.detail.key;
    if(key && clusters[key]){ current = key; initPoints(); }
  });

  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=> {
      const k = t.dataset.key; if(k && clusters[k]){ current = k; initPoints(); }
    });
  });

  // idle rotation
  (function idle(){ angleY += 0.0008; requestAnimationFrame(idle); })();

  window.addEventListener('resize', resize);
  resize();
  draw();

})();
