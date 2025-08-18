let family = {};
let layout = "vertical"; // par défaut

document.getElementById("startBtn").addEventListener("click", () => {
  const name = document.getElementById("rootName").value.trim();
  if (!name) return alert("Entre ton prénom !");
  
  family = { name: name, children: [] };
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("tree-container").style.display = "block";
  renderTree();
});

document.getElementById("toggleLayout").addEventListener("click", () => {
  layout = (layout === "vertical") ? "horizontal" : "vertical";
  renderTree();
});

function renderTree() {
  const container = document.getElementById("tree");
  container.className = layout;
  container.innerHTML = "";
  buildGeneration([family], container);
}

function buildGeneration(members, parentEl) {
  const genDiv = document.createElement("div");
  genDiv.className = "generation";
  members.forEach(person => {
    const personDiv = document.createElement("div");
    personDiv.className = "person";
    personDiv.textContent = person.name;

    // bouton ajouter enfant
    const btn = document.createElement("button");
    btn.textContent = "+";
    btn.style.display = "block";
    btn.style.marginTop = "5px";
    btn.onclick = () => {
      const childName = prompt("Nom du membre ?");
      if (childName) {
        if (!person.children) person.children = [];
        person.children.push({ name: childName, children: [] });
        renderTree();
      }
    };
    personDiv.appendChild(btn);

    genDiv.appendChild(personDiv);

    if (person.children && person.children.length > 0) {
      buildGeneration(person.children, genDiv);
    }
  });
  parentEl.appendChild(genDiv);
}
