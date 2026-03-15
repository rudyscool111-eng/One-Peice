// Shared game engine library for per-game HTML pages
console.log('game-engines.js v1.1 loaded');
let gameScore = 0;

function setScore(value) {
  gameScore = value;
  const scoreEl = document.getElementById('scoreDisplay');
  if (scoreEl) scoreEl.textContent = value;
}

function registerScore(gameId, score) {
  const best = Number(localStorage.getItem('bestScore_' + gameId) || 0);
  if (score > best) {
    localStorage.setItem('bestScore_' + gameId, score);
    const bestEl = document.getElementById('bestScore');
    if (bestEl) bestEl.textContent = score;
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'scoreUpdate', gameId, score }, '*');
  }
}

function beep(freq = 440, dur = 0.05, vol = 0.12) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
    osc.onended = () => gain.disconnect();
  } catch (e) {
    // audio may be unavailable in some contexts
  }
}

function startGameEngine(game) {
  const area = document.getElementById('gameArea');
  if (!area) return;
  area.innerHTML = '';
  setScore(0);
  const engine = gameEngines[game.engine] || gameEngines.generic;
  if (!engine) {
    area.innerHTML = '<div style="color:#f6615e; padding:14px;">No engine found for this game.</div>';
    return;
  }
  try {
    engine(area, game);
  } catch (e) {
    console.error('engine execution error', game.id, e);
    area.innerHTML = '<div style="color:#f6615e; padding:14px;">Game crashed. Try another game.</div>';
  }
}

function loadBestScore(gameId) {
  const bestEl = document.getElementById('bestScore');
  if (!bestEl) return;
  const best = Number(localStorage.getItem('bestScore_' + gameId) || 0);
  bestEl.textContent = best;
}

function initSharedGamePage(game) {
  if (!game) game = { title: 'Game Menu', id: 'menu', engine: 'menu' };
  document.title = game.title + ' - Arcade Hub';
  const heading = document.getElementById('gameTitle');
  if (heading) heading.textContent = game.title;
  loadBestScore(game.id);
  const btnBack = document.getElementById('backButton');
  if (btnBack) btnBack.onclick = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'closeModal' }, '*');
    }
  };
  setTimeout(() => startGameEngine(game), 100);
}

