const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer'); // Para enviar correos
const bcrypt = require('bcryptjs');       // Para encriptar contraseñas
const crypto = require('crypto');         // Para generar tokens
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Base de Datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Configuración del Transporter de Correo
const transporter = nodemailer.createTransport({
    service: 'gmail', // O usa 'host' y 'port' si es otro proveedor
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); 

// --- RUTAS ---

// 1. REGISTRO AVANZADO
app.post('/api/auth/register', async (req, res) => {
    const { username, email, fullName, phone, password } = req.body;
    
    try {
        // A. Validar duplicados
        const check = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ success: false, message: "El usuario o correo ya existen." });
        }

        // B. Encriptar contraseña y generar token
        const hashedPassword = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(32).toString('hex');
        const role = (username === 'admin') ? 'admin' : 'cliente';

        // C. Guardar en BD
        await pool.query(
            `INSERT INTO users (username, email, full_name, phone, password, role, verification_token) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [username, email, fullName, phone, hashedPassword, role, token]
        );

        // D. Enviar Correo de Verificación
        const verificationLink = `http://localhost:${port}/api/auth/verify/${token}`;
        
        await transporter.sendMail({
            from: `"YASUI Seguridad" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verifica tu cuenta en YASUI',
            html: `
                <h1>¡Bienvenido a YASUI, ${fullName}!</h1>
                <p>Gracias por registrarte. Para activar tu cuenta, haz clic abajo:</p>
                <a href="${verificationLink}" style="padding: 10px 20px; background: #004aad; color: white; text-decoration: none; border-radius: 5px;">Verificar Cuenta</a>
                <p>Si no fuiste tú, ignora este mensaje.</p>
            `
        });

        res.json({ success: true, message: "Registro exitoso. ¡Revisa tu correo para activar la cuenta!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error en el servidor." });
    }
});

// 2. RUTA DE VERIFICACIÓN (Al hacer clic en el correo)
app.get('/api/auth/verify/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const result = await pool.query(
            "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING username",
            [token]
        );

        if (result.rows.length > 0) {
            res.send(`
                <h1 style="color:green; text-align:center; margin-top:50px;">¡Cuenta Verificada!</h1>
                <p style="text-align:center;">Ya puedes <a href="/">volver al inicio</a> e iniciar sesión.</p>
            `);
        } else {
            res.send('<h1 style="color:red; text-align:center;">Token inválido o expirado.</h1>');
        }
    } catch (err) {
        res.status(500).send("Error verificando.");
    }
});

// 3. LOGIN (Con Usuario O Correo)
app.post('/api/auth/login', async (req, res) => {
    
    // Recibimos 'username' desde el frontend, pero puede ser nick o email
    const { username, password } = req.body;

    try {
        // Buscamos si coincide con el username O con el email
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1', 
            [username]
        );
        
        if (result.rows.length > 0) {
            const user = result.rows[0];

            // A. Verificar contraseña
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
            }

            // B. Verificar correo
            if (!user.is_verified) {
                return res.status(403).json({ success: false, message: "Debes verificar tu correo antes de entrar." });
            }

            // C. Login exitoso
            res.json({ 
                success: true, 
                user: { id: user.id, nombre: user.username, rol: user.role } 
            });

        } else {
            res.status(404).json({ success: false, message: "Usuario o correo no registrado" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error del servidor" });
    }
});

app.get('/api/events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY fecha ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reservar', async (req, res) => {
    const { userId, eventId } = req.body;
    if (!userId || !eventId) return res.status(400).json({ success: false, message: "Faltan datos." });
    try {
        const check = await pool.query('SELECT * FROM reservations WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
        if (check.rows.length > 0) return res.status(400).json({ success: false, message: "Ya reservaste este evento." });
        await pool.query('INSERT INTO reservations (user_id, event_id) VALUES ($1, $2)', [userId, eventId]);
        res.json({ success: true, message: "¡Reserva exitosa!" });
    } catch (err) { res.status(500).json({ success: false, message: "Error en reserva." }); }
});

app.listen(port, () => {
    console.log(`Servidor YASUI corriendo en http://localhost:${port}`);
});

// A. Crear Evento
app.post('/api/admin/events', async (req, res) => {
    const { titulo, descripcion, fecha_texto, lugar, precio, imagen_url, categoria, estado } = req.body;
    try {
        await pool.query(
            `INSERT INTO events (titulo, descripcion, fecha_texto, lugar, precio, imagen_url, categoria, estado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [titulo, descripcion, fecha_texto, lugar, precio, imagen_url, categoria, estado]
        );
        res.json({ success: true, message: "Evento creado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// B. Eliminar Evento
app.delete('/api/admin/events/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});