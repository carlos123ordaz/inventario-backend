const { Storage } = require('@google-cloud/storage');

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const storage = new Storage({
        credentials: credentials
});

const BUCKET_TEMPLATES = 'quotizador';
const BUCKET_GENERATED = 'quotizador';

const bucketsConfig = {
    templates: storage.bucket(BUCKET_TEMPLATES),
    generated: storage.bucket(BUCKET_GENERATED)
};

module.exports = {
    storage,
    bucketsConfig,
    BUCKET_TEMPLATES,
    BUCKET_GENERATED
};