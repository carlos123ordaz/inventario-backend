const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect('mongodb+srv://carlosjesusordazhoyos_db_user:Z9sVzYmBdnKy5Y1i@cluster0.l4wjrmp.mongodb.net/dbinventario', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(db => console.log('db connected'))
    .catch(error => console.log(error));
