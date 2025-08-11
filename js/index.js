// Estado de la aplicación
const AppState = {
    notifications: [],
    recentActivity: [],
    stats: {
        totalItems: 0,
        lowStock: 0,
        activeSuppliers: 0
    }
};

// Controlador principal
const DashboardController = {
    init() {
        this.loadUserInfo();
        this.updateDateTime();
        this.setupEventListeners();
        this.loadDashboardData();
        
        // Actualizar fecha y hora cada minuto
        setInterval(() => this.updateDateTime(), 60000);
    },

    loadUserInfo() {
        const userSession = JSON.parse(sessionStorage.getItem('userSession')) || {};
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = userSession.nombre || 'Usuario';
        }
    },

    updateDateTime() {
        const dateTimeElement = document.getElementById('currentDateTime');
        if (dateTimeElement) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            dateTimeElement.textContent = now.toLocaleDateString('es-ES', options);
        }
    },

    setupEventListeners() {
        // Botón de notificaciones
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsPanel = document.getElementById('notificationsPanel');
        const closeNotifications = document.getElementById('closeNotifications');

        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                notificationsPanel.classList.add('open');
            });
        }

        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => {
                notificationsPanel.classList.remove('open');
            });
        }

        // Cerrar panel al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (notificationsPanel && notificationsPanel.classList.contains('open')) {
                if (!notificationsPanel.contains(e.target) && e.target !== notificationsBtn) {
                    notificationsPanel.classList.remove('open');
                }
            }
        });
    },

    async loadDashboardData() {
        try {
            // Simular carga de datos
            await this.loadStats();
            await this.loadNotifications();
            await this.loadRecentActivity();
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
        }
    },

    async loadStats() {
        try {
            // Aquí deberías hacer la llamada a tu API
            const response = await fetch('/api/dashboard/stats');
            const data = await response.json();
            
            // Actualizar estadísticas
            document.getElementById('totalItems').textContent = data.totalItems;
            document.getElementById('lowStock').textContent = data.lowStock;
            document.getElementById('activeSuppliers').textContent = data.activeSuppliers;
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Mostrar datos de ejemplo en caso de error
            document.getElementById('totalItems').textContent = '150';
            document.getElementById('lowStock').textContent = '12';
            document.getElementById('activeSuppliers').textContent = '8';
        }
    },

    async loadNotifications() {
        try {
            // Aquí deberías hacer la llamada a tu API
            const response = await fetch('/api/notifications');
            const notifications = await response.json();
            
            this.renderNotifications(notifications);
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
            // Mostrar notificaciones de ejemplo
            const demoNotifications = [
                {
                    type: 'warning',
                    title: 'Stock Bajo',
                    message: 'Varios artículos están por debajo del stock mínimo',
                    time: '5 min'
                },
                {
                    type: 'success',
                    title: 'Pedido Completado',
                    message: 'Pedido #1234 ha sido entregado',
                    time: '10 min'
                }
            ];
            this.renderNotifications(demoNotifications);
        }
    },

    async loadRecentActivity() {
        try {
            // Aquí deberías hacer la llamada a tu API
            const response = await fetch('/api/recent-activity');
            const activities = await response.json();
            
            this.renderRecentActivity(activities);
        } catch (error) {
            console.error('Error cargando actividad reciente:', error);
            // Mostrar actividades de ejemplo
            const demoActivities = [
                {
                    type: 'update',
                    title: 'Actualización de Inventario',
                    message: 'Se actualizó el stock de 5 artículos',
                    time: '15 min'
                },
                {
                    type: 'new',
                    title: 'Nuevo Proveedor',
                    message: 'Se agregó un nuevo proveedor',
                    time: '1 hora'
                }
            ];
            this.renderRecentActivity(demoActivities);
        }
    },

    renderNotifications(notifications) {
        const notificationsList = document.getElementById('notificationsList');
        const notificationsContent = document.querySelector('.notifications-content');
        const notificationCount = document.getElementById('notificationCount');

        if (notificationCount) {
            notificationCount.textContent = notifications.length;
        }

        const notificationsHTML = notifications.map(notification => `
            <div class="notification-item">
                <div class="notification-icon ${notification.type}">
                    <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${notification.time}</div>
                </div>
            </div>
        `).join('');

        if (notificationsList) {
            notificationsList.innerHTML = notificationsHTML;
        }
        if (notificationsContent) {
            notificationsContent.innerHTML = notificationsHTML;
        }
    },

    renderRecentActivity(activities) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');

        activityList.innerHTML = activitiesHTML;
    },

    getNotificationIcon(type) {
        switch (type) {
            case 'warning': return 'fa-exclamation-triangle';
            case 'success': return 'fa-check-circle';
            case 'danger': return 'fa-times-circle';
            default: return 'fa-bell';
        }
    },

    getActivityIcon(type) {
        switch (type) {
            case 'update': return 'fa-sync';
            case 'new': return 'fa-plus-circle';
            case 'delete': return 'fa-trash';
            default: return 'fa-circle';
        }
    }
};

// Inicializar el dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    DashboardController.init();
});