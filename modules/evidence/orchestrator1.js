// orchestrator.js - Orquestra fontes de dados REAIS
// CORRIGIDO: força busca cadastral mesmo com CNPJ da base local
// ============================================================

const { googleSearch } = require('./sources/googleSearch');
const { buscarReclameAqui } = require('./sources/reclameAqui');
const { consultarReceita } = require('./sources/receitaFederal');
const { buscarNoticias } = require('./sources/noticias');
const crypto = require('crypto');

// ============================================================
// BANCO DE DADOS LOCAL DE CNPJs FAMOSOS (MESMA PASTA)
// ============================================================
const CNPJS_FAMOSOS = require('./cnpjs_famosos.json');

const VERSAO_ORQUESTRADOR = '1.3.0';
const FONTES_UTILIZADAS = [
    'Google Search',
    'BrasilAPI',
    'Reclame Aqui',
    'Google News',
    'Processos Judiciais (STF/STJ/TST/TRFs/TRTs/CNJ/DataJud)',
    'Consumidor.gov',
    'Busca de CNPJ por nome',
    'Protestos (Centroprot)',
    'Banco local de CNPJs famosos'
];

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT_SOURCE')), ms)
        )
    ]);
}

function gerarQueries(nome, cnpj, cpf) {
    var nomeLimpo = nome || '';
    var cnpjLimpo = cnpj || '';
    var cpfLimpo = cpf || '';
    
    return {
        google: nomeLimpo + ' empresa Brasil avaliacao',
        news: nomeLimpo + ' noticias empresa Brasil recentes',
        site: '"' + nomeLimpo + '" site oficial | home | institucional',
        cnpjFinder: '"' + nomeLimpo + '" CNPJ',
        cpfFinder: '"' + nomeLimpo + '" CPF',
        judicial: [
            'site:stf.jus.br "' + nomeLimpo + '" processo',
            'site:stj.jus.br "' + nomeLimpo + '" processo',
            'site:tst.jus.br "' + nomeLimpo + '" processo',
            'site:trf1.jus.br "' + nomeLimpo + '" processo',
            'site:trf2.jus.br "' + nomeLimpo + '" processo',
            'site:trf3.jus.br "' + nomeLimpo + '" processo',
            'site:trf4.jus.br "' + nomeLimpo + '" processo',
            'site:trf5.jus.br "' + nomeLimpo + '" processo',
            'site:trt1.jus.br "' + nomeLimpo + '" processo',
            'site:trt2.jus.br "' + nomeLimpo + '" processo',
            'site:trt3.jus.br "' + nomeLimpo + '" processo',
            'site:trt4.jus.br "' + nomeLimpo + '" processo',
            'site:trt5.jus.br "' + nomeLimpo + '" processo',
            'site:trt6.jus.br "' + nomeLimpo + '" processo',
            'site:trt7.jus.br "' + nomeLimpo + '" processo',
            'site:trt8.jus.br "' + nomeLimpo + '" processo',
            'site:trt9.jus.br "' + nomeLimpo + '" processo',
            'site:trt10.jus.br "' + nomeLimpo + '" processo',
            'site:trt11.jus.br "' + nomeLimpo + '" processo',
            'site:trt12.jus.br "' + nomeLimpo + '" processo',
            'site:trt13.jus.br "' + nomeLimpo + '" processo',
            'site:trt14.jus.br "' + nomeLimpo + '" processo',
            'site:trt15.jus.br "' + nomeLimpo + '" processo',
            'site:trt16.jus.br "' + nomeLimpo + '" processo',
            'site:trt17.jus.br "' + nomeLimpo + '" processo',
            'site:trt18.jus.br "' + nomeLimpo + '" processo',
            'site:trt19.jus.br "' + nomeLimpo + '" processo',
            'site:trt20.jus.br "' + nomeLimpo + '" processo',
            'site:trt21.jus.br "' + nomeLimpo + '" processo',
            'site:trt22.jus.br "' + nomeLimpo + '" processo',
            'site:trt23.jus.br "' + nomeLimpo + '" processo',
            'site:trt24.jus.br "' + nomeLimpo + '" processo',
            'site:esaj.jus.br "' + nomeLimpo + '" processo',
            'site:cnj.jus.br "' + nomeLimpo + '" processo',
            'site:datajud.cnj.jus.br "' + nomeLimpo + '"',
            'site:jusbrasil.com.br "' + nomeLimpo + '" processo',
            '"' + nomeLimpo + '" processo judicial acao',
        ],
        reclameFallback: 'site:reclameaqui.com.br "' + nomeLimpo + '"',
        consumidorFallback: 'site:consumidor.gov.br "' + nomeLimpo + '"',
        protestos: '"' + nomeLimpo + '" protesto cartorio',
    };
}

