'use strict';

/* =====================================================
   Community Resource Inventory — Frontend App
   ===================================================== */

// ---- State ------------------------------------------

const state = {
  items: [],
  categories: [],
  currentView: 'dashboard',
  sort: { col: 'name', dir: 'asc' },
  filters: { search: '', category: '', lowStock: false },
  editingId: null,
  deletingId: null,
};

// ---- DOM refs ----------------------------------------

const els = {
  sidebar:         document.getElementById('sidebar'),
  closeSidebar:    document.getElementById('closeSidebar'),
  hamburger:       document.getElementById('hamburger'),
  pageTitle:       document.getElementById('pageTitle'),
  addItemBtn:      document.getElementById('addItemBtn'),

  dashboardView:   document.getElementById('dashboardView'),
  inventoryView:   document.getElementById('inventoryView'),

  statTotal:       document.getElementById('statTotal'),
  statLowStock:    document.getElementById('statLowStock'),
  statCategories:  document.getElementById('statCategories'),
  statUnits:       document.getElementById('statUnits'),
  lowStockBody:    document.getElementById('lowStockBody'),
  recentBody:      document.getElementById('recentBody'),
  viewAllLowStock: document.getElementById('viewAllLowStock'),

  searchInput:     document.getElementById('searchInput'),
  categoryFilter:  document.getElementById('categoryFilter'),
  lowStockFilter:  document.getElementById('lowStockFilter'),
  inventoryBody:   document.getElementById('inventoryBody'),

  itemModal:       document.getElementById('itemModal'),
  modalTitle:      document.getElementById('modalTitle'),
  modalClose:      document.getElementById('modalClose'),
  cancelBtn:       document.getElementById('cancelBtn'),
  itemForm:        document.getElementById('itemForm'),
  itemId:          document.getElementById('itemId'),
  fieldName:       document.getElementById('fieldName'),
  fieldCategory:   document.getElementById('fieldCategory'),
  fieldQuantity:   document.getElementById('fieldQuantity'),
  fieldUnit:       document.getElementById('fieldUnit'),
  fieldLocation:   document.getElementById('fieldLocation'),
  fieldNotes:      document.getElementById('fieldNotes'),
  errName:         document.getElementById('errName'),
  errCategory:     document.getElementById('errCategory'),
  errQuantity:     document.getElementById('errQuantity'),

  confirmModal:    document.getElementById('confirmModal'),
  confirmClose:    document.getElementById('confirmClose'),
  confirmCancel:   document.getElementById('confirmCancel'),
  confirmDelete:   document.getElementById('confirmDelete'),
  confirmItemName: document.getElementById('confirmItemName'),

  toastContainer:  document.getElementById('toastContainer'),
};

// ---- API helpers ------------------------------------

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.indexOf('application/json') !== -1;
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error((data && data.error) || 'Request failed with status ' + res.status);
  }
  return data;
}

async function loadCategories() {
  state.categories = await apiFetch('/api/categories');
  populateCategorySelects();
}

async function loadItems() {
  state.items = await apiFetch('/api/items');
}

// ---- Category select population --------------------

function populateCategorySelects() {
  // Filter select
  while (els.categoryFilter.options.length > 1) els.categoryFilter.remove(1);
  state.categories.forEach((cat) => {
    const o = new Option(cat, cat);
    els.categoryFilter.add(o);
  });

  // Form select
  while (els.fieldCategory.options.length > 1) els.fieldCategory.remove(1);
  state.categories.forEach((cat) => {
    const o = new Option(cat, cat);
    els.fieldCategory.add(o);
  });
}

// ---- Rendering: Dashboard ---------------------------

function renderDashboard() {
  const { items } = state;
  const lowStock = items.filter((i) => i.quantity < 5);
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const cats = new Set(items.map((i) => i.category)).size;

  els.statTotal.textContent    = items.length;
  els.statLowStock.textContent = lowStock.length;
  els.statCategories.textContent = cats;
  els.statUnits.textContent    = totalUnits.toLocaleString();

  // Low-stock table
  if (lowStock.length === 0) {
    els.lowStockBody.innerHTML = '<tr><td colspan="5" class="table-empty">No low-stock items. All good!</td></tr>';
  } else {
    els.lowStockBody.innerHTML = lowStock
      .map((item) => rowHtml(item, ['name', 'category', 'quantity', 'location', 'actions']))
      .join('');
  }

  // Recent (last 5 updated)
  const recent = [...items]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  els.recentBody.innerHTML = recent
    .map((item) => recentRowHtml(item))
    .join('');
}

function recentRowHtml(item) {
  const low = item.quantity < 5;
  return `
    <tr>
      <td>
        <div class="item-name">${escHtml(item.name)}</div>
        ${item.notes ? `<div class="item-notes">${escHtml(item.notes)}</div>` : ''}
      </td>
      <td>${categoryBadge(item.category)}</td>
      <td>
        <span class="qty-value ${low ? 'qty-low' : ''}">${item.quantity}</span>
        ${low ? ' <span class="badge badge--low-stock">LOW</span>' : ''}
      </td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${timeAgo(item.updatedAt)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="openEditModal(${item.id})" title="Edit">&#9998;</button>
          <button class="btn-icon btn-icon--danger" onclick="openConfirmDelete(${item.id})" title="Delete">&#128465;</button>
        </div>
      </td>
    </tr>`;
}

