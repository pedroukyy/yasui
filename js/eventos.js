const eventosApp = {
    currentUser: null, allEvents: [], currentReservaEvent: null, currentSlide: 0, slideInterval: null,

    init: async () => {
        const session = localStorage.getItem('yasui_session');
        if (session) eventosApp.currentUser = JSON.parse(session);
        eventosApp.setupUI();

        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        const idEvento = params.get('id');

        if (path.includes('detalle-evento.html') && idEvento) {
            eventosApp.loadDetail(idEvento);
        } else {
            await eventosApp.loadAllEvents();
            eventosApp.renderMainSlider();
            eventosApp.renderCategories();
        }
    },

    setupUI: () => {
        const adminPanel = document.getElementById('admin-event-panel');
        if (eventosApp.currentUser?.rol === 'admin' && adminPanel) {
            adminPanel.style.display = 'block';
        }
    },

    loadAllEvents: async () => {
        try {
            const res = await fetch('/api/events');
            eventosApp.allEvents = await res.json();
        } catch (e) { console.error(e); }
    },


    // DETALLE 
    loadDetail: async (id) => {
        try {
            const res = await fetch(`/api/events/${id}`);
            const ev = await res.json();
            if (!ev || ev.message) { document.getElementById('detalle-container').innerHTML = '<h2>Evento no encontrado</h2>'; return; }
            eventosApp.currentReservaEvent = ev; 

            const imgUrl = ev.image_url || 'assets/logos/yasui-sas-logo.png';
            const dateStr = new Date(ev.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            document.getElementById('detalle-container').innerHTML = `
                <div class="detail-header"><img src="${imgUrl}"></div>
                <div class="detail-info">
                    <h1>${ev.nombre}</h1>
                    <div class="detail-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${dateStr}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${ev.lugar}</span>
                        <span style="background:var(--accent); color:white; padding:2px 10px; border-radius:10px;">${ev.category}</span>
                    </div>
                    <div class="detail-desc"><h3>Información</h3><p>Evento de ${ev.category} en ${ev.lugar}.</p></div>
                    <div class="detail-sidebar">
                        <div class="sticky-card">
                            <h3>¿Participas?</h3>
                            <button class="big-btn" onclick="eventosApp.abrirModalReserva(${ev.id}, true)">¡Inscribirme!</button>
                        </div>
                    </div>
                </div>`;
        } catch (e) { console.error(e); }
    },

    // PRINCIPAL 
    renderMainSlider: () => {
        const track = document.getElementById('hero-slider-track');
        const indicators = document.getElementById('hero-slider-indicators');
        if (!track) return;
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const destacados = eventosApp.allEvents.filter(ev => { const f = new Date(ev.fecha); f.setDate(f.getDate()+1); return f >= hoy; }).slice(0, 5);

        if (destacados.length === 0) { document.getElementById('main-hero-slider').style.display='none'; return; }
        track.innerHTML = ''; indicators.innerHTML = '';

        destacados.forEach((ev, i) => {
            track.innerHTML += `
                <div class="hero-slide" onclick="galleryApp.open(${ev.id}, '${ev.nombre}')">
                    <img src="${ev.image_url || 'assets/logos/yasui-sas-logo.png'}">
                    <div class="hero-caption"><h2>${ev.nombre}</h2><span class="btn-caption">Ver Galería</span></div>
                </div>`;
            indicators.innerHTML += `<div class="indicator ${i===0?'active':''}" onclick="eventosApp.goToSlide(${i})"></div>`;
        });
        eventosApp.startSlider();
    },

    renderCategories: () => {
        const rows = document.querySelectorAll('.category-row');
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        rows.forEach(row => {
            const cat = row.getAttribute('data-category');
            const track = row.querySelector('.category-slider-track');
            const events = eventosApp.allEvents.filter(ev => ev.category === cat);
            
            if (events.length === 0) { track.innerHTML = '<p style="color:#aaa; padding:10px;">Próximamente</p>'; return; }
            
            let html = '';
            events.forEach(ev => {
                const img = ev.image_url || 'assets/logos/yasui-sas-logo.png';
                const f = new Date(ev.fecha); f.setDate(f.getDate()+1);
                const pasado = f < hoy;
                const estilo = pasado ? 'filter: grayscale(100%);' : '';
                
                let btns = pasado ? `<button class="btn-card btn-disabled">Finalizado</button>` :
                    `<button class="btn-card btn-details" onclick="window.location.href='detalle-evento.html?id=${ev.id}'">Ver Más</button>
                     <button class="btn-card btn-register" onclick="eventosApp.abrirModalReserva(${ev.id})">Inscribirse</button>`;

                html += `
                    <div class="event-card-dark">
                        <div class="event-image-container-dark" style="${estilo}" onclick="galleryApp.open(${ev.id}, '${ev.nombre}')">
                            <img src="${img}"><div class="overlay-icon"><i class="fas fa-images"></i></div>
                        </div>
                        <div class="event-content-dark">
                            <h3>${ev.nombre}</h3>
                            <div class="event-info"><i class="fas fa-map-marker-alt"></i> ${ev.lugar}</div>
                            <div class="card-actions">${btns}</div>
                        </div>
                    </div>`;
            });
            track.innerHTML = html;
        });
    },

    // --- INSCRIPCION ---
    abrirModalReserva: (id, fromDetail=false) => {
        if (!eventosApp.currentUser) return alert("Inicia sesión.");
        const ev = fromDetail ? eventosApp.currentReservaEvent : eventosApp.allEvents.find(e => e.id === id);
        eventosApp.currentReservaEvent = ev;
        
        document.getElementById('reserva-evento-titulo').innerText = ev.nombre;
        const cont = document.getElementById('reserva-dynamic-fields');
        const cls = 'input-yasui-dark';
        let fields = `<label>Teléfono:</label><input id="cp-tel" class="${cls}"><label>Nota:</label><textarea id="cp-com" class="${cls}"></textarea>`;
        
        if(ev.category==='Cosplay') fields = `<label>Personaje:</label><input id="cp-pj" class="${cls}"><label>Serie:</label><input id="cp-serie" class="${cls}">`;
        else if(['Videojuegos','Torneos'].includes(ev.category)) fields = `<label>Gamertag:</label><input id="cp-nick" class="${cls}"><label>Discord:</label><input id="cp-dc" class="${cls}">`;

        cont.innerHTML = fields;
        document.getElementById('modal-reserva').style.display = 'flex';
    },

    confirmarInscripcion: async () => {
        try {
            const details = { nota: "Web", fecha: new Date() };
            const res = await fetch('/api/reservar', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: eventosApp.currentUser.id, eventId: eventosApp.currentReservaEvent.id, details }) });
            const d = await res.json();
            if(d.success) { alert("¡Inscrito!"); document.getElementById('modal-reserva').style.display='none'; }
            else alert(d.message);
        } catch(e) { alert("Error"); }
    },

    // ADMIN & SLIDER & GALLERY
    crear: async () => {
        const file = document.getElementById('ev-image').files[0];
        const fd = new FormData();
        fd.append('image', file);
        fd.append('nombre', document.getElementById('ev-nombre').value);
        fd.append('fecha', document.getElementById('ev-fecha').value);
        fd.append('lugar', document.getElementById('ev-lugar').value);
        fd.append('category', document.getElementById('ev-categoria').value);
        await fetch('/api/events', { method:'POST', body:fd });
        location.reload();
    },
    
    moveSlider: (d) => {
        const slides = document.querySelectorAll('.hero-slide');
        let n = eventosApp.currentSlide + d;
        if (n < 0) n = slides.length - 1; if (n >= slides.length) n = 0;
        eventosApp.goToSlide(n);
    },
    goToSlide: (n) => {
        eventosApp.currentSlide = n;
        document.getElementById('hero-slider-track').style.transform = `translateX(-${n*100}%)`;
        document.querySelectorAll('.indicator').forEach((el,i)=>el.classList.toggle('active', i===n));
        clearInterval(eventosApp.slideInterval); eventosApp.startSlider();
    },
    startSlider: () => { eventosApp.slideInterval = setInterval(()=>eventosApp.moveSlider(1), 5000); }
};

