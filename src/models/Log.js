const { default: mongoose } = require("mongoose");

const logSchema = new mongoose.Schema({
  collectionName: { type: String, required: true }, 
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { 
    type: String, 
    enum: ['create', 'update', 'delete'], 
    required: true 
  },
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  before: mongoose.Schema.Types.Mixed, 
  after: mongoose.Schema.Types.Mixed, 
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', logSchema);