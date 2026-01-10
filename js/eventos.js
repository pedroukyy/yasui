const eventosApp = {
    init: () => {
        eventosApp.render();
    },

    render: async () => {
        const container = document.getElementById('grid-eventos');
        if (!container) return;

        // Recuperar usuario del localStorage
        const session = JSON.parse(localStorage.getItem('yasui_session'));
        const isAdmin = session && session.rol === 'admin';

        try {
            const res = await fetch('/api/events');
            const eventos = await res.json();

            container.innerHTML = '';
            
            eventos.forEach(ev => {
                const card = document.createElement('div');
                card.className = 'event-card';
                // Formato de fecha legible
                const fechaFormat = new Date(ev.fecha).toISOString().split('T')[0];

                card.innerHTML = `
                    <div class="event-content">
                        <h2>${ev.nombre}</h2>
                        <div class="event-info-row">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${fechaFormat}</span>
                        </div>
                        <div class="event-info-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${ev.lugar}</span>
                        </div>
                        
                        <button class="btn-reserve" onclick="eventosApp.reservar(${ev.id}, '${ev.nombre}')">
                            Reservar Entrada
                        </button>

                        ${isAdmin ? 
                            `<button class="btn-reserve btn-delete" onclick="eventosApp.eliminar(${ev.id})">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>` : ''}
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            console.error("Error cargando eventos:", error);
            container.innerHTML = '<p style="text-align:center">Error de conexión.</p>';
        }
    },

    reservar: async (eventId, eventName) => {
        // 1. Verificar si está logueado
        const session = JSON.parse(localStorage.getItem('yasui_session'));

        if (!session || !session.id) {
            alert("🔒 Debes iniciar sesión para reservar.");
            // Abrir modal de login automáticamente (si existe en el DOM)
            const modal = document.getElementById('modal-login');
            if (modal) modal.style.display = 'flex';
            return;
        }

        // 2. Si está logueado, enviar petición al backend
        if(!confirm(`¿Quieres reservar tu entrada para: ${eventName}?`)) return;

        try {
            const res = await fetch('/api/reservar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: session.id, // Enviamos el ID del usuario
                    eventId: eventId 
                })
            });

            const data = await res.json();
            alert(data.message);

        } catch (error) {
            console.error(error);
            alert("Error al intentar reservar.");
        }
    },

    crear: async () => {
        const nombre = document.getElementById('ev-nombre').value;
        const fecha = document.getElementById('ev-fecha').value;
        const lugar = document.getElementById('ev-lugar').value;

        if(!nombre || !fecha || !lugar) return alert("Completa los campos");

        await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, fecha, lugar })
        });
        
        document.getElementById('ev-nombre').value = '';
        document.getElementById('ev-fecha').value = '';
        document.getElementById('ev-lugar').value = '';
        eventosApp.render();
    },

    eliminar: async (id) => {
        if (!confirm("¿Eliminar evento?")) return;
        
        await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id })
        });
        eventosApp.render();
    }
};

document.addEventListener('DOMContentLoaded', eventosApp.init);