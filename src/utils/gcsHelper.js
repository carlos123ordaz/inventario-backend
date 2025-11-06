const { bucketsConfig } = require('../config/googleCloud');
const path = require('path');

class GCSHelper {
  static async uploadTemplate(file) {
    try {
      const bucket = bucketsConfig.templates;
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.originalname}`;
      const blob = bucket.file(filename);
      
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.mimetype,
        }
      });

      return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
          reject(err);
        });

        blobStream.on('finish', async () => {
          await blob.makePublic();
          
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          
          resolve({
            url: publicUrl,
            filename: blob.name,
            path: `gs://${bucket.name}/${blob.name}`,
            bucketName: bucket.name
          });
        });

        blobStream.end(file.buffer);
      });
    } catch (error) {
      throw new Error(`Error al subir template: ${error.message}`);
    }
  }

  /**
   * Subir archivo generado
   */
  static async uploadGenerated(buffer, filename, mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const bucket = bucketsConfig.generated;
      const timestamp = Date.now();
      const fullFilename = `${timestamp}-${filename}`;
      const blob = bucket.file(fullFilename);
      
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: mimetype,
        }
      });

      return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
          reject(err);
        });

        blobStream.on('finish', async () => {
          await blob.makePublic();
          
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          
          resolve({
            url: publicUrl,
            filename: blob.name,
            path: `gs://${bucket.name}/${blob.name}`,
            bucketName: bucket.name
          });
        });

        blobStream.end(buffer);
      });
    } catch (error) {
      throw new Error(`Error al subir archivo generado: ${error.message}`);
    }
  }

  /**
   * Descargar archivo desde GCS
   */
  static async downloadFile(bucketName, filename) {
    try {
      const bucket = bucketsConfig.templates.name === bucketName 
        ? bucketsConfig.templates 
        : bucketsConfig.generated;
      
      const file = bucket.file(filename);
      const [buffer] = await file.download();
      
      return buffer;
    } catch (error) {
      throw new Error(`Error al descargar archivo: ${error.message}`);
    }
  }

  /**
   * Eliminar archivo
   */
  static async deleteFile(bucketName, filename) {
    try {
      const bucket = bucketsConfig.templates.name === bucketName 
        ? bucketsConfig.templates 
        : bucketsConfig.generated;
      
      await bucket.file(filename).delete();
      return true;
    } catch (error) {
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  /**
   * Obtener URL firmada (temporal)
   */
  static async getSignedUrl(bucketName, filename, expirationMinutes = 60) {
    try {
      const bucket = bucketsConfig.templates.name === bucketName 
        ? bucketsConfig.templates 
        : bucketsConfig.generated;
      
      const file = bucket.file(filename);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });
      
      return url;
    } catch (error) {
      throw new Error(`Error al generar URL firmada: ${error.message}`);
    }
  }
}

module.exports = GCSHelper;