const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../database');
const router = express.Router();

// Ruta de login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validar datos de entrada
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario y contraseña son requeridos' 
      });
    }

    // CAMBIO: Query con parámetros posicionales para MySQL
    const query = `SELECT * FROM Usuarios WHERE Username = ?`;
    const result = await executeQuery(query, [username]);

    // CAMBIO: MySQL retorna el resultado directamente, no en recordset
    if (!result || result.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    const user = result[0];

    // Verificar que el usuario tenga la propiedad PasswordHash
    if (!user || !user.PasswordHash) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error en la estructura de datos del usuario' 
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.PasswordHash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Contraseña incorrecta' 
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user.Id, 
        username: user.Username, 
        rol: user.Rol,
        nombre: user.Nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // CAMBIO: Actualizar último acceso con sintaxis MySQL
    const updateQuery = `
      UPDATE Usuarios 
      SET UltimoAcceso = NOW() 
      WHERE Id = ?
    `;
    await executeQuery(updateQuery, [user.Id]);

    // Respuesta exitosa
    res.json({ 
      success: true, 
      token,
      user: {
        id: user.Id,
        username: user.Username,
        nombre: user.Nombre,
        rol: user.Rol
      }
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

// Ruta para verificar token (útil para el frontend)
router.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token no proporcionado' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // CAMBIO: Query con parámetros posicionales para MySQL
    const query = `SELECT Id, Username, Nombre, Rol FROM Usuarios WHERE Id = ?`;
    const result = await executeQuery(query, [decoded.id]);

    // CAMBIO: MySQL retorna el resultado directamente
    if (!result || result.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      user: result[0] 
    });

  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido o expirado' 
    });
  }
});

module.exports = router;