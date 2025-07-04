// hashPassword.js - Script para hashear la contraseña del usuario existente
const bcrypt = require('bcrypt');
const { executeQuery } = require('../database');
require('dotenv').config();

async function updatePasswordHash() {
    try {
        const plainPassword = '1234'; // La contraseña actual en texto plano
        const saltRounds = 10;
        
        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        
        console.log('Contraseña original:', plainPassword);
        console.log('Contraseña hasheada:', hashedPassword);
        
        // Actualizar la contraseña en la base de datos
        const query = `
            UPDATE Usuarios 
            SET PasswordHash = @hashedPassword 
            WHERE Username = @username
        `;
        
        const params = {
            hashedPassword,
            username: 'admin'
        };
        
        const result = await executeQuery(query, params);
        
        if (result.rowsAffected[0] > 0) {
            console.log('✅ Contraseña actualizada exitosamente');
            console.log('Ahora puedes usar:');
            console.log('Usuario: admin');
            console.log('Contraseña: 1234');
        } else {
            console.log('❌ No se encontró el usuario para actualizar');
        }
        
    } catch (error) {
        console.error('❌ Error al actualizar contraseña:', error);
    }
}

updatePasswordHash();