const gameEngines = {
  menu: (area, game) => {
    const h = document.createElement('h2'); h.textContent = 'Game Library'; h.style.cssText = 'color:#fff; margin:0 0 15px 0; font-weight:normal; font-size:1.4rem;'; area.appendChild(h);
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px;';
    Object.keys(gameEngines).sort().forEach(k => {
      if (k === 'menu' || k === 'generic') return;
      const btn = document.createElement('button'); btn.textContent = k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
      btn.style.cssText = 'padding:14px 8px; background:#111930; color:#b0c7ff; border:1px solid rgba(138,76,255,0.3); border-radius:6px; cursor:pointer; transition:all 0.2s; font-size:0.9rem;';
      btn.onmouseover = () => { btn.style.background = '#203a70'; btn.style.borderColor = '#8a4cff'; };
      btn.onmouseout = () => { btn.style.background = '#111930'; btn.style.borderColor = 'rgba(138,76,255,0.3)'; };
      btn.onclick = () => { startGameEngine({ id: k, engine: k, title: k }); const b = document.getElementById('backButton'); if(b) b.onclick = () => startGameEngine({engine:'menu'}); };
      grid.appendChild(btn);
    });
    area.appendChild(grid);
  },
  generic: (area, game) => {
    const msg = document.createElement('div'); msg.style.padding = '14px'; msg.innerHTML = `<p>Quick challenge: tap the button fast for 12 seconds.</p>`;
    const button = document.createElement('button'); button.textContent = 'Tap me!'; button.style.cssText = 'padding:10px 18px; font-size:1rem; margin-top:12px;';
    area.appendChild(msg); area.appendChild(button);
    let count = 0; let time = 12;
    const timer = document.createElement('div'); timer.textContent = `Time: ${time}`; timer.style.marginTop='10px'; area.appendChild(timer);
    const id = setInterval(()=>{ time--; timer.textContent=`Time: ${time}`; if(time<=0){ clearInterval(id); button.disabled=true; registerScore(game.id, count); } }, 1000);
    button.onclick = () => { count++; beep(700,0.03); setScore(count); };
  },
  snake: (area, game) => {
    const dims={cols:20,rows:20,size:18}; area.style.position='relative'; const canvas=document.createElement('canvas'); canvas.width=dims.cols*dims.size; canvas.height=dims.rows*dims.size; canvas.style.background='#030716'; canvas.style.border='1px solid rgba(255,255,255,0.12)'; area.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    let snake=[{x:10,y:10}]; let dir={x:1,y:0}; let apple=randCell(); let speed=160; let running=true; let ticks=0;
    function randCell(){ return {x:Math.floor(Math.random()*dims.cols), y:Math.floor(Math.random()*dims.rows)}; }
    function draw(){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#262f55'; ctx.fillRect(0,0,canvas.width,canvas.height); snake.forEach((p,i)=>{ ctx.fillStyle=i===0?'#7d4cff':'#a39fff'; ctx.fillRect(p.x*dims.size+1,p.y*dims.size+1,dims.size-2,dims.size-2); }); ctx.fillStyle='#29f2ff'; ctx.fillRect(apple.x*dims.size+3,apple.y*dims.size+3,dims.size-6,dims.size-6); }
    function step(){ if(!running) return; const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y}; if(head.x<0||head.x>=dims.cols||head.y<0||head.y>=dims.rows||snake.some(p=>p.x===head.x&&p.y===head.y)){ registerScore(game.id, gameScore); return; }
      snake.unshift(head); if(head.x===apple.x && head.y===apple.y){ apple=randCell(); while(snake.some(p=>p.x===apple.x&&p.y===apple.y)) apple=randCell(); beep(900,0.04); setScore(++gameScore); } else snake.pop(); draw(); }
    function loop(){ step(); }
    const interval=setInterval(loop, speed);
    document.addEventListener('keydown', keyHandler);
    function keyHandler(e){ if(e.key==='ArrowUp'&&dir.y===0) dir={x:0,y:-1}; if(e.key==='ArrowDown'&&dir.y===0) dir={x:0,y:1}; if(e.key==='ArrowLeft'&&dir.x===0) dir={x:-1,y:0}; if(e.key==='ArrowRight'&&dir.x===0) dir={x:1,y:0}; }
    draw();
  },
  pong: (area, game) => {
    const c=document.createElement('canvas'); const W=340,H=220; c.width=W; c.height=H; c.style.background='#020618'; c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d');
    let paddleY=H/2-25, aiY=H/2-25, ball={x:W/2,y:H/2,vx:3,vy:2}; let score=0; const fps=60;
    function draw() { ctx.clearRect(0,0,W,H); ctx.fillStyle='#120f2e'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#85a3ff'; ctx.fillRect(10,paddleY,6,50); ctx.fillRect(W-16,aiY,6,50); ctx.fillStyle='#2ae5ff'; ctx.beginPath(); ctx.arc(ball.x,ball.y,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#8a4cff'; ctx.fillText(`Score ${score}`, W/2-24, 18); }
    function step(){ ball.x += ball.vx; ball.y += ball.vy; if(ball.y<8||ball.y>H-8) ball.vy=-ball.vy; const speed=2.6; if(ball.x<20 && ball.y>paddleY && ball.y<paddleY+50){ ball.vx=-ball.vx; score++; setScore(score); beep(700,0.015); } if(ball.x>W-20 && ball.y>aiY && ball.y<aiY+50){ ball.vx=-ball.vx } aiY += (ball.y-aiY-25)*0.05; if(ball.x<4||ball.x>W-4){ registerScore(game.id, score); end(); } draw(); }
    function end(){ clearInterval(timer); area.innerHTML += '<div style="color:#b1b4ff;font-size:0.85rem;margin-top:6px;">Game Over</div>'; }
    c.onmousemove = (e)=>{ const r=c.getBoundingClientRect(); paddleY = Math.min(Math.max(0, e.clientY-r.top-25), H-50); };
    const timer=setInterval(step,1000/fps);
  },
  breakout: (area, game)=>{ const c=document.createElement('canvas'); c.width=340;c.height=240;c.style.border='1px solid rgba(138,76,255,0.4)'; c.style.background='#020615'; area.appendChild(c); const ctx=c.getContext('2d'); const cols=8, rows=4; let bricks=[]; let ball={x:170,y:180,vx:2,vy:-3}; let paddle={x:140,y:220,w:60,h:10}; let score=0;
        for(let y=0;y<rows;y++){ for(let x=0;x<cols;x++) bricks.push({x: x*40+22,y: y*18+30,alive:true}); }
        function draw(){ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#000f27';ctx.fillRect(0,0,c.width,c.height); bricks.forEach(b=>{ if(b.alive){ctx.fillStyle=`rgba(138,76,255,${0.7})`;ctx.fillRect(b.x,b.y,34,12);} }); ctx.fillStyle='#56cffe'; ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h); ctx.fillStyle='#ffec64'; ctx.beginPath(); ctx.arc(ball.x,ball.y,6,0,Math.PI*2);ctx.fill(); ctx.fillStyle='#e5e8ff'; ctx.fillText('Score: '+score, 10, 14); }
        function step(){ ball.x += ball.vx; ball.y += ball.vy; if(ball.x<6||ball.x>c.width-6){ ball.vx *=-1; } if(ball.y<6) ball.vy*=-1; if(ball.y>c.height-8){ registerScore(game.id, score); gameOver(); } if(ball.x>paddle.x && ball.x<paddle.x+paddle.w && ball.y > paddle.y-6){ ball.vy=-Math.abs(ball.vy); }
          for(const b of bricks){ if(b.alive && ball.x>b.x && ball.x<b.x+34 && ball.y>b.y && ball.y<b.y+12){ b.alive=false; ball.vy=-ball.vy; score++; setScore(score); beep(780,0.01); } }
          if(bricks.every(b=>!b.alive)){ registerScore(game.id, score); gameWin(); }
          draw(); }
        c.onmousemove=(e)=>{ const r=c.getBoundingClientRect(); paddle.x = Math.min(c.width-paddle.w, Math.max(0,e.clientX-r.left-paddle.w/2)); };
        const it=setInterval(step,16);
        function gameOver(){ clearInterval(it); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Game Over', style:'color:#ff7d7d;padding-top:8px;'})); }
        function gameWin(){ clearInterval(it); area.appendChild(Object.assign(document.createElement('div'),{textContent:'You Won!', style:'color:#7dff9e;padding-top:8px;'})); }
      },
  spaceInvaders: (area, game)=>{ const c=document.createElement('canvas'); c.width=360;c.height=260;c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:c.width/2-15,y:230,w:30,h:12}; let aliens=[]; let shots=[]; let alienDirection=1; let score=0; let alive=true; for(let row=0;row<3;row++){ for(let col=0;col<8;col++){ aliens.push({x:col*38+34,y:row*30+20,alive:true}); }}
        function draw(){ctx.fillStyle='#020719';ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#80f2ff';ctx.fillRect(player.x,player.y,player.w,player.h); for(const a of aliens){ if(a.alive){ctx.fillStyle='#d5adff';ctx.fillRect(a.x,a.y,24,16);} } for(const s of shots){ctx.fillStyle=s.type==='player'?'#41ff9d':'#ff6ccd';ctx.fillRect(s.x,s.y,s.w,s.h);} ctx.fillStyle='#dbefff'; ctx.fillText('Score: '+score, 10, 14); }
        function step(){ if(!alive) return; if(Math.random()<0.02){ const shooter=aliens.filter(a=>a.alive)[Math.floor(Math.random()*aliens.filter(a=>a.alive).length)]; if(shooter){ shots.push({x:shooter.x+10,y:shooter.y+16,w:4,h:8,type:'alien'}); }}
          const living=aliens.filter(a=>a.alive); if(living.length===0){ registerScore(game.id, score); done('Victory'); return; }
          const maxX=Math.max(...living.map(a=>a.x)), minX=Math.min(...living.map(a=>a.x)); if(maxX>c.width-26||minX<10){ alienDirection*=-1; living.forEach(a=>a.y+=12); }
          living.forEach(a=>a.x+=alienDirection*1.4);
          shots.forEach(s=>{ s.y += s.type==='player'?-4:4; }); shots=shots.filter(s=>s.y>-20 && s.y<c.height+20);
          shots.forEach((s,i)=>{ if(s.type==='player'){ const hit=aliens.find(a=>a.alive&&s.x>a.x&&s.x<a.x+24&&s.y>a.y&&s.y<a.y+16); if(hit){ hit.alive=false; score+=12; setScore(score); beep(940,0.02); shots.splice(i,1); }} else { if(s.x>player.x && s.x<player.x+player.w && s.y>player.y && s.y<player.y+player.h){ alive=false; registerScore(game.id, score); done('Defeat'); }}; });
          draw(); }
        function done(txt){ clearInterval(t); area.appendChild(Object.assign(document.createElement('div'),{textContent: txt, style:'color:#ffd76f; margin-top:8px;'})); }
        let t=setInterval(step,20); document.addEventListener('mousemove',e=>{ const r=c.getBoundingClientRect(); player.x=Math.min(Math.max(0, e.clientX-r.left-player.w/2), c.width-player.w); });
      },
  asteroids: (area, game)=>{ const c=document.createElement('canvas'); c.width=360;c.height=260;c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let ship={x:c.width/2,y:c.height/2,a:0}; let bullets=[]; let asteroids=[]; let score=0; let alive=true;
        for(let i=0;i<5;i++) asteroids.push({x:Math.random()*c.width,y:Math.random()*c.height,r:20,dx:(Math.random()*2-1),dy:(Math.random()*2-1)});
        document.addEventListener('keydown',keyHandler);
        function keyHandler(e){ if(e.key==='ArrowLeft') ship.a-=0.2; if(e.key==='ArrowRight') ship.a+=0.2; if(e.key==='ArrowUp'){ ship.x += Math.cos(ship.a)*6; ship.y += Math.sin(ship.a)*6; } if(e.key===' ') bullets.push({x:ship.x, y:ship.y, dx:Math.cos(ship.a)*5, dy:Math.sin(ship.a)*5}); }
        function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
        function draw(){ ctx.fillStyle='#020718'; ctx.fillRect(0,0,c.width,c.height); asteroids.forEach(a=>{ ctx.strokeStyle='#8ad6ff'; ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,Math.PI*2); ctx.stroke(); }); bullets.forEach(b=>{ ctx.fillStyle='#ffd968'; ctx.fillRect(b.x,b.y,3,3); }); ctx.save(); ctx.translate(ship.x,ship.y); ctx.rotate(ship.a); ctx.strokeStyle='#e3e8ff'; ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-8,7); ctx.lineTo(-8,-7); ctx.closePath(); ctx.stroke(); ctx.restore(); ctx.fillStyle='#d0ecff'; ctx.fillText('Score: '+score,8,14); }
        function step(){ if(!alive) return; ship.x=(ship.x+c.width)%c.width; ship.y=(ship.y+c.height)%c.height; asteroids.forEach(a=>{ a.x=(a.x+a.dx+c.width)%c.width; a.y=(a.y+a.dy+c.height)%c.height; }); bullets.forEach((b,i)=>{ b.x+=b.dx; b.y+=b.dy; if(b.x<0||b.x>c.width||b.y<0||b.y>c.height) bullets.splice(i,1); }); asteroids.forEach((a,i)=>{ bullets.forEach((b,j)=>{ if(Math.hypot(b.x-a.x,b.y-a.y)<a.r){ score+=8; setScore(score); beep(900,0.02); bullets.splice(j,1); asteroids.splice(i,1); asteroids.push({x:Math.random()*c.width,y:Math.random()*c.height,r:18,dx:(Math.random()*2-1),dy:(Math.random()*2-1)}); }}); if(dist(a,ship)<a.r+6){ alive=false; registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Crash!', style:'color:#ff6a6a;margin-top:9px;'})); } }); draw(); }
        setInterval(step,20);
      },
  pacman: (area, game)=>{ const c=document.createElement('canvas'); c.width=330;c.height=300;c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); const map=[
        '1111111111111','1...........1','1.111.11111.1','1.1.......1.1','1.1.1.1.1.1.1','1...1...1...1','1111111111111'
      ]; const cell=24; let dots=[]; let player={x:2*cell,y:1*cell,dx:0,dy:0}; let ghosts=[{x:5*cell,y:3*cell,dx:0,dy:0}]; let score=0;
      for(let ry=0;ry<map.length;ry++) for(let rx=0;rx<map[ry].length;rx++) if(map[ry][rx]==='.') dots.push({x:rx*cell+cell/2,y:ry*cell+cell/2});
      function draw(){ ctx.fillStyle='#03061b'; ctx.fillRect(0,0,c.width,c.height); for(let ry=0;ry<map.length;ry++){ for(let rx=0;rx<map[ry].length;rx++){ if(map[ry][rx]==='1'){ctx.fillStyle='#4869a4';ctx.fillRect(rx*cell,ry*cell,cell,cell);} }} dots.forEach(d=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(d.x,d.y,3,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#ffe04f'; ctx.beginPath(); ctx.arc(player.x+cell/2,player.y+cell/2,cell/3,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#d2f4ff'; ctx.fillText('Score: '+score, 12, 14); }
      function can(x,y){ const col=Math.floor(x/cell), row=Math.floor(y/cell); return map[row] && map[row][col]!== '1'; }
      function step(){ if(can(player.x+player.dx, player.y+player.dy)){ player.x += player.dx; player.y += player.dy; } dots = dots.filter(d=>{ if(Math.hypot((d.x-(player.x+cell/2)), (d.y-(player.y+cell/2)))<9){ score+=5; setScore(score); beep(740,0.02); return false; } return true; }); if(dots.length===0){ registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'All cleared!', style:'color:#7affb6;margin-top:8px;'})); clearInterval(t); }
        ghosts.forEach(g=>{ const dx=player.x-g.x, dy=player.y-g.y; const mag=Math.hypot(dx,dy); g.dx = mag? (dx/mag):0; g.dy = mag? (dy/mag):0; g.x += g.dx*1.1; g.y += g.dy*1.1; if(Math.hypot((g.x-player.x),(g.y-player.y))<cell/1.3){ registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Caught by ghost!', style:'color:#ff7a7a;margin-top:8px;'})); clearInterval(t); }}); draw(); }
      document.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft'){player.dx=-cell/8;player.dy=0;} if(e.key==='ArrowRight'){player.dx=cell/8;player.dy=0;} if(e.key==='ArrowUp'){player.dy=-cell/8;player.dx=0;} if(e.key==='ArrowDown'){player.dy=cell/8;player.dx=0;} });
      const t=setInterval(step,120);
    },
  ticTacToe: (area,game)=>{ const grid = Array(9).fill(null); let turn='X'; let winner=null; const cont=document.createElement('div'); cont.style.display='grid'; cont.style.gridTemplateColumns='repeat(3,80px)'; cont.style.gap='8px'; for(let i=0;i<9;i++){ const b=document.createElement('button'); b.style.cssText='width:80px;height:80px;background:rgba(8,13,25,0.8);color:#eaf1ff;font-size:1.7rem;border:1px solid rgba(138,76,255,0.25);'; b.onclick=()=>{ if(grid[i]||winner) return; grid[i]=turn; b.textContent=turn; beep(760,0.02); if(checkWin(turn)){ winner=turn; setScore(100); registerScore(game.id,100); showMessage(turn+' wins!'); } else if(grid.every(v=>v)){ winner='draw'; showMessage('Draw'); } else{ turn=turn==='X'?'O':'X'; aiMove(); }}; cont.appendChild(b);} function aiMove(){ const empties=grid.map((v,i)=>v===null?i:-1).filter(v=>v>=0); if(!empties.length||winner)return; const idx=empties[Math.floor(Math.random()*empties.length)]; grid[idx]='O'; cont.children[idx].textContent='O'; if(checkWin('O')){ winner='O'; showMessage('AI wins'); } }
      const msg=document.createElement('div'); msg.style.marginTop='10px'; area.appendChild(cont); area.appendChild(msg); function showMessage(text){ msg.textContent=text; }
      function checkWin(s){ return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(([a,b,c])=>grid[a]===s&&grid[b]===s&&grid[c]===s); }
    },
  hangman: (area,game)=>{ const words=['NEON','HUB','GAMER','PIXEL','CODER','JAVASCRIPT','ARCHIVE']; const word=words[Math.floor(Math.random()*words.length)]; let guessed=[]; let lives=7;
      const display=document.createElement('div'); const buttons=document.createElement('div'); display.style.marginBottom='8px'; for(let i=0;i<26;i++){ const letter=String.fromCharCode(65+i); const btn=document.createElement('button'); btn.textContent=letter; btn.style='margin:2px 2px 2px 0;padding:5px 7px;background:#1a2552;color:#d2e0ff;border:1px solid #506ab8;cursor:pointer;'; btn.onclick=()=>{ if(guessed.includes(letter)||lives===0)return; guessed.push(letter); btn.disabled=true; if(!word.includes(letter)){ lives--; beep(320,0.08); } else beep(820,0.02); render(); }; buttons.appendChild(btn);} area.appendChild(display); area.appendChild(buttons); const status=document.createElement('div'); status.style.marginTop='8px'; area.appendChild(status);
      function render(){ display.textContent = word.split('').map(ch=>guessed.includes(ch)?ch:'_').join(' '); status.textContent = `Lives: ${lives}`; if(!display.textContent.includes('_')){ status.textContent='You win!'; setScore(100); registerScore(game.id,100);} if(lives===0){ status.textContent='Game over. Word '+word; }} render(); },
  memoryMatch: (area,game)=>{ const items=['🍎','🍌','🍇','🍒','🥝']; const grid=[...items,...items].sort(()=>Math.random()-0.5); let selected=[]; let matched=[]; let moves=0;
        const board=document.createElement('div'); board.style.display='grid'; board.style.gridTemplateColumns='repeat(5,60px)'; board.style.gridGap='8px'; const res=document.createElement('div'); area.appendChild(res); area.appendChild(board);
        grid.forEach((symbol,i)=>{ const card=document.createElement('button'); card.style='width:60px;height:60px;font-size:1.5rem;background:#15223f;color:#15223f;border:1px solid rgba(138,76,255,0.3);'; card.onclick=()=>{ if(selected.length===2||matched.includes(i)||selected.includes(i)) return; selected.push(i); card.textContent=symbol; card.style.color='#fff'; if(selected.length===2){ moves++; if(grid[selected[0]]===grid[selected[1]]){ matched.push(...selected); beep(740,0.03); if(matched.length===grid.length){ setScore(200); registerScore(game.id,200); } } else { setTimeout(()=>{ [selected[0],selected[1]].forEach(idx=>{ board.children[idx].textContent=''; board.children[idx].style.color='#15223f'; }); },500); } selected=[]; } }; board.appendChild(card); }); },
  wordScramble: (area,game)=>{ const words=['NEON','ARCADE','VIBES','GALAXY','PLANET']; const word=words[Math.floor(Math.random()*words.length)]; const scrambled=word.split('').sort(()=>Math.random()-0.5).join(''); area.innerHTML=`<div style="margin-bottom:10px;">Unscramble: <strong>${scrambled}</strong></div>`;
          const input=document.createElement('input'); input.type='text'; input.maxLength=word.length; input.style='padding:8px; border-radius:8px;border:1px solid rgba(138,76,255,0.45); width:150px; margin-right:10px; color:#fff; background:#0a1226;';
          const btn=document.createElement('button'); btn.textContent='Guess'; btn.style='padding:8px 10px;'; const info=document.createElement('div'); info.style.marginTop='8px'; btn.onclick=()=>{ const v=input.value.toUpperCase(); if(v===word){ info.textContent='Correct!'; setScore(120); registerScore(game.id,120); } else{ info.textContent='Try again!'; beep(330,0.05);} }; area.appendChild(input); area.appendChild(btn); area.appendChild(info);
      },
  numberGuessing: (area,game)=>{ const target=Math.floor(Math.random()*40)+1; let tries=0; const output=document.createElement('div'); const input=document.createElement('input'); input.type='number'; input.min=1; input.max=40; input.style='padding:8px 8px; margin-right:5px;'; const btn=document.createElement('button'); btn.textContent='Guess'; btn.onclick=()=>{ const val=Number(input.value); if(!val) return; tries++; if(val===target){ output.textContent='Correct in '+tries+' tries'; setScore(100-tries*3); registerScore(game.id,Math.max(0,100-tries*3)); } else if(val<target){ output.textContent='Higher'; } else output.textContent='Lower'; }; area.appendChild(document.createElement('div')).textContent='Guess a number 1-40'; area.appendChild(input); area.appendChild(btn); area.appendChild(output); },
  sudokuMini: (area,game)=>{ const grid=[[1,0,3,0],[0,3,0,1],[0,1,0,4],[3,0,2,0]]; const container=document.createElement('div'); container.style.display='grid'; container.style.gridTemplateColumns='repeat(4,40px)'; container.style.gridGap='3px'; let selected=Array.from({length:16},(_,i)=>null);
        for(let i=0;i<16;i++){ const r=Math.floor(i/4), c=i%4; const cell=document.createElement('input'); cell.style='width:40px;height:40px;text-align:center;background:#0a1226;color:#dcebf1;border:1px solid rgba(138,76,255,0.35);'; cell.maxLength=1; if(grid[r][c]){ cell.value=grid[r][c]; cell.disabled=true; } else{ cell.oninput=()=>{ if(/[1-4]/.test(cell.value)){ selected[i]=Number(cell.value); } else{ cell.value=''; selected[i]=null; } } } container.appendChild(cell); }
        const msg=document.createElement('div'); msg.style='margin-top:10px;'; const solveBtn=document.createElement('button'); solveBtn.textContent='Check'; solveBtn.onclick=()=>{ const entries=[]; const children=container.children; for(let i=0;i<16;i++){ const v=children[i].value; entries.push(v?Number(v):0); } const valid = [
          [1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]
        ]; if(JSON.stringify(entries)==='[1,2,3,4,4,3,2,1,2,1,4,3,3,4,1,2]'){ msg.textContent='Perfect!'; setScore(180); registerScore(game.id,180);} else msg.textContent='Not yet, keep trying.'; };
        area.appendChild(container); area.appendChild(solveBtn); area.appendChild(msg);
      },
  simon: (area,game)=>{ const colors=['red','blue','green','yellow']; let seq=[]; let pos=0; let playing=false; let score=0;
        const panel=document.createElement('div'); panel.style.display='grid'; panel.style.gridTemplateColumns='repeat(2,100px)'; panel.style.gridGap='10px'; const buttons=[];
        colors.forEach(c=>{ const b=document.createElement('button'); b.style=`width:100px;height:100px;background:${c};opacity:0.75;border:2px solid #fff;border-radius:12px;`; b.onclick=()=>{ if(!playing) return; light(c); if(colors[pos]===c){ pos++; if(pos===seq.length){ score+=10; setScore(score); pos=0; nextRound(); }} else{ stop(); } }; buttons.push(b); panel.appendChild(b); });
        function light(c){ const idx=colors.indexOf(c); const b=buttons[idx]; b.style.opacity='1'; setTimeout(()=>b.style.opacity='0.75',180); beep(600+idx*100,0.08); }
        function nextRound(){ seq.push(colors[Math.floor(Math.random()*colors.length)]); playSequence(); }
        function playSequence(){ playing=false; let i=0; const int=setInterval(()=>{ if(i>=seq.length){ clearInterval(int); playing=true; pos=0; return;} light(seq[i]); i++; }, 600); }
        function stop(){ playing=false; area.appendChild(Object.assign(document.createElement('div'),{textContent:'Game over', style:'margin-top:7px;color:#ff8a8a;'})); registerScore(game.id, score); }
        const startBtn=document.createElement('button'); startBtn.textContent='Start'; startBtn.onclick=()=>{seq=[];score=0;setScore(score);nextRound();}; area.appendChild(panel); area.appendChild(startBtn);
      },
  mazeEscape: (area,game)=>{ const w=280,h=260; const c=document.createElement('canvas'); c.width=w; c.height=h; area.appendChild(c); const ctx=c.getContext('2d'); const grid=[
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,1],
        [1,0,1,1,1,0,1,0,1,1],
        [1,0,1,0,0,0,0,0,0,1],
        [1,0,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,1,0,1],
        [1,1,1,1,1,1,0,1,0,1],
        [1,0,0,0,0,1,0,1,0,1],
        [1,0,1,1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1]
      ]; const cell=26; let player={x:1,y:1}; const goal={x:8,y:8}; let score=0;
        function draw(){ ctx.fillStyle='#020417'; ctx.fillRect(0,0,w,h); for(let r=0;r<10;r++) for(let c2=0;c2<10;c2++){ if(grid[r][c2]===1){ ctx.fillStyle='#1b2b58'; ctx.fillRect(c2*cell,r*cell,cell,cell);} }
          ctx.fillStyle='#39ffc4'; ctx.fillRect(goal.x*cell+6,goal.y*cell+6,cell-12,cell-12);
          ctx.fillStyle='#ffec6a'; ctx.fillRect(player.x*cell+6,player.y*cell+6,cell-12,cell-12);
          ctx.fillStyle='#f0f5ff'; ctx.fillText('Steps: '+score, 8, 14); }
        function move(dx,dy){ if(grid[player.y+dy][player.x+dx]===0){ player.x+=dx; player.y+=dy; score++; setScore(score);} if(player.x===goal.x && player.y===goal.y){ registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Escaped!', style:'color:#7cff7f; margin-top:8px;'})); document.removeEventListener('keydown',keyHandler);} draw(); }
        function keyHandler(e){ if(e.key==='ArrowUp') move(0,-1); if(e.key==='ArrowDown') move(0,1); if(e.key==='ArrowLeft') move(-1,0); if(e.key==='ArrowRight') move(1,0); }
        document.addEventListener('keydown',keyHandler); draw();
      },
  slidingPuzzle: (area,game)=>{ const data=[1,2,3,4,5,6,7,8,null].sort(()=>Math.random()-0.5); const board=document.createElement('div'); board.style.display='grid'; board.style.gridTemplateColumns='repeat(3,70px)'; board.style.gridGap='6px'; const msg=document.createElement('div'); let moves=0;
        function draw(){ board.innerHTML=''; data.forEach((v,i)=>{ const btn=document.createElement('button'); btn.style='width:70px;height:70px;font-size:1.2rem;'; if(v) btn.textContent=v; else btn.style.visibility='hidden'; btn.onclick=()=>{ const empty = data.indexOf(null); const row=Math.floor(i/3), prow=Math.floor(empty/3), col=i%3, pcol=empty%3; if(Math.abs(row-prow)+Math.abs(col-pcol)===1){ data[empty]=data[i]; data[i]=null; moves++; setScore(moves); draw(); if(data.join(',')==='1,2,3,4,5,6,7,8,') { msg.textContent='Completed in '+moves+' moves'; registerScore(game.id, Math.max(0,200-moves)); } } }; board.appendChild(btn); }); }
        draw(); area.appendChild(board); area.appendChild(msg);
      },
  flappy: (area,game)=>{ const c=document.createElement('canvas'); c.width=300; c.height=250; c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let bird={x:80,y:120,vy:0}; let pipes=[]; let tick=0; let score=0; let alive=true;
        function draw(){ctx.fillStyle='#020e20';ctx.fillRect(0,0,c.width,c.height);pipes.forEach(p=>{ctx.fillStyle='#2b4278';ctx.fillRect(p.x,0,p.w,p.h);ctx.fillRect(p.x,p.h+p.gap,p.w,c.height);});ctx.fillStyle='#ffda65';ctx.beginPath();ctx.arc(bird.x,bird.y,8,0,Math.PI*2);ctx.fill(); ctx.fillStyle='#dcefff'; ctx.fillText('Score:'+score,10,16);}        
        function step(){ if(!alive) return; bird.vy += 0.3; bird.y += bird.vy; if(bird.y<8||bird.y>c.height-8){ alive=false; registerScore(game.id, score); return; } if(tick%95===0){ const h=60+Math.random()*90; pipes.push({x:c.width,w:30,h, gap:80}); } pipes.forEach((p,i)=>{p.x -=2; if(p.x<-40) pipes.splice(i,1); if(bird.x>p.x && bird.x<p.x+p.w && (bird.y<p.h || bird.y>p.h+p.gap)){ alive=false; registerScore(game.id, score);} if(p.x+ p.w< bird.x && !p.scored){ score++; setScore(score); p.scored=true; } }); draw(); tick++; }
        const int=setInterval(step,20); document.onclick=()=>{ bird.vy=-5; beep(770,0.03); };        
      },
  whackAMole: (area,game)=>{ const grid=document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(3,90px)'; grid.style.gridGap='8px'; let score=0; let hole=-1; const display=document.createElement('div'); for(let i=0;i<9;i++){ const b=document.createElement('button'); b.style='width:90px;height:90px;border-radius:12px;'; b.onclick=()=>{ if(i===hole){ score++; setScore(score); b.style.background='#7fff7a'; beep(850,0.02); hole=-1; } }; grid.appendChild(b);} area.appendChild(display); area.appendChild(grid);
        const it=setInterval(()=>{ const buttons=grid.children; if(hole>=0) buttons[hole].style.background=''; hole=Math.floor(Math.random()*9); buttons[hole].style.background='#ff7171'; },800);
      },
  reactionTester: (area,game)=>{ const msg=document.createElement('div'); msg.textContent='Wait for green...'; msg.style.marginBottom='10px'; const btn=document.createElement('button'); btn.textContent='Wait'; btn.style.padding='10px 16px'; let start=0, ready=false; area.appendChild(msg); area.appendChild(btn);
        function reset(){ ready=false; btn.textContent='Wait'; btn.disabled=true; msg.textContent='Get ready...'; setTimeout(()=>{ ready=true; btn.textContent='Click!'; btn.disabled=false; start=Date.now(); msg.textContent='GO!'; }, 1000+Math.random()*2000); }
        btn.onclick=()=>{ if(!ready){ msg.textContent='Too soon!'; return; } const time=Date.now()-start; msg.textContent=`Reaction ${time}ms`; setScore(Math.max(0,500-time)); registerScore(game.id, Math.max(0,500-time)); }; reset(); },
  clickSpeed: (area,game)=>{ const btn=document.createElement('button'); btn.textContent='Click fast!'; btn.style.padding='18px 30px'; let count=0; let time=10; const display=document.createElement('div'); display.textContent='Time: 10'; area.appendChild(display); area.appendChild(btn); const interval=setInterval(()=>{ time--; display.textContent='Time: '+time; if(time<=0){ clearInterval(interval); btn.disabled=true; setScore(count); registerScore(game.id,count); } },1000); btn.onclick=()=>{ count++; setScore(count); display.textContent='Time: '+time+' | Clicks: '+count; beep(650,0.01); }; },
  avoidFalling: (area,game)=>{ const c=document.createElement('canvas'); c.width=300;c.height=250; c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:140,y:230,w:20,h:12}; let obstacles=[]; let score=0; const int=setInterval(()=>{ if(Math.random()<0.2) obstacles.push({x:Math.random()*280,y:-20,w:20,h:20}); obstacles.forEach(o=>o.y+=2.4); obstacles=obstacles.filter(o=>o.y<270); if(obstacles.some(o=>o.x<player.x+player.w && o.x+o.w>player.x && o.y<player.y+player.h && o.y+o.h>player.y)){ clearInterval(int); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Hit! Score '+score,style:'color:#ff9a9a;'})); }
        obstacles.forEach(o=>{ if(o.y>c.height) score++; setScore(score);} ); ctx.fillStyle='#020718'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#2bf'; ctx.fillRect(player.x,player.y,player.w,player.h); ctx.fillStyle='#f65'; obstacles.forEach(o=>ctx.fillRect(o.x,o.y,o.w,o.h)); ctx.fillStyle='#ddf'; ctx.fillText('Score:'+score,10,14); },20);
        area.onmousemove=e=>{ const r=c.getBoundingClientRect(); player.x=Math.max(0,Math.min(c.width-player.w,e.clientX-r.left-player.w/2)); };
      },
  platformJumper: (area,game)=>{ const c=document.createElement('canvas'); c.width=280;c.height=260; c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:120,y:220,vy:0}; let platforms=[{x:60,y:240,w:140}], score=0; const t=setInterval(()=>{ player.vy+=0.25; player.y+=player.vy; if(player.y>c.height){ clearInterval(t); registerScore(game.id,score); }
        if(platforms.some(p=>player.x+10>p.x && player.x+10<p.x+p.w && player.y+12>p.y && player.y+12<p.y+5 && player.vy>0)){ player.vy=-6; score++; setScore(score); beep(700,0.02);} if(player.y<110){ platforms.forEach(p=>p.y+=2); score++; setScore(score);} if(Math.random()<0.01) platforms.push({x:Math.random()*200,y:-6,w:70+Math.random()*70}); platforms=platforms.filter(p=>p.y<290);
        ctx.fillStyle='#02061a'; ctx.fillRect(0,0,c.width,c.height); platforms.forEach(p=>{ctx.fillStyle='#5e78d5';ctx.fillRect(p.x,p.y,p.w,8);}); ctx.fillStyle='#ffdd5f'; ctx.fillRect(player.x,player.y,15,18); ctx.fillStyle='#d7e2ff'; ctx.fillText('Score:'+score,8,14);
      },20); area.onmousemove=e=>{ const r=c.getBoundingClientRect(); player.x=Math.max(0,Math.min(c.width-16,e.clientX-r.left-8)); };
      },
  endlessRunner: (area,game)=>{ const c=document.createElement('canvas'); c.width=330;c.height=200; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:40,y:150,yv:0}; let obstacles=[]; let score=0; const t=setInterval(()=>{ player.yv += 0.4; player.y += player.yv; if(player.y>150){ player.y=150; player.yv=0; } if(Math.random()<0.04) obstacles.push({x:330,y:150,w:16,h:16}); obstacles.forEach(o=>o.x-=3); if(obstacles.some(o=>o.x<player.x+16 && o.x+o.w>player.x && o.y<player.y+20 && o.y+o.h>player.y)){ clearInterval(t); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Game Over '+score,style:'color:#ff8c8c;'})); }
        obstacles=obstacles.filter(o=>o.x> -20); score++; setScore(score); ctx.fillStyle='#06112c'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#7ad7ff'; ctx.fillRect(player.x,player.y,20,20); obstacles.forEach(o=>{ctx.fillStyle='#f85858';ctx.fillRect(o.x,o.y,o.w,o.h);}); ctx.fillStyle='#d9e9ff'; ctx.fillText('Score:'+score,10,16); },20); area.onclick=()=>{ if(player.y===150){ player.yv=-7; beep(820,0.03); } };
      },
  dodgeBullets: (area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=250; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:150,y:210,w:20,h:20}; let bullets=[]; let score=0; const t=setInterval(()=>{ if(Math.random()<0.12) bullets.push({x:Math.random()*300,y:-10,r:4}); bullets.forEach(b=>b.y+=3.5); bullets=bullets.filter(b=>b.y<270); bullets.forEach(b=>{ if(Math.hypot(player.x+10-b.x,player.y+10-b.y)<14){ clearInterval(t); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Hit '+score,style:'color:#ff90b3;'})); }}); score++; setScore(score); ctx.fillStyle='#031225'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#6acdf6'; ctx.fillRect(player.x,player.y,player.w,player.h); bullets.forEach(b=>{ctx.fillStyle='#ffed4f';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#e8f4ff'; ctx.fillText('Score:'+score,10,16); },20); area.onmousemove=e=>{ const r=c.getBoundingClientRect(); player.x=Math.min(Math.max(0,e.clientX-r.left-player.w/2),c.width-player.w); };
      },
  timingBar: (area,game)=>{ const bar=document.createElement('div'); bar.style='width:100%;height:25px;background:#173052;margin:14px 0;position:relative;border-radius:8px;overflow:hidden;'; const fill=document.createElement('div'); fill.style='width:0%;height:100%;background:linear-gradient(90deg,#7afff2,#8e4cff);'; bar.appendChild(fill); const display=document.createElement('div'); display.style.marginTop='10px'; const btn=document.createElement('button'); btn.textContent='Stop';
        const start=Date.now(); const target=40+Math.random()*20; let running=true;
        const it = setInterval(()=>{ if(!running) return; const elapsed=Date.now()-start; const percent=Math.min(100,(elapsed/120)*100); fill.style.width=`${percent}%`; if(percent>=100){ running=false; display.textContent='Time up'; clearInterval(it); } }, 16);
        btn.onclick=()=>{ if(!running) return; running=false; clearInterval(it); const elapsed=Date.now()-start; const percent=Math.min(100,(elapsed/120)*100); const diff=Math.abs(percent*100-target); const score=Math.max(0,120-Math.round(diff)); setScore(score); registerScore(game.id,score); display.textContent=`Target ${Math.round(target)}%, diff ${Math.round(diff)}`; };
        area.appendChild(bar); area.appendChild(btn); area.appendChild(display);
      },
  tapMovingTarget: (area,game)=>{ const target=document.createElement('div'); target.style='width:40px;height:40px;background:#13efff;border-radius:50%;position:absolute;cursor:pointer;'; area.style.position='relative'; area.appendChild(target); let score=0; const move=()=>{ target.style.left=Math.random()*(area.clientWidth-44)+'px'; target.style.top=Math.random()*(area.clientHeight-44)+'px'; }
        target.onclick=()=>{ score++; setScore(score); beep(750,0.02); move(); }; move(); setInterval(()=>{} , 5000); // no-op keep active
      },
  connectFour: (area,game)=>{ const cols=7, rows=6; let grid=Array(rows).fill(null).map(()=>Array(cols).fill('')); let turn='R'; let over=false; const table=document.createElement('div'); table.style='display:grid;grid-template-columns:repeat(7,40px);gap:4px;'; const msg=document.createElement('p'); function draw(){ table.innerHTML=''; for(let r=0;r<rows;r++){ for(let c=0;c<cols;c++){ const cell=document.createElement('div'); cell.style=`width:40px;height:40px;border-radius:50%;background:#0f182f;display:flex;align-items:center;justify-content:center;`; const disc = document.createElement('div'); disc.style=`width:30px;height:30px;border-radius:50%;background:${grid[r][c]||'#122038'};`; cell.appendChild(disc); cell.onclick=()=>{ if(over) return; for(let rr=rows-1;rr>=0;rr--){ if(!grid[rr][c]){ grid[rr][c]=turn; beeee(); if(checkWin(turn)){ msg.textContent=turn+' wins'; over=true; registerScore(game.id,100); } turn=turn==='R'?'Y':'R'; draw(); break; } } }; table.appendChild(cell);} } }
        function beeee(){ beep(680,0.03); }
        function checkWin(p){ const dx=[1,0,1,1],dy=[0,1,1,-1]; for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(grid[r][c]===p) for(let t=0;t<4;t++){ let c2=0; for(;c2<4;c2++){ const nr=r+dy[t]*c2,nc=c+dx[t]*c2; if(nr<0||nr>=rows||nc<0||nc>=cols||grid[nr][nc]!==p) break; } if(c2===4) return true;} return false;
        }
        area.appendChild(msg); area.appendChild(table); draw(); },
  rockPaperScissors:(area,game)=>{ const moves=['Rock','Paper','Scissors']; let score=0; const result=document.createElement('div'); const display=document.createElement('div'); moves.forEach(move=>{ const b=document.createElement('button'); b.textContent=move; b.style='margin:4px;'; b.onclick=()=>{ const ai=moves[Math.floor(Math.random()*3)]; let r='Draw'; if((move==='Rock'&&ai==='Scissors')||(move==='Paper'&&ai==='Rock')||(move==='Scissors'&&ai==='Paper')){ r='Win'; score+=15; setScore(score); registerScore(game.id,score); } else if(move!==ai){ r='Lose'; score=Math.max(0,score-5); setScore(score); } result.textContent=`You:${move} vs AI:${ai} => ${r}`; }; area.appendChild(b); }); area.appendChild(result); area.appendChild(display); },
  diceGame:(area,game)=>{ const btn=document.createElement('button'); btn.textContent='Roll Dice'; const info=document.createElement('div'); let total=0; btn.onclick=()=>{ const d1=1+Math.floor(Math.random()*6); const d2=1+Math.floor(Math.random()*6); total += d1+d2; info.textContent=`Rolled ${d1}+${d2}= ${d1+d2}. Total ${total}`; setScore(total); registerScore(game.id,total); }; area.appendChild(btn); area.appendChild(info); },
  towerStacking:(area,game)=>{ const c=document.createElement('canvas'); c.width=280;c.height=260; area.appendChild(c); const ctx=c.getContext('2d'); let stack=[{x:100,w:80}]; let moving={x:0,w:80,dir:2}; let score=0; const t=setInterval(()=>{ ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle='#020a1a'; ctx.fillRect(0,0,c.width,c.height); stack.forEach((b,i)=>{ctx.fillStyle='#86b2ff';ctx.fillRect(b.x,250-i*20,b.w,18);}); ctx.fillStyle='#ffee7c'; ctx.fillRect(moving.x,250-stack.length*20,moving.w,18); moving.x += moving.dir; if(moving.x<0||moving.x+moving.w>c.width) moving.dir*=-1; ctx.fillText('Score:'+score,10,16); },20);
        area.onclick=()=>{ const top=stack[stack.length-1]; const overlap= Math.max(0, Math.min(top.x+top.w,moving.x+moving.w)-Math.max(top.x,moving.x)); if(overlap<=0){ clearInterval(t); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Tower fell',style:'color:#ff8a8a;'})); } else { moving.w=overlap; moving.x=Math.max(top.x,moving.x); stack.push({x:moving.x,w:moving.w}); score+=10; setScore(score); registerScore(game.id,score); }}; },
  blockDrop:(area,game)=>{ const c=document.createElement('canvas'); c.width=120; c.height=200; area.appendChild(c); const ctx=c.getContext('2d'); let grid=Array.from({length:10}, ()=>Array(6).fill(0)); let piece={x:2,y:0}; let score=0; function draw(){ ctx.fillStyle='#040b1d'; ctx.fillRect(0,0,c.width,c.height); grid.forEach((row,ri)=>row.forEach((v,ci)=>{ if(v){ctx.fillStyle='#72a0ff';ctx.fillRect(ci*20,ri*20,18,18);} })); ctx.fillStyle='#ffd17a'; ctx.fillRect(piece.x*20,piece.y*20,18,18); ctx.fillStyle='#e4efff'; ctx.fillText('Score:'+score,4,14);} function step(){ if(piece.y<9 && !grid[piece.y+1][piece.x]){ piece.y++; } else { grid[piece.y][piece.x]=1; piece={x:2,y:0}; score+=5; for(let r=9;r>=0;r--){ if(grid[r].every(v=>v===1)){ grid.splice(r,1); grid.unshift(Array(6).fill(0)); score+=20; }} if(grid[0].some(v=>v===1)){ registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Game over',style:'color:#ff9a9a;'})); clearInterval(int);} } draw();} const int=setInterval(step,400); area.onmousemove=e=>{ const rect=area.getBoundingClientRect(); piece.x=Math.max(0,Math.min(5, Math.floor((e.clientX-rect.left)/20))); }; },
  spaceShooter:(area,game)=>{ gameEngines.spaceInvaders(area,game); },
  alienDefense:(area,game)=>{ gameEngines.spaceInvaders(area,game); },
  meteorShooter:(area,game)=>{ gameEngines.asteroids(area,game); },
  targetShootingRange:(area,game)=>{ gameEngines.tapMovingTarget(area,game); },
  cannonAim:(area,game)=>{ const canvas=document.createElement('canvas'); canvas.width=300; canvas.height=220; area.appendChild(canvas); const ctx=canvas.getContext('2d'); let cannon={x:150,y:200,angle:-Math.PI/2}; let targets=[{x:Math.random()*260+20,y:40,r:10}]; let bullets=[]; let score=0; function draw(){ ctx.fillStyle='#01111f'; ctx.fillRect(0,0,300,220); targets.forEach(t=>{ctx.fillStyle='#ff6969';ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();}); bullets.forEach(b=>{ctx.fillStyle='#cdf1ff';ctx.fillRect(b.x,b.y,4,4);}); ctx.save(); ctx.translate(cannon.x,cannon.y); ctx.rotate(cannon.angle); ctx.fillStyle='#f2f8ff'; ctx.fillRect(-5,-10,10,20); ctx.restore(); ctx.fillStyle='#c8dfff'; ctx.fillText('Score:'+score,10,16); }
          canvas.onmousemove=e=>{ const r=canvas.getBoundingClientRect(); const mX=e.clientX-r.left; const mY=e.clientY-r.top; cannon.angle=Math.atan2(mY-cannon.y,mX-cannon.x); draw(); }
          canvas.onclick=()=>{ bullets.push({x:cannon.x+Math.cos(cannon.angle)*16, y:cannon.y+Math.sin(cannon.angle)*16, dx:Math.cos(cannon.angle)*6, dy:Math.sin(cannon.angle)*6}); }
          setInterval(()=>{ bullets.forEach((b,i)=>{ b.x+=b.dx; b.y+=b.dy; if(b.x<0||b.x>300||b.y<0||b.y>220) bullets.splice(i,1); targets.forEach((t,j)=>{ if(Math.hypot(t.x-b.x,t.y-b.y)<t.r){ targets.splice(j,1); bullets.splice(i,1); score+=12; setScore(score); targets.push({x:Math.random()*260+20,y:Math.random()*80+20,r:10}); }}); }); draw(); },20);
      },
  simpleRacing:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let car={x:150,y:180}; let obs=[]; let score=0; const t=setInterval(()=>{ if(Math.random()<0.06) obs.push({x:Math.random()*260+20,y:-20,w:20,h:30}); obs.forEach(o=>o.y+=2.2); obs=obs.filter(o=>o.y<250); if(obs.some(o=>o.x<car.x+24 && o.x+o.w>car.x && o.y<car.y+30 && o.y+o.h>car.y)){ clearInterval(t); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Crash! '+score,style:'color:#ff8a8a;'})); }
        score++; setScore(score); ctx.fillStyle='#0a1330'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#2bffb9'; ctx.fillRect(car.x,car.y,20,30); obs.forEach(o=>{ctx.fillStyle='#ff7167';ctx.fillRect(o.x,o.y,o.w,o.h);}); ctx.fillStyle='#e2eeff'; ctx.fillText('Score:'+score,10,16); },20); area.onmousemove=e=>{ const r=c.getBoundingClientRect(); car.x=Math.min(Math.max(10, e.clientX-r.left-10), c.width-30); };
      },
  basketballShot:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let ball={x:160,y:190,vy:0,vx:0,moving:false}; let score=0; const net={x:270,y:70,w:12,h:26}; function draw(){ ctx.fillStyle='#08203b'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#ffab3f'; ctx.beginPath(); ctx.arc(ball.x,ball.y,8,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(net.x,net.y,net.w,net.h); ctx.fillText('Score:'+score,10,18); }
        c.onclick=()=>{ if(!ball.moving){ ball.vx=(net.x-ball.x)/30; ball.vy=-5; ball.moving=true; } }
        const int=setInterval(()=>{ if(ball.moving){ ball.x+=ball.vx; ball.y+=ball.vy; ball.vy+=0.18; if(ball.y>200){ ball.moving=false; ball.x=160; ball.y=190; } if(ball.x>net.x && ball.x<net.x+net.w && ball.y>net.y && ball.y<net.y+net.h){ score+=2; setScore(score); registerScore(game.id,score); ball.moving=false; ball.x=160; ball.y=190; } } draw(); },20);
      },
  penaltyKick:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let angle=0, power=0; let score=0; function draw(){ ctx.fillStyle='#061226'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#fff'; ctx.fillRect(260,80,8,40); ctx.fillStyle='#f2f'; ctx.fillText('Score:'+score,10,18); ctx.fillStyle='#ff3'; ctx.fillRect(150,180,10,10); ctx.strokeStyle='#63f'; ctx.beginPath(); ctx.moveTo(155,185); ctx.lineTo(155+Math.cos(angle)*power*10,185-Math.sin(angle)*power*10); ctx.stroke(); }
          c.onmousemove=e=>{ const r=c.getBoundingClientRect(); const dx=e.clientX-r.left-155; const dy=(e.clientY-r.top-185); angle=Math.atan2(-dy,dx); power=Math.min(1,Math.hypot(dx,dy)/80); draw(); };
          c.onclick=()=>{ const pos={x:155+Math.cos(angle)*power*80, y:185-Math.sin(angle)*power*80}; if(pos.x>255 && pos.x<280 && pos.y>80 && pos.y<120){ score+=10; setScore(score); registerScore(game.id,score); beep(900,0.05);} else beep(300,0.07); }
      },
  fishingGame:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let hook={x:160,y:40}; let fish={x:Math.random()*280+20,y:100,vx:1.5}; let score=0; function draw(){ ctx.fillStyle='#05243c'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#fff'; ctx.fillRect( hook.x,hook.y,2,20); ctx.fillStyle='#ffeb5f'; ctx.fillRect(fish.x,fish.y,16,8); ctx.fillText('Score:'+score,10,18);} setInterval(()=>{ fish.x += fish.vx; if(fish.x<20||fish.x>300) fish.vx*=-1; if(Math.abs(fish.x-hook.x)<10 && Math.abs(fish.y-hook.y)<12){ score+=15; setScore(score); registerScore(game.id,score); fish.x=Math.random()*280+20; } draw(); },30); area.onmousemove=e=>{ const r=area.getBoundingClientRect(); hook.x = Math.min(Math.max(20, e.clientX-r.left), 300); draw(); };
      },
  coinCollector:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:150,y:190}; let coins=[]; let score=0; setInterval(()=>{ if(Math.random()<0.08) coins.push({x:Math.random()*300+10,y:-10}); coins.forEach(cn=>cn.y+=1.8); coins.forEach((cn,i)=>{ if(Math.hypot(cn.x-player.x-10,cn.y-player.y-10)<16){ coins.splice(i,1); score+=5; setScore(score); registerScore(game.id,score); } }); ctx.fillStyle='#0c1a32'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#6bbfff'; ctx.fillRect(player.x,player.y,20,20); coins.forEach(cn=>{ctx.fillStyle='#ffd740';ctx.beginPath();ctx.arc(cn.x,cn.y,6,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#e7f2ff'; ctx.fillText('Score:'+score,10,18); },20); area.onmousemove=e=>{ const r=area.getBoundingClientRect(); player.x=Math.min(Math.max(0,e.clientX-r.left-10),300); };
      },
  balloonPop:(area,game)=>{ area.style.position='relative'; let score=0; const txt=document.createElement('div'); txt.textContent='Score:0'; txt.style='margin-bottom:8px;'; area.appendChild(txt); const interval=setInterval(()=>{ const b=document.createElement('div'); const size=24; b.style=`position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#ff61ac;left:${Math.random()*(area.clientWidth-size)}px;top:${area.clientHeight}px;transition:top 4s linear;`; area.appendChild(b); setTimeout(()=>b.style.top='-30px',20); const id=setTimeout(()=>{ b.remove(); },4100); b.onclick=()=>{ clearTimeout(id); b.remove(); score += 1; txt.textContent='Score:'+score; setScore(score); registerScore(game.id,score); beep(750,0.02);} },700); setTimeout(()=>clearInterval(interval),20000);
      },
  tileTapping:(area,game)=>{ const grid=document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(4,60px)'; grid.style.gridGap='6px'; let sequence=[]; let step=0; let score=0; const msg=document.createElement('div'); for(let i=0;i<16;i++){ const btn=document.createElement('button'); btn.textContent=''; btn.style='width:60px;height:60px;background:#152644;'; btn.onclick=()=>{ if(sequence[step]===i){ step++; if(step===sequence.length){ score+=10; setScore(score); sequence.push(Math.floor(Math.random()*16)); step=0; playSequence(); } } else { msg.textContent='Wrong'; registerScore(game.id,score); } }; grid.appendChild(btn); }
        area.appendChild(msg); area.appendChild(grid);
        const playSequence=()=>{ sequence.forEach((idx,i)=>setTimeout(()=>{ grid.children[idx].style.background='#8a4cff'; setTimeout(()=>grid.children[idx].style.background='#152644',300); }, i*500)); }; sequence=[Math.floor(Math.random()*16)]; playSequence(); },
  fruitSlicing:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let fruits=[]; let score=0; setInterval(()=>{ if(Math.random()<0.1) fruits.push({x:Math.random()*300,y:220,r:12,vy:-5}); fruits.forEach(f=>f.y+=f.vy); fruits=fruits.filter(f=>f.y>-20); ctx.fillStyle='#041a2b'; ctx.fillRect(0,0,320,220); fruits.forEach(f=>{ctx.fillStyle='#ff625d';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#e7f2ff'; ctx.fillText('Score:'+score,10,18); },20); c.onmousemove=e=>{ const r=c.getBoundingClientRect(); const mx=e.clientX-r.left, my=e.clientY-r.top; fruits.forEach((f,i)=>{ if(Math.hypot(mx-f.x,my-f.y)<f.r){ fruits.splice(i,1); score+=5; setScore(score); registerScore(game.id,score); } }); }; },
  fallingStars:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=230; area.appendChild(c); const ctx=c.getContext('2d'); let bucket={x:140,y:200,w:40,h:14}; let stars=[]; let score=0; setInterval(()=>{ if(Math.random()<0.12) stars.push({x:Math.random()*300,y:0}); stars.forEach(s=>s.y+=3); stars=stars.filter(s=>{ if(s.y>230) return false; if(s.x>bucket.x && s.x<bucket.x+bucket.w && s.y>bucket.y){ score++; setScore(score); registerScore(game.id,score); return false; } return true; }); ctx.fillStyle='#051e36'; ctx.fillRect(0,0,320,230); stars.forEach(s=>{ctx.fillStyle='#fff';ctx.fillRect(s.x,s.y,3,7);}); ctx.fillStyle='#9df3ff'; ctx.fillRect(bucket.x,bucket.y,bucket.w,bucket.h); ctx.fillStyle='#d7edff'; ctx.fillText('Score:'+score,8,16); },20); area.onmousemove=e=>{ const r=area.getBoundingClientRect(); bucket.x=Math.max(0, Math.min(280, e.clientX-r.left-20)); }; },
  randomMini:(area,game)=>{ const n=Math.floor(Math.random()*5); const list=['clickSpeed','reactionTester','tapMovingTarget','diceGame','quickMath']; gameEngines[list[n]](area,game); },
  colorMatch:(area,game)=>{ let score=0; const droplist=['#ff4f7c','#6ef5ff','#a75fff','#71ff9b']; const target=document.createElement('div'); const chooser=document.createElement('div'); target.textContent=''; target.style=`width:100px;height:100px;margin-bottom:10px;border-radius:12px;`; const info=document.createElement('div'); area.appendChild(target); area.appendChild(chooser); area.appendChild(info);
        function refresh(){ const color=droplist[Math.floor(Math.random()*droplist.length)]; target.style.background=color; chooser.innerHTML=''; droplist.sort(()=>Math.random()-0.5).forEach(c=>{ const b=document.createElement('button'); b.style=`background:${c};border:1px solid #fff;width:46px;height:46px;margin:3px;`; b.onclick=()=>{ if(c===target.style.background){ score+=10; setScore(score); registerScore(game.id,score); info.textContent='Correct'; } else info.textContent='Try again'; refresh();}; chooser.appendChild(b); }); }
        refresh(); },
  patternMemory:(area,game)=>{ let sequence=[]; let pos=0; let score=0; const colors=['#e56','#5ad','#5fe','#f7e']; const container=document.createElement('div'); container.style='display:grid;grid-template-columns:repeat(4,60px);gap:8px;'; const msg=document.createElement('div'); colors.forEach(c=>{ const btn=document.createElement('button'); btn.style=`width:60px;height:60px;background:${c};opacity:.7;`; btn.onclick=()=>{ if(sequence[pos]===c){ pos++; if(pos===sequence.length){ score+=10; setScore(score); sequence.push(colors[Math.floor(Math.random()*4)]); pos=0; announce(); } } else { msg.textContent='Failed'; registerScore(game.id,score); } }; container.appendChild(btn); }); function announce(){ msg.textContent='Repeat the sequence'; let i=0; const t=setInterval(()=>{ if(i>=sequence.length){ clearInterval(t); return; } msg.textContent=''+sequence[i]; i++; },600); } sequence=[colors[Math.floor(Math.random()*4)]]; announce(); area.appendChild(container); area.appendChild(msg); },
  quickMath:(area,game)=>{ let score=0; const question=document.createElement('div'); const input=document.createElement('input'); input.type='number'; input.style='padding:6px; width:80px;'; const btn=document.createElement('button'); btn.textContent='Check'; const feedback=document.createElement('div'); function refresh(){ const a=Math.floor(Math.random()*20)+1; const b=Math.floor(Math.random()*20)+1; question.textContent=`${a} + ${b} = ?`; question.dataset.answer=a+b; }
        btn.onclick=()=>{ if(Number(input.value)===Number(question.dataset.answer)){ score+=10; setScore(score); registerScore(game.id,score); feedback.textContent='Right'; } else feedback.textContent='Wrong'; input.value=''; refresh(); };
        area.appendChild(question); area.appendChild(input); area.appendChild(btn); area.appendChild(feedback); refresh(); },
  escapeBox:(area,game)=>{ let step=0; let score=0; const text=document.createElement('div'); const choice=document.createElement('div'); function render(){ if(step===0){ text.textContent='Choose door A or door B'; choice.innerHTML=''; ['A','B'].forEach(c=>{ const b=document.createElement('button'); b.textContent=c; b.onclick=()=>{ if(c==='A'){score+=20; step=1;} else {score-=5;step=1;} setScore(score); registerScore(game.id,score); render();}; choice.appendChild(b); }); }
          else if(step===1){ text.textContent='Next choose key 1 or 2'; choice.innerHTML=''; ['1','2'].forEach(c=>{ const b=document.createElement('button'); b.textContent=c; b.onclick=()=>{ if(c==='2'){score+=30; text.textContent='Escaped!'; } else {score-=10; text.textContent='Locked again'; } setScore(score); registerScore(game.id,score); choice.innerHTML=''; }; choice.appendChild(b); }); }
        }
        area.appendChild(text); area.appendChild(choice); render(); },
  dailyChallenge:(area,game)=>{ const idx=new Date().getDate()%5; const list=['reactionTester','colorMatch','targetShootingRange','quickMath','memoryMatch']; gameEngines[list[idx]](area,game); },
  subwaySurfer:(area,game)=>{
    const c=document.createElement('canvas'); c.width=360;c.height=540; 
    c.style.cssText='border:3px solid #111; box-shadow:0 15px 40px rgba(0,0,0,0.6); background:#000; border-radius:8px; display:block; margin:0 auto;'; 
    area.appendChild(c);
    const ctx=c.getContext('2d');

    let lanes=[-30,0,30]; let laneIdx=1;
    let p={x:0, y:0, z:20, vy:0, state:'run', rollT:0, flyT:0, magT:0, invT:0};
    let speed=10; let score=0; let mult=1; let frame=0; let running=true; let worldTime=0;
    let objs=[]; let particles=[]; let coinRot=0;
    let state='menu';
    const skins=[{name:'Surfer',c:'#2ecc71',h:'#f1c40f',score:0},{name:'Ninja',c:'#34495e',h:'#c0392b',score:1000},{name:'Robot',c:'#95a5a6',h:'#3498db',score:2500},{name:'Punk',c:'#e74c3c',h:'#8e44ad',score:5000}];
    let unlockedSkins = JSON.parse(localStorage.getItem('subwaySurfer_unlockedSkins') || '["Surfer"]');
    let skinIdx=0;    

    // Assets & Colors
    const cols={sky:['#4facfe','#00f2fe'], skyN:['#0f2027','#203a43'], ground:'#2c3e50', rail:'#95a5a6', sleeper:'#5d4037', coin:'#ffd700', train:'#c0392b'};

    // Input & Gestures
    const act=(a)=>{ 
      if(state==='menu'){
        if(a==='L'){ skinIdx=(skinIdx-1+skins.length)%skins.length; beep(250,0.03); return; }
        if(a==='R'){ skinIdx=(skinIdx+1)%skins.length; beep(250,0.03); return; }
        if(unlockedSkins.includes(skins[skinIdx].name)){
          state='play'; laneIdx=1; p={x:0,y:0,z:20,vy:0,state:'run',rollT:0,flyT:0,magT:0,invT:0};
          speed=10; score=0; mult=1; frame=0; worldTime=0; objs=[]; particles=[]; beep(600,0.1);
        } else {
          beep(200, 0.1);
        }
        return;
      }
      if(state==='over'){ state='menu'; beep(400,0.05); return; }
      if(state!=='play')return;
      if(a==='L'&&laneIdx>0) laneIdx--; if(a==='R'&&laneIdx<2) laneIdx++;
      if(a==='U'&&p.y===0&&p.state!=='fly'){p.vy=-8;p.state='jump';beep(350,0.04);}
      if(a==='D'&&p.y===0&&p.state!=='fly'){p.state='roll';p.rollT=40;}
    };
    document.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'||e.key==='a') act('L'); if(e.key==='ArrowRight'||e.key==='d') act('R');
      if(e.key==='ArrowUp'||e.key==='w') act('U'); if(e.key==='ArrowDown'||e.key==='s') act('D');
    });
    let sx=0,sy=0; c.onmousedown=e=>{sx=e.clientX;sy=e.clientY;};
    c.onmouseup=e=>{const dx=e.clientX-sx,dy=e.clientY-sy; if(Math.abs(dx)>Math.abs(dy)) act(dx>0?'R':'L'); else act(dy>0?'D':'U');};

    // 3D Engine
    function proj(x,y,z){ const fov=320, scale=fov/(fov+z), curve=(z*z)*0.00015; return {x:c.width/2+x*scale, y:c.height/2+(y-50+curve)*scale, s:scale, v:scale>0&&z>-50}; }
    function shade(hex,amt){ let c=parseInt(hex.replace('#',''),16); let r=(c>>16)+amt,g=((c>>8)&0xFF)+amt,b=(c&0xFF)+amt; return '#'+(0x1000000+(r<0?0:r>255?255:r)*0x10000+(g<0?0:g>255?255:g)*0x100+(b<0?0:b>255?255:b)).toString(16).slice(1); }
    function box(x,y,z,w,h,d,col,opts={}){
      const v=[proj(x-w/2,y-h,z), proj(x+w/2,y-h,z), proj(x+w/2,y,z), proj(x-w/2,y,z), proj(x-w/2,y-h,z+d), proj(x+w/2,y-h,z+d), proj(x+w/2,y,z+d), proj(x-w/2,y,z+d)];
      if(!v[0].v) return;
      const sc=shade(col,-20), tc=shade(col,20);
      ctx.fillStyle=tc; ctx.beginPath(); ctx.moveTo(v[0].x,v[0].y); ctx.lineTo(v[1].x,v[1].y); ctx.lineTo(v[5].x,v[5].y); ctx.lineTo(v[4].x,v[4].y); ctx.fill(); // Top
      ctx.fillStyle=sc; ctx.beginPath(); if(x<0){ctx.moveTo(v[1].x,v[1].y);ctx.lineTo(v[5].x,v[5].y);ctx.lineTo(v[6].x,v[6].y);ctx.lineTo(v[2].x,v[2].y);} else {ctx.moveTo(v[0].x,v[0].y);ctx.lineTo(v[4].x,v[4].y);ctx.lineTo(v[7].x,v[7].y);ctx.lineTo(v[3].x,v[3].y);} ctx.fill(); // Side
      ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(v[0].x,v[0].y); ctx.lineTo(v[1].x,v[1].y); ctx.lineTo(v[2].x,v[2].y); ctx.lineTo(v[3].x,v[3].y); ctx.fill(); // Front
      if(opts.win){ ctx.fillStyle='#8cf'; ctx.fillRect(v[0].x+4*v[0].s, v[0].y+4*v[0].s, (v[1].x-v[0].x)-8*v[0].s, (v[3].y-v[0].y)*0.4); } // Train Window
    }
    function poly(pts,col){ if(pts.some(p=>!p.v))return; ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.fill(); }

    function handleEndOfGame(finalScore){
        let board = JSON.parse(localStorage.getItem('leaderboard_subwaySurfer') || '[]');
        board.push(finalScore);
        board.sort((a,b)=>b-a);
        board.splice(3);
        localStorage.setItem('leaderboard_subwaySurfer', JSON.stringify(board));

        let newUnlock = false;
        skins.forEach(s=>{
            if(finalScore >= s.score && !unlockedSkins.includes(s.name)){
                unlockedSkins.push(s.name);
                newUnlock = true;
            }
        });
        if(newUnlock) localStorage.setItem('subwaySurfer_unlockedSkins', JSON.stringify(unlockedSkins));
        
        registerScore(game.id, finalScore);
    }

    function loop(){ 
      if(state==='menu'){
        const g=ctx.createLinearGradient(0,0,0,c.height); g.addColorStop(0,'#111'); g.addColorStop(1,'#2c3e50'); ctx.fillStyle=g; ctx.fillRect(0,0,c.width,c.height);
        ctx.textAlign='center'; ctx.fillStyle='#4facfe'; ctx.font='900 30px sans-serif'; ctx.fillText("SUBWAY SURFER 3D",c.width/2,c.height/2-120);
        const sk=skins[skinIdx];
        const isUnlocked = unlockedSkins.includes(sk.name);
        box(0, 20, 150, 20, 30, 15, isUnlocked ? sk.c : '#222'); box(0, -10, 150, 14, 14, 14, isUnlocked ? sk.h : '#444');
        ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif'; ctx.fillText(`< ${sk.name} >`,c.width/2,c.height/2+20);
        if(isUnlocked){ ctx.fillStyle='#f1c40f'; ctx.font='bold 22px sans-serif'; ctx.fillText("Tap / Up to Start",c.width/2,c.height/2+60); }
        else { ctx.fillStyle='#e74c3c'; ctx.font='bold 20px sans-serif'; ctx.fillText(`LOCKED`,c.width/2,c.height/2+55); ctx.fillStyle='#fff'; ctx.font='16px sans-serif'; ctx.fillText(`Score ${sk.score} to Unlock`,c.width/2,c.height/2+80); }
        const board = JSON.parse(localStorage.getItem('leaderboard_subwaySurfer') || '[]');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('High Scores', c.width/2, c.height - 110);
        ctx.font = '18px sans-serif';
        if(board.length > 0) board.forEach((s, i) => { ctx.fillText(`${i+1}. ${s}`, c.width/2, c.height - 80 + (i * 22)); });
        else ctx.fillText('No scores yet!', c.width/2, c.height - 80);
        requestAnimationFrame(loop); return;
      }
      // Updates
      if(state==='play'){
      speed+=0.0015; score+=0.1*mult; setScore(Math.floor(score)); worldTime+=0.02; coinRot+=0.2;
      if(p.flyT>0){ p.flyT--; p.y=-70; p.state='fly'; if(p.flyT<=0){p.y=0;p.state='run';} }
      else { if(p.y<0||p.vy!==0){p.y+=p.vy; p.vy+=0.4; if(p.y>0){p.y=0;p.vy=0;p.state='run';}} }
      if(p.state==='roll'){p.rollT--; if(p.rollT<=0)p.state='run';}
      if(p.magT>0)p.magT--;
      p.x += (lanes[laneIdx]-p.x)*0.25;

      // Spawning
      if(frame++ % Math.floor(1300/speed) === 0){
        const r=Math.random(), z=2000;
        if(r<0.08){ // Powerup
          const types=['magnet','jetpack','x2']; const t=types[Math.floor(Math.random()*3)];
          objs.push({type:'power', pType:t, x:lanes[Math.floor(Math.random()*3)], y:-20, z, w:12, h:12, d:12});
        } else if(r<0.4){ // Train
          const l=Math.floor(Math.random()*3); objs.push({type:'train', x:lanes[l], y:0, z, w:26, h:36, d:120, speed:speed+3});
        } else if(r<0.65){ // Barrier
          const l=Math.floor(Math.random()*3), h=Math.random()>0.5;
          objs.push({type:'barrier', style:h?'high':'low', x:lanes[l], y:0, z, w:24, h:h?30:14, d:5});
        } else { // Coins
          const l=Math.floor(Math.random()*3), arc=Math.random()>0.7;
          for(let i=0;i<(arc?10:5);i++) objs.push({type:'coin', x:lanes[l], y:(arc&&i>2&&i<7)?-45:-8, z:z+i*40, w:8, h:8});
        }
      }

      // Logic
      objs.forEach(o=>{
        o.z -= o.speed||speed;
        if(o.type==='coin' && p.magT>0 && o.z<600 && o.z>-50){ o.x+=(p.x-o.x)*0.2; o.y+=(p.y-o.y)*0.2; o.z+=(p.z-o.z)*0.2; } // Magnet
        
        if(Math.abs(o.z-p.z)<(o.d/2+10) && Math.abs(o.x-p.x)<(o.w/2+10)){ // Collision
          if(o.type==='coin' && !o.hit){ score+=10; beep(1200,0.02); o.hit=true; for(let i=0;i<4;i++)particles.push({x:o.x,y:o.y,z:o.z,vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10,life:1,c:'#ffd700'}); }
          else if(o.type==='power' && !o.hit){
             o.hit=true; beep(1500,0.1); if(o.pType==='magnet')p.magT=600; if(o.pType==='jetpack')p.flyT=400; if(o.pType==='x2')mult*=2;
             const msg=document.createElement('div'); msg.textContent=o.pType.toUpperCase(); msg.style.cssText='position:absolute;top:20%;left:50%;transform:translateX(-50%);color:#fff;font-size:24px;font-weight:bold;text-shadow:0 2px 5px #000;animation:fadeUp 1s forwards;'; area.appendChild(msg); setTimeout(()=>msg.remove(),1000);
          }
          else if(!o.hit && (o.type==='train' || o.type==='barrier')){
             let crash=true; 
             if(o.type==='barrier' && o.style==='low' && p.y<-15) crash=false; 
             if(o.type==='barrier' && o.style==='high' && p.state==='roll') crash=false;
             if(crash){ state='over'; beep(100,0.4); handleEndOfGame(Math.floor(score)); }
          }
        }
      });
      objs=objs.filter(o=>o.z>-100 && !o.hit); objs.sort((a,b)=>b.z-a.z);
      }

      // Draw World
      const sky=Math.sin(worldTime*0.05)>0?cols.sky:cols.skyN;
      const grad=ctx.createLinearGradient(0,0,0,c.height); grad.addColorStop(0,sky[0]); grad.addColorStop(1,sky[1]);
      ctx.fillStyle=grad; ctx.fillRect(0,0,c.width,c.height); ctx.textAlign='left';
      ctx.fillStyle=cols.ground; ctx.fillRect(0,c.height/2,c.width,c.height/2);
      
      // Tracks
      for(let z=0;z<2000;z+=100){
        let gz=z-(frame*speed)%100; if(gz<10)continue;
        lanes.forEach(lx=>poly([proj(lx-12,0,gz),proj(lx+12,0,gz),proj(lx+12,0,gz+15),proj(lx-12,0,gz+15)],cols.sleeper));
      }
      lanes.forEach(lx=>{ // Rails
        poly([proj(lx-9,-1,0),proj(lx-7,-1,0),proj(lx-7,-1,2000),proj(lx-9,-1,2000)],cols.rail);
        poly([proj(lx+7,-1,0),proj(lx+9,-1,0),proj(lx+9,-1,2000),proj(lx+7,-1,2000)],cols.rail);
      });

      // Objects
      objs.forEach(o=>{
        if(o.type==='coin'){
          const pt=proj(o.x,o.y,o.z); if(pt.v){
             const rw=o.w*Math.cos(coinRot+o.z*0.01); 
             ctx.fillStyle=cols.coin; ctx.beginPath(); ctx.ellipse(pt.x,pt.y,Math.abs(rw)*pt.s,o.h*pt.s,0,0,Math.PI*2); ctx.fill();
             ctx.fillStyle='#f1c40f'; ctx.beginPath(); ctx.ellipse(pt.x,pt.y,Math.abs(rw*0.7)*pt.s,o.h*0.7*pt.s,0,0,Math.PI*2); ctx.fill();
          }
        } else if(o.type==='power'){
          box(o.x, o.y+Math.sin(frame*0.1)*5, o.z, 12, 12, 12, o.pType==='magnet'?'#e74c3c':(o.pType==='jetpack'?'#3498db':'#9b59b6'));
        } else if(o.type==='train'){
          box(o.x,o.y,o.z,o.w,o.h,o.d,cols.train,{win:true});
        } else box(o.x,o.y,o.z,o.w,o.h,o.d,'#555');
      });
      
      // Player
      const sh=proj(p.x,0,p.z); if(sh.v){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(sh.x,sh.y,12*sh.s,6*sh.s,0,0,Math.PI*2);ctx.fill();} // Shadow
      const ph=p.state==='roll'?12:24;
      const pc=p.magT>0?'#e74c3c':(p.flyT>0?'#3498db':skins[skinIdx].c);      
      box(p.x, p.y, p.z, 14, ph, 8, pc);
      if(p.state!=='roll'){ box(p.x, p.y-ph, p.z, 8, 8, 8, skins[skinIdx].h); box(p.x, p.y-ph-4, p.z, 8, 2, 10, '#e67e22'); } // Head & Cap
      if(p.flyT>0){ // Jetpack
         box(p.x-5,p.y-10,p.z+6,4,14,4,'#bdc3c7'); box(p.x+5,p.y-10,p.z+6,4,14,4,'#bdc3c7');
         for(let i=0;i<2;i++)particles.push({x:p.x+(i?5:-5),y:p.y,z:p.z+8,vx:0,vy:5,life:0.5,c:'#f39c12'});
      }

      // Particles
      particles.forEach((pt,i)=>{
        pt.x+=pt.vx; pt.y+=pt.vy; pt.life-=0.05;
        const pp=proj(pt.x,pt.y,pt.z); if(pp.v){ ctx.globalAlpha=pt.life; ctx.fillStyle=pt.c; ctx.fillRect(pp.x,pp.y,4*pp.s,4*pp.s); ctx.globalAlpha=1; }
        if(pt.life<=0)particles.splice(i,1);
      });

      // HUD
      ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif'; ctx.fillText("Score: "+Math.floor(score), 20, 30);
      if(mult>1) ctx.fillText("x"+mult, 20, 55);
      if(p.magT>0) ctx.fillText("Magnet", 20, 80);

      if(state==='over'){
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,c.width,c.height);
        ctx.textAlign='center'; ctx.fillStyle='#e74c3c'; ctx.font='bold 40px sans-serif'; ctx.fillText("CRASHED!",c.width/2,c.height/2-30);
        ctx.fillStyle='#fff'; ctx.font='20px sans-serif'; ctx.fillText("Score: "+Math.floor(score),c.width/2,c.height/2+20);
        ctx.fillStyle='#f1c40f'; ctx.fillText("Tap to Restart",c.width/2,c.height/2+60);
      }
      requestAnimationFrame(loop);
    } loop();
  }
};

window.addEventListener('message', (event)=>{
  if(!event.data || event.data.type !== 'closeModal') return;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({type:'closeModal'}, '*');
  }
});
