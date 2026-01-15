const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración DB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Configuración Imágenes
const dir = './uploads';
if (!fs.existsSync(dir)){ fs.mkdirSync(dir); }
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'uploads/'); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// Configuración Correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// AUTENTICACIÓN
app.post('/api/auth/register', async (req, res) => {
    const { username, email, fullName, phone, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (check.rows.length > 0) return res.status(400).json({ success: false, message: "Usuario existente." });
        const hashedPassword = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(32).toString('hex');
        const role = (username === 'admin') ? 'admin' : 'cliente';
        const isVerified = (role === 'admin'); 
        await pool.query('INSERT INTO users (username, email, full_name, phone, password, role, verification_token, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [username, email, fullName, phone, hashedPassword, role, token, isVerified]);
        if (!isVerified) {
            const link = `${req.protocol}://${req.get('host')}/api/auth/verify/${token}`;
            await transporter.sendMail({ from: process.env.EMAIL_USER, to: email, subject: 'Verifica tu cuenta', html: `<a href="${link}">Verificar</a>` });
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username ILIKE $1 OR email ILIKE $1', [username.trim()]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
            if (!user.is_verified) return res.status(403).json({ success: false, message: "No verificado" });
            res.json({ success: true, user: { id: user.id, nombre: user.username, rol: user.role, email: user.email } });
        } else { res.status(404).json({ success: false, message: "Usuario no encontrado" }); }
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/auth/verify/:token', async (req, res) => {
    try {
        await pool.query("UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1", [req.params.token]);
        res.send('<h1>Verificado <a href="/">Inicio</a></h1>');
    } catch (err) { res.status(500).send("Error"); }
});

// --- EVENTOS ---
app.get('/api/events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY fecha ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Obtener UN evento (Para la página de detalles)
app.get('/api/events/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ message: "No encontrado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/events', upload.single('image'), async (req, res) => {
    const { action, id, nombre, fecha, lugar, category } = req.body;
    if (action === 'delete') {
        try { await pool.query('DELETE FROM events WHERE id = $1', [id]); return res.json({ success: true }); } 
        catch (e) { return res.status(500).json({success:false}); }
    }
    if (!req.file) return res.status(400).json({ success: false, message: "Falta imagen" });
    const imageUrl = `/uploads/${req.file.filename}`;
    try {
        const result = await pool.query('INSERT INTO events (nombre, fecha, lugar, category, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING id', [nombre, fecha, lugar, category, imageUrl]);
        await pool.query('INSERT INTO event_photos (event_id, image_url, description) VALUES ($1, $2, $3)', [result.rows[0].id, imageUrl, 'Portada']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/reservar', async (req, res) => {
    const { userId, eventId, details } = req.body;
    try {
        const check = await pool.query('SELECT * FROM reservations WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
        if (check.rows.length > 0) return res.status(400).json({ success: false, message: "Ya inscrito." });
        const detailsString = details ? JSON.stringify(details) : '{}';
        await pool.query('INSERT INTO reservations (user_id, event_id, details) VALUES ($1, $2, $3)', [userId, eventId, detailsString]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// --- GALERÍA ---
app.get('/api/events/:id/photos', async (req, res) => {
    try {
        const query = `SELECT p.*, COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(DISTINCT c.id) as comment_count, COUNT(DISTINCT CASE WHEN l.is_like = TRUE THEN l.user_id END) as likes, COUNT(DISTINCT CASE WHEN l.is_like = FALSE THEN l.user_id END) as dislikes FROM event_photos p JOIN events e ON p.event_id = e.id LEFT JOIN photo_ratings r ON p.id = r.photo_id LEFT JOIN photo_comments c ON p.id = c.photo_id LEFT JOIN photo_likes l ON p.id = l.photo_id WHERE p.event_id = $1 GROUP BY p.id, e.image_url ORDER BY (p.image_url = e.image_url) DESC, p.created_at DESC`;
        const result = await pool.query(query, [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/photos', upload.single('image'), async (req, res) => {
    const { eventId, description } = req.body;
    if (!req.file) return res.status(400).json({ success: false });
    try { await pool.query('INSERT INTO event_photos (event_id, image_url, description) VALUES ($1, $2, $3)', [eventId, `/uploads/${req.file.filename}`, description]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/photos/:id/comments', async (req, res) => {
    try { const result = await pool.query(`SELECT c.comment, u.username FROM photo_comments c JOIN users u ON c.user_id = u.id WHERE c.photo_id = $1`, [req.params.id]); res.json(result.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/photos/comment', async (req, res) => {
    try { await pool.query('INSERT INTO photo_comments (photo_id, user_id, comment) VALUES ($1, $2, $3)', [req.body.photoId, req.body.userId, req.body.text]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});
app.post('/api/photos/rate', async (req, res) => {
    try { await pool.query(`INSERT INTO photo_ratings (photo_id, user_id, rating) VALUES ($1, $2, $3) ON CONFLICT (photo_id, user_id) DO UPDATE SET rating = $3`, [req.body.photoId, req.body.userId, req.body.rating]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});
app.post('/api/photos/like', async (req, res) => {
    try { await pool.query(`INSERT INTO photo_likes (photo_id, user_id, is_like) VALUES ($1, $2, $3) ON CONFLICT (photo_id, user_id) DO UPDATE SET is_like = $3`, [req.body.photoId, req.body.userId, req.body.isLike]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

app.listen(port, () => console.log(`Server running on port ${port}`));