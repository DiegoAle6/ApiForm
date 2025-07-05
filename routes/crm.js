
const express = require('express');
const axios = require('axios');
const { executeQuery } = require('../database');
const verifyToken = require('../utils/verifyToken');
const router = express.Router();

router.get('/admin/contactos', verifyToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM Contacto ORDER BY FechaRegistro DESC';
    const result = await executeQuery(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener contactos' });
  }
});

router.post('/admin/enviar-correo', verifyToken, async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_USER_ID,
      template_params: {
        to_name: to,
        subject,
        message
      }
    });

    res.json({ success: true, message: 'Correo enviado correctamente', data: response.data });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({ success: false, message: 'Error al enviar el correo' });
  }
});

module.exports = router;


// utils/verifyToken.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;
