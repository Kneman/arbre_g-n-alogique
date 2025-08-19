/***************
 *  Données
 ***************/
const LS_KEY = "genea_v2";

let state = load() || {
  persons:{},  // id -> person
  rootId:null
};

function uid(){ return "p"+Math.random().toString(36).slice(2,10); }

function makePerson({first,last,birth,alive=true,death=null,gender=null}){
  const id = uid();
  return state.persons[id] = {
    id,
    first:first||"",
    last:last||"",
    birth:birth||"",
    alive:alive!==false,
    death:death||null,
    gender:gender,          // "m" | "f" | null (père/mère fixent automatiquement)
    fatherId:null,
    motherId:null,
    spouseId:null,          // (simple, un conjoint — extensible)
    childrenIds:[]          // liens descendants
  };
}

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function load(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; }
}

/*****************
 *  DOM Helpers
 *****************/
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/*****************
 *  Boot
 *****************/
const startEl = $("#start");
const topbar = $("#topbar");
const viewport = $("#viewport");
const stage = $("#stage");
const treeEl = $("#tree");

$("#startBtn").onclick = () => {
  const first = $("#startFirst").value.trim();
  if(!first) return alert("Entre un prénom.");
  const p = makePerson({first});
  state.rootId = p.id;
  save();
  startEl.classList.add("hidden");
  topbar.classList.remove("hidden");
  viewport.classList.remove("hidden");
  render();
};

$("#resetBtn").onclick = () => {
  if(confirm("Tout réinitialiser ?")){ localStorage.removeItem(LS_KEY); location.reload(); }
};

$("#exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "arbre.json"; a.click();
  URL.revokeObjectURL(url);
};

$("#importBtn").onclick = () => {
  const inp = document.createElement("input");
  inp.type="file"; inp.accept=".json,application/json";
  inp.onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if(!data.persons || !data.rootId) throw 0;
        state = data; save(); mount();
      } catch {
        alert("Fichier invalide.");
      }
    };
    r.readAsText(f);
  };
  inp.click();
};

$("#pngBtn").onclick = async () => {
  const canvas = await html2canvas(stage, {backgroundColor:"#ffffff", scale:2});
  const a = document.createElement("a");
  a.download = "arbre.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
};

/***************
 *  Pan / Zoom
 ***************/
let zoom = 1;
let pan = {x:0,y:0};
const ZSTEP = 0.1, ZMIN=0.3, ZMAX=2.2;

function applyTransform(){
  stage.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
}

$("#zoomInBtn").onclick = ()=>{ zoom = Math.min(ZMAX, zoom+ZSTEP); applyTransform(); };
$("#zoomOutBtn").onclick = ()=>{ zoom = Math.max(ZMIN, zoom-ZSTEP); applyTransform(); };
$("#zoomResetBtn").onclick = ()=>{ zoom = 1; pan={x:0,y:0}; applyTransform(); };

let isPanning=false, last={x:0,y:0};
viewport.addEventListener("mousedown", e=>{ isPanning=true; last={x:e.clientX,y:e.clientY}; });
viewport.addEventListener("mousemove", e=>{
  if(!isPanning) return;
  pan.x += (e.clientX-last.x);
  pan.y += (e.clientY-last.y);
  last={x:e.clientX,y:e.clientY};
  applyTransform();
});
window.addEventListener("mouseup", ()=> isPanning=false);

// Touch
viewport.addEventListener("touchstart", e=>{
  if(e.touches.length===1){
    isPanning=true; last={x:e.touches[0].clientX,y:e.touches[0].clientY};
  }
},{passive:true});
viewport.addEventListener("touchmove", e=>{
  if(isPanning && e.touches.length===1){
    pan.x += (e.touches[0].clientX-last.x);
    pan.y += (e.touches[0].clientY-last.y);
    last={x:e.touches[0].clientX,y:e.touches[0].clientY};
    applyTransform();
  }
},{passive:true});
viewport.addEventListener("touchend", ()=> isPanning=false);

/*****************
 *  Rendering
 *****************/
function mount(){
  if(!state.rootId){
    startEl.classList.remove("hidden");
    topbar.classList.add("hidden");
    viewport.classList.add("hidden");
    return;
  }
  startEl.classList.add("hidden");
  topbar.classList.remove("hidden");
  viewport.classList.remove("hidden");
  render();
}

function render(){
  treeEl.innerHTML = "";

  // remonter au plus ancien ancêtre existant
  const topId = findTopAncestor(state.rootId);
  const renderedCouples = new Set();
  const rootLi = renderSubtree(topId, renderedCouples);

  const wrap = document.createElement("div");
  wrap.className = "tree-root";
  const ul = document.createElement("ul");
  ul.appendChild(rootLi);
  wrap.appendChild(ul);
  treeEl.appendChild(wrap);
}

