// const express = require('express');
// const axios = require('axios');
// const { executeQuery } = require('../database');
// const contactSchema = require('../schemas/contactSchema');
// const router = express.Router();

// function validateContact(data) {
//   const { nombre_completo, correo, telefono, mensaje } = data;
//   const errors = [];

//   if (!nombre_completo || nombre_completo.trim() === '') {
//     errors.push('El nombre completo es requerido');
//   }
//   if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
//     errors.push('El correo electrónico no es válido');
//   }
//   if (!telefono || telefono.trim() === '') {
//     errors.push('El teléfono es requerido');
//   }
//   if (!mensaje || mensaje.trim() === '') {
//     errors.push('El mensaje es requerido');
//   }

//   return errors;
// }

// router.post('/contacto', async (req, res) => {
//   try {
//     const { error } = contactSchema.validate(req.body, { abortEarly: false });
//     if (error) {
//       const errors = error.details.map(d => ({ campo: d.path.join('.'), mensaje: d.message }));
//       return res.status(400).json({ success: false, message: 'Datos inválidos', errors });
//     }

//     const { nombre_completo, correo, telefono, mensaje, recaptchaToken } = req.body;

//     const captchaResponse = await axios.post(
//       'https://www.google.com/recaptcha/api/siteverify',
//       new URLSearchParams({
//         secret: process.env.RECAPTCHA_SECRET_KEY,
//         response: recaptchaToken
//       })
//     );

//     if (!captchaResponse.data.success) {
//       return res.status(403).json({ success: false, message: 'Fallo la validación de reCAPTCHA' });
//     }

//     const errors = validateContact({ nombre_completo, correo, telefono, mensaje });
//     if (errors.length > 0) {
//       return res.status(400).json({ success: false, message: 'Datos inválidos', errors });
//     }

//     const query = `
//       INSERT INTO Contacto (NombreCompleto, Correo, Telefono, Mensaje) 
//       VALUES (@nombre_completo, @correo, @telefono, @mensaje)
//     `;

//     const params = {
//       nombre_completo: nombre_completo.trim(),
//       correo: correo.trim().toLowerCase(),
//       telefono: telefono.trim(),
//       mensaje: mensaje.trim()
//     };

//     const result = await executeQuery(query, params);

//     res.status(201).json({ success: true, message: 'Contacto guardado exitosamente' });
//   } catch (error) {
//     console.error('Error al guardar contacto:', error);
//     res.status(500).json({ success: false, message: 'Error interno del servidor' });
//   }
// });

// module.exports = router;
