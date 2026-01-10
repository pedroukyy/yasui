// esto es temporal
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function crearAdmin() {
    console.log("🛠️  Restaurando usuario Admin...");

    const passwordPlana = "admin123";
     
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptada = await bcrypt.hash(passwordPlana, salt);

    try {
        await pool.query("DELETE FROM users WHERE username = 'admin' OR email = 'admin@yasui.com'");

        await pool.query(
            `INSERT INTO users (username, email, full_name, password, role, is_verified) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', 'admin@yasui.com', 'Super Admin', passwordEncriptada, 'admin', true]
        );

        console.log("✅ ¡Éxito! Usuario Admin recreado.");
        console.log("👉 Usuario: admin");
        console.log("👉 Correo: admin@yasui.com");
        console.log("👉 Contraseña: admin123");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        pool.end();
    }
}

crearAdmin();