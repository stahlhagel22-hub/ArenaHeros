"use strict";

const SIZE = 20;
let board = [];
const state = {
  screen: "battle",
  round: 1,
  units: [],
  selected: null,
  turnOrder: [],
  turnIndex: 0,
  mode: null,
  highlight: [],
  log: [],
  victory: false,
  defeat: false,
  core: null,
  tool: "wall"
};

const templates = {
  powerkim: {id:"powerkim",name:"Powerkim",short:"P",team:"hero",className:"Nahkampf / Tank",x:2,y:17,hp:180,maxHp:180,attack:20,defense:18,movement:5,range:1,damage:35,ability:"Kraftschlag",knockback:3,color:"#55baff"},
  visor: {id:"visor",name:"Visor",short:"V",team:"hero",className:"Fernkampf / Taktiker",x:3,y:17,hp:80,maxHp:80,attack:22,defense:10,movement:6,range:10,damage:24,ability:"Präzisionsschuss",knockback:1,color:"#8be5ff"},
  watson: {id:"watson",name:"Watson",short:"W",team:"hero",className:"Heiler / Fliegend",x:4,y:17,hp:100,maxHp:100,attack:8,defense:10,movement:8,range:8,damage:0,ability:"Heilstrahl",heal:40,flying:true,color:"#92f6a7"},
  nyra: {id:"nyra",name:"Nyra",short:"N",team:"hero",className:"Spionin / Fallen",x:1,y:18,hp:70,maxHp:70,attack:15,defense:12,movement:9,range:1,damage:18,ability:"Falle legen",knockback:2,color:"#d8b1ff"},
  drone1: {id:"drone1",name:"Sicherheitsdrohne 1",short:"D",team:"enemy",className:"Fernkampf / Fliegend",x:16,y:3,hp:40,maxHp:40,attack:14,defense:3,movement:8,range:7,damage:14,ability:"Laserschuss",knockback:1,flying:true,color:"#ff9292"},
  drone2: {id:"drone2",name:"Sicherheitsdrohne 2",short:"D",team:"enemy",className:"Fernkampf / Fliegend",x:17,y:5,hp:40,maxHp:40,attack:14,defense:3,movement:8,range:7,damage:14,ability:"Laserschuss",knockback:1,flying:true,color:"#ff9292"},
  bulwark: {id:"bulwark",name:"Bulwark",short:"B",team:"enemy",className:"Schwerer Tank",x:15,y:15,hp:220,maxHp:220,attack:26,defense:20,movement:3,range:1,damage:16,ability:"Rückstoßangriff",knockback:3,color:"#ffb86c"}
};

function render() {
  const title = document.getElementById("screen-title");
  const status = document.getElementById("screen-status");
  if (title) title.textContent = state.screen === "battle" ? "Arena Heroes" : "Arena Editor";
  if (status) status.textContent = state.screen === "battle" ? (state.victory ? "Sieg" : state.defeat ? "Niederlage" : `Runde ${state.round} · Zug ${state.turnOrder.length ? currentUnit().name : "-"}`) : "Karte bearbeiten";
  state.screen === "battle" ? renderBattle() : renderEditor();
}

