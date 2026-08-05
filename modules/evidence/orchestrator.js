// ============================================================
// orchestrator.js - Orquestra fontes de dados REAIS para a VERI
// VERSÃO DEFINITIVA 4.0.11 - CORREÇÃO DE SINTAXE
// CORRIGIDO: DEMAIS substituído por GIGANTE
// ============================================================

const { googleSearch } = require('./sources/googleSearch');
const { buscarReclameAqui } = require('./sources/reclameAqui');
const { consultarReceita } = require('./sources/receitaFederal');
const { buscarNoticias } = require('./sources/noticias');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function normalizarDocumento(doc) {
    if (!doc) return '';
    return doc.replace(/\D/g, '');
}

async function carregarHistorico() {
    return null;
}

async function salvarNoHistorico(cnpj, dados) {
    return null;
}

let CNPJS_FAMOSOS = {};
try {
    CNPJS_FAMOSOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'cnpjs_famosos.json'), 'utf8'));
    console.log('📦 CNPJS_FAMOSOS carregado. UFs: ' + Object.keys(CNPJS_FAMOSOS).length);
} catch (e) {
    console.warn('⚠️ cnpjs_famosos.json não encontrado ou inválido. Banco local desativado.');
}

const VERSAO_ORQUESTRADOR = '4.0.11';
const FONTES_UTILIZADAS = [
    'Google Search',
    'BrasilAPI',
    'Reclame Aqui',
    'Google News',
    'Processos Judiciais Focados (STF/STJ/TRF Regional/TJ Estadual)',
    'Consumidor.gov',
    'Busca de CNPJ por nome',
    'Protestos (Centroprot)',
    'Banco local de CNPJs famosos'
];

const TIMEOUTS = {
    GOOGLE_SEARCH: 2000,
    NOTICIAS: 2000,
    RECLAME_AQUI: 2000,
    CONSUMIDOR_GOV: 2000,
    PROCESSOS_JUDICIAIS: 3000,
    PROTESTOS: 2000,
    SITE_OFICIAL: 2000,
    CNPJ_BRASILAPI: 3000,
    CNPJ_GOOGLE: 2000
};

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise(function(_, reject) {
            setTimeout(function() {
                reject(new Error('TIMEOUT_SOURCE'));
            }, ms);
        })
    ]);
}

function criarAbortController(ms) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() {
        controller.abort();
    }, ms);
    return { signal: controller.signal, timeoutId: timeoutId };
}

function obterTRFPorUF(uf) {
    if (!uf) return 'trf1.jus.br';
    var ufUpper = uf.toUpperCase().trim();

    var mapeamento = {
        'AC': 'trf1.jus.br', 'AM': 'trf1.jus.br', 'AP': 'trf1.jus.br',
        'BA': 'trf1.jus.br', 'DF': 'trf1.jus.br', 'GO': 'trf1.jus.br',
        'MA': 'trf1.jus.br', 'MT': 'trf1.jus.br', 'PA': 'trf1.jus.br',
        'PI': 'trf1.jus.br', 'RO': 'trf1.jus.br', 'RR': 'trf1.jus.br',
        'TO': 'trf1.jus.br',
        'RJ': 'trf2.jus.br', 'ES': 'trf2.jus.br',
        'SP': 'trf3.jus.br', 'MS': 'trf3.jus.br',
        'PR': 'trf4.jus.br', 'RS': 'trf4.jus.br', 'SC': 'trf4.jus.br',
        'AL': 'trf5.jus.br', 'CE': 'trf5.jus.br', 'PB': 'trf5.jus.br',
        'PE': 'trf5.jus.br', 'RN': 'trf5.jus.br', 'SE': 'trf5.jus.br',
        'MG': 'trf6.jus.br'
    };

    return mapeamento[ufUpper] || 'trf1.jus.br';
}

