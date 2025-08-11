// Sidebar Functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing sidebar');
    
    // Check login information
    checkLoginInfo();
    
    // Check if all sidebar elements exist
    checkSidebarElements();
    
    // Initialize sidebar after short delay
    setTimeout(initializeSidebar, 100);
});

/**
 * Check login information in session storage
 */
function checkLoginInfo() {
    console.log('Checking login information...');
    
    // List all session storage keys and values
    console.log('All session storage items:');
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        console.log(`${key}: ${sessionStorage.getItem(key)}`);
    }
    
    // Check if user is logged in (try different case variations)
    const usuario = sessionStorage.getItem('USUARIO') || sessionStorage.getItem('usuario');
    const cargo = sessionStorage.getItem('CARGO') || sessionStorage.getItem('cargo');
    const sede = sessionStorage.getItem('SEDE') || sessionStorage.getItem('sede');
    
    if (!usuario || !cargo || !sede) {
        console.warn('Missing login information. User might not be logged in properly.');
        console.log('Available session data:', {
            usuario: usuario || 'Not set',
            cargo: cargo || 'Not set',
            sede: sede || 'Not set'
        });
    } else {
        console.log('User is logged in:', {
            usuario: usuario,
            cargo: cargo,
            sede: sede
        });
    }
}

/**
 * Initialize the sidebar with all functionality
 */
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!sidebar) return;
    
    // Initialize sidebar state
    let sidebarOpen = false;
    
    // Load user information from session storage
    loadUserInformation();
    
    // Set up sidebar toggle functionality
    function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
        sidebar.classList.toggle('open', sidebarOpen);
        if (sidebarOverlay) sidebarOverlay.classList.toggle('open', sidebarOpen);
        if (sidebarToggle) sidebarToggle.style.display = sidebarOpen ? 'none' : 'flex';
        document.body.classList.toggle('sidebar-open', sidebarOpen);
    }
    
    function closeSidebar() {
        sidebarOpen = false;
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        if (sidebarToggle) sidebarToggle.style.display = 'flex';
        document.body.classList.remove('sidebar-open');
    }
    
    // Add event listeners
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // Close sidebar when clicking a link (on mobile)
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a:not(.submenu a)');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
    
    // Logout functionality - MODIFIED
    if (logoutBtn) {
        logoutBtn.addEventListener('click', showLogoutModal);
    }
    
    // Confirm logout button
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', confirmLogout);
    }
    
    // Cancel logout button
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', hideLogoutModal);
    }
    
    // Highlight current page in sidebar
    highlightCurrentPage();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebarOpen) {
            closeSidebar();
        }
    });
}

// NEW: Show logout modal function
function showLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        logoutModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

// NEW: Hide logout modal function
function hideLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        logoutModal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// NEW: Confirm logout function
function confirmLogout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

function loadUserInformation() {
    // Get elements
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userLocationElement = document.getElementById('userLocation');
    const logoSR = document.getElementById('logoSR');
    const logoMP = document.getElementById('logoMP');
    
    // Get user info from session storage
    let userSession;
    try {
        userSession = JSON.parse(sessionStorage.getItem('userSession')) || JSON.parse(sessionStorage.getItem('userData'));
    } catch (e) {
        console.error('Error parsing user session data:', e);
        userSession = {};
    }
    
    console.log('User session data:', userSession);
    
    // Get individual values
    const userName = userSession?.nombre || sessionStorage.getItem('usuario') || 'Usuario';
    const userRole = userSession?.cargo || 'Cargo';
    const locationName = userSession?.sede || 'Sin sede';
    
    console.log('User info extracted:', { userName, userRole, locationName });
    
    // Set user name and role
    if (userNameElement) userNameElement.textContent = userName;
    if (userRoleElement) userRoleElement.textContent = userRole;
    if (userLocationElement) userLocationElement.textContent = locationName;
    
    // Make sure both logos are initially hidden
    if (logoSR) logoSR.style.display = 'none';
    if (logoMP) logoMP.style.display = 'none';
    
    // Set restaurant logo based on location
    if (locationName && locationName.toUpperCase().includes('SANTA')) {
        if (logoSR) logoSR.style.display = 'block';
        console.log('Showing Santa Rosa logo');
    } else if (locationName && locationName.toUpperCase().includes('FILANDIA')) {
        if (logoMP) logoMP.style.display = 'block';
        console.log('Showing Filandia logo');
    } else {
        console.log('No location found or unknown location:', locationName);
    }
}

/**
 * Highlight the current page in the sidebar
 */
function highlightCurrentPage() {
    // Get current page from URL
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    
    // Find and highlight the corresponding link
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        const linkHref = link.getAttribute('href').toLowerCase();
        
        // Check if the current page matches the link href
        if (currentPage === linkHref || 
            (currentPage === '' && linkHref === 'inicio.html') || 
            (currentPage === 'index.html' && linkHref === 'inicio.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Function to manually open the sidebar
 */
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar) {
        sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('open');
        
        // Check if we're on the production page
        const isProductionPage = window.location.pathname.includes('produccion.html');
        
        // Only shift content if we're not on the production page
        if (mainContent && !isProductionPage && window.innerWidth > 768) {
            mainContent.classList.add('shifted');
        }
        
        document.body.classList.add('sidebar-open');
    }
}

/**
 * Function to manually close the sidebar
 */
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar) {
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        if (mainContent) mainContent.classList.remove('shifted');
        document.body.classList.remove('sidebar-open');
    }
}

