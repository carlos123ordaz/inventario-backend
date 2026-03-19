const Equipo = require('../models/Equipo');
const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const multer = require('multer');
const { Readable } = require('stream');

const iconv = require('iconv-lite');

// Agregar esta función de utilidad
function convertirEncoding(buffer) {
    // Detectar si es UTF-8 válido
    try {
        const texto = buffer.toString('utf-8');
        // Si tiene caracteres de reemplazo, probablemente no es UTF-8
        if (texto.includes('�')) {
            return iconv.decode(buffer, 'latin1');
        }
        return texto;
    } catch {
        return iconv.decode(buffer, 'latin1');
    }
}

// ============================================================
// CAMPOS MAPEABLES DEL MODELO EQUIPO
// ============================================================
const CAMPOS_EQUIPO = [
    { key: 'tipo', label: 'Tipo', required: true, ejemplo: 'LAPTOP, DESKTOP, MOUSE, MONITOR, COOLER, TECLADO, CELULAR, OTRO' },
    { key: 'marca', label: 'Marca', required: true, ejemplo: 'Dell, HP, Lenovo' },
    { key: 'modelo', label: 'Modelo', required: true, ejemplo: 'Latitude 5520' },
    { key: 'serie', label: 'Número de Serie', required: true, ejemplo: 'ABC123XYZ' },
    { key: 'host', label: 'Host', required: false, ejemplo: 'PC-CONTABILIDAD-01' },
    { key: 'hostname', label: 'Hostname', required: false, ejemplo: 'DESKTOP-A1B2C3' },
    { key: 'estado', label: 'Estado', required: false, ejemplo: 'Disponible, En Uso, Mantenimiento, Dado de Baja, Extraviado' },
    { key: 'fechaCompra', label: 'Fecha de Compra', ejemplo: '2024-01-15' },
    { key: 'procesador', label: 'Procesador', required: false, ejemplo: 'Intel Core i7-1165G7' },
    { key: 'almacenamiento', label: 'Almacenamiento', required: false, ejemplo: '512GB SSD' },
    { key: 'memoria', label: 'Memoria RAM', required: false, ejemplo: '16GB DDR4' },
    { key: 'pantalla', label: 'Pantalla', required: false, ejemplo: '15.6" FHD' },
    { key: 'tarjetaGrafica', label: 'Tarjeta Gráfica', required: false, ejemplo: 'NVIDIA GeForce MX450' },
    { key: 'puertoRed', label: 'Puerto de Red', required: false, ejemplo: 'true / false' },
    { key: 'puertosUSB', label: 'Puertos USB', required: false, ejemplo: 'true / false' },
    { key: 'puertoSerial', label: 'Puerto Serial', required: false, ejemplo: 'true / false' },
    { key: 'puertoHDMI', label: 'Puerto HDMI', required: false, ejemplo: 'true / false' },
    { key: 'puertoC', label: 'Puerto USB-C', required: false, ejemplo: 'true / false' },
    { key: 'proveedor.razonSocial', label: 'Proveedor - Razón Social', required: false, ejemplo: 'Tech Solutions SAC' },
    { key: 'proveedor.ruc', label: 'Proveedor - RUC', required: false, ejemplo: '20123456789' },
    { key: 'proveedor.nroFactura', label: 'Proveedor - Nro Factura', required: false, ejemplo: 'F001-00123' },
    { key: 'proveedor.precioUnitario', label: 'Proveedor - Precio Unitario', required: false, ejemplo: '3500.00' },
    { key: 'proveedor.moneda', label: 'Proveedor - Moneda', required: false, ejemplo: 'PEN, USD, EUR' },
    { key: 'clavesBIOS.contrasena', label: 'BIOS - Contraseña', required: false, ejemplo: 'admin123' },
    { key: 'clavesBIOS.notas', label: 'BIOS - Notas', required: false, ejemplo: 'Contraseña por defecto del fabricante' },
    { key: 'clavesAdministrador.usuario', label: 'Admin - Usuario', required: false, ejemplo: 'Administrador' },
    { key: 'clavesAdministrador.contrasena', label: 'Admin - Contraseña', required: false, ejemplo: 'P@ssw0rd' },
    { key: 'clavesAdministrador.notas', label: 'Admin - Notas', required: false, ejemplo: 'Cuenta de administración local' },
    { key: 'clavesEquipo.usuario', label: 'Equipo - Usuario', required: false, ejemplo: 'usuario.local' },
    { key: 'clavesEquipo.contrasena', label: 'Equipo - Contraseña', required: false, ejemplo: '12345678' },
    { key: 'clavesEquipo.notas', label: 'Equipo - Notas', required: false, ejemplo: 'Cuenta estándar del usuario' },

    { key: 'puk', label: 'Celular - PUK', required: false, ejemplo: '12345678' },
    { key: 'email', label: 'Celular - Correo electrónico', required: false, ejemplo: 'usuario@gmail.com' },
    { key: 'password', label: 'Celular - Contraseña', required: false, ejemplo: '********' },
    { key: 'codeSIM', label: 'Código SIM', required: false, ejemplo: '8951071234567890123' },
    { key: 'imei', label: 'IMEI', required: false, ejemplo: '359876543210123' },
    { key: 'observaciones', label: 'Observaciones', required: false, ejemplo: 'Equipo nuevo' },
    { key: 'phoneNumber', label: 'Línea Asignada', required: false, ejemplo: '985..' },
];