function encontrarCNPJPorNome(nome, estado) {
    if (!nome || typeof nome !== 'string') return null;

    var nomeLower = nome.toLowerCase().trim();
    var estados = estado ? [estado] : Object.keys(CNPJS_FAMOSOS);

    for (var i = 0; i < estados.length; i++) {
        var uf = estados[i];
        var empresas = CNPJS_FAMOSOS[uf] || [];
        for (var j = 0; j < empresas.length; j++) {
            var empresa = empresas[j];
            if (empresa.cnpj === 'PESQUISAR') continue;
            var nomeEmpresa = empresa.nome.toLowerCase();
            if (nomeEmpresa.includes(nomeLower) || nomeLower.includes(nomeEmpresa)) {
                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual: empresa.faturamento_anual,
                    setor: empresa.setor,
                    estado: uf,
                    nome_encontrado: empresa.nome,
                    fonte: 'banco_local'
                };
            }
        }
    }
    return null;
}

async function buscarProtestos(queries) {
    var resultados = [];
    try {
        var results = await withTimeout(googleSearch(queries), 4000);
        if (results && results.length > 0) {
            results.forEach(function(item) {
                if (item.title && item.snippet) {
                    var texto = (item.title + ' ' + (item.snippet || '')).toLowerCase();
                    if (texto.includes('protesto') || texto.includes('cartorio') || texto.includes('cedula')) {
                        resultados.push({
                            titulo: 'Protesto - ' + item.title,
                            descricao: item.snippet || '',
                            url: item.link || '#',
                            fonte: 'Protestos (Centroprot/Cartorios)',
                            tipo: 'protesto'
                        });
                    }
                }
            });
        }
    } catch (err) {
        console.warn('Erro na busca de protestos:', err.message);
    }
    return resultados.slice(0, 10);
}

