const bcrypt = require('bcrypt');

async function generatePasswordHash() {
  const password = 'admin123'; // Contraseña que quieres usar
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Contraseña original:', password);
    console.log('Hash generado:', hash);
    
    // Verificar que el hash funciona
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verificación del hash:', isValid);
    
    return hash;
  } catch (error) {
    console.error('Error generando hash:', error);
  }
}

// Llamar a la función
generatePasswordHash();