/* remonte tant qu’il existe un père/mère */
function findTopAncestor(id){
  let cur = state.persons[id];
  while(true){
    const f = cur.fatherId && state.persons[cur.fatherId];
    const m = cur.motherId && state.persons[cur.motherId];
    if(!f && !m) return cur.id;
    cur = f || m;
  }
}

/* sous-arbre depuis une personne (fusionne le conjoint pour afficher un couple) */
function renderSubtree(id, seenCouples){
  const p = state.persons[id];
  const spouse = p.spouseId ? state.persons[p.spouseId] : null;
  const coupleKey = spouse ? [p.id, spouse.id].sort().join("_") : p.id;
  if(seenCouples.has(coupleKey)){
    const li = document.createElement("li");
    li.appendChild(renderNode(p, spouse));
    return li;
  }
  seenCouples.add(coupleKey);

  const li = document.createElement("li");
  li.appendChild(renderNode(p, spouse));

  const kids = getChildrenOf(p, spouse);
  if(kids.length){
    const ul = document.createElement("ul");
    kids.forEach(k => ul.appendChild(renderSubtree(k.id, seenCouples)));
    li.appendChild(ul);
  }
  return li;
}

/* enfants d’un parent seul ou d’un couple (frères/soeurs côte à côte) */
function getChildrenOf(p, spouse){
  const ids = new Set([...(p.childrenIds||[])]);
  if(spouse) (spouse.childrenIds||[]).forEach(id=>ids.add(id));
  const kids = [...ids].map(id=>state.persons[id]).filter(Boolean);

  // garder seulement ceux qui sont liés à au moins l’un du couple par filiation
  const filtered = kids.filter(c =>
    c.fatherId===p.id || c.motherId===p.id || (spouse && (c.fatherId===spouse.id || c.motherId===spouse.id))
  );
  // tri alpha pour stabilité
  filtered.sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first));
  return filtered;
}

/* bloc visuel */
function renderNode(p, spouse){
  const node = document.createElement("div");
  node.className = "node";

  node.appendChild(personCard(p));

  if(spouse){
    const sep = document.createElement("div");
    sep.className = "couple-sep";
    sep.textContent = "—";
    node.appendChild(sep);
    node.appendChild(personCard(spouse));
  }
  return node;
}

function personCard(p){
  const card = document.createElement("div");
  card.className = "card-person";

  const nm = document.createElement("div");
  nm.className = "name";
  nm.textContent = `${p.first || ""} ${p.last || ""}`.trim() || "Sans nom";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = p.birth ? `Né(e) ${p.birth}` : "—";

  const actions = document.createElement("div");
  actions.className = "actions";

  actions.appendChild(makeAction("👁", ()=> openView(p.id), "Voir"));
  actions.appendChild(makeAction("➕", ()=> openQuickAdd(p.id), "Ajouter"));
  actions.appendChild(makeAction("✏️", ()=> openEdit(p.id), "Modifier"));
  actions.appendChild(makeAction("🗑", ()=> removePersonPrompt(p.id), "Supprimer","danger"));

  card.appendChild(nm); card.appendChild(meta); card.appendChild(actions);
  return card;
}

function makeAction(txt, fn, title, extra){
  const b = document.createElement("button");
  b.className = "abtn" + (extra?(" "+extra):"");
  b.textContent = txt;
  b.title = title||"";
  b.onclick = e => { e.stopPropagation(); fn(); };
  return b;
}

/***************
 *  View modal
 ***************/
let currentViewId = null;

function openView(id){
  currentViewId = id;
  const p = state.persons[id];
  $("#v_name").textContent = `${p.first||""} ${p.last||""}`.trim() || "Sans nom";
  $("#v_birth").textContent = p.birth || "—";
  $("#v_alive").textContent = p.alive ? "Oui" : "Non";
  $("#v_death_wrap").style.display = p.alive ? "none" : "block";
  $("#v_death").textContent = p.death || "—";

  // remplir select de liaison avec autres personnes
  const targetSel = $("#linkTarget");
  targetSel.innerHTML = "";
  for(const id2 in state.persons){
    if(id2===id) continue;
    const op = document.createElement("option");
    op.value = id2;
    const pp = state.persons[id2];
    op.textContent = `${pp.first} ${pp.last}`.trim() || "Sans nom";
    targetSel.appendChild(op);
  }

  $("#viewModal").classList.remove("hidden");
}

function closeView(){ $("#viewModal").classList.add("hidden"); currentViewId=null; }

