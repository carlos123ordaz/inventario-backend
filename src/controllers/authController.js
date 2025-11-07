const jwt = require('jsonwebtoken');
const Usuario = require("../models/Usuario.js");

const JWT_SECRET = process.env.JWT_SECRET;

const generarToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1d" });
};

exports.login = async (req, res) => {
    try {
        const { correo, password } = req.body;
        const usuario = await Usuario.findOne({ correo }).select('+password');
        
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const valido = await usuario.compararPassword(password);
        
        if (!valido) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }
        
        const token = generarToken(usuario._id);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "none":'lax',
            maxAge: 3600000 
        });
        const usuarioData = await Usuario.findById(usuario._id).select('-password')
        res.json({ 
            message: "Inicio de sesión exitoso",
            user: {
                id: usuarioData._id,
                nombre: usuarioData.nombre,
                correo: usuarioData.correo,
                rol: usuarioData.rol || 'user',
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
};

exports.logout = async (req, res) => {
    try {
        res.clearCookie("token");
        res.json({ message: "Sesión cerrada exitosamente" });
    } catch (err) {
        console.error('Error en logout:', err);
        res.status(500).json({ error: "Error al cerrar sesión" });
    }
};
