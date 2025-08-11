/**
 * Listas de opciones para los campos desplegables del sistema
 */
const listas = {
    // Lista de sedes
    sedes: [
        { id: 'SANTA ROSA', nombre: 'SANTA ROSA' },
        { id: 'FILANDIA', nombre: 'FILANDIA' },
        { id: 'ALL', nombre: 'AMBAS' }
    ],
    
    // Lista de tipos de artículos
    tipos: [
        { id: 'JUGOS', nombre: 'JUGOS' },
        { id: 'BODEGA', nombre: 'BODEGA' },
        { id: 'CAFETERIA', nombre: 'CAFETERIA' }
    ],
    
    // Categorías organizadas por tipo
    categorias: {
        'JUGOS': [
            { id: 'VIDRIERIA', nombre: 'VIDRIERIA' },
            { id: 'PULPAS', nombre: 'PULPAS' }
        ],
        'BODEGA': [
            { id: 'GASEOSAS', nombre: 'GASEOSAS' }
        ],
        'CAFETERIA': [
            { id: 'PAQUETES', nombre: 'PAQUETES' }
        ]
    },
    
    // Configuración de modos por tipo y categoría
    modosPorTipoCategoria: {
        'JUGOS': {
            'VIDRIERIA': 'MENSUAL',
            'PULPAS': 'SEMANAL'
        },
        'BODEGA': {
            'GASEOSAS': 'DIARIO'
        },
        'CAFETERIA': {
            'PAQUETES': 'DIARIO'
        }
    },
    
    // Lista de modelos
    modelos: [
        { id: 'UNIDAD', nombre: 'UNIDAD' },
        { id: 'PAQUETE', nombre: 'PAQUETE' },
        { id: 'PACA', nombre: 'PACA' },
        { id: 'KILO', nombre: 'KILO' }
    ],
    
    /**
     * Carga las opciones en un elemento select
     * @param {HTMLSelectElement} selectElement - El elemento select a poblar
     * @param {Array} opciones - Array de objetos con id y nombre
     * @param {string} valorSeleccionado - Valor que debe quedar seleccionado (opcional)
     */
    cargarOpciones(selectElement, opciones, valorSeleccionado = '') {
        if (!selectElement) return;
        
        // Mantener solo la primera opción (placeholder)
        const primeraOpcion = selectElement.options[0] || 
                             (() => {
                                 const option = document.createElement('option');
                                 option.value = '';
                                 option.textContent = 'Seleccionar';
                                 selectElement.appendChild(option);
                                 return option;
                             })();
        
        selectElement.innerHTML = '';
        selectElement.appendChild(primeraOpcion);
        
        // Agregar las opciones
        opciones.forEach(opcion => {
            const option = document.createElement('option');
            option.value = opcion.id;
            option.textContent = opcion.nombre;
            selectElement.appendChild(option);
        });
        
        // Seleccionar valor si existe
        if (valorSeleccionado) {
            const opcionExiste = Array.from(selectElement.options).some(opt => opt.value === valorSeleccionado);
            if (opcionExiste) {
                selectElement.value = valorSeleccionado;
                this.markAsSelected(selectElement);
            }
        }
    },
    
    /**
     * Marca un elemento como seleccionado
     * @param {HTMLElement} element - Elemento a marcar
     */
    markAsSelected(element) {
        element.classList.add('has-value');
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) label.classList.add('has-value');
    },
    
    /**
     * Carga las categorías basadas en el tipo seleccionado
     * @param {string} tipoSeleccionado - El tipo seleccionado
     * @param {HTMLSelectElement} categoriaSelect - El elemento select de categoría
     * @param {string} valorSeleccionado - Categoría que debe quedar seleccionada (opcional)
     */
    cargarCategoriasPorTipo(tipoSeleccionado, categoriaSelect, valorSeleccionado = '') {
        if (!categoriaSelect) return;
        
        // Si no hay tipo seleccionado, limpiar categorías y deshabilitar
        if (!tipoSeleccionado) {
            categoriaSelect.innerHTML = '<option value="">Seleccionar</option>';
            categoriaSelect.disabled = true;
            return;
        }
        
        // Habilitar el selector de categoría
        categoriaSelect.disabled = false;
        
        // Obtener categorías para el tipo seleccionado
        const categorias = this.categorias[tipoSeleccionado] || [];
        this.cargarOpciones(categoriaSelect, categorias, valorSeleccionado);
    },
    
    /**
     * Establece el modo automáticamente según el tipo y categoría
     * @param {string} tipo - El tipo seleccionado
     * @param {string} categoria - La categoría seleccionada
     * @param {HTMLInputElement} modoInput - El elemento input de modo
     */
    establecerModoPorTipoCategoria(tipo, categoria, modoInput) {
        if (!modoInput) return;
        
        if (!tipo || !categoria) {
            modoInput.value = '';
            modoInput.disabled = false;
            return;
        }
        
        // Buscar el modo correspondiente
        const modoAsignado = this.modosPorTipoCategoria[tipo]?.[categoria];
        
        if (modoAsignado) {
            modoInput.value = modoAsignado;
            modoInput.disabled = true;
            this.markAsSelected(modoInput);
        } else {
            modoInput.value = '';
            modoInput.disabled = false;
        }
    },
    
    /**
     * Inicializa todos los selectores en el formulario
     * @param {Object} valoresActuales - Objeto con los valores actuales para edición
     */
    inicializarSelectores(valoresActuales = {}) {
        // Cargar sedes
        const sedeSelect = document.getElementById('sede');
        if (sedeSelect) {
            this.cargarOpciones(sedeSelect, this.sedes, valoresActuales.sede);
        }
        
        // Cargar tipos
        const tipoSelect = document.getElementById('tipo');
        const categoriaSelect = document.getElementById('categoria');
        const modoInput = document.getElementById('modo');
        
        // Configurar tipo
        if (tipoSelect) {
            this.cargarOpciones(tipoSelect, this.tipos, valoresActuales.tipo);
            
            // Configurar evento para actualizar categorías cuando cambia el tipo
            tipoSelect.addEventListener('change', () => {
                if (categoriaSelect) {
                    this.cargarCategoriasPorTipo(tipoSelect.value, categoriaSelect);
                    if (modoInput) modoInput.value = '';
                }
            });
        }
        
        // Cargar categorías basadas en el tipo (si hay valores actuales)
        if (categoriaSelect && valoresActuales.tipo) {
            this.cargarCategoriasPorTipo(valoresActuales.tipo, categoriaSelect, valoresActuales.categoria);
            
            // Configurar evento para actualizar modo cuando cambia la categoría
            categoriaSelect.addEventListener('change', () => {
                if (modoInput && tipoSelect) {
                    this.establecerModoPorTipoCategoria(tipoSelect.value, categoriaSelect.value, modoInput);
                }
            });
        } else if (categoriaSelect) {
            categoriaSelect.addEventListener('change', () => {
                if (modoInput && tipoSelect) {
                    this.establecerModoPorTipoCategoria(tipoSelect.value, categoriaSelect.value, modoInput);
                }
            });
        }
        
        // Establecer modo si hay valores actuales
        if (modoInput && valoresActuales.modo) {
            modoInput.value = valoresActuales.modo;
            this.markAsSelected(modoInput);
            
            if (valoresActuales.tipo && valoresActuales.categoria) {
                this.establecerModoPorTipoCategoria(valoresActuales.tipo, valoresActuales.categoria, modoInput);
            }
        }
        
        // Cargar modelos
        const modeloSelect = document.getElementById('modelo');
        if (modeloSelect) {
            this.cargarOpciones(modeloSelect, this.modelos, valoresActuales.modelo);
        }
    },
    
    /**
     * Inicializa los filtros en la página principal
     */
    inicializarFiltros() {
        // Cargar sedes en filtro
        const filtroSedeSelect = document.getElementById('filtroSede');
        if (filtroSedeSelect) {
            this.cargarOpciones(filtroSedeSelect, this.sedes);
        }
        
        // Cargar tipos en filtro
        const filtroTipoSelect = document.getElementById('filtroTipo');
        if (filtroTipoSelect) {
            this.cargarOpciones(filtroTipoSelect, this.tipos);
            
            // Configurar evento para actualizar categorías cuando cambia el tipo
            filtroTipoSelect.addEventListener('change', () => {
                const filtroCategoriaSelect = document.getElementById('filtroCategoria');
                if (filtroCategoriaSelect) {
                    this.cargarCategoriasPorTipo(filtroTipoSelect.value, filtroCategoriaSelect);
                }
            });
        }
        
        // Inicializar categorías vacías en filtro
        const filtroCategoriaSelect = document.getElementById('filtroCategoria');
        if (filtroCategoriaSelect) {
            filtroCategoriaSelect.innerHTML = '<option value="">Seleccionar</option>';
            filtroCategoriaSelect.disabled = true;
        }
    }
};

// Exportar el objeto listas para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = listas;
}