async function buscarProcessosJudiciais(queries) {
    var resultados = [];
    var queriesLimitadas = queries.slice(0, 20);
    
    for (var i = 0; i < queriesLimitadas.length; i++) {
        try {
            var result = await withTimeout(googleSearch(queriesLimitadas[i]), 3000);
            if (result && result.length > 0) {
                result.forEach(function(item) {
                    if (item.title && item.snippet) {
                        var tribunal = 'Processos Judiciais';
                        if (item.link) {
                            if (item.link.includes('stf.jus.br')) tribunal = 'STF';
                            else if (item.link.includes('stj.jus.br')) tribunal = 'STJ';
                            else if (item.link.includes('tst.jus.br')) tribunal = 'TST';
                            else if (item.link.includes('trf1.jus.br')) tribunal = 'TRF-1';
                            else if (item.link.includes('trf2.jus.br')) tribunal = 'TRF-2';
                            else if (item.link.includes('trf3.jus.br')) tribunal = 'TRF-3';
                            else if (item.link.includes('trf4.jus.br')) tribunal = 'TRF-4';
                            else if (item.link.includes('trf5.jus.br')) tribunal = 'TRF-5';
                            else if (item.link.includes('trt')) tribunal = 'TRT';
                            else if (item.link.includes('esaj.jus.br')) tribunal = 'TJ Estadual';
                            else if (item.link.includes('cnj.jus.br')) tribunal = 'CNJ';
                            else if (item.link.includes('datajud.cnj.jus.br')) tribunal = 'DataJud';
                            else if (item.link.includes('jusbrasil.com.br')) tribunal = 'JusBrasil';
                        }
                        resultados.push({
                            titulo: '[' + tribunal + '] ' + item.title,
                            descricao: item.snippet || '',
                            url: item.link || '#',
                            fonte: 'Processos Judiciais - ' + tribunal,
                            tipo: 'judicial',
                            tribunal: tribunal
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('Timeout na busca judicial:', err.message);
        }
    }
    
    var vistos = {};
    var unicos = [];
    for (var j = 0; j < resultados.length; j++) {
        var item = resultados[j];
        if (!vistos[item.url]) {
            vistos[item.url] = true;
            unicos.push(item);
        }
    }
    
    return unicos.slice(0, 15);
}

async function buscarCNPJPorNome(nome) {
    if (!nome) return null;
    try {
        var url = 'https://brasilapi.com.br/api/cnpj/v1/' + encodeURIComponent(nome);
        var response = await fetch(url);
        if (response.ok) {
            var data = await response.json();
            if (data && data.cnpj) {
                return { cnpj: data.cnpj, razao_social: data.razao_social, fonte: 'brasilapi_busca' };
            }
        }
    } catch (e) { /* silencioso */ }

    try {
        var results = await googleSearch('"' + nome + '" CNPJ');
        if (results && results.length > 0) {
            for (var i = 0; i < Math.min(results.length, 5); i++) {
                var snippet = results[i].snippet || '';
                var match = snippet.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
                if (match) {
                    return { cnpj: match[0].replace(/\D/g, ''), razao_social: nome, fonte: 'google_busca' };
                }
            }
        }
    } catch (e) { /* silencioso */ }
    return null;
}

async function buscarCPFPorNome(nome) {
    if (!nome) return null;
    try {
        var results = await googleSearch('"' + nome + '" CPF');
        if (results && results.length > 0) {
            for (var i = 0; i < Math.min(results.length, 5); i++) {
                var snippet = results[i].snippet || '';
                var match = snippet.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
                if (match) {
                    return { cpf: match[0].replace(/\D/g, ''), nome: nome, fonte: 'google_busca' };
                }
            }
        }
    } catch (e) { /* silencioso */ }
    return null;
}

async function buscarSiteOficial(nome) {
    if (!nome) return null;
    try {
        var query = '"' + nome + '" site oficial | home | institucional';
        var results = await withTimeout(googleSearch(query), 4000);
        if (results && results.length > 0) {
            var dominios = ['.com.br', '.com', '.org', '.net'];
            for (var i = 0; i < results.length; i++) {
                var link = results[i].link || '';
                if (link) {
                    try {
                        var url = new URL(link);
                        var host = url.hostname;
                        for (var j = 0; j < dominios.length; j++) {
                            if (host.includes(dominios[j])) {
                                return host;
                            }
                        }
                    } catch (e) { /* URL invalida */ }
                }
            }
            if (results[0].link) {
                try {
                    var url = new URL(results[0].link);
                    return url.hostname;
                } catch (e) { /* URL invalida */ }
            }
        }
    } catch (e) { /* silencioso */ }
    return null;
}

async function buscarReclameFallback(query) {
    try {
        var results = await withTimeout(googleSearch(query), 4000);
        if (results && results.length > 0) {
            return results.slice(0, 5).map(function(item) {
                return {
                    titulo: item.title || 'Reclamacao',
                    descricao: item.snippet || '',
                    url: item.link || '#',
                    fonte: 'Reclame Aqui (via Google)',
                    tipo: 'reclamacao'
                };
            });
        }
    } catch (err) { /* silencioso */ }
    return [];
}

async function buscarConsumidorFallback(query) {
    try {
        var results = await withTimeout(googleSearch(query), 4000);
        if (results && results.length > 0) {
            return results.slice(0, 5).map(function(item) {
                return {
                    titulo: item.title || 'Reclamacao',
                    descricao: item.snippet || '',
                    url: item.link || '#',
                    fonte: 'Consumidor.gov (via Google)',
                    tipo: 'reclamacao'
                };
            });
        }
    } catch (err) { /* silencioso */ }
    return [];
}

// ============================================================
// FUNÇÃO PRINCIPAL: COLETA EVIDÊNCIAS (com correção)
// ============================================================
async function coletarEvidenciasReais(nome, cnpj, cpf, estado) {
    var queries = gerarQueries(nome, cnpj, cpf);
    var inicio = Date.now();

    // ============================================================
    // 0. PRIORIDADE MÁXIMA: BANCO LOCAL DE CNPJs FAMOSOS
    // ============================================================
    var cnpjEncontrado = cnpj;
    var dadosCadastrais = null;
    var faturamentoDoBanco = null;
    var setorDoBanco = null;

    if (!cnpj && nome) {
        var resultadoLocal = encontrarCNPJPorNome(nome, estado);
        if (resultadoLocal && resultadoLocal.cnpj) {
            cnpjEncontrado = resultadoLocal.cnpj;
            faturamentoDoBanco = resultadoLocal.faturamento_anual;
            setorDoBanco = resultadoLocal.setor;
            console.log("CNPJ encontrado no banco local: " + resultadoLocal.cnpj + " (" + resultadoLocal.nome_encontrado + ")");
        }
    }

    // ============================================================
    // 1. BUSCA DE CNPJ POR NOME (se não tiver CNPJ e não achou no banco)
    // ============================================================
    if (!cnpjEncontrado && nome) {
        var cnpjInfo = await buscarCNPJPorNome(nome);
        if (cnpjInfo) {
            cnpjEncontrado = cnpjInfo.cnpj;
            dadosCadastrais = await consultarReceita(cnpjEncontrado);
            if (dadosCadastrais) {
                dadosCadastrais.fonte_cnpj = cnpjInfo.fonte;
            }
        }
    }

    // ============================================================
    // 2. FORÇA BUSCA CADASTRAL MESMO SE O CNPJ VEIO DA BASE LOCAL
    // ============================================================
    if (cnpjEncontrado && (!dadosCadastrais || dadosCadastrais.fonte_cnpj === 'banco_local')) {
        // Se já temos dados cadastrais mas eles vieram do banco local (incompletos), substitui pela BrasilAPI
        var dadosCadastraisCompletos = await consultarReceita(cnpjEncontrado);
        if (dadosCadastraisCompletos) {
            // Mantém o faturamento do banco local (que é mais preciso)
            if (faturamentoDoBanco) {
                dadosCadastraisCompletos.faturamento_anual = faturamentoDoBanco;
            }
            // Mantém o setor do banco local
            if (setorDoBanco) {
                dadosCadastraisCompletos.setor = setorDoBanco;
            }
            dadosCadastraisCompletos.fonte_cnpj = 'brasilapi_apos_banco';
            dadosCadastrais = dadosCadastraisCompletos;
        }
    }

    // Se ainda não temos dados cadastrais, tenta com o CNPJ encontrado
    if (!dadosCadastrais && cnpjEncontrado) {
        dadosCadastrais = await consultarReceita(cnpjEncontrado);
    }

    // ============================================================
    // 3. BUSCA DE CPF POR NOME (se não tiver CPF)
    // ============================================================
    var cpfEncontrado = cpf;
    if (!cpf && nome && !cnpjEncontrado) {
        var cpfInfo = await buscarCPFPorNome(nome);
        if (cpfInfo) {
            cpfEncontrado = cpfInfo.cpf;
        }
    }

    // ============================================================
    // 4. BUSCA DE SITE OFICIAL
    // ============================================================
    var nomeParaSite = nome;
    if (!nomeParaSite && dadosCadastrais && dadosCadastrais.razao_social) {
        nomeParaSite = dadosCadastrais.razao_social;
    }
    var siteOficial = await buscarSiteOficial(nomeParaSite || '');

    // ============================================================
    // 5. DEMAIS FONTES (PARALELAS)
    // ============================================================
    var resultados = await Promise.allSettled([
        withTimeout(googleSearch(queries.google), 4000),
        withTimeout(buscarReclameAqui(nome), 4000),
        withTimeout(buscarNoticias(queries.news), 4000),
        withTimeout(buscarProcessosJudiciais(queries.judicial), 8000),
        withTimeout(buscarReclameFallback(queries.reclameFallback), 4000),
        withTimeout(buscarConsumidorFallback(queries.consumidorFallback), 4000),
        withTimeout(buscarProtestos(queries.protestos), 4000),
    ]);

    var google = resultados[0].status === 'fulfilled' ? resultados[0].value : null;
    var reclameOficial = resultados[1].status === 'fulfilled' ? resultados[1].value : null;
    var noticias = resultados[2].status === 'fulfilled' ? resultados[2].value : null;
    var processos = resultados[3].status === 'fulfilled' ? resultados[3].value : null;
    var reclameFallback = resultados[4].status === 'fulfilled' ? resultados[4].value : null;
    var consumidorFallback = resultados[5].status === 'fulfilled' ? resultados[5].value : null;
    var protestos = resultados[6].status === 'fulfilled' ? resultados[6].value : null;

    var reclameData = null;
    if (reclameOficial && reclameOficial.length > 0) {
        reclameData = reclameOficial;
    } else if (reclameFallback && reclameFallback.length > 0) {
        reclameData = reclameFallback;
    }

    // ============================================================
    // 6. RASTREABILIDADE
    // ============================================================
    var rastreabilidade = {
        google_search: { sucesso: google !== null, itens: google ? google.length : 0 },
        reclame_aqui: { sucesso: reclameData !== null, itens: reclameData ? reclameData.length : 0 },
        noticias: { sucesso: noticias !== null, itens: noticias ? noticias.length : 0 },
        processos_judiciais: { 
            sucesso: processos !== null && processos.length > 0, 
            itens: processos ? processos.length : 0,
            tribunais_encontrados: processos ? (function() {
                var tribunais = {};
                for (var i = 0; i < processos.length; i++) {
                    var t = processos[i].tribunal || 'desconhecido';
                    tribunais[t] = true;
                }
                return Object.keys(tribunais);
            })() : []
        },
        consumidor_gov: { sucesso: consumidorFallback !== null && consumidorFallback.length > 0, itens: consumidorFallback ? consumidorFallback.length : 0 },
        protestos: { sucesso: protestos !== null && protestos.length > 0, itens: protestos ? protestos.length : 0 },
        site_oficial: { sucesso: siteOficial !== null, itens: siteOficial ? 1 : 0 },
        cnpj_por_nome: { sucesso: cnpjEncontrado !== cnpj, fonte: dadosCadastrais && dadosCadastrais.fonte_cnpj ? dadosCadastrais.fonte_cnpj : 'nao_buscado' },
        banco_local: { sucesso: faturamentoDoBanco !== null },
        receita_federal: { sucesso: dadosCadastrais !== null, itens: dadosCadastrais ? 1 : 0 }
    };

    // ============================================================
    // 7. DADOS BRUTOS (para o Gemini)
    // ============================================================
    var fontes = {
        google_search: google || [],
        reclame_aqui: reclameData || [],
        noticias: noticias || [],
        processos_judiciais: processos || [],
        consumidor_gov: consumidorFallback || [],
        protestos: protestos || [],
    };

    // ============================================================
    // 8. ADICIONA O SITE AO OBJETO DE DADOS CADASTRAIS
    // ============================================================
    if (siteOficial && dadosCadastrais) {
        dadosCadastrais.site = siteOficial;
    } else if (siteOficial && !dadosCadastrais) {
        dadosCadastrais = { site: siteOficial };
    }

    return {
        fontes: fontes,
        dados_cadastrais: dadosCadastrais || null,
        cnpj_encontrado: cnpjEncontrado || null,
        cpf_encontrado: cpfEncontrado || null,
        site_encontrado: siteOficial || null,
        rastreabilidade: rastreabilidade,
        fontes_utilizadas: FONTES_UTILIZADAS,
        versao_orquestrador: VERSAO_ORQUESTRADOR,
        _meta: {
            timestamp: new Date().toISOString(),
            tempo_total_ms: Date.now() - inicio,
            hash_bruto: crypto.createHash('sha256').update(JSON.stringify(fontes)).digest('hex')
        }
    };
}

module.exports = { coletarEvidenciasReais };