/**
 * Check if all required sidebar elements exist
 */
function checkSidebarElements() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    console.log('Sidebar elements check:');
    console.log('- Sidebar:', sidebar ? 'Found' : 'Missing');
    console.log('- Toggle button:', sidebarToggle ? 'Found' : 'Missing');
    console.log('- Overlay:', sidebarOverlay ? 'Found' : 'Missing');
    
    // Check if sidebar CSS is loaded
    const isSidebarCSSLoaded = Array.from(document.styleSheets).some(sheet => 
        sheet.href && sheet.href.includes('sidebar.css')
    );
    console.log('- Sidebar CSS:', isSidebarCSSLoaded ? 'Loaded' : 'Not loaded');
    
    // If CSS is not loaded, load it
    if (!isSidebarCSSLoaded) {
        console.log('Loading sidebar CSS');
        loadSidebarCSS();
    }
    
    // If sidebar doesn't exist, try to load the sidebar HTML
    if (!sidebar) {
        console.log('Sidebar not found, attempting to load sidebar.html');
        loadSidebarHTML();
    }
    
    // If sidebar exists but toggle button doesn't, create it
    if (sidebar && !sidebarToggle) {
        console.log('Creating missing toggle button');
        createSidebarToggle();
    }
    
    // If sidebar exists but overlay doesn't, create it
    if (sidebar && !sidebarOverlay) {
        console.log('Creating missing overlay');
        createSidebarOverlay();
    }
}

/**
 * Create sidebar overlay if it doesn't exist
 */
function createSidebarOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
}

/**
 * Load sidebar CSS if not already loaded
 */
function loadSidebarCSS() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'css/sidebar.css';
    document.head.appendChild(link);
}

/**
 * Load sidebar HTML dynamically
 */
function loadSidebarHTML() {
    fetch('sidebar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load sidebar.html');
            }
            return response.text();
        })
        .then(html => {
            // Insert the sidebar HTML at the beginning of the body
            const div = document.createElement('div');
            div.innerHTML = html.trim();
            
            // Insert each child node from the loaded HTML
            while (div.firstChild) {
                document.body.insertBefore(div.firstChild, document.body.firstChild);
            }
            
            // Now that the sidebar is loaded, initialize it
            initializeSidebar();
        })
        .catch(error => {
            console.error('Error loading sidebar HTML:', error);
            // Create a basic sidebar structure if loading fails
            createBasicSidebar();
        });
}

/**
 * Create a basic sidebar structure if loading sidebar.html fails
 */
function createBasicSidebar() {
    // Create sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    sidebar.className = 'sidebar';
    
    // Create sidebar header
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    const logo = document.createElement('img');
    logo.id = 'locationLogo';
    logo.src = 'img/logo-default.png';
    logo.alt = 'Logo Restaurante';
    
    const restaurantName = document.createElement('h3');
    restaurantName.id = 'restaurantName';
    restaurantName.textContent = 'Restaurante';
    
    const userName = document.createElement('p');
    userName.id = 'userName';
    userName.textContent = 'Usuario';
    
    const userRole = document.createElement('p');
    userRole.id = 'userRole';
    userRole.textContent = 'Cargo';
    
    userInfo.appendChild(logo);
    userInfo.appendChild(restaurantName);
    userInfo.appendChild(userName);
    userInfo.appendChild(userRole);
    header.appendChild(userInfo);
    
    // Create sidebar menu
    const menu = document.createElement('nav');
    menu.className = 'sidebar-menu';
    
    // Add basic menu items
    const menuItems = [
        { href: 'inicio.html', icon: 'fa-home', text: 'Inicio' },
        { href: 'produccion.html', icon: 'fa-industry', text: 'Producción' },
        { href: 'inventario.html', icon: 'fa-boxes', text: 'Inventario' }
    ];
    
    menuItems.forEach(item => {
        const link = document.createElement('a');
        link.href = item.href;
        link.innerHTML = `<i class="fas ${item.icon}"></i> ${item.text}`;
        menu.appendChild(link);
    });
    
    // Create sidebar footer
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'logout-btn';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar Sesión';
    
    footer.appendChild(logoutBtn);
    
    // Assemble sidebar
    sidebar.appendChild(header);
    sidebar.appendChild(menu);
    sidebar.appendChild(footer);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    
    // Add to document
    document.body.appendChild(sidebar);
    document.body.appendChild(overlay);
    
    // Create toggle button
    createSidebarToggle();
    
    // Initialize sidebar
    initializeSidebar();
}

/**
 * Create sidebar toggle button if it doesn't exist
 */
function createSidebarToggle() {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'sidebarToggle';
    toggleButton.className = 'sidebar-toggle';
    toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
    toggleButton.style.position = 'fixed';
    toggleButton.style.top = '15px';
    toggleButton.style.left = '15px';
    toggleButton.style.zIndex = '1000';
    toggleButton.style.display = 'flex';
    toggleButton.style.opacity = '1';
    toggleButton.style.visibility = 'visible';
    toggleButton.style.background = '#2c3e50';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '4px';
    toggleButton.style.padding = '10px';
    toggleButton.style.cursor = 'pointer';
    
    document.body.appendChild(toggleButton);

}
