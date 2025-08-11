// URL de la API de Registros
const API_URL = 'https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec?api=registros';

// Variables globales
let registrosData = [];
let modosUnicos = [];
let categoriasUnicas = [];

// Cache de elementos DOM
const DOM = {
    loader: document.getElementById('loader'),
    registrosBody: document.getElementById('ingresosBody'),
    noResults: document.getElementById('noResults'),
    filtroItem: document.getElementById('filtro-item'),
    filtroCategoria: document.getElementById('filtro-categoria'),
    filtroSede: document.getElementById('filtro-sede'),
    filtroFecha: document.getElementById('filtro-fecha'),
    btnFiltrar: document.getElementById('btn-filtrar'),
    btnLimpiar: document.getElementById('btn-limpiar'),
    editForm: document.getElementById('editForm')
};

// ==================== FUNCIONES DE UTILIDAD ====================

function logAction(action, message) {
    console.log(`${action}: ${message}`);
}

function formatDateString(dateStr) {
    if (!dateStr) return 'No disponible';
    
const numericDate = String(dateStr).replace(/[^0-9]/g, '');
    
    if (numericDate.length === 7) {
        return `0${numericDate.charAt(0)}/${numericDate.substring(1, 3)}/${numericDate.substring(3)}`;
    } else if (numericDate.length === 8) {
        const dia = numericDate.substring(0, 2);
        const mes = numericDate.substring(2, 4);
        const año = numericDate.substring(4, 8);
        
        const diaNum = parseInt(dia);
        const mesNum = parseInt(mes);
        
        if (diaNum > 0 && diaNum <= 31 && mesNum > 0 && mesNum <= 12) {
            return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${año}`;
        }
    }
    
return String(dateStr);
}

function formatTime(timeStr) {
    if (!timeStr) return 'No disponible';
    const time = String(timeStr).replace(/[^0-9]/g, '').padStart(4, '0');
    if (time.length !== 4) return 'No disponible';
    return `${time.slice(0,2)}:${time.slice(2,4)}`;
}

function convertFilterDateToDBFormat(filterDate) {
    if (!filterDate) return '';
    const [year, month, day] = filterDate.split('-');
    return `${day.padStart(2, '0')}${month.padStart(2, '0')}${year}`;
}

// ==================== FUNCIONES DE INTERFAZ ====================

function toggleLoader(show, message = '') {
    logAction(show ? 'Mostrando' : 'Ocultando', `loader - ${message}`);
    if (DOM.loader) DOM.loader.style.display = show ? 'flex' : 'none';
}

function toggleNoResults(show, message = 'No se encontraron resultados') {
    logAction(show ? 'Mostrando' : 'Ocultando', `no results - ${message}`);
    if (DOM.noResults) {
        DOM.noResults.textContent = message;
        DOM.noResults.style.display = show ? 'block' : 'none';
    }
}

function showMessage(type, title, text) {
    let overlay = document.querySelector(`.${type}-overlay`);
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = `${type}-overlay`;
        
        const message = document.createElement('div');
        message.className = `${type}-message`;
        
        const icon = document.createElement('div');
        icon.className = `${type}-icon`;
        icon.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'info'}"></i>`;
        
        const titleEl = document.createElement('div');
        titleEl.className = `${type}-title`;
        
        const textEl = document.createElement('div');
        textEl.className = `${type}-text`;
        
        message.appendChild(icon);
        message.appendChild(titleEl);
        message.appendChild(textEl);
        overlay.appendChild(message);
        document.body.appendChild(overlay);
    }
    
    overlay.querySelector(`.${type}-title`).textContent = title;
    overlay.querySelector(`.${type}-text`).textContent = text;
    
    setTimeout(() => overlay.classList.add('show'), 100);
    setTimeout(() => overlay.classList.remove('show'), 2000);
}

function showSuccessMessage(action, details) {
    const messages = {
        'edit': ['Editado con éxito', details || 'El registro ha sido actualizado correctamente.'],
        'save': ['Guardado con éxito', details || 'El registro ha sido guardado correctamente.'],
        'default': ['Operación completada', details || 'La operación se ha completado correctamente.']
    };
    
    const [title, text] = messages[action] || messages.default;
    showMessage('success', title, text);
}

// ==================== FUNCIONES DE DATOS ====================

async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function cargarDatosRegistros() {
    try {
        logAction('Iniciando', 'carga de datos de registros');
        toggleLoader(true);
        
        const response = await fetchWithTimeout(`${API_URL}&accion=obtenerRegistros`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Error al obtener los datos');
        }

        registrosData = data.data || [];
        modosUnicos = [...new Set(registrosData.map(item => item.MODO))];
        categoriasUnicas = [...new Set(registrosData.map(item => item.CATEGORIA))];
        
        llenarFiltros();
        actualizarCalendario();
        mostrarDatos(registrosData);
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        toggleNoResults(true, `Error al cargar datos: ${error.message}`);
    } finally {
        toggleLoader(false);
    }
}

function llenarFiltros() {
    if (DOM.filtroCategoria) {
        DOM.filtroCategoria.innerHTML = '<option value="">Todas</option>';
        categoriasUnicas.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            DOM.filtroCategoria.appendChild(option);
        });
    }
}

