const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec',
    ITEMS_PER_PAGE: 10,
    MAX_VISIBLE_PAGES: 5,
    STATUS: {
        ACTIVE: 'ACTIVO',
        INACTIVE: 'INACTIVO'
    }
};

const AppState = {
    inventoryData: [],
    filteredData: [],
    currentItemToDelete: null,
    currentPage: 1,
    totalPages: 1,
    sortConfig: {
        column: '',
        direction: 'asc'
    },
    proveedores: []
};

/**
 * Cache de elementos DOM
 */
const DOM = {
    get loader() { return document.getElementById('loader'); },
    get inventoryBody() { return document.getElementById('inventoryBody'); },
    get noResults() { return document.getElementById('noResults'); },
    get userName() { return document.getElementById('userName'); },
    get articleModal() { return document.getElementById('articleModal'); },
    get confirmModal() { return document.getElementById('confirmModal'); },
    get articleForm() { return document.getElementById('articleForm'); },
    get modalTitle() { return document.getElementById('modalTitle'); },
    get closeBtn() { return document.querySelector('.close'); },
    get btnCancelar() { return document.getElementById('btnCancelar'); },
    get btnNuevoArticulo() { return document.getElementById('btnNuevoArticulo'); },
    get btnConfirmDelete() { return document.getElementById('btnConfirmDelete'); },
    get btnCancelDelete() { return document.getElementById('btnCancelDelete'); },
    get btnLimpiarFiltros() { return document.getElementById('btnLimpiarFiltros'); },
    
    filters: {
        get sede() { return document.getElementById('filtroSede'); },
        get tipo() { return document.getElementById('filtroTipo'); },
        get categoria() { return document.getElementById('filtroCategoria'); },
        get estado() { return document.getElementById('filtroEstado'); },
        get buscarItem() { return document.getElementById('buscarItem'); }
    },
    
    formFields: {
        get id() { return document.getElementById('articleId'); },
        get item() { return document.getElementById('item'); },
        get tipo() { return document.getElementById('tipo'); },
        get categoria() { return document.getElementById('categoria'); },
        get modo() { return document.getElementById('modo'); },
        get modelo() { return document.getElementById('modelo'); },
        get sede() { return document.getElementById('sede'); },
        get estado() { return document.getElementById('estado'); },
        get Minimo() { return document.getElementById('topeMinimo'); }, 
        get Maximo() { return document.getElementById('topeMaximo'); },
        get proveedor() { return document.getElementById('proveedor'); }
    },
    
    modalHeader: {
        get info() { return document.querySelector('.modal-header-info'); },
        get itemId() { return document.getElementById('modalItemId'); },
        get item() { return document.getElementById('modalItem'); },
        get responsable() { return document.getElementById('modalResponsable'); },
        get statusBadge() { return document.getElementById('modalStatusBadge'); }
    },
    
    pagination: {
        get top() { return document.getElementById('pagination-top'); },
        get bottom() { return document.getElementById('pagination-bottom'); }
    }
};

/**
 * Utilidades comunes
 */
const Utils = {
    formatDate(dateStr) {
        if (!dateStr) return 'No especificado';
        dateStr = dateStr.toString().padStart(8, '0');
        return `${dateStr.substring(0, 2)}/${dateStr.substring(2, 4)}/${dateStr.substring(4, 8)}`;
    },

    formatTime(timeStr) {
        if (!timeStr) return 'No especificado';
        timeStr = timeStr.toString().padStart(4, '0');
        return timeStr.length === 3 
            ? `${timeStr[0]}:${timeStr.slice(1)}` 
            : `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
    },

    showLoader(show) {
        if (DOM.loader) DOM.loader.style.display = show ? 'flex' : 'none';
        
        if (show && DOM.noResults) {
            DOM.noResults.style.display = 'none';
        }
    },

    showNoResults(message = 'No se encontraron artículos') {
        if (DOM.noResults) {
            DOM.noResults.textContent = message;
            DOM.noResults.style.display = 'block';
        }
        if (DOM.inventoryBody) DOM.inventoryBody.innerHTML = '';
    },

    clearSelectOptions(selectElement) {
        if (!selectElement) return;
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
    },

    createOption(value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text || value;
        return option;
    },

    populateSelect(selectElement, values, formatter = null) {
        if (!selectElement) return;
        this.clearSelectOptions(selectElement);
        
        values.forEach(value => {
            const displayText = formatter ? formatter(value) : value;
            selectElement.appendChild(this.createOption(value, displayText));
        });
    },

    showNotification(type, message) {
        const container = document.getElementById('notificationContainer') || 
                         (() => {
                             const div = document.createElement('div');
                             div.id = 'notificationContainer';
                             document.body.appendChild(div);
                             return div;
                         })();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <p>${message}</p>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    showActionOverlay(message) {
        let overlay = document.getElementById('actionOverlay') || 
                     (() => {
                         const div = document.createElement('div');
                         div.id = 'actionOverlay';
                         document.body.appendChild(div);
                         return div;
                     })();
        
        overlay.innerHTML = `
            <div class="action-animation">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        overlay.style.display = 'flex';
    },

    hideActionOverlay() {
        const overlay = document.getElementById('actionOverlay');
        if (overlay) overlay.style.display = 'none';
    }
};

