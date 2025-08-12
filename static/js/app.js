class EnxovalApp {
  constructor() {
    this.rooms = [];
    this.items = [];
    this.selectedRoom = null;
    this.selectedItem = null;
    this.currentView = "floor-plan";
    this.projectName = "";
    this.scale = 10; // pixels per cm
    this.selectedIcon = "fas fa-cube";
    this.searchTerm = "";
    this.isResizing = false;
    this.resizeData = null;

    // Icon categories
    this.iconCategories = {
      furniture: [
        "fas fa-couch", "fas fa-bed", "fas fa-chair", "fas fa-table",
        "fas fa-desk", "fas fa-dresser", "fas fa-bookshelf", "fas fa-wardrobe"
      ],
      appliances: [
        "fas fa-tv", "fas fa-microwave", "fas fa-blender", "fas fa-coffee-maker",
        "fas fa-washing-machine", "fas fa-refrigerator", "fas fa-oven", "fas fa-dishwasher"
      ],
      kitchen: [
        "fas fa-utensils", "fas fa-plate", "fas fa-glass", "fas fa-mug",
        "fas fa-wine-glass", "fas fa-cocktail", "fas fa-pot", "fas fa-pan"
      ],
      decoration: [
        "fas fa-picture-frame", "fas fa-lamp", "fas fa-candle", "fas fa-flower",
        "fas fa-mirror", "fas fa-clock", "fas fa-trophy", "fas fa-star"
      ],
      general: [
        "fas fa-cube", "fas fa-box", "fas fa-gift", "fas fa-heart",
        "fas fa-home", "fas fa-key", "fas fa-tools", "fas fa-cog"
      ]
    };

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
    document.getElementById("new-project-btn").addEventListener("click", () => this.newProject());
    document.getElementById("save-project-btn").addEventListener("click", () => this.saveProject());
    document.getElementById("load-project-btn").addEventListener("click", () => this.showLoadModal());

    // Sidebar buttons
    document.getElementById("add-room-btn").addEventListener("click", () => this.showRoomModal());
    document.getElementById("add-item-btn").addEventListener("click", () => this.showItemModal());

    // View controls
    document.getElementById("floor-plan-view").addEventListener("click", () => this.switchView("floor-plan"));
    document.getElementById("list-view").addEventListener("click", () => this.switchView("list"));
    document.getElementById("accounts-view").addEventListener("click", () => this.switchView("accounts"));

    // Sidebar filters
    document.getElementById("category-filter").addEventListener("change", () => this.filterItems());
    document.getElementById("room-filter").addEventListener("change", () => this.filterItems());
    document.getElementById("priority-filter").addEventListener("change", () => this.filterItems());
    document.getElementById("status-filter").addEventListener("change", () => this.filterItems());

    // List view controls
    document.getElementById("search-input").addEventListener("input", (e) => this.handleSearch(e));
    document.getElementById("clear-search").addEventListener("click", () => this.clearSearch());
    document.getElementById("list-category-filter").addEventListener("change", () => this.filterListItems());
    document.getElementById("list-room-filter").addEventListener("change", () => this.filterListItems());
    document.getElementById("list-priority-filter").addEventListener("change", () => this.filterListItems());
    document.getElementById("list-status-filter").addEventListener("change", () => this.filterListItems());
    document.getElementById("sort-filter").addEventListener("change", () => this.filterListItems());

    // Room modal
    document.getElementById("room-form").addEventListener("submit", (e) => this.saveRoom(e));
    document.getElementById("cancel-room").addEventListener("click", () => this.hideRoomModal());

    // Item modal
    document.getElementById("item-form").addEventListener("submit", (e) => this.saveItem(e));
    document.getElementById("cancel-item").addEventListener("click", () => this.hideItemModal());
    document.getElementById("item-image").addEventListener("change", (e) => this.previewImage(e));

    // Icon selection
    document.getElementById("choose-icon-btn").addEventListener("click", () => this.showIconModal());
    document.getElementById("cancel-icon").addEventListener("click", () => this.hideIconModal());

    // Purchase links
    document.getElementById("add-link-btn").addEventListener("click", () => this.addPurchaseLink());

    // Load modal
    document.getElementById("load-file-btn").addEventListener("click", () => this.loadProjectFromFile());

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

    // Global resize events
    document.addEventListener("mousemove", (e) => this.handleGlobalMouseMove(e));
    document.addEventListener("mouseup", () => this.handleGlobalMouseUp());
  }

  // Search functionality
  handleSearch(e) {
    this.searchTerm = e.target.value.toLowerCase();
    const clearBtn = document.getElementById("clear-search");

    if (this.searchTerm) {
      clearBtn.style.display = "block";
    } else {
      clearBtn.style.display = "none";
    }

    if (this.currentView === "list") {
      this.filterListItems();
    }
  }

  clearSearch() {
    document.getElementById("search-input").value = "";
    document.getElementById("clear-search").style.display = "none";
    this.searchTerm = "";

    if (this.currentView === "list") {
      this.filterListItems();
    }
  }

  highlightSearchTerm(text, term) {
    if (!term) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  // Room resizing functionality
  addResizeHandles(roomEl) {
    const handles = [
      'nw', 'n', 'ne',
      'w', 'e',
      'sw', 's', 'se'
    ];

    handles.forEach(direction => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-${direction}`;
      handle.addEventListener('mousedown', (e) => this.startResize(e, roomEl, direction));
      roomEl.appendChild(handle);
    });
  }

  startResize(e, roomEl, direction) {
    e.preventDefault();
    e.stopPropagation();

    this.isResizing = true;
    roomEl.classList.add('resizing');

    const room = this.rooms.find(r => r.id === roomEl.dataset.roomId);
    const rect = roomEl.getBoundingClientRect();

    this.resizeData = {
      room,
      roomEl,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: room.width,
      startHeight: room.height,
      startLeft: room.x,
      startTop: room.y
    };
  }

  handleGlobalMouseMove(e) {
    if (!this.isResizing || !this.resizeData) return;

    const { room, roomEl, direction, startX, startY, startWidth, startHeight, startLeft, startTop } = this.resizeData;

    const deltaX = (e.clientX - startX) / this.scale;
    const deltaY = (e.clientY - startY) / this.scale;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newX = startLeft;
    let newY = startTop;

    // Calculate new dimensions based on resize direction
    if (direction.includes('e')) {
      newWidth = Math.max(1, startWidth + deltaX);
    }
    if (direction.includes('w')) {
      newWidth = Math.max(1, startWidth - deltaX);
      newX = startLeft + (startWidth - newWidth) * this.scale;
    }
    if (direction.includes('s')) {
      newHeight = Math.max(1, startHeight + deltaY);
    }
    if (direction.includes('n')) {
      newHeight = Math.max(1, startHeight - deltaY);
      newY = startTop + (startHeight - newHeight) * this.scale;
    }

    // Update room data
    room.width = Math.round(newWidth * 10) / 10;
    room.height = Math.round(newHeight * 10) / 10;
    room.x = newX;
    room.y = newY;

    // Update visual representation
    const widthPx = room.width * this.scale;
    const heightPx = room.height * this.scale;

    roomEl.style.width = `${widthPx}px`;
    roomEl.style.height = `${heightPx}px`;
    roomEl.style.left = `${room.x}px`;
    roomEl.style.top = `${room.y}px`;

    // Update room dimensions display
    roomEl.querySelector('.room-dimensions').textContent = `${room.width}m × ${room.height}m`;

    // Reposition items within the room to maintain relative positions
    this.repositionItemsInRoom(room, roomEl);
  }

  handleGlobalMouseUp() {
    if (this.isResizing && this.resizeData) {
      this.resizeData.roomEl.classList.remove('resizing');
      this.isResizing = false;
      this.resizeData = null;

      // Update sidebar display
      this.renderRoomsList();
    }
  }

  repositionItemsInRoom(room, roomEl) {
    const roomItems = this.items.filter(item => item.roomId === room.id);
    const roomRect = roomEl.getBoundingClientRect();

    roomItems.forEach(item => {
      const itemEl = roomEl.querySelector(`[data-item-id="${item.id}"]`);
      if (itemEl) {
        const itemWidth = (item.width / 100) * this.scale;
        const itemHeight = (item.height / 100) * this.scale;

        // Constrain item position to new room bounds
        const maxX = roomRect.width - itemWidth;
        const maxY = roomRect.height - itemHeight;

        item.x = Math.max(0, Math.min(item.x, maxX));
        item.y = Math.max(0, Math.min(item.y, maxY));

        itemEl.style.left = `${item.x}px`;
        itemEl.style.top = `${item.y}px`;
      }
    });
  }

  // Enhanced filtering for list view
  filterListItems() {
    if (this.currentView !== "list") return;

    const categoryFilter = document.getElementById("list-category-filter").value;
    const roomFilter = document.getElementById("list-room-filter").value;
    const priorityFilter = document.getElementById("list-priority-filter").value;
    const statusFilter = document.getElementById("list-status-filter").value;
    const sortFilter = document.getElementById("sort-filter").value;

    let filteredItems = this.items.slice();

    // Apply filters
    if (categoryFilter) {
      filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }

    if (roomFilter) {
      filteredItems = filteredItems.filter(item => item.roomId === roomFilter);
    }

    if (priorityFilter) {
      filteredItems = filteredItems.filter(item => item.priority === priorityFilter);
    }

    if (statusFilter) {
      filteredItems = filteredItems.filter(item => item.status === statusFilter);
    }

    // Apply search
    if (this.searchTerm) {
      filteredItems = filteredItems.filter(item => {
        const searchableText = [
          item.name,
          item.description || '',
          this.getCategoryName(item.category),
          this.getPriorityName(item.priority),
          this.getStatusName(item.status)
        ].join(' ').toLowerCase();

        return searchableText.includes(this.searchTerm);
      });
    }

    // Apply sorting
    filteredItems.sort((a, b) => {
      switch (sortFilter) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'priority':
          const priorityOrder = { basico: 0, necessario: 1, util: 2, luxo: 3 };
          return priorityOrder[a.priority || 'necessario'] - priorityOrder[b.priority || 'necessario'];
        case 'status':
          return a.status === 'comprado' ? 1 : -1;
        case 'room':
          const roomA = this.rooms.find(r => r.id === a.roomId)?.name || '';
          const roomB = this.rooms.find(r => r.id === b.roomId)?.name || '';
          return roomA.localeCompare(roomB);
        default:
          return 0;
      }
    });

    // Update stats
    this.updateListStats(filteredItems);

    // Render filtered items
    this.renderFilteredItemsGrid(filteredItems);
  }

  updateListStats(filteredItems) {
    const count = filteredItems.length;
    const total = filteredItems.reduce((sum, item) => sum + (item.price || 0), 0);

    document.getElementById("items-count").textContent = `${count} ${count === 1 ? 'item encontrado' : 'itens encontrados'}`;
    document.getElementById("items-total-value").textContent = `Total: R$ ${total.toFixed(2)}`;
  }

  updateListRoomFilter() {
    const select = document.getElementById("list-room-filter");
    select.innerHTML = '<option value="">Todos os cômodos</option>';

    this.rooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = room.name;
      select.appendChild(option);
    });
  }

  renderFilteredItemsGrid(filteredItems) {
    const container = document.getElementById("items-grid");
    container.innerHTML = "";

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-search"></i>
          <h3>Nenhum item encontrado</h3>
          <p>Tente ajustar os filtros ou termo de pesquisa</p>
        </div>
      `;
      return;
    }

    filteredItems.forEach((item) => {
      const room = this.rooms.find((r) => r.id === item.roomId);
      const cardEl = document.createElement("div");
      cardEl.className = "item-card";

      const priorityBadge = this.getPriorityBadge(item.priority);
      const statusBadge = this.getStatusBadge(item.status);
      const purchaseLinksHtml = this.renderPurchaseLinksInCard(item.purchaseLinks);

      // Highlight search terms
      const highlightedName = this.highlightSearchTerm(item.name, this.searchTerm);
      const highlightedDescription = item.description ?
        this.highlightSearchTerm(item.description, this.searchTerm) : '';

      cardEl.innerHTML = `
        <div class="item-card-header">
          <h3>${highlightedName}</h3>
          <span class="item-category">${this.getCategoryName(item.category)}</span>
        </div>
        <div class="mb-1">
          ${priorityBadge}
          ${statusBadge}
        </div>
        ${item.image ? `<img src="${item.image}" alt="${item.name}" class="item-image">` : ""}
        <div class="item-details">
          <p><strong>Cômodo:</strong> ${room ? room.name : "Não definido"}</p>
          ${item.width && item.height ? `<p><strong>Dimensões:</strong> ${item.width}cm × ${item.height}cm</p>` : ""}
          ${highlightedDescription ? `<p><strong>Descrição:</strong> ${highlightedDescription}</p>` : ""}
          ${item.price ? `<div class="item-price">R$ ${item.price.toFixed(2)}</div>` : ""}
        </div>
        <div class="item-actions">
          <button class="btn btn-outline btn-edit" data-item-id="${item.id}">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger btn-delete" data-item-id="${item.id}">
            <i class="fas fa-trash"></i> Excluir
          </button>
          ${purchaseLinksHtml}
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

  // Icon Management
  showIconModal() {
    document.getElementById("icon-modal").style.display = "block";
    this.renderIconCategories();
    this.renderIconGrid("furniture");
  }

  hideIconModal() {
    document.getElementById("icon-modal").style.display = "none";
  }

  renderIconCategories() {
    const container = document.querySelector(".icon-categories");
    container.innerHTML = "";

    const categories = {
      furniture: "Móveis",
      appliances: "Eletrodomésticos",
      kitchen: "Cozinha",
      decoration: "Decoração",
      general: "Geral",
    };

    Object.entries(categories).forEach(([key, name]) => {
      const btn = document.createElement("button");
      btn.className = "icon-category-btn";
      btn.dataset.category = key;
      btn.textContent = name;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".icon-category-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderIconGrid(key);
      });
      container.appendChild(btn);
    });

    container.firstChild.classList.add("active");
  }

  renderIconGrid(category) {
    const container = document.getElementById("icon-grid");
    container.innerHTML = "";

    this.iconCategories[category].forEach((iconClass) => {
      const iconEl = document.createElement("div");
      iconEl.className = "icon-option";
      iconEl.innerHTML = `<i class="${iconClass}"></i>`;
      iconEl.addEventListener("click", () => {
        this.selectedIcon = iconClass;
        document.getElementById("selected-icon").innerHTML = `<i class="${iconClass}"></i>`;
        document.getElementById("item-icon").value = iconClass;
        this.hideIconModal();
      });
      container.appendChild(iconEl);
    });
  }

  // Purchase Links Management
  addPurchaseLink() {
    const container = document.getElementById("purchase-links");
    const linkGroup = document.createElement("div");
    linkGroup.className = "link-group";
    linkGroup.innerHTML = `
      <input type="url" placeholder="https://..." class="purchase-link-input" />
      <input type="text" placeholder="Nome da loja (opcional)" class="store-name-input" />
      <button type="button" class="btn btn-danger remove-link">
        <i class="fas fa-trash"></i>
      </button>
    `;

    linkGroup.querySelector(".remove-link").addEventListener("click", () => {
      linkGroup.remove();
    });

    container.appendChild(linkGroup);
  }

  getPurchaseLinks() {
    const links = [];
    document.querySelectorAll(".link-group").forEach((group) => {
      const url = group.querySelector(".purchase-link-input").value;
      const store = group.querySelector(".store-name-input").value;
      if (url) {
        links.push({ url, store: store || "Link" });
      }
    });
    return links;
  }

  setPurchaseLinks(links) {
    const container = document.getElementById("purchase-links");
    container.innerHTML = "";

    if (!links || links.length === 0) {
      this.addPurchaseLink();
      return;
    }

    links.forEach((link) => {
      const linkGroup = document.createElement("div");
      linkGroup.className = "link-group";
      linkGroup.innerHTML = `
        <input type="url" placeholder="https://..." class="purchase-link-input" value="${link.url}" />
        <input type="text" placeholder="Nome da loja (opcional)" class="store-name-input" value="${link.store || ""}" />
        <button type="button" class="btn btn-danger remove-link">
          <i class="fas fa-trash"></i>
        </button>
      `;

      linkGroup.querySelector(".remove-link").addEventListener("click", () => {
        linkGroup.remove();
      });

      container.appendChild(linkGroup);
    });
  }

  // Project Management
  newProject() {
    if (confirm("Criar novo projeto? Todos os dados não salvos serão perdidos.")) {
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
          container.innerHTML = '<p class="text-muted">Nenhum projeto salvo encontrado.</p>';
          return;
        }

        result.projects.forEach((project) => {
          const projectEl = document.createElement("div");
          projectEl.className = "saved-project";
          projectEl.innerHTML = `
            <h5>${project.name}</h5>
            <p>Criado em: ${new Date(project.created_at).toLocaleString("pt-BR")}</p>
            <p>Tamanho: ${(project.size / 1024).toFixed(1)} KB</p>
          `;
          projectEl.addEventListener("click", () => this.loadSavedProject(project.filename));
          container.appendChild(projectEl);
        });
      }
    } catch (error) {
      this.showNotification(`Erro ao carregar projetos: ${error.message}`, "error");
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
      this.showNotification(`Erro ao carregar projeto: ${error.message}`, "error");
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

    // Migrate old items to new format
    this.items = this.items.map((item) => ({
      ...item,
      priority: item.priority || "necessario",
      status: item.status || "pendente",
      icon: item.icon || "fas fa-cube",
      purchaseLinks: item.purchaseLinks || (item.link ? [{ url: item.link, store: "Link" }] : []),
    }));

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
      const index = this.rooms.findIndex((r) => r.id === form.dataset.roomId);
      if (index !== -1) {
        roomData.x = this.rooms[index].x;
        roomData.y = this.rooms[index].y;
        this.rooms[index] = roomData;
      }
    } else {
      this.rooms.push(roomData);
    }

    this.hideRoomModal();
    this.renderAll();
    this.showNotification("Cômodo salvo com sucesso!", "success");
  }

  deleteRoom(roomId) {
    if (confirm("Tem certeza que deseja excluir este cômodo? Todos os itens associados também serão removidos.")) {
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

    this.updateItemRoomOptions();
    this.initTabNavigation();
    this.setupFileUpload();

    document.querySelector('.tab-btn[data-tab="basic"]').click();

    if (item) {
      title.textContent = "Editar Item";
      document.getElementById("item-name").value = item.name;
      document.getElementById("item-category").value = item.category;
      document.getElementById("item-room").value = item.roomId;
      document.getElementById("item-priority").value = item.priority || "necessario";
      document.getElementById("item-status").value = item.status || "pendente";
      document.getElementById("item-width").value = item.width || "";
      document.getElementById("item-height").value = item.height || "";
      document.getElementById("item-price").value = item.price || "";
      document.getElementById("item-description").value = item.description || "";

      // Set icon
      const iconClass = item.icon || "fas fa-cube";
      document.getElementById("selected-icon").innerHTML = `<i class="${iconClass}"></i>`;
      document.getElementById("item-icon").value = iconClass;

      // Set purchase links
      this.setPurchaseLinks(item.purchaseLinks || []);

      if (item.image) {
        this.showImagePreview(item.image);
      }

      form.dataset.itemId = item.id;
    } else {
      title.textContent = "Adicionar Item";
      form.reset();
      document.getElementById("image-preview").innerHTML = "";
      document.getElementById("selected-icon").innerHTML = '<i class="fas fa-cube"></i>';
      document.getElementById("item-icon").value = "fas fa-cube";
      this.setPurchaseLinks([]);
      delete form.dataset.itemId;

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

    // Validate form before saving
    if (!this.validateForm()) {
      return;
    }

    // Add loading state
    const modal = document.querySelector('.modal-content');
    modal.classList.add('modal-loading');

    const form = e.target;
    const fileInput = document.getElementById("item-image");
    let imageUrl = "";

    if (fileInput.files[0]) {
      imageUrl = await this.uploadImage(fileInput.files[0]);
      if (!imageUrl) return;
    } else if (form.dataset.itemId) {
      const existingItem = this.items.find((i) => i.id === form.dataset.itemId);
      imageUrl = existingItem ? existingItem.image : "";
    }

    const itemData = {
      id: form.dataset.itemId || this.generateId(),
      name: document.getElementById("item-name").value,
      category: document.getElementById("item-category").value,
      roomId: document.getElementById("item-room").value,
      priority: document.getElementById("item-priority").value,
      status: document.getElementById("item-status").value,
      width: parseFloat(document.getElementById("item-width").value) || 50,
      height: parseFloat(document.getElementById("item-height").value) || 50,
      price: parseFloat(document.getElementById("item-price").value) || 0,
      description: document.getElementById("item-description").value,
      image: imageUrl,
      icon: document.getElementById("item-icon").value,
      purchaseLinks: this.getPurchaseLinks(),
      x: 10,
      y: 10,
    };

    if (form.dataset.itemId) {
      const index = this.items.findIndex((i) => i.id === form.dataset.itemId);
      if (index !== -1) {
        itemData.x = this.items[index].x;
        itemData.y = this.items[index].y;
        this.items[index] = itemData;
      }
    } else {
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
    document.getElementById("floor-plan-container").style.display = view === "floor-plan" ? "block" : "none";
    document.getElementById("list-container").style.display = view === "list" ? "block" : "none";
    document.getElementById("accounts-container").style.display = view === "accounts" ? "block" : "none";

    if (view === "list") {
      this.updateListRoomFilter();
      this.filterListItems();
    } else if (view === "accounts") {
      this.renderAccountsView();
    }
  }

  // Filtering
  filterItems() {
    const categoryFilter = document.getElementById("category-filter").value;
    const roomFilter = document.getElementById("room-filter").value;
    const priorityFilter = document.getElementById("priority-filter").value;
    const statusFilter = document.getElementById("status-filter").value;

    this.renderItemsList(categoryFilter, roomFilter, priorityFilter, statusFilter);

    if (this.currentView === "list") {
      this.filterListItems();
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

  // Accounts View
  renderAccountsView() {
    this.calculateFinancialSummary();
    this.renderRoomAccounts();
    this.renderPriorityAccounts();
  }

  calculateFinancialSummary() {
    const total = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
    const purchased = this.items
      .filter((item) => item.status === "comprado")
      .reduce((sum, item) => sum + (item.price || 0), 0);
    const pending = total - purchased;

    document.getElementById("total-amount").textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById("purchased-amount").textContent = `R$ ${purchased.toFixed(2)}`;
    document.getElementById("pending-amount").textContent = `R$ ${pending.toFixed(2)}`;
  }

  renderRoomAccounts() {
    const container = document.getElementById("room-accounts");
    container.innerHTML = "";

    const roomTotals = {};

    this.rooms.forEach((room) => {
      roomTotals[room.id] = {
        name: room.name,
        total: 0,
        purchased: 0,
        pending: 0,
        itemCount: 0,
      };
    });

    this.items.forEach((item) => {
      if (roomTotals[item.roomId]) {
        const price = item.price || 0;
        roomTotals[item.roomId].total += price;
        roomTotals[item.roomId].itemCount++;

        if (item.status === "comprado") {
          roomTotals[item.roomId].purchased += price;
        } else {
          roomTotals[item.roomId].pending += price;
        }
      }
    });

    Object.values(roomTotals).forEach((room) => {
      if (room.itemCount > 0) {
        const roomEl = document.createElement("div");
        roomEl.className = "account-item";
        roomEl.innerHTML = `
          <div class="account-item-header">
            <h4>${room.name}</h4>
            <span class="account-amount">R$ ${room.total.toFixed(2)}</span>
          </div>
          <div class="account-details">
            ${room.itemCount} itens • 
            Comprado: R$ ${room.purchased.toFixed(2)} • 
            Pendente: R$ ${room.pending.toFixed(2)}
          </div>
        `;
        container.appendChild(roomEl);
      }
    });
  }

  renderPriorityAccounts() {
    const container = document.getElementById("priority-accounts");
    container.innerHTML = "";

    const priorityTotals = {
      basico: { name: "🔴 Básico", total: 0, purchased: 0, pending: 0, itemCount: 0 },
      necessario: { name: "🟡 Necessário", total: 0, purchased: 0, pending: 0, itemCount: 0 },
      util: { name: "🟢 Útil", total: 0, purchased: 0, pending: 0, itemCount: 0 },
      luxo: { name: "🔵 Luxo", total: 0, purchased: 0, pending: 0, itemCount: 0 },
    };

    this.items.forEach((item) => {
      const priority = item.priority || "necessario";
      if (priorityTotals[priority]) {
        const price = item.price || 0;
        priorityTotals[priority].total += price;
        priorityTotals[priority].itemCount++;

        if (item.status === "comprado") {
          priorityTotals[priority].purchased += price;
        } else {
          priorityTotals[priority].pending += price;
        }
      }
    });

    Object.values(priorityTotals).forEach((priority) => {
      if (priority.itemCount > 0) {
        const priorityEl = document.createElement("div");
        priorityEl.className = "account-item";
        priorityEl.innerHTML = `
          <div class="account-item-header">
            <h4>${priority.name}</h4>
            <span class="account-amount">R$ ${priority.total.toFixed(2)}</span>
          </div>
          <div class="account-details">
            ${priority.itemCount} itens • 
            Comprado: R$ ${priority.purchased.toFixed(2)} • 
            Pendente: R$ ${priority.pending.toFixed(2)}
          </div>
        `;
        container.appendChild(priorityEl);
      }
    });
  }

  // Rendering
  renderAll() {
    this.renderRoomsList();
    this.renderItemsList();
    this.renderFloorPlan();
    this.updateRoomFilter();
    this.updateListRoomFilter();

    if (this.currentView === "list") {
      this.filterListItems();
    } else if (this.currentView === "accounts") {
      this.renderAccountsView();
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

  renderItemsList(categoryFilter = "", roomFilter = "", priorityFilter = "", statusFilter = "") {
    const container = document.getElementById("items-list");
    container.innerHTML = "";

    let filteredItems = this.items;

    if (categoryFilter) {
      filteredItems = filteredItems.filter((item) => item.category === categoryFilter);
    }

    if (roomFilter) {
      filteredItems = filteredItems.filter((item) => item.roomId === roomFilter);
    }

    if (priorityFilter) {
      filteredItems = filteredItems.filter((item) => item.priority === priorityFilter);
    }

    if (statusFilter) {
      filteredItems = filteredItems.filter((item) => item.status === statusFilter);
    }

    filteredItems.forEach((item) => {
      const room = this.rooms.find((r) => r.id === item.roomId);
      const itemEl = document.createElement("div");
      itemEl.className = "item-item";

      const priorityBadge = this.getPriorityBadge(item.priority);
      const statusBadge = this.getStatusBadge(item.status);

      itemEl.innerHTML = `
        <h4>${item.name}</h4>
        <p>${this.getCategoryName(item.category)} - ${room ? room.name : "Sem cômodo"}</p>
        <div class="mb-1">
          ${priorityBadge}
          ${statusBadge}
        </div>
        ${item.price ? `<p class="item-price">R$ ${item.price.toFixed(2)}</p>` : ""}
        <div class="item-actions">
          <button class="btn btn-outline btn-edit" data-item-id="${item.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-delete" data-item-id="${item.id}">
            <i class="fas fa-trash"></i>
          </button>
          ${this.renderPurchaseLinksButtons(item.purchaseLinks)}
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

  renderPurchaseLinksButtons(links) {
    if (!links || links.length === 0) return "";

    return links
      .map((link) =>
        `<a href="${link.url}" target="_blank" class="btn btn-info" title="${link.store}">
          <i class="fas fa-external-link-alt"></i>
        </a>`
      ).join("");
  }

  renderFloorPlan() {
    const container = document.getElementById("floor-plan");
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

    // Add resize handles
    this.addResizeHandles(roomEl);

    // Make room draggable (but not when resizing)
    this.makeDraggable(roomEl, (x, y) => {
      if (!this.isResizing) {
        room.x = x;
        room.y = y;
      }
    });

    roomEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectRoom(room);
    });

    container.appendChild(roomEl);

    this.items
      .filter((item) => item.roomId === room.id)
      .forEach((item) => {
        this.renderItem(item, roomEl);
      });
  }

  renderItem(item, roomEl) {
    const itemEl = document.createElement("div");
    itemEl.className = `item-element priority-${item.priority || "necessario"} status-${item.status || "pendente"}`;
    itemEl.dataset.itemId = item.id;

    if (this.selectedItem && this.selectedItem.id === item.id) {
      itemEl.classList.add("selected");
    }

    const widthPx = Math.max(30, (item.width / 100) * this.scale);
    const heightPx = Math.max(30, (item.height / 100) * this.scale);

    itemEl.style.left = `${item.x}px`;
    itemEl.style.top = `${item.y}px`;
    itemEl.style.width = `${widthPx}px`;
    itemEl.style.height = `${heightPx}px`;

    // Use icon if available, otherwise use text
    if (item.icon && widthPx >= 30 && heightPx >= 30) {
      itemEl.innerHTML = `<i class="${item.icon}"></i>`;
      itemEl.classList.add("item-element-icon");
    } else {
      const displayName = item.name.length > 10 ? item.name.substring(0, 10) + "..." : item.name;
      itemEl.textContent = displayName;
    }

    itemEl.title = `${item.name} (${this.getPriorityName(item.priority)} - ${this.getStatusName(item.status)})`;

    this.makeDraggable(itemEl, (x, y) => {
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

  renderPurchaseLinksInCard(links) {
    if (!links || links.length === 0) return "";

    return links
      .map((link) =>
        `<a href="${link.url}" target="_blank" class="btn btn-info" title="Comprar em ${link.store}">
          <i class="fas fa-external-link-alt"></i> ${link.store}
        </a>`
      ).join("");
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
      // Don't start dragging if clicking on resize handle
      if (e.target.classList.contains('resize-handle')) {
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 0;
      startTop = parseInt(element.style.top) || 0;

      element.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging || this.isResizing) return;

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

  // Utility Methods
  getPriorityBadge(priority) {
    const badges = {
      basico: '<span class="priority-badge priority-basico">🔴 Básico</span>',
      necessario: '<span class="priority-badge priority-necessario">🟡 Necessário</span>',
      util: '<span class="priority-badge priority-util">🟢 Útil</span>',
      luxo: '<span class="priority-badge priority-luxo">🔵 Luxo</span>',
    };
    return badges[priority] || badges.necessario;
  }

  getStatusBadge(status) {
    const badges = {
      comprado: '<span class="status-badge status-comprado">✅ Comprado</span>',
      pendente: '<span class="status-badge status-pendente">⏳ Pendente</span>',
    };
    return badges[status] || badges.pendente;
  }

  getPriorityName(priority) {
    const names = {
      basico: "Básico",
      necessario: "Necessário",
      util: "Útil",
      luxo: "Luxo",
    };
    return names[priority] || "Necessário";
  }

  getStatusName(status) {
    const names = {
      comprado: "Comprado",
      pendente: "Pendente",
    };
    return names[status] || "Pendente";
  }

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

  // Tab Management for Item Modal
  initTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;

        // Remove active class from all tabs and contents
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        btn.classList.add('active');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
      });
    });
  }

  // Enhanced form validation
  validateForm() {
    const requiredFields = [
      { id: 'item-name', name: 'Nome do Item' },
      { id: 'item-category', name: 'Categoria' },
      { id: 'item-room', name: 'Cômodo' },
      { id: 'item-priority', name: 'Prioridade' },
      { id: 'item-status', name: 'Status' }
    ];

    let isValid = true;
    const errors = [];

    requiredFields.forEach(field => {
      const element = document.getElementById(field.id);
      const value = element.value.trim();
      const formGroup = element.closest('.form-group');

      // Remove previous validation classes
      formGroup.classList.remove('error', 'success');

      // Remove previous error messages
      const existingError = formGroup.querySelector('.error-message');
      if (existingError) {
        existingError.remove();
      }

      if (!value) {
        formGroup.classList.add('error');
        const errorMsg = document.createElement('span');
        errorMsg.className = 'error-message';
        errorMsg.textContent = `${field.name} é obrigatório`;
        formGroup.appendChild(errorMsg);
        errors.push(field.name);
        isValid = false;
      } else {
        formGroup.classList.add('success');
      }
    });

    // Validate purchase links
    const linkInputs = document.querySelectorAll('.purchase-link-input');
    linkInputs.forEach(input => {
      const value = input.value.trim();
      const formGroup = input.closest('.link-group');

      if (value && !this.isValidUrl(value)) {
        formGroup.style.borderColor = '#dc3545';
        isValid = false;
        errors.push('Link de compra inválido');
      } else {
        formGroup.style.borderColor = '#ddd';
      }
    });

    if (!isValid) {
      this.showNotification(`Corrija os seguintes erros: ${errors.join(', ')}`, 'error');
      // Focus on first error field
      const firstError = document.querySelector('.form-group.error input, .form-group.error select');
      if (firstError) {
        firstError.focus();
        // Switch to the tab containing the error
        const tabContent = firstError.closest('.tab-content');
        if (tabContent) {
          const tabId = tabContent.id.replace('tab-', '');
          document.querySelector(`[data-tab="${tabId}"]`).click();
        }
      }
    }

    return isValid;
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Enhanced file upload handling
  setupFileUpload() {
    const fileInput = document.getElementById('item-image');
    const uploadArea = document.querySelector('.file-upload-area');
    const uploadText = document.querySelector('.file-upload-text');

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#2196f3';
      uploadArea.style.background = '#e3f2fd';
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#ddd';
      uploadArea.style.background = '#f8f9fa';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#ddd';
      uploadArea.style.background = '#f8f9fa';

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        this.previewImage({ target: fileInput });
      }
    });

    // Update upload text when file is selected
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const fileName = e.target.files[0].name;
        uploadText.querySelector('p').textContent = `Arquivo selecionado: ${fileName}`;
        uploadText.querySelector('i').className = 'fas fa-check-circle';
        uploadArea.style.borderColor = '#4caf50';
        uploadArea.style.background = '#e8f5e8';
      }
    });
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new EnxovalApp();
});