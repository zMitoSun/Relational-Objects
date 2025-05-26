"use strict";

// Estado e elementos
let objects = {};
let relations = [];
let counter = 0;
const unsavedChanges = new Set();

const canvas = document.getElementById("canvas");
const workspace = document.getElementById("workspace");
const connections = document.getElementById("connections");
const popup = document.getElementById("popupModal");
const popupContent = popup.querySelector(".modal-content");

// Return dimensões do workspace
function getWorkspaceBounds() {
  return { width: workspace.clientWidth, height: workspace.clientHeight };
}

// Ícone de detalhes
function addInfoIcon(el, id) {
  const infoIcon = document.createElement("div");
  infoIcon.className = "info-icon";
  infoIcon.textContent = "i";
  infoIcon.title = "Ver detalhes";
  infoIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    showPopup(id);
  });
  el.appendChild(infoIcon);
}

// Cria um novo objeto e posiciona no centro do topo
function addObject() {
  const nameInput = document.getElementById("objName");
  const descInput = document.getElementById("objDesc");
  const name = nameInput.value.trim();
  const description = descInput.value.trim();

  if (!name) {
    alert("Nome é obrigatório");
    return;
  }

  const bounds = getWorkspaceBounds();
  const id = `obj${counter++}`;
  const box = document.createElement("div");
  box.className = "object";
  box.id = id;
  const objectWidth = 130;
  box.style.left = (bounds.width / 2 - objectWidth / 2) + "px";
  box.style.top = "20px";


  const nameEl = document.createElement("div");
  nameEl.className = "name";
  nameEl.textContent = name;
  box.appendChild(nameEl);

  addInfoIcon(box, id);
  makeDraggable(box);
  workspace.appendChild(box);

  const timestamp = new Date().toISOString();
  objects[id] = {
    id,
    name,
    description,
    created_at: timestamp,
    updated_at: timestamp,
    connections: [],
    collapsed: false,
    left: parseFloat(box.style.left),
    top: parseFloat(box.style.top),
    category: 1,
  };

  applyCategoryStyle(box, 1);
  updateSelects();
  updateConnectionSelect();
  drawConnections();

  nameInput.value = "";
  descInput.value = "";
}

// Atualiza os selects para conexões
function updateSelects() {
  const selects = [document.getElementById("fromObj"), document.getElementById("toObj")];
  selects.forEach((select) => {
    select.innerHTML = "";
    for (let id in objects) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = objects[id].name;
      select.appendChild(option);
    }
  });
}

// Atualiza o select p/ remoção de conexões
function updateConnectionSelect() {
  const connSelect = document.getElementById("connectionToRemove");
  if (!connSelect) return;
  connSelect.innerHTML = "";
  relations.forEach(([from, to], i) => {
    if (objects[from] && objects[to]) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `${objects[from].name} → ${objects[to].name}`;
      connSelect.appendChild(option);
    }
  });
}

// Cria uma conexão
function connectObjects() {
  const fromId = document.getElementById("fromObj").value;
  const toId = document.getElementById("toObj").value;
  if (fromId === toId) {
    alert("Não pode conectar objeto a ele mesmo.");
    return;
  }
  if (objects[fromId].connections.includes(toId)) {
    alert("Conexão já existe.");
    return;
  }
  objects[fromId].connections.push(toId);
  relations.push([fromId, toId]);
  drawConnections();
  updateConnectionSelect();
}

// Remove a conexão
function removeSelectedConnection() {
  const connSelect = document.getElementById("connectionToRemove");
  if (!connSelect) return;
  const selectedIndex = parseInt(connSelect.value);
  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= relations.length) {
    alert("Selecione uma conexão válida para remover.");
    return;
  }
  const [fromId, toId] = relations[selectedIndex];
  relations.splice(selectedIndex, 1);
  if (objects[fromId]) {
    objects[fromId].connections = objects[fromId].connections.filter((id) => id !== toId);
  }
  drawConnections();
  updateConnectionSelect();
}

