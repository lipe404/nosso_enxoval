class EnxovalApp {
  constructor() {
    this.rooms = [];
    this.items = [];
    this.selectedRoom = null;
    this.selectedItem = null;
    this.currentView = "floor-plan";
    this.projectName = "";
    this.scale = 10; // pixels per cm

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateRoomFilter();
    this.renderFloorPlan();
    this.renderItemsList();
  }

  bindEvents() {
    // Header buttons
    document
      .getElementById("new-project-btn")
      .addEventListener("click", () => this.newProject());
    document
      .getElementById("save-project-btn")
      .addEventListener("click", () => this.saveProject());
    document
      .getElementById("load-project-btn")
      .addEventListener("click", () => this.showLoadModal());

    // Sidebar buttons
    document
      .getElementById("add-room-btn")
      .addEventListener("click", () => this.showRoomModal());
    document
      .getElementById("add-item-btn")
      .addEventListener("click", () => this.showItemModal());

    // View controls
    document
      .getElementById("floor-plan-view")
      .addEventListener("click", () => this.switchView("floor-plan"));
    document
      .getElementById("list-view")
      .addEventListener("click", () => this.switchView("list"));

    // Filters
    document
      .getElementById("category-filter")
      .addEventListener("change", () => this.filterItems());
    document
      .getElementById("room-filter")
      .addEventListener("change", () => this.filterItems());

    // Room modal
    document
      .getElementById("room-form")
      .addEventListener("submit", (e) => this.saveRoom(e));
    document
      .getElementById("cancel-room")
      .addEventListener("click", () => this.hideRoomModal());

    // Item modal
    document
      .getElementById("item-form")
      .addEventListener("submit", (e) => this.saveItem(e));
    document
      .getElementById("cancel-item")
      .addEventListener("click", () => this.hideItemModal());
    document
      .getElementById("item-image")
      .addEventListener("change", (e) => this.previewImage(e));

    // Load modal
    document
      .getElementById("load-file-btn")
      .addEventListener("click", () => this.loadProjectFromFile());

    // Modal close buttons
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.target.closest(".modal").style.display = "none";
      });
    });

    // Close modals on outside click
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });
    });
  }

  // Project Management
  newProject() {
    if (
      confirm("Criar novo projeto? Todos os dados não salvos serão perdidos.")
    ) {
      this.rooms = [];
      this.items = [];
      this.selectedRoom = null;
      this.selectedItem = null;
      this.projectName = "";
      this.renderAll();
      this.showNotification("Novo projeto criado!", "success");
    }
  }

  async saveProject() {
    const name = prompt("Nome do projeto:", this.projectName || "Meu Enxoval");
    if (!name) return;

    this.projectName = name;

    const projectData = {
      project_name: name,
      rooms: this.rooms,
      items: this.items,
      settings: {
        scale: this.scale,
        currentView: this.currentView,
      },
    };

    try {
      const response = await fetch("/api/save_project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification(`Projeto salvo: ${result.filename}`, "success");
      } else {
        this.showNotification(`Erro ao salvar: ${result.error}`, "error");
      }
    } catch (error) {
      this.showNotification(`Erro ao salvar: ${error.message}`, "error");
    }
  }

  showLoadModal() {
    document.getElementById("load-modal").style.display = "block";
    this.loadSavedProjects();
  }

  async loadSavedProjects() {
    try {
      const response = await fetch("/api/list_projects");
      const result = await response.json();

      if (result.success) {
        const container = document.getElementById("saved-projects");
        container.innerHTML = "";

        if (result.projects.length === 0) {
          container.innerHTML =
            '<p class="text-muted">Nenhum projeto salvo encontrado.</p>';
          return;
        }

        result.projects.forEach((project) => {
          const projectEl = document.createElement("div");
          projectEl.className = "saved-project";
          projectEl.innerHTML = `
                        <h5>${project.name}</h5>
                        <p>Criado em: ${new Date(
                          project.created_at
                        ).toLocaleString("pt-BR")}</p>
                        <p>Tamanho: ${(project.size / 1024).toFixed(1)} KB</p>
                    `;
          projectEl.addEventListener("click", () =>
            this.loadSavedProject(project.filename)
          );
          container.appendChild(projectEl);
        });
      }
    } catch (error) {
      this.showNotification(
        `Erro ao carregar projetos: ${error.message}`,
        "error"
      );
    }
  }

  async loadSavedProject(filename) {
    try {
      const response = await fetch(`/projects/${filename}`);
      const projectData = await response.json();

      this.loadProjectData(projectData.data || projectData);
      document.getElementById("load-modal").style.display = "none";
      this.showNotification("Projeto carregado com sucesso!", "success");
    } catch (error) {
      this.showNotification(
        `Erro ao carregar projeto: ${error.message}`,
        "error"
      );
    }
  }

  async loadProjectFromFile() {
    const fileInput = document.getElementById("project-file");
    const file = fileInput.files[0];

    if (!file) {
      this.showNotification("Selecione um arquivo de projeto", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/load_project", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        this.loadProjectData(result.data);
        document.getElementById("load-modal").style.display = "none";
        this.showNotification("Projeto carregado com sucesso!", "success");
      } else {
        this.showNotification(`Erro ao carregar: ${result.error}`, "error");
      }
    } catch (error) {
      this.showNotification(`Erro ao carregar: ${error.message}`, "error");
    }
  }

  loadProjectData(data) {
    this.rooms = data.rooms || [];
    this.items = data.items || [];
    this.projectName = data.project_name || "";

    if (data.settings) {
      this.scale = data.settings.scale || 10;
      this.currentView = data.settings.currentView || "floor-plan";
    }

    this.selectedRoom = null;
    this.selectedItem = null;
    this.renderAll();
  }

  // Room Management
  showRoomModal(room = null) {
    const modal = document.getElementById("room-modal");
    const title = document.getElementById("room-modal-title");
    const form = document.getElementById("room-form");

    if (room) {
      title.textContent = "Editar Cômodo";
      document.getElementById("room-name").value = room.name;
      document.getElementById("room-width").value = room.width;
      document.getElementById("room-height").value = room.height;
      document.getElementById("room-color").value = room.color;
      form.dataset.roomId = room.id;
    } else {
      title.textContent = "Adicionar Cômodo";
      form.reset();
      delete form.dataset.roomId;
    }

    modal.style.display = "block";
  }

  hideRoomModal() {
    document.getElementById("room-modal").style.display = "none";
  }

  saveRoom(e) {
    e.preventDefault();

    const form = e.target;
    const roomData = {
      id: form.dataset.roomId || this.generateId(),
      name: document.getElementById("room-name").value,
      width: parseFloat(document.getElementById("room-width").value),
      height: parseFloat(document.getElementById("room-height").value),
      color: document.getElementById("room-color").value,
      x: 50,
      y: 50,
    };

    if (form.dataset.roomId) {
      // Edit existing room
      const index = this.rooms.findIndex((r) => r.id === form.dataset.roomId);
      if (index !== -1) {
        // Preserve position
        roomData.x = this.rooms[index].x;
        roomData.y = this.rooms[index].y;
        this.rooms[index] = roomData;
      }
    } else {
      // Add new room
      this.rooms.push(roomData);
    }

    this.hideRoomModal();
    this.renderAll();
    this.showNotification("Cômodo salvo com sucesso!", "success");
  }

  deleteRoom(roomId) {
    if (
      confirm(
        "Tem certeza que deseja excluir este cômodo? Todos os itens associados também serão removidos."
      )
    ) {
      this.rooms = this.rooms.filter((r) => r.id !== roomId);
      this.items = this.items.filter((i) => i.roomId !== roomId);

      if (this.selectedRoom && this.selectedRoom.id === roomId) {
        this.selectedRoom = null;
      }

      this.renderAll();
      this.showNotification("Cômodo excluído com sucesso!", "success");
    }
  }

  // Item Management
  showItemModal(item = null) {
    const modal = document.getElementById("item-modal");
    const title = document.getElementById("item-modal-title");
    const form = document.getElementById("item-form");

    // Update room options
    this.updateItemRoomOptions();

    if (item) {
      title.textContent = "Editar Item";
      document.getElementById("item-name").value = item.name;
      document.getElementById("item-category").value = item.category;
      document.getElementById("item-room").value = item.roomId;
      document.getElementById("item-width").value = item.width || "";
      document.getElementById("item-height").value = item.height || "";
      document.getElementById("item-price").value = item.price || "";
      document.getElementById("item-link").value = item.link || "";
      document.getElementById("item-description").value =
        item.description || "";

      if (item.image) {
        this.showImagePreview(item.image);
      }

      form.dataset.itemId = item.id;
    } else {
      title.textContent = "Adicionar Item";
      form.reset();
      document.getElementById("image-preview").innerHTML = "";
      delete form.dataset.itemId;

      // Pre-select current room if any
      if (this.selectedRoom) {
        document.getElementById("item-room").value = this.selectedRoom.id;
      }
    }

    modal.style.display = "block";
  }

  hideItemModal() {
    document.getElementById("item-modal").style.display = "none";
  }

  updateItemRoomOptions() {
    const select = document.getElementById("item-room");
    select.innerHTML = '<option value="">Selecione...</option>';

    this.rooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = room.name;
      select.appendChild(option);
    });
  }

  async saveItem(e) {
    e.preventDefault();

    const form = e.target;
    const fileInput = document.getElementById("item-image");
    let imageUrl = "";

    // Upload image if selected
    if (fileInput.files[0]) {
      imageUrl = await this.uploadImage(fileInput.files[0]);
      if (!imageUrl) return; // Upload failed
    } else if (form.dataset.itemId) {
      // Keep existing image for edits
      const existingItem = this.items.find((i) => i.id === form.dataset.itemId);
      imageUrl = existingItem ? existingItem.image : "";
    }

    const itemData = {
      id: form.dataset.itemId || this.generateId(),
      name: document.getElementById("item-name").value,
      category: document.getElementById("item-category").value,
      roomId: document.getElementById("item-room").value,
      width: parseFloat(document.getElementById("item-width").value) || 50,
      height: parseFloat(document.getElementById("item-height").value) || 50,
      price: parseFloat(document.getElementById("item-price").value) || 0,
      link: document.getElementById("item-link").value,
      description: document.getElementById("item-description").value,
      image: imageUrl,
      x: 10,
      y: 10,
    };

    if (form.dataset.itemId) {
      // Edit existing item
      const index = this.items.findIndex((i) => i.id === form.dataset.itemId);
      if (index !== -1) {
        // Preserve position
        itemData.x = this.items[index].x;
        itemData.y = this.items[index].y;
        this.items[index] = itemData;
      }
    } else {
      // Add new item
      this.items.push(itemData);
    }

    this.hideItemModal();
    this.renderAll();
    this.showNotification("Item salvo com sucesso!", "success");
  }

  deleteItem(itemId) {
    if (confirm("Tem certeza que deseja excluir este item?")) {
      this.items = this.items.filter((i) => i.id !== itemId);

      if (this.selectedItem && this.selectedItem.id === itemId) {
        this.selectedItem = null;
      }

      this.renderAll();
      this.showNotification("Item excluído com sucesso!", "success");
    }
  }

  async uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload_image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        this.showImagePreview(result.image_url);
        return result.image_url;
      } else {
        this.showNotification(`Erro ao fazer upload: ${result.error}`, "error");
        return null;
      }
    } catch (error) {
      this.showNotification(`Erro ao fazer upload: ${error.message}`, "error");
      return null;
    }
  }

  previewImage(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.showImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  showImagePreview(src) {
    const preview = document.getElementById("image-preview");
    preview.innerHTML = `<img src="${src}" alt="Preview">`;
  }

  // View Management
  switchView(view) {
    this.currentView = view;

    // Update button states
    document.querySelectorAll(".view-controls .btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.getElementById(`${view}-view`).classList.add("active");

    // Show/hide containers
    document.getElementById("floor-plan-container").style.display =
      view === "floor-plan" ? "block" : "none";
    document.getElementById("list-container").style.display =
      view === "list" ? "block" : "none";

    if (view === "list") {
      this.renderItemsGrid();
    }
  }

  // Filtering
  filterItems() {
    const categoryFilter = document.getElementById("category-filter").value;
    const roomFilter = document.getElementById("room-filter").value;

    this.renderItemsList(categoryFilter, roomFilter);

    if (this.currentView === "list") {
      this.renderItemsGrid(categoryFilter, roomFilter);
    }
  }

  updateRoomFilter() {
    const select = document.getElementById("room-filter");
    select.innerHTML = '<option value="">Todos os cômodos</option>';

    this.rooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = room.name;
      select.appendChild(option);
    });
  }

  // Rendering
  renderAll() {
    this.renderRoomsList();
    this.renderItemsList();
    this.renderFloorPlan();
    this.updateRoomFilter();

    if (this.currentView === "list") {
      this.renderItemsGrid();
    }
  }

  renderRoomsList() {
    const container = document.getElementById("rooms-list");
    container.innerHTML = "";

    this.rooms.forEach((room) => {
      const roomEl = document.createElement("div");
      roomEl.className = "room-item";
      if (this.selectedRoom && this.selectedRoom.id === room.id) {
        roomEl.classList.add("active");
      }

      roomEl.innerHTML = `
                <h4>${room.name}</h4>
                <p>${room.width}m × ${room.height}m</p>
                <div class="item-actions">
                    <button class="btn btn-outline btn-edit" data-room-id="${room.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-delete" data-room-id="${room.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

      roomEl.addEventListener("click", (e) => {
        if (!e.target.closest(".item-actions")) {
          this.selectRoom(room);
        }
      });

      roomEl.querySelector(".btn-edit").addEventListener("click", (e) => {
        e.stopPropagation();
        this.showRoomModal(room);
      });

      roomEl.querySelector(".btn-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteRoom(room.id);
      });

      container.appendChild(roomEl);
    });
  }

  renderItemsList(categoryFilter = "", roomFilter = "") {
    const container = document.getElementById("items-list");
    container.innerHTML = "";

    let filteredItems = this.items;

    if (categoryFilter) {
      filteredItems = filteredItems.filter(
        (item) => item.category === categoryFilter
      );
    }

    if (roomFilter) {
      filteredItems = filteredItems.filter(
        (item) => item.roomId === roomFilter
      );
    }

    filteredItems.forEach((item) => {
      const room = this.rooms.find((r) => r.id === item.roomId);
      const itemEl = document.createElement("div");
      itemEl.className = "item-item";

      itemEl.innerHTML = `
                <h4>${item.name}</h4>
                <p>${this.getCategoryName(item.category)} - ${
        room ? room.name : "Sem cômodo"
      }</p>
                ${
                  item.price
                    ? `<p class="item-price">R$ ${item.price.toFixed(2)}</p>`
                    : ""
                }
                <div class="item-actions">
                    <button class="btn btn-outline btn-edit" data-item-id="${
                      item.id
                    }">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-delete" data-item-id="${
                      item.id
                    }">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${
                      item.link
                        ? `<a href="${item.link}"  class="btn btn-info">
                        <i class="fas fa-external-link-alt"></i>
                    </a>`
                        : ""
                    }
                </div>
            `;

      itemEl.addEventListener("click", (e) => {
        if (!e.target.closest(".item-actions")) {
          this.selectItem(item);
        }
      });

      itemEl.querySelector(".btn-edit").addEventListener("click", (e) => {
        e.stopPropagation();
        this.showItemModal(item);
      });

      itemEl.querySelector(".btn-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteItem(item.id);
      });

      container.appendChild(itemEl);
    });
  }

  renderFloorPlan() {
    const container = document.getElementById("floor-plan");

    // Clear existing content
    container.innerHTML = "";

    if (this.rooms.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-home"></i>
                    <h3>Comece criando um cômodo</h3>
                    <p>Adicione cômodos para começar a planejar seu enxoval</p>
                </div>
            `;
      return;
    }

    // Render rooms
    this.rooms.forEach((room) => {
      this.renderRoom(room, container);
    });
  }

  renderRoom(room, container) {
    const roomEl = document.createElement("div");
    roomEl.className = "room-element";
    roomEl.dataset.roomId = room.id;

    if (this.selectedRoom && this.selectedRoom.id === room.id) {
      roomEl.classList.add("selected");
    }

    // Calculate size in pixels
    const widthPx = room.width * this.scale;
    const heightPx = room.height * this.scale;

    roomEl.style.left = `${room.x}px`;
    roomEl.style.top = `${room.y}px`;
    roomEl.style.width = `${widthPx}px`;
    roomEl.style.height = `${heightPx}px`;
    roomEl.style.backgroundColor = room.color;

    roomEl.innerHTML = `
            <div class="room-title">${room.name}</div>
            <div class="room-dimensions">${room.width}m × ${room.height}m</div>
        `;

    // Make room draggable
    this.makeDraggable(roomEl, (x, y) => {
      room.x = x;
      room.y = y;
    });

    roomEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectRoom(room);
    });

    container.appendChild(roomEl);

    // Render items in this room
    this.items
      .filter((item) => item.roomId === room.id)
      .forEach((item) => {
        this.renderItem(item, roomEl);
      });
  }

  renderItem(item, roomEl) {
    const itemEl = document.createElement("div");
    itemEl.className = "item-element";
    itemEl.dataset.itemId = item.id;

    if (this.selectedItem && this.selectedItem.id === item.id) {
      itemEl.classList.add("selected");
    }

    // Calculate size in pixels (items are in cm)
    const widthPx = (item.width / 100) * this.scale;
    const heightPx = (item.height / 100) * this.scale;

    itemEl.style.left = `${item.x}px`;
    itemEl.style.top = `${item.y}px`;
    itemEl.style.width = `${widthPx}px`;
    itemEl.style.height = `${heightPx}px`;

    // Truncate name if too long
    const displayName =
      item.name.length > 10 ? item.name.substring(0, 10) + "..." : item.name;
    itemEl.textContent = displayName;
    itemEl.title = item.name;

    // Make item draggable within room
    this.makeDraggable(itemEl, (x, y) => {
      // Constrain to room bounds
      const roomRect = roomEl.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();

      const maxX = roomRect.width - itemRect.width;
      const maxY = roomRect.height - itemRect.height;

      item.x = Math.max(0, Math.min(x, maxX));
      item.y = Math.max(0, Math.min(y, maxY));

      itemEl.style.left = `${item.x}px`;
      itemEl.style.top = `${item.y}px`;
    });

    itemEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectItem(item);
    });

    roomEl.appendChild(itemEl);
  }

  renderItemsGrid(categoryFilter = "", roomFilter = "") {
    const container = document.getElementById("items-grid");
    container.innerHTML = "";

    let filteredItems = this.items;

    if (categoryFilter) {
      filteredItems = filteredItems.filter(
        (item) => item.category === categoryFilter
      );
    }

    if (roomFilter) {
      filteredItems = filteredItems.filter(
        (item) => item.roomId === roomFilter
      );
    }

    filteredItems.forEach((item) => {
      const room = this.rooms.find((r) => r.id === item.roomId);
      const cardEl = document.createElement("div");
      cardEl.className = "item-card";

      cardEl.innerHTML = `
                <div class="item-card-header">
                    <h3>${item.name}</h3>
                    <span class="item-category">${this.getCategoryName(
                      item.category
                    )}</span>
                </div>
                ${
                  item.image
                    ? `<img src="${item.image}" alt="${item.name}" class="item-image">`
                    : ""
                }
                <div class="item-details">
                    <p><strong>Cômodo:</strong> ${
                      room ? room.name : "Não definido"
                    }</p>
                    ${
                      item.width && item.height
                        ? `<p><strong>Dimensões:</strong> ${item.width}cm × ${item.height}cm</p>`
                        : ""
                    }
                    ${
                      item.description
                        ? `<p><strong>Descrição:</strong> ${item.description}</p>`
                        : ""
                    }
                    ${
                      item.price
                        ? `<div class="item-price">R$ ${item.price.toFixed(
                            2
                          )}</div>`
                        : ""
                    }
                </div>
                <div class="item-actions">
                    <button class="btn btn-outline btn-edit" data-item-id="${
                      item.id
                    }">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-delete" data-item-id="${
                      item.id
                    }">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                    ${
                      item.link
                        ? `<a href="${item.link}"  class="btn btn-info">
                        <i class="fas fa-external-link-alt"></i> Comprar
                    </a>`
                        : ""
                    }
                </div>
            `;

      cardEl.querySelector(".btn-edit").addEventListener("click", () => {
        this.showItemModal(item);
      });

      cardEl.querySelector(".btn-delete").addEventListener("click", () => {
        this.deleteItem(item.id);
      });

      container.appendChild(cardEl);
    });
  }

  // Selection
  selectRoom(room) {
    this.selectedRoom = room;
    this.selectedItem = null;
    this.renderRoomsList();
    this.renderFloorPlan();
  }

  selectItem(item) {
    this.selectedItem = item;
    this.renderFloorPlan();
  }

  // Drag and Drop
  makeDraggable(element, onMove) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    element.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 0;
      startTop = parseInt(element.style.top) || 0;

      element.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newX = startLeft + deltaX;
      const newY = startTop + deltaY;

      onMove(newX, newY);
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = "move";
      }
    });

    element.style.cursor = "move";
  }

  // Utilities
  generateId() {
    return "id_" + Math.random().toString(36).substr(2, 9);
  }

  getCategoryName(category) {
    const categories = {
      moveis: "Móveis",
      eletrodomesticos: "Eletrodomésticos",
      utensilios: "Utensílios",
      decoracao: "Decoração",
      outros: "Outros",
    };
    return categories[category] || category;
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new EnxovalApp();
});