function limpiarFiltros() {
    logAction('Limpiando', 'filtros');
    if (DOM.filtroItem) DOM.filtroItem.value = '';
    if (DOM.filtroCategoria) DOM.filtroCategoria.value = '';
    if (DOM.filtroSede) DOM.filtroSede.value = '';
    if (DOM.filtroFecha) DOM.filtroFecha.value = '';
    mostrarDatos(registrosData);
}

// ==================== FUNCIONES DE VISUALIZACIÓN ====================

function crearElemento(tag, className, innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

function mostrarDatos(data) {
    if (!DOM.registrosBody) {
        console.error('El elemento registrosBody no existe en el DOM');
        return;
    }
    
    if (data && data.length > 0) {
        DOM.registrosBody.innerHTML = '';
        toggleNoResults(false);
    } else {
        toggleNoResults(true);
        return;
    }
    
    logAction('Mostrando', `${data.length} registros`);
   
    // Agrupar primero por MODO
    const datosAgrupados = data.reduce((acc, item) => {
        if (!item.MODO || !item.CATEGORIA) {
            console.log('Item sin modo o categoría:', item);
            return acc;
        }
        
        if (!acc[item.MODO]) acc[item.MODO] = {};
        
        if (item.MODO === 'DIARIO') {
            // Para DIARIO, agrupar solo por categorías
            if (!acc[item.MODO]['CATEGORIAS']) acc[item.MODO]['CATEGORIAS'] = {};
            if (!acc[item.MODO]['CATEGORIAS'][item.CATEGORIA]) {
                acc[item.MODO]['CATEGORIAS'][item.CATEGORIA] = [];
            }
            acc[item.MODO]['CATEGORIAS'][item.CATEGORIA].push(item);
        } else {
            // Para SEMANAL y MENSUAL, mantener la agrupación por fecha
            if (!acc[item.MODO][item.FECHA]) acc[item.MODO][item.FECHA] = {};
            if (!acc[item.MODO][item.FECHA][item.CATEGORIA]) acc[item.MODO][item.FECHA][item.CATEGORIA] = [];
            acc[item.MODO][item.FECHA][item.CATEGORIA].push(item);
        }
        return acc;
    }, {});
    
    logAction('Datos agrupados', Object.keys(datosAgrupados).join(', '));
    
    document.querySelector('.modos-buttons-container')?.remove();
    document.querySelector('.categorias-main-container')?.remove();
    
    const mainContainer = crearElemento('div', 'main-content');
    const modosContainer = crearElemento('div', 'modos-buttons-container');
    
    Object.keys(datosAgrupados).forEach((modo, index) => {
        const modoBtn = crearElemento('button', 'modo-btn', `<i class="fas fa-folder"></i> ${modo}`);
        modoBtn.dataset.modo = modo;
        if (index === 0) modoBtn.classList.add('active');
        modosContainer.appendChild(modoBtn);
    });
    
    const categoriasMainContainer = crearElemento('div', 'categorias-main-container');
    mainContainer.appendChild(modosContainer);
    mainContainer.appendChild(categoriasMainContainer);
    DOM.registrosBody.appendChild(mainContainer);
    
    const primerModo = Object.keys(datosAgrupados)[0];
    if (primerModo) {
        mostrarCategorias(primerModo, datosAgrupados[primerModo], categoriasMainContainer);
    }
    
    document.querySelectorAll('.modo-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.modo-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const modo = this.dataset.modo;
            const container = document.querySelector('.categorias-main-container');
            container.innerHTML = '';
            mostrarCategorias(modo, datosAgrupados[modo], container);
        });
    });
}

