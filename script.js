/***********************
 *  MODÈLE DE DONNÉES
 ***********************/
const LS_KEY = "genea_tree_v1";

let state = loadState() || {
  persons: {},    // {id:Person}
  rootId: null,   // personne centrale choisie
  theme: "natural"// "natural" | "pro"
};

function uid(){ return "p" + Math.random().toString(36).slice(2,10); }

function createPerson(name, gender=null){
  const id = uid();
  return state.persons[id] = {
    id, name, gender, fatherId:null, motherId:null, spouseId:null, childrenIds:[]
  };
}

/*************************
 *  SAUVEGARDE / CHARGEMENT
 *************************/
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function loadState(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; }
}

/******************
 *  INITIALISATION
 ******************/
const q = s => document.querySelector(s);
const treeEl = q("#tree");
const welcome = q("#welcome");

q("#toggleTheme").onclick = () => {
  state.theme = state.theme === "natural" ? "pro" : "natural";
  applyTheme(); render();
  saveState();
};

q("#resetBtn").onclick = () => {
  if(confirm("Réinitialiser l'arbre (supprime les données locales) ?")){
    localStorage.removeItem(LS_KEY);
    location.reload();
  }
};

q("#exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "arbre_genealogique.json"; a.click();
  URL.revokeObjectURL(url);
};

q("#importBtn").onclick = () => {
  const inp = document.createElement("input");
  inp.type="file"; inp.accept=".json,application/json";
  inp.onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if(!data.persons || !data.rootId) throw 0;
        state = data; applyTheme(); render(); saveState();
      } catch {
        alert("Fichier invalide.");
      }
    };
    rd.readAsText(f);
  };
  inp.click();
};

q("#pngBtn").onclick = async () => {
  // exporte uniquement l'arbre
  const el = q("#canvas");
  const canvas = await html2canvas(el, {backgroundColor:"#ffffff", scale:2});
  const a = document.createElement("a");
  a.download = "arbre.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
};

q("#startBtn").onclick = () => {
  const name = q("#startName").value.trim();
  if(!name) return alert("Entre un prénom !");
  const p = createPerson(name, null);
  state.rootId = p.id;
  saveState();
  welcome.classList.add("hidden");
  render();
};

function applyTheme(){
  document.body.classList.toggle("theme-pro", state.theme === "pro");
}

(function boot(){
  applyTheme();
  if(!state.rootId){
    welcome.classList.remove("hidden");
  }else{
    welcome.classList.add("hidden");
    render();
  }
})();

/****************
 *  RENDU ARBRE
 ****************/
function render(){
  treeEl.innerHTML = "";
  if(!state.rootId) return;

  const topId = findTopAncestor(state.rootId);
  const rootLi = renderSubtreeFrom(topId, new Set());

  const wrapper = document.createElement("div");
  wrapper.className = "tree-root";
  const ul = document.createElement("ul");
  ul.appendChild(rootLi);
  wrapper.appendChild(ul);

  treeEl.appendChild(wrapper);
}

/* remonte au plus ancien ancêtre disponible */
function findTopAncestor(id){
  let cur = state.persons[id];
  while(true){
    const father = cur.fatherId ? state.persons[cur.fatherId] : null;
    const mother = cur.motherId ? state.persons[cur.motherId] : null;
    if(!father && !mother) return cur.id;
    cur = father || mother;
  }
}

/* Render un couple (ou personne seule) + enfants */
function renderSubtreeFrom(personId, renderedCouples){
  const p = state.persons[personId];
  const spouse = p.spouseId ? state.persons[p.spouseId] : null;

  const coupleKey = spouse ? [p.id, spouse.id].sort().join("_") : p.id;
  if(renderedCouples.has(coupleKey)){
    // évite de rendre deux fois le même couple
    const li = document.createElement("li");
    li.appendChild(renderNode(p, spouse));
    return li;
  }
  renderedCouples.add(coupleKey);

  const li = document.createElement("li");
  li.appendChild(renderNode(p, spouse));

  // enfants du couple/personne
  const kids = getChildrenOfCouple(p, spouse);
  if(kids.length){
    const ul = document.createElement("ul");
    for(const kid of kids){
      ul.appendChild(renderSubtreeFrom(kid.id, renderedCouples));
    }
    li.appendChild(ul);
  }
  return li;
}

/* Récupère enfants d'un couple ou d'un parent solo */
function getChildrenOfCouple(p, spouse){
  const res = [];
  const seen = new Set();
  for(const id of p.childrenIds){ seen.add(id); }
  if(spouse){
    for(const id of spouse.childrenIds){ seen.add(id); }
  }
  for(const id of seen){
    const c = state.persons[id];
    // vérifie cohérence (parenté)
    if(
      (c.fatherId === p.id || c.motherId === p.id) ||
      (spouse && (c.fatherId === spouse.id || c.motherId === spouse.id))
    ){
      res.push(c);
    }
  }
  // tri optionnel : par nom
  res.sort((a,b)=>a.name.localeCompare(b.name));
  return res;
}