function gerarQueries(nome, cnpj, cpf, uf, porte) {
    var nomeLimpo = nome || '';
    var ufLower = uf ? uf.toLowerCase().trim() : '';
    var trfDominio = obterTRFPorUF(uf);

    var portesPequenos = ['MEI', 'ME', 'EPP'];
    var porteAnalisado = porte ? porte.toUpperCase().trim() : '';
    var isPequeno = portesPequenos.indexOf(porteAnalisado) !== -1;
    var isPF = !cnpj && cpf;

    var judicialFocado = [];

    judicialFocado.push('site:' + trfDominio + ' "' + nomeLimpo + '" processo');

    if (ufLower) {
        judicialFocado.push('site:tj' + ufLower + '.jus.br "' + nomeLimpo + '" processo');
    } else {
        judicialFocado.push('site:tj.jus.br "' + nomeLimpo + '" processo');
    }

    if (!isPequeno && !isPF) {
        judicialFocado.push('site:stf.jus.br "' + nomeLimpo + '" processo');
        judicialFocado.push('site:stj.jus.br "' + nomeLimpo + '" processo');
    }

    if (process.env.CNJ_API_KEY) {
        judicialFocado.push('site:cnj.jus.br "' + nomeLimpo + '" processo');
        judicialFocado.push('site:datajud.cnj.jus.br "' + nomeLimpo + '"');
    }

    return {
        google: nomeLimpo + ' empresa Brasil avaliacao',
        news: nomeLimpo + ' noticias empresa Brasil recentes',
        site: '"' + nomeLimpo + '" site oficial | home | institucional',
        cnpjFinder: '"' + nomeLimpo + '" CNPJ',
        cpfFinder: '"' + nomeLimpo + '" CPF',
        judicial: judicialFocado,
        reclameFallback: 'site:reclameaqui.com.br "' + nomeLimpo + '"',
        consumidorFallback: 'site:consumidor.gov.br "' + nomeLimpo + '"',
        protestos: '"' + nomeLimpo + '" protesto cartorio',
    };
}

function encontrarCNPJPorNome(nome, uf) {
    if (!nome || typeof nome !== 'string') return null;
    if (Object.keys(CNPJS_FAMOSOS).length === 0) return null;

    var nomeBusca = nome.toLowerCase().trim();
    nomeBusca = nomeBusca.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var estados = uf ? [uf] : Object.keys(CNPJS_FAMOSOS);

    for (var i = 0; i < estados.length; i++) {
        var ufKey = estados[i];
        var empresas = CNPJS_FAMOSOS[ufKey] || [];
        for (var j = 0; j < empresas.length; j++) {
            var empresa = empresas[j];
            if (empresa.cnpj === 'PESQUISAR') continue;
            var nomeEmpresa = empresa.nome.toLowerCase().trim();
            nomeEmpresa = nomeEmpresa.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (nomeEmpresa.indexOf(nomeBusca) !== -1 || nomeBusca.indexOf(nomeEmpresa) !== -1) {
                console.log('✅ Encontrado no banco local: ' + empresa.nome + ' CNPJ: ' + empresa.cnpj + ' UF: ' + ufKey);
                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual: empresa.faturamento_anual,
                    setor: empresa.setor,
                    uf: ufKey,
                    nome_encontrado: empresa.nome,
                    fonte: 'banco_local'
                };
            }
        }
    }
    console.log('⚠️ Nome nao encontrado no banco local: ' + nome);
    return null;
}

async function buscarCNPJPorNome(nome) {
    if (!nome) return null;

    try {
        var results = await buscarGoogleComAbort('"' + nome + '" CNPJ', TIMEOUTS.CNPJ_GOOGLE);
        if (results && results.length > 0) {
            for (var i = 0; i < Math.min(results.length, 5); i++) {
                var snippet = results[i].snippet || '';
                var match = snippet.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
                if (match) {
                    console.log('🔍 CNPJ encontrado via Google: ' + match[0]);
                    return {
                        cnpj: match[0].replace(/\D/g, ''),
                        razao_social: nome,
                        fonte: 'google_busca',
                        uf: ''
                    };
                }
            }
        }
    } catch (e) {
        console.warn('Busca por CNPJ no Google falhou: ' + e.message);
    }

    return null;
}

