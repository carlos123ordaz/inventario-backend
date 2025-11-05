const express = require('express')
const app = express();
const cors = require('cors')
require('./models')
app.use(express.json());
const port = process.env.PORT || 4000;

app.use(cors());

app.get('/', (req, res) => {
    res.send('v.1.0.13')
})

app.use('/api/usuarios', require('./routes/Usuario'));
app.use('/api/equipos', require('./routes/Equipo'));
app.use('/api/historial', require('./routes/Historial'));

app.listen(port, () => {
    console.log('server running on port: ' + port);
})