$("#viewModal").addEventListener("click",e=>{
  if(e.target.matches("[data-close]") || e.target===e.currentTarget) closeView();
});
$("#editBtn").onclick = ()=> { if(currentViewId) openEdit(currentViewId); };
$("#deleteBtn").onclick = ()=> { if(currentViewId) removePersonPrompt(currentViewId); };
$("#linkBtn").onclick = ()=>{
  const src = currentViewId; if(!src) return;
  const type = $("#linkType").value;
  const tgt = $("#linkTarget").value;
  if(!tgt) return;
  if(type==="spouse") linkSpouse(src,tgt);
  if(type==="parent") linkAsParent(src,tgt);
  if(type==="child")  linkAsParent(tgt,src);
  if(type==="sibling") linkAsSibling(src,tgt);
  save(); render(); openView(src); // refresh view
};

// Quick add depuis la vue
$("#viewModal").addEventListener("click",(e)=>{
  const btn = e.target.closest("[data-add]");
  if(!btn) return;
  const kind = btn.getAttribute("data-add");
  openForm("add", kind, currentViewId);
});

/*****************
 *  Quick add (+)
 *****************/
function openQuickAdd(id){
  // ouvre la vue avec les boutons d’ajout rapides
  openView(id);
}

/*****************
 *  Edit / Add form
 *****************/
let formMode = "add";   // "add" | "edit"
let formRel = null;     // relation pour "add" (mother/father/siblingF/siblingM/spouse/child)
let formRefId = null;   // personne de référence (source)
let editId = null;      // personne à éditer

function openForm(mode, relationOrNull, refIdOrId){
  $("#f_title").textContent = mode==="edit"?"Modifier":"Ajouter";
  $("#f_last").value = "";
  $("#f_first").value = "";
  $("#f_birth").value = "";
  $("#f_alive").value = "true";
  $("#f_death").value = "";
  $("#deathRow").style.display = "none";

  formMode = mode;
  formRel  = relationOrNull;
  formRefId = (mode==="add") ? refIdOrId : null;
  editId = (mode==="edit") ? refIdOrId : null;

  // si edit, pré-remplir
  if(mode==="edit"){
    const p = state.persons[editId];
    $("#f_last").value = p.last || "";
    $("#f_first").value = p.first || "";
    $("#f_birth").value = p.birth || "";
    $("#f_alive").value = p.alive ? "true" : "false";
    $("#deathRow").style.display = p.alive ? "none":"block";
    $("#f_death").value = p.death || "";
  }

  $("#formModal").classList.remove("hidden");
}

$("#f_alive").addEventListener("change", e=>{
  $("#deathRow").style.display = (e.target.value==="false") ? "block" : "none";
});

$("#saveFormBtn").onclick = ()=>{
  const last = $("#f_last").value.trim();
  const first = $("#f_first").value.trim();
  const birth = $("#f_birth").value || "";
  const alive = $("#f_alive").value === "true";
  const death = alive ? null : ($("#f_death").value || null);

  if(!first) return alert("Prénom requis.");

  if(formMode==="add"){
    const src = state.persons[formRefId];
    const rel = formRel;

    // déduire genre si mère/père
    let gender = null;
    if(rel==="mother") gender = "f";
    if(rel==="father") gender = "m";

    const np = makePerson({first,last,birth,alive,death,gender});

    if(rel==="spouse"){
      if(src.spouseId && !confirm("Un conjoint existe déjà. Remplacer ?")) { /* do nothing */ }
      else { if(src.spouseId){ state.persons[src.spouseId].spouseId=null; }
             src.spouseId = np.id; np.spouseId = src.id; }
    }
    if(rel==="child"){
      // attribue le parent actuel, et l’autre parent si conjoint
      if(src.gender==="m") np.fatherId = src.id; else if(src.gender==="f") np.motherId = src.id;
      src.childrenIds.push(np.id);
      if(src.spouseId){
        const sp = state.persons[src.spouseId];
        if(sp.gender==="m") np.fatherId = sp.id;
        if(sp.gender==="f") np.motherId = sp.id;
        sp.childrenIds.push(np.id);
      }
    }
    if(rel==="mother"){
      if(src.motherId) alert("Mère déjà définie — remplacée.");
      src.motherId = np.id;
      np.childrenIds.push(src.id);
      // si père déjà présent, marier
      if(src.fatherId && !np.spouseId){ np.spouseId = src.fatherId; state.persons[src.fatherId].spouseId = np.id; }
    }
    document.getElementById("startBtn").addEventListener("click", () => {
  const prenom = document.getElementById("firstNameInput").value.trim();

  if (prenom !== "") {
    // Créer le premier noeud de l'arbre
    const root = {
      id: Date.now(),
      prenom: prenom,
      nom: "",
      naissance: "",
      mort: "",
      lien: "Moi",
      enfants: []
    };

    // Sauvegarde du root en mémoire
    window.familyTree = root;

    // Masquer la popup
    document.getElementById("welcomePopup").style.display = "none";

    // Afficher l'arbre
    document.getElementById("treeContainer").style.display = "block";
    renderTree(root); // <--- fonction qui dessine l'arbre
  }
});
