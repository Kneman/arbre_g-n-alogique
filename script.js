let data = { name: "Vous", children: [] };
let currentStyle = "classique";
let selectedNode = null;
let svg = d3.select("#tree");
let g = svg.append("g");
let zoom = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
svg.call(zoom);

function setStyle(style) {
  currentStyle = style;
  update();
}

function update() {
  g.selectAll("*").remove();

  let root = d3.hierarchy(data);
  let treeLayout = d3.tree().nodeSize([120, 120]);
  treeLayout(root);

  g.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y));

  let nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", "node " + currentStyle)
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .on("click", (event, d) => { selectedNode = d; openPopup(); });

  nodes.append("rect")
    .attr("x", -50).attr("y", -20)
    .attr("width", 100).attr("height", 40);

  nodes.append("text")
    .attr("dy", 5)
    .text(d => d.data.prenom ? `${d.data.prenom} ${d.data.nom}` : d.data.name);
}

function openPopup() {
  document.getElementById("popup").classList.remove("hidden");
}
function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}

function saveMember() {
  let prenom = document.getElementById("prenom").value;
  let nom = document.getElementById("nom").value;
  let dob = document.getElementById("dob").value;
  let alive = document.getElementById("alive").value;
  let dod = document.getElementById("dod").value;
  let relation = document.getElementById("relation").value;

  let member = { prenom, nom, dob, alive, dod, children: [] };

  if (selectedNode) {
    if (!selectedNode.data.children) selectedNode.data.children = [];
    if (relation === "enfant") {
      selectedNode.data.children.push(member);
    } else if (relation === "conjoint") {
      selectedNode.data.conjoint = member;
    } else if (relation === "pere" || relation === "mere") {
      data = { ...member, children: [data] };
    } else if (relation === "frere" || relation === "soeur") {
      // ajouter au même niveau
      if (selectedNode.parent) {
        selectedNode.parent.data.children.push(member);
      }
    }
  }

  closePopup();
  update();
}

function exportJSON() {
  let blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "arbre.json";
  a.click();
}

function importJSON() {
  let input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e => {
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.onload = () => {
      data = JSON.parse(reader.result);
      update();
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportPNG() {
  let svgElement = document.getElementById("tree");
  let serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);
  let img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(source);
  img.onload = () => {
    let canvas = document.createElement("canvas");
    canvas.width = svgElement.clientWidth;
    canvas.height = svgElement.clientHeight;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    let link = document.createElement("a");
    link.download = "arbre.png";
    link.href = canvas.toDataURL();
    link.click();
  };
}

function resetZoom() {
  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
}

update();
