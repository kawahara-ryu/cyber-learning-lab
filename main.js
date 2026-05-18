// === Audio System ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, dur, vol=0.1) {
  if(audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.stop(audioCtx.currentTime + dur);
}
function playSuccess() { playTone(1200, 'square', 0.1, 0.1); setTimeout(()=>playTone(1600, 'square', 0.2, 0.1), 100); }
function playBeep() { playTone(600, 'sine', 0.1, 0.1); }
function playAlarm() {
  let i = 0;
  const intv = setInterval(()=>{
    playTone(i%2===0?600:400, 'square', 0.15, 0.2);
    i++; if(i>15) clearInterval(intv);
  }, 150);
}

// === Navigation & Steps ===
const stepTitles = [
  "1-1. 文字列の表示とコメント", "1-2. 文字列・数値の入力", "1-3. 変数への代入と表示",
  "1-4. 変数の値の更新", "1-5. 文字列の連結", "1-6. データ型の変換", "1-7. 文字列を数値に変換して計算"
];
let currentStep = 1;
function updateStep() {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('step-' + currentStep).classList.add('active');
  document.getElementById('step-display').innerText = stepTitles[currentStep - 1];
  playTone(1800, 'sine', 0.1);
  clearWorld();
  setupCodeForStep(currentStep);
}
function nextStep() { if(currentStep < 7) { currentStep++; updateStep(); } }
function prevStep() { if(currentStep > 1) { currentStep--; updateStep(); } }

// === UI Logic (Code & Memory) ===
let memoryMap = {}; // store variables

function setCodeMonitor(codeStr) {
  const lines = codeStr.trim().split('\n');
  const html = lines.map((l, i) => `<span class="code-line" id="line-${i}">${l.replace(/ /g, '&nbsp;')}</span>`).join('\n');
  document.getElementById('code-content').innerHTML = html;
}
function highlightLine(lineNums, isError = false) {
  document.querySelectorAll('.code-line').forEach(el => { el.classList.remove('active'); el.classList.remove('error'); });
  if(!Array.isArray(lineNums)) lineNums = [lineNums];
  lineNums.forEach(num => {
    if(num !== undefined && num !== null) {
      const el = document.getElementById(`line-${num}`);
      if(el) el.classList.add(isError ? 'error' : 'active');
    }
  });
}
function updateMemoryHUD() {
  const keys = Object.keys(memoryMap);
  if(keys.length === 0) {
    document.getElementById('mem-content').innerHTML = "No variables";
  } else {
    document.getElementById('mem-content').innerHTML = keys.map(k => `${k} = ${memoryMap[k]}`).join('<br>');
  }
}

function setupCodeForStep(step) {
  highlightLine(null);
  switch(step) {
    case 1:
      setCodeMonitor(`print('こんにちは')\n# print('さようなら')`);
      break;
    case 2:
      setCodeMonitor(`print(3)\nprint(3 + 5)\nprint(3 - 5)\nprint(3 * 2)\nprint(3 / 2)\nprint(7 % 3)\nprint(2 ** 3)\nprint('3-5')`);
      break;
    case 3:
      setCodeMonitor(`x = 20\ny = 'Tom'\nprint(x)\nprint(y)`);
      break;
    case 4:
      setCodeMonitor(`x = 5\nx += 10\nx -= 5\nx *= 5\nx /= 5\nx %= 4`);
      break;
    case 5:
      setCodeMonitor(`print('Hello' + 'everyone')\nname = 'Tom'\nprint('Hello' + name)\nprint('Hello', name)`);
      break;
    case 6:
      setCodeMonitor(`price = 100\nprint('りんごは' + price + '円')\nprint('りんごは' + str(price) + '円')\nx = '10'\nprint(3 * int(x))\nprint(3 * float(x))\npoint = 100\nprint('テストは', point, '点')`);
      break;
    case 7:
      setCodeMonitor(`x = '5'\ny = '0.5'\nprint('2x=', 2 * int(x))\nprint('x+y=', float(x) + float(y))`);
      break;
  }
  updateMemoryHUD();
}

// === Matter.js Physics ===
const Engine = Matter.Engine, Render = Matter.Render, Runner = Matter.Runner,
      World = Matter.World, Bodies = Matter.Bodies, Body = Matter.Body;

const engine = Engine.create();
const world = engine.world;

let w = window.innerWidth, h = window.innerHeight;
const ground = Bodies.rectangle(w/2, h+50, w*2, 100, { isStatic: true });
const leftWall = Bodies.rectangle(-50, h/2, 100, h*2, { isStatic: true });
const rightWall = Bodies.rectangle(w+50, h/2, 100, h*2, { isStatic: true });
World.add(world, [ground, leftWall, rightWall]);

window.addEventListener('resize', () => {
  w = window.innerWidth; h = window.innerHeight;
  Body.setPosition(ground, {x: w/2, y: h+50});
  Body.setPosition(leftWall, {x: -50, y: h/2});
  Body.setPosition(rightWall, {x: w+50, y: h/2});
});

Runner.run(Runner.create(), engine);

let domBodies = [];
Matter.Events.on(engine, 'afterUpdate', () => {
  domBodies.forEach(obj => {
    obj.elem.style.transform = `translate(${obj.body.position.x - obj.w/2}px, ${obj.body.position.y - obj.h/2}px) rotate(${obj.body.angle}rad)`;
  });
});

