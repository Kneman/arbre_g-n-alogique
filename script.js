let treeData = {};
let root, svg, g, treeLayout, zoom;
let style = "classic";

document.getElementById("root-alive").addEventListener("change", e => {
  document.getElementById("root-death-field").style.display = e.target.value === "no" ? "block" : "none";
});
document.getElementById("member-alive").addEventListener("change", e => {
  document.getElementById("member-death-field").style.display = e.target.value === "no" ? "block" : "none";
});

// Création de la racine
document.getElementById("start-btn").addEventListener("click", () => {
  treeData = {
    lastname: document.getElementById("root-lastname").value,
    firstname: document.getElementById("root-firstname").value,
    birth: document.getElementById("root-birth").value,
    alive: document.getElementById("root-alive").value,
    death: document.getElementById("root-alive").value === "no" ? document.getElementById("root-death").value : null,
    children: []
  };

  document.getElementById("start-screen").style.display = "none";
  document.getElementById("tree-container").style.display = "block";

  initTree();
  update(treeData);
});

// Initialisation arbre
function initTree() {
  svg = d3.select("#tree-svg");
  g = svg.append("g");

  zoom = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);

  treeLayout = d3.tree().nodeSize([100, 200]);
}

// Affichage arbre
function update(source) {
  g.selectAll("*").remove();

  root = d3.hierarchy(treeData);
  treeLayout(root);

  g.selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y));

  const node = g.selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .on("dblclick", d => openPopup(d.data));

  node.append("rect")
    .attr("width", 100)
    .attr("height", 50)
    .attr("x", -50)
    .attr("y", -25);

  node.append("text")
    .attr("dy", 0)
    .text(d => `${d.data.firstname} ${d.data.lastname}`);
}

// Popup
function openPopup(target) {
  document.getElementById("popup").style.display = "block";
  document.getElementById("save-member").onclick = () => addMember(target);
}
function closePopup() {
  document.getElementById("popup").style.display = "none";
}

// Ajout membre
function addMember(target) {
  const lastname = document.getElementById("member-lastname").value;
  const firstname = document.getElementById("member-firstname").value;
  const birth = document.getElementById("member-birth").value;
  const alive = document.getElementById("member-alive").value;
  const death = alive === "no" ? document.getElementById("member-death").value : null;
  const relation = document.getElementById("relation-type").value;

  const newPerson = { lastname, firstname, birth, alive, death, children: [] };

  if (relation === "child") {
    target.children = target.children || [];
    target.children.push(newPerson);
  } else if (relation === "parent") {
    const clone = JSON.parse(JSON.stringify(target));
    treeData = newPerson;
    treeData.children = [clone];
  } else if (relation === "sibling") {
    alert("⚠️ Ajouter un frère/une sœur ajoute l’enfant aux mêmes parents (à implémenter plus tard)");
  } else if (relation === "spouse") {
    target.spouse = newPerson;
  }

  closePopup();
  update(treeData);
}

// Fonctions outils
function switchStyle(s) { style = s; update(treeData); }
function exportJSON() {
  const blob = new Blob([JSON.stringify(treeData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "arbre.json";
  a.click();
}
function importJSON() { alert("⚠️ Import JSON à coder"); }
function exportPNG() { alert("⚠️ Export PNG à coder"); }
function centerTree() { svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity); }
function zoomIn() { svg.transition().call(zoom.scaleBy, 1.2); }
function zoomOut() { svg.transition().call(zoom.scaleBy, 0.8); }
