// ============================================
// CHECKOUT - Módulo Financeiro (Stripe)
// Separado da lógica operacional
// ============================================
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// ============================================================
// MAPEAMENTO DE PRODUTOS
// ============================================================
const PRODUTOS = {
    express: {
        name: 'VERI-EXPRESS',
        price_brl: 490,   // R$ 4,90 em centavos
        price_usd: 99,    // US$ 0,99
        description: 'Análise Expressa'
    },
    negocios: {
        name: 'VERI-NEGÓCIOS',
        price_brl: 990,   // R$ 9,90
        price_usd: 199,   // US$ 1,99
        description: 'Análise Detalhada'
    },
    contratos: {
        name: 'VERI-CONTRATOS',
        price_brl: 990,   // R$ 9,90
        price_usd: 199,   // US$ 1,99
        description: 'Análise de Contratos'
    }
};

// ============================================================
// 1. CRIA SESSÃO DE CHECKOUT
// ============================================================
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { produto, success_url, cancel_url, customer_email, country_code } = req.body;

        const produtoData = PRODUTOS[produto];
        if (!produtoData) {
            return res.status(400).json({ error: 'Produto inválido' });
        }

        // Determina moeda e preço
        const isBr = (country_code || 'BR').toUpperCase() === 'BR';
        const currency = isBr ? 'brl' : 'usd';
        const price = isBr ? produtoData.price_brl : produtoData.price_usd;

        // Stripe Tax: ligado apenas se NÃO for Brasil e se a variável estiver ativa
        const taxEnabled = process.env.STRIPE_TAX_ENABLED === 'true' && !isBr;

        // Constrói URLs com concatenação (sem crases)
        var successUrl = success_url;
        if (!successUrl) {
            var origin = req.headers.origin || 'https://veri.app.br';
            successUrl = origin + '/analise.html?pago=true&produto=' + produto;
        }
        var cancelUrl = cancel_url || req.headers.referer || req.headers.origin || 'https://veri.app.br';

        const sessionData = {
            payment_method_types: ['card', 'boleto', 'pix'],
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: produtoData.name,
                        description: produtoData.description,
                    },
                    unit_amount: price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                produto: produto,
                country: country_code || 'BR',
                tipo_analise: 'paga'
            },
            payment_intent_data: {
                metadata: {
                    produto: produto
                }
            }
        };

        if (taxEnabled) {
            sessionData.automatic_tax = { enabled: true };
            sessionData.tax_behavior = 'exclusive';
        }

        if (customer_email) {
            sessionData.customer_email = customer_email;
        }

        const session = await stripe.checkout.sessions.create(sessionData);

        return res.json({
            id: session.id,
            url: session.url,
        });

    } catch (err) {
        console.error('Erro ao criar sessão de checkout:', err);
        return res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 2. WEBHOOK STRIPE
// ============================================================
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
        return res.status(400).json({ error: 'Assinatura ou secret ausente' });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Erro na verificação do webhook:', err.message);
        return res.status(400).json({ error: 'Assinatura inválida' });
    }

    console.log('Webhook recebido: ' + event.type);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata || {};
        const produto = metadata.produto || 'negocios';
        const customerEmail = session.customer_details ? session.customer_details.email : '';
        const amountTotal = (session.amount_total || 0) / 100;

        console.log('✅ Pagamento confirmado:');
        console.log('   Produto: ' + produto);
        console.log('   E-mail: ' + customerEmail);
        console.log('   Valor: ' + amountTotal + ' ' + (session.currency || '').toUpperCase());
        console.log('   ID: ' + session.id);

        // ============================================================
        // AQUI VOCÊ INTEGRA COM O BANCO (REGISTRA A TRANSAÇÃO)
        // ============================================================
        // Exemplo:
        // - Inserir na tabela transacoes
        // - Atualizar o saldo de análises do cliente
        // - Associar ao representante, se houver

        // await salvarTransacao(session);
    }

    return res.json({ status: 'ok' });
});

module.exports = router;