/***********************
 * Données & stockage
 ***********************/
const LS_KEY = "genea_svg_v1";
let state = load() || { persons:{}, rootId:null };

function uid(){ return "p"+Math.random().toString(36).slice(2,10); }

function makePerson({first,last,birth="",alive=true,death=null}){
  const id = uid();
  state.persons[id] = {
    id, first:first||"", last:last||"",
    birth: birth || "", alive: alive!==false, death: death||null,
    parents: [],          // tableau d'ID (0,1,2…)
    spouses: [],          // tableau d'ID (plusieurs conjoints OK)
    children: []          // tableau d'ID
  };
  return state.persons[id];
}

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)); }catch{ return null; }}

/***********************
 * Sélecteurs rapides
 ***********************/
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/***********************
 * UI éléments
 ***********************/
const welcome = $("#welcome");
$("#w_start").onclick = ()=>{
  const first = $("#w_first").value.trim();
  if(!first) return alert("Entre ton prénom.");
  const p = makePerson({first});
  state.rootId = p.id;
  save();
  welcome.classList.remove("show");
  renderAll();
};

$("#btnReset").onclick = ()=>{
  if(confirm("Tout réinitialiser ?")){ localStorage.removeItem(LS_KEY); location.reload(); }
};

$("#btnExport").onclick = ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "arbre.json"; a.click();
  URL.revokeObjectURL(url);
};

$("#btnImport").onclick = ()=> $("#fileImport").click();
$("#fileImport").onchange = e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev=>{
    try{
      const data = JSON.parse(ev.target.result);
      if(!data.persons) throw 0;
      state = data; save(); renderAll();
      welcome.classList[(state.rootId?"remove":"add")]("show");
    }catch{ alert("Fichier invalide."); }
  };
  r.readAsText(f);
};

$("#btnPng").onclick = async ()=>{
  // capture le stage entier (SVG + cartes)
  const stage = $("#stage");
  const canvas = await html2canvas(stage, {backgroundColor:"#ffffff", scale:2});
  const a = document.createElement("a");
  a.download = "arbre.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
};

/***********************
 * Pan & Zoom
 ***********************/
