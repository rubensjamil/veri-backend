// ============================================
// SERVER VERI - Orquestrador de Rotas
// ============================================
const express = require('express');
const cors = require('cors');

// ============================================
// CARREGA VARIÁVEIS DE AMBIENTE
// ============================================
require('dotenv').config();

const app = express();

// ============================================
// CORS E JSON
// ============================================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ============================================
// ROTAS OPERACIONAIS (VERI-API)
// ============================================
const veriApi = require('./veri-api');
app.use('/', veriApi);

// ============================================
// ROTAS FINANCEIRAS (CHECKOUT)
// ============================================
const checkoutRouter = require('./modules/checkout');
app.use('/api', checkoutRouter);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        versao_api: require('./veri-api').VERSAO_API || '3.2.1',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// INICIA O SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(🚀 VERI Server rodando na porta ${PORT});
    console.log(📦 Rotas operacionais: /enriquecer, /teste-cnpj, /analisar);
    console.log(💰 Rotas financeiras: /api/create-checkout-session, /api/webhook/stripe);
});