const express = require('express');
const cors = require('cors');
const { executeQuery, testConnection } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Función de validación
function validateContact(data) {
  const { nombre_completo, correo, telefono, mensaje } = data;
  const errors = [];
  
  if (!nombre_completo || nombre_completo.trim() === '') {
    errors.push('El nombre completo es requerido');
  }
  
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errors.push('El correo electrónico no es válido');
  }
  
  if (!telefono || telefono.trim() === '') {
    errors.push('El teléfono es requerido');
  }
  
  if (!mensaje || mensaje.trim() === '') {
    errors.push('El mensaje es requerido');
  }
  
  return errors;
}

// RUTAS
const axios = require('axios');

// Ruta para guardar contacto
app.post('/api/contacto', async (req, res) => {
  try {
    const { nombre_completo, correo, telefono, mensaje, recaptchaToken  } = req.body;
 
    // 🔐 Validar reCAPTCHA
    const secretKey = '6LdCj2wrAAAAAFPz7tDyU8qWx0hievLq4Bh3GPkN';
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

    const captchaResponse = await axios.post(
      verificationUrl,
      new URLSearchParams({
        secret: secretKey,
        response: recaptchaToken,
      })
    );

    const { success, score, 'error-codes': errorCodes } = captchaResponse.data;

    if (!success) {
      return res.status(403).json({
        success: false,
        message: 'Fallo la validación de reCAPTCHA',
        errors: errorCodes || [],
      });
    }

    // 🟢 Continuar con validación y guardado
    const errors = validateContact({ nombre_completo, correo, telefono, mensaje });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors });
    }

    const query = `
      INSERT INTO Contacto (NombreCompleto, Correo, Telefono, Mensaje) 
      VALUES (@nombre_completo, @correo, @telefono, @mensaje)
    `;

    const params = {
      nombre_completo: nombre_completo.trim(),
      correo: correo.trim().toLowerCase(),
      telefono: telefono.trim(),
      mensaje: mensaje.trim(),
    };

    const result = await executeQuery(query, params);
    
    res.status(201).json({
      success: true,
      message: 'Contacto guardado exitosamente',
      id: result.recordset ? result.recordset[0]?.Id : 'Insertado correctamente'
    });
    
  } catch (error) {
    console.error('Error al guardar contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta para obtener todos los contactos
app.get('/api/contactos', async (req, res) => {
  try {
    const query = 'SELECT * FROM Contacto ORDER BY FechaRegistro DESC';
    const result = await executeQuery(query);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta para página principal
app.get('/', (req, res) => {
  res.json({
    message: 'API de Contactos',
    endpoints: {
      'POST /api/contacto': 'Crear nuevo contacto',
      'GET /api/contactos': 'Obtener todos los contactos',
      'GET /api/health': 'Estado de la API'
    }
  });
});

// Iniciar servidor
async function startServer() {
  try {
    // Probar conexión a la base de datos
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Endpoints disponibles:`);
      console.log(`   POST http://localhost:${PORT}/api/contacto`);
      console.log(`   GET  http://localhost:${PORT}/api/contactos`);
      console.log(`   GET  http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();