let zoom = 1, pan = {x:0,y:0};
const viewport = $("#viewport");
const stage = $("#stage");
function applyTransform(){ stage.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`; }
$("#btnZoomIn").onclick = ()=>{ zoom = Math.min(2.5, zoom+0.1); applyTransform(); };
$("#btnZoomOut").onclick = ()=>{ zoom = Math.max(0.3, zoom-0.1); applyTransform(); };
$("#btnZoomReset").onclick = ()=>{ zoom=1; pan={x:0,y:0}; applyTransform(); };

let panning=false, last={x:0,y:0};
viewport.addEventListener("mousedown",e=>{ panning=true; last={x:e.clientX,y:e.clientY}; });
viewport.addEventListener("mousemove",e=>{
  if(!panning) return;
  pan.x += (e.clientX-last.x); pan.y += (e.clientY-last.y);
  last={x:e.clientX,y:e.clientY}; applyTransform();
});
window.addEventListener("mouseup",()=> panning=false);
// Touch
viewport.addEventListener("touchstart",e=>{ if(e.touches.length===1){ panning=true; last={x:e.touches[0].clientX,y:e.touches[0].clientY}; }},{passive:true});
viewport.addEventListener("touchmove",e=>{
  if(panning && e.touches.length===1){
    pan.x += (e.touches[0].clientX-last.x);
    pan.y += (e.touches[0].clientY-last.y);
    last={x:e.touches[0].clientX,y:e.touches[0].clientY};
    applyTransform();
  }
},{passive:true});
viewport.addEventListener("touchend",()=> panning=false);

/***********************
 * Rendu (positions + SVG)
 ***********************/
const NODE_W=170, NODE_H=86, H_GAP=40, V_GAP=120;

function renderAll(){
  const nodesLayer = $("#nodes");
  const linksLayer = $("#links");
  nodesLayer.innerHTML = "";
  linksLayer.innerHTML = "";

  if(!Object.keys(state.persons).length) return;

  // 1) Trouver les sommets ancêtres (sans parents)
  const roots = [];
  for(const id in state.persons){
    if((state.persons[id].parents||[]).length===0) roots.push(id);
  }
  if(!roots.length && state.rootId) roots.push(state.rootId);
  if(!roots.length){ // fallback
    roots.push(Object.keys(state.persons)[0]);
  }

  // 2) Calculer les positions par DFS (hiérarchie)
  const pos = {}; // id -> {x,y}
  let cursorX = 0;
  const visited = new Set();

  function primaryParentsOf(child){
    const ps = state.persons[child].parents||[];
    if(ps.length<=1) return ps; // 0 ou 1 parent
    // définir un parent "primaire" pour éviter double descente : choisir le plus petit id
    const sorted = [...ps].sort();
    return [sorted[0]]; // seul parent primaire descend
  }

  function childrenOf(id){
    // enfants où id ∈ parents
    const kids = [];
    for(const k in state.persons){
      const ch = state.persons[k];
      if((ch.parents||[]).includes(id)) kids.push(k);
    }
    // trier par nom pour stabilité
    kids.sort((a,b)=>{
      const A = (state.persons[a].last+state.persons[a].first).toLowerCase();
      const B = (state.persons[b].last+state.persons[b].first).toLowerCase();
      return A.localeCompare(B);
    });
    // filtrer pour que seul le parent "primaire" descende
    return kids.filter(k=>{
      const prim = primaryParentsOf(k);
      return prim.includes(id);
    });
  }

  function layout(id, depth){
    if(visited.has(id)) return;
    visited.add(id);

    const kids = childrenOf(id);
    // Positionner d'abord les enfants pour obtenir un centre
    const childXs = [];
    for(const k of kids){
      layout(k, depth+1);
      childXs.push(pos[k].x);
    }

    let x;
    if(childXs.length){
      const sum = childXs.reduce((a,b)=>a+b,0);
      x = sum / childXs.length;
    }else{
      x = cursorX * (NODE_W + H_GAP);
      cursorX += 1;
    }
    pos[id] = {x, y: depth*(NODE_H+V_GAP)};
  }

  // Disposer chaque racine
  let startDepth = 0;
  for(const r of roots){
    layout(r, startDepth);
    // petit écart horizontal entre forêts
    cursorX += 0.5;
  }

  // 3) Dessiner les liens parents→enfants (droites)
  function midTop(id){ const p = pos[id]; return {x:p.x+NODE_W/2, y:p.y}; }
  function midBottom(id){ const p = pos[id]; return {x:p.x+NODE_W/2, y:p.y+NODE_H}; }

  for(const cid in state.persons){
    const child = state.persons[cid];
    const parents = child.parents||[];
    if(parents.length===0) continue;

    if(parents.length===1){
      const p1 = parents[0];
      if(!pos[p1] || !pos[cid]) continue;
      const a = midBottom(p1), b = midTop(cid);
      const path = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
      drawPath(linksLayer, path);
    }else{
      // 2 parents → jointure horizontale
      const [pA,pB] = [...parents].sort();
      if(!pos[pA] || !pos[pB] || !pos[cid]) continue;
      const A = midBottom(pA), B = midBottom(pB), C = midTop(cid);
      const y = Math.min(A.y,B.y) + 20; // barre commune
      drawPath(linksLayer, `M ${A.x} ${A.y} L ${A.x} ${y} M ${B.x} ${B.y} L ${B.x} ${y} M ${A.x} ${y} L ${B.x} ${y} M ${ (A.x+B.x)/2 } ${y} L ${C.x} ${C.y}`);
    }
  }

  // 4) Lignes entre conjoints (simple segment)
  for(const id in state.persons){
    const p = state.persons[id];
    for(const s of (p.spouses||[])){
      if(id < s && pos[id] && pos[s]){ // tracer une seule fois
        const a = {x: pos[id].x+NODE_W, y: pos[id].y+NODE_H/2};
        const b = {x: pos[s].x,       y: pos[s].y+NODE_H/2};
        drawPath(linksLayer, `M ${a.x} ${a.y} L ${b.x} ${b.y}`, "spouse-line");
      }
    }
  }

  // 5) Dessiner les cartes personnes
  for(const id in state.persons){
    const p = state.persons[id];
    const d = pos[id];
    if(!d) continue;
    nodesLayer.appendChild(personCard(p, d.x, d.y));
  }
}

function drawPath(svg, d, cls="link"){
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", d);
  path.setAttribute("class", cls);
  svg.appendChild(path);
}

function personCard(p, x, y){
  const card = document.createElement("div");
  card.className = "person";
  card.style.left = `${x}px`;
  card.style.top  = `${y}px`;

  const title = document.createElement("div");
  title.className = "name";
  title.textContent = `${p.first||""} ${p.last||""}`.trim() || "Sans nom";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = p.birth ? `Né(e) ${p.birth}${p.alive? "": (p.death?` • ✝ ${p.death}`:"")}` : (p.alive? "—" : (p.death?`✝ ${p.death}`:"—"));

  const acts = document.createElement("div");
  acts.className = "acts";
  acts.appendChild(abtn("👁 Voir", ()=> openView(p.id)));
  acts.appendChild(abtn("➕ Ajouter", ()=> { currentRefId=p.id; openAddFromView("child"); openView(p.id); }));
  acts.appendChild(abtn("✏️", ()=> openFormEdit(p.id)));
  acts.appendChild(abtn("🗑", ()=> removePersonPrompt(p.id), "danger"));

  card.appendChild(title); card.appendChild(meta); card.appendChild(acts);
  card.onclick = ()=> openView(p.id);
  return card;
}

function abtn(txt, fn, extra){
  const b = document.createElement("button");
  b.className = "abtn"+(extra?(" "+extra):"");
  b.textContent = txt;
  b.onclick = (e)=>{ e.stopPropagation(); fn(); };
  return b;
}

/***********************
 * Pop-up FICHE
 ***********************/
let currentViewId = null;
function openView(id){
  currentViewId = id;
  const p = state.persons[id];
  $("#v_title").textContent = `${p.first||""} ${p.last||""}`.trim() || "Sans nom";
  $("#v_birth").textContent = p.birth||"—";
  $("#v_alive").textContent = p.alive? "Oui" : "Non";
  $("#v_death_wrap").style.display = p.alive? "none" : "block";
  $("#v_death").textContent = p.death||"—";

  // cibler membres existants (pour lier)
  const sel = $("#linkTarget");
  sel.innerHTML = "";
  for(const id2 in state.persons){
    if(id2===id) continue;
    const o = document.createElement("option");
    const pp = state.persons[id2];
    o.value = id2; o.textContent = `${pp.first} ${pp.last}`.trim() || "Sans nom";
    sel.appendChild(o);
  }

  $("#viewModal").classList.add("show");
}
function closeView(){ $("#viewModal").classList.remove("show"); currentViewId=null; }
$("#viewModal").addEventListener("click",e=>{
  if(e.target.matches("[data-close]") || e.target===e.currentTarget) closeView();
});
$("#btnEdit").onclick = ()=> currentViewId && openFormEdit(currentViewId);
$("#btnDelete").onclick = ()=> currentViewId && removePersonPrompt(currentViewId);
$("#btnLink").onclick = ()=>{
  const type = $("#linkType").value;
  const tgt = $("#linkTarget").value;
  if(!currentViewId || !tgt) return;
  if(type==="spouse") linkSpouse(currentViewId, tgt);
  if(type==="parent") setAsParent(currentViewId, tgt);     // current is parent of target
  if(type==="child")  setAsParent(tgt, currentViewId);     // target is parent of current
  if(type==="sibling") linkSiblings(currentViewId, tgt);
  save(); renderAll(); openView(currentViewId);
};
// Boutons d'ajout rapide depuis la vue
function openAddFromView(kind){
  if(!currentViewId) return;
  openFormAdd(currentViewId, kind);
}
$("#viewModal").addEventListener("click",(e)=>{
  const btn = e.target.closest("[data-add]");
  if(!btn) return;
  const kind = btn.getAttribute("data-add");
  openAddFromView(kind);
});

/***********************
 * Formulaire (ajout / édition)
 ***********************/
let formMode="add", formRel=null, formRefId=null, editId=null;

function openFormAdd(refId, relation){
  formMode="add"; formRel=relation; formRefId=refId; editId=null;
  $("#f_title").textContent = "Ajouter";
  $("#f_last").value=""; $("#f_first").value="";
  $("#f_birth").value=""; $("#f_alive").value="true";
  $("#f_death").value=""; $("#deathRow").style.display="none";

  // si on ajoute un enfant : proposer le deuxième parent (parmi les conjoints)
  if(relation==="child"){
    const sel = $("#secondParent"); sel.innerHTML="";
    const ref = state.persons[refId];
    (ref.spouses||[]).forEach(sid=>{
      const sp = state.persons[sid];
      const o = document.createElement("option");
      o.value = sid; o.textContent = `${sp.first} ${sp.last}`.trim()||"Sans nom";
      sel.appendChild(o);
    });
    $("#childSecondParentRow").style.display = (ref.spouses||[]).length ? "flex" : "none";
  }else{
    $("#childSecondParentRow").style.display = "none";
  }

  $("#formModal").classList.add("show");
}

function openFormEdit(id){
  formMode="edit"; editId=id; formRel=null; formRefId=null;
  const p = state.persons[id];
  $("#f_title").textContent = "Modifier";
  $("#f_last").value = p.last||"";
  $("#f_first").value = p.first||"";
  $("#f_birth").value = p.birth||"";
  $("#f_alive").value = p.alive ? "true" : "false";
  $("#deathRow").style.display = p.alive ? "none" : "block";
  $("#f_death").value = p.death||"";
  $("#childSecondParentRow").style.display = "none";
  $("#formModal").classList.add("show");
}

$("#f_alive").addEventListener("change",e=>{
  $("#deathRow").style.display = (e.target.value==="false") ? "block" : "none";
});

$("#btnSaveForm").onclick = ()=>{
  const last  = $("#f_last").value.trim();
  const first = $("#f_first").value.trim();
  const birth = $("#f_birth").value || "";
  const alive = $("#f_alive").value==="true";
  const death = alive ? null : ($("#f_death").value||null);
  if(!first) return alert("Prénom requis.");

  if(formMode==="add"){
    const ref = state.persons[formRefId];
    const np = makePerson({first,last,birth,alive,death});

    if(formRel==="spouse"){
      // lier comme conjoints (multi-conjoints OK)
      if(!ref.spouses.includes(np.id)) ref.spouses.push(np.id);
      if(!np.spouses.includes(ref.id)) np.spouses.push(ref.id);
    }
    if(formRel==="parent"){
      // np devient parent de ref
      if(!ref.parents.includes(np.id)) ref.parents.push(np.id);
      if(!np.children.includes(ref.id)) np.children.push(ref.id);
    }
    if(formRel==="child"){
      // np devient enfant de ref (+ éventuel 2e parent)
      if(!np.parents.includes(ref.id)) np.parents.push(ref.id);
      if(!ref.children.includes(np.id)) ref.children.push(np.id);
      const second = $("#secondParent").value;
      if(second){
        if(!np.parents.includes(second)) np.parents.push(second);
        const sp = state.persons[second];
        if(sp && !sp.children.includes(np.id)) sp.children.push(np.id);
      }
    }
    if(formRel==="sibling"){
      // copier les parents de ref (si aucun, on prévient)
      if(!(ref.parents||[]).length){
        alert("Ajoute d’abord au moins un parent pour créer un frère/soeur.");
      }else{
        for(const pid of ref.parents){
          if(!np.parents.includes(pid)) np.parents.push(pid);
          const par = state.persons[pid];
          if(par && !par.children.includes(np.id)) par.children.push(np.id);
        }
      }
    }

  }else if(formMode==="edit"){
    const p = state.persons[editId];
    p.last=last; p.first=first; p.birth=birth; p.alive=alive; p.death=death;
  }

  save(); closeForm(); renderAll();
};

function closeForm(){ $("#formModal").classList.remove("show"); }

/***********************
 * Liaisons / Suppression
 ***********************/
function linkSpouse(aId,bId){
  const a = state.persons[aId], b = state.persons[bId];
  if(!a || !b) return;
  if(!a.spouses.includes(bId)) a.spouses.push(bId);
  if(!b.spouses.includes(aId)) b.spouses.push(aId);
}

function setAsParent(parentId, childId){
  const par = state.persons[parentId], ch = state.persons[childId];
  if(!par || !ch) return;
  if(!ch.parents.includes(parentId)) ch.parents.push(parentId);
  if(!par.children.includes(childId)) par.children.push(childId);
}

function linkSiblings(aId,bId){
  const a = state.persons[aId], b = state.persons[bId];
  // Unir les parents connus
  const pool = new Set([...(a.parents||[]), ...(b.parents||[])]);
  if(pool.size===0){ alert("Définis au moins un parent pour l’un des deux avant de lier comme frères/soeurs."); return; }
  for(const pid of pool){
    if(!a.parents.includes(pid)) a.parents.push(pid);
    if(!b.parents.includes(pid)) b.parents.push(pid);
    const par = state.persons[pid];
    if(par){
      if(!par.children.includes(aId)) par.children.push(aId);
      if(!par.children.includes(bId)) par.children.push(bId);
    }
  }
}

function removePersonPrompt(id){
  const p = state.persons[id]; if(!p) return;
  if(!confirm(`Supprimer ${p.first||""} ${p.last||""} ?`)) return;

  // nettoyer liens
  for(const sp of (p.spouses||[])){
    const s = state.persons[sp]; if(s) s.spouses = s.spouses.filter(x=>x!==id);
  }
  for(const pid of (p.parents||[])){
    const par = state.persons[pid]; if(par) par.children = par.children.filter(x=>x!==id);
  }
  for(const cid of (p.children||[])){
    const ch = state.persons[cid]; if(ch) ch.parents = ch.parents.filter(x=>x!==id);
  }
  delete state.persons[id];
  if(state.rootId===id){ state.rootId = Object.keys(state.persons)[0]||null; }
  save(); renderAll(); closeView();
}

/***********************
 * Modals close
 ***********************/
$$(".overlay").forEach(ov=>{
  ov.addEventListener("click",e=>{
    if(e.target.matches("[data-close]") || e.target===ov) ov.classList.remove("show");
  });
});

/***********************
 * Démarrage
 ***********************/
(function init(){
  if(state.rootId){
    welcome.classList.remove("show");
    renderAll();
  }else{
    welcome.classList.add("show");
  }
})();
