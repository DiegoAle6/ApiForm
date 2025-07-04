// routes/email.js - Rutas para envío de correos
const express = require('express');
const nodemailer = require('nodemailer');
const { executeQuery } = require('../database');
const router = express.Router();
require('dotenv').config(); // ← AGREGA ESTA LÍNEA

// Configurar transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // o tu proveedor
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// Middleware de autenticación (importar desde tu archivo principal)
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
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
}

// Ruta para enviar correo a un contacto específico
router.post('/enviar-correo-contacto', authMiddleware, async (req, res) => {
  try {
    const { contactoId, asunto, mensaje, plantilla } = req.body;

    // Validar datos
    if (!contactoId || !asunto || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos: contactoId, asunto y mensaje son requeridos'
      });
    }

    // Obtener datos del contacto
    const queryContacto = 'SELECT * FROM Contacto WHERE Id = @contactoId';
    const contactoResult = await executeQuery(queryContacto, { contactoId });

    if (contactoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    const contacto = contactoResult.recordset[0];

    // Preparar parámetros del template
    const templateParams = {
      to_name: contacto.NombreCompleto,
      to_email: contacto.Correo,
      subject: asunto,
      message: mensaje,
      from_name: req.user.nombre || 'Administrador',
      reply_to: 'noreply@tuempresa.com'
    };

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: contacto.Correo,
  subject: asunto,
  text: mensaje,
  html: `<p>${mensaje}</p>`
};

const response = await transporter.sendMail(mailOptions);
    // Registrar el envío en la base de datos
    const queryRegistro = `
      INSERT INTO HistorialCorreos (ContactoId, Asunto, Mensaje, UsuarioId, FechaEnvio, Estado)
      VALUES (@contactoId, @asunto, @mensaje, @usuarioId, GETDATE(), 'enviado')
    `;

    await executeQuery(queryRegistro, {
      contactoId,
      asunto,
      mensaje,
      usuarioId: req.user.id
    });

    res.json({
      success: true,
      message: 'Correo enviado exitosamente',
      data: {
        contacto: contacto.NombreCompleto,
        email: contacto.Correo,
        asunto,
        emailjs_response: response
      }
    });

  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el correo',
      error: error.message
    });
  }
});

// Ruta para enviar correo masivo
router.post('/enviar-correo-masivo', authMiddleware, async (req, res) => {
  try {
    const { contactosIds, asunto, mensaje, filtros } = req.body;

    if (!asunto || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Asunto y mensaje son requeridos'
      });
    }

    let queryContactos = '';
    let params = {};

    // Si se especifican IDs específicos
    if (contactosIds && contactosIds.length > 0) {
      const idsString = contactosIds.map(id => `'${id}'`).join(',');
      queryContactos = `SELECT * FROM Contacto WHERE Id IN (${idsString})`;
    } 
    // Si se usan filtros (todos, por fecha, etc.)
    else if (filtros) {
      switch (filtros.tipo) {
        case 'todos':
          queryContactos = 'SELECT * FROM Contacto';
          break;
        case 'recientes':
          queryContactos = `
            SELECT * FROM Contacto 
            WHERE FechaRegistro >= DATEADD(day, -@dias, GETDATE())
          `;
          params.dias = filtros.dias || 7;
          break;
        case 'sin_respuesta':
          queryContactos = `
            SELECT c.* FROM Contacto c
            LEFT JOIN HistorialCorreos h ON c.Id = h.ContactoId
            WHERE h.ContactoId IS NULL
          `;
          break;
        default:
          queryContactos = 'SELECT * FROM Contacto';
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar contactosIds o filtros'
      });
    }

    // Obtener contactos
    const contactosResult = await executeQuery(queryContactos, params);
    const contactos = contactosResult.recordset;

    if (contactos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron contactos para enviar'
      });
    }

    // Enviar correos (con delay para evitar spam)
    const resultados = {
      exitosos: 0,
      fallidos: 0,
      detalles: []
    };

    for (let i = 0; i < contactos.length; i++) {
      const contacto = contactos[i];
      
      try {
        // Delay entre envíos (1 segundo)
        await new Promise(resolve => setTimeout(resolve, 1000));

        const templateParams = {
          to_name: contacto.NombreCompleto,
          to_email: contacto.Correo,
          subject: asunto,
          message: mensaje,
          from_name: req.user.nombre || 'Administrador',
          reply_to: 'noreply@tuempresa.com'
        };

        const response = await emailjs.send(
          process.env.EMAILJS_SERVICE_ID,
          process.env.EMAILJS_TEMPLATE_ID,
          templateParams
        );

        // Registrar envío exitoso
        await executeQuery(`
          INSERT INTO HistorialCorreos (ContactoId, Asunto, Mensaje, UsuarioId, FechaEnvio, Estado)
          VALUES (@contactoId, @asunto, @mensaje, @usuarioId, GETDATE(), 'enviado')
        `, {
          contactoId: contacto.Id,
          asunto,
          mensaje,
          usuarioId: req.user.id
        });

        resultados.exitosos++;
        resultados.detalles.push({
          contacto: contacto.NombreCompleto,
          email: contacto.Correo,
          estado: 'enviado'
        });

      } catch (error) {
        // Registrar envío fallido
        await executeQuery(`
          INSERT INTO HistorialCorreos (ContactoId, Asunto, Mensaje, UsuarioId, FechaEnvio, Estado, Error)
          VALUES (@contactoId, @asunto, @mensaje, @usuarioId, GETDATE(), 'fallido', @error)
        `, {
          contactoId: contacto.Id,
          asunto,
          mensaje,
          usuarioId: req.user.id,
          error: error.message
        });

        resultados.fallidos++;
        resultados.detalles.push({
          contacto: contacto.NombreCompleto,
          email: contacto.Correo,
          estado: 'fallido',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Envío masivo completado',
      resultados
    });

  } catch (error) {
    console.error('Error en envío masivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el envío masivo',
      error: error.message
    });
  }
});

// Ruta para obtener historial de correos
router.get('/historial-correos', authMiddleware, async (req, res) => {
  try {
    const { contactoId, limite = 50 } = req.query;

    let query = `
      SELECT 
        h.*,
        c.NombreCompleto,
        c.Correo,
        u.Nombre as UsuarioNombre
      FROM HistorialCorreos h
      INNER JOIN Contacto c ON h.ContactoId = c.Id
      INNER JOIN Usuarios u ON h.UsuarioId = u.Id
    `;

    let params = {};

    if (contactoId) {
      query += ' WHERE h.ContactoId = @contactoId';
      params.contactoId = contactoId;
    }

    query += ' ORDER BY h.FechaEnvio DESC';
    
    if (limite) {
      query = `SELECT TOP ${limite} * FROM (${query}) AS subquery`;
    }

    const result = await executeQuery(query, params);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial'
    });
  }
});

// Ruta para obtener plantillas de correo
router.get('/plantillas', authMiddleware, async (req, res) => {
  try {
    const query = 'SELECT * FROM PlantillasCorreo ORDER BY Nombre';
    const result = await executeQuery(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las plantillas'
    });
  }
});

module.exports = router;