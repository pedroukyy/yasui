// Credenciales maestras
const CREDENCIALES = {
    "admin": { pass: "admin123", rol: "admin" },
    "cliente": { pass: "cliente123", rol: "cliente" }
};

const auth = {
    // Alternar entre Login y Registro
    switchTab: (tab) => {
        const isLogin = tab === 'login';
        document.getElementById('form-login').style.display = isLogin ? 'block' : 'none';
        document.getElementById('form-register').style.display = isLogin ? 'none' : 'block';
        document.getElementById('tab-login').classList.toggle('active', isLogin);
        document.getElementById('tab-register').classList.toggle('active', !isLogin);
    },

    login: () => {
        const userVal = document.getElementById('user-input').value; // Cambiado a tus IDs de HTML
        const passVal = document.getElementById('pass-input').value;
        const usuariosExtra = JSON.parse(localStorage.getItem('usuariosYasui')) || {};

        let userFound = null;

        // 1. Buscar en credenciales fijas
        if (CREDENCIALES[userVal] && CREDENCIALES[userVal].pass === passVal) {
            userFound = { nombre: userVal, rol: CREDENCIALES[userVal].rol };
        } 
        // 2. Buscar en usuarios registrados manualmente
        else if (usuariosExtra[userVal] && usuariosExtra[userVal].pass === passVal) {
            userFound = { nombre: userVal, rol: "cliente" };
        }

        if (userFound) {
            localStorage.setItem('sessionYasui', JSON.stringify(userFound));
            location.reload();
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    },

    register: () => {
        const nick = document.getElementById('reg-nick').value;
        const pass = document.getElementById('reg-pass').value;
        
        if (!nick || !pass) return alert("Nickname y Contraseña son obligatorios");

        let usuariosExtra = JSON.parse(localStorage.getItem('usuariosYasui')) || {};
        usuariosExtra[nick] = { pass: pass };
        
        localStorage.setItem('usuariosYasui', JSON.stringify(usuariosExtra));
        alert("¡Registro exitoso! Ya puedes entrar.");
        auth.switchTab('login');
    },

    logout: () => {
        localStorage.removeItem('sessionYasui');
        location.href = 'index.html'; // Al salir siempre vuelve al inicio
    },

    checkStatus: () => {
        const session = JSON.parse(localStorage.getItem('sessionYasui'));
        const btnLogin = document.getElementById('btn-sesion');
        const btnLogout = document.getElementById('btn-logout');
        const badge = document.getElementById('user-badge');

        if (session) {
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnLogout) btnLogout.style.display = 'inline-block';
            if (badge) {
                badge.style.display = 'inline-block';
                badge.style.color = 'white';
                badge.innerText = `Hola, ${session.nombre} ${session.rol === 'admin' ? '⚡' : '👤'}`;
            }
        }
    }
};

// Listeners Globales
document.addEventListener('DOMContentLoaded', () => {
    auth.checkStatus();

    // Eventos de botones (si existen en la página actual)
    document.getElementById('btn-sesion')?.addEventListener('click', () => {
        document.getElementById('modal-login').style.display = 'flex';
    });
    
    document.getElementById('btn-logout')?.addEventListener('click', auth.logout);
});

function cerrarModal() {
    document.getElementById('modal-login').style.display = 'none';
}