async function buscarCPFPorNome(nome) {
    if (!nome) return null;
    try {
        var results = await buscarGoogleComAbort('"' + nome + '" CPF', TIMEOUTS.GOOGLE_SEARCH);
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

async function buscarGoogleComAbort(query, timeoutMs) {
    var abort = criarAbortController(timeoutMs || TIMEOUTS.GOOGLE_SEARCH);
    try {
        var result = await withTimeout(
            googleSearch(query, { signal: abort.signal }),
            timeoutMs || TIMEOUTS.GOOGLE_SEARCH
        );
        clearTimeout(abort.timeoutId);
        return result || [];
    } catch (err) {
        clearTimeout(abort.timeoutId);
        return [];
    }
}

async function buscarProtestos(queries) {
    var resultados = [];
    try {
        var results = await buscarGoogleComAbort(queries, TIMEOUTS.PROTESTOS);
        if (results && results.length > 0) {
            results.forEach(function(item) {
                if (item.title && item.snippet) {
                    var texto = (item.title + ' ' + (item.snippet || '')).toLowerCase();
                    if (texto.indexOf('protesto') !== -1 || texto.indexOf('cartorio') !== -1 || texto.indexOf('cedula') !== -1) {
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
        console.warn('Erro na busca de protestos: ' + err.message);
    }
    return resultados.slice(0, 10);
}

function identificarTribunal(link) {
    if (!link) return 'Processos Judiciais';
    if (link.indexOf('stf.jus.br') !== -1) return 'STF';
    if (link.indexOf('stj.jus.br') !== -1) return 'STJ';
    if (link.indexOf('tst.jus.br') !== -1) return 'TST';
    if (link.indexOf('trf1.jus.br') !== -1) return 'TRF-1';
    if (link.indexOf('trf2.jus.br') !== -1) return 'TRF-2';
    if (link.indexOf('trf3.jus.br') !== -1) return 'TRF-3';
    if (link.indexOf('trf4.jus.br') !== -1) return 'TRF-4';
    if (link.indexOf('trf5.jus.br') !== -1) return 'TRF-5';
    if (link.indexOf('trf6.jus.br') !== -1) return 'TRF-6';
    if (link.indexOf('trt') !== -1) return 'TRT';
    if (link.indexOf('esaj.jus.br') !== -1) return 'TJ Estadual';
    if (link.indexOf('cnj.jus.br') !== -1) return 'CNJ';
    if (link.indexOf('datajud.cnj.jus.br') !== -1) return 'DataJud';
    if (link.indexOf('jusbrasil.com.br') !== -1) return 'JusBrasil';
    if (link.indexOf('tj') !== -1) return 'TJ Estadual';
    return 'Processos Judiciais';
}

async function buscarProcessosJudiciaisOtimizados(queriesJudiciais, nome) {
    var resultados = [];

    if (!queriesJudiciais || queriesJudiciais.length === 0) {
        return [];
    }

    var buscas = queriesJudiciais.map(function(q) {
        return buscarGoogleComAbort(q, TIMEOUTS.PROCESSOS_JUDICIAIS);
    });

    var arraysDeResultados = await Promise.all(buscas);

    arraysDeResultados.forEach(function(result) {
        if (result && result.length > 0) {
            result.forEach(function(item) {
                if (item.title && item.snippet) {
                    var tribunal = identificarTribunal(item.link);
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
    });

    if (resultados.length === 0 && nome) {
        try {
            var fallbackQueries = [
                'site:jusbrasil.com.br "' + nome + '" processo',
                'site:cnj.jus.br "' + nome + '" processo'
            ];
            var fallbackBuscas = fallbackQueries.map(function(q) {
                return buscarGoogleComAbort(q, TIMEOUTS.PROCESSOS_JUDICIAIS);
            });
            var fallbackResultados = await Promise.all(fallbackBuscas);

            fallbackResultados.forEach(function(result) {
                if (result && result.length > 0) {
                    result.forEach(function(item) {
                        if (item.title && item.snippet) {
                            var tribunal = identificarTribunal(item.link);
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
            });
        } catch (err) {
            console.warn('Fallback JusBrasil/CNJ falhou: ' + err.message);
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

async function buscarSiteOficial(nome) {
    if (!nome) return null;
    var siteEncontrado = null;
    
    try {
        var query = '"' + nome + '" site oficial | home | institucional';
        var results = await buscarGoogleComAbort(query, TIMEOUTS.SITE_OFICIAL);
        if (results && results.length > 0) {
            var dominios = ['.com.br', '.com', '.org', '.net'];
            for (var i = 0; i < results.length; i++) {
                var link = results[i].link || '';
                if (link) {
                    try {
                        var url = new URL(link);
                        var host = url.hostname;
                        for (var j = 0; j < dominios.length; j++) {
                            if (host.indexOf(dominios[j]) !== -1) {
                                siteEncontrado = host;
                                console.log('✅ Site encontrado via Google: ' + siteEncontrado);
                                return siteEncontrado;
                            }
                        }
                    } catch (e) { /* URL invalida */ }
                }
            }
            if (results[0].link) {
                try {
                    var url = new URL(results[0].link);
                    siteEncontrado = url.hostname;
                    console.log('✅ Site encontrado via Google (fallback): ' + siteEncontrado);
                    return siteEncontrado;
                } catch (e) { /* URL invalida */ }
            }
        }
    } catch (e) {
        console.warn('⚠️ Busca por site via Google falhou: ' + e.message);
    }

    if (!siteEncontrado) {
        var nomeLimpo = nome.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        var dominiosFallback = ['.com.br', '.com', '.org', '.net'];
        for (var k = 0; k < dominiosFallback.length; k++) {
            var siteCandidato = 'www.' + nomeLimpo + dominiosFallback[k];
            console.log('🔍 Site sugerido (fallback): ' + siteCandidato);
            return siteCandidato;
        }
    }

    console.log('❌ Site nao encontrado para: ' + nome);
    return null;
}

async function buscarReclameFallback(query) {
    try {
        var results = await buscarGoogleComAbort(query, TIMEOUTS.RECLAME_AQUI);
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
        var results = await buscarGoogleComAbort(query, TIMEOUTS.CONSUMIDOR_GOV);
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

async function obterDadosReclameAqui(nome, queryFallback) {
    if (!process.env.RECLAME_AQUI_API_KEY) {
        return await buscarReclameFallback(queryFallback);
    }

    var abort = criarAbortController(TIMEOUTS.RECLAME_AQUI);
    try {
        var oficial = await withTimeout(
            buscarReclameAqui(nome, { signal: abort.signal }),
            TIMEOUTS.RECLAME_AQUI
        );
        clearTimeout(abort.timeoutId);

        if (oficial && (oficial.total > 0 || (oficial.length && oficial.length > 0))) {
            return oficial;
        }
    } catch (err) {
        clearTimeout(abort.timeoutId);
        console.warn("Reclame Aqui oficial falhou. Indo para fallback.");
    }

    return await buscarReclameFallback(queryFallback);
}

async function obterDadosConsumidorGov(nome, queryFallback) {
    if (!process.env.CONSUMIDOR_GOV_API_KEY) {
        return await buscarConsumidorFallback(queryFallback);
    }

    var abort = criarAbortController(TIMEOUTS.CONSUMIDOR_GOV);
    try {
        var response = await fetch("https://api.consumidor.gov.br/v1/empresas?nome=" + encodeURIComponent(nome), {
            headers: { "Authorization": "Bearer " + process.env.CONSUMIDOR_GOV_API_KEY },
            signal: abort.signal
        });
        clearTimeout(abort.timeoutId);

        if (response.ok) {
            var data = await response.json();
            return data;
        }
    } catch (err) {
        clearTimeout(abort.timeoutId);
        console.warn("API oficial Consumidor.gov falhou.");
    }

    return await buscarConsumidorFallback(queryFallback);
}

async function executarBuscas(queries, nome) {
    const TEMPO_MAXIMO = 45000;
    const inicio = Date.now();
    
    let google = [];
    let noticias = [];
    let processos = null;
    let reclameData = null;
    let consumidorData = null;
    let protestos = null;
    
    try {
        google = await withTimeout(buscarGoogleComAbort(queries.google, TIMEOUTS.GOOGLE_SEARCH), 3000);
        if (google && google.length > 0) {
            console.log('✅ Google Search retornou', google.length, 'resultados.');
        }
    } catch (e) {
        console.warn('⏳ Google Search timeout');
        google = [];
    }
    
    try {
        noticias = await withTimeout(buscarGoogleComAbort(queries.news, TIMEOUTS.NOTICIAS), 3000);
        if (noticias && noticias.length > 0) {
            console.log('✅ Google News retornou', noticias.length, 'resultados.');
        }
    } catch (e) {
        console.warn('⏳ Google News timeout');
        noticias = [];
    }
    
    const totalEvidencias = (google ? google.length : 0) + (noticias ? noticias.length : 0);
    if (totalEvidencias >= 3) {
        console.log('✅ Já temos 3+ evidências. Entregando sem esperar as demais fontes...');
        return { google, noticias, processos, reclameData, consumidorData, protestos };
    }
    
    if (Date.now() - inicio > TEMPO_MAXIMO) {
        console.log('⏳ Tempo máximo atingido. Entregando o que tem...');
        return { google, noticias, processos, reclameData, consumidorData, protestos };
    }
    
    const complementares = await Promise.race([
        Promise.allSettled([
            withTimeout(buscarProcessosJudiciaisOtimizados(queries.judicial, nome), TIMEOUTS.PROCESSOS_JUDICIAIS),
            withTimeout(obterDadosReclameAqui(nome, queries.reclameFallback), TIMEOUTS.RECLAME_AQUI),
            withTimeout(obterDadosConsumidorGov(nome, queries.consumidorFallback), TIMEOUTS.CONSUMIDOR_GOV),
            withTimeout(buscarProtestos(queries.protestos), TIMEOUTS.PROTESTOS),
        ]),
        new Promise(function(_, reject) {
            setTimeout(function() {
                reject(new Error('TIMEOUT_COMPLEMENTARES'));
            }, 15000);
        })
    ]).catch(function() {
        return [
            { status: 'fulfilled', value: null },
            { status: 'fulfilled', value: null },
            { status: 'fulfilled', value: null },
            { status: 'fulfilled', value: null }
        ];
    });
    
    processos = (complementares[0] && complementares[0].status === 'fulfilled') ? complementares[0].value : null;
    reclameData = (complementares[1] && complementares[1].status === 'fulfilled') ? complementares[1].value : null;
    consumidorData = (complementares[2] && complementares[2].status === 'fulfilled') ? complementares[2].value : null;
    protestos = (complementares[3] && complementares[3].status === 'fulfilled') ? complementares[3].value : null;
    
    if (processos && processos.length > 0) console.log('✅ Processos retornou', processos.length, 'resultados.');
    if (reclameData && reclameData.length > 0) console.log('✅ Reclame Aqui retornou', reclameData.length, 'resultados.');
    
    console.log('📤 Entregando resultados (tempo:', Date.now() - inicio, 'ms)');
    return { google, noticias, processos, reclameData, consumidorData, protestos };
}

async function buscarCNPJnaBrasilAPI(cnpj, tentativa) {
    var tentativaAtual = tentativa || 1;
    var maxTentativas = 2;
    var cnpjLimpo = normalizarDocumento(cnpj);
    
    await new Promise(resolve => setTimeout(resolve, 300 * tentativaAtual));
    
    console.log('🔍 Buscando BrasilAPI para CNPJ: ' + cnpjLimpo + ' (tentativa ' + tentativaAtual + '/' + maxTentativas + ')');
    try {
        const url = "https://brasilapi.com.br/api/cnpj/v1/" + cnpjLimpo;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn('⚠️ BrasilAPI retornou status: ' + response.status);
            if (response.status === 429 && tentativaAtual < maxTentativas) {
                console.log('⏳ BrasilAPI com 429, tentando novamente...');
                return await buscarCNPJnaBrasilAPI(cnpj, tentativaAtual + 1);
            }
            return null;
        }
        const data = await response.json();
        if (data && !data.error) {
            console.log('✅ BrasilAPI retornou dados para CNPJ: ' + cnpjLimpo);
            return {
                cnpj: data.cnpj,
                razao_social: data.razao_social || "",
                nome_fantasia: data.nome_fantasia || "",
                porte: data.porte || "",
                data_abertura: data.data_inicio_atividade || data.abertura || "",
                situacao: data.descricao_situacao_cadastral || "ATIVA",
                setor: data.cnae_fiscal_descricao || "",
                email: data.email || "",
                site: data.site || "",
                uf: data.uf || "",
                municipio: data.municipio || ""
            };
        }
    } catch (err) {
        console.warn('⚠️ Erro na BrasilAPI: ' + err.message);
        if (tentativaAtual < maxTentativas) {
            console.log('⏳ BrasilAPI com erro, tentando novamente...');
            return await buscarCNPJnaBrasilAPI(cnpj, tentativaAtual + 1);
        }
    }
    return null;
}

async function buscarCNPJnaReceitaWS(cnpj) {
    var cnpjLimpo = normalizarDocumento(cnpj);
    console.log('🔍 Buscando ReceitaWS para CNPJ: ' + cnpjLimpo);
    try {
        const url = "https://www.receitaws.com.br/v1/cnpj/" + cnpjLimpo;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn('⚠️ ReceitaWS retornou status: ' + response.status);
            return null;
        }
        const data = await response.json();
        if (data && data.status !== "ERROR" && !data.error) {
            console.log('✅ ReceitaWS retornou dados para CNPJ: ' + cnpjLimpo);
            return {
                cnpj: cnpjLimpo,
                razao_social: data.nome || data.razao_social || "",
                nome_fantasia: data.fantasia || data.nome_fantasia || "",
                porte: data.porte || "",
                data_abertura: data.abertura || "",
                situacao: data.situacao || "ATIVA",
                setor: data.atividade_principal ? data.atividade_principal[0].text : "",
                email: data.email || "",
                site: data.site || "",
                uf: data.uf || "",
                municipio: data.municipio || ""
            };
        }
    } catch (err) {
        console.warn('⚠️ Erro na ReceitaWS: ' + err.message);
    }
    return null;
}

async function cadeiaDeBuscaCNPJ(limpo) {
    var cnpjNormalizado = normalizarDocumento(limpo);
    console.log('🔍 Iniciando cadeia de busca para CNPJ: ' + cnpjNormalizado);
    
    var brasil = await buscarCNPJnaBrasilAPI(cnpjNormalizado);
    if (brasil) {
        try { await carregarHistorico(); await salvarNoHistorico(cnpjNormalizado, brasil); } catch(e) {}
        return { ...brasil, fonte: "brasilapi" };
    }
    
    console.warn('⚠️ BrasilAPI falhou, tentando ReceitaWS...');
    var receita = await buscarCNPJnaReceitaWS(cnpjNormalizado);
    if (receita) {
        try { await carregarHistorico(); await salvarNoHistorico(cnpjNormalizado, receita); } catch(e) {}
        return { ...receita, fonte: "receitaws" };
    }
    
    console.warn('⚠️ Todas as APIs falharam para CNPJ: ' + cnpjNormalizado);
    return null;
}

async function coletarEvidenciasReais(nome, cnpj, cpf, uf, modulo, subModulo) {
    var inicio = Date.now();

    var cnpjEncontrado = cnpj;
    var dadosCadastrais = null;
    var faturamentoDoBanco = null;
    var setorDoBanco = null;
    var porteEncontrado = null;
    var ufEncontrada = uf || null;

    if (!ufEncontrada && !cnpj && nome) {
        var resultadoLocal = encontrarCNPJPorNome(nome, uf);
        if (resultadoLocal && resultadoLocal.cnpj) {
            cnpjEncontrado = resultadoLocal.cnpj;
            faturamentoDoBanco = resultadoLocal.faturamento_anual;
            setorDoBanco = resultadoLocal.setor;
            porteEncontrado = resultadoLocal.porte || 'MEDIO';
            ufEncontrada = resultadoLocal.uf || uf;
            console.log("CNPJ encontrado no banco local: " + resultadoLocal.cnpj + " (" + resultadoLocal.nome_encontrado + ") - UF: " + ufEncontrada);
        }
    }

    if (!ufEncontrada && !cnpj && nome) {
        var resultadoLocal = encontrarCNPJPorNome(nome, null);
        if (resultadoLocal && resultadoLocal.cnpj) {
            cnpjEncontrado = resultadoLocal.cnpj;
            faturamentoDoBanco = resultadoLocal.faturamento_anual;
            setorDoBanco = resultadoLocal.setor;
            porteEncontrado = resultadoLocal.porte || 'MEDIO';
            ufEncontrada = resultadoLocal.uf || uf;
            console.log("CNPJ encontrado no banco local (fallback): " + resultadoLocal.cnpj + " - UF: " + ufEncontrada);
        }
    }

    if (!cnpjEncontrado && nome) {
        var cnpjInfo = await buscarCNPJPorNome(nome);
        if (cnpjInfo) {
            cnpjEncontrado = cnpjInfo.cnpj;
            ufEncontrada = cnpjInfo.uf || ufEncontrada;
            dadosCadastrais = await consultarReceita(cnpjEncontrado);
            if (dadosCadastrais) {
                dadosCadastrais.fonte_cnpj = cnpjInfo.fonte;
                porteEncontrado = dadosCadastrais.porte || 'MEDIO';
                ufEncontrada = dadosCadastrais.uf || ufEncontrada;
            }
        }
    }

    if (cnpjEncontrado && (!dadosCadastrais || (dadosCadastrais && dadosCadastrais.fonte_cnpj === 'banco_local'))) {
        var dadosCadastraisCompletos = await consultarReceita(cnpjEncontrado);
        if (dadosCadastraisCompletos) {
            if (faturamentoDoBanco) {
                dadosCadastraisCompletos.faturamento_anual = faturamentoDoBanco;
            }
            if (setorDoBanco) {
                dadosCadastraisCompletos.setor = setorDoBanco;
            }
            dadosCadastraisCompletos.fonte_cnpj = 'brasilapi_apos_banco';
            dadosCadastrais = dadosCadastraisCompletos;
            porteEncontrado = dadosCadastrais.porte || 'MEDIO';
            ufEncontrada = dadosCadastrais.uf || ufEncontrada;
            console.log('✅ BrasilAPI retornou dados para CNPJ: ' + cnpjEncontrado + ' porte: ' + porteEncontrado + ' abertura: ' + dadosCadastrais.data_abertura);
        }
    }

    if (!dadosCadastrais && cnpjEncontrado) {
        dadosCadastrais = await consultarReceita(cnpjEncontrado);
        if (dadosCadastrais) {
            porteEncontrado = dadosCadastrais.porte || 'MEDIO';
            ufEncontrada = dadosCadastrais.uf || ufEncontrada;
            console.log('✅ BrasilAPI (fallback) retornou dados: porte: ' + porteEncontrado);
        }
    }

    var cpfEncontrado = cpf;
    if (!cpf && nome && !cnpjEncontrado) {
        var cpfInfo = await buscarCPFPorNome(nome);
        if (cpfInfo) {
            cpfEncontrado = cpfInfo.cpf;
        }
    }

    var porteParaBusca = porteEncontrado || 'MEDIO';
    var queries = gerarQueries(nome, cnpjEncontrado, cpfEncontrado, ufEncontrada, porteParaBusca);

    var siteOficial = await buscarSiteOficial(nome || (dadosCadastrais && dadosCadastrais.razao_social) || '');
    console.log('🔍 Site encontrado: ' + siteOficial);

    var resultados = await executarBuscas(queries, nome);

    var rastreabilidade = {
        google_search: { sucesso: resultados.google !== null && resultados.google.length > 0, itens: resultados.google ? resultados.google.length : 0 },
        reclame_aqui: { sucesso: resultados.reclameData !== null && resultados.reclameData.length > 0, itens: resultados.reclameData ? resultados.reclameData.length : 0 },
        noticias: { sucesso: resultados.noticias !== null && resultados.noticias.length > 0, itens: resultados.noticias ? resultados.noticias.length : 0 },
        processos_judiciais: {
            sucesso: resultados.processos !== null && resultados.processos.length > 0,
            itens: resultados.processos ? resultados.processos.length : 0,
            tribunais_encontrados: resultados.processos ? (function() {
                var tribunais = {};
                for (var i = 0; i < resultados.processos.length; i++) {
                    var t = resultados.processos[i].tribunal || 'desconhecido';
                    tribunais[t] = true;
                }
                return Object.keys(tribunais);
            })() : []
        },
        consumidor_gov: { sucesso: resultados.consumidorData !== null && resultados.consumidorData.length > 0, itens: resultados.consumidorData ? resultados.consumidorData.length : 0 },
        protestos: { sucesso: resultados.protestos !== null && resultados.protestos.length > 0, itens: resultados.protestos ? resultados.protestos.length : 0 },
        site_oficial: { sucesso: siteOficial !== null, itens: siteOficial ? 1 : 0 },
        cnpj_por_nome: { sucesso: cnpjEncontrado !== cnpj, fonte: dadosCadastrais && dadosCadastrais.fonte_cnpj ? dadosCadastrais.fonte_cnpj : 'nao_buscado' },
        banco_local: { sucesso: faturamentoDoBanco !== null },
        receita_federal: { sucesso: dadosCadastrais !== null, itens: dadosCadastrais ? 1 : 0 }
    };

    var fontes = {
        google_search: resultados.google || [],
        reclame_aqui: resultados.reclameData || [],
        noticias: resultados.noticias || [],
        processos_judiciais: resultados.processos || [],
        consumidor_gov: resultados.consumidorData || [],
        protestos: resultados.protestos || [],
    };

    if (siteOficial && dadosCadastrais) {
        dadosCadastrais.site = siteOficial;
    } else if (siteOficial && !dadosCadastrais) {
        dadosCadastrais = { site: siteOficial };
    }

    if (dadosCadastrais && ufEncontrada && !dadosCadastrais.uf) {
        dadosCadastrais.uf = ufEncontrada;
    }

    var resultado = {
        fontes: fontes,
        dados_cadastrais: dadosCadastrais || null,
        cnpj_encontrado: cnpjEncontrado || null,
        cpf_encontrado: cpfEncontrado || null,
        site_encontrado: siteOficial || null,
        uf_encontrada: ufEncontrada || null,
        faturamento_anual: faturamentoDoBanco || null,
        rastreabilidade: rastreabilidade,
        fontes_utilizadas: FONTES_UTILIZADAS,
        versao_orquestrador: VERSAO_ORQUESTRADOR,
        modulo: modulo || 'geral',
        subModulo: subModulo || 'geral',
        porte_utilizado: porteParaBusca,
        _meta: {
            timestamp: new Date().toISOString(),
            tempo_total_ms: Date.now() - inicio,
            hash_bruto: crypto.createHash('sha256').update(JSON.stringify(fontes)).digest('hex')
        }
    };

    console.log('📤 ORQUESTRADOR retornando com faturamento_anual: ' + resultado.faturamento_anual + ' site: ' + resultado.site_encontrado);
    return resultado;
}

module.exports = { 
    coletarEvidenciasReais,
    buscarCNPJnaBrasilAPI,
    buscarCNPJnaReceitaWS,
    cadeiaDeBuscaCNPJ
};