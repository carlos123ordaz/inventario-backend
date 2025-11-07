const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const verificarToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No autenticado" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};
// const verificarRol = (rolesPermitidos) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: "No autenticado" });
//       }
//       const Usuario = require('../models/Usuario');
//       const usuario = await Usuario.findById(req.user.id).select('rol');
      
//       if (!usuario) {
//         return res.status(404).json({ error: "Usuario no encontrado" });
//       }
//       if (!rolesPermitidos.includes(usuario.rol)) {
//         return res.status(403).json({ error: "No tienes permisos para realizar esta acción" });
//       }
//       req.userInfo = usuario;
//       next();
//     } catch (error) {
//       console.error('Error verificando rol:', error);
//       return res.status(500).json({ error: "Error al verificar permisos" });
//     }
//   };
// };
module.exports = {
  verificarToken,
  // verificarRol
};