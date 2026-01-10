const auth = {
    user: null,

    init: () => {
        // Al cargar, revisamos si hay algo guardado en el navegador
        const savedSession = localStorage.getItem('yasui_session');
        if (savedSession) {
            auth.user = JSON.parse(savedSession);
        }
        auth.updateUI();
        
        // Listeners
        document.getElementById('btn-sesion')?.addEventListener('click', () => {
            document.getElementById('modal-login').style.display = 'flex';
        });
        document.getElementById('btn-logout')?.addEventListener('click', auth.logout);
    },

    switchTab: (tab) => {
        const isLogin = tab === 'login';
        document.getElementById('form-login').style.display = isLogin ? 'block' : 'none';
        document.getElementById('form-register').style.display = isLogin ? 'none' : 'block';
        document.getElementById('tab-login').classList.toggle('active', isLogin);
        document.getElementById('tab-register').classList.toggle('active', !isLogin);
    },

    login: async () => {
        const username = document.getElementById('user-input').value;
        const password = document.getElementById('pass-input').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                // 1. Guardar sesión
                auth.user = data.user;
                localStorage.setItem('yasui_session', JSON.stringify(data.user));

                // 2. Actualizar UI al instante (SIN RECARGAR)
                auth.updateUI();
                auth.cerrarModal();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error al conectar con el servidor");
        }
    },

    register: async () => {
        // Capturar todos los campos nuevos
        const username = document.getElementById('reg-nick').value;
        const email = document.getElementById('reg-email').value;
        const fullName = document.getElementById('reg-fullname').value;
        const phone = document.getElementById('reg-phone').value;
        const password = document.getElementById('reg-pass').value;

        // Validar que no estén vacíos los obligatorios
        if (!username || !email || !fullName || !password) {
            return alert("Por favor completa todos los campos obligatorios.");
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    email, 
                    fullName, 
                    phone, 
                    password 
                })
            });
            const data = await res.json();

            if (data.success) {
                // Mensaje importante para el usuario
                alert("¡Registro creado! ✉️ REVISA TU CORREO para activar la cuenta antes de entrar.");
                auth.switchTab('login');
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error(error);
            alert("Error al registrarse");
        }
    },

    logout: () => {
        auth.user = null;
        localStorage.removeItem('yasui_session');
        location.href = 'index.html'; 
    },

    updateUI: () => {
        const btnLogin = document.getElementById('btn-sesion');
        const btnLogout = document.getElementById('btn-logout');
        const badge = document.getElementById('user-badge');
        const adminPanel = document.getElementById('admin-event-panel');

        if (auth.user) {
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnLogout) btnLogout.style.display = 'inline-block';
            if (badge) {
                badge.style.display = 'inline-block';
                badge.style.color = 'white';
                badge.innerText = `Hola, ${auth.user.nombre} ${auth.user.rol === 'admin' ? '⚡' : '👤'}`;
            }
            // Mostrar panel admin si aplica
            if (auth.user.rol === 'admin' && adminPanel) {
                adminPanel.style.display = 'block';
            }
        }
    },
    
    cerrarModal: () => {
        document.getElementById('modal-login').style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', auth.init);