const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec',
    ITEMS_PER_PAGE: 10,
    MAX_VISIBLE_PAGES: 5,
    STATUS: {
        PENDING: 'PENDIENTE',
        RECEIVED: 'RECIBIDO',
        CANCELLED: 'ANULADO'
    },
    CACHE_EXPIRATION: 300000 // 5 minutos en milisegundos
};

const AppState = {
    pedidosData: [],
    filteredData: [],
    currentItemToDelete: null,
    currentItemToChangeState: null,
    newState: '',
    currentPage: 1,
    totalPages: 1,
    proveedores: [],
    currentArticulos: [],
    sortConfig: {
        column: '',
        direction: 'asc'
    },
    articulosPrecargados: {},
    proveedoresPrecargados: [],
    lastFetchTime: 0,
    isDataLoading: false
};

/** * Cache de elementos DOM */
const DOM = {
    get loader() { return document.getElementById('loader'); },
    get pedidosBody() { return document.getElementById('pedidosBody'); },
    get noResults() { return document.getElementById('noResults'); },
    get userName() { return document.getElementById('userName'); },
    get pedidoModal() { return document.getElementById('pedidoModal'); },
    get confirmModal() { return document.getElementById('confirmModal'); },
    get confirmEstadoModal() { return document.getElementById('confirmEstadoModal'); },
    get pedidoForm() { return document.getElementById('pedidoForm'); },
    get modalTitle() { return document.getElementById('modalTitle'); },
    get closeBtn() { return document.querySelector('#pedidoModal .close'); },
    get btnCancelar() { return document.getElementById('btnCancelar'); },
    get btnNuevoPedido() { return document.getElementById('btnNuevoPedido'); },
    get btnConfirmDelete() { return document.getElementById('btnConfirmDelete'); },
    get btnCancelDelete() { return document.getElementById('btnCancelDelete'); },
    get btnConfirmEstado() { return document.getElementById('btnConfirmEstado'); },
    get btnCancelEstado() { return document.getElementById('btnCancelEstado'); },
    get btnLimpiarFiltros() { return document.getElementById('btnLimpiarFiltros'); },
    get viewModal() { return document.getElementById('viewModal'); },
    get viewModalCloseBtn() { return document.querySelector('#viewModal .close'); },
    get articlesModal() { return document.getElementById('articlesModal'); },
    get articlesModalCloseBtn() { return document.querySelector('#articlesModal .close'); },
    get articlesModalBody() { return document.getElementById('articlesModalContentBody'); },
    get articlesTableBody() { return document.getElementById('articlesTableBody'); },
    get articulosContainer() { return document.getElementById('articulosContainer'); },
    get btnAddArticulo() { return document.getElementById('btnAddArticulo'); },
    
    filters: {
        get sede() { return document.getElementById('filtroSede'); },
        get estado() { return document.getElementById('filtroEstado'); },
        get buscarPedido() { return document.getElementById('buscarPedido'); }
    },
    
    formFields: {
        get id() { return document.getElementById('pedidoId'); },
        get sede() { return document.getElementById('sede'); },
        get id_proveedor() { return document.getElementById('id_proveedor'); },
        get motivo() { return document.getElementById('motivo'); }
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

/** * Precarga de datos optimizada */
async function precargarDatos() {
    if (AppState.isDataLoading) return;
    AppState.isDataLoading = true;
    
    try {
        Utils.showLoader(true);
        
        // Precargar proveedores solo si no están en caché o han expirado
        const shouldFetchProveedores = AppState.proveedoresPrecargados.length === 0 || 
                                      Date.now() - AppState.lastFetchTime > CONFIG.CACHE_EXPIRATION;
        
        if (shouldFetchProveedores) {
            AppState.proveedoresPrecargados = await ApiController.fetchProveedores();
            AppState.lastFetchTime = Date.now();
        }
        
        // Precargar artículos para todas las sedes en paralelo
        const sedes = ['ALL', 'FILANDIA', 'SANTA ROSA'];
        const fetchPromises = sedes.map(async sede => {
            if (!AppState.articulosPrecargados[sede]) {
                try {
                    AppState.articulosPrecargados[sede] = await ApiController.fetchArticulos(sede);
                } catch (error) {
                    console.error(`Error al cargar artículos para sede ${sede}:`, error);
                    AppState.articulosPrecargados[sede] = [];
                }
            }
        });
        
        await Promise.all(fetchPromises);
        
    } catch (error) {
        console.error('Error en precargarDatos:', error);
        throw error;
    } finally {
        AppState.isDataLoading = false;
        Utils.showLoader(false);
    }
}

/** * Utilidades comunes optimizadas */
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
        if (show && DOM.noResults) DOM.noResults.style.display = 'none';
    },

    showNoResults(message = 'No se encontraron pedidos') {
        if (DOM.noResults) {
            DOM.noResults.textContent = message;
            DOM.noResults.style.display = 'block';
        }
        if (DOM.pedidosBody) DOM.pedidosBody.innerHTML = '';
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

    populateSelect(selectElement, values, formatter = null, selectedValue = null) {
        if (!selectElement) return;
        this.clearSelectOptions(selectElement);
        
        const sortedValues = [...values].sort((a, b) => String(a).localeCompare(String(b)));
        sortedValues.forEach(value => {
            const displayText = formatter ? formatter(value) : value;
            const option = this.createOption(value, displayText);
            selectElement.appendChild(option);
        });

        if (selectedValue !== null) {
            selectElement.value = selectedValue;
        }
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

/** * Controlador de API optimizado */
const ApiController = {
    async fetchData(endpoint, params = {}) {
        try {
            const url = new URL(CONFIG.API_URL);
            url.searchParams.set('api', endpoint);
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });

            const response = await fetch(url);
            if (!response.ok) throw new Error('Error en la respuesta de la API');
            return await response.json();
        } catch (error) {
            console.error(`Error al obtener datos de ${endpoint}:`, error);
            throw error;
        }
    },

    async fetchPedidos() {
        try {
            Utils.showLoader(true);
            const data = await this.fetchData('pedidos');
            
            if (!data) throw new Error('No se recibieron datos del servidor');
            
            const result = data?.data || [];
            
            if (result.length === 0) {
                Utils.showNoResults('No se encontraron pedidos registrados');
            }
            
            return result;
        } catch (error) {
            console.error('Error en fetchPedidos:', error);
            Utils.showNoResults('Error al cargar los datos. Por favor intente más tarde.');
            return [];
        } finally {
            Utils.showLoader(false);
        }
    },

    async fetchProveedores() {
        try {
            const data = await this.fetchData('proveedores');
            return data?.data || [];
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            return [];
        }
    },

    async fetchArticulos(sede) {
        try {
            const data = await this.fetchData('articulos', { sede });
            return data?.data || [];
        } catch (error) {
            console.error(`Error al cargar artículos para sede ${sede}:`, error);
            return [];
        }
    },

    async savePedido(pedidoData, isNew = true) {
        Utils.showActionOverlay(isNew ? 'Creando pedido...' : 'Actualizando pedido...');
        
        const pedido = {
            nro_pedido: pedidoData.codigo || `PD${Date.now().toString().slice(-6)}`,
            sede: pedidoData.sede,
            id_proveedor: pedidoData.id_proveedor,
            responsable: pedidoData.responsable || sessionStorage.getItem('usuario') || 'Sistema',
            observaciones: pedidoData.observaciones || '',
            articulos: pedidoData.articulos || [],
            motivo: '1'
        };
    
        const payload = {
            api: 'pedidos',
            accion: 'guardar',
            pedido: pedido
        };
    
        try {
            console.log('Enviando payload a la API:', payload);
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            console.log('Respuesta de la API:', data);
            if (!data.success) throw new Error(data.message || 'Error al procesar la solicitud');
            
            Utils.showNotification('success', isNew ? 'Pedido creado correctamente' : 'Pedido actualizado correctamente');
            return true;
        } catch (error) {
            console.error('Error:', error);
            Utils.showNotification('error', 'Error: ' + error.message);
            return false;
        } finally {
            Utils.hideActionOverlay();
        }
    },

    async changePedidoState(pedidoId, newState, observaciones = '') {
        Utils.showActionOverlay(`Cambiando estado a ${newState}...`);
        
        try {
            // Obtener pedidos actualizados
            const pedidosActuales = await this.fetchPedidos();
            
            // Buscar el pedido normalizando los IDs a string
            const pedidoActual = pedidosActuales.find(p => 
                String(p.NRO_PEDIDO) === String(pedidoId) || 
                String(p.CODIGO) === String(pedidoId)
            );
            
            if (!pedidoActual) {
                throw new Error(`Pedido ${pedidoId} no encontrado. Verifique el número.`);
            }
    
            const payload = {
                api: 'pedidos',
                accion: newState === 'ANULADO' ? 'borrar' : 'guardar',
                pedido: {
                    nro_pedido: pedidoActual.NRO_PEDIDO || pedidoActual.CODIGO,
                    motivo: newState === 'RECIBIDO' ? '2' : '3',
                    responsable: sessionStorage.getItem('usuario') || 'Sistema'
                }
            };
    
            // Incluir todos los datos para RECIBIDO
            if (newState === 'RECIBIDO') {
                payload.pedido = {
                    ...payload.pedido,
                    sede: pedidoActual.SEDE,
                    id_proveedor: pedidoActual.ID_PROVEEDOR,
                    articulos: pedidoActual.ARTICULOS || []
                };
            }
    
            // Agregar observaciones para ANULADO
            if (newState === 'ANULADO') {
                payload.pedido.observaciones = observaciones;
            }
    
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Error al cambiar el estado del pedido');
            
            Utils.showNotification('success', `Estado del pedido cambiado a ${newState}`);
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

/** * Controlador de UI optimizado */
const UIController = {
    initTable() {
        if (!DOM.pedidosBody) return;
        DOM.pedidosBody.innerHTML = '';
        if (DOM.noResults) DOM.noResults.style.display = 'none';
    },

    createTableRow(item, rowId) {
        const sedeFormatted = item.SEDE === 'ALL' ? 'AMBAS' : (item.SEDE || '-');
        const statusClass = item.ESTADO === CONFIG.STATUS.CANCELLED ? 'status-inactive' : 
                          (item.ESTADO === CONFIG.STATUS.RECEIVED ? 'status-active' : 'status-warning');
        
        const row = document.createElement('tr');
        row.dataset.id = rowId;
        row.innerHTML = `
            <td>${item.NRO_PEDIDO || '-'}</td>
            <td>${sedeFormatted}</td>
            <td class="proveedor-name">${item.PROVEEDOR || 'No especificado'}</td>
            <td class="cantidad-articulos">${item.ARTICULOS ? item.ARTICULOS.reduce((sum, articulo) => sum + (parseInt(articulo.CANTIDAD) || 0), 0) : 0}</td>
            <td>${item.FECHAPED || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${item.ESTADO || 'N/A'}</span></td>
            <td>
                <div class="item-actions">
                    <button class="action-btn view-btn" title="Ver detalles"><i class="fas fa-eye"></i></button>
                    <button class="action-btn articles-btn" title="Ver Artículos"><i class="fas fa-box"></i></button>
                    ${item.ESTADO === CONFIG.STATUS.PENDING ? 
                        `<button class="action-btn receive-btn" title="Marcar como recibido"><i class="fas fa-check-circle"></i></button>
                         <button class="action-btn cancel-btn" title="Anular pedido"><i class="fas fa-ban"></i></button>` : ''}
                </div>
            </td>
        `;
        
        return row;
    },

    closeViewModal() {
        if (DOM.viewModal) DOM.viewModal.classList.remove('show');
    },


    closeArticlesModal() {
        if (DOM.articlesModal) DOM.articlesModal.classList.remove('show');
    },

    renderArticuloRow(index, articulo = {}) {
        const row = document.createElement('div');
        row.classList.add('articulo-row');
        row.dataset.index = index;
        row.innerHTML = `
            <div class="form-group required-field">
                <label for="codigo-${index}">Artículo:</label>
                <select id="codigo-${index}" class="articulo-codigo" required>
                    <option value="">Seleccionar Artículo</option>
                </select>
            </div>
            <div class="form-group">
                <label for="presentacion-${index}">Presentación:</label>
                <input type="text" id="presentacion-${index}" class="articulo-presentacion" value="${articulo.presentacion || ''}">
            </div>
            <div class="form-group required-field">
                <label for="cantidad-${index}">Cantidad:</label>
                <input type="number" id="cantidad-${index}" class="articulo-cantidad" min="1" required value="${articulo.cantidad || ''}">
            </div>
            <div class="form-group">
                <label for="observaciones-${index}">Observaciones:</label>
                <input type="text" id="observaciones-${index}" class="articulo-observaciones" value="${articulo.observaciones || ''}">
            </div>
            <button type="button" class="btn-remove-articulo"><i class="fas fa-trash"></i></button>
        `;
        DOM.articulosContainer.appendChild(row);

        // Populate initial dropdowns if data is available
        this.populateArticuloDropdowns(row, articulo);

        // Add event listeners for dynamic changes
        row.querySelector(`.articulo-codigo`).addEventListener('change', (e) => this.handleArticuloChange(e, index, 'codigo'));
        row.querySelector(`.articulo-presentacion`).addEventListener('input', (e) => this.handleArticuloChange(e, index, 'presentacion'));
        row.querySelector(`.articulo-cantidad`).addEventListener('input', (e) => this.handleArticuloChange(e, index, 'cantidad'));
        row.querySelector(`.articulo-observaciones`).addEventListener('input', (e) => this.handleArticuloChange(e, index, 'observaciones'));
        row.querySelector('.btn-remove-articulo').addEventListener('click', () => this.removeArticuloRow(index));
    },

    addArticuloRow(articulo = {}) {
        const index = AppState.currentArticulos.length;
        AppState.currentArticulos.push(articulo);
        this.renderArticuloRow(index, articulo);
    },

    removeArticuloRow(index) {
        AppState.currentArticulos.splice(index, 1);
        this.renderArticuloRows(); // Re-render all to update indices
    },

    renderArticuloRows() {
        DOM.articulosContainer.innerHTML = '';
        AppState.currentArticulos.forEach((articulo, index) => this.renderArticuloRow(index, articulo));
    },

    populateArticuloDropdowns(row, articulo = {}) {
        const sede = DOM.formFields.sede.value;
        const id_proveedor = DOM.formFields.id_proveedor.value;
        const codigoDropdown = row.querySelector('.articulo-codigo');
        
        if (!sede || !id_proveedor || !codigoDropdown) return;

        const articulosSede = AppState.articulosPrecargados[sede] || [];
        const articulosFiltrados = articulosSede.filter(a => 
            String(a.ID_PROVEEDOR) === String(id_proveedor) || 
            String(a.CODIGO_PROVEEDOR) === String(id_proveedor)
        );

        const codigos = [...new Set(articulosFiltrados.map(a => a.CODIGO))];
        Utils.populateSelect(codigoDropdown, codigos, (val) => {
            const art = articulosFiltrados.find(a => a.CODIGO === val);
            return art ? `${art.ITEM} (${art.CODIGO})` : val;
        }, articulo.codigo);
    },

    handleArticuloChange(event, index, field) {
        if (field === 'cantidad') {
            AppState.currentArticulos[index][field] = parseInt(event.target.value) || 0;
        } else if (field === 'codigo') {
            const selectedCodigo = event.target.value;
            AppState.currentArticulos[index].codigo = selectedCodigo;
            
            // Find the corresponding item name from precargados
            const sede = DOM.formFields.sede.value;
            const articulosForSede = AppState.articulosPrecargados[sede] || [];
            const articuloData = articulosForSede.find(a => a.CODIGO === selectedCodigo);
            if (articuloData) {
                AppState.currentArticulos[index].item = articuloData.ITEM;
            } else {
                AppState.currentArticulos[index].item = '';
            }
        } else {
            AppState.currentArticulos[index][field] = event.target.value;
        }
    },

    async openViewModal(item) {
        if (!DOM.viewModal) return;
        
        const proveedor = await this.getProveedorName(item.ID_PROVEEDOR);
        const modalBody = DOM.viewModal.querySelector('.modal-body');
        if (!modalBody) return;

        let modalContent = '';
        const fechaPedido = Utils.formatDate(item.FECHAPED);
        const fechaModificacion = Utils.formatDate(item.FECHAMOD);

        modalContent = `
            <div class="modal-detail-row">
                <span class="modal-label">PROVEEDOR:</span>
                <span class="modal-value">${proveedor || 'No especificado'}</span>
            </div>
            <div class="modal-detail-row">
                <span class="modal-label">FECHA PEDIDO:</span>
                <span class="modal-value">${fechaPedido || 'No especificado'}</span>
            </div>
            <div class="modal-detail-row">
                <span class="modal-label">RESPONSABLE:</span>
                <span class="modal-value">${item.RESPONSABLE || 'No especificado'}</span>
            </div>
            <div class="modal-detail-row">
                <span class="modal-label">ESTADO:</span>
                <span class="modal-value">${item.ESTADO || 'No especificado'}</span>
            </div>
            ${item.ESTADO === CONFIG.STATUS.RECEIVED ? `
            <div class="modal-detail-row">
                <span class="modal-label">FECHA RECIBIDO:</span>
                <span class="modal-value">${fechaModificacion || 'No especificado'}</span>
            </div>
            <div class="modal-detail-row">
                <span class="modal-label">RECIBIDO POR:</span>
                <span class="modal-value">${item.RECIBIDO || 'No especificado'}</span>
            </div>` : ''}
            ${item.ESTADO === CONFIG.STATUS.CANCELLED ? `
            <div class="modal-detail-row">
                <span class="modal-label">FECHA ANULACIÓN:</span>
                <span class="modal-value">${fechaModificacion || 'No especificado'}</span>
            </div>
            <div class="modal-detail-row">
                <span class="modal-label">ANULADO POR:</span>
                <span class="modal-value">${item.ANULADO || 'No especificado'}</span>
            </div>
            <div class="modal-detail-row">
                <span class="modal-label">OBSERVACIONES:</span>
                <span class="modal-value">${item.OBSERVACIONES || 'No especificado'}</span>
            </div>` : ''}
            </div>
        `;

        modalBody.innerHTML = modalContent;
        DOM.viewModal.classList.add('show');
    },

    openArticlesModal(item) {
        const modalBody = DOM.articlesModalBody;
        const tbody = DOM.articlesTableBody;
        tbody.innerHTML = ''; // Clear previous content

        if (item.ARTICULOS && item.ARTICULOS.length > 0) {
            item.ARTICULOS.forEach(articulo => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${articulo.CODIGO || ''}</td>
                    <td>${articulo.ITEM || ''}</td>
                    <td>${articulo.TIPO || ''}</td>
                    <td>${articulo.CATEGORIA || ''}</td>
                    <td>${articulo.MODELO || ''}</td>
                    <td>${articulo.PRESENTACION || ''}</td>
                    <td>${articulo.CANTIDAD || ''}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7">No hay artículos asociados a este pedido.</td>';
            tbody.appendChild(row);
        }
        DOM.articlesModal.classList.add('show');
    },

    async getProveedorName(id_proveedor) {
        if (!id_proveedor) return 'No especificado';
        
        if (AppState.proveedores.length === 0) {
            try {
                AppState.proveedores = await ApiController.fetchProveedores();
            } catch (error) {
                console.error('Error al obtener proveedores:', error);
                return 'Error al obtener proveedor';
            }
        }
        
        const proveedor = AppState.proveedores.find(p => 
            String(p.ID_PROVEEDOR) === String(id_proveedor) || 
            String(p.CODIGO) === String(id_proveedor)
        );
        
        return proveedor ? proveedor.PROVEEDOR : 'Proveedor no encontrado';
    },

    setupRowEventListeners(row, item) {
        const viewBtn = row.querySelector('.view-btn');
        const articlesBtn = row.querySelector('.articles-btn');
        const receiveBtn = row.querySelector('.receive-btn');
        const cancelBtn = row.querySelector('.cancel-btn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => this.openViewModal(item));
        }

        if (articlesBtn) {
            articlesBtn.addEventListener('click', () => this.openArticlesModal(item));
        }
        
        if (receiveBtn) {
            receiveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openChangeStateConfirmation(item, CONFIG.STATUS.RECEIVED);
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openChangeStateConfirmation(item, CONFIG.STATUS.CANCELLED);
            });
        }

    },

    renderTableRow(item, index) {
        const rowId = item.NRO_PEDIDO || index;
        const row = this.createTableRow(item, rowId);
        if (DOM.pedidosBody) {
            DOM.pedidosBody.appendChild(row);
            this.setupRowEventListeners(row, item);
        }
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
        const sortedData = [...AppState.pedidosData].sort((a, b) => {
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
        infoDiv.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} pedidos`;
        
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
        this.populateTable(AppState.filteredData || AppState.pedidosData);
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
            sede: new Set(['FILANDIA', 'SANTA ROSA']),
            estado: new Set([CONFIG.STATUS.PENDING, CONFIG.STATUS.RECEIVED, CONFIG.STATUS.CANCELLED])
        };        
        this.populateFilter('sede', filterValues.sede, true);
        this.populateFilter('estado', filterValues.estado);
    },

    populateFilter(filterName, values, formatSede = false) {
        const filterElement = DOM.filters[filterName];
        if (!filterElement) return;
        
        filterElement.innerHTML = '';
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
            pedidoText: DOM.filters.buscarPedido?.value.toLowerCase().trim() || ''
        };        
        const filteredData = AppState.pedidosData.filter(item => 
            (!filters.sede || (item.SEDE?.toLowerCase().includes(filters.sede))) &&
            (!filters.estado || (item.ESTADO === filters.estado)) &&
            (!filters.pedidoText || 
                (item.ITEM?.toLowerCase().includes(filters.pedidoText) ||
                 item.CODIGO?.toString().includes(filters.pedidoText) ||
                 item.PROVEEDOR?.toLowerCase().includes(filters.pedidoText)))
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
        this.populateTable(AppState.pedidosData);
    },

    async handleFormSubmit(e) {
        e.preventDefault();

        const articulos = AppState.currentArticulos.map(articulo => ({
            codigo: articulo.codigo,
            cantidad: parseInt(articulo.cantidad),
            presentacion: articulo.presentacion || '',
            observaciones: articulo.observaciones || ''
        }));

        const pedidoData = {
            codigo: DOM.formFields.id.value,
            sede: DOM.formFields.sede.value,
            id_proveedor: DOM.formFields.id_proveedor.value,
            motivo: 1,
            responsable: sessionStorage.getItem('usuario') || 'Sistema',
            observaciones: '',
            articulos: articulos
        };

        // Validar campos requeridos
        const requiredFields = ['sede', 'id_proveedor'];
        const missingFields = requiredFields.filter(field => !pedidoData[field]);

        if (missingFields.length > 0) {
            Utils.showNotification('error', `Faltan campos requeridos: ${missingFields.join(', ')}`);
            return;
        }

        if (pedidoData.articulos.length === 0) {
            Utils.showNotification('error', 'Debe agregar al menos un artículo al pedido.');
            return;
        }

        // Validar que cada artículo tenga código y cantidad
        const articulosInvalidos = pedidoData.articulos.filter(articulo => {
            return !articulo.codigo || !articulo.cantidad || isNaN(articulo.cantidad) || parseInt(articulo.cantidad) <= 0;
        });

        if (articulosInvalidos.length > 0) {
            Utils.showNotification('error', 'Todos los artículos deben tener un código y una cantidad válida (mayor que 0).');
            return;
        }

        const isNew = !pedidoData.codigo;
        const success = await ApiController.savePedido(pedidoData, isNew);

        if (success) {
            this.closeModal();
            PedidosController.fetchPedidosData();
        }
    },

    async openNewPedidoModal() {
        this.setModalTitle('Nuevo Pedido');
        this.hideModalHeaderInfo();
        
        if (DOM.pedidoForm) {
            DOM.pedidoForm.reset();
            DOM.pedidoForm.dataset.mode = 'new';
        }
        
        // Clear current articles for a new order
        AppState.currentArticulos = [];
        this.renderArticuloRows();

        // Asegurar que los datos estén precargados
        if (Object.keys(AppState.articulosPrecargados).length === 0) {
            Utils.showLoader(true);
            await precargarDatos();
            Utils.showLoader(false);
        }

        // Populate sede dropdown
        const sedesDisponibles = Object.keys(AppState.articulosPrecargados).filter(sede => sede !== 'ALL');
        Utils.populateSelect(DOM.formFields.sede, sedesDisponibles);

        // Set a default sede if none is selected
        if (!DOM.formFields.sede.value && sedesDisponibles.length > 0) {
            DOM.formFields.sede.value = sedesDisponibles[0];
        }

        // Populate proveedores dropdown based on selected sede value
        const selectedSede = DOM.formFields.sede.value;
        if (selectedSede) {
            const proveedoresSede = AppState.proveedoresPrecargados.filter(p => p.SEDE === selectedSede || p.SEDE === 'ALL');
            Utils.populateSelect(DOM.formFields.id_proveedor, proveedoresSede.map(p => p.ID_PROVEEDOR), (val) => {
                const prov = proveedoresSede.find(p => p.ID_PROVEEDOR === val);
                return prov ? prov.PROVEEDOR : val;
            });
        } else if (DOM.formFields.id_proveedor) {
            Utils.clearSelectOptions(DOM.formFields.id_proveedor);
        }
        
        this.showModal();
    },

    async openEditModal(item) {
        this.setModalTitle('Editar Pedido');
        this.showModalHeaderInfo();
        this.setModalHeaderContent(item);
        
        // Set form values
        if (DOM.formFields.id) DOM.formFields.id.value = item.CODIGO || '';
        if (DOM.formFields.sede) DOM.formFields.sede.value = item.SEDE || '';
        if (DOM.formFields.motivo) DOM.formFields.motivo.value = item.MOTIVO || '';

        // Populate articles
        AppState.currentArticulos = item.ARTICULOS ? item.ARTICULOS.map(art => ({
            codigo: art.CODIGO || '',
            item: art.ITEM || '',
            presentacion: art.PRESENTACION || '',
            cantidad: art.CANTIDAD || 0,
            observaciones: art.OBSERVACIONES || ''
        })) : [];
        this.renderArticuloRows();

        // Cargar proveedores y seleccionar el actual
        const proveedores = await ApiController.fetchProveedores();
        this.populateProveedoresDropdown(proveedores, item.ID_PROVEEDOR);
        
        DOM.pedidoForm.dataset.mode = 'edit';
        this.showModal();
    },

    populateProveedoresDropdown(proveedores, selectedId = null) {
        const dropdown = DOM.formFields.id_proveedor;
        if (!dropdown) return;
        
        // Limpiar opciones excepto la primera
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }        
        
        // Ordenar proveedores por nombre
        proveedores.sort((a, b) => (a.PROVEEDOR || '').localeCompare(b.PROVEEDOR || ''));
        
        // Agregar opciones
        proveedores.forEach(proveedor => {
            const option = document.createElement('option');
            option.value = proveedor.ID_PROVEEDOR || proveedor.CODIGO;
            option.textContent = proveedor.PROVEEDOR || 'Proveedor desconocido';
            option.dataset.idProveedor = proveedor.ID_PROVEEDOR || proveedor.CODIGO;
            dropdown.appendChild(option);
            
            // Seleccionar el proveedor actual si es edición
            if (selectedId && (String(proveedor.ID_PROVEEDOR) === String(selectedId) || 
                String(proveedor.CODIGO) === String(selectedId))) {
                dropdown.value = proveedor.ID_PROVEEDOR || proveedor.CODIGO;
                dropdown.dataset.idProveedor = proveedor.ID_PROVEEDOR || proveedor.CODIGO;
            }
        });
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
            DOM.modalHeader.statusBadge.textContent = item.ESTADO || CONFIG.STATUS.PENDING;
            DOM.modalHeader.statusBadge.className = 'modal-status-badge';
            DOM.modalHeader.statusBadge.classList.add(
                item.ESTADO === CONFIG.STATUS.CANCELLED ? 'status-inactive' : 
                (item.ESTADO === CONFIG.STATUS.RECEIVED ? 'status-active' : 'status-warning')
            );
        }
    },

    showModal() {
        if (DOM.pedidoModal) DOM.pedidoModal.style.display = 'block';
    },

    closeModal() {
        if (DOM.pedidoModal) DOM.pedidoModal.style.display = 'none';
    },

    openDeleteConfirmation(item) {
        AppState.currentItemToDelete = item;
        const confirmMessage = document.getElementById('confirmDeleteMessage');
        
        if (confirmMessage) {
            const itemCode = item.CODIGO || 'desconocido';
            const itemName = item.ITEM || 'sin nombre';
            confirmMessage.innerHTML = `¿Está seguro que desea eliminar el pedido:<br>
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
        
        const success = await ApiController.changePedidoState(
            AppState.currentItemToDelete.CODIGO,
            CONFIG.STATUS.CANCELLED,
            'Pedido eliminado por el usuario'
        );
        
        if (success) {
            this.closeConfirmModal();
            PedidosController.fetchPedidosData();
        }
    },

    openChangeStateConfirmation(item, newState) {
        AppState.currentItemToChangeState = item;
        AppState.newState = newState;
        
        const estadoAccion = document.getElementById('estadoAccion');
        const confirmMessage = document.getElementById('confirmEstadoMessage');
        const observacionesContainer = document.getElementById('observacionesContainer');
        const observacionesInput = document.getElementById('observacionesInput');
        
        if (estadoAccion) estadoAccion.textContent = newState.toLowerCase();
        
        if (confirmMessage) {
            confirmMessage.innerHTML = `¿Está seguro que desea marcar el pedido:<br>
                <strong>${item.ITEM || 'sin nombre'}</strong><br>
                como <strong>${newState}</strong>?`;
        }
        
        // Mostrar/ocultar y configurar el campo de observaciones
        if (observacionesContainer && observacionesInput) {
            const isAnulado = newState === CONFIG.STATUS.CANCELLED;
            observacionesContainer.style.display = isAnulado ? 'block' : 'none';
            observacionesInput.required = isAnulado;
            if (!isAnulado) observacionesInput.value = '';
        }
        
        if (DOM.confirmEstadoModal) {
            DOM.confirmEstadoModal.style.display = 'block';
        }
    },
    
    async confirmChangeState() {
        if (!AppState.currentItemToChangeState || !AppState.newState) return;
        
        const observacionesInput = document.getElementById('observacionesInput');
        const isAnulado = AppState.newState === CONFIG.STATUS.CANCELLED;
        
        // Validar observaciones si es ANULADO
        if (isAnulado && (!observacionesInput || !observacionesInput.value.trim())) {
            Utils.showNotification('error', 'Debe ingresar las observaciones para anular el pedido');
            observacionesInput?.focus();
            return;
        }
        
        // Usar NRO_PEDIDO si existe, de lo contrario usar CODIGO
        const pedidoId = AppState.currentItemToChangeState.NRO_PEDIDO || 
                        AppState.currentItemToChangeState.CODIGO;
        
        if (!pedidoId) {
            Utils.showNotification('error', 'No se pudo identificar el número de pedido');
            return;
        }
        
        const success = await ApiController.changePedidoState(
            pedidoId,
            AppState.newState,
            isAnulado ? observacionesInput.value.trim() : ''
        );
        
        if (success) {
            this.closeChangeStateModal();
            PedidosController.fetchPedidosData();
        }
    },

    closeChangeStateModal() {
        if (DOM.confirmEstadoModal) {
            DOM.confirmEstadoModal.style.display = 'none';
        }
    },

    setupFormDependencies() {
        // Cuando cambia la sede
        DOM.formFields.sede?.addEventListener('change', async (e) => {
            const sede = e.target.value;
            
            // Limpiar y deshabilitar proveedor
            if (DOM.formFields.id_proveedor) {
                DOM.formFields.id_proveedor.value = '';
                DOM.formFields.id_proveedor.disabled = true;
            }
            
            // Clear and re-render articles when sede changes
            AppState.currentArticulos = [];
            this.renderArticuloRows();

            if (!sede) return;
            
            // Populate proveedores based on selected sede
            const proveedoresSede = AppState.proveedoresPrecargados.filter(p => p.SEDE === sede || p.SEDE === 'ALL');
            Utils.populateSelect(DOM.formFields.id_proveedor, proveedoresSede.map(p => p.ID_PROVEEDOR), (val) => {
                const prov = proveedoresSede.find(p => p.ID_PROVEEDOR === val);
                return prov ? prov.PROVEEDOR : val;
            });
            if (DOM.formFields.id_proveedor) DOM.formFields.id_proveedor.disabled = false;
        });

        // Cuando cambia el proveedor
        DOM.formFields.id_proveedor?.addEventListener('change', async (e) => {
            const sede = DOM.formFields.sede.value;
            const id_proveedor = e.target.value;

            // Clear and re-render articles when proveedor changes
            AppState.currentArticulos = [];
            this.renderArticuloRows();

            if (!sede || !id_proveedor) return;

            // Populate initial article row dropdowns if needed
            if (AppState.currentArticulos.length === 0) {
                this.addArticuloRow(); // Add an empty row to start
            }
        });
    },

    setupEventListeners() {
        // Modal events
        if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', () => this.closeModal());
        if (DOM.btnCancelar) DOM.btnCancelar.addEventListener('click', () => this.closeModal());
        if (DOM.viewModalCloseBtn) DOM.viewModalCloseBtn.addEventListener('click', () => this.closeViewModal());
        if (DOM.articlesModalCloseBtn) DOM.articlesModalCloseBtn.addEventListener('click', () => this.closeArticlesModal());
        if (DOM.btnNuevoPedido) DOM.btnNuevoPedido.addEventListener('click', () => this.openNewPedidoModal());
        
        // Form submission
        if (DOM.pedidoForm) DOM.pedidoForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        // Add article button
        if (DOM.btnAddArticulo) DOM.btnAddArticulo.addEventListener('click', () => this.addArticuloRow());
        
        // Delete confirmation
        if (DOM.btnConfirmDelete) DOM.btnConfirmDelete.addEventListener('click', () => this.confirmDelete());
        if (DOM.btnCancelDelete) DOM.btnCancelDelete.addEventListener('click', () => this.closeConfirmModal());
        
        // Change state confirmation
        if (DOM.btnConfirmEstado) DOM.btnConfirmEstado.addEventListener('click', () => this.confirmChangeState());
        if (DOM.btnCancelEstado) DOM.btnCancelEstado.addEventListener('click', () => this.closeChangeStateModal());
        
        // Filter events
        Object.values(DOM.filters).forEach(filter => {
            if (filter) filter.addEventListener('change', () => this.filterData());
        });
        
        // Search input
        if (DOM.filters.buscarPedido) {
            DOM.filters.buscarPedido.addEventListener('input', () => this.filterData());
        }
        
        // Clear filters
        if (DOM.btnLimpiarFiltros) {
            DOM.btnLimpiarFiltros.addEventListener('click', () => this.clearFilters());
        }
        
        // Agregar evento de cierre para el modal de vista
        const viewModalCloseBtn = DOM.viewModal?.querySelector('.close');
        if (viewModalCloseBtn) {
            viewModalCloseBtn.addEventListener('click', () => this.closeViewModal());
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === DOM.pedidoModal) this.closeModal();
            if (event.target === DOM.confirmModal) this.closeConfirmModal();
            if (event.target === DOM.confirmEstadoModal) this.closeChangeStateModal();
            if (event.target === DOM.viewModal) this.closeViewModal();
            if (event.target === DOM.articlesModal) this.closeArticlesModal();
        });

        // Configurar dependencias del formulario
        this.setupFormDependencies();
    }
};

/** * Controlador de Pedidos optimizado */
const PedidosController = {
    async fetchPedidosData() {
        try {
            const data = await ApiController.fetchPedidos();
            if (data.length) {
                this.processPedidosData(data);
            }
        } catch (error) {
            console.error('Error al cargar pedidos:', error);
            Utils.showNotification('error', 'Error al cargar los pedidos');
        }
    },

    processPedidosData(data) {
        try {
            if (!data || !Array.isArray(data)) {
                throw new Error('Datos de pedidos no válidos');
            }
    
            // Agrupar artículos por pedido y eliminar duplicados
            const pedidosUnicos = {};
            data.forEach(item => {
                const pedidoId = item.NRO_PEDIDO || item.CODIGO;
                if (!pedidosUnicos[pedidoId]) {
                    pedidosUnicos[pedidoId] = {
                        CODIGO: item.CODIGO || item.id_pedido || item.nro_pedido || '',
                        NRO_PEDIDO: pedidoId,
                        SEDE: item.SEDE || item.sede || 'No especificado',
                        TIPO: item.TIPO || item.tipo || 'No especificado',
                        CATEGORIA: item.CATEGORIA || item.categoria || 'No especificado',
                        ITEM: item.ITEM || item.item || '',
                        MODELO: item.MODELO || item.modelo || '',
                        PRESENTACION: item.PRESENTACION || item.presentacion || '',
                        CANTIDAD: item.CANTIDAD || item.cantidad || '0',
                        ID_PROVEEDOR: item.ID_PROVEEDOR || item.id_proveedor || '',
                        PROVEEDOR: AppState.proveedoresPrecargados.find(p => p.ID_PROVEEDOR === (item.ID_PROVEEDOR || item.id_proveedor))?.PROVEEDOR || 'No especificado',
                        FECHAPED: item.FECHAPED || item.fechaped || '',
                        RESPONSABLE: item.RESPONSABLE || item.responsable || 'No especificado',
                        ESTADO: item.ESTADO || item.estado || CONFIG.STATUS.PENDING,
                        FECHAMOD: item.FECHAMOD || '',
                        RECIBIDO: item.RECIBIDO || '',
                        ANULADO: item.ANULADO || '',
                        OBSERVACIONES: item.OBSERVACIONES || '',
                        ARTICULOS: [],
                        TOTAL_ARTICULOS_UNICOS: 0 // Initialize new property
                    };
                }
                
                // Agregar artículo al pedido correspondiente
                // Asegurarse de que el artículo tenga al menos un CODIGO o ITEM para ser considerado válido
                if (item.CODIGO_ARTICULO || item.ITEM) {
                    pedidosUnicos[pedidoId].ARTICULOS.push({
                        CODIGO: item.CODIGO_ARTICULO || '',
                        ITEM: item.ITEM || item.ARTICULO || '',
                        TIPO: item.TIPO || '',
                        CATEGORIA: item.CATEGORIA || '',
                        MODELO: item.MODELO || '',
                        PRESENTACION: item.PRESENTACION || '',
                        CANTIDAD: item.CANTIDAD || 0
                    });
                }
            });
            
            // Calculate unique article count after all articles are added
            Object.values(pedidosUnicos).forEach(pedido => {
                const uniqueItems = new Set();
                pedido.ARTICULOS.forEach(articulo => {
                    if (articulo.ITEM) {
                        uniqueItems.add(articulo.ITEM);
                    }
                });
                pedido.TOTAL_ARTICULOS_UNICOS = uniqueItems.size;
            });

            AppState.pedidosData = Object.values(pedidosUnicos);
    
            UIController.populateTable(AppState.pedidosData);
            UIController.populateFilters(AppState.pedidosData);
            UIController.setupTableSorting();
            
        } catch (error) {
            console.error('Error en processPedidosData:', error);
            Utils.showNotification('error', 'Error al procesar los datos de pedidos');
            Utils.showNoResults('Error al cargar la información');
        }
    }
};

/** * Controlador de Sesión */
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

/** * Inicialización optimizada */
async function init() {
    if (!SessionController.checkSession()) return;
    
    try {
        Utils.showLoader(true);
        
        // Precargar datos en paralelo
        await Promise.all([
            precargarDatos(),
            PedidosController.fetchPedidosData()
        ]);
        
        UIController.setupEventListeners();
        
    } catch (error) {
        console.error('Error en init:', error);
        Utils.showNotification('error', 'Error al inicializar la aplicación');
    } finally {
        Utils.showLoader(false);
        if (DOM.pagination.bottom) {
            DOM.pagination.bottom.style.display = 'flex';
        }
    }
}

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', init);