// ---- Rendering: Inventory table ---------------------

function getFilteredSorted() {
  const { search, category, lowStock } = state.filters;
  const q = search.toLowerCase();

  let result = state.items.filter((i) => {
    if (lowStock && i.quantity >= 5) return false;
    if (category && i.category !== category) return false;
    if (q && !i.name.toLowerCase().includes(q) && !(i.notes || '').toLowerCase().includes(q) && !(i.location || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const { col, dir } = state.sort;
  result.sort((a, b) => {
    let va = a[col];
    let vb = b[col];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  return result;
}

function renderInventory() {
  const rows = getFilteredSorted();

  // Update sort header classes
  document.querySelectorAll('.sortable').forEach((th) => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.col === state.sort.col) {
      th.classList.add(state.sort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });

  if (rows.length === 0) {
    els.inventoryBody.innerHTML = '<tr><td colspan="6" class="table-empty">No items match your filters.</td></tr>';
    return;
  }

  els.inventoryBody.innerHTML = rows.map(inventoryRowHtml).join('');
}

function inventoryRowHtml(item) {
  const low = item.quantity < 5;
  return `
    <tr>
      <td>
        <div class="item-name">${escHtml(item.name)}</div>
        ${item.notes ? `<div class="item-notes">${escHtml(item.notes)}</div>` : ''}
      </td>
      <td>${categoryBadge(item.category)}</td>
      <td>
        <div class="qty-cell">
          <span class="qty-value ${low ? 'qty-low' : ''}">${item.quantity}</span>
          ${low ? '<span class="badge badge--low-stock">LOW</span>' : ''}
        </div>
      </td>
      <td style="color:var(--text-muted);">${escHtml(item.unit || '')}</td>
      <td style="color:var(--text-muted);">${escHtml(item.location || '')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="openEditModal(${item.id})" title="Edit">&#9998;</button>
          <button class="btn-icon btn-icon--danger" onclick="openConfirmDelete(${item.id})" title="Delete">&#128465;</button>
        </div>
      </td>
    </tr>`;
}

// ---- Helpers ----------------------------------------

function categoryBadge(cat) {
  const key = cat.replace(/[^a-zA-Z]/g, '').slice(0, 10);
  return `<span class="badge badge--${key}">${escHtml(cat)}</span>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ---- View switching ---------------------------------

function showView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

  if (viewName === 'dashboard') {
    els.dashboardView.classList.add('active');
    els.pageTitle.textContent = 'Dashboard';
    renderDashboard();
  } else {
    els.inventoryView.classList.add('active');
    els.pageTitle.textContent = 'Inventory';
    renderInventory();
  }

  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
  closeMobileSidebar();
}

// ---- Sidebar mobile ---------------------------------

function openMobileSidebar() {
  els.sidebar.classList.add('open');
  getOrCreateOverlay().classList.add('visible');
}

function closeMobileSidebar() {
  els.sidebar.classList.remove('open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function getOrCreateOverlay() {
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeMobileSidebar);
    document.body.appendChild(overlay);
  }
  return overlay;
}

// ---- Modals ----------------------------------------

function openAddModal() {
  state.editingId = null;
  els.modalTitle.textContent = 'Add Item';
  els.itemId.value = '';
  els.itemForm.reset();
  clearFormErrors();
  els.itemModal.showModal();
  els.fieldName.focus();
}

function openEditModal(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  state.editingId = id;
  els.modalTitle.textContent = 'Edit Item';
  els.itemId.value = id;
  els.fieldName.value     = item.name;
  els.fieldCategory.value = item.category;
  els.fieldQuantity.value = item.quantity;
  els.fieldUnit.value     = item.unit || '';
  els.fieldLocation.value = item.location || '';
  els.fieldNotes.value    = item.notes || '';
  clearFormErrors();
  els.itemModal.showModal();
  els.fieldName.focus();
}

function closeItemModal() {
  els.itemModal.close();
  state.editingId = null;
}

function openConfirmDelete(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  state.deletingId = id;
  els.confirmItemName.textContent = item.name;
  els.confirmModal.showModal();
}

function closeConfirmModal() {
  els.confirmModal.close();
  state.deletingId = null;
}

function clearFormErrors() {
  els.errName.textContent = '';
  els.errCategory.textContent = '';
  els.errQuantity.textContent = '';
  els.fieldName.classList.remove('invalid');
  els.fieldCategory.classList.remove('invalid');
  els.fieldQuantity.classList.remove('invalid');
}

function validateForm() {
  clearFormErrors();
  let valid = true;

  const name = els.fieldName.value.trim();
  if (!name) {
    els.errName.textContent = 'Name is required.';
    els.fieldName.classList.add('invalid');
    valid = false;
  }

  const cat = els.fieldCategory.value;
  if (!cat) {
    els.errCategory.textContent = 'Please select a category.';
    els.fieldCategory.classList.add('invalid');
    valid = false;
  }

  const qty = parseFloat(els.fieldQuantity.value);
  if (els.fieldQuantity.value === '' || !Number.isFinite(qty) || qty < 0) {
    els.errQuantity.textContent = 'Enter a valid non-negative number.';
    els.fieldQuantity.classList.add('invalid');
    valid = false;
  }

  return valid;
}

// ---- CRUD -------------------------------------------

async function saveItem(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    name:     els.fieldName.value.trim(),
    category: els.fieldCategory.value,
    quantity: parseFloat(els.fieldQuantity.value),
    unit:     els.fieldUnit.value.trim() || 'each',
    location: els.fieldLocation.value.trim(),
    notes:    els.fieldNotes.value.trim(),
  };

  try {
    if (state.editingId) {
      const updated = await apiFetch(`/api/items/${state.editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const idx = state.items.findIndex((i) => i.id === state.editingId);
      if (idx !== -1) state.items[idx] = updated;
      toast('Item updated successfully.', 'success');
    } else {
      const created = await apiFetch('/api/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      state.items.push(created);
      toast('Item added to inventory.', 'success');
    }

    closeItemModal();
    refreshCurrentView();
  } catch (err) {
    toast(err.message || 'Something went wrong.', 'error');
  }
}

async function deleteItem() {
  if (!state.deletingId) return;
  const id = state.deletingId;

  try {
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' });
    state.items = state.items.filter((i) => i.id !== id);
    closeConfirmModal();
    toast('Item deleted.', 'info');
    refreshCurrentView();
  } catch (err) {
    toast(err.message || 'Could not delete item.', 'error');
  }
}

function refreshCurrentView() {
  if (state.currentView === 'dashboard') {
    renderDashboard();
  } else {
    renderInventory();
  }
}

// ---- Toast ------------------------------------------

function toast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.innerHTML = `<span class="toast-dot"></span><span>${escHtml(message)}</span>`;
  els.toastContainer.appendChild(t);

  setTimeout(() => {
    t.classList.add('fade-out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, 3500);
}

// ---- Sort -------------------------------------------

function handleSortClick(e) {
  const th = e.target.closest('.sortable');
  if (!th) return;
  const col = th.dataset.col;
  if (state.sort.col === col) {
    state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort.col = col;
    state.sort.dir = 'asc';
  }
  renderInventory();
}

// ---- Events -----------------------------------------

function bindEvents() {
  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showView(item.dataset.view);
    });
  });

  // Hamburger
  els.hamburger.addEventListener('click', openMobileSidebar);
  els.closeSidebar.addEventListener('click', closeMobileSidebar);

  // Add item button
  els.addItemBtn.addEventListener('click', openAddModal);

  // Dashboard "view all low stock"
  els.viewAllLowStock.addEventListener('click', () => {
    state.filters.lowStock = true;
    els.lowStockFilter.checked = true;
    state.filters.category = '';
    state.filters.search = '';
    els.categoryFilter.value = '';
    els.searchInput.value = '';
    showView('inventory');
  });

  // Search & filter
  els.searchInput.addEventListener('input', () => {
    state.filters.search = els.searchInput.value;
    renderInventory();
  });

  els.categoryFilter.addEventListener('change', () => {
    state.filters.category = els.categoryFilter.value;
    renderInventory();
  });

  els.lowStockFilter.addEventListener('change', () => {
    state.filters.lowStock = els.lowStockFilter.checked;
    renderInventory();
  });

  // Sort
  document.getElementById('inventoryTable').querySelector('thead').addEventListener('click', handleSortClick);

  // Modal form
  els.itemForm.addEventListener('submit', saveItem);
  els.modalClose.addEventListener('click', closeItemModal);
  els.cancelBtn.addEventListener('click', closeItemModal);

  // Close on backdrop click
  els.itemModal.addEventListener('click', (e) => {
    if (e.target === els.itemModal) closeItemModal();
  });

  // Confirm delete
  els.confirmDelete.addEventListener('click', deleteItem);
  els.confirmClose.addEventListener('click', closeConfirmModal);
  els.confirmCancel.addEventListener('click', closeConfirmModal);

  els.confirmModal.addEventListener('click', (e) => {
    if (e.target === els.confirmModal) closeConfirmModal();
  });
}

// ---- Init -------------------------------------------

async function init() {
  try {
    await Promise.all([loadCategories(), loadItems()]);
    bindEvents();
    showView('dashboard');
  } catch (err) {
    toast('Failed to load data. Is the server running?', 'error');
    console.error(err);
  }
}

// Expose globals for inline onclick handlers
window.openEditModal     = openEditModal;
window.openConfirmDelete = openConfirmDelete;

init();