function mostrarCategorias(modo, datos, container) {
    if (!container) {
        console.error('Contenedor de categorías no encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    if (!datos || Object.keys(datos).length === 0) {
        container.appendChild(
            crearElemento('div', 'no-results', `<p>No hay datos para ${modo}</p>`)
        );
        return;
    }
    
    const categoriasGrid = crearElemento('div', 'categorias-grid');
    
    if (modo === 'DIARIO') {
        // Para DIARIO, mostrar directamente las categorías
        const categoriasPorFecha = datos['CATEGORIAS'] || {};
        Object.entries(categoriasPorFecha).forEach(([categoria, items]) => {
            const categoriaCard = crearElemento('div', 'categoria-card collapsed');
            const sumaTotal = items.reduce((total, item) => total + (parseInt(item.CANTIDAD) || 0), 0);
            
            const categoriaHeader = crearElemento('div', 'categoria-header', `
                <h3><i class="fas fa-tag"></i> ${categoria}</h3>
                <span class="item-count">${items.length} items</span>
                <span class="suma-total">Total: ${sumaTotal}</span>
                <span class="expand-icon"><i class="fas fa-chevron-right"></i></span>
            `);
            
            const categoriaContent = crearElemento('div', 'categoria-content');
            categoriaContent.style.display = 'none'; // Inicialmente contraído
            
            // Crear tabla de items
            const tabla = crearElemento('table', 'items-table');
            tabla.appendChild(crearElemento('thead', '', `
                <tr>
                    <th>Sede</th>
                    <th>Item</th>
                    <th>Cantidad</th>
                    <th>Fecha</th>
                    <th>Fecha Inventario</th>
                    <th>Acciones</th>
                </tr>
            `));
            
            const tbody = crearElemento('tbody');
            items.forEach(item => {
                const tr = crearElemento('tr', 'item-row');
                tr.dataset.id = item.ID;
                tr.innerHTML = `
                    <td>${item.SEDE || ''}</td>
                    <td>${item.ITEM || ''}</td>
                    <td>${item.CANTIDAD || ''}</td>
                    <td>${item.FECHA || ''}</td>
                    <td>${formatDateString(item.FECHABD) || 'No disponible'}</td>
                    <td>
                        <div class="action-icons">
                            <div class="action-icon view-icon" title="Visualizar" 
                                data-id="${item.ID}"
                                data-sede="${item.SEDE || ''}"
                                data-categoria="${item.CATEGORIA || ''}"
                                data-item="${item.ITEM || ''}"
                                data-cantidad="${item.CANTIDAD || ''}"
                                data-fecha="${item.FECHA || ''}"
                                data-responsable="${item.RESPONSABLE || 'No especificado'}" 
                                data-fechabd="${formatDateString(item.FECHABD) || 'No disponible'}"
                                data-horabd="${formatTime(item.HORABD) || 'No disponible'}">
                                <i class="fas fa-eye"></i>
                            </div>
                            <div class="action-icon edit-icon" title="Editar"
                                data-id="${item.ID}"
                                data-modo="${item.MODO || ''}"
                                data-categoria="${item.CATEGORIA || ''}"
                                data-sede="${item.SEDE || ''}"
                                data-item="${item.ITEM || ''}"
                                data-cantidad="${item.CANTIDAD || ''}"
                                data-fecha="${item.FECHA || ''}">
                                <i class="fas fa-edit"></i>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            tabla.appendChild(tbody);
            categoriaContent.appendChild(tabla);
            categoriaCard.appendChild(categoriaHeader);
            categoriaCard.appendChild(categoriaContent);
            categoriasGrid.appendChild(categoriaCard);
            
            // Event listener para expandir/contraer categoría
            categoriaHeader.addEventListener('click', () => {
                const isExpanded = categoriaContent.style.display === 'block';
                categoriaContent.style.display = isExpanded ? 'none' : 'block';
                categoriaCard.classList.toggle('expanded', !isExpanded);
                categoriaCard.classList.toggle('collapsed', isExpanded);
                categoriaHeader.querySelector('.expand-icon i').className = 
                    isExpanded ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
            });
        });
    } else {
        // Para SEMANAL y MENSUAL, mantener la agrupación por fecha
        const fechasGrid = crearElemento('div', 'fechas-grid');
        
        Object.entries(datos).forEach(([fecha, categoriasPorFecha]) => {
            const fechaCard = crearElemento('div', 'fecha-card');
            const fechaHeader = crearElemento('div', 'fecha-header', `
                <h2><i class="fas fa-calendar"></i> ${fecha}</h2>
                <span class="expand-icon"><i class="fas fa-chevron-down"></i></span>
            `);
            
            const categoriasContainer = crearElemento('div', 'categorias-container');
            categoriasContainer.style.display = 'none'; // Inicialmente contraído
            
            Object.entries(categoriasPorFecha).forEach(([categoria, items]) => {
                const categoriaCard = crearElemento('div', 'categoria-card collapsed');
                const sumaTotal = items.reduce((total, item) => total + (parseInt(item.CANTIDAD) || 0), 0);
                
                const categoriaHeader = crearElemento('div', 'categoria-header', `
                    <h3><i class="fas fa-tag"></i> ${categoria}</h3>
                    <span class="item-count">${items.length} items</span>
                    <span class="suma-total">Total: ${sumaTotal}</span>
                    <span class="expand-icon"><i class="fas fa-chevron-right"></i></span>
                `);
                
                const categoriaContent = crearElemento('div', 'categoria-content');
                categoriaContent.style.display = 'none'; // Inicialmente contraído
                
                const tabla = crearElemento('table', 'items-table');
                tabla.appendChild(crearElemento('thead', '', `
                    <tr>
                        <th>Sede</th>
                        <th>Item</th>
                        <th>Cantidad</th>
                        <th>Fecha</th>
                        <th>Fecha Inventario</th>
                        <th>Acciones</th>
                    </tr>
                `));
                
                const tbody = crearElemento('tbody');
                items.forEach(item => {
                    const tr = crearElemento('tr', 'item-row');
                    tr.dataset.id = item.ID;
                    tr.innerHTML = `
                        <td>${item.SEDE || ''}</td>
                        <td>${item.ITEM || ''}</td>
                        <td>${item.CANTIDAD || ''}</td>
                        <td>${item.FECHA || ''}</td>
                        <td>${formatDateString(item.FECHABD) || 'No disponible'}</td>
                        <td>
                            <div class="action-icons">
                                <div class="action-icon view-icon" title="Visualizar" 
                                    data-id="${item.ID}"
                                    data-sede="${item.SEDE || ''}"
                                    data-categoria="${item.CATEGORIA || ''}"
                                    data-item="${item.ITEM || ''}"
                                    data-cantidad="${item.CANTIDAD || ''}"
                                    data-fecha="${item.FECHA || ''}"
                                    data-responsable="${item.RESPONSABLE || 'No especificado'}" 
                                    data-fechabd="${formatDateString(item.FECHABD) || 'No disponible'}"
                                    data-horabd="${formatTime(item.HORABD) || 'No disponible'}">
                                    <i class="fas fa-eye"></i>
                                </div>
                                <div class="action-icon edit-icon" title="Editar"
                                    data-id="${item.ID}"
                                    data-modo="${item.MODO || ''}"
                                    data-categoria="${item.CATEGORIA || ''}"
                                    data-sede="${item.SEDE || ''}"
                                    data-item="${item.ITEM || ''}"
                                    data-cantidad="${item.CANTIDAD || ''}"
                                    data-fecha="${item.FECHA || ''}">
                                    <i class="fas fa-edit"></i>
                                </div>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                
                tabla.appendChild(tbody);
                categoriaContent.appendChild(tabla);
                categoriaCard.appendChild(categoriaHeader);
                categoriaCard.appendChild(categoriaContent);
                categoriasContainer.appendChild(categoriaCard);
                
                // Event listener para expandir/contraer categoría
                categoriaHeader.addEventListener('click', () => {
                    const isExpanded = categoriaContent.style.display === 'block';
                    categoriaContent.style.display = isExpanded ? 'none' : 'block';
                    categoriaCard.classList.toggle('expanded', !isExpanded);
                    categoriaCard.classList.toggle('collapsed', isExpanded);
                    categoriaHeader.querySelector('.expand-icon i').className = 
                        isExpanded ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
                });
            });
            
            fechaCard.appendChild(fechaHeader);
            fechaCard.appendChild(categoriasContainer);
            fechasGrid.appendChild(fechaCard);
            
            // Event listener para expandir/contraer fecha
            fechaHeader.addEventListener('click', () => {
                const isExpanded = categoriasContainer.style.display === 'block';
                categoriasContainer.style.display = isExpanded ? 'none' : 'block';
                fechaHeader.querySelector('.expand-icon i').className = 
                    isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            });
        });
        
        categoriasGrid.appendChild(fechasGrid);
    }
    
    container.appendChild(categoriasGrid);
}

function filtrarDatos() {
    const itemFiltro = DOM.filtroItem?.value.trim() || '';
    const categoriaFiltro = DOM.filtroCategoria?.value || '';
    const sedeFiltro = DOM.filtroSede?.value || '';
    const fechaFiltro = DOM.filtroFecha?.value || '';
    
    // Convertir fecha de filtro (DD/MM/AAAA) a formato de base de datos (DDMMAAAA)
    let fechaFiltroBD = '';
    if (fechaFiltro) {
        const [dia, mes, año] = fechaFiltro.split('/');
        fechaFiltroBD = `${dia}${mes}${año}`;
    }
    
    const datosFiltrados = registrosData.filter(item => {
        // Filtro por item
        const itemCoincide = !itemFiltro || 
            (item.ITEM && item.ITEM.toLowerCase().includes(itemFiltro.toLowerCase()));
        
        // Filtro por categoría
        const categoriaCoincide = !categoriaFiltro || item.CATEGORIA === categoriaFiltro;
        
        // Filtro por sede
        const sedeCoincide = !sedeFiltro || item.SEDE === sedeFiltro;
        
        // Filtro por fecha (comparar con FECHABD en formato DDMMYYYY)
        const fechaCoincide = !fechaFiltro || 
            (item.FECHABD && String(item.FECHABD).replace(/[^0-9]/g, '') === fechaFiltroBD);
        
        return itemCoincide && categoriaCoincide && sedeCoincide && fechaCoincide;
    });
    
    mostrarDatos(datosFiltrados);
}

// ==================== FUNCIONES DE OPERACIONES ====================

function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    
    const data = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        if (input.name || input.id) {
            const key = input.name || input.id.replace('edit-', '');
            data[key] = input.value;
        }
    });
    
    return data;
}