// Exclui objeto e conexões
function deleteObject(id) {
  if (!objects[id]) return;
  delete objects[id];
  const el = document.getElementById(id);
  if (el) el.remove();
  relations = relations.filter(([from, to]) => from !== id && to !== id);
  for (let key in objects) {
    objects[key].connections = objects[key].connections.filter((connId) => connId !== id);
  }
  updateSelects();
  updateConnectionSelect();
  drawConnections();
}

// Desenha as conexões
function drawConnections() {
  connections.innerHTML = "";
  relations = relations.filter(([from, to]) => objects[from] && objects[to]);
  const workspaceRect = workspace.getBoundingClientRect();

  relations.forEach(([fromId, toId]) => {
    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);
    if (!fromEl || !toEl) return;

    const svgNS = "http://www.w3.org/2000/svg";
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("stroke", "#FFC107");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("marker-end", "url(#arrowhead)");

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const startX = fromRect.left + fromRect.width / 2 - workspaceRect.left;
    const startY = fromRect.top + fromRect.height / 2 - workspaceRect.top;
    const endX = toRect.left + toRect.width / 2 - workspaceRect.left;
    const endY = toRect.top + toRect.height / 2 - workspaceRect.top;
    const deltaX = (endX - startX) / 2;
    const pathData = `M${startX},${startY} C${startX + deltaX},${startY} ${endX - deltaX},${endY} ${endX},${endY}`;
    path.setAttribute("d", pathData);

    connections.appendChild(path);
  });

  if (!document.getElementById("arrowhead")) {
    const svgNS = "http://www.w3.org/2000/svg";
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "10");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");
    const markerPath = document.createElementNS(svgNS, "path");
    markerPath.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
    markerPath.setAttribute("fill", "#FFC107");
    marker.appendChild(markerPath);
    connections.insertBefore(marker, connections.firstChild);
  }

  updateOverview();
  updateOverviewViewport();
}

// Cria a overview
function updateOverview() {
  const overview = document.getElementById("overviewContent");
  if (!overview) return;
  const ovWidth = document.getElementById("overview").clientWidth;
  const ovHeight = document.getElementById("overview").clientHeight;
  const wsWidth = workspace.clientWidth;
  const wsHeight = workspace.clientHeight;
  const scaleFactor = Math.min(ovWidth / wsWidth, ovHeight / wsHeight);
  overview.innerHTML = "";
  for (let id in objects) {
    const obj = objects[id];
    const dot = document.createElement("div");
    dot.className = "overview-dot";
    dot.style.left = (obj.left * scaleFactor) + "px";
    dot.style.top = (obj.top * scaleFactor) + "px";
    overview.appendChild(dot);
  }
  updateOverviewViewport();
}

// Atualiza o viewport na overview
function updateOverviewViewport() {
  const overviewEl = document.getElementById("overview");
  let viewportIndicator = document.getElementById("overviewViewport");
  if (!viewportIndicator) {
    viewportIndicator = document.createElement("div");
    viewportIndicator.id = "overviewViewport";
    viewportIndicator.style.position = "absolute";
    viewportIndicator.style.border = "2px solid #FFC107";
    viewportIndicator.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
    viewportIndicator.style.pointerEvents = "none";
    overviewEl.appendChild(viewportIndicator);
  }
  const ovWidth = overviewEl.clientWidth;
  const ovHeight = overviewEl.clientHeight;
  const wsWidth = workspace.clientWidth;
  const wsHeight = workspace.clientHeight;
  const scaleFactor = Math.min(ovWidth / wsWidth, ovHeight / wsHeight);
  const scrollLeft = canvas.scrollLeft;
  const scrollTop = canvas.scrollTop;
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;
  viewportIndicator.style.width = (canvasWidth * scaleFactor) + "px";
  viewportIndicator.style.height = (canvasHeight * scaleFactor) + "px";
  viewportIndicator.style.left = (scrollLeft * scaleFactor) + "px";
  viewportIndicator.style.top = (scrollTop * scaleFactor) + "px";
  makeViewportDraggable();
}

