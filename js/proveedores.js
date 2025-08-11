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
    proveedoresData: [],
    filteredData: [],
    currentItemToDelete: null,
    currentPage: 1,
    totalPages: 1,
    sortConfig: {
        column: '',
        direction: 'asc'
    }
};

/**
 * Cache de elementos DOM
 */
const DOM = {
    get loader() { return document.getElementById('loader'); },
    get proveedoresBody() { return document.getElementById('proveedoresBody'); },
    get noResults() { return document.getElementById('noResults'); },
    get userName() { return document.getElementById('userName'); },
    get proveedorModal() { return document.getElementById('proveedorModal'); },
    get confirmModal() { return document.getElementById('confirmModal'); },
    get proveedorForm() { return document.getElementById('proveedorForm'); },
    get modalTitle() { return document.getElementById('modalTitle'); },
    get closeBtn() { return document.querySelector('.close'); },
    get btnCancelar() { return document.getElementById('btnCancelar'); },
    get btnNuevoProveedor() { return document.getElementById('btnNuevoProveedor'); },
    get btnConfirmDelete() { return document.getElementById('btnConfirmDelete'); },
    get btnCancelDelete() { return document.getElementById('btnCancelDelete'); },
    get btnLimpiarFiltros() { return document.getElementById('btnLimpiarFiltros'); },
    
    filters: {
        get sede() { return document.getElementById('filtroSede'); },
        get estado() { return document.getElementById('filtroEstado'); },
        get buscarProveedor() { return document.getElementById('buscarProveedor'); }
    },
    
    formFields: {
        get id() { return document.getElementById('proveedorId'); },
        get proveedor() { return document.getElementById('proveedor'); },
        get sede() { return document.getElementById('sede'); },
        get telefono() { return document.getElementById('telefono'); },
        get correo() { return document.getElementById('correo'); },
        get direccion() { return document.getElementById('direccion'); },
        get ciudad() { return document.getElementById('ciudad'); },
        get estado() { return document.getElementById('estado'); }
    },
    
    modalHeader: {
        get info() { return document.querySelector('.modal-header-info'); },
        get itemId() { return document.getElementById('modalItemId'); },
        get item() { return document.getElementById('modalItem'); },
        get responsable() { return document.getElementById('modalResponsable'); },
        get statusBadge() { return document.getElementById('modalStatusBadge'); }
    },
    
    pagination: {
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
        
        // Ocultar siempre el mensaje de no results cuando se muestra el loader
        if (show && DOM.noResults) {
            DOM.noResults.style.display = 'none';
        }
    },

    showNoResults(message = 'No se encontraron proveedores') {
        if (DOM.noResults) {
            DOM.noResults.textContent = message;
            DOM.noResults.style.display = 'block';
        }
        if (DOM.proveedoresBody) DOM.proveedoresBody.innerHTML = '';
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
    async fetchProveedores() {
        Utils.showLoader(true);
        try {
            const response = await fetch(`${CONFIG.API_URL}?api=proveedores`);
            if (!response.ok) throw new Error('Error en la respuesta de la API');
            
            const data = await response.json();
            const result = data?.data || [];
            
            // Ocultar el loader
            Utils.showLoader(false);
            
            // Solo mostrar no results si realmente no hay datos después de cargar
            if (result.length === 0) {
                Utils.showNoResults();
            }
            
            return result;
        } catch (error) {
            console.error('Error al obtener los proveedores:', error);
            Utils.showLoader(false);
            Utils.showNoResults('Error al cargar los datos');
            return [];
        }
    },

    async saveProveedor(proveedorData, isNew = true) {
        Utils.showActionOverlay(isNew ? 'Creando proveedor...' : 'Actualizando proveedor...');
        
        const payload = {
            api: 'proveedores',
            accion: 'guardar',
            proveedor: {
                ...proveedorData,
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
            
            Utils.showNotification('success', isNew ? 'Proveedor creado correctamente' : 'Proveedor actualizado correctamente');
            return true;
        } catch (error) {
            console.error('Error:', error);
            Utils.showNotification('error', 'Error: ' + error.message);
            return false;
        } finally {
            Utils.hideActionOverlay();
        }
    },

    async deleteProveedor(proveedorId) {
        Utils.showActionOverlay('Eliminando proveedor...');
        
        const payload = {
            api: 'proveedores',
            accion: 'borrar',
            codigo: proveedorId
        };
    
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Error al eliminar el proveedor');
            
            Utils.showNotification('success', 'Proveedor eliminado correctamente');
            return true;
        } catch (error) {
            console.error('Error:', error);
            Utils.showNotification('error', 'Error: ' + error.message);
            return false;
        } finally {
            Utils.hideActionOverlay();
        }
    }
};

/**
 * Controlador de UI
 */
const UIController = {
    initTable() {
        if (!DOM.proveedoresBody) return;
        
        DOM.proveedoresBody.innerHTML = '';
        DOM.noResults.style.display = 'none';
    },

    renderTableRow(item, index) {
        const rowId = item.CODIGO || index;
        const sedeFormatted = item.SEDE === 'ALL' ? 'AMBAS' : (item.SEDE || '-');
        const statusClass = item.ESTADO === CONFIG.STATUS.ACTIVE ? 'status-active' : 'status-inactive';
        
        const row = document.createElement('tr');
        row.dataset.id = rowId;
        row.innerHTML = `
            <td>${item.CODIGO || '-'}</td>
            <td>${item.PROVEEDOR || '-'}</td>
            <td>${sedeFormatted}</td>
            <td>${item.TELEFONO || '-'}</td>
            <td>${item.CORREO || '-'}</td>
            <td>${item.CIUDAD || '-'}</td>
            <td><span class="status-badge ${statusClass}">${item.ESTADO || 'N/A'}</span></td>
            <td>
                <div class="item-actions">
                    <button class="action-btn view-btn" title="Ver detalles"><i class="fas fa-eye"></i></button>
                    <button class="action-btn articles-btn" title="Ver artículos"><i class="fas fa-box"></i></button>
                    <button class="action-btn edit-btn" title="Editar proveedor"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" title="Eliminar proveedor"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        
        DOM.proveedoresBody.appendChild(row);
        this.renderDetailsRow(rowId, item);
        this.setupRowEventListeners(row, item, rowId);
    },

    renderDetailsRow(rowId, item) {
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row';
        detailsRow.dataset.parentId = rowId;
    
        detailsRow.innerHTML = `
            <td colspan="8">
                <div class="details-content">
                    <div class="detail-item">
                        <span class="detail-label">DIRECCIÓN:</span>
                        <span class="detail-value">${item.DIRECCION || 'No especificado'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">RESPONSABLE:</span>
                        <span class="detail-value">${item.RESPONSABLE || 'No especificado'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">FECHA MODIFICACIÓN:</span>
                        <span class="detail-value">${Utils.formatDate(item.FECHAMOD)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">HORA MODIFICACIÓN:</span>
                        <span class="detail-value">${Utils.formatTime(item.HORAMOD)}</span>
                    </div>
                </div>
            </td>
        `;
        
        DOM.proveedoresBody.appendChild(detailsRow);
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
        const sortedData = [...AppState.proveedoresData].sort((a, b) => {
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
        infoDiv.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} proveedores`;
        
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
        this.populateTable(AppState.filteredData || AppState.proveedoresData);
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
            estado: new Set([CONFIG.STATUS.ACTIVE, CONFIG.STATUS.INACTIVE])
        };
        
        this.populateFilter('sede', filterValues.sede, true);
        this.populateFilter('estado', filterValues.estado);
    },

    populateFilter(filterName, values, formatSede = false) {
        const filterElement = DOM.filters[filterName];
        if (!filterElement) return;
        
        // Clear all options including the first one
        filterElement.innerHTML = '';
        
        // Add placeholder option
        filterElement.appendChild(Utils.createOption('', filterName === 'sede' ? 'Todas' : 'Todos'));
        
        Array.from(values).sort().forEach(value => {
            const displayText = formatSede && value === 'ALL' ? 'AMBAS' : value;
            filterElement.appendChild(Utils.createOption(value, displayText));
        });
    },

    filterData() {
        const filters = {
            sede: DOM.filters.sede?.value.toLowerCase() || '',
            estado: DOM.filters.estado?.value.toUpperCase() || '',
            proveedorText: DOM.filters.buscarProveedor?.value.toLowerCase().trim() || ''
        };
        
        const filteredData = AppState.proveedoresData.filter(item => 
            (!filters.sede || (item.SEDE?.toLowerCase().includes(filters.sede))) &&
            (!filters.estado || (item.ESTADO === filters.estado)) &&
            (!filters.proveedorText || 
                (item.PROVEEDOR?.toLowerCase().includes(filters.proveedorText) ||
                 item.ID_PROVEEDOR?.toString().includes(filters.proveedorText)))
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
        this.populateTable(AppState.proveedoresData);
    },

    openNewProveedorModal() {
        this.setModalTitle('Nuevo Proveedor');
        this.hideModalHeaderInfo();
        DOM.proveedorForm.reset();
        DOM.proveedorForm.dataset.mode = 'new';
        
        // Reset form fields
        if (DOM.formFields.sede) {
            DOM.formFields.sede.value = '';
        }
        
        this.showModal();
    },

    openEditModal(item) {
        this.setModalTitle('Editar Proveedor');
        this.showModalHeaderInfo();
        this.setModalHeaderContent(item);
        
        // Set form values
        if (DOM.formFields.id) DOM.formFields.id.value = item.CODIGO || ''; // Cambiado de ID_PROVEEDOR a CODIGO
        if (DOM.formFields.proveedor) DOM.formFields.proveedor.value = item.PROVEEDOR || '';
        if (DOM.formFields.sede) DOM.formFields.sede.value = item.SEDE || '';
        if (DOM.formFields.telefono) DOM.formFields.telefono.value = item.TELEFONO || '';
        if (DOM.formFields.correo) DOM.formFields.correo.value = item.CORREO || '';
        if (DOM.formFields.direccion) DOM.formFields.direccion.value = item.DIRECCION || '';
        if (DOM.formFields.ciudad) DOM.formFields.ciudad.value = item.CIUDAD || '';
        if (DOM.formFields.estado) DOM.formFields.estado.value = item.ESTADO || CONFIG.STATUS.ACTIVE;
        
        DOM.proveedorForm.dataset.mode = 'edit';
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
            DOM.modalHeader.item.textContent = item.PROVEEDOR || '';
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
        if (DOM.proveedorModal) DOM.proveedorModal.style.display = 'block';
    },

    closeModal() {
        if (DOM.proveedorModal) DOM.proveedorModal.style.display = 'none';
    },

    openDeleteConfirmation(item) {
        AppState.currentItemToDelete = item;
        const confirmMessage = document.getElementById('confirmDeleteMessage');
        
        if (confirmMessage) {
            const itemCode = item.CODIGO || 'desconocido';
            const itemName = item.PROVEEDOR || 'sin nombre';
            confirmMessage.innerHTML = `¿Está seguro que desea eliminar el proveedor:<br>
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
        
        const success = await ApiController.deleteProveedor(
            AppState.currentItemToDelete.CODIGO
        );
        
        if (success) {
            this.closeConfirmModal();
            ProveedoresController.fetchProveedoresData();
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formValues = {            
            proveedor: DOM.formFields.proveedor ? DOM.formFields.proveedor.value : '',
            sede: DOM.formFields.sede ? DOM.formFields.sede.value : '',
            telefono: DOM.formFields.telefono ? DOM.formFields.telefono.value : '',
            correo: DOM.formFields.correo ? DOM.formFields.correo.value : '',
            direccion: DOM.formFields.direccion ? DOM.formFields.direccion.value : '',
            ciudad: DOM.formFields.ciudad ? DOM.formFields.ciudad.value : '',
            estado: DOM.formFields.estado ? DOM.formFields.estado.value : CONFIG.STATUS.ACTIVE
        };
    
        // Validate required fields
        const requiredFields = ['proveedor', 'sede', 'telefono', 'estado'];
        const missingFields = requiredFields.filter(field => !formValues[field]);
    
        if (missingFields.length > 0) {
            Utils.showNotification('error', `Faltan campos requeridos: ${missingFields.join(', ')}`);
            return;
        }
        
        const mode = DOM.proveedorForm.dataset.mode;
        
        // Include proveedor code when in edit mode
        if (mode === 'edit') {
            formValues.codigo = DOM.formFields.id.value;
            
            if (!formValues.codigo) {
                Utils.showNotification('error', 'Error: No se pudo identificar el código del proveedor a editar');
                return;
            }
        }
        
        const success = await ApiController.saveProveedor(formValues, mode === 'new');
        if (success) {
            this.closeModal();
            ProveedoresController.fetchProveedoresData();
        }
    },

    setupEventListeners() {
        // Modal events
        if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', () => this.closeModal());
        if (DOM.btnCancelar) DOM.btnCancelar.addEventListener('click', () => this.closeModal());
        if (DOM.btnNuevoProveedor) DOM.btnNuevoProveedor.addEventListener('click', () => this.openNewProveedorModal());
        
        // Form submission
        if (DOM.proveedorForm) DOM.proveedorForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Delete confirmation
        if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.addEventListener('click', () => this.confirmDelete());
        if (DOM.btnCancelDelete) DOM.btnCancelDelete.addEventListener('click', () => this.closeConfirmModal());
        
        // Filter events
        Object.values(DOM.filters).forEach(filter => {
            if (filter) filter.addEventListener('change', () => this.filterData());
        });
        
        // Search input
        if (DOM.filters.buscarProveedor) {
            DOM.filters.buscarProveedor.addEventListener('input', () => this.filterData());
        }
        
        // Clear filters
        if (DOM.btnLimpiarFiltros) {
            DOM.btnLimpiarFiltros.addEventListener('click', () => this.clearFilters());
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === DOM.proveedorModal) this.closeModal();
            if (event.target === DOM.confirmModal) this.closeConfirmModal();
        });
    }
};

/**
 * Controlador de Proveedores
 */
const ProveedoresController = {
    async fetchProveedoresData() {
        const data = await ApiController.fetchProveedores();
        if (data.length) {
            this.processProveedoresData(data);
        }
    },

    processProveedoresData(data) {
        AppState.proveedoresData = data.map(item => ({
            ...item,
            ID_PROVEEDOR: item.ID_PROVEEDOR || item.id_proveedor,
            PROVEEDOR: item.PROVEEDOR || item.proveedor,
            SEDE: item.SEDE || item.sede,
            TELEFONO: item.TELEFONO || item.telefono,
            CORREO: item.CORREO || item.correo,
            DIRECCION: item.DIRECCION || item.direccion,
            CIUDAD: item.CIUDAD || item.ciudad,
            ESTADO: item.ESTADO || item.estado,
            RESPONSABLE: item.RESPONSABLE || item.responsable,
            FECHAMOD: item.FECHAMOD || item.fechamod,
            HORAMOD: item.HORAMOD || item.horamod
        }));
        
        UIController.populateTable(AppState.proveedoresData);
        UIController.populateFilters(AppState.proveedoresData);
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

/**
 * Inicialización de la aplicación
 */
async function init() {
    if (!SessionController.checkSession()) return;
    
    UIController.setupEventListeners();
    ProveedoresController.fetchProveedoresData();
    
    // Configuración inicial de paginación
    if (DOM.pagination.bottom) DOM.pagination.bottom.style.display = 'flex';
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// Agregar al objeto DOM
DOM.articulosProveedor = {
    get modal() { return document.getElementById('articulosProveedorModal'); },
    get closeBtn() { return DOM.articulosProveedor.modal.querySelector('.close'); },
    get table() { return document.getElementById('articulosTable'); },
    get tbody() { return document.getElementById('articulosBody'); },
    get noArticulos() { return document.getElementById('noArticulos'); },
    get proveedorName() { return document.getElementById('proveedorName'); }
};

// Agregar al objeto ApiController
ApiController.fetchArticulosByProveedor = async (proveedorId) => {
    Utils.showLoader(true);
    try {
        // Modificar la URL para incluir el ID_PROVEEDOR como parámetro
        const response = await fetch(`${CONFIG.API_URL}?api=articulos&accion=proveedor&ID_PROVEEDOR=${proveedorId}`);
        if (!response.ok) throw new Error('Error al obtener los artículos');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Error al obtener los artículos');
        
        // Asegurarnos de que solo retornamos los artículos que coinciden exactamente con el ID_PROVEEDOR
        return (data?.data || []).filter(articulo => 
            String(articulo.ID_PROVEEDOR).trim() === String(proveedorId).trim()
        );
    } catch (error) {
        console.error('Error:', error);
        Utils.showNotification('error', 'Error al cargar los artículos del proveedor');
        return [];
    } finally {
        Utils.showLoader(false);
    }
};

UIController.showArticulosProveedor = async (proveedor) => {
    // Validar que tengamos el ID_PROVEEDOR
    if (!proveedor.ID_PROVEEDOR) {
        Utils.showNotification('error', 'ID de proveedor no válido');
        return;
    }

    DOM.articulosProveedor.proveedorName.textContent = proveedor.PROVEEDOR;
    DOM.articulosProveedor.tbody.innerHTML = '';
    DOM.articulosProveedor.noArticulos.style.display = 'none';
    
    // Obtener los artículos del proveedor
    const articulos = await ApiController.fetchArticulosByProveedor(proveedor.ID_PROVEEDOR);
    
    console.log('ID_PROVEEDOR:', proveedor.ID_PROVEEDOR);
    console.log('Artículos encontrados:', articulos.length);
    
    if (!articulos || articulos.length === 0) {
        DOM.articulosProveedor.noArticulos.style.display = 'block';
        return;
    }
    
    articulos.forEach(articulo => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${articulo.CODIGO || ''}</td>
            <td>${articulo.ITEM || articulo.NOMBRE || ''}</td>
            <td>${articulo.CATEGORIA || ''}</td>
            <td><span class="status-badge ${articulo.ESTADO === 'ACTIVO' ? 'status-active' : 'status-inactive'}">${articulo.ESTADO || ''}</span></td>
        `;
        DOM.articulosProveedor.tbody.appendChild(row);
    });
    
    DOM.articulosProveedor.modal.style.display = 'block';
};

// Modificar la función setupRowEventListeners
UIController.setupRowEventListeners = function(row, item, rowId) {
    const viewBtn = row.querySelector('.view-btn');
    const articlesBtn = row.querySelector('.articles-btn');
    const editBtn = row.querySelector('.edit-btn');
    const deleteBtn = row.querySelector('.delete-btn');
    
    if (viewBtn) viewBtn.addEventListener('click', () => this.toggleDetails(rowId));
    if (articlesBtn) articlesBtn.addEventListener('click', () => this.showArticulosProveedor(item));
    if (editBtn) editBtn.addEventListener('click', () => this.openEditModal(item));
    if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDeleteConfirmation(item);
    });
};

// Agregar al evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... existing event listeners ...
    
    // Agregar evento para cerrar el modal de artículos
    DOM.articulosProveedor.closeBtn.addEventListener('click', () => {
        DOM.articulosProveedor.modal.style.display = 'none';
    });
});