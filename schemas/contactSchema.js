const Joi = require('joi');

const contactSchema = Joi.object({
  nombre_completo: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El nombre completo es requerido',
      'string.min': 'El nombre debe tener al menos 3 caracteres',
      'string.max': 'El nombre no puede tener más de 100 caracteres'
    }),
  correo: Joi.string()
    .email()
    .trim()
    .required()
    .messages({
      'string.empty': 'El correo es requerido',
      'string.email': 'El correo no es válido'
    }),
  telefono: Joi.string()
    .trim()
    .pattern(/^[0-9+\s\-().]{7,20}$/)
    .required()
    .messages({
      'string.empty': 'El teléfono es requerido',
      'string.pattern.base': 'El teléfono no es válido'
    }),
  mensaje: Joi.string()
    .trim()
    .min(5)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'El mensaje es requerido',
      'string.min': 'El mensaje debe tener al menos 5 caracteres',
      'string.max': 'El mensaje no puede tener más de 1000 caracteres'
    }),
  recaptchaToken: Joi.string().required().messages({
    'string.empty': 'El token de reCAPTCHA es requerido'
  })
});

module.exports = contactSchema;
