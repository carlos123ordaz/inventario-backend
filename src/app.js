const express = require('express')
const app = express();
const cors = require('cors')
require('./models')

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    res.send('v.1.0.13')
})

app.use('/api/usuarios', require('./routes/Usuario'));
app.use('/api/equipos', require('./routes/Equipo'));
app.use('/api/historial', require('./routes/Historial'));
app.use('/api/historial', require('./routes/Historial'));
app.use('/api/auto-asignacion', require('./routes/autoAsignacion'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port: ${PORT}`);
})