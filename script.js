let treeData = {
  name: "Racine",
  children: []
};

let selectedNode = null;
let relationType = null;
let isAlive = true;
let style = "classic";

const svg = d3.select("#tree-container").append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .call(d3.zoom().on("zoom", (e) => {
    g.attr("transform", e.transform);
  }))
  .append("g");

const g = svg.append("g");

const treeLayout = d3.tree().nodeSize([100, 200]);

function update() {
  g.selectAll("*").remove();

  const root = d3.hierarchy(treeData);
  treeLayout(root);

  // Lignes
  g.selectAll(".link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("fill", "none")
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("d", d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y)
    );

  // Noeuds
  const node = g.selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .on("click", (e, d) => {
      selectedNode = d;
      openPopup();
    });

  node.append("rect")
    .attr("width", 120)
    .attr("height", 50)
    .attr("x", -60)
    .attr("y", -25)
    .attr("fill", style === "classic" ? "#fff" : "#e3f2fd")
    .attr("stroke", style === "classic" ? "#000" : "#2196f3");

  node.append("text")
    .attr("dy", 0)
    .text(d => d.data.name);
}

// --- Popup ---
function openPopup() {
  document.getElementById("popup").classList.remove("hidden");
}
function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}
function setAlive(alive) {
  isAlive = alive;
  document.getElementById("deathField").classList.toggle("hidden", alive);
}
function selectRelation(rel) {
  relationType = rel;
}
function savePerson() {
  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const birthDate = document.getElementById("birthDate").value;
  const deathDate = document.getElementById("deathDate").value;

  if (!firstName || !lastName) return;

  const newPerson = {
    name: `${firstName} ${lastName}`,
    birth: birthDate,
    death: isAlive ? null : deathDate,
    children: []
  };

  if (selectedNode) {
    if (!selectedNode.data.children) selectedNode.data.children = [];
    selectedNode.data.children.push(newPerson);
  } else {
    treeData = newPerson;
  }

  closePopup();
  update();
}

// --- Styles ---
function setStyle(s) {
  style = s;
  update();
}

// --- Export / Import / Reset ---
function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(treeData));
  const dl = document.createElement("a");
  dl.setAttribute("href", dataStr);
  dl.setAttribute("download", "arbre.json");
  dl.click();
}
function importJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      treeData = JSON.parse(e.target.result);
      update();
    };
    reader.readAsText(file);
  };
  input.click();
}
function exportPNG() {
  alert("Export PNG à implémenter");
}
function resetView() {
  svg.transition().duration(750).call(
    d3.zoom().transform,
    d3.zoomIdentity
  );
}

update();