async function guardarRegistro() {
    const formData = getFormData('editForm');
    const { id, modo, categoria, sede, item, cantidad, fecha } = formData;
    const usuario = sessionStorage.getItem('usuario') || 'Usuario';
    
    const registro = {
        id,
        modo,
        categoria,
        sede,
        item,
        cantidad,
        fecha,
        responsable: usuario
    };
    
    const accion = id ? 'actualizar' : 'guardar';
    
    hideModal('editModal');
    showLoading('save', id ? 'Actualizando registro...' : 'Guardando nuevo registro...');
    
    await enviarDatosAPI(registro, accion);
}

async function enviarDatosAPI(registro, accion) {
    try {
        const activeModo = document.querySelector('.modo-btn.active')?.dataset.modo;
        logAction('Modo activo antes de enviar datos', activeModo || 'Ninguno');
        
        const payload = {
            api: 'registros',
            accion: accion === 'guardar' ? 'guardar' : 'actualizar',
            registro: registro
        };
        
        logAction("Enviando datos", JSON.stringify(payload));
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`Error al ${accion} registro: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            hideLoading();
            showSuccessMessage(
                accion === 'guardar' ? 'save' : 'edit', 
                accion === 'guardar' ? 'El nuevo registro ha sido creado correctamente.' : 'El registro ha sido actualizado correctamente.'
            );
            
            await cargarDatosRegistros();
            
            if (activeModo) {
                const modoButton = [...document.querySelectorAll('.modo-btn')].find(
                    btn => btn.dataset.modo === activeModo
                );
                if (modoButton) {
                    logAction('Seleccionando modo después de recargar', activeModo);
                    modoButton.click();
                }
            }
        } else {
            hideLoading();
            alert(`Error: ${result.message || 'No se pudo completar la operación'}`);
        }
    } catch (error) {
        console.error(`Error al ${accion} registro:`, error);
        hideLoading();
        alert(`Error al ${accion} registro: ${error.message}`);
    }
}

// ==================== FUNCIONES DE MODALES ====================

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal con ID ${modalId} no encontrado`);
        return;
    }
    
    if (show) {
        modal.style.display = 'block';
        void modal.offsetWidth;
        modal.classList.add('show');
        logAction('Mostrando modal', modalId);
    } else {
        modal.style.display = 'none';
        logAction('Ocultando modal', modalId);
    }
}