// ============================================================
// OBTENER CAMPOS DISPONIBLES PARA MAPEO
// ============================================================
exports.obtenerCamposMapeo = (req, res) => {
    res.json({ success: true, data: CAMPOS_EQUIPO });
};

// ============================================================
// MULTER CONFIG
// ============================================================
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.originalname.endsWith('.csv')
        ) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos CSV'), false);
        }
    }
});
exports.uploadMiddleware = upload.single('archivo');

// ============================================================
// PREVISUALIZAR CSV
// ============================================================
exports.previsualizarCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ningún archivo' });
        }

        const delimitador = req.body.delimitador || ',';

        const resultados = [];
        const contenido = convertirEncoding(req.file.buffer);
        const readable = Readable.from(Buffer.from(contenido, 'utf-8'));

        await new Promise((resolve, reject) => {
            readable
                .pipe(csv({ separator: delimitador }))
                .on('data', (row) => { if (resultados.length < 5) resultados.push(row); })
                .on('end', resolve)
                .on('error', reject);
        });

        if (resultados.length === 0) {
            return res.status(400).json({ success: false, message: 'El archivo CSV está vacío o tiene formato inválido' });
        }

        const columnas = Object.keys(resultados[0]);

        // Si solo detecta 1 columna, probablemente el delimitador es incorrecto
        if (columnas.length === 1 && columnas[0].includes(';')) {
            return res.status(400).json({
                success: false,
                message: 'Solo se detectó 1 columna. Intenta cambiar el delimitador a punto y coma (;)'
            });
        }

        let totalFilas = 0;
        const readableCount = Readable.from(req.file.buffer);
        await new Promise((resolve, reject) => {
            readableCount
                .pipe(csv({ separator: delimitador }))
                .on('data', () => totalFilas++)
                .on('end', resolve)
                .on('error', reject);
        });

        res.json({
            success: true,
            data: { columnas, preview: resultados, totalFilas, campos: CAMPOS_EQUIPO }
        });
    } catch (error) {
        console.error('Error al previsualizar CSV:', error);
        res.status(500).json({ success: false, message: 'Error al procesar el archivo CSV', error: error.message });
    }
};

