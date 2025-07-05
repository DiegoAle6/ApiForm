const bcrypt = require('bcrypt');

async function generateAndVerifyHash() {
  const password = 'admin123';
  const existingHash = '$2b$10$rOvwXSfPGNFvWQyGjUOUAOcZXBiHb7wZfyGlU7mJcP2n5KOqzJHiC';
  
  console.log('=== VERIFICACIÓN DE HASH ===');
  console.log('Contraseña a verificar:', password);
  console.log('Hash existente:', existingHash);
  
  // Verificar si el hash existente coincide con la contraseña
  const isValid = await bcrypt.compare(password, existingHash);
  console.log('¿El hash existente es válido?', isValid);
  
  // Generar un nuevo hash para comparar
  const newHash = await bcrypt.hash(password, 10);
  console.log('Nuevo hash generado:', newHash);
  
  // Verificar el nuevo hash
  const isNewHashValid = await bcrypt.compare(password, newHash);
  console.log('¿El nuevo hash es válido?', isNewHashValid);
  
  console.log('\n=== QUERY PARA ACTUALIZAR ===');
  console.log(`UPDATE Usuarios SET PasswordHash = '${newHash}' WHERE Username = 'admin';`);
}

generateAndVerifyHash().catch(console.error);