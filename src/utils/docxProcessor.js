const Docxtemplater = require('docxtemplater');
const moment = require('moment');
const PizZip = require('pizzip');

class DocxProcessor {
  static async extractFields(buffer) {
    try {
      return this.extractFieldsSimple(buffer);
    } catch (error) {
      console.error('Error al extraer campos:', error);
      throw new Error('No se pudieron extraer los campos del documento.');
    }
  }

  static extractFieldsSimple(buffer) {
    try {
      const zip = new PizZip(buffer);
      const content = zip.file('word/document.xml').asText();
      const textOnly = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ');

      const regex = /\{\{([^}]+)\}\}/g;
      const matches = textOnly.match(regex) || [];
      const uniqueTags = [...new Set(
        matches
          .map(match => match.replace(/[{}]/g, '').trim())
          .filter(tag => tag.length > 0 && !tag.includes('<') && !tag.includes('>'))
      )];

      return uniqueTags.map(tag => ({
        nombre: tag,
        tipo: this.inferFieldType(tag),
        categoria: this.inferFieldCategory(tag)
      }));
    } catch (error) {
      console.error('Error en método simple:', error);
      throw new Error('Error al leer el archivo Word.');
    }
  }
  static inferFieldType(fieldName) {
    const lowerName = fieldName.toLowerCase();
    if (lowerName.includes('fecha')) return 'fecha';
    if (lowerName.includes('numero') || lowerName.includes('cantidad') || lowerName.includes('antiguedad')) return 'numero';
    return 'texto';
  }

  static inferFieldCategory(fieldName) {
    const lowerName = fieldName.toLowerCase();
    if (lowerName.includes('usuario') || lowerName.includes('nombre') || lowerName.includes('dni') ||
      lowerName.includes('cargo') || lowerName.includes('area') || lowerName.includes('correo')) {
      return 'usuario';
    }
    if (lowerName.includes('equipo') || lowerName.includes('marca') || lowerName.includes('modelo') ||
      lowerName.includes('serie') || lowerName.includes('host') || lowerName.includes('procesador')) {
      return 'equipo';
    }
    return 'general';
  }

  static async generateDocument(templateBuffer, data) {
    try {
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
        delimiters: {
          start: '{{',
          end: '}}'
        }
      });

      const formattedData = this.formatData(data);
      doc.render(formattedData);

      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return buffer;
    } catch (error) {
      console.error('Error detallado al generar documento:', error);

      if (error.properties && error.properties.errors) {
        const errorMessages = error.properties.errors
          .slice(0, 3)
          .map(err => err.message)
          .join(', ');
        throw new Error(`Error en el formato del documento: ${errorMessages}. Las etiquetas deben escribirse sin formato especial.`);
      }

      throw new Error(`Error al generar documento: ${error.message}`);
    }
  }

  static formatData(data) {
    const formatted = { ...data };
    Object.keys(formatted).forEach(key => {
      if (formatted[key] instanceof Date) {
        formatted[key] = this.formatDate(formatted[key]);
      }
      if (typeof formatted[key] === 'string' && formatted[key].match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          formatted[key] = this.formatDate(new Date(formatted[key]));
        } catch (e) {
        }
      }
    });
    return formatted;
  }
  static formatDate(date) {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Lima'
    };
    return new Date(date).toLocaleDateString('es-PE', options);
  }
  static prepareTemplateData(usuario, equipo = null, userBy = null) {
    const data = {
      usuario_nombre: usuario.nombre || '',
      usuario_apellido: usuario.apellido || '',
      usuario_nombreCompleto: usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`,
      usuario_dni: usuario.dni || '',
      usuario_cargo: usuario.cargo || '',
      usuario_area: usuario.area || '',
      usuario_correo: usuario.correo || '',
      usuario_telefono: usuario.telefono || '',
      usuario_iniciales: usuario.iniciales || '',
      sede: 'Lima',
      fecha_actual: this.formatDate(new Date()),
      fecha_generacion: this.formatDate(new Date()),
    };
    if (equipo) {
      data.equipo_marca = equipo.marca || '';
      data.equipo_modelo = equipo.modelo || '';
      data.equipo_serie = equipo.serie || '';
      data.equipo_host = equipo.host || '';
      data.equipo_tipo = equipo.equipo || '';
      data.equipo_procesador = equipo.procesador || '';
      data.equipo_memoria = equipo.memoria || '';
      data.equipo_almacenamiento = equipo.almacenamiento || '';
      data.equipo_almacenamient = equipo.almacenamiento || '';
      data.equipo_pantalla = equipo.pantalla || '';
      data.equipo_gpu = equipo.tarjetaGrafica || '';
      data.equipo_fechaCompra = equipo.fechaCompra ? this.formatDate(equipo.fechaCompra) : '';
      data.equipo_antiguedad = equipo.antiguedad ? `${equipo.antiguedad} años` : '';
    }
    if (userBy) {
      data.name = `${userBy.nombre} ${userBy.apellido}`;
      data.cargo = userBy.cargo;
      data.dni = userBy.dni;
    }
    data.fecha = moment().format('DD-MM-YYYY')
    return data;
  }
}

module.exports = DocxProcessor;