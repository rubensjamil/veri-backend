const axios = require('axios');

async function consultarReceita(cnpj) {
    if (!cnpj) return null;

    // 🔧 CORREÇÃO: Limpeza mais rigorosa
    var clean = cnpj.replace(/\D/g, '').trim();
    
    // 🔧 CORREÇÃO: Verifica se o CNPJ tem 14 dígitos
    if (clean.length !== 14) {
        console.warn('⚠️ CNPJ inválido para consulta:', clean);
        return null;
    }

    console.log('🔍 Consultando Receita para CNPJ:', clean);

    // 1. Tenta BrasilAPI
    try {
        var res = await axios.get('https://brasilapi.com.br/api/cnpj/v1/' + clean, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (res.data && !res.data.error) {
            console.log('✅ BrasilAPI retornou dados para CNPJ:', clean);
            return {
                cnpj: res.data.cnpj,
                razao_social: res.data.razao_social || '',
                nome_fantasia: res.data.nome_fantasia || '',
                situacao: res.data.descricao_situacao_cadastral || 'ATIVA',
                abertura: res.data.data_inicio_atividade || '',
                porte: res.data.porte || '',
                setor: res.data.cnae_fiscal_descricao || '',
                email: res.data.email || '',
                source: 'brasilapi'
            };
        }
    } catch (err) {
        if (err.response) {
            console.warn('BrasilAPI error status:', err.response.status);
            console.warn('BrasilAPI error data:', JSON.stringify(err.response.data));
        } else {
            console.warn('BrasilAPI error:', err.message);
        }
    }

    // 2. Fallback para ReceitaWS
    try {
        var res = await axios.get('https://www.receitaws.com.br/v1/cnpj/' + clean, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (res.data && res.data.status !== 'ERROR' && !res.data.error) {
            console.log('✅ ReceitaWS retornou dados para CNPJ:', clean);
            return {
                cnpj: clean,
                razao_social: res.data.nome || res.data.razao_social || '',
                nome_fantasia: res.data.fantasia || res.data.nome_fantasia || '',
                situacao: res.data.situacao || 'ATIVA',
                abertura: res.data.abertura || '',
                porte: res.data.porte || '',
                setor: res.data.atividade_principal ? res.data.atividade_principal[0].text : '',
                email: res.data.email || '',
                source: 'receitaws'
            };
        }
    } catch (err) {
        if (err.response) {
            console.warn('ReceitaWS error status:', err.response.status);
            console.warn('ReceitaWS error data:', JSON.stringify(err.response.data));
        } else {
            console.warn('ReceitaWS error:', err.message);
        }
    }

    console.warn('⚠️ Todas as fontes falharam para CNPJ:', clean);
    return null;
}

module.exports = { consultarReceita };