function showModal(modalId) {
    toggleModal(modalId, true);
}

function hideModal(modalId) {
    toggleModal(modalId, false);
}

function llenarModalDetalles(element) {
    const detalles = {
        'detalle-responsable': element.getAttribute('data-responsable') || 'No especificado',
        'detalle-fechamod': formatDateString(element.getAttribute('data-fechabd')) || 'No disponible',
        'detalle-horamod': formatTime(element.getAttribute('data-horabd')) || 'No disponible'
    };
    
    Object.entries(detalles).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    showModal('detallesModal');
}

function llenarModalEdicion(element) {
    const campos = {
        'edit-id': 'data-id',
        'edit-modo': 'data-modo',
        'edit-categoria': 'data-categoria',
        'edit-sede': 'data-sede',
        'edit-item': 'data-item',
        'edit-cantidad': 'data-cantidad',
        'edit-fecha': 'data-fecha'
    };
    
    Object.entries(campos).forEach(([id, attr]) => {
        const input = document.getElementById(id);
        if (input) input.value = element.getAttribute(attr) || '';
    });
    
    const modoSelect = document.getElementById('edit-modo');
    if (modoSelect) {
        modoSelect.innerHTML = '<option value="">Seleccione un modo</option>';
        modosUnicos.forEach(modo => {
            const option = crearElemento('option', '', modo);
            option.value = modo;
            modoSelect.appendChild(option);
        });
        
        if (element.getAttribute('data-modo')) {
            modoSelect.value = element.getAttribute('data-modo');
        }
    }
    
    const categoriaSelect = document.getElementById('edit-categoria');
    if (categoriaSelect) {
        categoriaSelect.innerHTML = '<option value="">Seleccione una categoría</option>';
        categoriasUnicas.forEach(categoria => {
            const option = crearElemento('option', '', categoria);
            option.value = categoria;
            categoriaSelect.appendChild(option);
        });
        
        if (element.getAttribute('data-categoria')) {
            categoriaSelect.value = element.getAttribute('data-categoria');
        }
    }
    
    const title = document.getElementById('editModalTitle');
    if (title) title.textContent = element.getAttribute('data-id') ? 'Editar Registro' : 'Nuevo Registro';
}

