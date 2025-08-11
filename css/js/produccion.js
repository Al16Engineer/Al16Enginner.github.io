// URL de la API
const API_URL = 'https://script.google.com/macros/s/AKfycbzkvqnflAjsYuXlmB4N7SRQjUQruEFmjtY57L-VC-bVTFKrek9B-Jrp-JdCp-M_FZcR/exec';

// Variables globales
let produccionData = [];
let categoriasUnicas = [];
let subcategoriasUnicas = [];

// Elementos DOM
const loader = document.getElementById('loader');
const produccionBody = document.getElementById('produccionBody');
const noResults = document.getElementById('noResults');
const filtroCarne = document.getElementById('filtro-carne');
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroSubcategoria = document.getElementById('filtro-subcategoria');
const filtroEstado = document.getElementById('filtro-estado');
const filtroSede = document.getElementById('filtro-sede');
const btnFiltrar = document.getElementById('btn-filtrar');
const btnLimpiar = document.getElementById('btn-limpiar');

// ==================== FUNCIONES DE INTERFAZ ====================

function showProcessing(message, subMessage) {
    console.log('Processing:', message, subMessage);
}

function hideProcessing() {
    console.log('Hide processing');
    const existingOverlay = document.getElementById('processingOverlay');
    if (existingOverlay) existingOverlay.remove();
    
    const loader = document.getElementById('loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.display = 'none';
    }
}

function showSuccessMessage(action, details) {
    let overlay = document.querySelector('.success-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        
        const message = document.createElement('div');
        message.className = 'success-message';
        
        const icon = document.createElement('div');
        icon.className = 'success-icon';
        icon.innerHTML = '<i class="fas fa-check"></i>';
        
        const title = document.createElement('div');
        title.className = 'success-title';
        
        const text = document.createElement('div');
        text.className = 'success-text';
        
        message.appendChild(icon);
        message.appendChild(title);
        message.appendChild(text);
        overlay.appendChild(message);
        document.body.appendChild(overlay);
    }
    
    const title = overlay.querySelector('.success-title');
    const text = overlay.querySelector('.success-text');
    
    if (typeof action === 'string' && typeof details === 'string') {
        switch(action) {
            case 'edit':
                title.textContent = 'Editado con éxito';
                text.textContent = details || 'El registro ha sido actualizado correctamente.';
                break;
            case 'save':
                title.textContent = 'Guardado con éxito';
                text.textContent = details || 'El registro ha sido guardado correctamente.';
                break;
            case 'free':
                title.textContent = 'Liberado con éxito';
                text.textContent = details || 'El rango ha sido liberado correctamente.';
                break;
            default:
                title.textContent = 'Operación completada';
                text.textContent = details || 'La operación se ha completado correctamente.';
        }
    } else {
        title.textContent = 'Operación completada';
        text.textContent = action || 'La operación se ha completado correctamente.';
    }
    
    setTimeout(() => overlay.classList.add('show'), 100);
    setTimeout(() => overlay.classList.remove('show'), 2000);
}

function mostrarLoader() {
    console.log('Mostrando loader...');
    if (loader) loader.style.display = 'flex';
    else console.error('Elemento loader no encontrado');
}

function ocultarLoader() {
    console.log('Ocultando loader...');
    if (loader) loader.style.display = 'none';
    else console.error('Elemento loader no encontrado');
    hideProcessing();
}

function mostrarNoResultados(mensaje = 'No se encontraron resultados') {
    console.log('Mostrando mensaje de no resultados:', mensaje);
    if (noResults) {
        noResults.textContent = mensaje;
        noResults.style.display = 'block';
    } else {
        console.error('Elemento noResults no encontrado');
    }
}

// ==================== FUNCIONES DE DATOS ====================

