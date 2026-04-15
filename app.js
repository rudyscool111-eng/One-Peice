    // Inlined game engine definitions (no external files needed)

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
        registerGameCleanup(()=>{ clearInterval(interval); document.removeEventListener('keydown', keyHandler); });
        const goUp = ()=>{ if(dir.y===0) dir={x:0,y:-1}; };
        const goDown = ()=>{ if(dir.y===0) dir={x:0,y:1}; };
        const goLeft = ()=>{ if(dir.x===0) dir={x:-1,y:0}; };
        const goRight = ()=>{ if(dir.x===0) dir={x:1,y:0}; };
        attachDirectionalSwipe(canvas, { up: goUp, down: goDown, left: goLeft, right: goRight });
        createTouchControls(area, [[{ label:'Up', onPress:goUp }],[{ label:'Left', onPress:goLeft }, { label:'Down', onPress:goDown }, { label:'Right', onPress:goRight }]], { compact:true });
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
        attachTouchMoveControl(c, ({ y })=>{ paddleY = Math.min(Math.max(0, y-25), H-50); });
        registerGameCleanup(()=>clearInterval(timer));
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
        attachTouchMoveControl(c, ({ x })=>{ paddle.x = Math.min(c.width-paddle.w, Math.max(0, x-paddle.w/2)); });
        registerGameCleanup(()=>clearInterval(it));
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
        const onShipMove = (e)=>{ const r=c.getBoundingClientRect(); player.x=Math.min(Math.max(0, e.clientX-r.left-player.w/2), c.width-player.w); };
        const fireShot = ()=>{ if(!alive) return; shots.push({x:player.x + player.w/2 - 2, y:player.y - 10, w:4, h:8, type:'player'}); };
        let t=setInterval(step,20); document.addEventListener('mousemove', onShipMove);
        attachTouchMoveControl(c, ({ x })=>{ player.x = Math.min(Math.max(0, x-player.w/2), c.width-player.w); });
        c.addEventListener('click', fireShot);
        createTouchControls(area, [[{ label:'Fire', onPress:fireShot }]], { compact:true });
        registerGameCleanup(()=>{ clearInterval(t); document.removeEventListener('mousemove', onShipMove); c.removeEventListener('click', fireShot); });
      },
      asteroids: (area, game)=>{ const c=document.createElement('canvas'); c.width=360;c.height=260;c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let ship={x:c.width/2,y:c.height/2,a:0}; let bullets=[]; let asteroids=[]; let score=0; let alive=true;
        for(let i=0;i<5;i++) asteroids.push({x:Math.random()*c.width,y:Math.random()*c.height,r:20,dx:(Math.random()*2-1),dy:(Math.random()*2-1)});
        document.addEventListener('keydown',keyHandler);
        function keyHandler(e){ if(e.key==='ArrowLeft') ship.a-=0.2; if(e.key==='ArrowRight') ship.a+=0.2; if(e.key==='ArrowUp'){ ship.x += Math.cos(ship.a)*6; ship.y += Math.sin(ship.a)*6; } if(e.key===' ') bullets.push({x:ship.x, y:ship.y, dx:Math.cos(ship.a)*5, dy:Math.sin(ship.a)*5}); }
        registerGameCleanup(()=>document.removeEventListener('keydown', keyHandler));
        const rotateLeft = ()=>{ ship.a-=0.2; };
        const rotateRight = ()=>{ ship.a+=0.2; };
        const thrust = ()=>{ ship.x += Math.cos(ship.a)*6; ship.y += Math.sin(ship.a)*6; };
        const fire = ()=>{ bullets.push({x:ship.x, y:ship.y, dx:Math.cos(ship.a)*5, dy:Math.sin(ship.a)*5}); };
        createTouchControls(area, [[{ label:'Left', onPress:rotateLeft }, { label:'Thrust', onPress:thrust }, { label:'Right', onPress:rotateRight }],[{ label:'Fire', onPress:fire }]]);
        function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
        function draw(){ ctx.fillStyle='#020718'; ctx.fillRect(0,0,c.width,c.height); asteroids.forEach(a=>{ ctx.strokeStyle='#8ad6ff'; ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,Math.PI*2); ctx.stroke(); }); bullets.forEach(b=>{ ctx.fillStyle='#ffd968'; ctx.fillRect(b.x,b.y,3,3); }); ctx.save(); ctx.translate(ship.x,ship.y); ctx.rotate(ship.a); ctx.strokeStyle='#e3e8ff'; ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-8,7); ctx.lineTo(-8,-7); ctx.closePath(); ctx.stroke(); ctx.restore(); ctx.fillStyle='#d0ecff'; ctx.fillText('Score: '+score,8,14); }
        function step(){ if(!alive) return; ship.x=(ship.x+c.width)%c.width; ship.y=(ship.y+c.height)%c.height; asteroids.forEach(a=>{ a.x=(a.x+a.dx+c.width)%c.width; a.y=(a.y+a.dy+c.height)%c.height; }); bullets.forEach((b,i)=>{ b.x+=b.dx; b.y+=b.dy; if(b.x<0||b.x>c.width||b.y<0||b.y>c.height) bullets.splice(i,1); }); asteroids.forEach((a,i)=>{ bullets.forEach((b,j)=>{ if(Math.hypot(b.x-a.x,b.y-a.y)<a.r){ score+=8; setScore(score); beep(900,0.02); bullets.splice(j,1); asteroids.splice(i,1); asteroids.push({x:Math.random()*c.width,y:Math.random()*c.height,r:18,dx:(Math.random()*2-1),dy:(Math.random()*2-1)}); }}); if(dist(a,ship)<a.r+6){ alive=false; registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Crash!', style:'color:#ff6a6a;margin-top:9px;'})); } }); draw(); }
        const loopId=setInterval(step,20);
        registerGameCleanup(()=>clearInterval(loopId));
      },
      pacman: (area, game)=>{ const c=document.createElement('canvas'); c.width=330;c.height=300;c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); const map=[
        '1111111111111','1...........1','1.111.11111.1','1.1.......1.1','1.1.1.1.1.1.1','1...1...1...1','1111111111111'
      ]; const cell=24; let dots=[]; let player={x:2*cell,y:1*cell,dx:0,dy:0}; let ghosts=[{x:5*cell,y:3*cell,dx:0,dy:0}]; let score=0;
      for(let ry=0;ry<map.length;ry++) for(let rx=0;rx<map[ry].length;rx++) if(map[ry][rx]==='.') dots.push({x:rx*cell+cell/2,y:ry*cell+cell/2});
      function draw(){ ctx.fillStyle='#03061b'; ctx.fillRect(0,0,c.width,c.height); for(let ry=0;ry<map.length;ry++){ for(let rx=0;rx<map[ry].length;rx++){ if(map[ry][rx]==='1'){ctx.fillStyle='#4869a4';ctx.fillRect(rx*cell,ry*cell,cell,cell);} }} dots.forEach(d=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(d.x,d.y,3,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#ffe04f'; ctx.beginPath(); ctx.arc(player.x+cell/2,player.y+cell/2,cell/3,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#d2f4ff'; ctx.fillText('Score: '+score, 12, 14); }
      function can(x,y){ const col=Math.floor(x/cell), row=Math.floor(y/cell); return map[row] && map[row][col]!== '1'; }
      function step(){ if(can(player.x+player.dx, player.y+player.dy)){ player.x += player.dx; player.y += player.dy; } dots = dots.filter(d=>{ if(Math.hypot((d.x-(player.x+cell/2)), (d.y-(player.y+cell/2)))<9){ score+=5; setScore(score); beep(740,0.02); return false; } return true; }); if(dots.length===0){ registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'All cleared!', style:'color:#7affb6;margin-top:8px;'})); clearInterval(t); }
        ghosts.forEach(g=>{ const dx=player.x-g.x, dy=player.y-g.y; const mag=Math.hypot(dx,dy); g.dx = mag? (dx/mag):0; g.dy = mag? (dy/mag):0; g.x += g.dx*1.1; g.y += g.dy*1.1; if(Math.hypot((g.x-player.x),(g.y-player.y))<cell/1.3){ registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Caught by ghost!', style:'color:#ff7a7a;margin-top:8px;'})); clearInterval(t); }}); draw(); }
      const onPacmanKey = (e)=>{ if(e.key==='ArrowLeft'){player.dx=-cell/8;player.dy=0;} if(e.key==='ArrowRight'){player.dx=cell/8;player.dy=0;} if(e.key==='ArrowUp'){player.dy=-cell/8;player.dx=0;} if(e.key==='ArrowDown'){player.dy=cell/8;player.dx=0;} };
      document.addEventListener('keydown', onPacmanKey);
      registerGameCleanup(()=>document.removeEventListener('keydown', onPacmanKey));
      const movePacLeft = ()=>{ player.dx=-cell/8; player.dy=0; };
      const movePacRight = ()=>{ player.dx=cell/8; player.dy=0; };
      const movePacUp = ()=>{ player.dy=-cell/8; player.dx=0; };
      const movePacDown = ()=>{ player.dy=cell/8; player.dx=0; };
      attachDirectionalSwipe(c, { up: movePacUp, down: movePacDown, left: movePacLeft, right: movePacRight });
      createTouchControls(area, [[{ label:'Up', onPress:movePacUp }],[{ label:'Left', onPress:movePacLeft }, { label:'Down', onPress:movePacDown }, { label:'Right', onPress:movePacRight }]], { compact:true });
      const t=setInterval(step,120);
      registerGameCleanup(()=>clearInterval(t));
    },
      ticTacToe: (area,game)=>{ const grid = Array(9).fill(null); let turn='X'; let winner=null; const cont=document.createElement('div'); cont.style.display='grid'; cont.style.gridTemplateColumns='repeat(3,80px)'; cont.style.gap='8px'; for(let i=0;i<9;i++){ const b=document.createElement('button'); b.style.cssText='width:80px;height:80px;background:rgba(8,13,25,0.8);color:#eaf1ff;font-size:1.7rem;border:1px solid rgba(138,76,255,0.25);'; b.onclick=()=>{ if(grid[i]||winner) return; grid[i]=turn; b.textContent=turn; beep(760,0.02); if(checkWin(turn)){ winner=turn; setScore(100); registerScore(game.id,100); showMessage(turn+' wins!'); } else if(grid.every(v=>v)){ winner='draw'; showMessage('Draw'); } else{ turn=turn==='X'?'O':'X'; aiMove(); }}; cont.appendChild(b);} function aiMove(){ const empties=grid.map((v,i)=>v===null?i:-1).filter(v=>v>=0); if(!empties.length||winner)return; const idx=empties[Math.floor(Math.random()*empties.length)]; grid[idx]='O'; cont.children[idx].textContent='O'; if(checkWin('O')){ winner='O'; showMessage('AI wins'); } }
      const msg=document.createElement('div'); msg.style.marginTop='10px'; area.appendChild(cont); area.appendChild(msg); function showMessage(text){ msg.textContent=text; }
      function checkWin(s){ return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(([a,b,c])=>grid[a]===s&&grid[b]===s&&grid[c]===s); }
    },
      hangman: (area,game)=>{ const words=['NEON','HUB','GAMER','PIXEL','CODER','ARCHIVE']; const word=words[Math.floor(Math.random()*words.length)]; let guessed=[]; let lives=7;
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
        document.addEventListener('keydown',keyHandler);
        registerGameCleanup(()=>document.removeEventListener('keydown', keyHandler));
        attachDirectionalSwipe(c, { up: ()=>move(0,-1), down: ()=>move(0,1), left: ()=>move(-1,0), right: ()=>move(1,0) });
        createTouchControls(area, [[{ label:'Up', onPress:()=>move(0,-1) }],[{ label:'Left', onPress:()=>move(-1,0) }, { label:'Down', onPress:()=>move(0,1) }, { label:'Right', onPress:()=>move(1,0) }]], { compact:true });
        draw();
      },
      slidingPuzzle: (area,game)=>{ const data=[1,2,3,4,5,6,7,8,null].sort(()=>Math.random()-0.5); const board=document.createElement('div'); board.style.display='grid'; board.style.gridTemplateColumns='repeat(3,70px)'; board.style.gridGap='6px'; const msg=document.createElement('div'); let moves=0;
        function draw(){ board.innerHTML=''; data.forEach((v,i)=>{ const btn=document.createElement('button'); btn.style='width:70px;height:70px;font-size:1.2rem;'; if(v) btn.textContent=v; else btn.style.visibility='hidden'; btn.onclick=()=>{ const empty = data.indexOf(null); const row=Math.floor(i/3), prow=Math.floor(empty/3), col=i%3, pcol=empty%3; if(Math.abs(row-prow)+Math.abs(col-pcol)===1){ data[empty]=data[i]; data[i]=null; moves++; setScore(moves); draw(); if(data.join(',')==='1,2,3,4,5,6,7,8,') { msg.textContent='Completed in '+moves+' moves'; registerScore(game.id, Math.max(0,200-moves)); } } }; board.appendChild(btn); }); }
        draw(); area.appendChild(board); area.appendChild(msg);
      },
      flappy: (area,game)=>{ const c=document.createElement('canvas'); c.width=300; c.height=250; c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let bird={x:80,y:120,vy:0}; let pipes=[]; let tick=0; let score=0; let alive=true;
        function draw(){ctx.fillStyle='#020e20';ctx.fillRect(0,0,c.width,c.height);pipes.forEach(p=>{ctx.fillStyle='#2b4278';ctx.fillRect(p.x,0,p.w,p.h);ctx.fillRect(p.x,p.h+p.gap,p.w,c.height);});ctx.fillStyle='#ffda65';ctx.beginPath();ctx.arc(bird.x,bird.y,8,0,Math.PI*2);ctx.fill(); ctx.fillStyle='#dcefff'; ctx.fillText('Score:'+score,10,16);}        
        function step(){ if(!alive) return; bird.vy += 0.3; bird.y += bird.vy; if(bird.y<8||bird.y>c.height-8){ alive=false; registerScore(game.id, score); return; } if(tick%95===0){ const h=60+Math.random()*90; pipes.push({x:c.width,w:30,h, gap:80}); } pipes.forEach((p,i)=>{p.x -=2; if(p.x<-40) pipes.splice(i,1); if(bird.x>p.x && bird.x<p.x+p.w && (bird.y<p.h || bird.y>p.h+p.gap)){ alive=false; registerScore(game.id, score);} if(p.x+ p.w< bird.x && !p.scored){ score++; setScore(score); p.scored=true; } }); draw(); tick++; }
        const flap = ()=>{ bird.vy=-5; beep(770,0.03); };
        const int=setInterval(step,20);
        c.addEventListener('click', flap);
        createTouchControls(area, [[{ label:'Jump', onPress:flap }]], { compact:true });
        registerGameCleanup(()=>{ clearInterval(int); c.removeEventListener('click', flap); });
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
        attachTouchMoveControl(c, ({ x })=>{ player.x=Math.max(0,Math.min(c.width-player.w,x-player.w/2)); });
        registerGameCleanup(()=>clearInterval(int));
      },
      platformJumper: (area,game)=>{ const c=document.createElement('canvas'); c.width=280;c.height=260; c.style.border='1px solid rgba(138,76,255,0.4)'; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:120,y:220,vy:0}; let platforms=[{x:60,y:240,w:140}], score=0; const t=setInterval(()=>{ player.vy+=0.25; player.y+=player.vy; if(player.y>c.height){ clearInterval(t); registerScore(game.id,score); }
        if(platforms.some(p=>player.x+10>p.x && player.x+10<p.x+p.w && player.y+12>p.y && player.y+12<p.y+5 && player.vy>0)){ player.vy=-6; score++; setScore(score); beep(700,0.02);} if(player.y<110){ platforms.forEach(p=>p.y+=2); score++; setScore(score);} if(Math.random()<0.01) platforms.push({x:Math.random()*200,y:-6,w:70+Math.random()*70}); platforms=platforms.filter(p=>p.y<290);
        ctx.fillStyle='#02061a'; ctx.fillRect(0,0,c.width,c.height); platforms.forEach(p=>{ctx.fillStyle='#5e78d5';ctx.fillRect(p.x,p.y,p.w,8);}); ctx.fillStyle='#ffdd5f'; ctx.fillRect(player.x,player.y,15,18); ctx.fillStyle='#d7e2ff'; ctx.fillText('Score:'+score,8,14);
      },20); area.onmousemove=e=>{ const r=c.getBoundingClientRect(); player.x=Math.max(0,Math.min(c.width-16,e.clientX-r.left-8)); };
      attachTouchMoveControl(c, ({ x })=>{ player.x=Math.max(0,Math.min(c.width-16,x-8)); });
      registerGameCleanup(()=>clearInterval(t));
      },
      endlessRunner: (area,game)=>{ const c=document.createElement('canvas'); c.width=330;c.height=200; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:40,y:150,yv:0}; let obstacles=[]; let score=0; const t=setInterval(()=>{ player.yv += 0.4; player.y += player.yv; if(player.y>150){ player.y=150; player.yv=0; } if(Math.random()<0.04) obstacles.push({x:330,y:150,w:16,h:16}); obstacles.forEach(o=>o.x-=3); if(obstacles.some(o=>o.x<player.x+16 && o.x+o.w>player.x && o.y<player.y+20 && o.y+o.h>player.y)){ clearInterval(t); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Game Over '+score,style:'color:#ff8c8c;'})); }
        obstacles=obstacles.filter(o=>o.x> -20); score++; setScore(score); ctx.fillStyle='#06112c'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#7ad7ff'; ctx.fillRect(player.x,player.y,20,20); obstacles.forEach(o=>{ctx.fillStyle='#f85858';ctx.fillRect(o.x,o.y,o.w,o.h);}); ctx.fillStyle='#d9e9ff'; ctx.fillText('Score:'+score,10,16); },20); area.onclick=()=>{ if(player.y===150){ player.yv=-7; beep(820,0.03); } };
        c.addEventListener('click', ()=>{ if(player.y===150){ player.yv=-7; beep(820,0.03); } });
        createTouchControls(area, [[{ label:'Jump', onPress:()=>{ if(player.y===150){ player.yv=-7; beep(820,0.03); } } }]], { compact:true });
        registerGameCleanup(()=>clearInterval(t));
      },
      dodgeBullets: (area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=250; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:150,y:210,w:20,h:20}; let bullets=[]; let score=0; const t=setInterval(()=>{ if(Math.random()<0.12) bullets.push({x:Math.random()*300,y:-10,r:4}); bullets.forEach(b=>b.y+=3.5); bullets=bullets.filter(b=>b.y<270); bullets.forEach(b=>{ if(Math.hypot(player.x+10-b.x,player.y+10-b.y)<14){ clearInterval(t); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Hit '+score,style:'color:#ff90b3;'})); }}); score++; setScore(score); ctx.fillStyle='#031225'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#6acdf6'; ctx.fillRect(player.x,player.y,player.w,player.h); bullets.forEach(b=>{ctx.fillStyle='#ffed4f';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#e8f4ff'; ctx.fillText('Score:'+score,10,16); },20); area.onmousemove=e=>{ const r=c.getBoundingClientRect(); player.x=Math.min(Math.max(0,e.clientX-r.left-player.w/2),c.width-player.w); };
        attachTouchMoveControl(c, ({ x })=>{ player.x=Math.min(Math.max(0,x-player.w/2),c.width-player.w); });
        registerGameCleanup(()=>clearInterval(t));
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
          attachTouchMoveControl(canvas, ({ x, y })=>{ cannon.angle=Math.atan2(y-cannon.y,x-cannon.x); draw(); });
          createTouchControls(area, [[{ label:'Fire', onPress:()=>{ bullets.push({x:cannon.x+Math.cos(cannon.angle)*16, y:cannon.y+Math.sin(cannon.angle)*16, dx:Math.cos(cannon.angle)*6, dy:Math.sin(cannon.angle)*6}); } }]], { compact:true });
          const cannonLoop=setInterval(()=>{ bullets.forEach((b,i)=>{ b.x+=b.dx; b.y+=b.dy; if(b.x<0||b.x>300||b.y<0||b.y>220) bullets.splice(i,1); targets.forEach((t,j)=>{ if(Math.hypot(t.x-b.x,t.y-b.y)<t.r){ targets.splice(j,1); bullets.splice(i,1); score+=12; setScore(score); targets.push({x:Math.random()*260+20,y:Math.random()*80+20,r:10}); }}); }); draw(); },20);
          registerGameCleanup(()=>clearInterval(cannonLoop));
      },
      simpleRacing:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let car={x:150,y:180}; let obs=[]; let score=0; const t=setInterval(()=>{ if(Math.random()<0.06) obs.push({x:Math.random()*260+20,y:-20,w:20,h:30}); obs.forEach(o=>o.y+=2.2); obs=obs.filter(o=>o.y<250); if(obs.some(o=>o.x<car.x+24 && o.x+o.w>car.x && o.y<car.y+30 && o.y+o.h>car.y)){ clearInterval(t); registerScore(game.id,score); area.appendChild(Object.assign(document.createElement('div'),{textContent:'Crash! '+score,style:'color:#ff8a8a;'})); }
        score++; setScore(score); ctx.fillStyle='#0a1330'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#2bffb9'; ctx.fillRect(car.x,car.y,20,30); obs.forEach(o=>{ctx.fillStyle='#ff7167';ctx.fillRect(o.x,o.y,o.w,o.h);}); ctx.fillStyle='#e2eeff'; ctx.fillText('Score:'+score,10,16); },20); area.onmousemove=e=>{ const r=c.getBoundingClientRect(); car.x=Math.min(Math.max(10, e.clientX-r.left-10), c.width-30); };
        attachTouchMoveControl(c, ({ x })=>{ car.x=Math.min(Math.max(10, x-10), c.width-30); });
        registerGameCleanup(()=>clearInterval(t));
      },
      basketballShot:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let ball={x:160,y:190,vy:0,vx:0,moving:false}; let score=0; const net={x:270,y:70,w:12,h:26}; function draw(){ ctx.fillStyle='#08203b'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#ffab3f'; ctx.beginPath(); ctx.arc(ball.x,ball.y,8,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(net.x,net.y,net.w,net.h); ctx.fillText('Score:'+score,10,18); }
        c.onclick=()=>{ if(!ball.moving){ ball.vx=(net.x-ball.x)/30; ball.vy=-5; ball.moving=true; } }
        const int=setInterval(()=>{ if(ball.moving){ ball.x+=ball.vx; ball.y+=ball.vy; ball.vy+=0.18; if(ball.y>200){ ball.moving=false; ball.x=160; ball.y=190; } if(ball.x>net.x && ball.x<net.x+net.w && ball.y>net.y && ball.y<net.y+net.h){ score+=2; setScore(score); registerScore(game.id,score); ball.moving=false; ball.x=160; ball.y=190; } } draw(); },20);
        createTouchControls(area, [[{ label:'Shoot', onPress:()=>{ if(!ball.moving){ ball.vx=(net.x-ball.x)/30; ball.vy=-5; ball.moving=true; } } }]], { compact:true });
        registerGameCleanup(()=>clearInterval(int));
      },
      penaltyKick:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let angle=0, power=0; let score=0; function draw(){ ctx.fillStyle='#061226'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#fff'; ctx.fillRect(260,80,8,40);ctx.fillStyle='#f2f'; ctx.fillText('Score:'+score,10,18); ctx.fillStyle='#ff3'; ctx.fillRect(150,180,10,10); ctx.strokeStyle='#63f'; ctx.beginPath(); ctx.moveTo(155,185); ctx.lineTo(155+Math.cos(angle)*power*10,185-Math.sin(angle)*power*10); ctx.stroke(); }
          c.onmousemove=e=>{ const r=c.getBoundingClientRect(); const dx=e.clientX-r.left-155; const dy=(e.clientY-r.top-185); angle=Math.atan2(-dy,dx); power=Math.min(1,Math.hypot(dx,dy)/80); draw(); };
          c.onclick=()=>{ const pos={x:155+Math.cos(angle)*power*80, y:185-Math.sin(angle)*power*80}; if(pos.x>255 && pos.x<280 && pos.y>80 && pos.y<120){ score+=10; setScore(score); registerScore(game.id,score); beep(900,0.05);} else beep(300,0.07); }
          attachTouchMoveControl(c, ({ x, y })=>{ const dx=x-155; const dy=y-185; angle=Math.atan2(-dy,dx); power=Math.min(1,Math.hypot(dx,dy)/80); draw(); });
          createTouchControls(area, [[{ label:'Kick', onPress:()=>{ const pos={x:155+Math.cos(angle)*power*80, y:185-Math.sin(angle)*power*80}; if(pos.x>255 && pos.x<280 && pos.y>80 && pos.y<120){ score+=10; setScore(score); registerScore(game.id,score); beep(900,0.05);} else beep(300,0.07); } }]], { compact:true });
      },
      fishingGame:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let hook={x:160,y:40}; let fish={x:Math.random()*280+20,y:100,vx:1.5}; let score=0; function draw(){ ctx.fillStyle='#05243c'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#fff'; ctx.fillRect( hook.x,hook.y,2,20); ctx.fillStyle='#ffeb5f'; ctx.fillRect(fish.x,fish.y,16,8); ctx.fillText('Score:'+score,10,18);} setInterval(()=>{ fish.x += fish.vx; if(fish.x<20||fish.x>300) fish.vx*=-1; if(Math.abs(fish.x-hook.x)<10 && Math.abs(fish.y-hook.y)<12){ score+=15; setScore(score); registerScore(game.id,score); fish.x=Math.random()*280+20; } draw(); },30); area.onmousemove=e=>{ const r=area.getBoundingClientRect(); hook.x = Math.min(Math.max(20, e.clientX-r.left), 300); draw(); };
        attachTouchMoveControl(c, ({ x })=>{ hook.x = Math.min(Math.max(20, x), 300); draw(); });
      },
      coinCollector:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let player={x:150,y:190}; let coins=[]; let score=0; setInterval(()=>{ if(Math.random()<0.08) coins.push({x:Math.random()*300+10,y:-10}); coins.forEach(cn=>cn.y+=1.8); coins.forEach((cn,i)=>{ if(Math.hypot(cn.x-player.x-10,cn.y-player.y-10)<16){ coins.splice(i,1); score+=5; setScore(score); registerScore(game.id,score); } }); ctx.fillStyle='#0c1a32'; ctx.fillRect(0,0,320,220); ctx.fillStyle='#6bbfff'; ctx.fillRect(player.x,player.y,20,20); coins.forEach(cn=>{ctx.fillStyle='#ffd740';ctx.beginPath();ctx.arc(cn.x,cn.y,6,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#e7f2ff'; ctx.fillText('Score:'+score,10,18); },20); area.onmousemove=e=>{ const r=area.getBoundingClientRect(); player.x=Math.min(Math.max(0,e.clientX-r.left-10),300); };
        attachTouchMoveControl(c, ({ x })=>{ player.x=Math.min(Math.max(0,x-10),300); });
      },
      balloonPop:(area,game)=>{ area.style.position='relative'; let score=0; const txt=document.createElement('div'); txt.textContent='Score:0'; txt.style='margin-bottom:8px;'; area.appendChild(txt); const interval=setInterval(()=>{ const b=document.createElement('div'); const size=24; b.style=`position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#ff61ac;left:${Math.random()*(area.clientWidth-size)}px;top:${area.clientHeight}px;transition:top 4s linear;`; area.appendChild(b); setTimeout(()=>b.style.top='-30px',20); const id=setTimeout(()=>{ b.remove(); },4100); b.onclick=()=>{ clearTimeout(id); b.remove(); score += 1; txt.textContent='Score:'+score; setScore(score); registerScore(game.id,score); beep(750,0.02);} },700); setTimeout(()=>clearInterval(interval),20000);
      },
      tileTapping:(area,game)=>{ const grid=document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(4,60px)'; grid.style.gridGap='6px'; let sequence=[]; let step=0; let score=0; const msg=document.createElement('div'); for(let i=0;i<16;i++){ const btn=document.createElement('button'); btn.textContent=''; btn.style='width:60px;height:60px;background:#152644;'; btn.onclick=()=>{ if(sequence[step]===i){ step++; if(step===sequence.length){ score+=10; setScore(score); sequence.push(Math.floor(Math.random()*16)); step=0; playSequence(); } } else { msg.textContent='Wrong'; registerScore(game.id,score); } }; grid.appendChild(btn); }
        area.appendChild(msg); area.appendChild(grid);
        const playSequence=()=>{ sequence.forEach((idx,i)=>setTimeout(()=>{ grid.children[idx].style.background='#8a4cff'; setTimeout(()=>grid.children[idx].style.background='#152644',300); }, i*500)); }; sequence=[Math.floor(Math.random()*16)]; playSequence(); },
      fruitSlicing:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=220; area.appendChild(c); const ctx=c.getContext('2d'); let fruits=[]; let score=0; setInterval(()=>{ if(Math.random()<0.1) fruits.push({x:Math.random()*300,y:220,r:12,vy:-5}); fruits.forEach(f=>f.y+=f.vy); fruits=fruits.filter(f=>f.y>-20); ctx.fillStyle='#041a2b'; ctx.fillRect(0,0,320,220); fruits.forEach(f=>{ctx.fillStyle='#ff625d';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();}); ctx.fillStyle='#e7f2ff'; ctx.fillText('Score:'+score,10,18); },20); c.onmousemove=e=>{ const r=c.getBoundingClientRect(); const mx=e.clientX-r.left, my=e.clientY-r.top; fruits.forEach((f,i)=>{ if(Math.hypot(mx-f.x,my-f.y)<f.r){ fruits.splice(i,1); score+=5; setScore(score); registerScore(game.id,score); } }); }; attachTouchMoveControl(c, ({ x, y })=>{ fruits.forEach((f,i)=>{ if(Math.hypot(x-f.x,y-f.y)<f.r){ fruits.splice(i,1); score+=5; setScore(score); registerScore(game.id,score); } }); }); },
      fallingStars:(area,game)=>{ const c=document.createElement('canvas'); c.width=320;c.height=230; area.appendChild(c); const ctx=c.getContext('2d'); let bucket={x:140,y:200,w:40,h:14}; let stars=[]; let score=0; const starLoop=setInterval(()=>{ if(Math.random()<0.12) stars.push({x:Math.random()*300,y:0}); stars.forEach(s=>s.y+=3); stars=stars.filter(s=>{ if(s.y>230) return false; if(s.x>bucket.x && s.x<bucket.x+bucket.w && s.y>bucket.y){ score++; setScore(score); registerScore(game.id,score); return false; } return true; }); ctx.fillStyle='#051e36'; ctx.fillRect(0,0,320,230); stars.forEach(s=>{ctx.fillStyle='#fff';ctx.fillRect(s.x,s.y,3,7);}); ctx.fillStyle='#9df3ff'; ctx.fillRect(bucket.x,bucket.y,bucket.w,bucket.h); ctx.fillStyle='#d7edff'; ctx.fillText('Score:'+score,8,16); },20); area.onmousemove=e=>{ const r=area.getBoundingClientRect(); bucket.x=Math.max(0, Math.min(280, e.clientX-r.left-20)); }; attachTouchMoveControl(c, ({ x })=>{ bucket.x=Math.max(0, Math.min(280, x-20)); }); registerGameCleanup(()=>clearInterval(starLoop)); },
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
        const c=document.createElement('canvas'); c.width=380; c.height=560;
        c.style.cssText='max-width:100%;border:2px solid rgba(255,255,255,0.2);border-radius:10px;background:#0a0d14;';
        area.appendChild(c);
        const ctx=c.getContext('2d');
        const lanes=[110,190,270]; let lane=1;
        let y=470, vy=0, roll=0, t=0, score=0, alive=true;
        let objs=[];
        const onKey=(e)=>{ if(!alive) return; if((e.key==='ArrowLeft'||e.key==='a')&&lane>0) lane--; if((e.key==='ArrowRight'||e.key==='d')&&lane<2) lane++; if((e.key==='ArrowUp'||e.key==='w')&&y>=470){ vy=-11; } if((e.key==='ArrowDown'||e.key==='s')) roll=20; };
        document.addEventListener('keydown', onKey);
        registerGameCleanup(()=>document.removeEventListener('keydown', onKey));
        const moveLaneLeft = ()=>{ if(!alive || lane<=0) return; lane--; };
        const moveLaneRight = ()=>{ if(!alive || lane>=2) return; lane++; };
        const jumpRunner = ()=>{ if(!alive || y<470) return; vy=-11; };
        const rollRunner = ()=>{ if(!alive) return; roll=20; };
        attachDirectionalSwipe(c, { up: jumpRunner, down: rollRunner, left: moveLaneLeft, right: moveLaneRight });
        createTouchControls(area, [[{ label:'Jump', onPress:jumpRunner }],[{ label:'Left', onPress:moveLaneLeft }, { label:'Roll', onPress:rollRunner }, { label:'Right', onPress:moveLaneRight }]]);
        const spawn=()=>{ const type=Math.random()<0.7?'coin':'train'; objs.push({type, lane:Math.floor(Math.random()*3), z:0}); };
        const int=setInterval(()=>{ if(!alive) return; t++; if(t%24===0) spawn();
          vy += 0.6; y = Math.min(470, y + vy); if(y===470) vy=0; if(roll>0) roll--;
          score += 1; setScore(score);
          ctx.fillStyle='#1a2e4a'; ctx.fillRect(0,0,c.width,c.height);
          ctx.fillStyle='#203b62'; ctx.fillRect(70,0,240,560);
          ctx.strokeStyle='#9fbadf'; ctx.lineWidth=2; ctx.setLineDash([10,14]);
          ctx.beginPath(); ctx.moveTo(150,0); ctx.lineTo(150,560); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(230,0); ctx.lineTo(230,560); ctx.stroke(); ctx.setLineDash([]);
          objs.forEach(o=>{ o.z += 10; const size=Math.max(10, 18 + o.z*0.08); const oy=70 + o.z;
            if(o.type==='coin'){ ctx.fillStyle='#ffd54f'; ctx.beginPath(); ctx.arc(lanes[o.lane], oy, size*0.5, 0, Math.PI*2); ctx.fill(); }
            else { ctx.fillStyle='#e53935'; ctx.fillRect(lanes[o.lane]-size*0.6, oy-size*0.5, size*1.2, size*1.2); }
            const hitY = oy > y-20 && oy < y+30;
            if(hitY && Math.abs(lanes[o.lane]-lanes[lane]) < 24){
              if(o.type==='coin'){ o.hit=true; score += 20; beep(900,0.02); setScore(score); }
              else if(roll===0 && y>430){ alive=false; registerScore(game.id, score); }
            }
          });
          objs = objs.filter(o=>!o.hit && o.z<620);
          ctx.fillStyle='#29b6f6'; ctx.fillRect(lanes[lane]-14, y-(roll>0?12:26), 28, roll>0?14:28);
          ctx.fillStyle='#e8f3ff'; ctx.fillText('Score: '+score, 12, 22);
          if(!alive){ ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#fff'; ctx.font='bold 30px sans-serif'; ctx.fillText('Crashed!', 140, 280); clearInterval(int); document.removeEventListener('keydown', onKey); }
        }, 33);
        registerGameCleanup(()=>clearInterval(int));
      },
      subwaySurfers:(area,game)=>{ gameEngines.subwaySurfer(area,game); },
      slope3D:(area,game)=>{
        const c=document.createElement('canvas'); c.width=380; c.height=560;
        c.style.cssText='max-width:100%;border:2px solid rgba(255,255,255,0.2);border-radius:10px;background:#060a12;';
        area.appendChild(c);
        const ctx=c.getContext('2d');
        let ball={x:190,y:470,vx:0}, speed=2, score=0, alive=true;
        const onMove=(e)=>{ const r=c.getBoundingClientRect(); const tx=e.clientX-r.left; ball.vx=(tx-ball.x)*0.08; };
        c.addEventListener('mousemove', onMove);
        registerGameCleanup(()=>c.removeEventListener('mousemove', onMove));
        createTouchControls(area, [[{ label:'Left', onPress:()=>{ ball.vx = -6; } }, { label:'Right', onPress:()=>{ ball.vx = 6; } }]], { compact:true });
        const int=setInterval(()=>{ if(!alive) return; score++; speed += 0.01; setScore(score);
          ctx.fillStyle='#0a1330'; ctx.fillRect(0,0,380,560);
          for(let i=0;i<16;i++){ const y=i*40+((score*speed)%40); const w=240-(i*8); ctx.fillStyle=i%2?'#2d4f87':'#335c9f'; ctx.fillRect(190-w/2,y,w,36); }
          ball.x += ball.vx; ball.y -= speed*0.4; if(ball.y<180) ball.y=470;
          const trackHalf=90; if(ball.x<190-trackHalf||ball.x>190+trackHalf){ alive=false; registerScore(game.id, score); }
          ctx.fillStyle='#ffca28'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 12, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle='#e8f3ff'; ctx.fillText('Score: '+score,12,22);
          if(!alive){ ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,380,560); ctx.fillStyle='#fff'; ctx.font='bold 28px sans-serif'; ctx.fillText('Fell Off!', 130, 280); clearInterval(int); c.removeEventListener('mousemove', onMove); }
        },33);
        registerGameCleanup(()=>clearInterval(int));
      },
      carRacer3D:(area,game)=>{
        const c=document.createElement('canvas'); c.width=380; c.height=560;
        c.style.cssText='max-width:100%;border:2px solid rgba(255,255,255,0.2);border-radius:10px;background:#070d1a;';
        area.appendChild(c);
        const ctx=c.getContext('2d');
        let carX=190, score=0, alive=true, obs=[];
        const onCarMove = (e)=>{ const r=c.getBoundingClientRect(); carX=Math.max(90,Math.min(290,e.clientX-r.left)); };
        c.addEventListener('mousemove', onCarMove);
        registerGameCleanup(()=>c.removeEventListener('mousemove', onCarMove));
        createTouchControls(area, [[{ label:'Left', onPress:()=>{ carX=Math.max(90, carX-36); } }, { label:'Right', onPress:()=>{ carX=Math.min(290, carX+36); } }]], { compact:true });
        const int=setInterval(()=>{ if(!alive) return; score++; setScore(score);
          if(Math.random()<0.08) obs.push({x:90+Math.random()*200,y:-30,w:24,h:40});
          ctx.fillStyle='#0e1b34'; ctx.fillRect(0,0,380,560);
          ctx.fillStyle='#314e7b'; ctx.fillRect(80,0,220,560);
          ctx.setLineDash([14,12]); ctx.strokeStyle='#d6e5ff'; ctx.beginPath(); ctx.moveTo(190,0); ctx.lineTo(190,560); ctx.stroke(); ctx.setLineDash([]);
          obs.forEach(o=>{ o.y += 7; ctx.fillStyle='#ff5252'; ctx.fillRect(o.x,o.y,o.w,o.h); if(o.y>500 && o.y<544 && Math.abs((o.x+12)-carX)<20){ alive=false; registerScore(game.id, score); } });
          obs = obs.filter(o=>o.y<600);
          ctx.fillStyle='#40c4ff'; ctx.fillRect(carX-14,510,28,40);
          ctx.fillStyle='#e8f3ff'; ctx.fillText('Score: '+score,12,22);
          if(!alive){ ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,380,560); ctx.fillStyle='#fff'; ctx.font='bold 28px sans-serif'; ctx.fillText('Crash!', 150, 280); clearInterval(int); }
        },33);
        registerGameCleanup(()=>clearInterval(int));
      }
    };

    window.addEventListener('message', (event)=>{
      if(!event.data || event.data.type !== 'closeModal') return;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({type:'closeModal'}, '*');
      }
    });

    const games = [
      {id: 'snake', title:'Snake', icon:'🐍', category:'Classic Arcade', desc:'Eat apples, grow long, avoid walls and yourself.', engine:'snake'},
      {id: 'pong', title:'Pong', icon:'🏓', category:'Classic Arcade', desc:'Move your paddle to keep the ball alive.', engine:'pong'},
      {id: 'subway', title:'Subway Surfer 3D', icon:'🏃', category:'3D Action', desc:'Run, jump, and dodge trains in 3D.', engine:'subwaySurfer'},
      {id: 'breakout', title:'Breakout', icon:'🧱', category:'Classic Arcade', desc:'Break all bricks with the ball.', engine:'breakout'},
      {id: 'space-invaders', title:'Space Invaders', icon:'👾', category:'Classic Arcade', desc:'Defend your base from alien waves.', engine:'spaceInvaders'},
      {id: 'asteroids', title:'Asteroids', icon:'☄️', category:'Classic Arcade', desc:'Fly and shoot asteroids in space.', engine:'asteroids'},
      {id: 'pacman', title:'Pac-Man Maze', icon:'🟡', category:'Classic Arcade', desc:'Collect all dots while avoiding ghosts.', engine:'pacman'},
      {id: 'tic-tac-toe', title:'Tic Tac Toe (AI)', icon:'⭕', category:'Puzzle / Logic', desc:'Beat the computer in 3-in-a-row.', engine:'ticTacToe'},
      {id: 'hangman', title:'Hangman', icon:'🪓', category:'Puzzle / Logic', desc:'Guess the word before you run out.', engine:'hangman'},
      {id: 'memory', title:'Memory Match', icon:'🧠', category:'Puzzle / Logic', desc:'Match tile pairs with memory skill.', engine:'memoryMatch'},
      {id: 'scramble', title:'Word Scramble', icon:'🔤', category:'Puzzle / Logic', desc:'Rearrange letters into a word.', engine:'wordScramble'},
      {id: 'guess-number', title:'Number Guessing', icon:'🔢', category:'Puzzle / Logic', desc:'Guess the secret number in few tries.', engine:'numberGuessing'},
      {id: 'sudoku', title:'Sudoku Mini', icon:'🧩', category:'Puzzle / Logic', desc:'Fill all squares 1-4 in each row,col,block.', engine:'sudokuMini'},
      {id: 'simon', title:'Simon Memory', icon:'🔵', category:'Puzzle / Logic', desc:'Repeat the color pattern correctly.', engine:'simon'},
      {id: 'maze-escape', title:'Maze Escape', icon:'🕵️', category:'Puzzle / Logic', desc:'Find the exit through the maze.', engine:'mazeEscape'},
      {id: 'sliding-puzzle', title:'Sliding Puzzle', icon:'⬜', category:'Puzzle / Logic', desc:'Arrange the tiles into order.', engine:'slidingPuzzle'},
      {id: 'flappy', title:'Flappy Bird Style', icon:'🐤', category:'Action / Skill', desc:'Tap to fly through the obstacles.', engine:'flappy'},
      {id: 'whack-a-mole', title:'Whack-a-Mole', icon:'🛠️', category:'Action / Skill', desc:'Hit as many moles as possible.', engine:'whackAMole'},
      {id: 'reaction', title:'Reaction Tester', icon:'⚡', category:'Action / Skill', desc:'Click quickly when the signal appears.', engine:'reactionTester'},
      {id: 'click-speed', title:'Click Speed Test', icon:'🖱️', category:'Action / Skill', desc:'Max clicks in 10 seconds.', engine:'clickSpeed'},
      {id: 'falling-obstacles', title:'Avoid Obstacles', icon:'🧱', category:'Action / Skill', desc:'Dodge falling blocks for points.', engine:'avoidFalling'},
      {id: 'platform-jumper', title:'Platform Jumper', icon:'⬆️', category:'Action / Skill', desc:'Jump across floating platforms.', engine:'platformJumper'},
      {id: 'endless-runner', title:'Endless Runner', icon:'🏃', category:'Action / Skill', desc:'Run forever while avoiding pitfall.', engine:'endlessRunner'},
      {id: 'dodge-bullets', title:'Dodge Bullets', icon:'🎯', category:'Action / Skill', desc:'Move to avoid bullets and survive.', engine:'dodgeBullets'},
      {id: 'timing-bar', title:'Timing Bar', icon:'⌛', category:'Action / Skill', desc:'Stop the bar on the target zone.', engine:'timingBar'},
      {id: 'tap-target', title:'Tap Moving Target', icon:'🎯', category:'Action / Skill', desc:'Tap the target as it moves fast.', engine:'tapMovingTarget'},
      {id: 'connect4', title:'Connect Four', icon:'🟡', category:'Strategy / Thinking', desc:'Get four in a row to win.', engine:'connectFour'},
      {id: 'rps', title:'Rock Paper Scissors', icon:'✊', category:'Strategy / Thinking', desc:'Beat the AI in best of 5.', engine:'rockPaperScissors'},
      {id: 'dice', title:'Dice Game', icon:'🎲', category:'Strategy / Thinking', desc:'Roll highest total for points.', engine:'diceGame'},
      {id: 'tower-stack', title:'Tower Stacking', icon:'🏗️', category:'Strategy / Thinking', desc:'Stack pieces without toppling.', engine:'towerStacking'},
      {id: 'block-drop', title:'Block Drop Puzzle', icon:'⬛', category:'Strategy / Thinking', desc:'Stack blocks and clear lines.', engine:'blockDrop'},
      {id: 'space-shooter', title:'Space Shooter', icon:'🚀', category:'Shooter / Arcade', desc:'Shoot enemies in space.', engine:'spaceShooter'},
      {id: 'alien-defense', title:'Alien Defense', icon:'🛡️', category:'Shooter / Arcade', desc:'Protect your base from aliens.', engine:'alienDefense'},
      {id: 'meteor-shooter', title:'Meteor Shooter', icon:'🌠', category:'Shooter / Arcade', desc:'Shoot down incoming meteors.', engine:'meteorShooter'},
      {id: 'target-range', title:'Target Shooting', icon:'🎯', category:'Shooter / Arcade', desc:'Hit targets as they appear.', engine:'targetShootingRange'},
      {id: 'cannon-aim', title:'Cannon Aim', icon:'🛳️', category:'Shooter / Arcade', desc:'Aim cannon and shoot moving ship.', engine:'cannonAim'},
      {id: 'racing', title:'Simple Racing', icon:'🏁', category:'Fun Casual', desc:'Drive and dodge obstacles.', engine:'simpleRacing'},
      {id: 'basketball', title:'Basketball Shot', icon:'⛹️', category:'Fun Casual', desc:'Score hoops by tapping at right time.', engine:'basketballShot'},
      {id: 'penalty', title:'Penalty Kick', icon:'🥅', category:'Fun Casual', desc:'Kick goal away from goalie.', engine:'penaltyKick'},
      {id: 'fishing', title:'Fishing Game', icon:'🎣', category:'Fun Casual', desc:'Catch fish with the right timing.', engine:'fishingGame'},
      {id: 'coin-collector', title:'Coin Collector', icon:'🪙', category:'Fun Casual', desc:'Collect coins while avoiding danger.', engine:'coinCollector'},
      {id: 'balloon-pop', title:'Balloon Popping', icon:'🎈', category:'Fun Casual', desc:'Pop all balloons before time.', engine:'balloonPop'},
      {id: 'tile-tap', title:'Tile Tapping', icon:'🟦', category:'Fun Casual', desc:'Tap only correct tiles in sequence.', engine:'tileTapping'},
      {id: 'fruit-slice', title:'Fruit Slicing', icon:'🍉', category:'Fun Casual', desc:'Slice fruits before they fall.', engine:'fruitSlicing'},
      {id: 'falling-stars', title:'Catch Falling Stars', icon:'🌟', category:'Fun Casual', desc:'Catch as many stars as possible.', engine:'fallingStars'},
      {id: 'random-mini', title:'Random Mini Challenge', icon:'🎲', category:'Fun Casual', desc:'A surprise challenge each play.', engine:'randomMini'},
      {id: 'color-match', title:'Color Match', icon:'🎨', category:'Extra Mini', desc:'Select the matching color quickly.', engine:'colorMatch'},
      {id: 'pattern-memory', title:'Pattern Memory', icon:'🧷', category:'Extra Mini', desc:'Repeat patterns from memory.', engine:'patternMemory'},
      {id: 'quick-math', title:'Quick Math', icon:'➗', category:'Extra Mini', desc:'Solve math problems fast.', engine:'quickMath'},
      {id: 'escape-box', title:'Escape Box Puzzle', icon:'📦', category:'Extra Mini', desc:'Find the way out by logic choices.', engine:'escapeBox'},
      {id: 'daily-challenge', title:'Random Daily Challenge', icon:'🌞', category:'Extra Mini', desc:'Different mini challenge everyday.', engine:'dailyChallenge'},
      {id: 'subway-surfers', title:'Subway Surfers 3D', icon:'🏃', category:'3D Action', desc:'Run through 3D tracks, dodge trains and obstacles.', engine:'subwaySurfers'},
      {id: 'slope-3d', title:'Slope 3D', icon:'🎾', category:'3D Action', desc:'Roll the ball down 3D slopes, avoid holes.', engine:'slope3D'},
      {id: 'car-racer-3d', title:'3D Car Racer', icon:'🏎️', category:'3D Racing', desc:'Race cars in 3D tracks with obstacles.', engine:'carRacer3D'}
    ];

    const localKey = 'arcadeHubHighScores';
    const achievementsKey = 'arcadeHubAchievements';
    const dailyKey = 'arcadeHubDailyScores';
    const profileKey = 'arcadeHubProfile';
    const themeKey = 'arcadeHubTheme';
    const musicPrefsKey = 'arcadeHubMusicPrefs';
    const accountsKey = 'arcadeHubAccounts';
    const activeAccountKey = 'arcadeHubActiveAccount';
    let accountList = [];
    let activeAccountId = '';
    let highScores = {};
    let achievements = {};
    let dailyScores = {};
    let playerProfile = {};
    let currentGame = null;
    let gameScore = 0;
    let practiceMode = false;
    let dailyGameId = null;
    let bossModeActive = false;
    let bossModeStage = 0;
    let bossModeScore = 0;
    let timerInterval = null;
    let musicNode = null;
    let musicTimers = [];
    let musicLiveNodes = [];
    let lofiNoiseBuffer = null;
    let musicVolume = 0.55;
    let musicStyle = 'warm';
    let homeTipTimer = null;
    let homeTipIndex = 0;
    let activeRunEnhancer = null;
    const runEnhancerModes = [
      { id:'momentum', name:'Momentum Surge', desc:'+15% score, +10% XP/coins this run.', scoreMult:1.15, xpMult:1.1, coinMult:1.1, bonusScore:60, bonusXp:45, bonusCoins:30 },
      { id:'risk', name:'Risk & Reward', desc:'+30% score, +20% XP/coins, tougher objective.', scoreMult:1.3, xpMult:1.2, coinMult:1.2, bonusScore:120, bonusXp:70, bonusCoins:55 },
      { id:'marathon', name:'Marathon Focus', desc:'+8% score, extra completion bonus for longer runs.', scoreMult:1.08, xpMult:1.18, coinMult:1.18, bonusScore:90, bonusXp:85, bonusCoins:65 }
    ];
    const homeTips = [
      'Tip: Daily Challenge gives bonus XP and coins once per day.',
      'Tip: Featured Shop items get a daily discount.',
      'Tip: Promo code WELCOME100 gives a quick coin boost.',
      'News: Seasonal shop stock rotates each day.',
      'Tip: Practice mode helps warm up before score runs.'
    ];
    let currentRun = { gameId: '', bestScore: -1, counted: false };
    const bossRules = [
      {mult:1.2, minScore:40, speedNote:'Fast Spawn'},
      {mult:1.55, minScore:70, speedNote:'Turbo Pace'},
      {mult:2.0, minScore:100, speedNote:'No Mercy'}
    ];
    const shopCatalog = [
      { id:'xp-booster', title:'XP Booster', cost:200, type:'xp', value:220, desc:'Instant +220 XP to speed up leveling.', oneTime:false, rarity:'common', unlockLevel:1 },
      { id:'unlock-token', title:'Unlock Token', cost:310, type:'unlock', value:1, desc:'Unlock one currently locked game instantly.', oneTime:false, rarity:'rare', unlockLevel:3 },
      { id:'coin-pass', title:'Coin Multiplier Pass', cost:260, type:'coin-pass', value:3, desc:'Next 3 score runs grant +20% coins.', oneTime:false, rarity:'rare', unlockLevel:4, stockDaily:1 },
      { id:'xp-weekend', title:'XP Weekend Pass', cost:380, type:'xp-window', value:1.25, windowDays:2, desc:'For 48 hours, all score runs grant +25% XP.', oneTime:false, rarity:'epic', unlockLevel:5, stockDaily:1 },
      { id:'streak-shield', title:'Streak Shield', cost:190, type:'streak-shield', value:1, desc:'Protect your login streak from one missed day.', oneTime:false, rarity:'common', unlockLevel:2, stockDaily:2 },
      { id:'quest-reroll', title:'Quest Reroll Token', cost:230, type:'quest-reroll', value:1, desc:'Instantly complete one unfinished daily quest.', oneTime:false, rarity:'rare', unlockLevel:4, stockDaily:1 },
      { id:'retro-theme', title:'Retro Theme License', cost:140, type:'theme', value:'retro', desc:'Own and equip the Retro theme.', oneTime:true, rarity:'common', unlockLevel:1 },
      { id:'cyber-theme', title:'Cyber Theme License', cost:170, type:'theme', value:'cyber', desc:'Own and equip the Cyber theme.', oneTime:true, rarity:'rare', unlockLevel:2 },
      { id:'dark-theme', title:'Dark Theme License', cost:190, type:'theme', value:'dark', desc:'Own and equip the Dark theme.', oneTime:true, rarity:'rare', unlockLevel:2 },
      { id:'forest-theme', title:'Forest Theme License', cost:210, type:'theme', value:'forest', desc:'Own and equip the Forest theme.', oneTime:true, rarity:'epic', unlockLevel:3 },
      { id:'sunset-theme', title:'Sunset Theme License', cost:210, type:'theme', value:'sunset', desc:'Own and equip the Sunset theme.', oneTime:true, rarity:'epic', unlockLevel:3 },
      { id:'ocean-theme', title:'Ocean Theme License', cost:220, type:'theme', value:'ocean', desc:'Own and equip the Ocean theme.', oneTime:true, rarity:'epic', unlockLevel:3 }
    ];
    const shopBundles = [
      { id:'starter-pack', title:'Starter Surge Pack', desc:'+140 XP, +100 coins, and 1 Streak Shield.', cost:280, oneTime:true, rarity:'rare', unlockLevel:1, grants:[{type:'xp', amount:140},{type:'coins', amount:100},{type:'streak-shield', amount:1}] },
      { id:'rank-climb', title:'Rank Climber Pack', desc:'+280 XP and 1 Quest Reroll Token.', cost:380, oneTime:false, rarity:'epic', unlockLevel:4, grants:[{type:'xp', amount:280},{type:'quest-reroll', amount:1}] },
      { id:'collector-pack', title:'Collector Utility Pack', desc:'+150 coins, 1 Unlock Token, and Coin Pass.', cost:490, oneTime:false, rarity:'mythic', unlockLevel:5, grants:[{type:'coins', amount:150},{type:'unlock', amount:1},{type:'coin-pass', amount:1}] }
    ];
    const promoCodes = {
      'WELCOME100': {type:'coins', amount:100, msg:'Welcome bonus: +100 coins'},
      'LEVELSURGE': {type:'xp', amount:220, msg:'XP boost: +220 XP'},
      'FREECYBER': {type:'theme', theme:'cyber', msg:'Unlocked Cyber Theme'},
      'UNLOCKNOW': {type:'unlock', amount:1, msg:'Unlocked 1 random locked game'}
    };
    const questCatalog = [
      { id:'q-play-3', label:'Play 3 games today', rewardXp:90, rewardCoins:70 },
      { id:'q-score-150', label:'Hit a score of 150+ once', rewardXp:120, rewardCoins:95 },
      { id:'q-try-2', label:'Play 2 different games today', rewardXp:80, rewardCoins:60 },
      { id:'q-shrine-turntable', label:'Build the anime shelf and unlock Shrine Turntable', rewardXp:0, rewardCoins:0, rewardMusicPlayer:'shrine', permanent:true },
      { id:'q-battle-deck', label:'Reach Lv 7 and score 220+ to unlock Battle Deck', rewardXp:0, rewardCoins:0, rewardMusicPlayer:'arena', permanent:true }
    ];
    const spinRewards = [
      { type:'coins', amount:120, label:'+120 coins' },
      { type:'xp', amount:180, label:'+180 XP' },
      { type:'unlock', amount:1, label:'Unlock 1 game' },
      { type:'coins', amount:220, label:'+220 coins JACKPOT' }
    ];
    const animeQuotesByGenre = {
      'Shonen': ['Dreams do not end when the episode does.', 'Train harder, glow louder, protect your crew.', 'Every comeback starts with one reckless step forward.'],
      'Seinen': ['Power without purpose is just noise.', 'Cool heads hit harder than loud voices.', 'A quiet rival can still shake the whole world.'],
      'Shojo': ['The heart notices details before the eyes do.', 'A soft moment can feel more powerful than a battle.', 'The right story makes ordinary days sparkle.'],
      'Isekai': ['If you landed in another world, make it yours.', 'Every strange world is an invitation to reinvent yourself.', 'Adventure begins the second the map stops making sense.'],
      'Slice of Life': ['Even small scenes can become favorite memories.', 'Comfort is a kind of magic too.', 'Some of the best arcs are just people being human.'],
      'Fantasy': ['Magic feels strongest when wonder survives.', 'Every legend starts as a rumor whispered at night.', 'A good fantasy leaves stardust on the floor after you leave.']
    };
    const animeDecorCatalog = [
      { id:'poster-wall', label:'Poster Wall', icon:'🖼️', cost:90, x:18, y:18 },
      { id:'plushie', label:'Hero Plushie', icon:'🧸', cost:120, x:72, y:92 },
      { id:'manga-stack', label:'Manga Stack', icon:'📚', cost:80, x:26, y:110 },
      { id:'katana', label:'Display Katana', icon:'🗡️', cost:150, x:82, y:32 },
      { id:'lantern', label:'Spirit Lantern', icon:'🏮', cost:110, x:58, y:18 },
      { id:'arcade', label:'Mini Arcade', icon:'🕹️', cost:170, x:8, y:92 }
    ];
    const animeBadgeCatalog = [
      { id:'otaku-initiate', label:'Otaku Initiate', icon:'🌟', desc:'Set your favorite anime.', check: p => Boolean(p.favoriteAnime) },
      { id:'collector-core', label:'Collector Core', icon:'🗂️', desc:'Own 3 anime room decor items.', check: p => (p.animeDecorOwned || []).length >= 3 },
      { id:'quest-slayer', label:'Quest Slayer', icon:'⚔️', desc:'3-day login streak.', check: p => Number(p.streak || 0) >= 3 },
      { id:'manga-hunter', label:'Manga Hunter', icon:'📚', desc:'Add 3 wishlist items.', check: p => (p.animeWishlist || []).length >= 3 },
      { id:'arcade-sensei', label:'Arcade Sensei', icon:'🕹️', desc:'Reach level 5.', check: p => Number(p.level || 1) >= 5 },
      { id:'legendary-fan', label:'Legendary Fan', icon:'👑', desc:'Unlock all basic decor.', check: p => (p.animeDecorOwned || []).length >= animeDecorCatalog.length }
    ];
    const animeMusicPlayers = [
      { id:'pocket', label:'Pocket Cassette', desc:'Soft retro glow for late-night episodes.', cost:0, unlockLevel:1, theme:'night', accent:'#5dd0ff' },
      { id:'shrine', label:'Shrine Turntable', desc:'Warm shrine tones with ceremonial pulse.', cost:240, unlockLevel:4, theme:'shrine', accent:'#ffd36e' },
      { id:'arena', label:'Battle Deck', desc:'Sharper peaks for showdown energy.', cost:420, unlockLevel:7, theme:'battle', accent:'#ff6d8a' }
    ];
    const seasonalEventCatalog = {
      spring: {
        id:'spring',
        title:'Sakura Season Festival',
        tagline:'Collect blossoms by building your wishlist.',
        questLabel:'Spring Festival: Save 5 wishlist titles',
        badge:{ id:'spring-festival', label:'Sakura Champion', icon:'🌸', desc:'Completed the spring seasonal event.' },
        decor:{ id:'sakura-lantern', label:'Sakura Lantern', icon:'🌸', cost:0, x:44, y:20 }
      },
      summer: {
        id:'summer',
        title:'Summer Beach Arc',
        tagline:'Keep a hot streak and keep playing.',
        questLabel:'Summer Arc: Play 4 games in one day',
        badge:{ id:'summer-arc', label:'Beach Arc Hero', icon:'🌊', desc:'Completed the summer seasonal event.' },
        decor:{ id:'surf-board', label:'Wave Board', icon:'🏄', cost:0, x:64, y:26 }
      },
      fall: {
        id:'fall',
        title:'Autumn Power-Up',
        tagline:'Unlock badges and rise through the ranks.',
        questLabel:'Autumn Arc: Unlock 4 badges',
        badge:{ id:'autumn-arc', label:'Maple Strategist', icon:'🍁', desc:'Completed the autumn seasonal event.' },
        decor:{ id:'maple-banner', label:'Maple Banner', icon:'🍁', cost:0, x:34, y:18 }
      },
      winter: {
        id:'winter',
        title:'Winter Finale',
        tagline:'Hit level 6 and claim your finale reward.',
        questLabel:'Winter Finale: Reach level 6',
        badge:{ id:'winter-finale', label:'Snow Finale Ace', icon:'❄️', desc:'Completed the winter seasonal event.' },
        decor:{ id:'snow-globe', label:'Snow Globe', icon:'❄️', cost:0, x:54, y:22 }
      }
    };
    const seasonalShopCatalog = {
      spring: [
        { id:'spring-petal-xp', title:'Petal XP Cache', cost:170, type:'xp', value:240, desc:'Spring event boost: instant +240 XP.', oneTime:false },
        { id:'spring-sakura-frame', title:'Sakura Banner Frame', cost:230, type:'collectible', value:'sakura-frame', desc:'Seasonal cosmetic for your fan profile banner.', oneTime:true }
      ],
      summer: [
        { id:'summer-wave-coins', title:'Wave Coin Bundle', cost:150, type:'coins', value:260, desc:'Beach arc payout: +260 coins.', oneTime:false },
        { id:'summer-surf-frame', title:'Surf Banner Frame', cost:230, type:'collectible', value:'surf-frame', desc:'Seasonal cosmetic for your fan profile banner.', oneTime:true }
      ],
      fall: [
        { id:'fall-maple-xp', title:'Maple XP Cache', cost:190, type:'xp', value:300, desc:'Autumn event boost: +300 XP.', oneTime:false },
        { id:'fall-maple-frame', title:'Maple Banner Frame', cost:230, type:'collectible', value:'maple-frame', desc:'Seasonal cosmetic for your fan profile banner.', oneTime:true }
      ],
      winter: [
        { id:'winter-frost-coins', title:'Frost Coin Bundle', cost:170, type:'coins', value:290, desc:'Winter finale payout: +290 coins.', oneTime:false },
        { id:'winter-snow-frame', title:'Snow Banner Frame', cost:230, type:'collectible', value:'snow-frame', desc:'Seasonal cosmetic for your fan profile banner.', oneTime:true }
      ]
    };
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let soundOn = true; let musicOn = false;
    let animeAmbientNodes = [];
    let animeVisualizerFrame = 0;
    let animeVisualizerRaf = null;
    const playerNameInput = document.querySelector('#playerName');

    function todayKey(){ return new Date().toISOString().split('T')[0]; }
    function yesterdayKey(){ const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; }
    function getXpForLevel(level){ return 120 + (level-1) * 65; }
    function accountScopedKey(base){ return base + '_' + activeAccountId; }
    function readJson(key, fallback){ try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
    function saveHighScores() { localStorage.setItem(accountScopedKey(localKey), JSON.stringify(highScores)); }
    function saveDailyScores(){ localStorage.setItem(accountScopedKey(dailyKey), JSON.stringify(dailyScores)); }
    function saveProfile(){ localStorage.setItem(accountScopedKey(profileKey), JSON.stringify(playerProfile)); }
    function saveAchievements(){ localStorage.setItem(accountScopedKey(achievementsKey), JSON.stringify(achievements)); }
    function saveMusicPrefs(){
      localStorage.setItem(accountScopedKey(musicPrefsKey), JSON.stringify({
        enabled: Boolean(musicOn),
        volume: Math.max(0, Math.min(1, Number(musicVolume) || 0.55)),
        style: String(musicStyle || 'warm')
      }));
    }
    function formatName() { const n = (playerNameInput?.value || '').trim(); return n || 'Player'; }
    function escapeHtml(v){ return String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    function saveAccountDirectory(){ localStorage.setItem(accountsKey, JSON.stringify(accountList)); }

    function showAccountMessage(text, good=false){
      const msg = document.getElementById('accountMessage');
      if(!msg) return;
      msg.textContent = text;
      msg.style.color = good ? '#7dff9f' : '#cfe1ff';
    }

    function ensureLegacyDataMigrated(accountId){
      const scopedProfile = profileKey + '_' + accountId;
      if(!localStorage.getItem(scopedProfile) && localStorage.getItem(profileKey)){
        localStorage.setItem(scopedProfile, localStorage.getItem(profileKey));
      }
      const scopedScores = localKey + '_' + accountId;
      if(!localStorage.getItem(scopedScores) && localStorage.getItem(localKey)){
        localStorage.setItem(scopedScores, localStorage.getItem(localKey));
      }
      const scopedAchievements = achievementsKey + '_' + accountId;
      if(!localStorage.getItem(scopedAchievements) && localStorage.getItem(achievementsKey)){
        localStorage.setItem(scopedAchievements, localStorage.getItem(achievementsKey));
      }
      const scopedDaily = dailyKey + '_' + accountId;
      if(!localStorage.getItem(scopedDaily) && localStorage.getItem(dailyKey)){
        localStorage.setItem(scopedDaily, localStorage.getItem(dailyKey));
      }
      const scopedTheme = themeKey + '_' + accountId;
      if(!localStorage.getItem(scopedTheme) && localStorage.getItem(themeKey)){
        localStorage.setItem(scopedTheme, localStorage.getItem(themeKey));
      }
      const scopedMusic = musicPrefsKey + '_' + accountId;
      if(!localStorage.getItem(scopedMusic)){
        localStorage.setItem(scopedMusic, JSON.stringify({ enabled:false, volume:0.55, style:'warm' }));
      }
    }

    function initializeAccounts(){
      accountList = readJson(accountsKey, []);
      if(!Array.isArray(accountList)) accountList = [];
      const legacyName = localStorage.getItem('arcadeHubPlayer') || 'Player';
      if(accountList.length === 0){
        const defaultId = 'acct-' + Date.now().toString(36);
        accountList = [{ id: defaultId, name: legacyName }];
        activeAccountId = defaultId;
        localStorage.setItem(activeAccountKey, activeAccountId);
        saveAccountDirectory();
        ensureLegacyDataMigrated(activeAccountId);
      } else {
        const saved = localStorage.getItem(activeAccountKey) || '';
        activeAccountId = accountList.some(a=>a.id===saved) ? saved : accountList[0].id;
        localStorage.setItem(activeAccountKey, activeAccountId);
        ensureLegacyDataMigrated(activeAccountId);
      }
      highScores = readJson(accountScopedKey(localKey), {});
      achievements = readJson(accountScopedKey(achievementsKey), {});
      dailyScores = readJson(accountScopedKey(dailyKey), {});
      playerProfile = readJson(accountScopedKey(profileKey), {});
    }

    function renderAccountList(){
      const select = document.getElementById('accountSelect');
      if(!select) return;
      select.innerHTML = '';
      accountList.forEach(acc=>{
        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = acc.name;
        if(acc.id === activeAccountId) option.selected = true;
        select.appendChild(option);
      });
    }

    function syncActiveAccountName(name){
      const clean = String(name || '').trim() || 'Player';
      const item = accountList.find(acc=>acc.id===activeAccountId);
      if(item) item.name = clean;
      saveAccountDirectory();
      renderAccountList();
    }

    function refreshAllForAccountSwitch(){
      hydrateProfile();
      syncActiveAccountName(playerProfile.name || 'Player');
      ensureDailyLoginReward();
      stopMusic();
      loadMusicPrefs();
      updateMusicControlUI();
      const themePref = localStorage.getItem(accountScopedKey(themeKey)) || 'neon';
      applyThemeSelection(isThemeOwned(themePref) ? themePref : 'neon');
      Components.Header.renderHeroButtons();
      Components.ProfilePanel.render();
      renderGlobalFanBanners();
      renderFanProfile();
      renderFeatured();
      renderContinuePlaying();
      renderHomeDashboard();
      renderTrending();
      renderQuestBoard();
      renderActivityFeed();
      renderAnimeLounge();
      openAnimeOnboardingIfNeeded();
      if(playerProfile.animeAmbientOn) startAnimeAmbient(); else stopAnimeAmbient();
      renderShop();
      renderSeasonalShop();
      renderGameGrid();
      showHighScores();
      renderAchievements();
      renderAccountList();
      if(playerNameInput) playerNameInput.value = playerProfile.name || '';
      if(musicOn) startMusic();
    }

    function switchAccount(accountId){
      if(!accountList.some(acc=>acc.id===accountId)) return;
      activeAccountId = accountId;
      localStorage.setItem(activeAccountKey, activeAccountId);
      highScores = readJson(accountScopedKey(localKey), {});
      achievements = readJson(accountScopedKey(achievementsKey), {});
      dailyScores = readJson(accountScopedKey(dailyKey), {});
      playerProfile = readJson(accountScopedKey(profileKey), {});
      refreshAllForAccountSwitch();
      const active = accountList.find(acc=>acc.id===activeAccountId);
      showAccountMessage('Switched to account: ' + (active?.name || 'Player'), true);
    }

    function createAccount(name){
      const clean = String(name || '').trim();
      if(!clean){ showAccountMessage('Enter a new account name first.'); return; }
      const id = 'acct-' + Date.now().toString(36) + Math.floor(Math.random()*9999).toString(36);
      accountList.push({ id, name: clean });
      saveAccountDirectory();
      localStorage.setItem(profileKey + '_' + id, JSON.stringify({ name: clean, ownedThemes:['neon'] }));
      localStorage.setItem(localKey + '_' + id, '{}');
      localStorage.setItem(achievementsKey + '_' + id, '{}');
      localStorage.setItem(dailyKey + '_' + id, '{}');
      localStorage.setItem(themeKey + '_' + id, 'neon');
      localStorage.setItem(musicPrefsKey + '_' + id, JSON.stringify({ enabled:false, volume:0.55, style:'warm' }));
      switchAccount(id);
      showAccountMessage('Created and switched to account: ' + clean, true);
    }

    function loadMusicPrefs(){
      const prefs = readJson(accountScopedKey(musicPrefsKey), { enabled:false, volume:0.55, style:'warm' });
      musicOn = Boolean(prefs.enabled);
      musicVolume = Math.max(0, Math.min(1, Number(prefs.volume) || 0.55));
      musicStyle = ['warm','rainy','night'].includes(String(prefs.style)) ? String(prefs.style) : 'warm';
    }

    function updateMusicControlUI(){
      const toggle = document.getElementById('musicToggle');
      if(toggle){
        toggle.classList.toggle('active', musicOn);
        toggle.textContent = musicOn ? 'Music On' : 'Music Off';
      }
      const volumeInput = document.getElementById('musicVolume');
      const volumeLabel = document.getElementById('musicVolumeLabel');
      const styleSelect = document.getElementById('musicStyleSelect');
      const percent = Math.round(musicVolume * 100);
      if(volumeInput) volumeInput.value = String(percent);
      if(volumeLabel) volumeLabel.textContent = percent + '%';
      if(styleSelect) styleSelect.value = musicStyle;
    }

    function getAccountExportData(accountId){
      const account = accountList.find(acc=>acc.id===accountId);
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        account: {
          id: accountId,
          name: account?.name || 'Player'
        },
        data: {
          profile: readJson(profileKey + '_' + accountId, {}),
          highScores: readJson(localKey + '_' + accountId, {}),
          achievements: readJson(achievementsKey + '_' + accountId, {}),
          dailyScores: readJson(dailyKey + '_' + accountId, {}),
          theme: localStorage.getItem(themeKey + '_' + accountId) || 'neon',
          musicPrefs: readJson(musicPrefsKey + '_' + accountId, { enabled:false, volume:0.55, style:'warm' })
        }
      };
    }

    function exportCurrentAccount(){
      if(!activeAccountId){ showAccountMessage('No active account selected.'); return; }
      const data = getAccountExportData(activeAccountId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const safeName = (data.account.name || 'account').replace(/[^a-z0-9-_]/gi, '_');
      link.href = URL.createObjectURL(blob);
      link.download = 'arcade-account-' + safeName + '.json';
      document.body.appendChild(link);
      link.click();
      setTimeout(()=>{ URL.revokeObjectURL(link.href); link.remove(); }, 100);
      showAccountMessage('Exported account: ' + data.account.name, true);
    }

    function getUniqueAccountName(base){
      const root = String(base || 'Imported Player').trim() || 'Imported Player';
      const existing = new Set(accountList.map(acc=>acc.name.toLowerCase()));
      if(!existing.has(root.toLowerCase())) return root;
      let i = 2;
      while(existing.has((root + ' ' + i).toLowerCase())) i++;
      return root + ' ' + i;
    }

    function importAccountPayload(payload){
      if(!payload || typeof payload !== 'object' || !payload.data){
        throw new Error('Invalid account file format.');
      }
      const id = 'acct-' + Date.now().toString(36) + Math.floor(Math.random()*9999).toString(36);
      const name = getUniqueAccountName(payload.account?.name || payload.data?.profile?.name || 'Imported Player');
      accountList.push({ id, name });
      saveAccountDirectory();
      localStorage.setItem(profileKey + '_' + id, JSON.stringify(payload.data.profile || { name }));
      localStorage.setItem(localKey + '_' + id, JSON.stringify(payload.data.highScores || {}));
      localStorage.setItem(achievementsKey + '_' + id, JSON.stringify(payload.data.achievements || {}));
      localStorage.setItem(dailyKey + '_' + id, JSON.stringify(payload.data.dailyScores || {}));
      localStorage.setItem(themeKey + '_' + id, payload.data.theme || 'neon');
      localStorage.setItem(musicPrefsKey + '_' + id, JSON.stringify(payload.data.musicPrefs || { enabled:false, volume:0.55, style:'warm' }));
      switchAccount(id);
      showAccountMessage('Imported and switched to account: ' + name, true);
    }

    function makeNoiseBuffer(){
      const length = Math.max(1, Math.floor(audioCtx.sampleRate * 0.2));
      const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<length;i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    function rememberMusicNode(node){
      musicLiveNodes.push(node);
      return node;
    }

    function playLofiTone(freq, duration, type, volume, when){
      const osc = rememberMusicNode(audioCtx.createOscillator());
      const gain = rememberMusicNode(audioCtx.createGain());
      const filter = rememberMusicNode(audioCtx.createBiquadFilter());
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(volume, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(when);
      osc.stop(when + duration + 0.05);
    }

    function playLofiNoise(duration, volume, highpassFreq, when){
      if(!lofiNoiseBuffer) lofiNoiseBuffer = makeNoiseBuffer();
      const src = rememberMusicNode(audioCtx.createBufferSource());
      src.buffer = lofiNoiseBuffer;
      const hp = rememberMusicNode(audioCtx.createBiquadFilter());
      hp.type = 'highpass';
      hp.frequency.value = highpassFreq;
      const gain = rememberMusicNode(audioCtx.createGain());
      gain.gain.setValueAtTime(volume, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      src.connect(hp);
      hp.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(when);
      src.stop(when + duration + 0.03);
    }

    initializeAccounts();

    function hydrateProfile() {
      const accountName = accountList.find(acc=>acc.id===activeAccountId)?.name || 'Player';
      playerProfile = {
        name: String(playerProfile.name || accountName || 'Player').trim() || 'Player',
        level: Number(playerProfile.level || 1),
        xp: Number(playerProfile.xp || 0),
        coins: Number(playerProfile.coins || 0),
        streak: Number(playerProfile.streak || 0),
        playStreak: Number(playerProfile.playStreak || 0),
        lastLoginDate: playerProfile.lastLoginDate || '',
        lastPlayedDate: playerProfile.lastPlayedDate || '',
        unlockedGames: Array.isArray(playerProfile.unlockedGames) ? playerProfile.unlockedGames : [],
        recentlyPlayed: Array.isArray(playerProfile.recentlyPlayed) ? playerProfile.recentlyPlayed : [],
        gameStats: playerProfile.gameStats || {},
        dailyChallengeClaimedDate: playerProfile.dailyChallengeClaimedDate || '',
        loginRewardClaimedDate: playerProfile.loginRewardClaimedDate || '',
        ownedThemes: Array.isArray(playerProfile.ownedThemes) ? playerProfile.ownedThemes : ['neon'],
        purchases: playerProfile.purchases || {},
        redeemedCodes: playerProfile.redeemedCodes || {},
        questClaims: playerProfile.questClaims || {},
        spinClaimedDate: playerProfile.spinClaimedDate || '',
        activityLog: Array.isArray(playerProfile.activityLog) ? playerProfile.activityLog : [],
        playHistoryDaily: playerProfile.playHistoryDaily || {},
        favoriteAnime: playerProfile.favoriteAnime || '',
        animeGenre: playerProfile.animeGenre || 'Shonen',
        animeWishlist: Array.isArray(playerProfile.animeWishlist) ? playerProfile.animeWishlist : [],
        animeSearchHistory: Array.isArray(playerProfile.animeSearchHistory) ? playerProfile.animeSearchHistory : [],
        animeVibe: playerProfile.animeVibe || 'epic',
        animeWallpaperIndex: Number(playerProfile.animeWallpaperIndex || 0),
        animeDecorOwned: Array.isArray(playerProfile.animeDecorOwned) ? playerProfile.animeDecorOwned : ['poster-wall'],
        animeDecorEquipped: Array.isArray(playerProfile.animeDecorEquipped) ? playerProfile.animeDecorEquipped : ['poster-wall'],
        animeAmbientTheme: playerProfile.animeAmbientTheme || 'off',
        animeAmbientOn: Boolean(playerProfile.animeAmbientOn),
        animeBadges: Array.isArray(playerProfile.animeBadges) ? playerProfile.animeBadges : [],
        animeMusicOwned: Array.isArray(playerProfile.animeMusicOwned) ? playerProfile.animeMusicOwned : ['pocket'],
        animeMusicEquipped: playerProfile.animeMusicEquipped || 'pocket',
        animePermanentQuestClaims: playerProfile.animePermanentQuestClaims || {},
        animeSavedCards: Array.isArray(playerProfile.animeSavedCards) ? playerProfile.animeSavedCards : [],
        animeBannerCardId: playerProfile.animeBannerCardId || '',
        seasonalEventId: playerProfile.seasonalEventId || '',
        seasonalEventClaims: playerProfile.seasonalEventClaims || {},
        seasonalPurchases: playerProfile.seasonalPurchases || {},
        seasonalInventory: Array.isArray(playerProfile.seasonalInventory) ? playerProfile.seasonalInventory : [],
        equippedSeasonalFrame: playerProfile.equippedSeasonalFrame || '',
        runCoinBoostRuns: Number(playerProfile.runCoinBoostRuns || 0),
        xpBoostUntil: playerProfile.xpBoostUntil || '',
        streakShields: Number(playerProfile.streakShields || 0),
        questRerollTokens: Number(playerProfile.questRerollTokens || 0),
        dailyStockPurchases: playerProfile.dailyStockPurchases || {},
        bundlePurchases: playerProfile.bundlePurchases || {},
        questAutoClaims: playerProfile.questAutoClaims || {}
      };
      ensureSeasonalContent();
      unlockEligibleGames();
      syncAnimeBadges();
      saveProfile();
    }

    function getActiveSeasonalEvent(){
      const month = new Date().getMonth() + 1;
      if(month >= 3 && month <= 5) return seasonalEventCatalog.spring;
      if(month >= 6 && month <= 8) return seasonalEventCatalog.summer;
      if(month >= 9 && month <= 11) return seasonalEventCatalog.fall;
      return seasonalEventCatalog.winter;
    }

    function getSeasonalQuestId(eventId){
      return 'q-season-' + eventId;
    }

    function getSeasonEndDate(){
      const now = new Date();
      const year = now.getFullYear();
      const m = now.getMonth() + 1;
      if(m >= 3 && m <= 5) return new Date(year, 5, 1);
      if(m >= 6 && m <= 8) return new Date(year, 8, 1);
      if(m >= 9 && m <= 11) return new Date(year, 11, 1);
      if(m === 12) return new Date(year + 1, 2, 1);
      return new Date(year, 2, 1);
    }

    function getSeasonCountdownText(){
      const now = new Date();
      const end = getSeasonEndDate();
      const diffMs = Math.max(0, end.getTime() - now.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      return days + 'd ' + hours + 'h left this season';
    }

    function getSeasonalShopItems(){
      const event = getActiveSeasonalEvent();
      const catalog = seasonalShopCatalog[event.id] || [];
      const seed = daySeed();
      const rotated = [...catalog];
      if(rotated.length > 1){
        const shift = seed % rotated.length;
        for(let i=0;i<shift;i++) rotated.push(rotated.shift());
      }
      return rotated;
    }

    function ensureSeasonalContent(){
      const event = getActiveSeasonalEvent();
      playerProfile.seasonalEventId = event.id;
      if(!animeDecorCatalog.some(item=>item.id===event.decor.id)){
        animeDecorCatalog.push({ ...event.decor });
      }
      if(!animeBadgeCatalog.some(item=>item.id===event.badge.id)){
        animeBadgeCatalog.push({
          id: event.badge.id,
          label: event.badge.label,
          icon: event.badge.icon,
          desc: event.badge.desc,
          check: p => Boolean(p.seasonalEventClaims?.[event.id])
        });
      }
      const seasonalQuestId = getSeasonalQuestId(event.id);
      if(!questCatalog.some(item=>item.id===seasonalQuestId)){
        questCatalog.push({
          id: seasonalQuestId,
          label: event.questLabel,
          rewardXp: 140,
          rewardCoins: 120,
          rewardDecor: event.decor.id,
          rewardEvent: event.id,
          permanent: true
        });
      }
    }

    function getSeasonalProgress(event, totalPlays, highestBest){
      if(!event) return 0;
      if(event.id === 'spring') return (playerProfile.animeWishlist || []).length >= 5 ? 1 : 0;
      if(event.id === 'summer') return totalPlays >= 4 ? 1 : 0;
      if(event.id === 'fall') return (playerProfile.animeBadges || []).length >= 4 ? 1 : 0;
      if(event.id === 'winter') return Number(playerProfile.level || 1) >= 6 ? 1 : 0;
      return highestBest >= 180 ? 1 : 0;
    }

    function pushActivity(text){
      playerProfile.activityLog = [new Date().toLocaleTimeString() + ' - ' + text, ...playerProfile.activityLog].slice(0,16);
      saveProfile();
      renderActivityFeed();
      renderHomeDashboard();
    }

    function getUnlockLevel(game, idx){
      const hard = /3D|Shooter|Boss|Surfer|Slope|Racer/i.test(game.title + ' ' + game.category);
      return hard ? Math.min(14, 3 + Math.floor(idx / 6)) : Math.min(10, 1 + Math.floor(idx / 9));
    }
    function isGameUnlocked(game, idx){
      if(playerProfile.unlockedGames.includes(game.id)) return true;
      return playerProfile.level >= getUnlockLevel(game, idx);
    }
    function unlockEligibleGames(){
      games.forEach((g, idx)=>{
        if(playerProfile.level >= getUnlockLevel(g, idx) && !playerProfile.unlockedGames.includes(g.id)){
          playerProfile.unlockedGames.push(g.id);
        }
      });
    }

    function beep(freq=440,dur=0.05, vol=0.15) {
      if(!soundOn) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.value = vol;
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
      osc.onended = ()=>gain.disconnect();
    }

    function startMusic() {
      if(!musicOn) return;
      stopMusic();
      if(audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
      musicNode = { active:true };
      const styleDefs = {
        warm: { bpm:74, chord:[220.00,261.63,329.63], hat:0.012, snare:0.05, bass:0.09, melody:0.015 },
        rainy: { bpm:68, chord:[196.00,246.94,293.66], hat:0.008, snare:0.038, bass:0.08, melody:0.012 },
        night: { bpm:82, chord:[233.08,293.66,349.23], hat:0.015, snare:0.055, bass:0.095, melody:0.017 }
      };
      const style = styleDefs[musicStyle] || styleDefs.warm;
      const master = Math.max(0, Math.min(1, musicVolume));
      const bpm = style.bpm;
      const beatMs = (60 / bpm) * 1000;
      const chordProgression = [
        style.chord,
        [196.00, 246.94, 293.66],
        [174.61, 220.00, 261.63],
        [196.00, 233.08, 293.66]
      ];
      let step = 0;
      const loop = ()=>{
        if(!musicOn || !musicNode) return;
        const now = audioCtx.currentTime;
        const beat = step % 4;
        const chord = chordProgression[Math.floor(step / 4) % chordProgression.length];
        if(beat === 0){
          chord.forEach((freq, idx)=>playLofiTone(freq * (idx===0 ? 0.5 : 1), 0.68, 'triangle', (idx===0 ? 0.03 : 0.018) * master, now));
          playLofiTone(82.41, 0.11, 'sine', style.bass * master, now);
        }
        if(beat === 2){
          playLofiTone(92.50, 0.09, 'sine', style.bass * 0.88 * master, now);
        }
        if(beat === 1 || beat === 3){
          playLofiNoise(0.18, style.snare * master, musicStyle === 'rainy' ? 700 : 900, now);
        }
        playLofiNoise(0.04, style.hat * master, musicStyle === 'night' ? 6800 : 6000, now);
        if(beat === 3){
          const melody = [329.63, 293.66, 261.63, 246.94][Math.floor(Math.random()*4)];
          playLofiTone(melody, 0.18, musicStyle === 'night' ? 'triangle' : 'sawtooth', style.melody * master, now + 0.02);
        }
        step++;
      };
      loop();
      musicTimers.push(setInterval(loop, beatMs));
    }

    function stopMusic() {
      musicTimers.forEach(id=>clearInterval(id));
      musicTimers = [];
      musicLiveNodes.forEach(node=>{ try { node.stop?.(); } catch {} try { node.disconnect?.(); } catch {} });
      musicLiveNodes = [];
      musicNode = null;
    }

    function stopAnimeAmbient(){
      animeAmbientNodes.forEach(node=>{ try { node.stop?.(); node.disconnect?.(); } catch {} });
      animeAmbientNodes = [];
    }

    function getAnimeRankTitle(){
      const animeScore = (playerProfile.animeWishlist || []).length * 2 + (playerProfile.animeDecorOwned || []).length + (playerProfile.animeBadges || []).length * 2 + (playerProfile.animeSearchHistory || []).length;
      const arcadeScore = Number(playerProfile.level || 1) + Math.floor(Number(playerProfile.playStreak || 0) / 2);
      const total = animeScore + arcadeScore;
      if(total >= 32) return 'Mythic Otaku';
      if(total >= 24) return 'Elite Arcane Fan';
      if(total >= 16) return 'Captain of Vibes';
      if(total >= 9) return 'Arcade Senpai';
      return 'Rookie Dreamer';
    }

    function getEquippedAnimePlayer(){
      return animeMusicPlayers.find(item=>item.id===playerProfile.animeMusicEquipped) || animeMusicPlayers[0];
    }

    function buildAnimeFanCardCanvas(){
      const canvas = document.createElement('canvas');
      canvas.width = 860;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if(!ctx) return null;
      const rank = getAnimeRankTitle();
      const musicPlayer = getEquippedAnimePlayer();
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0d1730');
      gradient.addColorStop(1, '#251445');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(140,169,255,0.45)';
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
      ctx.fillStyle = '#f4f8ff';
      ctx.font = '700 34px Georgia';
      ctx.fillText('Anime Fan Identity Card', 42, 68);
      ctx.fillStyle = '#ffd36e';
      ctx.font = '700 22px Georgia';
      ctx.fillText(rank, 42, 106);
      ctx.fillStyle = '#bdd1ff';
      ctx.font = '20px Georgia';
      ctx.fillText('Favorite: ' + (playerProfile.favoriteAnime || 'Still choosing'), 42, 154);
      ctx.fillText('Genre: ' + (playerProfile.animeGenre || 'Shonen'), 42, 188);
      ctx.fillText('Vibe: ' + (playerProfile.animeVibe || 'epic'), 42, 222);
      ctx.fillText('Wishlist: ' + (playerProfile.animeWishlist || []).length, 42, 256);
      ctx.fillText('Decor Owned: ' + (playerProfile.animeDecorOwned || []).length, 42, 290);
      ctx.fillText('Badges: ' + (playerProfile.animeBadges || []).length, 42, 324);
      ctx.fillText('Arcade Level: ' + playerProfile.level, 42, 358);
      ctx.fillText('Music Player: ' + musicPlayer.label, 42, 392);
      ctx.fillStyle = musicPlayer.accent;
      ctx.fillRect(560, 118, 210, 210);
      ctx.fillStyle = '#08101e';
      ctx.beginPath();
      ctx.arc(665, 223, 76, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f8ff';
      ctx.font = '700 28px Georgia';
      ctx.fillText((playerProfile.favoriteAnime || 'Anime').slice(0, 14), 538, 372);
      return canvas;
    }

    function saveAnimeFanCardSnapshot(dataUrl){
      const snapshot = {
        id: 'fan-' + Date.now(),
        image: dataUrl,
        rank: getAnimeRankTitle(),
        favorite: playerProfile.favoriteAnime || 'Still choosing',
        player: getEquippedAnimePlayer().label,
        savedAt: new Date().toLocaleString()
      };
      playerProfile.animeSavedCards = [snapshot, ...(playerProfile.animeSavedCards || [])].slice(0, 6);
      if(!playerProfile.animeBannerCardId) playerProfile.animeBannerCardId = snapshot.id;
      saveProfile();
      renderAnimeFanGallery();
      renderGlobalFanBanners();
      renderFanProfile();
    }

    function getSelectedBannerCard(){
      const saved = playerProfile.animeSavedCards || [];
      if(!saved.length) return null;
      const match = saved.find(item=>item.id===playerProfile.animeBannerCardId);
      return match || saved[0];
    }

    function renderGlobalFanBanners(){
      const banner = getSelectedBannerCard();
      const frameId = playerProfile.equippedSeasonalFrame || '';
      const frameAccent = frameId.includes('snow') ? '#e0f4ff'
        : frameId.includes('surf') ? '#7fe6ff'
          : frameId.includes('maple') ? '#ffbe79'
            : frameId.includes('sakura') ? '#ff9dce'
              : 'rgba(140,169,255,0.45)';
      ['homeFanBanner','scoresFanBanner'].forEach(id=>{
        const mount = document.getElementById(id);
        if(!mount) return;
        if(!banner){
          mount.innerHTML = '<div style="color:#b8c8ea;font-size:0.86rem;">Save a fan card in Anime Zone to create your global banner.</div>';
          return;
        }
        mount.innerHTML = '<img src="' + escapeHtml(banner.image) + '" alt="Fan banner" style="border:2px solid ' + frameAccent + ';border-radius:10px;"><div><strong style="color:#f2f7ff;">' + escapeHtml(formatName()) + ' · ' + escapeHtml(banner.rank) + '</strong><div style="color:#c6d8ff;font-size:0.86rem;">Featured anime: ' + escapeHtml(banner.favorite) + ' · Player: ' + escapeHtml(banner.player) + (frameId ? ' · Frame: ' + escapeHtml(frameId) : '') + '</div></div>';
      });
    }

    function renderFanProfile(){
      const summary = document.getElementById('fanProfileSummary');
      const eventWrap = document.getElementById('fanSeasonalEvent');
      const bannerPreview = document.getElementById('fanProfileBannerPreview');
      const gallery = document.getElementById('fanProfileGallery');
      if(!summary || !eventWrap || !bannerPreview || !gallery) return;
      const rank = getAnimeRankTitle();
      summary.innerHTML = '<strong>' + escapeHtml(formatName()) + '</strong><br>Rank: ' + escapeHtml(rank) + '<br>Favorite anime: ' + escapeHtml(playerProfile.favoriteAnime || 'Not set') + '<br>Badges: ' + (playerProfile.animeBadges || []).length + ' · Saved cards: ' + (playerProfile.animeSavedCards || []).length;
      const event = getActiveSeasonalEvent();
      const eventClaimed = Boolean(playerProfile.seasonalEventClaims?.[event.id]);
      eventWrap.innerHTML = '<strong>' + escapeHtml(event.title) + '</strong><div style="margin-top:4px;font-size:0.9rem;">' + escapeHtml(event.tagline) + '</div><div class="seasonal-countdown">' + getSeasonCountdownText() + '</div><div style="margin-top:6px;font-size:0.85rem;color:#d6e6ff;">Status: ' + (eventClaimed ? 'Completed' : 'In Progress') + '</div>';
      const banner = getSelectedBannerCard();
      if(!banner){
        bannerPreview.innerHTML = '<div style="color:#b8c8ea;font-size:0.86rem;">No banner yet. Save a fan card first.</div>';
      } else {
        const frameId = playerProfile.equippedSeasonalFrame || '';
        const frameAccent = frameId.includes('snow') ? '#e0f4ff'
          : frameId.includes('surf') ? '#7fe6ff'
            : frameId.includes('maple') ? '#ffbe79'
              : frameId.includes('sakura') ? '#ff9dce'
                : 'rgba(140,169,255,0.45)';
        bannerPreview.innerHTML = '<div class="fan-banner" style="margin-top:0;"><img src="' + escapeHtml(banner.image) + '" alt="Banner preview" style="border:2px solid ' + frameAccent + ';border-radius:10px;"><div><strong style="color:#f2f7ff;">Current Banner</strong><div style="color:#c6d8ff;font-size:0.86rem;">' + escapeHtml(banner.favorite) + ' · ' + escapeHtml(banner.rank) + (frameId ? ' · Frame: ' + escapeHtml(frameId) : '') + '</div></div></div>';
      }
      const saved = playerProfile.animeSavedCards || [];
      if(!saved.length){
        gallery.innerHTML = '<div style="color:#b8c8ea;font-size:0.86rem;">No saved fan cards yet.</div>';
      } else {
        gallery.innerHTML = '';
        saved.forEach(item=>{
          const node = document.createElement('div');
          node.className = 'fan-profile-item';
          node.innerHTML = '<img src="' + escapeHtml(item.image) + '" alt="Saved fan card"><div style="margin-top:6px;color:#dce8ff;font-size:0.85rem;">' + escapeHtml(item.rank) + ' · ' + escapeHtml(item.favorite) + '</div><button data-set-banner="' + item.id + '">' + (playerProfile.animeBannerCardId === item.id ? 'Banner Equipped' : 'Set as Banner') + '</button>';
          const btn = node.querySelector('button');
          btn.disabled = playerProfile.animeBannerCardId === item.id;
          gallery.appendChild(node);
        });
      }
    }

    function buySeasonalItem(itemId){
      const item = getSeasonalShopItems().find(v=>v.id===itemId);
      if(!item) return;
      if(item.oneTime && playerProfile.seasonalPurchases[item.id]){
        showMessage('You already own ' + item.title + '.');
        return;
      }
      if(Number(playerProfile.coins || 0) < item.cost){
        showMessage('Not enough coins for ' + item.title + '.');
        return;
      }
      playerProfile.coins -= item.cost;
      if(item.type === 'xp') addXpAndCoins(item.value, 0);
      if(item.type === 'coins') addXpAndCoins(0, item.value);
      if(item.type === 'collectible' && !playerProfile.seasonalInventory.includes(item.value)){
        playerProfile.seasonalInventory.push(item.value);
        if(!playerProfile.equippedSeasonalFrame) playerProfile.equippedSeasonalFrame = item.value;
      }
      playerProfile.seasonalPurchases[item.id] = (playerProfile.seasonalPurchases[item.id] || 0) + 1;
      saveProfile();
      renderProfilePanel();
      renderSeasonalShop();
      renderFanProfile();
      showMessage('Purchased seasonal item: ' + item.title);
      pushActivity('Bought seasonal shop item: ' + item.title);
    }

    function renderSeasonalShop(){
      const meta = document.getElementById('seasonalShopMeta');
      const grid = document.getElementById('seasonalShopGrid');
      if(!meta || !grid) return;
      const event = getActiveSeasonalEvent();
      const items = getSeasonalShopItems();
      meta.textContent = event.title + ' | ' + getSeasonCountdownText();
      grid.innerHTML = '';
      items.forEach(item=>{
        const owned = Boolean(item.oneTime && playerProfile.seasonalPurchases[item.id]);
        const equipped = item.type === 'collectible' && playerProfile.equippedSeasonalFrame === item.value;
        const afford = Number(playerProfile.coins || 0) >= item.cost;
        const card = document.createElement('div');
        card.className = 'shop-item';
        const buttonLabel = owned
          ? (item.type === 'collectible' ? (equipped ? 'Equipped' : 'Equip Frame') : 'Owned')
          : ('Buy (' + item.cost + ' coins)');
        card.innerHTML = '<h4>' + item.title + '<span class="shop-badge">Seasonal</span></h4><p>' + item.desc + '</p><button>' + buttonLabel + '</button>';
        const btn = card.querySelector('button');
        btn.disabled = owned && item.type !== 'collectible';
        if(equipped) btn.disabled = true;
        if(!afford && !owned) btn.style.opacity = '0.72';
        btn.addEventListener('click', ()=>{
          if(owned && item.type === 'collectible'){
            playerProfile.equippedSeasonalFrame = item.value;
            saveProfile();
            renderFanProfile();
            renderGlobalFanBanners();
            renderSeasonalShop();
            showMessage('Equipped seasonal frame: ' + item.title + '.');
            return;
          }
          buySeasonalItem(item.id);
        });
        grid.appendChild(card);
      });
    }

    function stopAnimeVisualizer(){
      if(animeVisualizerRaf) cancelAnimationFrame(animeVisualizerRaf);
      animeVisualizerRaf = null;
      const canvas = document.getElementById('animeVisualizer');
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawAnimeVisualizer(){
      const canvas = document.getElementById('animeVisualizer');
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      const player = animeMusicPlayers.find(item=>item.id===playerProfile.animeMusicEquipped) || animeMusicPlayers[0];
      const accent = player.accent;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, 'rgba(15,25,48,0.95)');
      bg.addColorStop(1, 'rgba(5,9,18,0.98)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for(let i=0;i<28;i++){
        const wave = Math.sin(animeVisualizerFrame * 0.06 + i * 0.62);
        const pulse = playerProfile.animeAmbientOn ? 0.56 : 0.22;
        const h = 12 + Math.abs(wave) * (canvas.height - 24) * pulse + (i % 3) * 4;
        const x = 12 + i * ((canvas.width - 34) / 28);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.18 + Math.abs(wave) * 0.62;
        ctx.fillRect(x, canvas.height - h - 8, 10, h);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=0;i<=36;i++){
        const x = (i / 36) * canvas.width;
        const y = canvas.height * 0.45 + Math.sin(animeVisualizerFrame * 0.04 + i * 0.45) * (playerProfile.animeAmbientOn ? 12 : 5);
        if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      animeVisualizerFrame += 1;
      animeVisualizerRaf = requestAnimationFrame(drawAnimeVisualizer);
    }

    function startAnimeVisualizer(){
      stopAnimeVisualizer();
      animeVisualizerRaf = requestAnimationFrame(drawAnimeVisualizer);
    }

    function startAnimeAmbient(){
      stopAnimeAmbient();
      if(!playerProfile.animeAmbientOn || playerProfile.animeAmbientTheme === 'off') return;
      const theme = playerProfile.animeAmbientTheme;
      const defs = {
        shrine: { type:'sine', base:432, mod:18, gain:0.012 },
        night: { type:'triangle', base:210, mod:9, gain:0.01 },
        battle: { type:'sawtooth', base:128, mod:24, gain:0.008 }
      };
      const def = defs[theme] || defs.shrine;
      for(let i=0;i<2;i++){
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = def.type;
        osc.frequency.value = def.base + i * 24;
        gain.gain.value = def.gain;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        animeAmbientNodes.push(osc, gain);
      }
      const tick = ()=>{
        if(!animeAmbientNodes.length || !playerProfile.animeAmbientOn) return;
        animeAmbientNodes.forEach((node, idx)=>{
          if(node.frequency) node.frequency.value = def.base + Math.sin(Date.now() / (theme==='battle' ? 280 : 820) + idx) * def.mod + (idx * 18);
        });
        requestAnimationFrame(tick);
      };
      tick();
      startAnimeVisualizer();
    }

    function syncAnimeBadges(){
      playerProfile.animeBadges = animeBadgeCatalog.filter(b=>b.check(playerProfile)).map(b=>b.id);
    }

    function renderAnimeMusicPlayers(){
      const grid = document.getElementById('animeMusicPlayerGrid');
      if(!grid) return;
      grid.innerHTML = '';
      animeMusicPlayers.forEach(player=>{
        const owned = (playerProfile.animeMusicOwned || []).includes(player.id);
        const equipped = playerProfile.animeMusicEquipped === player.id;
        const lockedByLevel = Number(playerProfile.level || 1) < player.unlockLevel;
        const card = document.createElement('div');
        card.className = 'music-player-card';
        card.innerHTML = '<div style="font-weight:800;color:' + player.accent + ';">' + player.label + '</div><div style="font-size:0.82rem;color:#aec6ff;margin-top:4px;">' + player.desc + '</div><div style="font-size:0.76rem;color:#7ea3db;margin-top:6px;">Theme: ' + player.theme + '</div><button data-music-player="' + player.id + '">' + (owned ? (equipped ? 'Equipped' : 'Equip') : (lockedByLevel ? ('Reach Lv ' + player.unlockLevel) : ('Buy for ' + player.cost + ' coins'))) + '</button>';
        const btn = card.querySelector('button');
        btn.disabled = equipped;
        grid.appendChild(card);
      });
      startAnimeVisualizer();
    }

    function handleAnimeMusicPlayer(playerId){
      const player = animeMusicPlayers.find(item=>item.id===playerId);
      if(!player) return;
      const owned = (playerProfile.animeMusicOwned || []).includes(playerId);
      if(!owned){
        if(Number(playerProfile.level || 1) < player.unlockLevel){
          showMessage('Reach level ' + player.unlockLevel + ' to unlock ' + player.label + '.');
          return;
        }
        if(Number(playerProfile.coins || 0) < player.cost){
          showMessage('Not enough coins for ' + player.label + '.');
          return;
        }
        playerProfile.coins -= player.cost;
        playerProfile.animeMusicOwned.push(playerId);
        pushActivity('Unlocked the ' + player.label + ' music player.');
      }
      playerProfile.animeMusicEquipped = playerId;
      playerProfile.animeAmbientTheme = player.theme;
      saveProfile();
      if(playerProfile.animeAmbientOn) startAnimeAmbient(); else startAnimeVisualizer();
      renderProfilePanel();
      renderAnimeLounge();
    }

    function addXpAndCoins(xpGain, coinGain){
      playerProfile.xp += xpGain;
      playerProfile.coins += coinGain;
      let leveledUp = 0;
      while(playerProfile.xp >= getXpForLevel(playerProfile.level)){
        playerProfile.xp -= getXpForLevel(playerProfile.level);
        playerProfile.level++;
        leveledUp++;
      }
      if(leveledUp > 0){
        unlockEligibleGames();
        syncAnimeBadges();
        showMessage('Level up! +' + leveledUp + ' level(s) gained.');
        pushActivity('Leveled up to ' + playerProfile.level);
        document.body.classList.add('achievement-blink');
      }
      saveProfile();
      renderProfilePanel();
      renderGameGrid();
    }

    function ensureDailyLoginReward(){
      const today = todayKey();
      if(playerProfile.loginRewardClaimedDate === today) return;
      const wasYesterday = playerProfile.lastLoginDate === yesterdayKey();
      if(!wasYesterday && Number(playerProfile.streak || 0) > 0 && Number(playerProfile.streakShields || 0) > 0 && playerProfile.lastLoginDate){
        playerProfile.streakShields -= 1;
        playerProfile.streak = playerProfile.streak + 1;
        pushActivity('Streak Shield consumed to protect login streak.');
      } else {
        playerProfile.streak = wasYesterday ? playerProfile.streak + 1 : 1;
      }
      const rewardCoins = 30 + playerProfile.streak * 8;
      const rewardXp = 25 + playerProfile.streak * 4;
      playerProfile.loginRewardClaimedDate = today;
      playerProfile.lastLoginDate = today;
      addXpAndCoins(rewardXp, rewardCoins);
      saveProfile();
      showMessage('Daily login reward: +' + rewardCoins + ' coins and +' + rewardXp + ' XP. Streak day ' + playerProfile.streak + '.');
      pushActivity('Claimed daily login reward (' + rewardCoins + ' coins)');
    }

    function getQuestProgress(){
      const today = todayKey();
      const todaysPlays = playerProfile.playHistoryDaily[today] || [];
      const totalPlays = todaysPlays.length;
      const uniquePlays = new Set(todaysPlays).size;
      const highestBest = Object.values(playerProfile.gameStats || {}).reduce((m,v)=>Math.max(m, Number(v.best||0)), 0);
      const event = getActiveSeasonalEvent();
      const seasonalQuestId = getSeasonalQuestId(event.id);
      return {
        'q-play-3': Math.min(3, totalPlays),
        'q-score-150': Math.min(1, highestBest >= 150 ? 1 : 0),
        'q-try-2': Math.min(2, uniquePlays),
        'q-shrine-turntable': playerProfile.favoriteAnime && (playerProfile.animeWishlist || []).length >= 4 ? 1 : 0,
        'q-battle-deck': Number(playerProfile.level || 1) >= 7 && highestBest >= 220 ? 1 : 0,
        [seasonalQuestId]: getSeasonalProgress(event, totalPlays, highestBest)
      };
    }

    function questTarget(id){
      if(id === 'q-play-3') return 3;
      if(id === 'q-score-150') return 1;
      if(id === 'q-try-2') return 2;
      if(id === 'q-shrine-turntable') return 1;
      if(id === 'q-battle-deck') return 1;
      if(id.startsWith('q-season-')) return 1;
      return 1;
    }

    function hasClaimedQuest(questId){
      const quest = questCatalog.find(q=>q.id===questId);
      if(!quest) return false;
      if(quest.permanent) return Boolean(playerProfile.animePermanentQuestClaims?.[questId]);
      const today = todayKey();
      return Boolean(playerProfile.questClaims?.[today]?.[questId]);
    }

    function claimQuest(questId){
      const today = todayKey();
      playerProfile.questClaims[today] = playerProfile.questClaims[today] || {};
      if(hasClaimedQuest(questId)){ showMessage('Quest already claimed.'); return; }
      const progress = getQuestProgress();
      if((progress[questId] || 0) < questTarget(questId)){ showMessage('Quest not completed yet.'); return; }
      const quest = questCatalog.find(q=>q.id===questId);
      if(!quest) return;
      if(quest.permanent){
        playerProfile.animePermanentQuestClaims[questId] = true;
      } else {
        playerProfile.questClaims[today][questId] = true;
      }
      if(quest.rewardMusicPlayer){
        if(!playerProfile.animeMusicOwned.includes(quest.rewardMusicPlayer)){
          playerProfile.animeMusicOwned.push(quest.rewardMusicPlayer);
        }
      }
      if(quest.rewardDecor && !playerProfile.animeDecorOwned.includes(quest.rewardDecor)){
        playerProfile.animeDecorOwned.push(quest.rewardDecor);
        playerProfile.animeDecorEquipped.push(quest.rewardDecor);
      }
      if(quest.rewardEvent){
        playerProfile.seasonalEventClaims[quest.rewardEvent] = todayKey();
      }
      if(quest.rewardXp || quest.rewardCoins){
        addXpAndCoins(quest.rewardXp, quest.rewardCoins);
      }
      syncAnimeBadges();
      saveProfile();
      renderQuestBoard();
      renderAnimeLounge();
      renderFanProfile();
      if(quest.rewardMusicPlayer){
        const player = animeMusicPlayers.find(item=>item.id===quest.rewardMusicPlayer);
        showMessage('Quest claimed: unlocked ' + (player?.label || 'a music player') + '.');
        pushActivity('Unlocked music player via quest: ' + (player?.label || quest.rewardMusicPlayer));
      } else if(quest.rewardDecor){
        showMessage('Quest claimed: seasonal reward unlocked.');
      } else {
        showMessage('Quest claimed: +' + quest.rewardXp + ' XP, +' + quest.rewardCoins + ' coins.');
      }
      pushActivity('Claimed quest: ' + quest.label);
    }

    function renderQuestBoard(){
      const board = document.getElementById('questBoard');
      const spinStatus = document.getElementById('spinStatus');
      const spinBtn = document.getElementById('dailySpinBtn');
      if(!board || !spinStatus || !spinBtn) return;
      const today = todayKey();
      const claims = playerProfile.questClaims[today] || {};
      const progress = getQuestProgress();
      const auto = playerProfile.questAutoClaims[today] || {};
      Object.keys(auto).forEach(id=>{
        progress[id] = Math.max(progress[id] || 0, Number(auto[id] || 0));
      });
      board.innerHTML = '';
      questCatalog.forEach(q=>{
        const current = progress[q.id] || 0;
        const target = questTarget(q.id);
        const done = current >= target;
        const claimed = q.permanent ? Boolean(playerProfile.animePermanentQuestClaims?.[q.id]) : Boolean(claims[q.id]);
        const rewardText = q.rewardMusicPlayer
          ? ('Reward: ' + (animeMusicPlayers.find(item=>item.id===q.rewardMusicPlayer)?.label || 'Music Player'))
          : ('Reward: +' + q.rewardXp + ' XP, +' + q.rewardCoins + ' coins');
        const item = document.createElement('div');
        item.className = 'quest-item';
        item.innerHTML = '<div><strong>' + q.label + '</strong><div style="font-size:0.82rem;color:#b6c7e7;">Progress: ' + current + '/' + target + ' | ' + rewardText + (q.permanent ? ' | Permanent' : '') + '</div></div><button>' + (claimed ? 'Claimed' : 'Claim') + '</button>';
        const btn = item.querySelector('button');
        btn.disabled = claimed || !done;
        btn.addEventListener('click', ()=>claimQuest(q.id));
        board.appendChild(item);
      });
      const canSpin = playerProfile.spinClaimedDate !== today;
      spinStatus.textContent = canSpin ? 'Daily Spin available now.' : 'Daily Spin already claimed today.';
      spinBtn.disabled = !canSpin;
      if(playerProfile.questRerollTokens > 0){
        const quickBtn = document.createElement('button');
        quickBtn.textContent = 'Use Quest Reroll Token (' + playerProfile.questRerollTokens + ')';
        quickBtn.style.marginTop = '8px';
        quickBtn.addEventListener('click', ()=>{
          if(useQuestRerollToken()){
            saveProfile();
            renderQuestBoard();
          } else {
            showMessage('No unfinished daily quest to reroll right now.');
          }
        });
        board.appendChild(quickBtn);
      }
    }

    function claimDailySpin(){
      const today = todayKey();
      if(playerProfile.spinClaimedDate === today){ showMessage('Daily spin already used today.'); return; }
      const reward = spinRewards[daySeed() % spinRewards.length];
      if(reward.type === 'coins') addXpAndCoins(0, reward.amount);
      if(reward.type === 'xp') addXpAndCoins(reward.amount, 0);
      if(reward.type === 'unlock') unlockRandomLockedGames(reward.amount || 1);
      playerProfile.spinClaimedDate = today;
      saveProfile();
      renderQuestBoard();
      renderGameGrid();
      showMessage('Daily Spin reward: ' + reward.label);
      pushActivity('Claimed Daily Spin reward (' + reward.label + ')');
    }

    function renderActivityFeed(){
      const feed = document.getElementById('activityFeed');
      if(!feed) return;
      const logs = playerProfile.activityLog || [];
      if(!logs.length){
        feed.innerHTML = '<div class="feed-item">No activity yet. Play games, claim quests, spin, or shop.</div>';
        return;
      }
      feed.innerHTML = '';
      logs.slice(0,10).forEach(line=>{
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.textContent = line;
        feed.appendChild(item);
      });
    }

    function renderHomeTipTicker(){
      const ticker = document.getElementById('homeTipTicker');
      if(!ticker) return;
      if(!homeTips.length){
        ticker.textContent = 'Play a game to get started.';
        return;
      }
      ticker.textContent = homeTips[homeTipIndex % homeTips.length];
    }

    function startHomeTipTicker(){
      if(homeTipTimer) return;
      homeTipTimer = setInterval(()=>{
        homeTipIndex = (homeTipIndex + 1) % homeTips.length;
        renderHomeTipTicker();
      }, 7000);
    }

    function renderHomeDashboard(){
      const quick = document.getElementById('homeQuickStats');
      const mission = document.getElementById('homeMissionCard');
      const featured = document.getElementById('homeFeaturedCard');
      const feed = document.getElementById('homeActivityFeed');
      if(!quick || !mission || !featured || !feed) return;

      const xpNeed = getXpForLevel(playerProfile.level);
      quick.innerHTML = '';
      [
        ['Coins', playerProfile.coins],
        ['Level', playerProfile.level],
        ['XP', playerProfile.xp + '/' + xpNeed],
        ['Streak', playerProfile.streak + ' days']
      ].forEach(([k,v])=>{
        const chip = document.createElement('div');
        chip.className = 'stat-chip';
        chip.innerHTML = '<span>' + k + '</span><strong>' + v + '</strong>';
        quick.appendChild(chip);
      });

      const progress = getQuestProgress();
      const nextQuest = questCatalog.find(q=>!hasClaimedQuest(q.id) && (progress[q.id] || 0) < questTarget(q.id));
      mission.innerHTML = '';
      if(nextQuest){
        const current = progress[nextQuest.id] || 0;
        const target = questTarget(nextQuest.id);
        const reward = nextQuest.rewardMusicPlayer
          ? ('Reward: ' + (animeMusicPlayers.find(item=>item.id===nextQuest.rewardMusicPlayer)?.label || 'Music Player'))
          : ('Reward: +' + (nextQuest.rewardXp || 0) + ' XP, +' + (nextQuest.rewardCoins || 0) + ' coins');
        const item = document.createElement('div');
        item.className = 'mini-item';
        item.innerHTML = '<span><strong>' + nextQuest.label + '</strong><br><small style="color:#9fb5df;">Progress: ' + current + '/' + target + ' | ' + reward + '</small></span><button id="homeMissionActionBtn">Play Daily</button>';
        mission.appendChild(item);
        const actionBtn = document.getElementById('homeMissionActionBtn');
        if(actionBtn) actionBtn.addEventListener('click', playDailyChallenge);
      } else {
        mission.innerHTML = '<div class="mini-item"><span>All current missions are complete. Nice work!</span><button id="homeMissionFallbackBtn">Spin</button></div>';
        const spinBtn = document.getElementById('homeMissionFallbackBtn');
        if(spinBtn) spinBtn.addEventListener('click', claimDailySpin);
      }

      const game = getFeaturedGame();
      featured.innerHTML = '<h4 style="margin:0 0 6px;">' + game.icon + ' ' + game.title + '</h4><p style="margin:0 0 10px;color:#b8cae7;">' + game.desc + '</p><button class="play-btn" id="homeFeaturedPlayBtn">Play Featured</button>';
      const playBtn = document.getElementById('homeFeaturedPlayBtn');
      if(playBtn) playBtn.addEventListener('click', ()=>openGamePage(game));

      const logs = playerProfile.activityLog || [];
      feed.innerHTML = '';
      if(!logs.length){
        feed.innerHTML = '<div class="feed-item">No activity yet. Play games, claim quests, spin, or shop.</div>';
      } else {
        logs.slice(0,4).forEach(line=>{
          const item = document.createElement('div');
          item.className = 'feed-item';
          item.textContent = line;
          feed.appendChild(item);
        });
      }

      renderHomeTipTicker();
      startHomeTipTicker();
    }

    function recordAnimeSearch(title){
      const clean = String(title || '').trim();
      if(!clean) return;
      playerProfile.animeSearchHistory = [clean, ...playerProfile.animeSearchHistory.filter(v=>v.toLowerCase()!==clean.toLowerCase())].slice(0,10);
      saveProfile();
    }

    async function fetchAnimeCover(title){
      try {
        const res = await fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(title) + '&limit=1');
        if(!res.ok) return null;
        const data = await res.json();
        const first = data?.data?.[0];
        if(!first) return null;
        return {
          id: first.mal_id,
          image: first.images?.jpg?.large_image_url || first.images?.jpg?.image_url,
          synopsis: first.synopsis || 'No synopsis available.',
          title: first.title || title,
          score: first.score || 'N/A'
        };
      } catch {
        return null;
      }
    }

    async function fetchAnimePicks(title){
      try {
        const q = encodeURIComponent(title + ' manga light novel');
        const res = await fetch('https://www.googleapis.com/books/v1/volumes?q=' + q + '&maxResults=8&printType=books');
        if(!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map(item=>({
          id: item.id,
          title: item.volumeInfo?.title || 'Untitled',
          authors: (item.volumeInfo?.authors || []).join(', ') || 'Unknown',
          link: item.volumeInfo?.infoLink || '#'
        }));
      } catch {
        return [];
      }
    }

    async function fetchAnimeGallery(animeId){
      if(!animeId) return [];
      try {
        const [picsRes, charsRes] = await Promise.all([
          fetch('https://api.jikan.moe/v4/anime/' + animeId + '/pictures'),
          fetch('https://api.jikan.moe/v4/anime/' + animeId + '/characters')
        ]);
        const picsData = picsRes.ok ? await picsRes.json() : { data: [] };
        const charsData = charsRes.ok ? await charsRes.json() : { data: [] };
        const picItems = (picsData.data || []).slice(0, 4).map((item, idx)=>(
          { image: item.jpg?.large_image_url || item.jpg?.image_url, label: 'Scene ' + (idx + 1), link: item.jpg?.large_image_url || item.jpg?.image_url }
        ));
        const charItems = (charsData.data || []).slice(0, 4).map((item)=>(
          { image: item.character?.images?.jpg?.image_url, label: item.character?.name || 'Character', link: item.character?.url || '#' }
        ));
        return [...picItems, ...charItems].filter(v=>v.image).slice(0, 8);
      } catch {
        return [];
      }
    }

    function renderAnimeGallery(items){
      const grid = document.getElementById('animeGalleryGrid');
      if(!grid) return;
      if(!items.length){
        grid.innerHTML = '<div style="color:#b8c8ea;">No cool pictures found right now.</div>';
        return;
      }
      grid.innerHTML = '';
      items.forEach(item=>{
        const card = document.createElement('div');
        card.className = 'anime-gallery-card';
        card.innerHTML = '<img src="' + escapeHtml(item.image) + '" alt="Anime image"><a target="_blank" rel="noopener" href="' + escapeHtml(item.link) + '">' + escapeHtml(item.label) + '</a>';
        grid.appendChild(card);
      });
    }

    function getAnimeQuotes(){
      return animeQuotesByGenre[playerProfile.animeGenre] || animeQuotesByGenre['Shonen'];
    }

    function renderAnimeQuote(){
      const el = document.getElementById('animeQuoteText');
      if(!el) return;
      const quotes = getAnimeQuotes();
      const idx = (daySeed() + Math.floor(Math.random() * quotes.length)) % quotes.length;
      el.textContent = quotes[idx];
    }

    function renderAnimeFloaters(){
      const wrap = document.getElementById('animeStageFloaters');
      if(!wrap) return;
      const sets = {
        epic:['⚔️','🔥','⭐'],
        cozy:['🌸','☁️','💮'],
        chaos:['💥','⚡','🌀']
      };
      const icons = sets[playerProfile.animeVibe] || sets.epic;
      wrap.innerHTML = '';
      icons.forEach((icon, idx)=>{
        const node = document.createElement('div');
        node.className = 'anime-floater';
        node.style.left = (12 + idx * 28) + '%';
        node.style.top = (12 + (idx % 2) * 28) + '%';
        node.style.animationDelay = (idx * 1.2) + 's';
        node.textContent = icon;
        wrap.appendChild(node);
      });
    }

    function renderAnimeStage(images){
      const stage = document.getElementById('animeWallpaperStage');
      const thumbs = document.getElementById('animeWallpaperThumbs');
      const title = document.getElementById('animeStageTitle');
      const tag = document.getElementById('animeStageTagline');
      const controls = document.getElementById('animeVibeControls');
      if(!stage || !thumbs || !title || !tag || !controls) return;
      const vibeCopy = {
        epic: 'Big energy, hero frames, main-character atmosphere.',
        cozy: 'Warm tones, calm scenes, comfort-arc feelings.',
        chaos: 'Loud colors, wild moments, full fan-brain mode.'
      };
      title.textContent = (playerProfile.favoriteAnime || 'Anime') + ' Wallpaper Stage';
      tag.textContent = vibeCopy[playerProfile.animeVibe] || vibeCopy.epic;
      stage.dataset.vibe = playerProfile.animeVibe;
      stage.dataset.player = playerProfile.animeMusicEquipped || 'pocket';
      controls.querySelectorAll('button').forEach(btn=>btn.classList.toggle('active', btn.dataset.vibe === playerProfile.animeVibe));
      const list = images.length ? images : [{ image:'', label:'Default' }];
      const safeIndex = Math.max(0, Math.min(playerProfile.animeWallpaperIndex, list.length - 1));
      playerProfile.animeWallpaperIndex = safeIndex;
      const active = list[safeIndex];
      if(active?.image){
        stage.style.backgroundImage = 'url("' + active.image.replace(/"/g, '%22') + '")';
      } else {
        stage.style.backgroundImage = 'linear-gradient(135deg, rgba(32,59,103,0.95), rgba(9,16,31,0.95))';
      }
      renderAnimeFloaters();
      thumbs.innerHTML = '';
      list.slice(0, 6).forEach((item, idx)=>{
        const btn = document.createElement('button');
        btn.title = item.label || ('Wallpaper ' + (idx + 1));
        btn.innerHTML = item.image ? '<img src="' + escapeHtml(item.image) + '" alt="Wallpaper thumb">' : '<span style="font-size:.75rem;color:#dbe7ff;">Default</span>';
        btn.addEventListener('click', ()=>{
          playerProfile.animeWallpaperIndex = idx;
          saveProfile();
          renderAnimeStage(list);
        });
        thumbs.appendChild(btn);
      });
    }

    function renderAnimeRoom(){
      const stage = document.getElementById('animeRoomStage');
      const grid = document.getElementById('animeRoomDecorGrid');
      if(!stage || !grid) return;
      stage.dataset.player = playerProfile.animeMusicEquipped || 'pocket';
      stage.querySelectorAll('.room-item').forEach(node=>node.remove());
      animeDecorCatalog.forEach(item=>{
        if(playerProfile.animeDecorEquipped.includes(item.id)){
          const node = document.createElement('div');
          node.className = 'room-item';
          node.style.left = item.x + '%';
          node.style.top = item.y + '%';
          node.textContent = item.icon;
          stage.appendChild(node);
        }
      });
      grid.innerHTML = '';
      animeDecorCatalog.forEach(item=>{
        const owned = playerProfile.animeDecorOwned.includes(item.id);
        const equipped = playerProfile.animeDecorEquipped.includes(item.id);
        const afford = playerProfile.coins >= item.cost;
        const card = document.createElement('div');
        card.className = 'room-decor-card';
        card.innerHTML = '<strong>' + item.icon + ' ' + item.label + '</strong><div style="margin-top:6px;color:#b8c8ea;font-size:0.82rem;">' + (owned ? (equipped ? 'Equipped in room' : 'Owned collectible') : ('Unlock for ' + item.cost + ' coins')) + '</div><button>' + (owned ? (equipped ? 'Unequip' : 'Equip') : 'Unlock') + '</button>';
        const btn = card.querySelector('button');
        btn.disabled = !owned && !afford;
        btn.addEventListener('click', ()=>{
          if(!owned){
            playerProfile.coins -= item.cost;
            playerProfile.animeDecorOwned.push(item.id);
            playerProfile.animeDecorEquipped.push(item.id);
            syncAnimeBadges();
            saveProfile();
            renderProfilePanel();
            renderAnimeRoom();
            renderAnimeBadges();
            renderAnimeFanCard();
            pushActivity('Unlocked anime room decor: ' + item.label);
            return;
          }
          if(equipped){
            playerProfile.animeDecorEquipped = playerProfile.animeDecorEquipped.filter(id=>id!==item.id);
          } else {
            playerProfile.animeDecorEquipped.push(item.id);
          }
          saveProfile();
          renderAnimeRoom();
        });
        grid.appendChild(card);
      });
    }

    function renderAnimeBadges(){
      const shelf = document.getElementById('animeBadgeShelf');
      if(!shelf) return;
      syncAnimeBadges();
      shelf.innerHTML = '';
      animeBadgeCatalog.forEach(badge=>{
        const unlocked = playerProfile.animeBadges.includes(badge.id);
        const card = document.createElement('div');
        card.className = 'badge-card' + (unlocked ? '' : ' locked');
        card.innerHTML = '<div style="font-size:1.4rem;">' + badge.icon + '</div><strong>' + badge.label + '</strong><div style="margin-top:6px;color:#b8c8ea;font-size:0.8rem;">' + badge.desc + '</div>';
        shelf.appendChild(card);
      });
    }

    function renderAnimeFanCard(){
      const card = document.getElementById('animeFanCard');
      if(!card) return;
      const wishlistCount = (playerProfile.animeWishlist || []).length;
      const decorCount = (playerProfile.animeDecorOwned || []).length;
      const badgeCount = (playerProfile.animeBadges || []).length;
      const identity = playerProfile.favoriteAnime ? (playerProfile.favoriteAnime + ' Loyalist') : 'Anime Rookie';
      const rank = getAnimeRankTitle();
      card.innerHTML = '<div class="fan-card-title">Fan Identity Card</div><div style="margin-top:6px;color:#b8c8ea;font-size:0.86rem;">' + escapeHtml(formatName()) + ' | ' + escapeHtml(identity) + '</div><div style="margin-top:6px;font-size:0.82rem;color:#ffd36e;letter-spacing:.08em;text-transform:uppercase;">' + escapeHtml(rank) + '</div><div style="margin-top:4px;color:#dce8ff;font-size:0.92rem;">Genre: ' + escapeHtml(playerProfile.animeGenre || 'Shonen') + ' | Vibe: ' + escapeHtml(playerProfile.animeVibe || 'epic') + '</div><div class="fan-card-grid"><div class="fan-metric"><span>Badges</span><strong style="display:block;margin-top:4px;">' + badgeCount + '</strong></div><div class="fan-metric"><span>Decor</span><strong style="display:block;margin-top:4px;">' + decorCount + '</strong></div><div class="fan-metric"><span>Wishlist</span><strong style="display:block;margin-top:4px;">' + wishlistCount + '</strong></div><div class="fan-metric"><span>Arcade Level</span><strong style="display:block;margin-top:4px;">' + playerProfile.level + '</strong></div></div><div class="fan-card-actions"><button id="saveFanCardBtn">Save Card</button><button id="shareFanCardBtn">Copy Summary</button></div>';
    }

    function renderAnimeFanGallery(){
      const wrap = document.getElementById('animeFanGallery');
      if(!wrap) return;
      const saved = playerProfile.animeSavedCards || [];
      if(!saved.length){
        wrap.innerHTML = '<div style="color:#b8c8ea;font-size:0.84rem;">Save a fan card to start your gallery.</div>';
        return;
      }
      wrap.innerHTML = '';
      saved.forEach(item=>{
        const card = document.createElement('div');
        card.className = 'fan-gallery-card';
        card.innerHTML = '<img src="' + escapeHtml(item.image) + '" alt="Saved fan card"><strong style="display:block;margin-top:8px;">' + escapeHtml(item.rank) + '</strong><div style="margin-top:4px;color:#dce8ff;font-size:0.84rem;">' + escapeHtml(item.favorite) + ' · ' + escapeHtml(item.player) + '</div><time>' + escapeHtml(item.savedAt) + '</time><button data-fan-card-download="' + item.id + '">Download Again</button><button data-set-banner="' + item.id + '">' + (playerProfile.animeBannerCardId === item.id ? 'Banner Equipped' : 'Set as Banner') + '</button>';
        wrap.appendChild(card);
      });
    }

    function exportAnimeFanCard(){
      const canvas = buildAnimeFanCardCanvas();
      if(!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      saveAnimeFanCardSnapshot(dataUrl);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'anime-fan-card.png';
      link.click();
      showMessage('Saved your Anime Fan Identity Card and added it to the gallery.');
    }

    async function copyAnimeFanSummary(){
      const summary = 'Anime Fan Card | ' + getAnimeRankTitle() + ' | Favorite: ' + (playerProfile.favoriteAnime || 'Still choosing') + ' | Vibe: ' + (playerProfile.animeVibe || 'epic') + ' | Wishlist: ' + (playerProfile.animeWishlist || []).length + ' | Badges: ' + (playerProfile.animeBadges || []).length + ' | Arcade Level: ' + playerProfile.level;
      try {
        await navigator.clipboard.writeText(summary);
        showMessage('Fan card summary copied to clipboard.');
      } catch {
        showMessage('Clipboard copy failed on this browser.');
      }
    }

    function renderAnimeSpotlight(items){
      const wrap = document.getElementById('animeSpotlight');
      if(!wrap) return;
      if(!items.length){
        wrap.innerHTML = '<div><strong>Character Spotlight</strong><div style="color:#b8c8ea;font-size:0.84rem;margin-top:6px;">No character visuals available right now.</div></div>';
        return;
      }
      const pick = items[Math.floor((daySeed() + items.length) % items.length)] || items[0];
      wrap.innerHTML = '<img src="' + escapeHtml(pick.image) + '" alt="Spotlight"><div><div style="font-size:.75rem;color:#90b9ff;letter-spacing:.08em;text-transform:uppercase;">Character Spotlight</div><strong>' + escapeHtml(pick.label) + '</strong><div style="margin-top:6px;color:#c9daf8;font-size:0.84rem;">One standout visual from your favorite anime lounge.</div></div>';
    }

    function renderAnimeWishlist(){
      const wrap = document.getElementById('animeWishlist');
      if(!wrap) return;
      if(!playerProfile.animeWishlist.length){
        wrap.innerHTML = '<div style="color:#b8c8ea;font-size:0.84rem;">No wishlist items yet.</div>';
        return;
      }
      wrap.innerHTML = '';
      playerProfile.animeWishlist.forEach((item, idx)=>{
        const row = document.createElement('div');
        row.className = 'mini-item';
        row.innerHTML = '<span>' + item + '</span><button>Remove</button>';
        row.querySelector('button').addEventListener('click', ()=>{
          playerProfile.animeWishlist.splice(idx, 1);
          syncAnimeBadges();
          saveProfile();
          renderAnimeWishlist();
          renderAnimeBadges();
          renderAnimeFanCard();
        });
        wrap.appendChild(row);
      });
    }

    function renderAnimeHistory(){
      const wrap = document.getElementById('animeHistory');
      if(!wrap) return;
      if(!playerProfile.animeSearchHistory.length){
        wrap.innerHTML = '<div style="color:#b8c8ea;font-size:0.84rem;">No searches yet.</div>';
        return;
      }
      wrap.innerHTML = playerProfile.animeSearchHistory.map(v=>'<span class="anime-pill">' + escapeHtml(v) + '</span>').join('');
    }

    async function renderAnimeLounge(){
      const fav = playerProfile.favoriteAnime || '';
      const animePanel = document.getElementById('anime');
      const titleEl = document.getElementById('animeZoneTitle');
      const subEl = document.getElementById('animeZoneSub');
      const coverWrap = document.getElementById('animeCoverWrap');
      const picksWrap = document.getElementById('animePicksCarousel');
      const quickInput = document.getElementById('animeQuickInput');
      if(!titleEl || !subEl || !coverWrap || !picksWrap || !quickInput) return;
      if(animePanel) animePanel.dataset.genre = playerProfile.animeGenre || 'Shonen';
      const ambientSelect = document.getElementById('animeAmbientSelect');
      const ambientBtn = document.getElementById('animeAmbientToggleBtn');
      if(ambientSelect) ambientSelect.value = playerProfile.animeAmbientTheme || 'off';
      if(ambientBtn) ambientBtn.textContent = playerProfile.animeAmbientOn && playerProfile.animeAmbientTheme !== 'off' ? 'Stop Ambient' : 'Play Ambient';

      if(!fav){
        titleEl.textContent = 'Your Anime Lounge';
        subEl.textContent = 'Set your favorite anime to unlock personalized content.';
        coverWrap.innerHTML = '<div style="color:#b8c8ea;">No favorite anime yet.</div>';
        picksWrap.innerHTML = '<div class="carousel-item">No picks yet.</div>';
        renderAnimeStage([]);
        renderAnimeQuote();
        renderAnimeSpotlight([]);
        renderAnimeGallery([]);
        renderAnimeBadges();
        renderAnimeFanCard();
        renderAnimeFanGallery();
        renderAnimeMusicPlayers();
        renderAnimeRoom();
        renderAnimeWishlist();
        renderAnimeHistory();
        return;
      }

      titleEl.textContent = fav + ' Fan Lounge';
      subEl.textContent = 'Genre vibe: ' + (playerProfile.animeGenre || 'Shonen') + ' | Built just for you.';
      quickInput.value = fav;

      coverWrap.innerHTML = '<div style="color:#b8c8ea;">Loading anime cover...</div>';
      picksWrap.innerHTML = '<div class="carousel-item">Loading picks...</div>';
      const cover = await fetchAnimeCover(fav);
      const [picks, gallery] = await Promise.all([fetchAnimePicks(fav), fetchAnimeGallery(cover?.id)]);

      if(cover){
        coverWrap.innerHTML = '<img class="anime-cover" src="' + escapeHtml(cover.image) + '" alt="Anime cover"><div style="margin-top:8px;color:#c9daf8;font-size:0.86rem;"><strong>' + escapeHtml(cover.title) + '</strong> | Score: ' + escapeHtml(cover.score) + '<br>' + escapeHtml(cover.synopsis.slice(0, 220)) + '...</div>';
      } else {
        coverWrap.innerHTML = '<div style="color:#b8c8ea;">Cover preview unavailable right now.</div>';
      }

      if(!picks.length){
        picksWrap.innerHTML = '<div class="carousel-item">No picks found yet. Try another anime title.</div>';
      } else {
        picksWrap.innerHTML = '';
        picks.forEach(p=>{
          const card = document.createElement('div');
          card.className = 'carousel-item';
          card.innerHTML = '<strong>' + escapeHtml(p.title) + '</strong><div style="font-size:0.8rem;color:#b8cae8;margin:6px 0;">' + escapeHtml(p.authors) + '</div><a target="_blank" rel="noopener" href="' + escapeHtml(p.link) + '">View Book</a>';
          picksWrap.appendChild(card);
        });
      }

      renderAnimeStage(cover && cover.image ? [{ image: cover.image, label: cover.title }, ...gallery] : gallery);
      renderAnimeQuote();
      renderAnimeSpotlight(gallery.filter(item=>/Character/i.test(item.label)));
      renderAnimeGallery(gallery);
      renderAnimeBadges();
      renderAnimeFanCard();
      renderAnimeFanGallery();
      renderAnimeMusicPlayers();
      renderAnimeRoom();
      renderAnimeWishlist();
      renderAnimeHistory();
    }

    function setFavoriteAnime(title, genre){
      const clean = String(title || '').trim();
      if(!clean) return false;
      playerProfile.favoriteAnime = clean;
      playerProfile.animeGenre = genre || playerProfile.animeGenre || 'Shonen';
      saveProfile();
      recordAnimeSearch(clean);
      renderAnimeLounge();
      renderProfilePanel();
      pushActivity('Set favorite anime: ' + clean);
      return true;
    }

    function openAnimeOnboardingIfNeeded(){
      const modal = document.getElementById('animeOnboardModal');
      if(!modal) return;
      if(!playerProfile.favoriteAnime){
        modal.classList.add('open');
      } else {
        modal.classList.remove('open');
      }
    }

    function openAnimeBookSearch(){
      const input = document.getElementById('animeTitleInput');
      const store = document.getElementById('animeStoreSelect');
      const msg = document.getElementById('animeFinderMsg');
      const title = (input?.value || playerProfile.favoriteAnime || '').trim();
      if(!title){ if(msg) msg.textContent = 'Enter an anime title first.'; return; }
      const query = encodeURIComponent(title + ' anime book manga light novel');
      let url = 'https://www.amazon.com/s?k=' + query;
      if(store?.value === 'barnes') url = 'https://www.barnesandnoble.com/s/' + query;
      if(store?.value === 'googlebooks') url = 'https://www.google.com/search?tbm=bks&q=' + query;
      window.open(url, '_blank', 'noopener');
      if(msg) msg.textContent = 'Opening book results for "' + title + '"...';
      recordAnimeSearch(title);
      renderAnimeHistory();
      pushActivity('Searched anime books for: ' + title);
    }

    const Components = {
      Header: {
        renderHeroButtons(){
          const practiceBtn = document.getElementById('practiceModeBtn');
          practiceBtn.textContent = practiceMode ? 'Practice Mode On' : 'Practice Mode Off';
          practiceBtn.classList.toggle('active', practiceMode);
        }
      },
      GameCard: {
        create(game, idx){
          const unlocked = isGameUnlocked(game, idx);
          const playCount = Number((playerProfile.gameStats[game.id] || {}).plays || 0);
          const bestScore = Number((playerProfile.gameStats[game.id] || {}).best || 0);
          const isTrending = playCount >= 3;
          const isFeatured = game.id === getFeaturedGame().id;
          const mastery = playCount >= 25 ? 'Mastery: Legend' : playCount >= 12 ? 'Mastery: Pro' : playCount >= 5 ? 'Mastery: Rising' : 'Mastery: Rookie';
          const card = document.createElement('div');
          card.className = 'card' + (unlocked ? '' : ' locked') + (isTrending ? ' trending' : '') + (isFeatured ? ' featured' : '');
          card.style.cursor = 'pointer';
          card.innerHTML = `
            <div class="card-icon">${game.icon}</div>
            <div class="card-title">${game.title}</div>
            <div class="card-meta">${game.category}</div>
            <div style="font-size:0.85rem;color:#b6c2e1;min-height:40px;">${game.desc}</div>
            <div style="font-size:0.76rem;color:#9fb7e6;margin-top:6px;">${mastery} | Plays: ${playCount} | Best: ${bestScore}</div>
            ${unlocked ? '' : `<div class="card-lock">Lvl ${getUnlockLevel(game, idx)}</div>`}
            <button class="play-btn">${unlocked ? 'Play' : 'Locked'}</button>
          `;
          const launch = ()=>{
            if(!unlocked){
              showMessage('Unlocks at level ' + getUnlockLevel(game, idx) + '. Keep earning XP.');
              return;
            }
            openGamePage(game);
          };
          card.addEventListener('click', (ev)=>{
            if(ev.target && ev.target.closest('.play-btn')) return;
            launch();
          });
          const btn = card.querySelector('.play-btn');
          btn.disabled = !unlocked;
          btn.addEventListener('click', (ev)=>{ ev.stopPropagation(); launch(); });
          return card;
        }
      },
      Sidebar: {
        renderGameMeta(game){
          const how = document.getElementById('howTo');
          if(!how || !game) return;
          const ruleText = bossModeActive ? 'Boss Rule: x' + bossRules[Math.max(0,bossModeStage-1)].mult + ' score, min ' + bossRules[Math.max(0,bossModeStage-1)].minScore : 'Standard scoring active.';
          const enhancer = activeRunEnhancer ? (activeRunEnhancer.name + ': target ' + activeRunEnhancer.target + '.') : 'Standard run.';
          how.textContent = ruleText + ' ' + enhancer + ' Use mouse or keyboard controls based on game.';
        }
      },
      ProfilePanel: {
        render(){ renderProfilePanel(); }
      }
    };

    function registerScore(gameId, rawScore) {
      const score = Number(rawScore) || 0;
      if(currentRun.gameId === gameId && score <= currentRun.bestScore) return;
      if(currentRun.gameId !== gameId){
        currentRun = { gameId, bestScore: score, counted: false };
      } else {
        currentRun.bestScore = score;
      }

      const name = formatName();
      const bossRule = bossModeActive ? bossRules[Math.max(0,bossModeStage-1)] : null;
      const adjustedScore = bossRule ? Math.round(score * bossRule.mult) : score;
      const enhancer = activeRunEnhancer && activeRunEnhancer.gameId === gameId ? activeRunEnhancer : null;
      const enhancedScore = enhancer ? Math.round(adjustedScore * enhancer.scoreMult) : adjustedScore;
      const objectiveHit = Boolean(enhancer && adjustedScore >= enhancer.target);
      const objectiveBonusScore = objectiveHit ? Number(enhancer.bonusScore || 0) : 0;
      const finalScore = enhancedScore + objectiveBonusScore;

      if (practiceMode) {
        showMessage('Practice mode active: score not saved, but session stats still tracked.');
      } else {
        if (!highScores[gameId] || finalScore > highScores[gameId].score) {
          highScores[gameId] = {score: finalScore, name, date: new Date().toLocaleString()};
          saveHighScores();
          showHighScores();
        }
      }

      const stats = playerProfile.gameStats[gameId] || {plays:0,best:0,lastPlayed:''};
      if(!currentRun.counted){
        stats.plays += 1;
        currentRun.counted = true;
      }
      stats.best = Math.max(stats.best, finalScore);
      stats.lastPlayed = new Date().toLocaleString();
      playerProfile.gameStats[gameId] = stats;
      const today = todayKey();
      if(playerProfile.lastPlayedDate !== today){
        playerProfile.playStreak = Number(playerProfile.playStreak || 0);
        playerProfile.playStreak = playerProfile.lastPlayedDate === yesterdayKey() ? playerProfile.playStreak + 1 : 1;
      }
      playerProfile.lastPlayedDate = today;
      playerProfile.playHistoryDaily[today] = playerProfile.playHistoryDaily[today] || [];
      playerProfile.playHistoryDaily[today].push(gameId);
      const oldDays = Object.keys(playerProfile.playHistoryDaily).filter(d=>d!==today && d!==yesterdayKey());
      oldDays.forEach(d=>delete playerProfile.playHistoryDaily[d]);
      playerProfile.recentlyPlayed = [gameId, ...playerProfile.recentlyPlayed.filter(id=>id!==gameId)].slice(0,6);

      let xpGain = Math.max(10, Math.floor(finalScore * 0.12));
      let coinGain = Math.max(6, Math.floor(finalScore * 0.08));
      if(enhancer){
        xpGain = Math.max(10, Math.round(xpGain * enhancer.xpMult));
        coinGain = Math.max(6, Math.round(coinGain * enhancer.coinMult));
        if(objectiveHit){
          xpGain += Number(enhancer.bonusXp || 0);
          coinGain += Number(enhancer.bonusCoins || 0);
          enhancer.completed = true;
          showMessage('Run objective complete! Bonus +' + enhancer.bonusXp + ' XP, +' + enhancer.bonusCoins + ' coins.');
        }
      }
      if(bossModeActive){ xpGain += 25; coinGain += 20; }
      if(isXpBoostActive()) xpGain = Math.max(10, Math.round(xpGain * 1.25));
      if(Number(playerProfile.runCoinBoostRuns || 0) > 0){
        coinGain = Math.max(6, Math.round(coinGain * 1.2));
        playerProfile.runCoinBoostRuns = Math.max(0, Number(playerProfile.runCoinBoostRuns || 0) - 1);
      }
      if(practiceMode){ xpGain = Math.floor(xpGain * 0.35); coinGain = 0; }

      if (dailyGameId && gameId === dailyGameId) {
        const day = todayKey();
        const existing = dailyScores[day] || {score:0, name:'none'};
        if (finalScore > existing.score) {
          dailyScores[day] = {score: finalScore, name, gameId};
          saveDailyScores();
          showMessage('New Daily Challenge Record!');
        }
        if(playerProfile.dailyChallengeClaimedDate !== day){
          playerProfile.dailyChallengeClaimedDate = day;
          xpGain += 120;
          coinGain += 90;
          showMessage('Daily Challenge bonus claimed: +120 XP and +90 coins.');
        }
      }

      addXpAndCoins(xpGain, coinGain);
      saveProfile();
      updateAchievements(gameId, adjustedScore);
      renderContinuePlaying();
      renderTrending();
      renderFeatured();
      renderQuestBoard();
      pushActivity('Played ' + (games.find(g=>g.id===gameId)?.title || gameId) + ' (score ' + finalScore + ')');

      if (bossModeActive) {
        endBossLevel(finalScore);
      }
    }

    function updateAchievements(gameId, score) {
      achievements.firstPlay = achievements.firstPlay || false;
      achievements.master200 = achievements.master200 || false;
      achievements.highScorer = achievements.highScorer || false;
      achievements.bossMaster = achievements.bossMaster || false;
      achievements.dailyKing = achievements.dailyKing || false;
      achievements.practicePro = achievements.practicePro || false;
      achievements.loginStreak3 = achievements.loginStreak3 || false;
      if (!achievements.firstPlay) achievements.firstPlay = true;
      if (score >= 100) achievements.highScorer = true;
      if (score >= 200) achievements.master200 = true;
      if (practiceMode) achievements.practicePro = true;
      if (playerProfile.streak >= 3) achievements.loginStreak3 = true;
      if (dailyGameId && gameId === dailyGameId) achievements.dailyKing = true;
      saveAchievements();
      renderAchievements();
    }

    function renderAchievements() {
      const panel = document.getElementById('achievementList');
      if (!panel) return;
      panel.innerHTML = '';
      const items = [
        { key:'firstPlay', label:'First Game Played' },
        { key:'highScorer', label:'Scored 100+ in one game' },
        { key:'master200', label:'Scored 200+ in one game' },
        { key:'bossMaster', label:'Completed Boss Mode' },
        { key:'dailyKing', label:'Won Daily Challenge Bonus' },
        { key:'practicePro', label:'Played in Practice Mode' },
        { key:'loginStreak3', label:'3-Day Login Streak' }
      ];
      for(const item of items){
        const li = document.createElement('div');
        const achieved = achievements[item.key];
        li.textContent = (achieved ? '✅ ' : '◻ ') + item.label;
        panel.appendChild(li);
      }
    }

    function applyThemeSelection(theme){
      document.body.classList.remove('theme-retro','theme-cyber','theme-dark','theme-forest','theme-sunset','theme-ocean');
      if(theme && theme !== 'neon') document.body.classList.add('theme-' + theme);
      const select = document.getElementById('themeSelect');
      if(select) select.value = theme || 'neon';
      if(activeAccountId) localStorage.setItem(accountScopedKey(themeKey), theme || 'neon');
    }

    function isThemeOwned(theme){
      if(theme === 'neon') return true;
      const owned = Array.isArray(playerProfile.ownedThemes) ? playerProfile.ownedThemes : ['neon'];
      return owned.includes(theme);
    }

    function daySeed(){
      return Number(todayKey().replace(/-/g,''));
    }

    function getRarityLabel(rarity){
      const map = {
        common: 'Common',
        rare: 'Rare',
        epic: 'Epic',
        mythic: 'Mythic'
      };
      return map[String(rarity || 'common').toLowerCase()] || 'Common';
    }

    function getRarityColor(rarity){
      const map = {
        common: '#9cb5de',
        rare: '#6ad7ff',
        epic: '#ffb66d',
        mythic: '#ff7d9f'
      };
      return map[String(rarity || 'common').toLowerCase()] || '#9cb5de';
    }

    function getWeeklyStoreState(){
      if(!shopCatalog.length) return { featuredId: '', priceById: {} };
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const week = Math.ceil((now - yearStart) / (1000 * 60 * 60 * 24 * 7));
      const seed = Number(String(now.getFullYear()) + String(week));
      const idx = seed % shopCatalog.length;
      const item = shopCatalog[idx];
      const priceById = {};
      if(item) priceById[item.id] = Math.max(1, Math.floor(item.cost * 0.75));
      return { featuredId: item ? item.id : '', priceById };
    }

    function getItemDailyPurchaseCount(itemId){
      const key = todayKey();
      const map = playerProfile.dailyStockPurchases?.[key] || {};
      return Number(map[itemId] || 0);
    }

    function recordDailyPurchase(itemId, amount){
      const key = todayKey();
      playerProfile.dailyStockPurchases[key] = playerProfile.dailyStockPurchases[key] || {};
      playerProfile.dailyStockPurchases[key][itemId] = Number(playerProfile.dailyStockPurchases[key][itemId] || 0) + Number(amount || 1);
      Object.keys(playerProfile.dailyStockPurchases).forEach(k=>{ if(k !== key) delete playerProfile.dailyStockPurchases[k]; });
    }

    function isXpBoostActive(){
      if(!playerProfile.xpBoostUntil) return false;
      return new Date(playerProfile.xpBoostUntil).getTime() > Date.now();
    }

    function getDailyStoreState(){
      const count = Math.min(3, shopCatalog.length);
      const seed = daySeed();
      const arr = [...shopCatalog];
      for(let i=arr.length-1;i>0;i--){
        const j = (seed + i * 13) % (i + 1);
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      const featured = arr.slice(0, count).map(i=>i.id);
      const prices = {};
      featured.forEach(id=>{
        const item = shopCatalog.find(s=>s.id===id);
        if(item) prices[id] = Math.max(1, Math.floor(item.cost * 0.8));
      });
      return { featuredIds: featured, prices };
    }

    function getShopPrice(item){
      const daily = getDailyStoreState();
      const weekly = getWeeklyStoreState();
      return weekly.priceById[item.id] || daily.prices[item.id] || item.cost;
    }

    function getBundlePrice(bundle){
      const seed = daySeed() + bundle.id.length * 17;
      const discounted = seed % 4 === 0;
      return discounted ? Math.max(1, Math.floor(bundle.cost * 0.9)) : bundle.cost;
    }

    function applyShopGrant(type, amount){
      if(type === 'xp') addXpAndCoins(amount, 0);
      if(type === 'coins') addXpAndCoins(0, amount);
      if(type === 'unlock') unlockRandomLockedGames(amount || 1);
      if(type === 'streak-shield') playerProfile.streakShields = Math.min(5, Number(playerProfile.streakShields || 0) + Number(amount || 1));
      if(type === 'quest-reroll') playerProfile.questRerollTokens = Math.min(5, Number(playerProfile.questRerollTokens || 0) + Number(amount || 1));
      if(type === 'coin-pass') playerProfile.runCoinBoostRuns = Math.min(12, Number(playerProfile.runCoinBoostRuns || 0) + Number(amount || 0));
    }

    function useQuestRerollToken(){
      if(Number(playerProfile.questRerollTokens || 0) <= 0) return false;
      const progress = getQuestProgress();
      const today = todayKey();
      const targetList = questCatalog.filter(q=>!q.permanent && !q.id.startsWith('q-season-'));
      const pick = targetList.find(q=>!hasClaimedQuest(q.id) && (progress[q.id] || 0) < questTarget(q.id));
      if(!pick) return false;
      playerProfile.questRerollTokens -= 1;
      playerProfile.questAutoClaims[today] = playerProfile.questAutoClaims[today] || {};
      playerProfile.questAutoClaims[today][pick.id] = questTarget(pick.id);
      showMessage('Quest rerolled into a completed objective: ' + pick.label + '.');
      pushActivity('Used Quest Reroll Token on ' + pick.label);
      return true;
    }

    function buyBundle(bundleId){
      const bundle = shopBundles.find(b=>b.id===bundleId);
      if(!bundle) return;
      if(Number(playerProfile.level || 1) < Number(bundle.unlockLevel || 1)){
        showMessage('Reach level ' + bundle.unlockLevel + ' to buy ' + bundle.title + '.');
        return;
      }
      if(bundle.oneTime && playerProfile.bundlePurchases[bundle.id]){
        showMessage('You already own ' + bundle.title + '.');
        return;
      }
      const price = getBundlePrice(bundle);
      if(Number(playerProfile.coins || 0) < price){
        showMessage('Not enough coins for ' + bundle.title + '.');
        return;
      }
      playerProfile.coins -= price;
      (bundle.grants || []).forEach(grant=>applyShopGrant(grant.type, grant.amount));
      playerProfile.bundlePurchases[bundle.id] = (playerProfile.bundlePurchases[bundle.id] || 0) + 1;
      saveProfile();
      renderProfilePanel();
      renderGameGrid();
      renderFeatured();
      renderTrending();
      renderContinuePlaying();
      renderQuestBoard();
      renderShop();
      renderSeasonalShop();
      showMessage('Bundle purchased: ' + bundle.title + '.');
      pushActivity('Bought bundle: ' + bundle.title);
    }

    function buyShopItem(itemId){
      const item = shopCatalog.find(i=>i.id===itemId);
      if(!item) return;
      if(Number(playerProfile.level || 1) < Number(item.unlockLevel || 1)){
        showMessage('Reach level ' + item.unlockLevel + ' to buy ' + item.title + '.');
        return;
      }
      if(item.oneTime && playerProfile.purchases[item.id]){
        showMessage('You already own ' + item.title + '.');
        return;
      }
      if(item.stockDaily){
        const boughtToday = getItemDailyPurchaseCount(item.id);
        if(boughtToday >= Number(item.stockDaily)){
          showMessage(item.title + ' is sold out for today.');
          return;
        }
      }
      const price = getShopPrice(item);
      if(playerProfile.coins < price){
        showMessage('Not enough coins for ' + item.title + '.');
        return;
      }

      playerProfile.coins -= price;
      if(item.type === 'xp'){
        addXpAndCoins(item.value, 0);
      } else if(item.type === 'unlock'){
        const locked = games.filter((g, idx)=>!isGameUnlocked(g, idx));
        if(!locked.length){
          showMessage('All games are already unlocked.');
          playerProfile.coins += price;
          return;
        }
        const pick = locked[Math.floor(Math.random()*locked.length)];
        if(!playerProfile.unlockedGames.includes(pick.id)) playerProfile.unlockedGames.push(pick.id);
        showMessage('Unlocked: ' + pick.title + '!');
      } else if(item.type === 'theme'){
        if(!playerProfile.ownedThemes.includes(item.value)) playerProfile.ownedThemes.push(item.value);
        applyThemeSelection(item.value);
        showMessage(item.title + ' purchased and applied.');
      } else if(item.type === 'coin-pass'){
        playerProfile.runCoinBoostRuns = Math.min(12, Number(playerProfile.runCoinBoostRuns || 0) + Number(item.value || 0));
        showMessage(item.title + ' activated. Coin-pass runs: ' + playerProfile.runCoinBoostRuns + '.');
      } else if(item.type === 'xp-window'){
        const now = Date.now();
        const base = isXpBoostActive() ? new Date(playerProfile.xpBoostUntil).getTime() : now;
        const addMs = Number(item.windowDays || 2) * 24 * 60 * 60 * 1000;
        const capMs = now + (7 * 24 * 60 * 60 * 1000);
        playerProfile.xpBoostUntil = new Date(Math.min(base + addMs, capMs)).toISOString();
        showMessage(item.title + ' activated. XP boost is now live.');
      } else if(item.type === 'streak-shield'){
        playerProfile.streakShields = Math.min(5, Number(playerProfile.streakShields || 0) + Number(item.value || 1));
        showMessage('Streak Shield added. Current shields: ' + playerProfile.streakShields + '.');
      } else if(item.type === 'quest-reroll'){
        playerProfile.questRerollTokens = Math.min(5, Number(playerProfile.questRerollTokens || 0) + Number(item.value || 1));
        const rerolled = useQuestRerollToken();
        if(!rerolled) showMessage('Quest token stored. Use it once an unfinished daily quest appears.');
      }

      playerProfile.purchases[item.id] = (playerProfile.purchases[item.id] || 0) + 1;
      if(item.stockDaily) recordDailyPurchase(item.id, 1);
      saveProfile();
      renderProfilePanel();
      renderGameGrid();
      renderFeatured();
      renderTrending();
      renderContinuePlaying();
      renderQuestBoard();
      renderShop();
      renderSeasonalShop();
    }

    function renderShop(){
      const grid = document.getElementById('shopGrid');
      const bundleGrid = document.getElementById('shopBundleGrid');
      if(!grid) return;
      grid.innerHTML = '';
      const daily = getDailyStoreState();
      const weekly = getWeeklyStoreState();
      shopCatalog.forEach(item=>{
        const owned = item.oneTime && playerProfile.purchases[item.id];
        const lockedByLevel = Number(playerProfile.level || 1) < Number(item.unlockLevel || 1);
        const price = getShopPrice(item);
        const afford = playerProfile.coins >= price;
        const isDaily = daily.featuredIds.includes(item.id);
        const isWeekly = weekly.featuredId === item.id;
        const stockLeft = item.stockDaily ? Math.max(0, Number(item.stockDaily) - getItemDailyPurchaseCount(item.id)) : null;
        const card = document.createElement('div');
        card.className = 'shop-item';
        const rarity = getRarityLabel(item.rarity);
        const badges = (isWeekly ? '<span class="shop-badge">Weekly -25%</span>' : '') + (isDaily && !isWeekly ? '<span class="shop-badge">Daily -20%</span>' : '');
        const meta = 'Rarity: <span style="color:' + getRarityColor(item.rarity) + ';font-weight:700;">' + rarity + '</span> | Unlock Lv ' + (item.unlockLevel || 1) + (item.stockDaily ? (' | Stock today: ' + stockLeft) : '');
        const btnLabel = owned ? 'Owned' : (lockedByLevel ? ('Reach Lv ' + item.unlockLevel) : ('Buy (' + price + ' coins)'));
        card.innerHTML = '<h4>' + item.title + badges + '</h4><p>' + item.desc + '</p><div style="font-size:0.78rem;color:#95aedb;margin-bottom:8px;">' + meta + '</div><button>' + btnLabel + '</button>';
        const btn = card.querySelector('button');
        const soldOut = item.stockDaily && stockLeft <= 0;
        btn.disabled = Boolean(owned || lockedByLevel || soldOut);
        if((!afford && !owned && !lockedByLevel) || soldOut) btn.style.opacity = '0.72';
        if(soldOut && !owned) btn.textContent = 'Sold Out Today';
        btn.addEventListener('click', ()=>buyShopItem(item.id));
        grid.appendChild(card);
      });

      if(bundleGrid){
        bundleGrid.innerHTML = '';
        shopBundles.forEach(bundle=>{
          const owned = bundle.oneTime && playerProfile.bundlePurchases[bundle.id];
          const lockedByLevel = Number(playerProfile.level || 1) < Number(bundle.unlockLevel || 1);
          const price = getBundlePrice(bundle);
          const afford = Number(playerProfile.coins || 0) >= price;
          const discounted = price < bundle.cost;
          const card = document.createElement('div');
          card.className = 'shop-item';
          const meta = 'Rarity: <span style="color:' + getRarityColor(bundle.rarity) + ';font-weight:700;">' + getRarityLabel(bundle.rarity) + '</span> | Unlock Lv ' + (bundle.unlockLevel || 1);
          const btnLabel = owned ? 'Owned' : (lockedByLevel ? ('Reach Lv ' + bundle.unlockLevel) : ('Buy Bundle (' + price + ' coins)'));
          card.innerHTML = '<h4>' + bundle.title + (discounted ? '<span class="shop-badge">Daily Bundle -10%</span>' : '') + '</h4><p>' + bundle.desc + '</p><div style="font-size:0.78rem;color:#95aedb;margin-bottom:8px;">' + meta + '</div><button>' + btnLabel + '</button>';
          const btn = card.querySelector('button');
          btn.disabled = Boolean(owned || lockedByLevel);
          if(!afford && !owned && !lockedByLevel) btn.style.opacity = '0.72';
          btn.addEventListener('click', ()=>buyBundle(bundle.id));
          bundleGrid.appendChild(card);
        });
      }
    }

    function unlockRandomLockedGames(count){
      let unlocked = [];
      for(let i=0;i<count;i++){
        const locked = games.filter((g, idx)=>!isGameUnlocked(g, idx) && !unlocked.includes(g.id));
        if(!locked.length) break;
        const pick = locked[Math.floor(Math.random()*locked.length)];
        if(!playerProfile.unlockedGames.includes(pick.id)) playerProfile.unlockedGames.push(pick.id);
        unlocked.push(pick.id);
      }
      return unlocked;
    }

    function setRedeemMessage(msg, ok=false){
      const el = document.getElementById('redeemCodeMessage');
      const elShop = document.getElementById('shopRedeemCodeMessage');
      if(el){
        el.textContent = msg;
        el.style.color = ok ? '#7dff9f' : '#ffd2a8';
      }
      if(elShop){
        elShop.textContent = msg;
        elShop.style.color = ok ? '#7dff9f' : '#ffd2a8';
      }
    }

    function redeemCode(rawCode){
      const code = String(rawCode || '').trim().toUpperCase();
      if(!code){ setRedeemMessage('Enter a code first.'); return; }
      const promo = promoCodes[code];
      if(!promo){ setRedeemMessage('Invalid code.'); return; }
      if(playerProfile.redeemedCodes[code]){ setRedeemMessage('Code already redeemed on this profile.'); return; }

      if(promo.type === 'coins'){
        addXpAndCoins(0, promo.amount);
      } else if(promo.type === 'xp'){
        addXpAndCoins(promo.amount, 0);
      } else if(promo.type === 'theme'){
        if(!playerProfile.ownedThemes.includes(promo.theme)) playerProfile.ownedThemes.push(promo.theme);
        applyThemeSelection(promo.theme);
      } else if(promo.type === 'unlock'){
        const unlocked = unlockRandomLockedGames(promo.amount || 1);
        if(!unlocked.length){
          setRedeemMessage('All games are already unlocked.');
          return;
        }
      }

      playerProfile.redeemedCodes[code] = todayKey();
      saveProfile();
      renderProfilePanel();
      renderGameGrid();
      renderShop();
      renderSeasonalShop();
      renderFeatured();
      setRedeemMessage(promo.msg, true);
    }

    function renderProfilePanel(){
      const headline = document.getElementById('profileHeadline');
      const fill = document.getElementById('xpFill');
      const label = document.getElementById('xpLabel');
      const stats = document.getElementById('profileStats');
      const topCoinCount = document.getElementById('topCoinCount');
      if(topCoinCount) topCoinCount.textContent = String(playerProfile.coins || 0);
      if(!headline || !fill || !label || !stats) return;
      const xpNeed = getXpForLevel(playerProfile.level);
      const percent = Math.max(0, Math.min(100, (playerProfile.xp / xpNeed) * 100));
      headline.textContent = formatName() + ' | Level ' + playerProfile.level;
      fill.style.width = percent + '%';
      label.textContent = 'XP ' + playerProfile.xp + ' / ' + xpNeed;
      stats.innerHTML = '';
      const entries = [
        ['Coins', playerProfile.coins],
        ['Login Streak', playerProfile.streak + ' days'],
        ['Play Streak', playerProfile.playStreak + ' days'],
        ['Unlocked', playerProfile.unlockedGames.length + '/' + games.length],
        ['Daily', playerProfile.dailyChallengeClaimedDate === todayKey() ? 'Done' : 'Pending']
      ];
      entries.forEach(([k,v])=>{
        const node=document.createElement('div');
        node.className='stat-chip';
        node.innerHTML='<span>'+k+'</span><strong>'+v+'</strong>';
        stats.appendChild(node);
      });
      renderHomeDashboard();
    }

    function showHighScores() {
      const list = document.querySelector('#highscoreList');
      list.innerHTML='';
      renderGlobalFanBanners();
      const today = todayKey();
      if(dailyScores[today]){
        const d = dailyScores[today];
        const item = document.createElement('li');
        item.className='score-item';
        item.innerHTML = '<strong>Daily ' + today + '</strong>: ' + d.score + ' by ' + d.name + ' (' + (games.find(g=>g.id===d.gameId)?.title || d.gameId) + ')';
        list.appendChild(item);
      }
      const entries = Object.entries(highScores).sort((a,b)=>b[1].score-a[1].score).slice(0,25);
      if(entries.length===0){
        list.innerHTML += '<li class="score-item">No scores yet. Play a game!</li>';
        return;
      }
      for(const [id,data] of entries){
        const item=document.createElement('li');
        item.className='score-item';
        item.innerHTML='<strong>' + (games.find(g=>g.id===id)?.title || id) + '</strong>: ' + data.score + ' by ' + data.name + ' <small>' + data.date + '</small>';
        list.appendChild(item);
      }
    }

    function getFeaturedGame(){
      const unlocked = games.filter((g, idx)=>isGameUnlocked(g, idx));
      const pickFrom = unlocked.length ? unlocked : games;
      const idx = new Date().getDate() % pickFrom.length;
      return pickFrom[idx];
    }
    function getDailyGame(){
      const unlocked = games.filter((g, idx)=>isGameUnlocked(g, idx) && g.id !== 'daily-challenge');
      const pool = unlocked.length ? unlocked : games.filter(g=>g.id !== 'daily-challenge');
      const idx = new Date().getDate() % pool.length;
      return pool[idx];
    }
    function getRandomGame(){
      const unlocked = games.filter((g, idx)=>isGameUnlocked(g, idx));
      const pool = unlocked.length ? unlocked : games;
      return pool[Math.floor(Math.random()*pool.length)];
    }

    function chooseRunEnhancer(gameId){
      const stats = playerProfile.gameStats[gameId] || { best:0, plays:0 };
      const seed = Number(todayKey().replace(/-/g, '')) + gameId.length + Number(stats.plays || 0) + Number(playerProfile.level || 1) * 3;
      const mode = runEnhancerModes[seed % runEnhancerModes.length];
      const baseline = Math.max(35, Number(stats.best || 0));
      const targetBoost = mode.id === 'risk' ? 1.1 : mode.id === 'marathon' ? 0.95 : 1.0;
      const target = Math.max(40, Math.round((baseline * targetBoost) + Number(playerProfile.level || 1) * 7));
      return {
        ...mode,
        gameId,
        target,
        completed: false,
        currentScore: 0
      };
    }

    function updateRunEnhancerMeta(){
      const nameEl = document.getElementById('runBoostName');
      const descEl = document.getElementById('runBoostDesc');
      const objectiveEl = document.getElementById('runBoostObjective');
      if(!nameEl || !descEl || !objectiveEl) return;
      if(!activeRunEnhancer){
        nameEl.textContent = 'Standard Run';
        descEl.textContent = 'No special modifier.';
        objectiveEl.textContent = 'Objective: Reach score 0';
        return;
      }
      nameEl.textContent = activeRunEnhancer.name;
      descEl.textContent = activeRunEnhancer.desc;
      objectiveEl.textContent = 'Objective: Reach score ' + activeRunEnhancer.target + ' for bonus +' + activeRunEnhancer.bonusScore + ' score';
    }

    function updateRunProgress(score){
      const fill = document.getElementById('runProgressFill');
      const label = document.getElementById('runProgressLabel');
      if(!fill || !label) return;
      if(!activeRunEnhancer){
        fill.style.width = '0%';
        label.textContent = 'Progress 0%';
        return;
      }
      const numeric = Math.max(0, Number(score || 0));
      activeRunEnhancer.currentScore = numeric;
      const target = Math.max(1, Number(activeRunEnhancer.target || 1));
      const pct = Math.max(0, Math.min(100, (numeric / target) * 100));
      fill.style.width = pct + '%';
      const remaining = Math.max(0, target - numeric);
      if(remaining === 0){
        label.textContent = 'Objective complete. Bonus unlocked.';
      } else {
        label.textContent = 'Progress ' + Math.round(pct) + '% | ' + remaining + ' score to bonus';
      }
    }

    function renderFeatured(){
      const slot = document.getElementById('featuredGameCard');
      if(!slot) return;
      const game = getFeaturedGame();
      slot.innerHTML = '<h4 style="margin:0 0 6px;">' + game.icon + ' ' + game.title + '</h4><p style="margin:0 0 10px;color:#b8cae7;">' + game.desc + '</p><button class="play-btn" id="featuredPlay">Play Featured</button>';
      const btn = document.getElementById('featuredPlay');
      if(btn) btn.addEventListener('click', ()=>openGamePage(game));
    }

    function renderContinuePlaying(){
      const list = document.getElementById('continuePlayingList');
      if(!list) return;
      const ids = playerProfile.recentlyPlayed.slice(0,4);
      if(!ids.length){
        list.innerHTML = '<div class="mini-item"><span>No recent sessions yet. Launch a game to populate this list.</span></div>';
        return;
      }
      list.innerHTML = '';
      ids.forEach(id=>{
        const game = games.find(g=>g.id===id);
        if(!game) return;
        const item=document.createElement('div');
        item.className='mini-item';
        item.innerHTML = '<span>' + game.icon + ' ' + game.title + '</span><button>Resume</button>';
        item.querySelector('button').addEventListener('click', ()=>openGamePage(game));
        list.appendChild(item);
      });
    }

    function renderTrending(){
      const list = document.getElementById('trendingGamesList');
      if(!list) return;
      const entries = Object.entries(playerProfile.gameStats)
        .sort((a,b)=> (b[1].plays||0) - (a[1].plays||0))
        .slice(0,4);
      if(!entries.length){
        list.innerHTML = '<div class="mini-item"><span>Trending will appear after a few plays.</span></div>';
        return;
      }
      list.innerHTML = '';
      entries.forEach(([id,data], i)=>{
        const game = games.find(g=>g.id===id);
        if(!game) return;
        const item=document.createElement('div');
        item.className='mini-item';
        item.innerHTML = '<span>#' + (i+1) + ' ' + game.icon + ' ' + game.title + ' (' + (data.plays||0) + ' plays)</span><button>Play</button>';
        item.querySelector('button').addEventListener('click', ()=>openGamePage(game));
        list.appendChild(item);
      });
    }

    function renderGameGrid() {
      const grid = document.getElementById('gameGrid');
      if (!grid) return;
      grid.innerHTML = '';
      games.forEach((game, idx) => grid.appendChild(Components.GameCard.create(game, idx)));
    }

    function setScore(value){
      gameScore = Number(value) || 0;
      const scoreEl = document.querySelector('#scoreValue');
      if(scoreEl) scoreEl.textContent = gameScore;
      updateRunProgress(gameScore);
    }
    function updateBestValue(gameId){ const best = highScores[gameId]?.score || 0; document.querySelector('#bestValue').textContent = best; }

    function playRandomGame(){ const game = getRandomGame(); if(game){ openGamePage(game); showMessage('Random unlocked game: '+game.title); }}
    function playDailyChallenge(){ const game = getDailyGame(); if(!game){ showMessage('Daily Challenge unavailable.'); return;} dailyGameId = game.id; openGamePage(game); showMessage('Daily Challenge: '+game.title+' for bonus XP/coins.'); }
    function startBossMode(){
      bossModeActive = true;
      bossModeStage = 0;
      bossModeScore = 0;
      showMessage('Boss Mode started. Difficulty and score multipliers increase each stage.');
      playNextBossLevel();
    }
    function playNextBossLevel(){
      if(!bossModeActive) return;
      bossModeStage++;
      if(bossModeStage > 3){
        showMessage('Boss Mode complete! Total adjusted score: ' + bossModeScore);
        bossModeActive = false;
        achievements.bossMaster = true;
        saveAchievements();
        renderAchievements();
        return;
      }
      const rule = bossRules[bossModeStage-1];
      const game = getRandomGame();
      if(game){
        openGamePage(game);
        showMessage('Boss Stage ' + bossModeStage + ': ' + game.title + ' | x' + rule.mult + ' score | Min ' + rule.minScore + ' | ' + rule.speedNote);
      }
    }
    function endBossLevel(score){
      if(!bossModeActive) return;
      const rule = bossRules[Math.max(0,bossModeStage-1)];
      if(score < rule.minScore){
        bossModeActive = false;
        showMessage('Boss Mode failed. Needed ' + rule.minScore + ', got ' + score + '.');
        return;
      }
      bossModeScore += score;
      if(bossModeStage >= 3){
        bossModeActive = false;
        achievements.bossMaster = true;
        saveAchievements();
        renderAchievements();
        showMessage('Boss Mode cleared! Total adjusted score: ' + bossModeScore);
      } else {
        showMessage('Boss stage cleared. Next stage loading...');
        setTimeout(playNextBossLevel, 1200);
      }
    }

    let releaseGameViewportSync = null;
    let activeGameCleanup = [];

    function showMessage(msg){ const target=document.getElementById('howTo'); if(target){ target.textContent = msg; }}

    function registerGameCleanup(fn) {
      if(typeof fn === 'function') activeGameCleanup.push(fn);
    }

    function clearGameCleanup() {
      activeGameCleanup.forEach(fn=>{
        try { fn(); } catch (err) { console.warn('Cleanup failed', err); }
      });
      activeGameCleanup = [];
    }

    function createTouchControls(area, rows, options = {}) {
      const wrap = document.createElement('div');
      wrap.className = 'touch-controls' + (options.compact ? ' compact' : '');
      rows.forEach(row=>{
        const rowEl = document.createElement('div');
        rowEl.className = 'touch-row';
        row.forEach(control=>{
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'touch-btn';
          btn.textContent = control.label;
          btn.addEventListener('click', (event)=>{
            event.preventDefault();
            btn.classList.add('is-active');
            control.onPress();
            window.setTimeout(()=>btn.classList.remove('is-active'), 110);
          });
          rowEl.appendChild(btn);
        });
        wrap.appendChild(rowEl);
      });
      area.appendChild(wrap);
      return wrap;
    }

    function attachDirectionalSwipe(target, handlers) {
      let startX = 0;
      let startY = 0;
      let active = false;
      const onStart = (event) => {
        const touch = event.changedTouches && event.changedTouches[0];
        if(!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        active = true;
      };
      const onEnd = (event) => {
        if(!active) return;
        active = false;
        const touch = event.changedTouches && event.changedTouches[0];
        if(!touch) return;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if(Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if(Math.abs(dx) > Math.abs(dy)) {
          if(dx > 0 && handlers.right) handlers.right();
          if(dx < 0 && handlers.left) handlers.left();
        } else {
          if(dy > 0 && handlers.down) handlers.down();
          if(dy < 0 && handlers.up) handlers.up();
        }
      };
      target.addEventListener('touchstart', onStart, { passive: true });
      target.addEventListener('touchend', onEnd, { passive: true });
      registerGameCleanup(()=>{
        target.removeEventListener('touchstart', onStart);
        target.removeEventListener('touchend', onEnd);
      });
    }

    function attachTouchMoveControl(target, onMove) {
      const handleTouch = (event) => {
        const touch = event.touches && event.touches[0];
        if(!touch) return;
        const rect = target.getBoundingClientRect();
        onMove({ x: touch.clientX - rect.left, y: touch.clientY - rect.top, rect });
        event.preventDefault();
      };
      target.addEventListener('touchstart', handleTouch, { passive: false });
      target.addEventListener('touchmove', handleTouch, { passive: false });
      registerGameCleanup(()=>{
        target.removeEventListener('touchstart', handleTouch);
        target.removeEventListener('touchmove', handleTouch);
      });
    }

    function stopGameViewportSync() {
      if(releaseGameViewportSync){
        releaseGameViewportSync();
        releaseGameViewportSync = null;
      }
      const area = document.getElementById('gameArea');
      if(area){
        area.style.removeProperty('--game-max-height');
        area.style.removeProperty('--game-max-width');
      }
    }

    function syncGameViewport() {
      const root = document.getElementById('gameModal');
      const modal = root ? root.querySelector('.modal') : null;
      const area = document.getElementById('gameArea');
      if(!root || !modal || !area || !root.classList.contains('open')) return;
      const modalRect = modal.getBoundingClientRect();
      const areaRect = area.getBoundingClientRect();
      const availableHeight = Math.max(220, Math.min(window.innerHeight - areaRect.top - 24, modalRect.bottom - areaRect.top - 18));
      area.style.setProperty('--game-max-height', Math.round(availableHeight) + 'px');
      area.style.setProperty('--game-max-width', Math.max(220, Math.floor(area.clientWidth)) + 'px');
    }

    function startGameViewportSync() {
      stopGameViewportSync();
      const onResize = () => syncGameViewport();
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      document.addEventListener('fullscreenchange', onResize);
      if(window.visualViewport){
        window.visualViewport.addEventListener('resize', onResize);
      }
      releaseGameViewportSync = () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
        document.removeEventListener('fullscreenchange', onResize);
        if(window.visualViewport){
          window.visualViewport.removeEventListener('resize', onResize);
        }
      };
      requestAnimationFrame(syncGameViewport);
    }

    function closeModal() {
      clearInterval(timerInterval); timerInterval=null;
      document.getElementById('gameModal').classList.remove('open');
      clearGameCleanup();
      document.getElementById('gameArea').innerHTML=''; currentGame=null;
      activeRunEnhancer = null;
      updateRunEnhancerMeta();
      updateRunProgress(0);
      currentRun = { gameId: '', bestScore: -1, counted: false };
      document.body.classList.remove('in-game');
      stopGameViewportSync();
      stopMusic(); if(musicOn) startMusic();
    }

    function openGamePage(game, updateHash = true) {
      const gameIdx = games.findIndex(g=>g.id===game.id);
      if(gameIdx >= 0 && !isGameUnlocked(game, gameIdx)){
        showMessage('This game is locked. Reach level ' + getUnlockLevel(game, gameIdx) + ' to unlock it.');
        return;
      }
      currentGame = game;
      currentRun = { gameId: game.id, bestScore: -1, counted: false };
      activeRunEnhancer = chooseRunEnhancer(game.id);
      const modal = document.getElementById('gameModal');
      modal.classList.add('open');
      document.body.classList.add('in-game');
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      document.getElementById('gameTitle').textContent = game.title;
      document.getElementById('gameDesc').textContent = game.desc;
      updateRunEnhancerMeta();
      updateRunProgress(0);
      Components.Sidebar.renderGameMeta(game);
      updateBestValue(game.id);
      if(updateHash){
        history.pushState({ gameId: game.id }, '', '#game/' + game.id);
      }

      const area = document.getElementById('gameArea');
      area.innerHTML = '';
      setScore(0);
      startGameViewportSync();

      // Run game engine directly from this file (no iframe needed)
      const engineFn = gameEngines[game.engine] || gameEngines.generic;
      if (!engineFn) {
        area.innerHTML = '<div style="color:#f6615e; padding:14px;">No engine available for this game.</div>';
        return;
      }
      try {
        engineFn(area, game);
        requestAnimationFrame(syncGameViewport);
      } catch (err) {
        console.error('Engine load failed:', err);
        area.innerHTML = '<div style="color:#f6615e; padding:14px;">Game failed to start. Try another one.</div>';
      }
    }

    function openModal(game) { openGamePage(game); }

    function closeGamePage(updateHash = true) {
      closeModal();
      if(updateHash){
        history.pushState({}, '', '#home');
      }
      const homeBtn = document.querySelector('.nav-btn[data-panel="home"]');
      if(homeBtn) homeBtn.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function routeFromHash() {
      const hash = (location.hash || '').replace(/^#/, '');
      if(hash.startsWith('game/')){
        const gameId = hash.slice(5);
        const game = games.find(g=>g.id===gameId);
        if(game){
          openGamePage(game, false);
          return;
        }
      }
      closeModal();
    }

    document.querySelectorAll('.nav-btn').forEach(btn=>{ btn.addEventListener('click',()=>{ document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); const target=btn.dataset.panel; ['home','games','anime','fan','shop','scores','settings'].forEach(p=>document.getElementById(p).classList.remove('panel-active')); document.getElementById(target).classList.add('panel-active'); if(target==='scores') showHighScores(); if(target==='anime') renderAnimeLounge(); if(target==='fan') renderFanProfile(); if(target==='shop'){ renderShop(); renderSeasonalShop(); } }); });
    document.getElementById('randomGameBtn').addEventListener('click', playRandomGame);
    document.getElementById('dailyChallengeBtn').addEventListener('click', playDailyChallenge);
    document.getElementById('practiceModeBtn').addEventListener('click', ()=>{ practiceMode = !practiceMode; Components.Header.renderHeroButtons(); showMessage(practiceMode ? 'Practice mode enabled: reduced XP, no coins.' : 'Normal mode enabled.'); });
    document.getElementById('bossModeBtn').addEventListener('click', startBossMode);
    const spinBtn = document.getElementById('dailySpinBtn');
    if(spinBtn) spinBtn.addEventListener('click', claimDailySpin);
    const animeBtn = document.getElementById('animeBookSearchBtn');
    const animeInput = document.getElementById('animeTitleInput');
    if(animeBtn) animeBtn.addEventListener('click', openAnimeBookSearch);
    if(animeInput) animeInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') openAnimeBookSearch(); });
    const animeAmbientSelect = document.getElementById('animeAmbientSelect');
    const animeAmbientToggleBtn = document.getElementById('animeAmbientToggleBtn');
    if(animeAmbientSelect){
      animeAmbientSelect.addEventListener('change', ()=>{
        playerProfile.animeAmbientTheme = animeAmbientSelect.value;
        if(playerProfile.animeAmbientTheme === 'off') playerProfile.animeAmbientOn = false;
        saveProfile();
        if(playerProfile.animeAmbientOn) startAnimeAmbient(); else stopAnimeAmbient();
        renderAnimeLounge();
      });
    }
    if(animeAmbientToggleBtn){
      animeAmbientToggleBtn.addEventListener('click', ()=>{
        if((playerProfile.animeAmbientTheme || 'off') === 'off') playerProfile.animeAmbientTheme = 'shrine';
        playerProfile.animeAmbientOn = !playerProfile.animeAmbientOn;
        saveProfile();
        if(playerProfile.animeAmbientOn) startAnimeAmbient(); else stopAnimeAmbient();
        renderAnimeLounge();
      });
    }
    document.addEventListener('click', (event)=>{
      const musicBtn = event.target.closest('[data-music-player]');
      if(musicBtn){
        handleAnimeMusicPlayer(musicBtn.dataset.musicPlayer);
        return;
      }
      const bannerBtn = event.target.closest('[data-set-banner]');
      if(bannerBtn){
        playerProfile.animeBannerCardId = bannerBtn.dataset.setBanner;
        saveProfile();
        renderAnimeFanGallery();
        renderGlobalFanBanners();
        renderFanProfile();
        showMessage('Fan banner updated.');
        return;
      }
      const frameBtn = event.target.closest('[data-equip-frame]');
      if(frameBtn){
        const frameId = frameBtn.dataset.equipFrame;
        if((playerProfile.seasonalInventory || []).includes(frameId)){
          playerProfile.equippedSeasonalFrame = frameId;
          saveProfile();
          renderFanProfile();
          renderGlobalFanBanners();
          renderSeasonalShop();
          showMessage('Seasonal frame equipped.');
        }
        return;
      }
      const galleryBtn = event.target.closest('[data-fan-card-download]');
      if(galleryBtn){
        const saved = (playerProfile.animeSavedCards || []).find(item=>item.id===galleryBtn.dataset.fanCardDownload);
        if(saved){
          const link = document.createElement('a');
          link.href = saved.image;
          link.download = saved.id + '.png';
          link.click();
          showMessage('Downloaded saved fan card snapshot.');
        }
        return;
      }
      if(event.target.id === 'saveFanCardBtn'){
        exportAnimeFanCard();
        return;
      }
      if(event.target.id === 'shareFanCardBtn'){
        copyAnimeFanSummary();
      }
    });
    const quoteBtn = document.getElementById('animeQuoteBtn');
    if(quoteBtn) quoteBtn.addEventListener('click', renderAnimeQuote);
    const vibeControls = document.getElementById('animeVibeControls');
    if(vibeControls){
      vibeControls.querySelectorAll('button').forEach(btn=>btn.addEventListener('click', ()=>{
        playerProfile.animeVibe = btn.dataset.vibe || 'epic';
        saveProfile();
        renderAnimeLounge();
      }));
    }
    const animeUpdateBtn = document.getElementById('animeUpdateFavBtn');
    const animeQuickInput = document.getElementById('animeQuickInput');
    if(animeUpdateBtn && animeQuickInput){
      animeUpdateBtn.addEventListener('click', ()=>{
        if(setFavoriteAnime(animeQuickInput.value, playerProfile.animeGenre)){
          showMessage('Anime lounge updated for ' + playerProfile.favoriteAnime + '.');
        }
      });
      animeQuickInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ animeUpdateBtn.click(); } });
    }
    const wishlistBtn = document.getElementById('animeWishlistAddBtn');
    const wishlistInput = document.getElementById('animeWishlistInput');
    if(wishlistBtn && wishlistInput){
      wishlistBtn.addEventListener('click', ()=>{
        const val = (wishlistInput.value || '').trim();
        if(!val) return;
        playerProfile.animeWishlist = [val, ...playerProfile.animeWishlist.filter(v=>v.toLowerCase()!==val.toLowerCase())].slice(0,20);
        syncAnimeBadges();
        saveProfile();
        renderAnimeWishlist();
        renderAnimeBadges();
        renderAnimeFanCard();
        wishlistInput.value='';
        pushActivity('Added to anime wishlist: ' + val);
      });
      wishlistInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ wishlistBtn.click(); } });
    }
    const starterBtn = document.getElementById('animeStarterBtn');
    const starterInput = document.getElementById('animeStarterInput');
    const starterGenre = document.getElementById('animeStarterGenre');
    const starterMsg = document.getElementById('animeStarterMsg');
    if(starterBtn && starterInput && starterGenre){
      starterBtn.addEventListener('click', ()=>{
        const ok = setFavoriteAnime(starterInput.value, starterGenre.value);
        if(!ok){ if(starterMsg) starterMsg.textContent = 'Enter your favorite anime to start.'; return; }
        const modal = document.getElementById('animeOnboardModal');
        if(modal) modal.classList.remove('open');
        if(starterMsg) starterMsg.textContent = 'Personal anime zone ready!';
        const animeNav = document.querySelector('.nav-btn[data-panel="anime"]');
        if(animeNav) animeNav.click();
      });
      starterInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') starterBtn.click(); });
    }
    document.getElementById('fullscreenBtn').addEventListener('click', ()=>{ const modal=document.querySelector('.modal'); if(modal){ if(!document.fullscreenElement){ modal.requestFullscreen().catch(()=>{}); } else{ document.exitFullscreen().catch(()=>{}); } }});
    document.getElementById('closeBtn').addEventListener('click', ()=>closeGamePage(true));
    document.getElementById('restartBtn').addEventListener('click',()=>{ if(currentGame){ openGamePage(currentGame, false); } });
    document.getElementById('soundToggle').addEventListener('click',e=>{ soundOn=!soundOn; e.target.classList.toggle('active', soundOn); e.target.textContent = soundOn ? 'Sound On':'Sound Off'; });
    document.getElementById('musicToggle').addEventListener('click',async e=>{
      if(audioCtx.state === 'suspended'){
        try { await audioCtx.resume(); } catch {}
      }
      musicOn=!musicOn;
      e.target.classList.toggle('active', musicOn);
      e.target.textContent = musicOn ? 'Music On':'Music Off';
      if(musicOn) startMusic(); else stopMusic();
      saveMusicPrefs();
    });
    const musicVolumeInput = document.getElementById('musicVolume');
    const musicStyleSelect = document.getElementById('musicStyleSelect');
    if(musicVolumeInput){
      musicVolumeInput.addEventListener('input', ()=>{
        musicVolume = Math.max(0, Math.min(1, Number(musicVolumeInput.value) / 100));
        updateMusicControlUI();
        if(musicOn){ startMusic(); }
        saveMusicPrefs();
      });
    }
    if(musicStyleSelect){
      musicStyleSelect.addEventListener('change', ()=>{
        musicStyle = String(musicStyleSelect.value || 'warm');
        updateMusicControlUI();
        if(musicOn){ startMusic(); }
        saveMusicPrefs();
      });
    }
    document.getElementById('themeSelect').addEventListener('change',(e)=>{
      const theme=e.target.value;
      if(!isThemeOwned(theme)){
        showMessage('Theme locked. Buy it in Arcade Shop.');
        const fallback = localStorage.getItem(accountScopedKey(themeKey)) || 'neon';
        applyThemeSelection(isThemeOwned(fallback) ? fallback : 'neon');
        return;
      }
      applyThemeSelection(theme);
    });
    const redeemBtn = document.getElementById('redeemCodeBtn');
    const redeemInput = document.getElementById('redeemCodeInput');
    if(redeemBtn){
      redeemBtn.addEventListener('click', ()=>{ redeemCode(redeemInput ? redeemInput.value : ''); if(redeemInput) redeemInput.value=''; });
    }
    if(redeemInput){
      redeemInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ redeemCode(redeemInput.value); redeemInput.value=''; } });
    }
    const shopRedeemBtn = document.getElementById('shopRedeemCodeBtn');
    const shopRedeemInput = document.getElementById('shopRedeemCodeInput');
    if(shopRedeemBtn){
      shopRedeemBtn.addEventListener('click', ()=>{ redeemCode(shopRedeemInput ? shopRedeemInput.value : ''); if(shopRedeemInput) shopRedeemInput.value=''; });
    }
    if(shopRedeemInput){
      shopRedeemInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ redeemCode(shopRedeemInput.value); shopRedeemInput.value=''; } });
    }
    const saveNameBtn = document.getElementById('savePlayerNameBtn');
    if(saveNameBtn){
      saveNameBtn.addEventListener('click', ()=>{
        const newName = formatName();
        if(!newName){ showMessage('Enter a valid player name.'); return; }
        if(newName === (playerProfile.name || '')){ showMessage('Name is already set to ' + newName + '.'); return; }
        const createNew = window.confirm('Create a new account with this name?\nPress OK to create a new account.\nPress Cancel to keep this account and just rename it.');
        if(createNew){
          createAccount(newName);
          return;
        }
        playerProfile.name = newName;
        saveProfile();
        syncActiveAccountName(newName);
        renderProfilePanel();
        renderGlobalFanBanners();
        renderFanProfile();
        showMessage('Name updated to ' + newName + '.');
        showAccountMessage('Renamed current account to ' + newName + '.', true);
      });
    }

    const accountSelect = document.getElementById('accountSelect');
    const switchAccountBtn = document.getElementById('switchAccountBtn');
    const newAccountNameInput = document.getElementById('newAccountName');
    const createAccountBtn = document.getElementById('createAccountBtn');
    const exportAccountBtn = document.getElementById('exportAccountBtn');
    const importAccountBtn = document.getElementById('importAccountBtn');
    const importAccountFile = document.getElementById('importAccountFile');
    if(switchAccountBtn && accountSelect){
      switchAccountBtn.addEventListener('click', ()=>switchAccount(accountSelect.value));
      accountSelect.addEventListener('change', ()=>showAccountMessage('Selected account ready. Click Switch Account to load it.'));
    }
    if(createAccountBtn && newAccountNameInput){
      createAccountBtn.addEventListener('click', ()=>{
        createAccount(newAccountNameInput.value);
        newAccountNameInput.value = '';
      });
      newAccountNameInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ createAccountBtn.click(); } });
    }
    if(exportAccountBtn){
      exportAccountBtn.addEventListener('click', exportCurrentAccount);
    }
    if(importAccountBtn && importAccountFile){
      importAccountBtn.addEventListener('click', ()=>importAccountFile.click());
      importAccountFile.addEventListener('change', async ()=>{
        const file = importAccountFile.files?.[0];
        if(!file) return;
        try {
          const text = await file.text();
          const payload = JSON.parse(text);
          importAccountPayload(payload);
        } catch (err) {
          showAccountMessage('Import failed: ' + (err?.message || 'invalid file'));
        } finally {
          importAccountFile.value = '';
        }
      });
    }

    const savedTheme = localStorage.getItem(accountScopedKey(themeKey)) || 'neon';
    const themeSelect = document.getElementById('themeSelect');
    if(themeSelect){ applyThemeSelection(isThemeOwned(savedTheme) ? savedTheme : 'neon'); }

    function initParticles(){ const canvas=document.getElementById('particleCanvas'); const ctx=canvas.getContext('2d'); const particles=[]; function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
      window.addEventListener('resize', resize); resize(); for(let i=0;i<120;i++){ particles.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, r: Math.random()*1.4+0.3, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, alpha:Math.random()*0.8+0.2}); }
      function anim(){ ctx.clearRect(0,0,canvas.width,canvas.height); particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; if(p.x<0) p.x=canvas.width; if(p.x>canvas.width) p.x=0; if(p.y<0) p.y=canvas.height; if(p.y>canvas.height) p.y=0; ctx.fillStyle='rgba(80,130,255,'+p.alpha+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }); requestAnimationFrame(anim); }
      anim(); }

    window.addEventListener('message', (event)=>{
      if (!event.data) return;
      if (event.data.type === 'closeModal') { closeModal(); return; }
      if (event.data.type !== 'scoreUpdate') return;
      if (!currentGame) return;
      const score = Number(event.data.score) || 0;
      setScore(score);
      registerScore(currentGame.id, score);
      if (bossModeActive) endBossLevel(score);
      if (score >= 100){ document.body.style.animation = 'pulse 0.6s ease alternate 2'; setTimeout(()=>document.body.style.animation='', 1400); }
    });

    window.addEventListener('hashchange', routeFromHash);
    window.addEventListener('popstate', routeFromHash);

    function init(){
      hydrateProfile();
      syncActiveAccountName(playerProfile.name || 'Player');
      ensureDailyLoginReward();
      loadMusicPrefs();
      updateMusicControlUI();
      renderAccountList();
      if(playerNameInput) playerNameInput.value = playerProfile.name || '';
      Components.Header.renderHeroButtons();
      Components.ProfilePanel.render();
      renderGlobalFanBanners();
      renderFanProfile();
      renderFeatured();
      renderContinuePlaying();
      renderHomeDashboard();
      renderTrending();
      renderQuestBoard();
      renderActivityFeed();
      renderAnimeLounge();
      openAnimeOnboardingIfNeeded();
      if(playerProfile.animeAmbientOn) startAnimeAmbient(); else stopAnimeAmbient();
      renderShop();
      renderSeasonalShop();
      setRedeemMessage('Tip: try code WELCOME100');
      renderGameGrid();
      showHighScores();
      renderAchievements();
      initParticles();
      routeFromHash();
      if(musicOn) startMusic();
    }
    init();

    const style = document.createElement('style');
    style.innerHTML = `@keyframes pulse { from { filter: drop-shadow(0 0 8px rgba(138,76,255,0.7)); } to { filter: drop-shadow(0 0 18px rgba(19,255,218,0.9)); } }`;
    document.head.appendChild(style);
