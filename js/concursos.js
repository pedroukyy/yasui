document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('gridActivos');
    const adminNav = document.getElementById('adminNav');
    const adminZone = document.getElementById('adminZone');
    
    // VALIDACIÓN DE ROL: Cambia 'admin' por 'user' para probar la vista de usuario normal
    const userRole = localStorage.getItem('userRole') || 'admin'; 

    if (userRole === 'admin') {
        adminNav.style.display = 'flex';
        adminZone.style.display = 'block';
    }

    // BASE DE DATOS LOCAL
    let db = JSON.parse(localStorage.getItem('yasui_concursos')) || [];

    function render() {
        grid.innerHTML = '';
        db.forEach((item, index) => {
            grid.innerHTML += `
                <article class="card-yasui">
                    <div class="card-banner">
                        <span class="status-label ${item.status === 'badge-open' ? 'badge-open' : 'badge-progress'}">
                            ${item.status === 'badge-open' ? 'Inscripciones Abiertas' : 'En Progreso'}
                        </span>
                        <img src="${item.img}" alt="Concurso">
                    </div>
                    <div class="card-body">
                        <h3>${item.titulo}</h3>
                        <span class="card-date">📅 Cierre: ${item.fecha}</span>
                        <div class="prize-box">
                            <p>✅ 1er lugar: ${item.p1}</p>
                            ${item.p2 ? `<p>✅ 2do lugar: ${item.p2}</p>` : ''}
                        </div>
                        <button class="btn-action">Inscribirme</button>
                        
                        ${userRole === 'admin' ? `
                            <div style="display:flex; gap:10px; margin-top:15px;">
                                <button onclick="editar(${index})" style="flex:1; background:#3498db; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Editar</button>
                                <button onclick="eliminar(${index})" style="flex:1; background:#e74c3c; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Borrar</button>
                            </div>
                        ` : ''}
                    </div>
                </article>
            `;
        });
    }

    // LÓGICA DE FORMULARIO
    document.getElementById('formConcurso').addEventListener('submit', (e) => {
        e.preventDefault();
        const index = document.getElementById('editIndex').value;
        const data = {
            titulo: document.getElementById('cTitle').value,
            fecha: document.getElementById('cDate').value,
            img: document.getElementById('cImg').value,
            status: document.getElementById('cStatus').value,
            p1: document.getElementById('cP1').value,
            p2: document.getElementById('cP2').value
        };

        if (index !== "") {
            db[index] = data;
        } else {
            db.push(data);
        }

        localStorage.setItem('yasui_concursos', JSON.stringify(db));
        resetForm();
        render();
    });

    window.eliminar = (i) => {
        if(confirm('¿Eliminar concurso?')) {
            db.splice(i, 1);
            localStorage.setItem('yasui_concursos', JSON.stringify(db));
            render();
        }
    };

    window.editar = (i) => {
        const item = db[i];
        document.getElementById('cTitle').value = item.titulo;
        document.getElementById('cDate').value = item.fecha;
        document.getElementById('cImg').value = item.img;
        document.getElementById('cStatus').value = item.status;
        document.getElementById('cP1').value = item.p1;
        document.getElementById('cP2').value = item.p2;
        document.getElementById('editIndex').value = i;
        document.getElementById('btnSubmit').innerText = "Actualizar Concurso";
        window.scrollTo(0,0);
    };

    window.resetForm = () => {
        document.getElementById('formConcurso').reset();
        document.getElementById('editIndex').value = "";
        document.getElementById('btnSubmit').innerText = "Publicar Concurso";
    };

    render();
});

function logout() {
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
}