async function cargarDatosProduccion() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
        console.log('Iniciando carga de datos de producción...');
        mostrarLoader();
        
        console.log('Realizando petición a:', `${API_URL}?api=produccion&accion=obtenerProduccion`);
        const response = await fetch(`${API_URL}?api=produccion&accion=obtenerProduccion`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Respuesta recibida, status:', response.status);
        if (!response.ok) throw new Error(`Error al cargar datos: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        console.log('Datos recibidos de la API:', data);
        
        if (data?.data && Array.isArray(data.data)) {
            produccionData = data.data;
            console.log('Datos de producción procesados:', produccionData.length, 'registros');
            
            categoriasUnicas = [...new Set(produccionData.map(item => item.CATEGORIA))].filter(Boolean);
            subcategoriasUnicas = [...new Set(produccionData.map(item => item.SUBCATEGORIA))].filter(Boolean);
            
            console.log('Categorías únicas:', categoriasUnicas);
            console.log('Subcategorías únicas:', subcategoriasUnicas);
            
            llenarFiltros();
            mostrarDatos(produccionData);
        } else {
            console.error('Formato de datos incorrecto:', data);
            mostrarNoResultados('No se encontraron datos de producción o formato incorrecto');
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarNoResultados(`Error al cargar datos: ${error.message}`);
    } finally {
        ocultarLoader();
    }
}

function llenarFiltros() {
    filtroSubcategoria.innerHTML = '<option value="">Todas</option>';
    subcategoriasUnicas.forEach(subcategoria => {
        const option = document.createElement('option');
        option.value = subcategoria;
        option.textContent = subcategoria;
        filtroSubcategoria.appendChild(option);
    });
}

function actualizarFiltroSubcategorias() {
    const categoriaActiva = document.querySelector('.categoria-btn.active')?.dataset.categoria;
    filtroSubcategoria.innerHTML = '<option value="">Todas</option>';
    
    if (categoriaActiva) {
        const subcategoriasDeCategoria = [...new Set(
            produccionData
                .filter(item => item.CATEGORIA === categoriaActiva)
                .map(item => item.SUBCATEGORIA)
        )].filter(Boolean);
        
        subcategoriasDeCategoria.forEach(subcat => {
            const option = document.createElement('option');
            option.value = subcat;
            option.textContent = subcat;
            filtroSubcategoria.appendChild(option);
        });
        
        console.log(`Subcategorías cargadas para categoría ${categoriaActiva}:`, subcategoriasDeCategoria);
    }
}

function limpiarFiltros() {
    console.log('Limpiando filtros...');
    if (filtroCarne) filtroCarne.value = '';
    if (filtroCategoria) filtroCategoria.value = '';
    if (filtroSubcategoria) filtroSubcategoria.value = '';
    if (filtroEstado) filtroEstado.value = '';
    if (filtroSede) filtroSede.value = '';
    mostrarDatos(produccionData);
}

// ==================== FUNCIONES DE VISUALIZACIÓN ====================

function mostrarSubcategorias(categoria, subcategorias, container) {
    console.log(`Mostrando subcategorías para ${categoria}:`, subcategorias);
    
    if (!container) {
        console.error('Contenedor de subcategorías no encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    if (!subcategorias || Object.keys(subcategorias).length === 0) {
        const noSubcategoriasMsg = document.createElement('div');
        noSubcategoriasMsg.className = 'no-results';
        noSubcategoriasMsg.innerHTML = `<p>No hay subcategorías para ${categoria}</p>`;
        container.appendChild(noSubcategoriasMsg);
        return;
    }
    
    const subcategoriasGrid = document.createElement('div');
    subcategoriasGrid.className = 'subcategorias-grid';
    
    Object.keys(subcategorias).forEach(subcategoria => {
        const items = subcategorias[subcategoria];
        const sumaTotal = items.reduce((total, item) => total + (parseInt(item.CANTIDAD) || 0), 0);
        
        const subcategoriaCard = document.createElement('div');
        subcategoriaCard.className = 'subcategoria-card';
        
        const subcategoriaHeader = document.createElement('div');
        subcategoriaHeader.className = 'subcategoria-header';
        subcategoriaHeader.innerHTML = `
            <h3><i class="fas fa-tag"></i> ${subcategoria}</h3>
            <span class="item-count">${items.length} items</span>
            <span class="suma-total">Total: ${sumaTotal}</span>
        `;
        
        const subcategoriaContent = document.createElement('div');
        subcategoriaContent.className = 'subcategoria-content';
        
        const tabla = document.createElement('table');
        tabla.className = 'items-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Código</th>
                <th>Rango</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Sede</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        `;
        tabla.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        items.forEach(item => {
            const codigo = item.CODIGO || `${item.SUBCATEGORIA}-${item.RANGO}`;
            const estado = item.CANTIDAD ? 'Ocupada' : 'Libre';
            const estadoClase = estado === 'Ocupada' ? 'badge-ocupada' : 'badge-libre';
            
            const tr = document.createElement('tr');
            tr.className = 'item-row';
            tr.dataset.rango = item.RANGO;
            tr.dataset.categoria = item.CATEGORIA;
            tr.dataset.subcategoria = item.SUBCATEGORIA;
            
            tr.innerHTML = `
                <td>${codigo}</td>
                <td>${item.RANGO || ''}</td>
                <td>${item.CANTIDAD || ''}</td>
                <td>${item.MOTIVO || ''}</td>
                <td>${item.SEDE || ''}</td>
                <td><span class="badge ${estadoClase}">${estado}</span></td>
                <td>
                    <div class="action-icons">
                        <div class="action-icon view-icon ${estado === 'Libre' ? 'disabled' : ''}" title="Visualizar" 
                            data-codigo="${codigo}"
                            data-rango="${item.RANGO || ''}"
                            data-categoria="${item.CATEGORIA || ''}"
                            data-subcategoria="${item.SUBCATEGORIA || ''}"
                            data-cantidad="${item.CANTIDAD || ''}"
                            data-motivo="${item.MOTIVO || ''}"
                            data-sede="${item.SEDE || ''}"
                            data-fecha="${item.FECHA || 'No disponible'}"
                            data-responsable="${item.RESPONSABLE || 'No especificado'}" 
                            data-observacion="${item.OBSERVACION || 'Ninguna'}"
                            ${estado === 'Libre' ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                            <i class="fas fa-eye"></i>
                        </div>
                        ${estado === 'Libre' ? 
                        `<div class="action-icon new-icon" title="Nuevo"
                            data-codigo="${codigo}"
                            data-rango="${item.RANGO || ''}"
                            data-categoria="${item.CATEGORIA || ''}"
                            data-subcategoria="${item.SUBCATEGORIA || ''}">
                            <i class="fas fa-plus"></i>
                        </div>` : 
                        `<div class="action-icon edit-icon" title="Editar"
                            data-codigo="${codigo}"
                            data-rango="${item.RANGO || ''}"
                            data-categoria="${item.CATEGORIA || ''}"
                            data-subcategoria="${item.SUBCATEGORIA || ''}"
                            data-cantidad="${item.CANTIDAD || ''}"
                            data-motivo="${item.MOTIVO || ''}"
                            data-sede="${item.SEDE || ''}"
                            data-observacion="${item.OBSERVACION || ''}">
                            <i class="fas fa-edit"></i>
                        </div>`}
                        <div class="action-icon free-icon" title="Liberar" 
                            data-codigo="${codigo}"
                            data-rango="${item.RANGO || ''}"
                            ${estado === 'Libre' ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                            <i class="fas fa-unlock"></i>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        tabla.appendChild(tbody);
        subcategoriaContent.appendChild(tabla);
        subcategoriaCard.appendChild(subcategoriaHeader);
        subcategoriaCard.appendChild(subcategoriaContent);
        subcategoriasGrid.appendChild(subcategoriaCard);
    });
    
    container.appendChild(subcategoriasGrid);
}

function mostrarDatos(data) {
    produccionBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        console.log('No hay datos para mostrar');
        mostrarNoResultados();
        return;
    }
    
    console.log('Mostrando datos en la tabla:', data.length, 'registros');
    noResults.style.display = 'none';
    
    const datosAgrupados = {};
    data.forEach(item => {
        if (!item.CATEGORIA || !item.SUBCATEGORIA) {
            console.log('Item sin categoría o subcategoría:', item);
            return;
        }
        
        if (!datosAgrupados[item.CATEGORIA]) datosAgrupados[item.CATEGORIA] = {};
        if (!datosAgrupados[item.CATEGORIA][item.SUBCATEGORIA]) datosAgrupados[item.CATEGORIA][item.SUBCATEGORIA] = [];
        datosAgrupados[item.CATEGORIA][item.SUBCATEGORIA].push(item);
    });
    
    console.log('Datos agrupados:', datosAgrupados);
    
    if (!produccionBody) {
        console.error('El elemento produccionBody no existe en el DOM');
        return;
    }
    
    // Eliminar contenedores existentes
    document.querySelector('.categorias-buttons-container')?.remove();
    document.querySelector('.subcategorias-main-container')?.remove();
    
    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-content';
    
    const categoriasContainer = document.createElement('div');
    categoriasContainer.className = 'categorias-buttons-container';
    
    Object.keys(datosAgrupados).forEach((categoria, index) => {
        const categoriaBtn = document.createElement('button');
        categoriaBtn.className = 'categoria-btn';
        categoriaBtn.dataset.categoria = categoria;
        categoriaBtn.innerHTML = `<i class="fas fa-folder"></i> ${categoria}`;
        if (index === 0) categoriaBtn.classList.add('active');
        categoriasContainer.appendChild(categoriaBtn);
    });
    
    const subcategoriasMainContainer = document.createElement('div');
    subcategoriasMainContainer.className = 'subcategorias-main-container';
    
    mainContainer.appendChild(categoriasContainer);
    mainContainer.appendChild(subcategoriasMainContainer);
    produccionBody.appendChild(mainContainer);
    
    const primeraCategoria = Object.keys(datosAgrupados)[0];
    if (primeraCategoria) {
        mostrarSubcategorias(primeraCategoria, datosAgrupados[primeraCategoria], subcategoriasMainContainer);
    }
    
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            actualizarFiltroSubcategorias();
            
            const categoria = this.dataset.categoria;
            const subcategoriasContainer = document.querySelector('.subcategorias-main-container');
            subcategoriasContainer.innerHTML = '';
            mostrarSubcategorias(categoria, datosAgrupados[categoria], subcategoriasContainer);
        });
    });
    
    actualizarFiltroSubcategorias();
}

function filtrarDatos() {
    const rangoFiltro = filtroCarne.value.trim();
    const subcategoriaFiltro = filtroSubcategoria.value;
    const estadoFiltro = filtroEstado.value;
    const sedeFiltro = filtroSede.value;
    const categoriaActiva = document.querySelector('.categoria-btn.active')?.dataset.categoria;
    
    console.log('Aplicando filtros:', { rangoFiltro, categoriaActiva, subcategoriaFiltro, estadoFiltro, sedeFiltro });
    
    if (noResults) noResults.style.display = 'none';
    
    let datosFiltrados = produccionData;
    
    if (estadoFiltro || sedeFiltro || rangoFiltro) {
        datosFiltrados = produccionData.filter(item => {
            const estado = item.CANTIDAD ? 'Ocupada' : 'Libre';
            const rangoCoincide = !rangoFiltro || String(item.RANGO) === rangoFiltro;
            const estadoCoincide = !estadoFiltro || estado === estadoFiltro;
            const sedeCoincide = !sedeFiltro || item.SEDE === sedeFiltro;
            
            return rangoCoincide && estadoCoincide && sedeCoincide;
        });
        
        console.log('Resultados filtrados por estado/sede/rango en todas las categorías:', datosFiltrados.length);
        
        if (datosFiltrados.length === 0) {
            console.log('No se encontraron resultados con los filtros aplicados');
            mostrarNoResultados('No se encontraron resultados con los filtros aplicados');
            return;
        }
        
        mostrarDatos(datosFiltrados);
        return;
    }
    
    if (categoriaActiva) {
        datosFiltrados = datosFiltrados.filter(item => item.CATEGORIA === categoriaActiva);
    }
    
    datosFiltrados = datosFiltrados.filter(item => {
        const estado = item.CANTIDAD ? 'Ocupada' : 'Libre';
        return (!rangoFiltro || String(item.RANGO) === rangoFiltro) &&
               (!subcategoriaFiltro || item.SUBCATEGORIA === subcategoriaFiltro) &&
               (!estadoFiltro || estado === estadoFiltro) &&
               (!sedeFiltro || item.SEDE === sedeFiltro);
    });
    
    console.log('Resultados filtrados:', datosFiltrados.length);
    
    if (datosFiltrados.length === 0) {
        console.log('No se encontraron resultados con los filtros aplicados');
        mostrarNoResultados('No se encontraron resultados con los filtros aplicados');
        return;
    }
    
    mostrarDatos(datosFiltrados);
}

// ==================== FUNCIONES DE OPERACIONES ====================

async function liberarRangoSimple(rango) {
    try {
        // Show loading animation
        showLoading('free', `Liberando rango ${rango}...`);
        
        // Store the currently active category
        const activeCategory = document.querySelector('.categoria-btn.active')?.dataset.categoria;
        console.log('Categoría activa antes de liberar:', activeCategory);
        
        console.log("Rango a liberar:", rango);
        
        // Get the current user
        const usuario = sessionStorage.getItem('usuario') || 'Usuario';
        
        // Create payload for API
        const payload = {
            api: 'produccion',
            accion: 'liberar',
            produccion: {
                rango: rango,
                responsable: usuario
            }
        };
        
        console.log("Enviando datos para liberar:", payload);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Error al liberar rango: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Hide loading animation
            hideLoading();
            
            // Show success message
            showSuccessMessage('free', `El rango ${rango} ha sido liberado correctamente.`);
            
            const itemLiberado = produccionData.find(item => item.RANGO === rango);
            if (itemLiberado) {
                const produccionActualizada = {
                    codigo: itemLiberado.CODIGO || `${itemLiberado.SUBCATEGORIA}-${itemLiberado.RANGO}`,
                    rango: itemLiberado.RANGO,
                    categoria: itemLiberado.CATEGORIA,
                    subcategoria: itemLiberado.SUBCATEGORIA,
                    cantidad: '',
                    motivo: '',
                    sede: '',
                    fecha: '',
                    responsable: usuario,
                    observacion: ''
                };
                await actualizarItemLocalYMantenerCategoria(produccionActualizada, activeCategory);
            } else {
                await cargarDatosProduccion();
                
                if (activeCategory) {
                    const categoryButtons = document.querySelectorAll('.categoria-btn');
                    for (const btn of categoryButtons) {
                        if (btn.dataset.categoria === activeCategory) {
                            console.log('Seleccionando categoría después de recargar:', activeCategory);
                            btn.click();
                            break;
                        }
                    }
                }
            }
        } else {
            alert(`Error: ${result.message || 'No se pudo liberar el rango'}`);
        }
    } catch (error) {
        console.error('Error al liberar rango:', error);
        alert(`Error al liberar rango: ${error.message}`);
    } finally {
        const liberarButton = document.getElementById('btnConfirmarLiberar');
        if (liberarButton) liberarButton.disabled = false;
    }
}

function guardarRegistro() {
    const codigo = document.getElementById('edit-codigo').value;
    const rango = document.getElementById('edit-rango').value;
    const categoria = document.getElementById('edit-categoria').value;
    const subcategoria = document.getElementById('edit-subcategoria').value;
    const cantidad = document.getElementById('edit-cantidad').value;
    const motivo = document.getElementById('edit-motivo').value;
    const sede = document.getElementById('edit-sede').value;
    const observacion = document.getElementById('edit-observacion').value;
    const usuario = sessionStorage.getItem('usuario') || 'Usuario';
    
    const produccion = {
        codigo: codigo,
        rango: rango,
        categoria: categoria,
        subcategoria: subcategoria,
        cantidad: cantidad,
        fecha: new Date().toLocaleDateString('es-ES'),
        motivo: motivo,
        sede: sede,
        observacion: observacion,
        estado: "OCUPADA",
        responsable: usuario
    };
    
    const accion = 'guardar';
    const esNuevo = !document.getElementById('edit-cantidad').value;
    
    // Close the modal first
    hideModal('editModal');
    
    // Then show loading animation
    showLoading('save', esNuevo ? 'Creando nuevo registro...' : 'Actualizando registro...');
    
    // Then send data to API
    enviarDatosAPI(produccion, accion, esNuevo);
}

async function enviarDatosAPI(produccion, accion, esNuevo = false) {
    try {
        // Store the currently active category before making API call
        const activeCategory = document.querySelector('.categoria-btn.active')?.dataset.categoria;
        console.log('Categoría activa antes de enviar datos:', activeCategory);
        
        const payload = {
            api: 'produccion',
            accion: accion,
            produccion: produccion
        };
        
        console.log("Enviando datos:", payload);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Error al ${accion} registro: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Hide loading animation
            hideLoading();
            
            // Show success message
            showSuccessMessage(
                esNuevo ? 'save' : 'edit', 
                esNuevo ? 'El nuevo registro ha sido creado correctamente.' : 'El registro ha sido actualizado correctamente.'
            );
            
            // Actualizar el item en la vista actual sin recargar toda la página
            await actualizarItemLocalYMantenerCategoria(produccion, activeCategory);
        } else {
            // Hide loading animation
            hideLoading();
            alert(`Error: ${result.message || 'No se pudo completar la operación'}`);
        }
    } catch (error) {
        console.error(`Error al ${accion} registro:`, error);
        // Hide loading animation
        hideLoading();
        alert(`Error al ${accion} registro: ${error.message}`);
    }
}

async function actualizarItemLocalYMantenerCategoria(produccion, activeCategory) {
    console.log('Actualizando item y manteniendo categoría:', activeCategory);
    
    const itemIndex = produccionData.findIndex(item => 
        item.RANGO === produccion.rango && 
        item.CATEGORIA === produccion.categoria && 
        item.SUBCATEGORIA === produccion.subcategoria
    );
    
    if (itemIndex !== -1) {
        produccionData[itemIndex] = {
            ...produccionData[itemIndex],
            CODIGO: produccion.codigo || produccionData[itemIndex].CODIGO,
            RANGO: produccion.rango,
            CATEGORIA: produccion.categoria,
            SUBCATEGORIA: produccion.subcategoria,
            CANTIDAD: produccion.cantidad,
            MOTIVO: produccion.motivo,
            SEDE: produccion.sede,
            FECHA: produccion.fecha,
            RESPONSABLE: produccion.responsable,
            OBSERVACION: produccion.observacion
        };
        
        const currentActiveCategory = document.querySelector('.categoria-btn.active')?.dataset.categoria;
        console.log('Categoría actual:', currentActiveCategory, 'Categoría objetivo:', activeCategory);
        
        if (currentActiveCategory !== activeCategory && activeCategory) {
            const categoryButtons = document.querySelectorAll('.categoria-btn');
            let categoryFound = false;
            
            for (const btn of categoryButtons) {
                if (btn.dataset.categoria === activeCategory) {
                    console.log('Cambiando a categoría:', activeCategory);
                    btn.click();
                    categoryFound = true;
                    await new Promise(resolve => setTimeout(resolve, 100));
                    break;
                }
            }
            
            if (!categoryFound) console.warn('No se encontró el botón de categoría:', activeCategory);
        }
        
        const codigo = produccion.codigo || `${produccion.subcategoria}-${produccion.rango}`;
        const filas = document.querySelectorAll('.item-row');
        let filaEncontrada = false;
        
        console.log('Buscando fila con código:', codigo);
        for (const fila of filas) {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length > 0 && celdas[0].textContent === codigo) {
                console.log('Fila encontrada, actualizando...');
                filaEncontrada = true;
                
                celdas[2].textContent = produccion.cantidad || '';
                celdas[3].textContent = produccion.motivo || '';
                celdas[4].textContent = produccion.sede || '';
                
                const estado = produccion.cantidad ? 'Ocupada' : 'Libre';
                const estadoClase = estado === 'Ocupada' ? 'badge-ocupada' : 'badge-libre';
                celdas[5].innerHTML = `<span class="badge ${estadoClase}">${estado}</span>`;
                
                const accionesCell = celdas[6];
                accionesCell.innerHTML = `
                    <div class="action-icons">
                        <div class="action-icon view-icon ${estado === 'Libre' ? 'disabled' : ''}" title="Visualizar" 
                            data-codigo="${codigo}"
                            data-rango="${produccion.rango || ''}"
                            data-categoria="${produccion.categoria || ''}"
                            data-subcategoria="${produccion.subcategoria || ''}"
                            data-cantidad="${produccion.cantidad || ''}"
                            data-motivo="${produccion.motivo || ''}"
                            data-sede="${produccion.sede || ''}"
                            data-fecha="${produccion.fecha || 'No disponible'}"
                            data-responsable="${produccion.responsable || 'No especificado'}" 
                            data-observacion="${produccion.observacion || 'Ninguna'}"
                            ${estado === 'Libre' ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                            <i class="fas fa-eye"></i>
                        </div>
                        ${estado === 'Libre' ? 
                        `<div class="action-icon new-icon" title="Nuevo"
                            data-codigo="${codigo}"
                            data-rango="${produccion.rango || ''}"
                            data-categoria="${produccion.categoria || ''}"
                            data-subcategoria="${produccion.subcategoria || ''}">
                            <i class="fas fa-plus"></i>
                        </div>` : 
                        `<div class="action-icon edit-icon" title="Editar"
                            data-codigo="${codigo}"
                            data-rango="${produccion.rango || ''}"
                            data-categoria="${produccion.categoria || ''}"
                            data-subcategoria="${produccion.subcategoria || ''}"
                            data-cantidad="${produccion.cantidad || ''}"
                            data-motivo="${produccion.motivo || ''}"
                            data-sede="${produccion.sede || ''}"
                            data-observacion="${produccion.observacion || ''}">
                            <i class="fas fa-edit"></i>
                        </div>`}
                        <div class="action-icon delete-icon" title="Liberar" 
                            data-codigo="${codigo}"
                            data-rango="${produccion.rango || ''}"
                            ${estado === 'Libre' ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                            <i class="fas fa-unlock"></i>
                        </div>
                    </div>
                `;
                
                actualizarContadorSubcategoria(produccion.subcategoria);
                break;
            }
        }
        
        if (!filaEncontrada && currentActiveCategory === activeCategory) {
            console.log('Recargando datos manteniendo la categoría actual');
            await cargarDatosProduccion();
            
            const categoryButtons = document.querySelectorAll('.categoria-btn');
            for (const btn of categoryButtons) {
                if (btn.dataset.categoria === activeCategory) {
                    console.log('Reseleccionando categoría después de recargar:', activeCategory);
                    btn.click();
                    break;
                }
            }
        }
    } else {
        console.log('Item no encontrado en datos locales, recargando todo');
        await cargarDatosProduccion();
        
        if (activeCategory) {
            const categoryButtons = document.querySelectorAll('.categoria-btn');
            for (const btn of categoryButtons) {
                if (btn.dataset.categoria === activeCategory) {
                    console.log('Seleccionando categoría después de recargar:', activeCategory);
                    btn.click();
                    break;
                }
            }
        }
    }
}

function actualizarContadorSubcategoria(subcategoria) {
    const countElement = document.getElementById(`count-${subcategoria.replace(/\s+/g, '-')}`);
    if (!countElement) {
        console.log(`Elemento contador para subcategoría ${subcategoria} no encontrado`);
        return;
    }
    
    const items = produccionData.filter(item => item.SUBCATEGORIA === subcategoria);
    const itemsOcupados = items.filter(item => item.CANTIDAD).length;
    const itemsLibres = items.length - itemsOcupados;
    const sumaTotal = items.reduce((total, item) => total + (parseInt(item.CANTIDAD) || 0), 0);
    
    countElement.innerHTML = `
        <span class="count-ocupados">${itemsOcupados} ocupados</span> / 
        <span class="count-libres">${itemsLibres} libres</span>
    `;
    
    const sumaTotalElement = countElement.parentElement.querySelector('.suma-total');
    if (sumaTotalElement) {
        sumaTotalElement.textContent = `Total: ${sumaTotal}`;
    } else {
        const newSumaTotalElement = document.createElement('span');
        newSumaTotalElement.className = 'suma-total';
        newSumaTotalElement.textContent = `Total: ${sumaTotal}`;
        countElement.parentElement.appendChild(newSumaTotalElement);
    }
}

// ==================== FUNCIONES DE MODALES ====================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with ID ${modalId} not found`);
        return;
    }
    
    modal.style.display = 'block';
    void modal.offsetWidth;
    modal.classList.add('show');
    console.log(`Modal ${modalId} displayed`);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==================== CONFIGURACIÓN INICIAL ====================

function configurarEventos() {
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', filtrarDatos);
        
        const camposFiltro = [filtroCarne, filtroCategoria, filtroSubcategoria, filtroEstado, filtroSede];
        camposFiltro.forEach(campo => {
            if (campo) {
                campo.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        filtrarDatos();
                    }
                });
            }
        });
    }
    
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-icon:not(.disabled)')) {
            const viewIcon = e.target.closest('.view-icon');
            const fecha = viewIcon.getAttribute('data-fecha');
            const responsable = viewIcon.getAttribute('data-responsable');
            const observacion = viewIcon.getAttribute('data-observacion');
            
            const detalleFecha = document.getElementById('detalle-fecha');
            const detalleResponsable = document.getElementById('detalle-responsable');
            const detalleObservacion = document.getElementById('detalle-observacion');
            
            if (detalleFecha) detalleFecha.textContent = fecha || 'No disponible';
            if (detalleResponsable) detalleResponsable.textContent = responsable || 'No especificado';
            if (detalleObservacion) detalleObservacion.textContent = observacion || 'Ninguna';
            
            showModal('detallesModal');
            e.stopPropagation();
        }
        
        if (e.target.closest('.new-icon')) {
            const newIcon = e.target.closest('.new-icon');
            const codigo = newIcon.getAttribute('data-codigo');
            const rango = newIcon.getAttribute('data-rango');
            const categoria = newIcon.getAttribute('data-categoria');
            const subcategoria = newIcon.getAttribute('data-subcategoria');
            
            const editCodigo = document.getElementById('edit-codigo');
            const editRango = document.getElementById('edit-rango');
            const editCategoria = document.getElementById('edit-categoria');
            const editSubcategoria = document.getElementById('edit-subcategoria');
            const editCantidad = document.getElementById('edit-cantidad');
            const editMotivo = document.getElementById('edit-motivo');
            const editSede = document.getElementById('edit-sede');
            const editObservacion = document.getElementById('edit-observacion');
            const editModalTitle = document.getElementById('editModalTitle');
            
            if (editCodigo) editCodigo.value = codigo || '';
            if (editRango) editRango.value = rango || '';
            if (editCategoria) editCategoria.value = categoria || '';
            if (editSubcategoria) editSubcategoria.value = subcategoria || '';
            if (editCantidad) editCantidad.value = '';
            if (editMotivo) editMotivo.value = '';
            if (editSede) editSede.value = '';
            if (editObservacion) editObservacion.value = '';
            if (editModalTitle) editModalTitle.textContent = 'Nuevo Registro';
            
            showModal('editModal');
            e.stopPropagation();
        }
        
        if (e.target.closest('.edit-icon')) {
            const editIcon = e.target.closest('.edit-icon');
            const codigo = editIcon.getAttribute('data-codigo');
            const rango = editIcon.getAttribute('data-rango');
            const categoria = editIcon.getAttribute('data-categoria');
            const subcategoria = editIcon.getAttribute('data-subcategoria');
            const cantidad = editIcon.getAttribute('data-cantidad');
            const motivo = editIcon.getAttribute('data-motivo');
            const sede = editIcon.getAttribute('data-sede');
            const observacion = editIcon.getAttribute('data-observacion');
            
            const editCodigo = document.getElementById('edit-codigo');
            const editRango = document.getElementById('edit-rango');
            const editCategoria = document.getElementById('edit-categoria');
            const editSubcategoria = document.getElementById('edit-subcategoria');
            const editCantidad = document.getElementById('edit-cantidad');
            const editMotivo = document.getElementById('edit-motivo');
            const editSede = document.getElementById('edit-sede');
            const editObservacion = document.getElementById('edit-observacion');
            const editModalTitle = document.getElementById('editModalTitle');
            
            if (editCodigo) editCodigo.value = codigo || '';
            if (editRango) editRango.value = rango || '';
            if (editCategoria) editCategoria.value = categoria || '';
            if (editSubcategoria) editSubcategoria.value = subcategoria || '';
            if (editCantidad) editCantidad.value = cantidad || '';
            if (editMotivo) editMotivo.value = motivo || '';
            if (editSede) editSede.value = sede || '';
            if (editObservacion) editObservacion.value = observacion || '';
            if (editModalTitle) editModalTitle.textContent = 'Editar Registro';
            
            showModal('editModal');
            e.stopPropagation();
        }
        
        if (e.target.closest('.free-icon:not([style*="pointer-events: none"])')) {
            const freeIcon = e.target.closest('.free-icon');
            const rango = freeIcon.getAttribute('data-rango');
            
            const rangoElement = document.getElementById('liberar-codigo');
            if (rangoElement) rangoElement.textContent = rango;
            
            showModal('liberarModal');
            e.stopPropagation();
        }
        
        if (e.target.classList.contains('close') || 
            e.target.id === 'btnCancelarEdit' || 
            e.target.id === 'btnCancelarLiberar' ) { 
            
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal.id);
            e.stopPropagation();
        }
    });
    
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            guardarRegistro();
        });
    } else {
        console.error('Formulario de edición no encontrado');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('usuario')) {
        window.location.href = '../login.html';
        return;
    }
    
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal) modal.style.display = 'none';
    });
    
    const btnConfirmarLiberar = document.getElementById('btnConfirmarLiberar');
    if (btnConfirmarLiberar) {
        btnConfirmarLiberar.addEventListener('click', function() {
            const rango = document.getElementById('liberar-codigo').textContent;
            hideModal('liberarModal');
            
            if (rango) liberarRangoSimple(rango);
            else console.error('No se encontró un rango válido para liberar');
        });
    }
    
    const btnCancelarLiberar = document.getElementById('btnCancelarLiberar');
    if (btnCancelarLiberar) {
        btnCancelarLiberar.addEventListener('click', function() {
            hideModal('liberarModal');
        });
    }

    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) hideModal(modal.id);
        });
    });
    
    cargarDatosProduccion();
    configurarEventos();
});

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        hideModal(event.target.id);
    }
});

    // Function to show loading animation
    function showLoading(action, message) {
        // Create loading overlay if it doesn't exist
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            const title = document.createElement('div');
            title.className = 'loading-title';
            
            const text = document.createElement('div');
            text.className = 'loading-text';
            
            loadingMessage.appendChild(spinner);
            loadingMessage.appendChild(title);
            loadingMessage.appendChild(text);
            overlay.appendChild(loadingMessage);
            document.body.appendChild(overlay);
        }
        
        // Set message content based on action
        const title = overlay.querySelector('.loading-title');
        const text = overlay.querySelector('.loading-text');
        
        // Remove previous action classes
        overlay.classList.remove('loading-save', 'loading-free');
        
        // Add appropriate action class
        if (action === 'save') {
            overlay.classList.add('loading-save');
            title.textContent = 'Guardando';
            text.textContent = message || 'Procesando su solicitud...';
        } else if (action === 'free') {
            overlay.classList.add('loading-free');
            title.textContent = 'Liberando';
            text.textContent = message || 'Procesando su solicitud...';
        }
        
        // Show overlay with animation
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
        
        return overlay;
    }
    
    // Function to hide loading animation
    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                // Optional: remove from DOM
                // overlay.remove();
            }, 300);
        }
    }
    
    