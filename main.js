// === Audio System (Web Audio API) ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol=0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}

function playBeep() { 
  playTone(1800, 'square', 0.1, 0.05); 
  setTimeout(()=>playTone(2400, 'sine', 0.1, 0.05), 50);
}

function playSpawn() { 
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.stop(audioCtx.currentTime + 0.5);
}

function playErrorSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc1.type = 'sawtooth'; osc2.type = 'square';
  osc1.frequency.value = 100; osc2.frequency.value = 110;
  osc1.connect(gain); osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc1.start(); osc2.start();
  gain.gain.value = 0.3;
  
  let i = 0;
  let interval = setInterval(() => {
    osc1.frequency.value = i % 2 === 0 ? 150 : 100;
    i++;
    if(i > 15) { clearInterval(interval); osc1.stop(); osc2.stop(); }
  }, 100);
}

// === Navigation Logic ===
const stepTitles = [
  "1-1. 文字列の表示とコメント",
  "1-2. 文字列・数値の入力",
  "1-3. 変数への代入と表示",
  "1-4. 変数の値の更新",
  "1-5. 文字列の連結",
  "1-6. データ型の変換",
  "1-7. 型変換して計算するプログラム"
];
let currentStep = 1;

function updateStep() {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('step-' + currentStep).classList.add('active');
  document.getElementById('step-display').innerText = stepTitles[currentStep - 1];
  playBeep();
}
function nextStep() { if(currentStep < 7) { currentStep++; updateStep(); } }
function prevStep() { if(currentStep > 1) { currentStep--; updateStep(); } }

// === Matter.js Physics System ===
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint;

const engine = Engine.create();
const world = engine.world;
world.gravity.y = 0.2; // Low gravity

const w = window.innerWidth, h = window.innerHeight;
const ground = Bodies.rectangle(w/2, h+50, w*2, 100, { isStatic: true });
const leftWall = Bodies.rectangle(-50, h/2, 100, h*2, { isStatic: true });
const rightWall = Bodies.rectangle(w+50, h/2, 100, h*2, { isStatic: true });
const ceiling = Bodies.rectangle(w/2, -100, w*2, 100, { isStatic: true });
World.add(world, [ground, leftWall, rightWall, ceiling]);

const mouse = Mouse.create(document.body);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: { stiffness: 0.2, render: { visible: false } }
});
World.add(world, mouseConstraint);

const runner = Runner.create();
Runner.run(runner, engine);

// Sync DOM elements with Matter.js bodies
const domBodies = [];
Matter.Events.on(engine, 'afterUpdate', function() {
  domBodies.forEach(obj => {
    obj.elem.style.transform = `translate(${obj.body.position.x - obj.w/2}px, ${obj.body.position.y - obj.h/2}px) rotate(${obj.body.angle}rad)`;
  });
});

let varsMap = {};
let varSpawnCount = 0;

// Spawn Element
function spawnDOM(text, color, isGhost = false, isEmoji = false) {
  playSpawn();
  const div = document.createElement('div');
  div.className = 'phys-obj';
  if(isEmoji) div.classList.add('emoji');
  if(isGhost) div.classList.add('ghost');
  if(color && !isEmoji && !isGhost) {
    div.style.borderColor = color;
    div.style.boxShadow = `0 0 15px ${color}88`;
  }
  div.innerText = text;
  document.getElementById('world').appendChild(div);
  
  // Measure size invisibly
  div.style.transform = 'translate(-1000px, -1000px)';
  const rect = div.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  
  // Start position (drop from top right center)
  const x = window.innerWidth / 2 + 100 + (Math.random() * 200);
  const y = -50;
  
  const body = Bodies.rectangle(x, y, width, height, {
    restitution: 0.7,
    frictionAir: 0.04,
    density: isEmoji ? 0.001 : 0.005
  });
  
  World.add(world, body);
  domBodies.push({ body: body, elem: div, w: width, h: height });
  
  // Initial gentle push
  Body.applyForce(body, body.position, { x: (Math.random() - 0.5) * 0.05, y: 0.05 });
  
  // Animation for DOM
  gsap.from(div, { opacity: 0, scale: 0.5, duration: 0.5, ease: 'back.out(1.5)' });
  
  return { body, elem: div, w: width, h: height };
}

// Spawn Static Variable Box
function spawnVar(varName, value) {
  playBeep(); // Use different sound to indicate memory storage
  
  if (varsMap[varName]) {
    const v = varsMap[varName];
    v.elem.innerText = `📦 ${varName} = ${value}`;
    
    // Re-measure after text change
    const rect = v.elem.getBoundingClientRect();
    const scaleX = rect.width / v.w;
    const scaleY = rect.height / v.h;
    Body.scale(v.body, scaleX, scaleY);
    v.w = rect.width;
    v.h = rect.height;
    
    // GSAP pulse animation
    gsap.fromTo(v.elem, 
      { scale: 1.5, filter: 'brightness(2)' }, 
      { scale: 1, filter: 'brightness(1)', duration: 0.5, ease: 'elastic.out(1, 0.3)' }
    );
  } else {
    // Spawn new static box
    const div = document.createElement('div');
    div.className = 'phys-obj var-box';
    div.innerText = `📦 ${varName} = ${value}`;
    document.getElementById('world').appendChild(div);
    
    div.style.transform = 'translate(-1000px, -1000px)';
    const rect = div.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Position on the right side of the screen
    const x = window.innerWidth - 150;
    const y = 100 + varSpawnCount * 60;
    varSpawnCount++;
    
    const body = Bodies.rectangle(x, y, width, height, {
      isStatic: true
    });
    
    World.add(world, body);
    domBodies.push({ body: body, elem: div, w: width, h: height });
    varsMap[varName] = { body: body, elem: div, w: width, h: height };
    
    // Animate appearance
    gsap.from(div, { opacity: 0, x: 50, duration: 0.5, ease: 'back.out(1.5)' });
  }
}

// Stage 1-6 Error Gimmick
function triggerError() {
  playErrorSound();
  document.getElementById('error-screen').style.display = 'flex';
  world.gravity.y = 0; // Anti-gravity chaos
  
  // Explosion force to all bodies
  domBodies.forEach(obj => {
    Body.applyForce(obj.body, obj.body.position, {
      x: (Math.random() - 0.5) * 0.8,
      y: (Math.random() - 0.5) * 0.8
    });
    Body.setAngularVelocity(obj.body, (Math.random() - 0.5) * 0.5);
    
    // GSAP glitch visual
    gsap.to(obj.elem, {
      x: () => Math.random() * 20 - 10,
      y: () => Math.random() * 20 - 10,
      duration: 0.1,
      yoyo: true,
      repeat: 10
    });
  });
}

function recoverSystem() {
  playBeep();
  document.getElementById('error-screen').style.display = 'none';
  world.gravity.y = 0.2; // Restore gravity
  
  // Settle bodies
  domBodies.forEach(obj => {
    Body.setVelocity(obj.body, {x:0, y:0});
    Body.setAngularVelocity(obj.body, 0);
  });
}

// Window resize handling
window.addEventListener('resize', () => {
  Body.setPosition(ground, {x: window.innerWidth/2, y: window.innerHeight+50});
  Body.setPosition(rightWall, {x: window.innerWidth+50, y: window.innerHeight/2});
});

// Init
updateStep();
