const Log = require('../models/Log.js');

auditPlugin = (schema, options = {}) => {
    const { collectionName } = options;
    schema.post('save', async function (doc) {
        try {
            await Log.create({
                collectionName,
                documentId: doc._id,
                action: 'create',
                user: doc._modifiedBy,
                before: null,
                after: doc.toObject(),
            });
        } catch (err) {
            console.error('[auditPlugin save] Error registrando log:', err.message);
        }
    });

    schema.post('findOneAndUpdate', async function (result) {
        try {
            if (!result) return;

            const before = await this.model.findOne(this.getQuery()).lean();
            const after = await this.model.findById(result._id).lean();

            await Log.create({
                collectionName,
                documentId: result._id,
                action: 'update',
                user: this.options.user,
                before,
                after,
            });
        } catch (err) {
            console.error('[auditPlugin update] Error registrando log:', err.message);
        }
    });

    schema.post('findOneAndDelete', async function (result) {
        try {
            if (!result) return;

            await Log.create({
                collectionName,
                documentId: result._id,
                action: 'delete',
                user: this.options.user,
                before: result.toObject(),
                after: null,
            });
        } catch (err) {
            console.error('[auditPlugin delete] Error registrando log:', err.message);
        }
    });
};


module.exports={
    auditPlugin
}