// ==================== FUNCIONES DE LOADING ====================

function showLoading(action, message) {
    let overlay = document.querySelector('.loading-overlay');
    
    if (!overlay) {
        overlay = crearElemento('div', 'loading-overlay');
        const loadingMessage = crearElemento('div', 'loading-message');
        const spinner = crearElemento('div', 'loading-spinner');
        const title = crearElemento('div', 'loading-title');
        const text = crearElemento('div', 'loading-text');
        
        loadingMessage.appendChild(spinner);
        loadingMessage.appendChild(title);
        loadingMessage.appendChild(text);
        overlay.appendChild(loadingMessage);
        document.body.appendChild(overlay);
    }
    
    const title = overlay.querySelector('.loading-title');
    const text = overlay.querySelector('.loading-text');
    
    overlay.classList.remove('loading-save', 'loading-free');
    
    if (action === 'save') {
        overlay.classList.add('loading-save');
        title.textContent = 'Guardando';
        text.textContent = message || 'Procesando su solicitud...';
    }
    
    setTimeout(() => overlay.classList.add('show'), 10);
    return overlay;
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// ==================== FUNCIONES DE CALENDARIO ====================
function actualizarCalendario() {
    // Obtener todas las fechas únicas de los registros (corregido zona horaria)
    const fechasDisponibles = registrosData
        .filter(item => item.FECHABD)
        .map(item => {
            const fechaStr = String(item.FECHABD).replace(/[^0-9]/g, '');
            if (fechaStr.length === 8) {
                const dia = fechaStr.substring(0, 2);
                const mes = fechaStr.substring(2, 4);
                const año = fechaStr.substring(4, 8);
                // Crear fecha en UTC para evitar problemas de zona horaria
                return new Date(Date.UTC(año, mes - 1, dia));
            }
            return null;
        })
        .filter(fecha => fecha !== null)
        .filter((fecha, index, self) => 
            index === self.findIndex(f => 
                f.getUTCDate() === fecha.getUTCDate() &&
                f.getUTCMonth() === fecha.getUTCMonth() &&
                f.getUTCFullYear() === fecha.getUTCFullYear()
            )
        );

    // Crear el calendario interactivo
    if (DOM.filtroFecha) {
        // Cambiar el tipo a texto y hacerlo readonly para evitar el calendario nativo
        DOM.filtroFecha.type = 'text';
        DOM.filtroFecha.readOnly = true;
        DOM.filtroFecha.placeholder = 'DD/MM/AAAA';

        DOM.filtroFecha.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Eliminar calendario existente si hay uno
            document.querySelector('.calendar-container')?.remove();
            
            if (fechasDisponibles.length === 0) {
                showMessage('info', 'Sin fechas', 'No hay registros con fechas disponibles');
                return;
            }

            // Crear contenedor del calendario
            const calendarContainer = document.createElement('div');
            calendarContainer.className = 'calendar-container';
            
            // Crear el calendario
            const calendar = document.createElement('div');
            calendar.className = 'calendar';
            
            // Cabecera del calendario (mes/año y controles)
            const header = document.createElement('div');
            header.className = 'calendar-header';
            
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '&lt;';
            prevBtn.className = 'calendar-prev';
            prevBtn.type = 'button'; // Importante para evitar submit
            
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '&gt;';
            nextBtn.className = 'calendar-next';
            nextBtn.type = 'button'; // Importante para evitar submit
            
            const monthYear = document.createElement('div');
            monthYear.className = 'calendar-month-year';
            
            header.appendChild(prevBtn);
            header.appendChild(monthYear);
            header.appendChild(nextBtn);
            
            // Días de la semana
            const weekdays = document.createElement('div');
            weekdays.className = 'calendar-weekdays';
            ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.textContent = day;
                weekdays.appendChild(dayElement);
            });
            
            // Días del mes
            const daysContainer = document.createElement('div');
            daysContainer.className = 'calendar-days';
            
            calendar.appendChild(header);
            calendar.appendChild(weekdays);
            calendar.appendChild(daysContainer);
            calendarContainer.appendChild(calendar);
            
            // Posicionar el calendario
            const rect = DOM.filtroFecha.getBoundingClientRect();
            calendarContainer.style.position = 'absolute';
            calendarContainer.style.top = `${rect.bottom + window.scrollY + 5}px`;
            calendarContainer.style.left = `${rect.left + window.scrollX}px`;
            calendarContainer.style.zIndex = '1000';
            
            document.body.appendChild(calendarContainer);
            
            // Variables de estado del calendario
            let currentDate = new Date();
            let currentMonth = currentDate.getMonth();
            let currentYear = currentDate.getFullYear();
            
            // Función para renderizar el calendario
            function renderCalendar(month, year) {
                monthYear.textContent = `${getMonthName(month)} ${year}`;
                daysContainer.innerHTML = '';
                
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                
                // Días vacíos al inicio
                for (let i = 0; i < firstDay; i++) {
                    const emptyDay = document.createElement('div');
                    emptyDay.className = 'calendar-day empty';
                    daysContainer.appendChild(emptyDay);
                }
                
                // Días del mes
                for (let day = 1; day <= daysInMonth; day++) {
                    const dayElement = document.createElement('div');
                    dayElement.className = 'calendar-day';
                    dayElement.textContent = day;
                    
                    const currentDate = new Date(year, month, day);
                    
                    // Verificar si la fecha existe en los registros
                    const fechaExiste = fechasDisponibles.some(fecha => 
                        fecha.getUTCDate() === day &&
                        fecha.getUTCMonth() === month &&
                        fecha.getUTCFullYear() === year
                    );
                    
                    if (fechaExiste) {
                        dayElement.classList.add('available');
                        dayElement.addEventListener('click', () => {
                            const selectedDate = new Date(Date.UTC(year, month, day));
                            const formattedDate = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
                            DOM.filtroFecha.value = formattedDate;
                            calendarContainer.remove();
                            filtrarDatos();
                        });
                    } else {
                        dayElement.classList.add('disabled');
                    }
                    
                    // Resaltar el día actual
                    const today = new Date();
                    if (
                        day === today.getDate() && 
                        month === today.getMonth() && 
                        year === today.getFullYear()
                    ) {
                        dayElement.classList.add('today');
                    }
                    
                    daysContainer.appendChild(dayElement);
                }
            }
            
            // Funciones auxiliares
            function getMonthName(month) {
                const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                return months[month];
            }
            
            // Event listeners para controles
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar(currentMonth, currentYear);
            });
            
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar(currentMonth, currentYear);
            });
            
            // Renderizar calendario inicial
            renderCalendar(currentMonth, currentYear);
            
            // Cerrar calendario al hacer clic fuera
            const cerrarCalendario = (e) => {
                if (!calendarContainer.contains(e.target) && e.target !== DOM.filtroFecha) {
                    calendarContainer.remove();
                    document.removeEventListener('click', cerrarCalendario);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', cerrarCalendario);
            }, 10);
        });
    }
}