/* rend le bloc couple/personne + boutons */
function renderNode(p, spouse){
  const node = document.createElement("div");
  node.className = "node";

  node.appendChild(renderPersonCard(p));

  if(spouse){
    const sep = document.createElement("div");
    sep.className = "couple-sep";
    sep.textContent = "—";
    node.appendChild(sep);
    node.appendChild(renderPersonCard(spouse));
  }

  return node;
}

function renderPersonCard(person){
  const box = document.createElement("div");
  box.className = "person";
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = person.name;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = person.gender === "m" ? "Homme" : person.gender === "f" ? "Femme" : "—";
  const actions = document.createElement("div");
  actions.className = "p-actions";

  actions.appendChild(makeBtn("➕", ()=> addMenu(person.id)));
  actions.appendChild(makeBtn("✏️", ()=> editPerson(person.id)));
  actions.appendChild(makeBtn("🔗", ()=> linkMenu(person.id)));
  actions.appendChild(makeBtn("🗑️", ()=> deletePerson(person.id), "danger"));

  box.appendChild(name); box.appendChild(meta); box.appendChild(actions);
  return box;
}

function makeBtn(label, fn, extraClass=""){
  const b = document.createElement("button");
  b.className = "pbtn" + (extraClass?(" "+extraClass):"");
  b.textContent = label;
  b.onclick = fn;
  return b;
}

/***********************
 *  ACTIONS SUR PERSONNE
 ***********************/

/* Menu pour AJOUTER avec relation */
function addMenu(id){
  const r = prompt(
    "Ajouter quel lien ?\n" +
    "père, mère, enfant, conjoint, frère, sœur"
  );
  if(!r) return;
  const rel = r.toLowerCase().replace('oe','œ');

  if(["père","pere","mère","mere"].includes(rel)) return addParent(id, rel.startsWith("p")?"m":"f");
  if(rel==="enfant") return addChildFlow(id);
  if(rel==="conjoint") return addSpouse(id);
  if(rel==="frère"||rel==="frere"||rel==="sœur"||rel==="soeur") return addSibling(id, (rel[0]==="f"||rel.startsWith("sœ"))?"m":"f");

  alert("Relation inconnue.");
}

/* Créer parent (père ou mère) */
function addParent(childId, parentGender){
  const child = state.persons[childId];
  if(parentGender==="m" && child.fatherId){ return alert("Père déjà défini."); }
  if(parentGender==="f" && child.motherId){ return alert("Mère déjà définie."); }

  const name = prompt("Prénom du parent :"); if(!name) return;
  const p = createPerson(name, parentGender);

  if(parentGender==="m") child.fatherId = p.id;
  else child.motherId = p.id;

  // Si l’autre parent existe déjà et n’a pas de conjoint → on les marie
  const otherId = parentGender==="m" ? child.motherId : child.fatherId;
  if(otherId && !state.persons[otherId].spouseId){
    state.persons[otherId].spouseId = p.id;
    p.spouseId = otherId;
  }

  // liens enfants
  p.childrenIds.push(child.id);
  saveState(); render();
}

/* Ajouter conjoint */
function addSpouse(id){
  const me = state.persons[id];
  if(me.spouseId) return alert("Conjoint déjà défini.");
  const name = prompt("Prénom du conjoint :"); if(!name) return;
  let g = prompt("Genre du conjoint ? (m/f ou laisser vide)");
  g = (g||"").toLowerCase(); if(g!=="m" && g!=="f") g=null;
  const s = createPerson(name, g);
  me.spouseId = s.id; s.spouseId = me.id;
  saveState(); render();
}

/* Ajouter enfant (demande le rôle du parent courant) */
function addChildFlow(parentId){
  const me = state.persons[parentId];
  let role = me.gender ? (me.gender==="m"?"père":"mère") : prompt("Ton rôle par rapport à l'enfant ? (père/mère)");
  if(!role) return;
  role = role.toLowerCase().startsWith("p")?"m":"f"; // m=father, f=mother

  const name = prompt("Prénom de l'enfant :"); if(!name) return;
  const c = createPerson(name, null);

  if(role==="m") c.fatherId = me.id; else c.motherId = me.id;
  me.childrenIds.push(c.id);

  // proposer d'associer l'autre parent si conjoint
  if(me.spouseId){
    const yes = confirm("Associer aussi le conjoint comme autre parent ?");
    if(yes){
      if(role==="m") c.motherId = me.spouseId; else c.fatherId = me.spouseId;
      state.persons[me.spouseId].childrenIds.push(c.id);
    }
  }
  saveState(); render();
}

/* Ajouter frère/soeur → même parents */
function addSibling(id, genderGuess){
  const me = state.persons[id];
  if(!me.fatherId && !me.motherId){
    return alert("Ajoute d'abord au moins un parent pour créer un frère/soeur.");
  }
  const name = prompt("Prénom du frère/soeur :"); if(!name) return;
  let g = prompt("Genre ? (m/f ou vide)");
  g = (g||"").toLowerCase(); if(g!=="m" && g!=="f") g = null;

  const s = createPerson(name, g);
  s.fatherId = me.fatherId || null;
  s.motherId = me.motherId || null;

  if(me.fatherId) state.persons[me.fatherId].childrenIds.push(s.id);
  if(me.motherId) state.persons[me.motherId].childrenIds.push(s.id);

  saveState(); render();
}

