const axios = require('axios');

async function consultarReceita(cnpj) {
    if (!cnpj) return null;

    // ========================================================
    // LIMPEZA DO CNPJ
    // ========================================================

    var clean = String(cnpj)
        .replace(/\D/g, '')
        .trim();

    if (clean.length !== 14) {
        console.warn(
            '⚠️ CNPJ inválido para consulta:',
            clean
        );

        return null;
    }

    console.log(
        '🔍 Consultando Receita para CNPJ:',
        clean
    );

    // ========================================================
    // 1. BRASILAPI
    //
    // Esta é a primeira fonte de consulta cadastral.
    // ========================================================

    try {
        console.log(
            '🔍 Consultando BrasilAPI para CNPJ:',
            clean
        );

        var res =
            await axios.get(
                'https://brasilapi.com.br/api/cnpj/v1/' +
                clean,
                {
                    timeout: 8000,

                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

                        'Accept':
                            'application/json'
                    }
                }
            );

        if (
            res.data &&
            !res.data.error
        ) {
            console.log(
                '✅ BrasilAPI retornou dados para CNPJ:',
                clean
            );

            return {
                cnpj:
                    res.data.cnpj,

                razao_social:
                    res.data.razao_social || '',

                nome_fantasia:
                    res.data.nome_fantasia || '',

                situacao:
                    res.data.descricao_situacao_cadastral ||
                    'ATIVA',

                data_abertura:
                    res.data.data_inicio_atividade ||
                    res.data.abertura ||
                    '',

                porte:
                    res.data.porte || '',

                setor:
                    res.data.cnae_fiscal_descricao ||
                    '',

                email:
                    res.data.email || '',

                site:
                    res.data.site || '',

                uf:
                    res.data.uf || '',

                municipio:
                    res.data.municipio || '',

                fonte:
                    'brasilapi',

                source:
                    'brasilapi'
            };
        }

        console.warn(
            '⚠️ BrasilAPI não retornou dados válidos para CNPJ:',
            clean
        );

    } catch (err) {
        if (err.response) {
            console.warn(
                'BrasilAPI error status:',
                err.response.status
            );

            console.warn(
                'BrasilAPI error data:',
                JSON.stringify(
                    err.response.data
                )
            );

        } else {
            console.warn(
                'BrasilAPI error:',
                err.message
            );
        }
    }

    // ========================================================
    // 2. RECEITAWS
    //
    // FALLBACK DA BRASILAPI.
    //
    // Não é o fallback do CSV.
    // O CSV é controlado pelo orchestrator.
    // ========================================================

    console.warn(
        '⚠️ BrasilAPI falhou. Tentando ReceitaWS...'
    );

    try {
        console.log(
            '🔍 Consultando ReceitaWS para CNPJ:',
            clean
        );

        var receita =
            await axios.get(
                'https://www.receitaws.com.br/v1/cnpj/' +
                clean,
                {
                    timeout: 8000,

                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

                        'Accept':
                            'application/json'
                    }
                }
            );

        if (
            receita.data &&
            receita.data.status !== 'ERROR' &&
            !receita.data.error
        ) {
            console.log(
                '✅ ReceitaWS retornou dados para CNPJ:',
                clean
            );

            return {
                cnpj:
                    clean,

                razao_social:
                    receita.data.nome ||
                    receita.data.razao_social ||
                    '',

                nome_fantasia:
                    receita.data.fantasia ||
                    receita.data.nome_fantasia ||
                    '',

                situacao:
                    receita.data.situacao ||
                    'ATIVA',

                data_abertura:
                    receita.data.abertura ||
                    '',

                porte:
                    receita.data.porte ||
                    '',

                setor:
                    receita.data.atividade_principal &&
                    receita.data.atividade_principal.length > 0
                        ? receita.data.atividade_principal[0].text
                        : '',

                email:
                    receita.data.email ||
                    '',

                site:
                    receita.data.site ||
                    '',

                uf:
                    receita.data.uf ||
                    '',

                municipio:
                    receita.data.municipio ||
                    '',

                fonte:
                    'receitaws',

                source:
                    'receitaws'
            };
        }

        console.warn(
            '⚠️ ReceitaWS não retornou dados válidos para CNPJ:',
            clean
        );

    } catch (err) {
        if (err.response) {
            console.warn(
                'ReceitaWS error status:',
                err.response.status
            );

            console.warn(
                'ReceitaWS error data:',
                JSON.stringify(
                    err.response.data
                )
            );

        } else {
            console.warn(
                'ReceitaWS error:',
                err.message
            );
        }
    }

    // ========================================================
    // 3. NENHUMA API RETORNOU
    //
    // O orchestrator recebe null e então ativa o CSV
    // do Google Cloud Storage.
    // ========================================================

    console.warn(
        '⚠️ BrasilAPI e ReceitaWS falharam para CNPJ:',
        clean
    );

    return null;
}

module.exports = {
    consultarReceita
};