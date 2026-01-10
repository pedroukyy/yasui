const eventosApp = {
    // Datos iniciales si no hay nada en storage
    db: JSON.parse(localStorage.getItem('eventosYasui')) || [
        { id: 1, nombre: "Anime Day 2026", fecha: "2026-03-15", lugar: "Bogotá - Sede Central" },
        { id: 2, nombre: "PizzAnime Cosplay Night", fecha: "2026-04-10", lugar: "Cali - Sede Sur" },
        { id: 3, nombre: "K-Pop Festival YASUI", fecha: "2026-05-22", lugar: "Medellín - Expocentro" }
    ],

    init: () => {
        const session = JSON.parse(localStorage.getItem('sessionYasui'));
        
        // Mostrar panel administrativo solo si el rol es admin
        if (session && session.rol === 'admin') {
            const adminPanel = document.getElementById('admin-event-panel');
            if (adminPanel) adminPanel.style.display = 'block';
        }

        eventosApp.render();
    },

    render: () => {
        const container = document.getElementById('grid-eventos');
        const session = JSON.parse(localStorage.getItem('sessionYasui'));
        if (!container) return;

        container.innerHTML = '';

        eventosApp.db.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <div class="event-content">
                    <h2>${ev.nombre}</h2>
                    <div class="event-info-row">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${ev.fecha}</span>
                    </div>
                    <div class="event-info-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${ev.lugar}</span>
                    </div>
                    
                    <button class="btn-reserve" onclick="eventosApp.reservar('${ev.nombre}')">
                        Reservar Entrada
                    </button>

                    ${session?.rol === 'admin' ? 
                        `<button class="btn-reserve btn-delete" onclick="eventosApp.eliminar(${ev.id})">
                            <i class="fas fa-trash"></i> Eliminar Evento
                        </button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    },

    crear: () => {
        const nombre = document.getElementById('ev-nombre').value;
        const fecha = document.getElementById('ev-fecha').value;
        const lugar = document.getElementById('ev-lugar').value;

        if (!nombre || !fecha || !lugar) return alert("Por favor completa todos los campos.");

        const nuevoEvento = {
            id: Date.now(),
            nombre,
            fecha,
            lugar
        };

        eventosApp.db.push(nuevoEvento);
        eventosApp.sincronizar();
        
        // Limpiar campos
        document.getElementById('ev-nombre').value = '';
        document.getElementById('ev-fecha').value = '';
        document.getElementById('ev-lugar').value = '';
    },

    eliminar: (id) => {
        if (confirm("¿Seguro que deseas eliminar este evento?")) {
            eventosApp.db = eventosApp.db.filter(ev => ev.id !== id);
            eventosApp.sincronizar();
        }
    },

    reservar: (nombre) => {
        const session = JSON.parse(localStorage.getItem('sessionYasui'));
        if (!session) {
            alert("Debes iniciar sesión para reservar entradas.");
        } else {
            alert(`¡Excelente ${session.nombre}! Has reservado tu entrada para: ${nombre}. Te enviaremos los detalles al correo.`);
        }
    },

    sincronizar: () => {
        localStorage.setItem('eventosYasui', JSON.stringify(eventosApp.db));
        eventosApp.render();
    }
};

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', eventosApp.init);