// Asegurar que los estilos se carguen solo una vez
if (!document.querySelector('style.calendar-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.className = 'calendar-styles';
    styleSheet.textContent = `
        .calendar-container {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 15px;
            width: 300px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .calendar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .calendar-prev, .calendar-next {
            background: none;
            border: none;
            font-size: 1.2em;
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 4px;
        }
        .calendar-prev:hover, .calendar-next:hover {
            background: #f0f0f0;
        }
        .calendar-month-year {
            font-weight: bold;
            font-size: 1.1em;
        }
        .calendar-weekdays {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
            color: #555;
        }
        .calendar-days {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 5px;
        }
        .calendar-day {
            padding: 8px;
            text-align: center;
            border-radius: 4px;
            cursor: pointer;
        }
        .calendar-day.empty {
            visibility: hidden;
        }
        .calendar-day.disabled {
            color: #ccc;
            cursor: not-allowed;
        }
        .calendar-day.available {
            background: #f8f9fa;
        }
        .calendar-day.available:hover {
            background: #e9ecef;
            color: #0056b3;
        }
        .calendar-day.today {
            background: #e3f2fd;
            font-weight: bold;
        }
        .calendar-day.selected {
            background: #2196F3;
            color: white;
        }
        input[readonly].filtro-fecha {
            cursor: pointer;
            background-color: white;
        }
    `;
    document.head.appendChild(styleSheet);
}

// ==================== CONFIGURACIÓN DE EVENTOS ====================

function configurarEventos() {
    if (DOM.btnFiltrar) {
        DOM.btnFiltrar.addEventListener('click', filtrarDatos);
        
        [DOM.filtroItem, DOM.filtroCategoria, DOM.filtroSede, DOM.filtroFecha].forEach(campo => {
            campo?.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    filtrarDatos();
                }
            });
        });
    }
    
    if (DOM.btnLimpiar) DOM.btnLimpiar.addEventListener('click', limpiarFiltros);
    
    document.addEventListener('click', e => {
        if (e.target.closest('.view-icon')) {
            llenarModalDetalles(e.target.closest('.view-icon'));
            showModal('detallesModal');
            e.stopPropagation();
        }
        
        if (e.target.closest('.edit-icon')) {
            llenarModalEdicion(e.target.closest('.edit-icon'));
            showModal('editModal');
            e.stopPropagation();
        }
        
        if (e.target.classList.contains('close') || e.target.id === 'btnCancelarEdit') {
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal.id);
            e.stopPropagation();
        }
    });
    
    if (DOM.editForm) {
        DOM.editForm.addEventListener('submit', e => {
            e.preventDefault();
            guardarRegistro();
        });
    }
}

// ==================== INICIALIZACIÓN ====================

function inicializarModales() {
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal) modal.style.display = 'none';
    });
    
    document.querySelectorAll('.modal .close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) hideModal(modal.id);
        });
    });
}

function verificarAutenticacion() {
    if (!sessionStorage.getItem('usuario')) {
        window.location.href = '../login.html';
        return false;
    }
    return true;
}

// ==================== EJECUCIÓN PRINCIPAL ====================
// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAutenticacion()) return;
    
    inicializarModales();
    cargarDatosRegistros();
    configurarEventos();
    
    setTimeout(() => {
        if (registrosData.length > 0) {
            mostrarDatos(registrosData);
        }
    }, 500);
});

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        hideModal(event.target.id);
    }
});
