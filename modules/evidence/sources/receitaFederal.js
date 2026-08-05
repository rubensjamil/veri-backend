const axios = require('axios');

async function consultarReceita(cnpj) {
    if (!cnpj) return null;

    var clean = cnpj.replace(/\D/g, '');

    // 1. Tenta BrasilAPI
    try {
        var res = await axios.get('https://brasilapi.com.br/api/cnpj/v1/' + clean, {
            timeout: 4000
        });

        if (res.data && !res.data.error) {
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
        console.warn('BrasilAPI error:', err.message);
    }

    // 2. Fallback para ReceitaWS
    try {
        var res = await axios.get('https://www.receitaws.com.br/v1/cnpj/' + clean, {
            timeout: 4000
        });

        if (res.data && res.data.status !== 'ERROR' && !res.data.error) {
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
        console.warn('ReceitaWS error:', err.message);
    }

    return null;
}

module.exports = { consultarReceita };