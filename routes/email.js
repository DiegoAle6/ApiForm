const express = require('express');
const axios = require('axios');
const router = express.Router();

// Middleware para proteger rutas (debe estar definido aquí o importado)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

// Ruta para enviar correo (protegida)
router.post('/enviar', authMiddleware, async (req, res) => {
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
      user_id: process.env.EMAILJS_USER_ID || 'ZH2dpAka63cP3412m',
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

// Ruta de prueba para verificar que el router funciona
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Email routes funcionando correctamente' 
  });
});

module.exports = router;