function spawnDOM(text, color, isGhost = false, isEmoji = false) {
  const div = document.createElement('div');
  div.className = 'phys-obj ' + (isEmoji ? 'emoji' : 'code-obj');
  if(isGhost) { div.style.opacity = '0.4'; div.style.borderStyle = 'dashed'; }
  if(color && !isEmoji) { div.style.borderColor = color; div.style.color = color; div.style.boxShadow = `0 0 15px ${color}aa`; }
  
  div.innerHTML = text;
  document.getElementById('world').appendChild(div);
  
  div.style.transform = 'translate(-1000px, -1000px)';
  const rect = div.getBoundingClientRect();
  const width = rect.width, height = rect.height;
  
  const body = Bodies.rectangle(w/2 + (Math.random()*100-50), -50, width, height, {
    restitution: isGhost ? 0.2 : 0.8,
    density: isEmoji ? 0.001 : 0.005,
    isSensor: isGhost
  });
  
  World.add(world, body);
  domBodies.push({ id: body.id, body, elem: div, w: width, h: height });
  gsap.from(div, { opacity: 0, scale: 0.5, duration: 0.4, ease: 'back.out(2)' });
  playBeep();
  return { body, elem: div };
}

let varBoxes = {};
function spawnVar(name, val) {
  memoryMap[name] = val;
  updateMemoryHUD();
  
  if(!varBoxes[name]) {
    const slots = Object.keys(varBoxes).length;
    const div = document.createElement('div');
    div.className = 'phys-obj var-box';
    document.getElementById('world').appendChild(div);
    const body = Bodies.rectangle(w - 150, h - 50 - (slots * 70), 200, 50, { isStatic: true });
    World.add(world, body);
    varBoxes[name] = { body, elem: div, w: 200, h: 50 };
    domBodies.push(varBoxes[name]);
  }
  varBoxes[name].elem.innerHTML = `📦 ${name} = ${val}`;
  gsap.fromTo(varBoxes[name].elem, {scale: 1.2, backgroundColor: '#fff'}, {scale: 1, backgroundColor: 'rgba(20,0,40,0.9)', duration: 0.5});
  playSuccess();
}

function clearWorld() {
  domBodies.forEach(b => { World.remove(world, b.body); b.elem.remove(); });
  domBodies = []; varBoxes = {}; memoryMap = {};
  world.gravity.y = 1;
}

// === Step Actions ===

function runStep1(idx) {
  highlightLine(idx);
  if(idx === 0) { spawnDOM("こんにちは", "#0ff"); }
  else { spawnDOM("さようなら", "#666", true); }
}

function runStep2(idx) {
  highlightLine(idx);
  const results = ["3", "8", "-2", "6", "1.5", "1", "8", "3-5"];
  const color = idx === 7 ? "#50fa7b" : "#8be9fd";
  spawnDOM(results[idx], color);
}

function runStep3(idx) {
  highlightLine(idx);
  if(idx===0) { spawnVar('x', '20'); }
  if(idx===1) { spawnVar('y', "'Tom'"); setTimeout(()=>spawnDOM('👨‍🚀', '', false, true), 300); }
  if(idx===2) { spawnDOM("20", "#8be9fd"); }
  if(idx===3) { spawnDOM("Tom", "#50fa7b"); }
}

function runStep4(idx) {
  highlightLine(idx);
  const vals = ["5", "15", "10", "50", "10.0", "2.0"];
  spawnVar('x', vals[idx]);
}

function runStep5(idx) {
  highlightLine(idx);
  if(idx===0) spawnDOM("Hello everyone", "#50fa7b");
  if(idx===1) { spawnVar('name', "'Tom'"); setTimeout(()=>spawnDOM('👨‍🚀', '', false, true), 300); }
  if(idx===2 || idx===3) spawnDOM("Hello Tom", "#50fa7b");
}

function runStep6(idx) {
  if(idx===0) {
    highlightLine(1, true);
    triggerError();
    setTimeout(()=>spawnDOM('🍎', '', false, true), 100);
  } else {
    highlightLine(idx+1);
    if(idx===1) { spawnDOM("りんごは100円です", "#50fa7b"); setTimeout(()=>spawnDOM('🍎', '', false, true), 300); }
    if(idx===2 || idx===3) { memoryMap['x'] = "'10'"; updateMemoryHUD(); spawnDOM(idx===2?"30":"30.0", "#8be9fd"); }
    if(idx===4) { memoryMap['point'] = "100"; updateMemoryHUD(); spawnDOM("テストは 100 点", "#50fa7b"); setTimeout(()=>spawnDOM('💯', '', false, true), 300); }
  }
}

function runStep7(idx) {
  highlightLine(idx);
  if(idx===0) { spawnVar('x', "'5'"); setTimeout(()=>spawnVar('y', "'0.5'"), 200); }
  if(idx===1) spawnDOM("2x= 10", "#8be9fd");
  if(idx===2) spawnDOM("x+y= 5.5", "#8be9fd");
}

function triggerError() {
  playAlarm();
  world.gravity.y = -0.2;
  document.getElementById('error-screen').style.display = 'flex';
  for(let i=0; i<30; i++) {
    spawnDOM('⚠️', '', false, true);
  }
}

function recoverSystem() {
  document.getElementById('error-screen').style.display = 'none';
  clearWorld();
  playTone(1800, 'sine', 0.1);
  setupCodeForStep(currentStep);
}

updateStep();