// Movimentação pelo OverView
function makeViewportDraggable() {
  const viewportIndicator = document.getElementById("overviewViewport");
  if (!viewportIndicator) return;
  let isDragging = false, startX, startY, initialLeft, initialTop;
  viewportIndicator.style.cursor = "move";
  viewportIndicator.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseFloat(viewportIndicator.style.left) || 0;
    initialTop = parseFloat(viewportIndicator.style.top) || 0;
    e.preventDefault();
    e.stopPropagation();
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    let newLeft = initialLeft + dx, newTop = initialTop + dy;
    const overviewEl = document.getElementById("overview");
    const maxLeft = overviewEl.clientWidth - viewportIndicator.clientWidth;
    const maxTop = overviewEl.clientHeight - viewportIndicator.clientHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));
    viewportIndicator.style.left = newLeft + "px";
    viewportIndicator.style.top = newTop + "px";
    const scaleFactor = Math.min(overviewEl.clientWidth / workspace.clientWidth, overviewEl.clientHeight / workspace.clientHeight);
    canvas.scrollLeft = newLeft / scaleFactor;
    canvas.scrollTop = newTop / scaleFactor;
  });
  window.addEventListener("mouseup", () => { if (isDragging) isDragging = false; });
}

// Arrastar objetos no workspace
function makeDraggable(el) {
  let offsetX, offsetY;
  let isDragging = false;
  el.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("info-icon")) return;
    if (["BUTTON", "INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    isDragging = true;
    el.classList.add("dragging");
    const workspaceRect = workspace.getBoundingClientRect();
    offsetX = e.clientX - workspaceRect.left - parseFloat(el.style.left);
    offsetY = e.clientY - workspaceRect.top - parseFloat(el.style.top);
    el.style.cursor = "grabbing";
  });
  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      el.classList.remove("dragging");
      el.style.cursor = "grab";
      const id = el.id;
      if (objects[id]) {
        objects[id].left = parseFloat(el.style.left);
        objects[id].top = parseFloat(el.style.top);
      }
      drawConnections();
    }
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const workspaceRect = workspace.getBoundingClientRect();
    let newLeft = e.clientX - workspaceRect.left - offsetX;
    let newTop = e.clientY - workspaceRect.top - offsetY;
    const bounds = getWorkspaceBounds();
    const maxX = bounds.width - el.offsetWidth;
    const maxY = bounds.height - el.offsetHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxX));
    newTop = Math.max(0, Math.min(newTop, maxY));
    el.style.left = newLeft + "px";
    el.style.top = newTop + "px";
    drawConnections();
  });
}

// Exibe detalhes
function showPopup(id) {
  const obj = objects[id];
  if (!obj) return;
  popupContent.innerHTML = `
    <div class="popup-header"><h3>Editar Objeto</h3></div>
    <div class="popup-body">
      <label class="popup-label">Nome:
        <input type="text" id="popupName" value="${obj.name}" class="popup-input">
      </label>
      <label class="popup-label">Descrição:
        <textarea id="popupDesc" rows="5" class="popup-textarea">${obj.description}</textarea>
      </label>
      <label class="popup-label">Relevância:
        <select id="popupCategory" class="popup-select">
          <option value="1" ${obj.category === 1 ? "selected" : ""}>Relevância Baixa</option>
          <option value="2" ${obj.category === 2 ? "selected" : ""}>Relevância Média</option>
          <option value="3" ${obj.category === 3 ? "selected" : ""}>Relevância Alta</option>
        </select>
      </label>
    </div>
    <div class="popup-footer">
      <p class="popup-timestamps"><small>Criado: ${obj.created_at}<br>Atualizado: ${obj.updated_at}</small></p>
      <div class="popup-buttons">
        <button id="savePopupBtn" class="btn popup-save">Salvar</button>
        <button id="deleteObjBtn" class="btn popup-delete">Excluir</button>
        <button id="closePopupBtn" class="btn popup-close">Fechar</button>
      </div>
    </div>`;
  popup.style.display = "flex";
  
  document.getElementById("savePopupBtn").onclick = () => {
    const newName = document.getElementById("popupName").value.trim();
    if (!newName) { alert("Nome não pode ser vazio."); return; }
    const newDesc = document.getElementById("popupDesc").value.trim();
    const newCat = parseInt(document.getElementById("popupCategory").value);
    obj.name = newName;
    obj.description = newDesc;
    obj.category = newCat;
    obj.updated_at = new Date().toISOString();
    const elBox = document.getElementById(id);
    elBox.querySelector(".name").textContent = newName;
    applyCategoryStyle(elBox, newCat);
    updateSelects();
    updateConnectionSelect();
    drawConnections();
    closePopup();
  };

  document.getElementById("deleteObjBtn").onclick = () => {
    if (confirm("Tem certeza que deseja excluir este objeto?")) {
      deleteObject(id);
      closePopup();
    }
  };

  document.getElementById("closePopupBtn").onclick = closePopup;
}