// ============================================================
// IMPORTAR EQUIPOS
// ============================================================
exports.importarEquipos = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ningún archivo' });
        }

        const { mapeo, actualizarExistentes, delimitador } = req.body;
        const separador = delimitador || ',';
        const mapeoObj = typeof mapeo === 'string' ? JSON.parse(mapeo) : mapeo;
        const actualizar = actualizarExistentes === 'true' || actualizarExistentes === true;

        if (!mapeoObj || Object.keys(mapeoObj).length === 0) {
            return res.status(400).json({ success: false, message: 'Debe proporcionar el mapeo de columnas' });
        }

        // Validar campos requeridos
        const camposRequeridos = CAMPOS_EQUIPO.filter(c => c.required).map(c => c.key);
        const camposMapeados = Object.values(mapeoObj).filter(v => v && v !== '');
        const faltantes = camposRequeridos.filter(cr => !camposMapeados.includes(cr));

        if (faltantes.length > 0) {
            const labels = faltantes.map(f => CAMPOS_EQUIPO.find(c => c.key === f)?.label || f);
            return res.status(400).json({ success: false, message: `Campos requeridos sin mapear: ${labels.join(', ')}` });
        }

        // Leer CSV
        const filas = [];
        const readable = Readable.from(req.file.buffer);
        await new Promise((resolve, reject) => {
            readable.pipe(csv({ separator: separador })).on('data', (row) => filas.push(row)).on('end', resolve).on('error', reject);
        });

        const resultados = { creados: 0, actualizados: 0, errores: [], total: filas.length };

        for (let i = 0; i < filas.length; i++) {
            try {
                const fila = filas[i];
                const equipoData = {};

                for (const [columnaCSV, campoModelo] of Object.entries(mapeoObj)) {
                    if (campoModelo && campoModelo !== '' && fila[columnaCSV] !== undefined) {
                        const valor = fila[columnaCSV]?.trim();
                        if (!valor) continue;

                        if (campoModelo.includes('.')) {
                            const partes = campoModelo.split('.');
                            if (!equipoData[partes[0]]) equipoData[partes[0]] = {};
                            equipoData[partes[0]][partes[1]] = convertirValor(campoModelo, valor);
                        } else {
                            equipoData[campoModelo] = convertirValor(campoModelo, valor);
                        }
                    }
                }

                if (!equipoData.tipo || !equipoData.marca || !equipoData.modelo || !equipoData.serie) {
                    resultados.errores.push({ fila: i + 2, mensaje: 'Faltan campos requeridos (tipo, marca, modelo o serie)' });
                    continue;
                }

                equipoData.tipo = equipoData.tipo.toUpperCase();
                equipoData.serie = equipoData.serie.toUpperCase();

                const existente = await Equipo.findOne({ serie: equipoData.serie });

                if (existente) {
                    if (actualizar) {
                        await Equipo.findByIdAndUpdate(existente._id, equipoData, { runValidators: true, user: req.user?.id });
                        resultados.actualizados++;
                    } else {
                        resultados.errores.push({ fila: i + 2, mensaje: `Serie ${equipoData.serie} ya existe (se omitió)` });
                    }
                } else {
                    const nuevoEquipo = new Equipo(equipoData);
                    if (req.user?.id) nuevoEquipo._modifiedBy = req.user.id;
                    await nuevoEquipo.save();
                    resultados.creados++;
                }
            } catch (err) {
                resultados.errores.push({ fila: i + 2, mensaje: err.message });
            }
        }

        res.json({
            success: true,
            message: `Importación completada: ${resultados.creados} creados, ${resultados.actualizados} actualizados, ${resultados.errores.length} errores`,
            data: resultados
        });
    } catch (error) {
        console.error('Error al importar equipos:', error);
        res.status(500).json({ success: false, message: 'Error al importar equipos', error: error.message });
    }
};