const galleryApp = {
    photos: [], currentIndex: 0, currentEventId: null,
    open: async (id, name) => {
        galleryApp.currentEventId = id; galleryApp.currentIndex = 0;
        document.getElementById('modal-gallery').style.display = 'flex';
        const adminBtn = document.getElementById('admin-upload-mini');
        if(eventosApp.currentUser?.rol === 'admin') adminBtn.style.display='block'; else adminBtn.style.display='none';
        await galleryApp.loadPhotos(); galleryApp.renderCurrentPhoto();
    },
    loadPhotos: async () => {
        const res = await fetch(`/api/events/${galleryApp.currentEventId}/photos`);
        galleryApp.photos = await res.json();
        if(galleryApp.photos.length===0) document.getElementById('gallery-main-img').src='';
    },
    renderCurrentPhoto: async () => {
        if(!galleryApp.photos.length) return;
        if(galleryApp.currentIndex>=galleryApp.photos.length) galleryApp.currentIndex=0;
        if(galleryApp.currentIndex<0) galleryApp.currentIndex=0;
        const p = galleryApp.photos[galleryApp.currentIndex];
        document.getElementById('gallery-main-img').src = p.image_url;
        document.getElementById('gallery-photo-user').innerText = p.description || 'Evento';
        document.getElementById('count-likes').innerText = p.likes||0;
        document.getElementById('count-dislikes').innerText = p.dislikes||0;
        const cRes = await fetch(`/api/photos/${p.id}/comments`);
        const comms = await cRes.json();
        document.getElementById('gallery-comments-list').innerHTML = comms.map(c=>`<div class="comment-bubble"><b>${c.username}</b> ${c.comment}</div>`).join('');
    },
    nextPhoto: () => { galleryApp.currentIndex++; galleryApp.renderCurrentPhoto(); },
    prevPhoto: () => { galleryApp.currentIndex--; galleryApp.renderCurrentPhoto(); },
    like: async (isLike) => {
        if(!eventosApp.currentUser) return alert("Login required");
        const p = galleryApp.photos[galleryApp.currentIndex];
        await fetch('/api/photos/like', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({photoId:p.id, userId:eventosApp.currentUser.id, isLike}) });
        await galleryApp.loadPhotos(); galleryApp.renderCurrentPhoto();
    },
    sendInteraction: async () => {
        if(!eventosApp.currentUser) return alert("Login required");
        const p = galleryApp.photos[galleryApp.currentIndex];
        const txt = document.getElementById('new-comment').value;
        if(txt) await fetch('/api/photos/comment', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({photoId:p.id, userId:eventosApp.currentUser.id, text:txt}) });
        document.getElementById('new-comment').value='';
        await galleryApp.loadPhotos(); galleryApp.renderCurrentPhoto();
    },
    uploadMini: async () => {
        const f = document.getElementById('mini-upload').files[0];
        if(!f) return;
        const fd = new FormData(); fd.append('image', f); fd.append('eventId', galleryApp.currentEventId); fd.append('description', 'Galería');
        await fetch('/api/photos', { method:'POST', body:fd });
        await galleryApp.loadPhotos(); galleryApp.renderCurrentPhoto();
    }
};

document.addEventListener('DOMContentLoaded', eventosApp.init);