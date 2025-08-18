let familyTree = {
  name: "Moi",
  children: []
};

let layout = "vertical"; // "vertical" ou "horizontal"

function renderTree() {
  const container = document.getElementById("tree-container");
  container.innerHTML = "";
  container.appendChild(renderMember(familyTree));
}

function renderMember(member) {
  const div = document.createElement("div");
  div.className = "member";

  const name = document.createElement("div");
  name.innerText = member.name;
  div.appendChild(name);

  // Actions
  const actions = document.createElement("div");
  actions.className = "actions";

  const addBtn = document.createElement("button");
  addBtn.innerText = "+";
  addBtn.onclick = () => addMember(member);
  actions.appendChild(addBtn);

  const editBtn = document.createElement("button");
  editBtn.innerText = "✎";
  editBtn.onclick = () => editMember(member);
  actions.appendChild(editBtn);

  const delBtn = document.createElement("button");
  delBtn.innerText = "🗑️";
  delBtn.onclick = () => deleteMember(member);
  actions.appendChild(delBtn);

  div.appendChild(actions);

  if (member.children && member.children.length > 0) {
    if (layout === "vertical") {
      const line = document.createElement("div");
      line.className = "line";
      div.appendChild(line);
    }

    const childrenDiv = document.createElement("div");
    childrenDiv.className = "children";
    member.children.forEach(child => {
      childrenDiv.appendChild(renderMember(child));
    });
    div.appendChild(childrenDiv);
  }

  return div;
}

function addMember(parent) {
  const name = prompt("Nom du membre :");
  if (!name) return;

  const relation = prompt("Relation (père, mère, frère, sœur, conjoint, enfant) :");
  if (!relation) return;

  const newMember = { name, children: [] };

  if (relation === "enfant") {
    parent.children.push(newMember);
  } else if (relation === "conjoint") {
    if (!parent.spouse) {
      parent.spouse = newMember;
      alert(name + " ajouté comme conjoint de " + parent.name);
    } else {
      alert(parent.name + " a déjà un conjoint !");
    }
  } else {
    // simplification : autre relation → ajouté comme enfant
    parent.children.push(newMember);
  }

  renderTree();
}

function editMember(member) {
  const newName = prompt("Nouveau nom :", member.name);
  if (newName) {
    member.name = newName;
    renderTree();
  }
}

function deleteMember(member) {
  function recursiveDelete(parent, child) {
    parent.children = parent.children.filter(c => c !== child);
    parent.children.forEach(c => recursiveDelete(c, child));
  }
  if (member === familyTree) {
    alert("Impossible de supprimer la racine !");
    return;
  }
  recursiveDelete(familyTree, member);
  renderTree();
}

function exportTree() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(familyTree));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "arbre.json");
  dlAnchor.click();
}

function importTree() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      familyTree = JSON.parse(event.target.result);
      renderTree();
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportImage() {
  html2canvas(document.getElementById("tree-container")).then(canvas => {
    const link = document.createElement("a");
    link.download = "arbre.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}

function toggleLayout() {
  layout = layout === "vertical" ? "horizontal" : "vertical";
  document.getElementById("tree-container").style.flexDirection = (layout === "horizontal" ? "row" : "column");
  renderTree();
}

renderTree();