// ============================================================
// EXPORTAR EQUIPOS A EXCEL
// ============================================================
exports.exportarEquipos = async (req, res) => {
    try {
        const { estado, tipo, termino } = req.query;
        let filtro = {};

        if (estado) filtro.estado = estado;
        if (tipo) filtro.tipo = tipo;
        if (termino && termino.trim()) {
            filtro.$or = [
                { marca: { $regex: termino, $options: 'i' } },
                { modelo: { $regex: termino, $options: 'i' } },
                { serie: { $regex: termino, $options: 'i' } },
                { host: { $regex: termino, $options: 'i' } },
                { procesador: { $regex: termino, $options: 'i' } }
            ];
        }

        const equipos = await Equipo.find(filtro).sort({ createdAt: -1 }).lean();

        const Historial = require('../models/Historial');
        const asignaciones = await Historial.find({
            equipo: { $in: equipos.map(e => e._id) },
            activo: true
        }).populate('usuario', 'nombre apellido area cargo correo').lean();

        const asignacionMap = {};
        asignaciones.forEach(a => { asignacionMap[a.equipo.toString()] = a.usuario; });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Sistema de Inventario';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('Equipos');

        ws.columns = [
            { header: 'Tipo', key: 'tipo', width: 12 },
            { header: 'Marca', key: 'marca', width: 15 },
            { header: 'Modelo', key: 'modelo', width: 20 },
            { header: 'Serie', key: 'serie', width: 22 },
            { header: 'Host', key: 'host', width: 20 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Fecha de Compra', key: 'fechaCompra', width: 16 },
            { header: 'Procesador', key: 'procesador', width: 25 },
            { header: 'Memoria', key: 'memoria', width: 12 },
            { header: 'Almacenamiento', key: 'almacenamiento', width: 15 },
            { header: 'Pantalla', key: 'pantalla', width: 14 },
            { header: 'Tarjeta Gráfica', key: 'tarjetaGrafica', width: 20 },
            { header: 'Puerto Red', key: 'puertoRed', width: 12 },
            { header: 'Puertos USB', key: 'puertosUSB', width: 12 },
            { header: 'Puerto HDMI', key: 'puertoHDMI', width: 12 },
            { header: 'Puerto USB-C', key: 'puertoC', width: 12 },

            { header: 'BIOS - Contraseña', key: 'biosContrasena', width: 18 },
            { header: 'BIOS - Notas', key: 'biosNotas', width: 20 },
            { header: 'Admin - Usuario', key: 'adminUsuario', width: 18 },
            { header: 'Admin - Contraseña', key: 'adminContrasena', width: 18 },
            { header: 'Admin - Notas', key: 'adminNotas', width: 20 },
            { header: 'Equipo - Usuario', key: 'equipoUsuario', width: 18 },
            { header: 'Equipo - Contraseña', key: 'equipoContrasena', width: 18 },
            { header: 'Equipo - Notas', key: 'equipoNotas', width: 20 },

            { header: 'Proveedor', key: 'proveedorRazonSocial', width: 25 },
            { header: 'RUC Proveedor', key: 'proveedorRuc', width: 15 },
            { header: 'Nro Factura', key: 'proveedorNroFactura', width: 16 },
            { header: 'Precio', key: 'proveedorPrecio', width: 12 },
            { header: 'Moneda', key: 'proveedorMoneda', width: 10 },
            { header: 'Usuario Asignado', key: 'usuarioAsignado', width: 25 },
            { header: 'Área', key: 'areaUsuario', width: 18 },
            { header: 'Observaciones', key: 'observaciones', width: 30 },

            { header: 'Celular - PUK', key: 'puk', width: 15 },
            { header: 'Correo', key: 'email', width: 25 },
            { header: 'Contraseña', key: 'password', width: 18 },
            { header: 'Código SIM', key: 'codeSIM', width: 22 },
            { header: 'IMEI', key: 'imei', width: 18 },
            { header: 'Linea', key: 'phoneNumber', width: 18 },
        ];

        // Estilo header
        ws.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });
        ws.getRow(1).height = 28;

        // Data
        equipos.forEach((equipo) => {
            const usuario = asignacionMap[equipo._id.toString()];
            ws.addRow({
                tipo: equipo.tipo,
                marca: equipo.marca,
                modelo: equipo.modelo,
                serie: equipo.serie,
                host: equipo.host || '',
                estado: equipo.estado,
                fechaCompra: equipo.fechaCompra ? new Date(equipo.fechaCompra).toLocaleDateString('es-PE') : '',
                procesador: equipo.procesador || '',
                memoria: equipo.memoria || '',
                almacenamiento: equipo.almacenamiento || '',
                pantalla: equipo.pantalla || '',
                tarjetaGrafica: equipo.tarjetaGrafica || '',
                puertoRed: equipo.puertoRed ? 'Sí' : 'No',
                puertosUSB: equipo.puertosUSB ? 'Sí' : 'No',
                puertoHDMI: equipo.puertoHDMI ? 'Sí' : 'No',
                puertoC: equipo.puertoC ? 'Sí' : 'No',
                proveedorRazonSocial: equipo.proveedor?.razonSocial || '',
                proveedorRuc: equipo.proveedor?.ruc || '',
                proveedorNroFactura: equipo.proveedor?.nroFactura || '',
                proveedorPrecio: equipo.proveedor?.precioUnitario || '',
                proveedorMoneda: equipo.proveedor?.moneda || '',
                usuarioAsignado: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Sin asignar',
                areaUsuario: usuario?.area || '',
                observaciones: equipo.observaciones || '',

                biosContrasena: equipo.clavesBIOS?.contrasena || '',
                biosNotas: equipo.clavesBIOS?.notas || '',
                adminUsuario: equipo.clavesAdministrador?.usuario || '',
                adminContrasena: equipo.clavesAdministrador?.contrasena || '',
                adminNotas: equipo.clavesAdministrador?.notas || '',
                equipoUsuario: equipo.clavesEquipo?.usuario || '',
                equipoContrasena: equipo.clavesEquipo?.contrasena || '',
                equipoNotas: equipo.clavesEquipo?.notas || '',

                puk: equipo.puk || '',
                email: equipo.email || '',
                password: equipo.password || '',
                codeSIM: equipo.codeSIM || '',
                imei: equipo.imei || '',
                phoneNumber: equipo.phoneNumber || '',
            });
        });

        // Estilos filas de datos
        ws.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                    cell.alignment = { vertical: 'middle' };
                });
                if (rowNumber % 2 === 0) {
                    row.eachCell((cell) => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                    });
                }
            }
        });

        ws.autoFilter = {
            from: 'A1',
            to: `${getColumnLetter(ws.columns.length)}${equipos.length + 1}`
        };

        const fecha = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=equipos_${fecha}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error al exportar equipos:', error);
        res.status(500).json({ success: false, message: 'Error al exportar equipos', error: error.message });
    }
};