/**
 * Controlador de API
 */
const ApiController = {
    async fetchInventory() {
        Utils.showLoader(true);
        try {
            const response = await fetch(`${CONFIG.API_URL}?api=articulos`);
            if (!response.ok) throw new Error('Error en la respuesta de la API');
            
            const data = await response.json();
            const result = data?.data || [];
            
            Utils.showLoader(false);
            
            if (result.length === 0) {
                Utils.showNoResults();
            }
            
            return result;
        } catch (error) {
            console.error('Error al obtener el inventario:', error);
            Utils.showLoader(false);
            Utils.showNoResults('Error al cargar los datos');
            return [];
        }
    },

    async saveArticle(articleData, isNew = true) {
        Utils.showActionOverlay(isNew ? 'Creando artículo...' : 'Actualizando artículo...');
        
        const payload = {
            api: 'articulos',
            accion: 'guardar',
            articulo: {
                ...articleData,
                responsable: sessionStorage.getItem('usuario') || 'Sistema'
            }
        };

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Error al procesar la solicitud');
            
            Utils.showNotification('success', isNew ? 'Artículo creado correctamente' : 'Artículo actualizado correctamente');
            return true;
        } catch (error) {
            console.error('Error:', error);
            Utils.showNotification('error', 'Error: ' + error.message);
            return false;
        } finally {
            Utils.hideActionOverlay();
        }
    },

    async deleteArticle(articleId) {
        Utils.showActionOverlay('Eliminando artículo...');
        
        const payload = {
            api: 'articulos',
            accion: 'borrar',
            codigo: articleId
        };
    
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Error al eliminar el artículo');
            
            Utils.showNotification('success', 'Artículo eliminado correctamente');
            return true;
        } catch (error) {
            console.error('Error:', error);
            Utils.showNotification('error', 'Error: ' + error.message);
            return false;
        } finally {
            Utils.hideActionOverlay();
        }
    },

    async fetchProveedores() {
        try {
            const response = await fetch(`${CONFIG.API_URL}?api=proveedores`);
            if (!response.ok) throw new Error('Error al obtener proveedores');
            const data = await response.json();
            return data?.data || [];
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            return [];
        }
    }
};

/**
 * Controlador de UI
 */