function makeUnit(t) { return {...t, id:`${t.id}-${Math.random().toString(36).slice(2,8)}`, alive:true, ap:2, acted:false, moveLeft:t.movement, statuses:[]}; }
function cell(x,y) { return x>=0 && y>=0 && x<SIZE && y<SIZE ? board[y][x] : null; }
function at(x,y) { return state.units.find(u=>u.alive && u.x===x && u.y===y); }
function currentUnit() { return state.turnOrder[state.turnIndex] || null; }
function distance(a,b) { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }
function log(text) { state.log.unshift(text); state.log = state.log.slice(0,18); }
function setupMap() {
  board = Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>({type:"floor",walk:true,los:false})));
  const set=(x,y,type)=>{const c=cell(x,y);c.type=type;c.walk=!['wall','container','vehicle'].includes(type);c.los=['wall','container'].includes(type);};
  for(let i=0;i<SIZE;i++){set(i,0,"wall");set(i,19,"wall");set(0,i,"wall");set(19,i,"wall");}
  [[4,4],[5,4],[6,4],[4,5],[6,5],[4,6],[5,6],[6,6],[10,10],[11,10],[12,10],[11,11],[12,11],[13,11],[10,12],[11,12],[12,12]].forEach(p=>set(p[0],p[1],"wall"));
  [[3,2],[12,2],[3,3],[12,3],[8,8],[9,8],[10,8],[16,12],[16,13]].forEach(p=>set(p[0],p[1],"container"));
  for(let x=8;x<=12;x++){set(x,15,"water");set(x,16,"water");}
  set(13,13,"core");
  state.core={name:"Nexus-Energiekern",x:13,y:13,hp:150,maxHp:150,defense:10,alive:true};
}
function startRound() {
  state.turnOrder = state.units.filter(u=>u.alive).sort((a,b)=>b.movement-a.movement || Math.random()-0.5);
  state.turnIndex = 0;
  state.turnOrder.forEach(u=>{u.ap=2;u.acted=false;u.moveLeft=u.movement;});
  skipUnavailable();
  log(`Runde ${state.round}: Initiative ${state.turnOrder.map(u=>`${u.name} (${u.movement})`).join(" → ")}`);
}
function skipUnavailable() {
  let guard=0;
  while(guard++<state.turnOrder.length) {
    const u=currentUnit();
    if(u && u.alive && !u.statuses.includes("paralyzed")) return;
    if(u) log(`${u.name} ist paralysiert und wird übersprungen.`);
    advanceTurn(true);
  }
}
function advanceTurn(skipped=false) {
  if(!state.turnOrder.length)return;
  if(!skipped) { const u=currentUnit(); if(u) u.acted=true; }
  state.turnIndex++;
  if(state.turnIndex>=state.turnOrder.length) { state.round++; startRound(); }
  else skipUnavailable();
}
function isCurrent(u) { return u && currentUnit() && u.id===currentUnit().id; }
function canEnter(u,x,y) { const c=cell(x,y);return !!c&&c.walk&&(c.type!=="water"||u.flying)&&!at(x,y); }
function reachable(u) { const out=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const d=Math.abs(u.x-x)+Math.abs(u.y-y);if(d>0&&d<=u.moveLeft&&canEnter(u,x,y))out.push({x,y});}return out; }
function lineOfSight(a,b) { const n=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));for(let i=1;i<n;i++){const c=cell(a.x+Math.round((b.x-a.x)*i/n),a.y+Math.round((b.y-a.y)*i/n));if(c?.los)return false;}return true; }
function targets(u) { return state.units.filter(t=>t.alive&&t.team!==u.team&&distance(u,t)<=u.range&&lineOfSight(u,t)); }
function spend(u) { u.ap=Math.max(0,u.ap-1);u.acted=true; }
function moveUnit(x,y) { const u=currentUnit();if(!isCurrent(u)||u.ap<1||!state.highlight.some(p=>p.x===x&&p.y===y))return;const d=Math.abs(u.x-x)+Math.abs(u.y-y);u.x=x;u.y=y;u.moveLeft-=d;spend(u);state.mode="move";state.highlight=reachable(u);render(); }
function damage(attacker,target,amount) { const value=Math.max(1,amount-target.defense);target.hp=Math.max(0,target.hp-value);log(`${attacker.name} verursacht ${value} Schaden an ${target.name}.`);if(!target.hp){target.alive=false;target.ap=0;log(`${target.name} ist kampfunfähig.`);} }
function knockback(target,source,force) { const dx=Math.sign(target.x-source.x),dy=Math.sign(target.y-source.y);for(let i=0;i<force;i++){const x=target.x+dx,y=target.y+dy,c=cell(x,y);if(!c||!c.walk){damage({name:"Kollision"},target,8);break;}if(at(x,y)){damage({name:"Kollision"},target,6);break;}target.x=x;target.y=y;} }
function attack(target) { const u=currentUnit();if(!isCurrent(u)||u.ap<1||!target||target.team===u.team||distance(u,target)>u.range||!lineOfSight(u,target))return;damage(u,target,u.attack+u.damage);if(u.knockback)knockback(target,u,u.knockback);spend(u);state.mode=null;state.highlight=[];checkMission();render(); }
function useAbility(target) { const u=currentUnit();if(!isCurrent(u)||u.ap<1)return;if(u.heal){if(!target||target.team!==u.team)return;target.hp=Math.min(target.maxHp,target.hp+u.heal);log(`${u.name} heilt ${target.name}.`);}else{if(!target||target.team===u.team||distance(u,target)>u.range)return;damage(u,target,u.damage);if(u.knockback&&target.alive)knockback(target,u,u.knockback);}spend(u);state.mode=null;state.highlight=[];render(); }
function endTurn() { const u=currentUnit();if(!u||state.victory||state.defeat)return;log(`${u.name} beendet seinen Zug.`);state.mode=null;state.highlight=[];advanceTurn();checkMission();render(); }
function checkMission(){if(!state.units.some(u=>u.alive&&u.team==="hero"))state.defeat=true;if(state.core&&!state.core.alive)state.victory=true;}
function tileClick(x,y){const u=currentUnit();if(!u)return;const target=at(x,y);if(state.mode==="move"){moveUnit(x,y);return;}if(state.mode==="attack"){if(target)attack(target);else if(state.core?.alive&&state.core.x===x&&state.core.y===y&&distance(u,state.core)<=u.range){state.core.hp=Math.max(0,state.core.hp-Math.max(1,u.attack-state.core.defense));if(!state.core.hp)state.core.alive=false;spend(u);render();}return;}if(state.mode==="ability"){if(target)useAbility(target);return;}if(target?.team==="hero")state.selected=target.id;render();}
function renderBoard(){const root=document.getElementById("board");if(!root)return;root.innerHTML="";for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const e=document.createElement("div"),c=cell(x,y);e.className=`tile ${c.type}`;if(state.highlight.some(p=>p.x===x&&p.y===y))e.classList.add("highlight");if(currentUnit()?.x===x&&currentUnit()?.y===y)e.classList.add("selected");const u=at(x,y);if(u){const q=document.createElement("div");q.className=`unit ${u.team==="hero"?"hero":"enemy"} ${u.id===currentUnit()?.id?"selected":""}`;q.style.background=`linear-gradient(${u.color},#1d4f80)`;q.innerHTML=`<span class="letter">${u.short}</span><div class="hpbar"><span style="width:${u.hp/u.maxHp*100}%"></span></div><div class="hptext">${u.hp}/${u.maxHp}</div>`;e.appendChild(q);}if(state.core?.alive&&state.core.x===x&&state.core.y===y){const l=document.createElement("div");l.className="label";l.textContent="E";e.appendChild(l);}e.onclick=()=>state.screen==="battle"?tileClick(x,y):editorClick(x,y);root.appendChild(e);}}
function renderBattle(){document.getElementById("workspace").innerHTML=`<div id="board-container"><div id="board"></div></div><aside id="sidebar"><div class="panel"><h3>Aktiver Zug</h3><div id="unit-info"></div><div class="grid"><button data-a="move">Bewegen [M]</button><button data-a="attack">Angriff [A]</button><button class="primary" data-a="ability">Spezial [S]</button><button class="warning wide" data-a="end">Zug beenden [Enter]</button></div></div><div class="panel"><h3>Initiative</h3><div id="initiative"></div></div><div class="panel"><h3>Missionsziel</h3><div id="objective"></div></div><div class="panel"><h3>Protokoll</h3><div id="log"></div></div></aside>`;renderBoard();const u=currentUnit();document.getElementById("unit-info").innerHTML=u?`<div class="card active"><span><b>${u.name}</b><small class="type">${u.className}</small></span><b class="hp">${u.hp}/${u.maxHp}</b></div><div class="stats"><span>AP</span><b>${u.ap}</b></div><div class="stats"><span>Initiative</span><b>${u.movement}</b></div>`:"Kein aktiver Zug";document.getElementById("initiative").innerHTML=state.turnOrder.map((x,i)=>`<div class="card ${i===state.turnIndex?"active":""} ${x.alive?"":"defeated"}"><span>${x.name}<small class="type">${x.statuses.includes("paralyzed")?"Paralysiert · übersprungen":"Initiative "+x.movement}</small></span><b class="hp">${x.alive?`${x.hp}/${x.maxHp}`:"DOWN"}</b></div>`).join("");document.getElementById("objective").innerHTML=`<div class="card"><span><b>${state.core.name}</b><small class="type">Zerstörungsziel</small></span><b class="hp">${state.core.alive?`${state.core.hp}/${state.core.maxHp}`:"ZERSTÖRT"}</b></div>`;document.getElementById("log").innerHTML=state.log.map(x=>`<div>${x}</div>`).join("");document.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>b.dataset.a==="move"?setMode("move"):b.dataset.a==="attack"?setMode("attack"):b.dataset.a==="ability"?setMode("ability"):endTurn());}
function setMode(m){const u=currentUnit();if(!u||u.ap<1)return;state.mode=m;state.highlight=m==="move"?reachable(u):targets(u).map(t=>({x:t.x,y:t.y}));render();}
function renderEditor(){document.getElementById("workspace").innerHTML=`<div id="board-container"><div id="board"></div></div><aside id="sidebar"><div class="panel"><h3>Editor</h3><div class="grid">${["floor","wall","container","vehicle","water","core","delete"].map(x=>`<button data-tool="${x}">${x}</button>`).join("")}</div><button id="load" class="success">Kampf laden</button></div></aside>`;renderBoard();document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{state.tool=b.dataset.tool;render();});document.getElementById("load").onclick=()=>{state.screen="battle";render();};}
function editorClick(x,y){if(state.tool==="delete")board[y][x]={type:"floor",walk:true,los:false};else{const c=cell(x,y);c.type=state.tool;c.walk=!['wall','container','vehicle'].includes(state.tool);c.los=['wall','container'].includes(state.tool);}render();}

document.getElementById("battle-button").onclick=()=>{state.screen="battle";render();};
document.getElementById("editor-button").onclick=()=>{state.screen="editor";render();};
document.getElementById("abort-button").onclick=()=>{state.screen="editor";render();};
document.addEventListener("keydown",e=>{if(state.screen!=="battle")return;const u=currentUnit();if(e.key.toLowerCase()==="m")setMode("move");else if(e.key.toLowerCase()==="a")setMode("attack");else if(e.key.toLowerCase()==="s")setMode("ability");else if(e.key==="Enter")endTurn();else if(e.key==="Escape"){state.mode=null;state.highlight=[];render();}else if(u&&e.key.startsWith("Arrow")){const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(d&&state.mode==="move")moveUnit(u.x+d[0],u.y+d[1]);}});

setupMap();state.units=Object.values(templates).map(makeUnit);state.selected=state.units[0].id;startRound();render();