/* Modifier nom / genre */
function editPerson(id){
  const p = state.persons[id];
  const n = prompt("Nouveau prénom :", p.name);
  if(n){ p.name = n; }
  let g = prompt("Genre ? (m/f ou vide)", p.gender || "");
  g = (g||"").toLowerCase(); if(g!=="m" && g!=="f") g=null;
  p.gender = g;
  saveState(); render();
}

/* Supprimer une personne (garde les enfants mais supprime les liens) */
function deletePerson(id){
  if(id === state.rootId){
    if(!confirm("Supprimer la personne racine ? (l'arbre restera mais sans elle)")) return;
    state.rootId = null;
    // s'il reste des personnes, on choisit quelqu'un d'autre comme racine
  }
  const p = state.persons[id];
  if(!p) return;

  // rompre liens conjugaux
  if(p.spouseId && state.persons[p.spouseId]){
    state.persons[p.spouseId].spouseId = null;
  }
  // enlever des enfants chez parents
  if(p.fatherId && state.persons[p.fatherId]){
    state.persons[p.fatherId].childrenIds = state.persons[p.fatherId].childrenIds.filter(cid=>cid!==id);
  }
  if(p.motherId && state.persons[p.motherId]){
    state.persons[p.motherId].childrenIds = state.persons[p.motherId].childrenIds.filter(cid=>cid!==id);
  }
  // retirer références parentales chez ses enfants
  for(const cid of p.childrenIds){
    const c = state.persons[cid];
    if(!c) continue;
    if(c.fatherId===id) c.fatherId=null;
    if(c.motherId===id) c.motherId=null;
  }

  delete state.persons[id];

  // si plus de racine, choisir un survivant arbitraire
  if(!state.rootId){
    const first = Object.keys(state.persons)[0];
    state.rootId = first || null;
  }

  saveState(); render();
}

/***********************
 * Lier deux personnes
 ***********************/
function linkMenu(srcId){
  const choice = prompt(
    "Créer un lien avec…\n" +
    "1 = Conjoint\n2 = Parent de…\n3 = Enfant de…\n4 = Frère/Soœur de…\n\nEntre 1, 2, 3 ou 4"
  );
  if(!choice) return;

  const targetName = prompt("Prénom exact de l’autre personne (déjà créée) :");
  if(!targetName) return;
  const targetId = findByName(targetName);
  if(!targetId){ alert("Personne introuvable (utilise exactement le même prénom)."); return; }

  if(choice==="1") return linkSpouse(srcId, targetId);
  if(choice==="2") return linkAsParent(srcId, targetId);
  if(choice==="3") return linkAsChild(srcId, targetId);
  if(choice==="4") return linkAsSibling(srcId, targetId);
}

function findByName(name){
  name = name.trim().toLowerCase();
  for(const id in state.persons){
    if(state.persons[id].name.trim().toLowerCase() === name) return id;
  }
  return null;
}

function ensureArrPush(arr,id){ if(!arr.includes(id)) arr.push(id); }

function linkSpouse(aId,bId){
  const a=state.persons[aId], b=state.persons[bId];
  if(a.spouseId || b.spouseId) if(!confirm("Un des deux a déjà un conjoint. Remplacer ?")) return;
  a.spouseId=b.id; b.spouseId=a.id;
  saveState(); render();
}
function linkAsParent(parentId, childId){
  const parent = state.persons[parentId], child = state.persons[childId];
  let role = parent.gender ? (parent.gender==="m"?"père":"mère") : prompt("Le parent est père ou mère ?");
  if(!role) return;
  if(role.toLowerCase().startsWith("p")) child.fatherId = parent.id; else child.motherId = parent.id;
  ensureArrPush(parent.childrenIds, child.id);
  saveState(); render();
}
function linkAsChild(childId, parentId){
  // juste l'inverse de linkAsParent
  linkAsParent(parentId, childId);
}
function linkAsSibling(aId,bId){
  const a=state.persons[aId], b=state.persons[bId];
  if(!a.fatherId && !a.motherId && !b.fatherId && !b.motherId){
    alert("Définis au moins un parent pour l'un des deux avant de lier comme frères/soeurs.");
    return;
  }
  // copie les parents connus d'un côté vers l'autre
  if(a.fatherId) b.fatherId = a.fatherId;
  if(a.motherId) b.motherId = a.motherId;
  if(b.fatherId) a.fatherId = b.fatherId;
  if(b.motherId) a.motherId = b.motherId;

  const father = a.fatherId || b.fatherId;
  const mother = a.motherId || b.motherId;
  if(father) ensureArrPush(state.persons[father].childrenIds, a.id), ensureArrPush(state.persons[father].childrenIds, b.id);
  if(mother) ensureArrPush(state.persons[mother].childrenIds, a.id), ensureArrPush(state.persons[mother].childrenIds, b.id);

  saveState(); render();
    }