const UIController = {
    initTable() {
        if (!DOM.inventoryBody) return;
        
        DOM.inventoryBody.innerHTML = '';
        DOM.noResults.style.display = 'none';
    },

    renderTableRow(item, index) {
        const rowId = item.id || index;
        const sedeFormatted = item.SEDE === 'ALL' ? 'AMBAS' : (item.SEDE || '-');
        const statusClass = item.ESTADO === CONFIG.STATUS.ACTIVE ? 'status-active' : 'status-inactive';
        
        const row = document.createElement('tr');
        row.dataset.id = rowId;
        row.innerHTML = `
            <td>${item.ITEM || '-'}</td>
            <td>${item.TIPO || '-'}</td>
            <td>${item.CATEGORIA || '-'}</td>
            <td>${item.MODO || '-'}</td>
            <td>${item.MODELO || '-'}</td>
            <td>${sedeFormatted}</td>
            <td><span class="status-badge ${statusClass}">${item.ESTADO || 'N/A'}</span></td>
            <td>
                <div class="item-actions">
                    <button class="action-btn view-btn" title="Ver detalles"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" title="Editar artículo"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" title="Eliminar artículo"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        
        DOM.inventoryBody.appendChild(row);
        this.renderDetailsRow(rowId, item);
        this.setupRowEventListeners(row, item, rowId);
    },

    renderDetailsRow(rowId, item) {
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row';
        detailsRow.dataset.parentId = rowId;
    
        let proveedorNombre = 'No especificado';
        if (item.ID_PROVEEDOR || item.proveedor_id) {
            const proveedor = AppState.proveedores.find(p => 
                p.ID_PROVEEDOR === (item.ID_PROVEEDOR || item.proveedor_id)
            );
            if (proveedor) {
                proveedorNombre = proveedor.PROVEEDOR;
            }
        }
    
        detailsRow.innerHTML = `
            <td colspan="8">
                <div class="details-content">
                    <div class="detail-item">
                        <span class="detail-label">TOPE MÍNIMO:</span>
                        <span class="detail-value">${item.MINIMO ?? item.minimo ?? 'No especificado'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">TOPE MÁXIMO:</span>
                        <span class="detail-value">${item.MAXIMO ?? item.maximo ?? 'No especificado'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">PROVEEDOR:</span>
                        <span class="detail-value">${proveedorNombre}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">RESPONSABLE:</span>
                        <span class="detail-value">${item.RESPONSABLE ?? item.responsable ?? 'No especificado'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">FECHA MODIFICACIÓN:</span>
                        <span class="detail-value">${Utils.formatDate(item.FECHAMOD ?? item.fechamod)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">HORA MODIFICACIÓN:</span>
                        <span class="detail-value">${Utils.formatTime(item.HORAMOD ?? item.horamod)}</span>
                    </div>
                </div>
            </td>
        `;
        
        DOM.inventoryBody.appendChild(detailsRow);
    },

    setupRowEventListeners(row, item, rowId) {
        const viewBtn = row.querySelector('.view-btn');
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');
        
        if (viewBtn) viewBtn.addEventListener('click', () => this.toggleDetails(rowId));
        if (editBtn) editBtn.addEventListener('click', () => this.openEditModal(item));
        if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDeleteConfirmation(item);
        });
    },

    toggleDetails(id) {
        const detailsRow = document.querySelector(`.details-row[data-parent-id="${id}"]`);
        if (!detailsRow) return;
        
        const isVisible = detailsRow.style.display === 'table-row';
        document.querySelectorAll('.details-row').forEach(row => row.style.display = 'none');
        detailsRow.style.display = isVisible ? 'none' : 'table-row';
    },

    setupTableSorting() {
        const headers = document.querySelectorAll('.inventory-table th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                
                if (AppState.sortConfig.column === column) {
                    AppState.sortConfig.direction = AppState.sortConfig.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    AppState.sortConfig.column = column;
                    AppState.sortConfig.direction = 'asc';
                }
                
                this.updateSortUI(headers, header);
                this.sortAndDisplayData();
            });
        });
    },

    updateSortUI(headers, currentHeader) {
        headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        currentHeader.classList.add(`sort-${AppState.sortConfig.direction}`);
    },

    sortAndDisplayData() {
        const { column, direction } = AppState.sortConfig;
        const sortedData = [...AppState.inventoryData].sort((a, b) => {
            const valueA = (a[column] || '').toString().toLowerCase();
            const valueB = (b[column] || '').toString().toLowerCase();
            
            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        AppState.currentPage = 1;
        this.populateTable(sortedData);
    },

    createPaginationContainer(position, totalItems) {
        const container = DOM.pagination[position];
        if (!container) return;
        
        container.innerHTML = '';
        if (AppState.totalPages <= 1) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'flex';
        container.className = 'pagination-container';
        
        // Info section
        const startItem = (AppState.currentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
        const endItem = Math.min(AppState.currentPage * CONFIG.ITEMS_PER_PAGE, totalItems);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'pagination-info';
        infoDiv.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} artículos`;
        
        // Controls section
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'pagination-controls';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '&laquo;';
        prevBtn.disabled = AppState.currentPage === 1;
        prevBtn.addEventListener('click', () => this.goToPage(AppState.currentPage - 1));
        controlsDiv.appendChild(prevBtn);
        
        // Page buttons
        const maxVisiblePages = CONFIG.MAX_VISIBLE_PAGES;
        let startPage = Math.max(1, AppState.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(AppState.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // First page and ellipsis
        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'pagination-btn';
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => this.goToPage(1));
            controlsDiv.appendChild(firstBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                controlsDiv.appendChild(ellipsis);
            }
        }
        
        // Numbered pages
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn';
            if (i === AppState.currentPage) pageBtn.classList.add('active');
            pageBtn.textContent = i.toString();
            pageBtn.addEventListener('click', () => this.goToPage(i));
            controlsDiv.appendChild(pageBtn);
        }
        
        // Last page and ellipsis
        if (endPage < AppState.totalPages) {
            if (endPage < AppState.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                controlsDiv.appendChild(ellipsis);
            }
            
            const lastBtn = document.createElement('button');
            lastBtn.className = 'pagination-btn';
            lastBtn.textContent = AppState.totalPages.toString();
            lastBtn.addEventListener('click', () => this.goToPage(AppState.totalPages));
            controlsDiv.appendChild(lastBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '&raquo;';
        nextBtn.disabled = AppState.currentPage === AppState.totalPages;
        nextBtn.addEventListener('click', () => this.goToPage(AppState.currentPage + 1));
        controlsDiv.appendChild(nextBtn);
        
        container.appendChild(infoDiv);
        container.appendChild(controlsDiv);
    },

    goToPage(page) {
        if (page < 1 || page > AppState.totalPages) return;
        AppState.currentPage = page;
        this.populateTable(AppState.filteredData || AppState.inventoryData);
    },

    populateTable(data) {
        if (!data?.length) {
            Utils.showNoResults();
            return;
        }

        this.initTable();
        
        // Update pagination state
        AppState.totalPages = Math.ceil(data.length / CONFIG.ITEMS_PER_PAGE);
        AppState.currentPage = Math.min(AppState.currentPage, AppState.totalPages);
        
        // Get paginated data
        const startIndex = (AppState.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + CONFIG.ITEMS_PER_PAGE, data.length);
        const paginatedData = data.slice(startIndex, endIndex);
        
        // Store filtered data for pagination
        AppState.filteredData = data;
        
        // Render rows
        paginatedData.forEach((item, index) => this.renderTableRow(item, index));
        
        // Create pagination controls
        this.createPaginationContainer('bottom', data.length);
    },

    populateFilters(data) {
        const filterValues = {
            sede: new Set(['ALL', 'FILANDIA', 'SANTA ROSA']),
            tipo: new Set(),
            categoria: new Set(),
            estado: new Set([CONFIG.STATUS.ACTIVE, CONFIG.STATUS.INACTIVE])
        };
        
        data.forEach(item => {
            if (item.TIPO) filterValues.tipo.add(item.TIPO);
            if (item.CATEGORIA) filterValues.categoria.add(item.CATEGORIA);
        });
        
        this.populateFilter('sede', filterValues.sede, true);
        this.populateFilter('tipo', filterValues.tipo);
        this.populateFilter('categoria', filterValues.categoria);
        this.populateFilter('estado', filterValues.estado);
        
        // Disable categoria filter initially
        if (DOM.filters.categoria) {
            DOM.filters.categoria.disabled = true;
        }
        
        if (DOM.filters.tipo) {
            DOM.filters.tipo.addEventListener('change', () => this.updateCategoriesFilterByType());
        }
    },

    updateCategoriesFilterByType() {
        const selectedType = DOM.filters.tipo?.value;
        if (!DOM.filters.categoria) return;
        
        // Enable or disable categoria based on tipo selection
        DOM.filters.categoria.disabled = !selectedType;
        
        Utils.clearSelectOptions(DOM.filters.categoria);
        DOM.filters.categoria.appendChild(Utils.createOption('', 'Seleccionar'));
        
        if (!selectedType) {
            return;
        }
        
        const filteredCategories = [...new Set(
            AppState.inventoryData
                .filter(item => item.TIPO === selectedType)
                .map(item => item.CATEGORIA)
                .filter(Boolean)
        )];
        
        Utils.populateSelect(DOM.filters.categoria, filteredCategories);
    },

    populateFilter(filterName, values, formatSede = false) {
        const filterElement = DOM.filters[filterName];
        if (!filterElement) return;
        
        // Clear all options including the first one
        filterElement.innerHTML = '';
        
        // Add placeholder option
        filterElement.appendChild(Utils.createOption('', 'Seleccionar'));
        
        Array.from(values).sort().forEach(value => {
            const displayText = formatSede && value === 'ALL' ? 'AMBAS' : value;
            filterElement.appendChild(Utils.createOption(value, displayText));
        });
    },

    filterData() {
        const filters = {
            sede: DOM.filters.sede?.value.toLowerCase() || '',
            tipo: DOM.filters.tipo?.value.toLowerCase() || '',
            categoria: DOM.filters.categoria?.value.toLowerCase() || '',
            estado: DOM.filters.estado?.value.toUpperCase() || '',
            itemText: DOM.filters.buscarItem?.value.toLowerCase().trim() || ''
        };
        
        const filteredData = AppState.inventoryData.filter(item => 
            (!filters.sede || (item.SEDE?.toLowerCase().includes(filters.sede))) &&
            (!filters.tipo || (item.TIPO?.toLowerCase().includes(filters.tipo))) &&
            (!filters.categoria || (item.CATEGORIA?.toLowerCase().includes(filters.categoria))) &&
            (!filters.estado || (item.ESTADO === filters.estado)) &&
            (!filters.itemText || (item.ITEM?.toLowerCase().includes(filters.itemText)))
        );
        
        AppState.currentPage = 1;
        this.populateTable(filteredData);
        
        if (!filteredData.length) {
            Utils.showNoResults();
        }
    },

    clearFilters() {
        Object.values(DOM.filters).forEach(filter => {
            if (filter) filter.value = '';
        });
        
        AppState.currentPage = 1;
        this.populateTable(AppState.inventoryData);
    },

    openNewArticleModal() {
        this.setModalTitle('Nuevo Artículo');
        this.hideModalHeaderInfo();
        DOM.articleForm.reset();
        DOM.articleForm.dataset.mode = 'new';
        
        if (typeof listas !== 'undefined') {
            listas.inicializarSelectores();
        }
        
        // Reset proveedor field
        if (DOM.formFields.proveedor) {
            DOM.formFields.proveedor.value = '';
        }
        
        this.showModal();
    },

    async openEditModal(item) {
        this.setModalTitle('Editar Artículo');
        this.showModalHeaderInfo();
        this.setModalHeaderContent(item);
        
        if (typeof listas !== 'undefined') {
            listas.inicializarSelectores({
                tipo: item.TIPO || '',
                categoria: item.CATEGORIA || '',
                modo: item.MODO || '',
                modelo: item.MODELO || '',
                sede: item.SEDE || ''
            });
        }
        
        // Set form values
        if (DOM.formFields.id) DOM.formFields.id.value = item.CODIGO || item.id || '';
        if (DOM.formFields.item) DOM.formFields.item.value = item.ITEM || '';
        if (DOM.formFields.estado) DOM.formFields.estado.value = item.ESTADO || CONFIG.STATUS.ACTIVE;
        if (DOM.formFields.Minimo) DOM.formFields.Minimo.value = item.TOPE_MINIMO ?? item.MINIMO ?? '';
        if (DOM.formFields.Maximo) DOM.formFields.Maximo.value = item.TOPE_MAXIMO ?? item.MAXIMO ?? '';
        
        // Filtrar proveedores basados en la SEDE del artículo
        this.filterProveedores(item.SEDE);
        
        // Establecer el proveedor
        if (DOM.formFields.proveedor) {
            DOM.formFields.proveedor.value = item.ID_PROVEEDOR || item.proveedor_id || '';
        }
        
        DOM.articleForm.dataset.mode = 'edit';
        this.showModal();
    },

    setModalTitle(title) {
        if (DOM.modalTitle) DOM.modalTitle.textContent = title;
    },

    showModalHeaderInfo() {
        if (DOM.modalHeader.info) DOM.modalHeader.info.style.display = 'flex';
    },

    hideModalHeaderInfo() {
        if (DOM.modalHeader.info) DOM.modalHeader.info.style.display = 'none';
    },

    setModalHeaderContent(item) {
        if (DOM.modalHeader.itemId) {
            DOM.modalHeader.itemId.textContent = `Código: ${item.CODIGO || ''}`;
        }
        if (DOM.modalHeader.item) {
            DOM.modalHeader.item.textContent = item.ITEM || '';
        }
        if (DOM.modalHeader.responsable) {
            DOM.modalHeader.responsable.textContent = `Responsable: ${item.RESPONSABLE || 'No especificado'}`;
        }
        if (DOM.modalHeader.statusBadge) {
            DOM.modalHeader.statusBadge.textContent = item.ESTADO || CONFIG.STATUS.ACTIVE;
            DOM.modalHeader.statusBadge.className = 'modal-status-badge';
            DOM.modalHeader.statusBadge.classList.add(
                item.ESTADO === CONFIG.STATUS.INACTIVE ? 'status-inactive' : 'status-active'
            );
        }
    },

    showModal() {
        if (DOM.articleModal) DOM.articleModal.style.display = 'block';
    },

    closeModal() {
        if (DOM.articleModal) DOM.articleModal.style.display = 'none';
    },

    openDeleteConfirmation(item) {
        AppState.currentItemToDelete = item;
        const confirmMessage = document.getElementById('confirmDeleteMessage');
        
        if (confirmMessage) {
            const itemCode = item.CODIGO || item.id || 'desconocido';
            const itemName = item.ITEM || 'sin nombre';
            confirmMessage.innerHTML = `¿Está seguro que desea eliminar el artículo:<br>
                <strong>${itemName}</strong><br>
                <span class="delete-code">Código: ${itemCode}</span>?<br>
                <small>Esta acción no se puede deshacer.</small>`;
        }
        
        if (DOM.confirmModal) {
            DOM.confirmModal.style.display = 'block';
        }
    },

    closeConfirmModal() {
        if (DOM.confirmModal) {
            DOM.confirmModal.style.display = 'none';
        }
    },

    async confirmDelete() {
        if (!AppState.currentItemToDelete) return;
        
        const success = await ApiController.deleteArticle(
            AppState.currentItemToDelete.CODIGO || AppState.currentItemToDelete.id
        );
        
        if (success) {
            this.closeConfirmModal();
            InventoryController.fetchInventoryData();
        }
    },

    filterProveedores(sedeArticulo = null) {
        if (!DOM.formFields.proveedor) return;
        
        const sedeSeleccionada = sedeArticulo || DOM.formFields.sede.value;
        console.log('Sede del artículo:', sedeSeleccionada);
        
        const proveedoresFiltrados = AppState.proveedores.filter(prov => {
            if (!prov.hasOwnProperty('SEDE')) {
                console.log('Proveedor sin propiedad SEDE:', prov);
                return false;
            }
            
            const provSede = String(prov.SEDE || '').trim().toUpperCase();
            const selectedSede = String(sedeSeleccionada || '').trim().toUpperCase();
            
            // Mostrar todos los proveedores si la sede es 'AMBAS' o 'ALL'
            if (selectedSede === 'AMBAS' || selectedSede === 'ALL') {
                return true;
            }
            
            // Mostrar proveedores que coincidan con la sede o tengan SEDE 'ALL'
            return provSede === 'ALL' || provSede === selectedSede;
        });
        
        // Actualizar el select de proveedores
        DOM.formFields.proveedor.innerHTML = '<option value="">Seleccionar Proveedor</option>';
        proveedoresFiltrados.forEach(prov => {
            const option = document.createElement('option');
            option.value = prov.ID_PROVEEDOR;
            option.textContent = prov.PROVEEDOR;
            DOM.formFields.proveedor.appendChild(option);
        });
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formValues = {
            sede: DOM.formFields.sede ? DOM.formFields.sede.value : '',
            tipo: DOM.formFields.tipo ? DOM.formFields.tipo.value : '',
            categoria: DOM.formFields.categoria ? DOM.formFields.categoria.value : '',
            modo: DOM.formFields.modo ? DOM.formFields.modo.value : '',
            modelo: DOM.formFields.modelo ? DOM.formFields.modelo.value : '',
            item: DOM.formFields.item ? DOM.formFields.item.value : '',
            estado: DOM.formFields.estado ? DOM.formFields.estado.value : CONFIG.STATUS.ACTIVE,
            id: DOM.formFields.id ? DOM.formFields.id.value : '',
            id_proveedor: DOM.formFields.proveedor ? DOM.formFields.proveedor.value : '',
            minimo: DOM.formFields.Minimo ? parseFloat(DOM.formFields.Minimo.value) : null,
            maximo: DOM.formFields.Maximo ? parseFloat(DOM.formFields.Maximo.value) : null
        };
    
        // Validate required fields
        const requiredFields = ['sede', 'tipo', 'categoria', 'modo', 'modelo', 'item', 'minimo', 'maximo'];
        const missingFields = requiredFields.filter(field => {
            const value = formValues[field];
            return value === null || value === '' || (typeof value === 'number' && isNaN(value));
        });
    
        if (missingFields.length > 0) {
            Utils.showNotification('error', `Faltan campos requeridos: ${missingFields.join(', ')}`);
            return;
        }
    
        const payload = {
            ...formValues,
            minimo: Math.max(0, formValues.minimo),
            maximo: Math.max(0, formValues.maximo)
        };
        
        const mode = DOM.articleForm.dataset.mode;
        
        // Include article code when in edit mode
        if (mode === 'edit') {
            payload.codigo = formValues.id;
            
            if (!payload.codigo) {
                Utils.showNotification('error', 'Error: No se pudo identificar el artículo a editar');
                return;
            }
        }
        
        const success = await ApiController.saveArticle(payload, mode === 'new');
        if (success) {
            this.closeModal();
            InventoryController.fetchInventoryData();
        }
    },

    setupEventListeners() {
        // Modal events
        if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', () => this.closeModal());
        if (DOM.btnCancelar) DOM.btnCancelar.addEventListener('click', () => this.closeModal());
        if (DOM.btnNuevoArticulo) DOM.btnNuevoArticulo.addEventListener('click', () => this.openNewArticleModal());
        
        // Form submission
        if (DOM.articleForm) DOM.articleForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Delete confirmation
        if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.addEventListener('click', () => this.confirmDelete());
        if (DOM.btnCancelDelete) DOM.btnCancelDelete.addEventListener('click', () => this.closeConfirmModal());
        
        // Filter events
        Object.values(DOM.filters).forEach(filter => {
            if (filter) filter.addEventListener('change', () => this.filterData());
        });
        
        // Search input
        if (DOM.filters.buscarItem) {
            DOM.filters.buscarItem.addEventListener('input', () => this.filterData());
        }
        
        // Clear filters
        if (DOM.btnLimpiarFiltros) {
            DOM.btnLimpiarFiltros.addEventListener('click', () => this.clearFilters());
        }
        
        // Agregar event listener para el cambio de sede
        if (DOM.formFields.sede) {
            DOM.formFields.sede.addEventListener('change', () => this.filterProveedores());
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === DOM.articleModal) this.closeModal();
            if (event.target === DOM.confirmModal) this.closeConfirmModal();
        });
    }
};

/**
 * Controlador de Inventario
 */
const InventoryController = {
    async fetchInventoryData() {
        const data = await ApiController.fetchInventory();
        if (data.length) {
            this.processInventoryData(data);
        }
    },

    processInventoryData(data) {
        AppState.inventoryData = data.map(item => ({
            ...item,
            MINIMO: item.minimo ?? item.MINIMO ?? item.MINIMO,
            MAXIMO: item.maximo ?? item.MAXIMO ?? item.MAXIMO,
            PROVEEDOR: item.proveedor ?? item.PROVEEDOR,
            PROVEEDOR_ID: item.ID_PROVEEDOR ?? item.proveedor_id
        }));
        
        UIController.populateTable(AppState.inventoryData);
        UIController.populateFilters(AppState.inventoryData);
        UIController.setupTableSorting();
    }
};

/**
 * Controlador de Sesión
 */
const SessionController = {
    checkSession() {
        const usuario = sessionStorage.getItem('usuario');
        if (!usuario) {
            window.location.href = '../login.html';
            return false;
        }

        if (DOM.userName) {
            DOM.userName.textContent = usuario;
        }
        return true;
    }
};

// Cargar listas desplegables
async function loadLists() {
    try {
        const listasModule = await import('./listas.js');
        if (typeof listasModule.listas !== 'undefined') {
            listasModule.listas.inicializarFiltros();
        }
    } catch (error) {
        console.error('Error al cargar las listas:', error);
        // Proveer funcionalidad básica si falla
        UIController.setupBasicFilters();
    }
}

/**
 * Inicialización de la aplicación
 */
async function init() {
    if (!SessionController.checkSession()) return;
    
    try {
        // Cargar proveedores al inicio
        AppState.proveedores = await ApiController.fetchProveedores();
    } catch (error) {
        console.error('Error al cargar proveedores:', error);
        AppState.proveedores = [];
    }
    
    await loadLists();
    UIController.setupEventListeners();
    InventoryController.fetchInventoryData();
    
    // Configuración inicial de paginación
    if (DOM.pagination.top) DOM.pagination.top.style.display = 'none';
    if (DOM.pagination.bottom) DOM.pagination.bottom.style.display = 'flex';
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);