const treeContainer = document.getElementById('tree-container');
const styleSelect = document.getElementById('styleSelect');
const resetBtn = document.getElementById('resetBtn');

// LocalStorage
function loadMembers() {
  const stored = localStorage.getItem('members');
  return stored ? JSON.parse(stored) : [];
}

function saveMembers(members) {
  localStorage.setItem('members', JSON.stringify(members));
}

// Ajouter membre
document.getElementById('memberForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const members = loadMembers();
  const newMember = {
    name: document.getElementById('name').value.trim(),
    surname: document.getElementById('surname').value.trim(),
    parent: document.getElementById('parent').value.trim()
  };
  members.push(newMember);
  saveMembers(members);
  document.getElementById('memberForm').reset();
  renderTree();
});

// Reset
resetBtn.addEventListener('click', () => {
  localStorage.removeItem('members');
  renderTree();
});

// Changer style
styleSelect.addEventListener('change', renderTree);

// Construire l'arbre
function renderTree() {
  const members = loadMembers();
  treeContainer.innerHTML = '';
  treeContainer.className = styleSelect.value;

  const dict = {};
  members.forEach(m => dict[m.name + ' ' + m.surname] = { ...m, children: [] });
  members.forEach(m => {
    if (m.parent && dict[m.parent]) dict[m.parent].children.push(dict[m.name + ' ' + m.surname]);
  });

  const roots = members.filter(m => !m.parent || !dict[m.parent]);
  roots.forEach(root => {
    treeContainer.appendChild(createMemberNode(dict[root.name + ' ' + root.surname]));
  });
}

function createMemberNode(member) {
  const div = document.createElement('div');
  div.className = 'member';
  div.textContent = `${member.name} ${member.surname}`;
  if (member.children.length > 0) {
    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'children';
    member.children.forEach(child => childrenDiv.appendChild(createMemberNode(child)));
    div.appendChild(childrenDiv);
  }
  return div;
}

// Drag & zoom
let scale = 1, isDragging = false, startX, startY, offsetX = 0, offsetY = 0;

treeContainer.addEventListener('mousedown', e => { isDragging = true; startX = e.clientX - offsetX; startY = e.clientY - offsetY; treeContainer.style.cursor='grabbing'; });
treeContainer.addEventListener('mouseup', () => { isDragging=false; treeContainer.style.cursor='grab'; });
treeContainer.addEventListener('mouseleave', () => { isDragging=false; treeContainer.style.cursor='grab'; });
treeContainer.addEventListener('mousemove', e => { if(!isDragging) return; offsetX=e.clientX-startX; offsetY=e.clientY-startY; updateTransform(); });

treeContainer.addEventListener('wheel', e => { e.preventDefault(); scale+=-e.deltaY*0.001; if(scale<0.2)scale=0.2; if(scale>3)scale=3; updateTransform(); });

// Touch pinch zoom
let lastDist = null;
treeContainer.addEventListener('touchmove', e => {
  if(e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    if(lastDist) scale *= dist / lastDist;
    if(scale<0.2)scale=0.2;
    if(scale>3)scale=3;
    lastDist = dist;
    updateTransform();
  } else if(e.touches.length === 1 && isDragging) {
    offsetX = e.touches[0].clientX - startX;
    offsetY = e.touches[0].clientY - startY;
    updateTransform();
  }
});
treeContainer.addEventListener('touchstart', e => { if(e.touches.length === 1){ isDragging = true; startX = e.touches[0].clientX - offsetX; startY = e.touches[0].clientY - offsetY; } });
treeContainer.addEventListener('touchend', e => { isDragging=false; lastDist=null; });

function updateTransform() {
  treeContainer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// Initial
renderTree();
