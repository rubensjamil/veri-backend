const axios = require('axios');

async function consultarReceita(cnpj) {
    if (!cnpj) return null;

    var clean = cnpj.replace(/\D/g, '');

    try {
        var res = await axios.get('https://brasilapi.com.br/api/cnpj/v1/' + clean, {
            timeout: 4000
        });

        if (!res.data || res.data.error) return null;

        return {
            cnpj: res.data.cnpj,
            razao_social: res.data.razao_social || '',
            nome_fantasia: res.data.nome_fantasia || '',
            situacao: res.data.descricao_situacao_cadastral || 'ATIVA',
            abertura: res.data.data_inicio_atividade || '',
            porte: res.data.porte || '',
            setor: res.data.cnae_fiscal_descricao || '',
            email: res.data.email || '',
            source: 'receita'
        };
    } catch (err) {
        console.warn('Erro na Receita Federal:', err.message);
        return null;
    }
}

module.exports = { consultarReceita };