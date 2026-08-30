// ============================================
// SERVER VERI - Orquestrador de Rotas
// ============================================
const express = require('express');
const cors = require('cors');

require('dotenv').config();

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

const veriApi = require('./veri-api');
app.use('/', veriApi);

const checkoutRouter = require('./modules/checkout');
app.use('/api', checkoutRouter);

app.get('/health', function(req, res) {
    var versao = '3.2.1';
    try {
        versao = require('./veri-api').VERSAO_API || '3.2.1';
    } catch (e) {}
    res.json({
        status: 'online',
        versao_api: versao,
        timestamp: new Date().toISOString()
    });
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log('VERI Server rodando na porta ' + PORT);
    console.log('Rotas operacionais: /enriquecer, /teste-cnpj, /analisar');
    console.log('Rotas financeiras: /api/create-checkout-session, /api/webhook/stripe');
});