function getColumnLetter(index) {
    let letter = '';
    while (index > 0) {
        const mod = (index - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        index = Math.floor((index - 1) / 26);
    }
    return letter;
}

// ============================================================
// UTILIDADES
// ============================================================
function convertirValor(campo, valor) {
    const camposBooleanos = ['puertoRed', 'puertosUSB', 'puertoSerial', 'puertoHDMI', 'puertoC'];
    if (camposBooleanos.includes(campo)) {
        return ['true', 'si', 'sí', '1', 'yes'].includes(valor.toLowerCase());
    }
    if (campo === 'proveedor.precioUnitario') {
        const num = parseFloat(valor);
        return isNaN(num) ? 0 : num;
    }
    if (campo === 'fechaCompra') {
        const fecha = new Date(valor);
        return isNaN(fecha.getTime()) ? new Date() : fecha;
    }

    if (campo === 'estado') {
        return normalizarEstado(valor);
    }

    // Normalizar tipo
    if (campo === 'tipo') {
        return normalizarTipo(valor);
    }

    return valor;
}


function convertirValor(campo, valor) {
    const camposBooleanos = ['puertoRed', 'puertosUSB', 'puertoSerial', 'puertoHDMI', 'puertoC'];
    if (camposBooleanos.includes(campo)) {
        return ['true', 'si', 'sí', '1', 'yes'].includes(valor.toLowerCase());
    }

    if (campo === 'proveedor.precioUnitario') {
        const num = parseFloat(valor);
        return isNaN(num) ? 0 : num;
    }

    if (campo === 'fechaCompra') {
        const fecha = new Date(valor);
        return isNaN(fecha.getTime()) ? new Date() : fecha;
    }

    // Normalizar estado
    if (campo === 'estado') {
        return normalizarEstado(valor);
    }


    return valor;
}

function normalizarEstado(valor) {
    const mapa = {
        'DISPONIBLE': 'Disponible',
        'STOCK': 'Disponible',
        'NO TIENE': 'Disponible',
        'ASIGNADO': 'En Uso',
        'EN MANTENIMIENTO': 'Mantenimiento',
        'REPARACION': 'Mantenimiento',
        'INOPERATIVO': 'Dado de Baja',
        'ROBADO': 'Extraviado',
        'ROBADA': 'Extraviado',
        'ROBADA': 'Extraviado',
        'PRESTAMO': 'Prestamo',
    };

    const normalizado = valor.toLowerCase().trim();
    return mapa[normalizado] || 'Disponible';
}
