// Event listeners for the new buttons
document.addEventListener('DOMContentLoaded', function() {
    // Button event listeners
    const btnIngreso = document.getElementById('btn-ingreso');
    const btnConteo = document.getElementById('btn-conteo');
    
    if (btnIngreso) {
        btnIngreso.addEventListener('click', function() {
            // Handle ingreso button click
            console.log('Ingreso button clicked');            
            window.location.href = 'ingresos.html';
        });
    }
    
    if (btnConteo) {
        btnConteo.addEventListener('click', function() {
            // Handle conteo button click
            console.log('Conteo button clicked');            
           window.location.href = 'conteo.html';
        });
    }    
    
    const filtrosPanel = document.querySelector('.filtros-panel');
    if (filtrosPanel) {
        filtrosPanel.style.display = 'none';        
    }
    
    // Update information panel with mock data
    updateInfoPanel();
});

function updateInfoPanel() {    
    const totalArticulos = 156;
    const stockBajo = 12;
    const stockAgotado = 5;
    const stockNormal = 139;
    
    // Update the DOM elements
    document.getElementById('total-articulos').textContent = totalArticulos;
    document.getElementById('stock-bajo').textContent = stockBajo;
    document.getElementById('stock-agotado').textContent = stockAgotado;
    document.getElementById('stock-normal').textContent = stockNormal;
}

// Load inventory data
function cargarInventario() {
    // Show loader
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'flex';
    }
    
    // This would be replaced with an actual API call
    setTimeout(() => {
        // Mock data for demonstration
        const inventarioData = [
            { id: 1, codigo: 'A001', nombre: 'Arroz', categoria: 'Granos', stock: 150, minimo: 50, maximo: 200 },
            { id: 2, codigo: 'C001', nombre: 'Carne de res', categoria: 'Carnes', stock: 25, minimo: 30, maximo: 100 },
            { id: 3, codigo: 'V001', nombre: 'Tomate', categoria: 'Verduras', stock: 45, minimo: 20, maximo: 80 },
            { id: 4, codigo: 'L001', nombre: 'Leche', categoria: 'Lácteos', stock: 60, minimo: 40, maximo: 120 }
        ];
        
        renderizarTablaInventario(inventarioData);
        
        // Hide loader
        if (loader) {
            loader.style.display = 'none';
        }
    }, 1000);
}

// Render inventory table
function renderizarTablaInventario(data) {
    const tableBody = document.getElementById('produccionBody');
    const tableHead = document.querySelector('#produccionTable thead tr');
    
    if (!tableBody || !tableHead) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    tableHead.innerHTML = '';
    
    // Add table headers
    const headers = ['Código', 'Nombre', 'Categoría', 'Stock Actual', 'Mínimo', 'Máximo', 'Estado', 'Acciones'];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        tableHead.appendChild(th);
    });
    
    // Add table rows
    data.forEach(item => {
        const row = document.createElement('tr');
        
        // Determine stock status
        let status = 'normal';
        let statusText = 'Normal';
        
        if (item.stock <= 0) {
            status = 'agotado';
            statusText = 'Agotado';
        } else if (item.stock < item.minimo) {
            status = 'bajo';
            statusText = 'Bajo';
        } else if (item.stock > item.maximo) {
            status = 'exceso';
            statusText = 'Exceso';
        }
        
        row.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.nombre}</td>
            <td>${item.categoria}</td>
            <td>${item.stock}</td>
            <td>${item.minimo}</td>
            <td>${item.maximo}</td>
            <td><span class="status-badge ${status}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" data-id="${item.id}"><i class="fas fa-eye"></i></button>
                    <button class="btn-action btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            verDetalles(id);
        });
    });
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            editarItem(id);
        });
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    cargarInventario();
});