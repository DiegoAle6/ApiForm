require('dotenv').config();
const sql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  }
};


let pool;

async function getPool() {
  if (!pool) {
    pool = sql.createPool(dbConfig);
  }
  return pool;
}

async function executeQuery(query, params = []) {
  try {
    const poolConnection = await getPool();
    const [result] = await poolConnection.execute(query, params);
    return result;
  } catch (error) {
    console.error('Error ejecutando query:', error);
    throw error;
  }
}

async function testConnection() {
  try {
    const poolConnection = await getPool();
    // Realizar una consulta simple para verificar la conexión
    await poolConnection.execute('SELECT 1');
    console.log('✅ Conexión a MySQL (DigitalOcean) exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a MySQL:', error.message);
    throw error;
  }
}

// Función para cerrar el pool de conexiones
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 Pool de conexiones cerrado');
  }
}

module.exports = {
  executeQuery,
  testConnection,
  closePool,
  sql
};