const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Joi = require('joi');
const { executeQuery, testConnection } = require('./database');
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const contactSchema = require('./schemas/contactSchema');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware para proteger rutas privadas (CRM)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

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

// RUTAS PÚBLICAS
app.use('/api/auth', authRoutes);

// RUTAS PROTEGIDAS
app.use('/api/email', emailRoutes);

// Ruta para guardar contacto (pública)
app.post('/api/contacto', async (req, res) => {
  try {
    // Validar con Joi
    const { error, value } = contactSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => ({
        campo: d.path.join('.'),
        mensaje: d.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors
      });
    }

    const { nombre_completo, correo, telefono, mensaje, recaptchaToken } = req.body;
 
    // Validar reCAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

    const captchaResponse = await axios.post(
      verificationUrl,
      new URLSearchParams({
        secret: secretKey,
        response: recaptchaToken,
      })
    );

    console.log("Respuesta de Google reCAPTCHA:", captchaResponse.data);

    const { success, score, 'error-codes': errorCodes } = captchaResponse.data;

    if (!success) {
      return res.status(403).json({
        success: false,
        message: 'Fallo la validación de reCAPTCHA',
        errors: errorCodes || [],
      });
    }

    // Continuar con validación y guardado
    const errors = validateContact({ nombre_completo, correo, telefono, mensaje });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors });
    }

    const query = `
      INSERT INTO Contacto (NombreCompleto, Correo, Telefono, Mensaje) 
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      nombre_completo.trim(),
      correo.trim().toLowerCase(),
      telefono.trim(),
      mensaje.trim()
    ];

    const result = await executeQuery(query, params);
    
    res.status(201).json({
      success: true,
      message: 'Contacto guardado exitosamente',
      id: result.insertId || 'Insertado correctamente'
    });
    
  } catch (error) {
    console.error('Error al guardar contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// RUTAS PROTEGIDAS (CRM)
// Ruta para obtener todos los contactos (protegida)
app.get('/api/dashboard/contactos', authMiddleware, async (req, res) => {
  try {
    const query = 'SELECT * FROM Contacto ORDER BY FechaRegistro DESC';
    const result = await executeQuery(query);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta para enviar correo (protegida)
app.post('/api/dashboard/enviar-correo', authMiddleware, async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    // Validar datos requeridos
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: to, subject, message'
      });
    }

    const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: 'ZH2dpAka63cP3412m',
      template_params: {
        to_name: to,
        subject,
        message
      }
    });

    res.json({ 
      success: true, 
      message: 'Correo enviado correctamente', 
      data: response.data 
    });
    
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al enviar el correo' 
    });
  }
});

// Ruta para obtener estadísticas del dashboard (protegida)
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const queries = {
      total: 'SELECT COUNT(*) as total FROM Contacto',
      hoy: `SELECT COUNT(*) as hoy FROM Contacto WHERE DATE(FechaRegistro) = DATE(NOW())`,
      semana: `SELECT COUNT(*) as semana FROM Contacto WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 WEEK)`,
      mes: `SELECT COUNT(*) as mes FROM Contacto WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = await executeQuery(query);
      results[key] = result[0][key];
    }

    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// RUTAS DE UTILIDAD
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
      'POST /api/auth/login': 'Iniciar sesión',
      'POST /api/contacto': 'Crear nuevo contacto (público)',
      'GET /api/dashboard/contactos': 'Obtener todos los contactos (protegido)',
      'POST /api/dashboard/enviar-correo': 'Enviar correo (protegido)',
      'GET /api/dashboard/stats': 'Obtener estadísticas (protegido)',
      'GET /api/health': 'Estado de la API'
    }
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
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
      console.log(`   POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   POST http://localhost:${PORT}/api/contacto`);
      console.log(`   GET  http://localhost:${PORT}/api/dashboard/contactos`);
      console.log(`   POST http://localhost:${PORT}/api/dashboard/enviar-correo`);
      console.log(`   GET  http://localhost:${PORT}/api/dashboard/stats`);
      console.log(`   GET  http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();