function closePopup() {
  popup.style.display = "none";
  popupContent.innerHTML = "";
}

// Estilo por categoria
function applyCategoryStyle(el, cat) {
  el.style.backgroundColor = "";
  el.style.borderColor = "";
  switch (cat) {
    case 1:
      el.style.backgroundColor = "#212121";
      el.style.borderColor = "#FFC107";
      break;
    case 2:
      el.style.backgroundColor = "#1a1a1a";
      el.style.borderColor = "#f44336";
      break;
    case 3:
      el.style.backgroundColor = "#1b0d0d";
      el.style.borderColor = "#f44336";
      break;
    default:
      el.style.backgroundColor = "#212121";
      el.style.borderColor = "#FFC107";
  }
}

// Exporta JSON
function exportToJSON() {
  const data = { objects, relations };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "objetos_relacionais.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Importa JSON
function importFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.objects || !data.relations) throw new Error("JSON inválido");
      objects = data.objects;
      relations = data.relations;
      counter = Object.keys(objects).length
        ? Math.max(...Object.keys(objects).map(k => parseInt(k.replace("obj", "")))) + 1
        : 0;
      
      Array.from(workspace.children).forEach((child) => {
        if (child.id !== "connections") child.remove();
      });

      for (let id in objects) {
        const obj = objects[id];
        const box = document.createElement("div");
        box.className = "object";
        box.id = id;
        box.style.left = obj.left + "px";
        box.style.top = obj.top + "px";
        const nameEl = document.createElement("div");
        nameEl.className = "name";
        nameEl.textContent = obj.name;
        box.appendChild(nameEl);
        addInfoIcon(box, id);
        makeDraggable(box);
        applyCategoryStyle(box, obj.category);
        workspace.appendChild(box);
      }
      updateSelects();
      updateConnectionSelect();
      drawConnections();
      unsavedChanges.clear();
    } catch (err) {
      alert("Erro ao importar JSON: " + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = null;
}

popup.addEventListener("click", (e) => {
  if (e.target === popup) closePopup();
});

window.addEventListener("resize", drawConnections);

// Ao clicar na overview, atualiza o scroll do canvas para centralizar o ponto clicado
document.getElementById("overview").addEventListener("click", function(e) {
  if (e.target.id === "overviewViewport") return;
  const overviewEl = this;
  const rect = overviewEl.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const wsWidth = workspace.clientWidth;
  const wsHeight = workspace.clientHeight;
  const ovWidth = overviewEl.clientWidth;
  const ovHeight = overviewEl.clientHeight;
  const scaleFactor = Math.min(ovWidth / wsWidth, ovHeight / wsHeight);
  const targetX = clickX / scaleFactor;
  const targetY = clickY / scaleFactor;
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;
  canvas.scrollLeft = targetX - canvasWidth / 2;
  canvas.scrollTop = targetY - canvasHeight / 2;
  updateOverviewViewport();
});

// Inicializa a interface
updateSelects();
updateConnectionSelect();
drawConnections();
