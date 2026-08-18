// ============================================================
// orchestrator.js - Orquestra fontes de dados REAIS para a VERI
// VERSÃO DEFINITIVA 4.0.15 - CORREÇÃO DE LÓGICA
// CORRIGIDO: Banco regional fornece CNPJ + faturamento + porte GIGANTE
// CORRIGIDO: BrasilAPI fornece razão social, data, sócios, setor, UF
// CORRIGIDO: NUNCA sobrescrever porte/faturamento do banco regional
// CORRIGIDO: DEMAIS substituído por GIGANTE
// CORRIGIDO: Fallback para CSV no Google Cloud Storage
// CORRIGIDO: Porte GIGANTE prevalece sobre qualquer outro
// CORRIGIDO: Não cria site fictício (retorna null)
// CORRIGIDO: Logs adicionados para rastrear faturamento
// 🔧 CORRIGIDO: Adicionada função normalizarDocumento para compatibilidade
// 🔧 CORRIGIDO: Adicionada função executarBuscas para orquestrar buscas paralelas
// 🔧 CORRIGIDO: Função encontrarCNPJPorNome com limpeza robusta
// 🔧 CORRIGIDO: Busca data_abertura para GIGANTES do banco regional
// ============================================================

const { googleSearch } = require('./sources/googleSearch');
const { buscarReclameAqui } = require('./sources/reclameAqui');
const { consultarReceita } = require('./sources/receitaFederal');
const { buscarNoticias } = require('./sources/noticias');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

// ============================================================
// NORMALIZAR DOCUMENTO (CNPJ/CPF)
// ============================================================
function normalizarDocumento(doc) {
    if (!doc) return '';
    return doc.replace(/[.\-\/]/g, '').toUpperCase();
}

// ============================================================
// CONFIGURA STORAGE PARA ACESSAR O CSV
// ============================================================
let storage = null;
let credenciaisCarregadas = false;

const secretPath = '/etc/secrets/google-creds.json';

if (fs.existsSync(secretPath)) {
    try {
        const credsContent = fs.readFileSync(secretPath, 'utf8');
        const creds = JSON.parse(credsContent);

        storage = new Storage({
            projectId: creds.project_id,
            credentials: {
                client_email: creds.client_email,
                private_key: creds.private_key
            }
        });

        console.log('✅ Storage inicializado no orchestrator com credenciais do Secret File.');
        credenciaisCarregadas = true;

    } catch (err) {
        console.error('❌ Erro ao processar credencial no orchestrator:', err.message);
        storage = null;
    }
} else {
    console.error('❌ Secret File NÃO ENCONTRADO no orchestrator em:', secretPath);
    storage = null;
}

const BUCKET_NAME = 'veri-cnpj-dados';
const CSV_FILE = 'cnpj_busca_6_colunas.csv';

// ============================================================
// BUSCA NO CSV DIRETAMENTE NO STORAGE
// ============================================================
async function buscarCSVnoStorage(termo) {
    if (!storage) {
        console.warn('⚠️ Storage não disponível no orchestrator.');
        return null;
    }

    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(CSV_FILE);

        const [exists] = await file.exists();

        if (!exists) {
            console.warn('⚠️ CSV não encontrado no Storage.');
            return null;
        }

        console.log('🔍 FALLBACK CSV STORAGE acionado para:', termo);

        const stream = file.createReadStream();
        const csv = require('csv-parser');

        return new Promise((resolve, reject) => {
            let encontrado = null;
            let contador = 0;

            let finalizado = false;

            const finalizar = (resultado) => {
                if (finalizado) return;
                finalizado = true;
                clearTimeout(timeoutId);
                resolve(resultado);
            };

            const timeoutId = setTimeout(() => {
                console.warn('⏳ Timeout na busca do CSV Storage.');
                stream.destroy();
                finalizar(null);
            }, 15000);

            stream
                .pipe(csv())
                .on('data', (row) => {
                    if (finalizado) return;

                    contador++;

                    if (termo.length === 14) {
                        const cnpjRow = row.CNPJ
                            ? String(row.CNPJ).replace(/\D/g, '')
                            : '';

                        if (cnpjRow === termo) {
                            encontrado = {
                                cnpj: row.CNPJ,
                                razao_social:
                                    row['RAZAO SOCIAL'] ||
                                    row.razao_social ||
                                    '',
                                nome_fantasia:
                                    row['NOME FANTASIA'] ||
                                    row.nome_fantasia ||
                                    '',
                                porte:
                                    row.PORTE ||
                                    row.porte ||
                                    '',
                                data_abertura:
                                    row['DATA DE ABERTURA'] ||
                                    row.data_abertura ||
                                    '',
                                situacao:
                                    row.SITUACAO ||
                                    row.situacao ||
                                    'ATIVA',
                                uf: row.UF || '',
                                municipio: row.MUNICIPIO || '',
                                fonte: 'csv_storage'
                            };

                            stream.destroy();
                            finalizar(encontrado);
                            return;
                        }
                    }

                    if (termo.length > 2) {
                        const razao = (
                            row['RAZAO SOCIAL'] ||
                            row.razao_social ||
                            ''
                        ).toLowerCase();

                        const fantasia = (
                            row['NOME FANTASIA'] ||
                            row.nome_fantasia ||
                            ''
                        ).toLowerCase();

                        const busca = termo.toLowerCase();

                        if (
                            razao.includes(busca) ||
                            fantasia.includes(busca)
                        ) {
                            encontrado = {
                                cnpj: row.CNPJ,
                                razao_social:
                                    row['RAZAO SOCIAL'] ||
                                    row.razao_social ||
                                    '',
                                nome_fantasia:
                                    row['NOME FANTASIA'] ||
                                    row.nome_fantasia ||
                                    '',
                                porte:
                                    row.PORTE ||
                                    row.porte ||
                                    '',
                                data_abertura:
                                    row['DATA DE ABERTURA'] ||
                                    row.data_abertura ||
                                    '',
                                situacao:
                                    row.SITUACAO ||
                                    row.situacao ||
                                    'ATIVA',
                                uf: row.UF || '',
                                municipio: row.MUNICIPIO || '',
                                fonte: 'csv_storage'
                            };

                            stream.destroy();
                            finalizar(encontrado);
                            return;
                        }
                    }
                })
                .on('end', () => {
                    console.log(
                        '🔎 CSV Storage finalizado. Registros percorridos:',
                        contador
                    );

                    finalizar(encontrado);
                })
                .on('error', (err) => {
                    console.warn(
                        '⚠️ Erro ao ler CSV do Storage:',
                        err.message
                    );

                    finalizar(null);
                });
        });

    } catch (err) {
        console.warn(
            '⚠️ Erro ao buscar no CSV Storage:',
            err.message
        );

        return null;
    }
}

async function carregarHistorico() {
    return null;
}

async function salvarNoHistorico(cnpj, dados) {
    return null;
}

// ============================================================
// BANCO REGIONAL DE CNPJs FAMOSOS
// ============================================================
let CNPJS_FAMOSOS = {};

try {
    CNPJS_FAMOSOS = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, 'cnpjs_famosos.json'),
            'utf8'
        )
    );

    console.log(
        '📦 CNPJS_FAMOSOS carregado. UFs: ' +
        Object.keys(CNPJS_FAMOSOS).length
    );

} catch (e) {
    console.warn(
        '⚠️ cnpjs_famosos.json não encontrado ou inválido. Banco local desativado.'
    );
}

const VERSAO_ORQUESTRADOR = '4.0.15';

const FONTES_UTILIZADAS = [
    'Google Search',
    'BrasilAPI',
    'Reclame Aqui',
    'Google News',
    'Processos Judiciais Focados (STF/STJ/TRF Regional/TJ Estadual)',
    'Consumidor.gov',
    'Busca de CNPJ por nome',
    'Protestos (Centroprot)',
    'Banco local de CNPJs famosos',
    'CSV Storage (fallback)'
];

const TIMEOUTS = {
    GOOGLE_SEARCH: 2000,
    NOTICIAS: 2000,
    RECLAME_AQUI: 2000,
    CONSUMIDOR_GOV: 2000,
    PROCESSOS_JUDICIAIS: 3000,
    PROTESTOS: 2000,
    SITE_OFICIAL: 2000,
    CNPJ_BRASILAPI: 8000,
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

    return {
        signal: controller.signal,
        timeoutId: timeoutId
    };
}

function obterTRFPorUF(uf) {
    if (!uf) return 'trf1.jus.br';

    var ufUpper = uf.toUpperCase().trim();

    var mapeamento = {
        'AC': 'trf1.jus.br',
        'AM': 'trf1.jus.br',
        'AP': 'trf1.jus.br',
        'BA': 'trf1.jus.br',
        'DF': 'trf1.jus.br',
        'GO': 'trf1.jus.br',
        'MA': 'trf1.jus.br',
        'MT': 'trf1.jus.br',
        'PA': 'trf1.jus.br',
        'PI': 'trf1.jus.br',
        'RO': 'trf1.jus.br',
        'RR': 'trf1.jus.br',
        'TO': 'trf1.jus.br',

        'RJ': 'trf2.jus.br',
        'ES': 'trf2.jus.br',

        'SP': 'trf3.jus.br',
        'MS': 'trf3.jus.br',

        'PR': 'trf4.jus.br',
        'RS': 'trf4.jus.br',
        'SC': 'trf4.jus.br',

        'AL': 'trf5.jus.br',
        'CE': 'trf5.jus.br',
        'PB': 'trf5.jus.br',
        'PE': 'trf5.jus.br',
        'RN': 'trf5.jus.br',
        'SE': 'trf5.jus.br',

        'MG': 'trf6.jus.br'
    };

    return mapeamento[ufUpper] || 'trf1.jus.br';
}

function gerarQueries(nome, cnpj, cpf, uf, porte) {
    var nomeLimpo = nome || '';
    var ufLower = uf ? uf.toLowerCase().trim() : '';
    var trfDominio = obterTRFPorUF(uf);

    var portesPequenos = ['MEI', 'ME', 'EPP'];

    var porteAnalisado = porte
        ? porte.toUpperCase().trim()
        : '';

    var isPequeno =
        portesPequenos.indexOf(porteAnalisado) !== -1;

    var isPF = !cnpj && cpf;

    var judicialFocado = [];

    judicialFocado.push(
        'site:' +
        trfDominio +
        ' "' +
        nomeLimpo +
        '" processo'
    );

    if (ufLower) {
        judicialFocado.push(
            'site:tj' +
            ufLower +
            '.jus.br "' +
            nomeLimpo +
            '" processo'
        );
    } else {
        judicialFocado.push(
            'site:tj.jus.br "' +
            nomeLimpo +
            '" processo'
        );
    }

    if (!isPequeno && !isPF) {
        judicialFocado.push(
            'site:stf.jus.br "' +
            nomeLimpo +
            '" processo'
        );

        judicialFocado.push(
            'site:stj.jus.br "' +
            nomeLimpo +
            '" processo'
        );
    }

    if (process.env.CNJ_API_KEY) {
        judicialFocado.push(
            'site:cnj.jus.br "' +
            nomeLimpo +
            '" processo'
        );

        judicialFocado.push(
            'site:datajud.cnj.jus.br "' +
            nomeLimpo +
            '"'
        );
    }

    return {
        google:
            nomeLimpo +
            ' empresa Brasil avaliacao',

        news:
            nomeLimpo +
            ' noticias empresa Brasil recentes',

        site:
            '"' +
            nomeLimpo +
            '" site oficial | home | institucional',

        cnpjFinder:
            '"' +
            nomeLimpo +
            '" CNPJ',

        cpfFinder:
            '"' +
            nomeLimpo +
            '" CPF',

        judicial: judicialFocado,

        reclameFallback:
            'site:reclameaqui.com.br "' +
            nomeLimpo +
            '"',

        consumidorFallback:
            'site:consumidor.gov.br "' +
            nomeLimpo +
            '"',

        protestos:
            '"' +
            nomeLimpo +
            '" protesto cartorio'
    };
}

// 🔧 CORREÇÃO: função encontrarCNPJPorNome com limpeza robusta
function encontrarCNPJPorNome(nome, uf) {
    if (!nome || typeof nome !== 'string') {
        return null;
    }

    if (Object.keys(CNPJS_FAMOSOS).length === 0) {
        return null;
    }

    var nomeBusca = nome.toLowerCase().trim();
    nomeBusca = nomeBusca
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    var estados = uf ? [uf] : Object.keys(CNPJS_FAMOSOS);

    for (var i = 0; i < estados.length; i++) {
        var ufKey = estados[i];
        var empresas = CNPJS_FAMOSOS[ufKey] || [];

        for (var j = 0; j < empresas.length; j++) {
            var empresa = empresas[j];
            if (empresa.cnpj === 'PESQUISAR') continue;

            var nomeEmpresa = empresa.nome.toLowerCase().trim();
            nomeEmpresa = nomeEmpresa
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (nomeEmpresa.indexOf(nomeBusca) !== -1 || nomeBusca.indexOf(nomeEmpresa) !== -1) {
                console.log(
                    '✅ Encontrado no banco local: ' + empresa.nome +
                    ' CNPJ: ' + empresa.cnpj +
                    ' UF: ' + ufKey
                );
                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual: empresa.faturamento_anual,
                    setor: empresa.setor,
                    uf: ufKey,
                    nome_encontrado: empresa.nome,
                    porte: 'GIGANTE',
                    fonte: 'banco_local'
                };
            }
        }
    }

    console.log('⚠️ Nome nao encontrado no banco local: ' + nome);
    return null;
}

function encontrarCNPJPorCNPJ(cnpj) {
    if (!cnpj || typeof cnpj !== 'string') {
        return null;
    }

    var cnpjLimpo = normalizarDocumento(cnpj);

    if (cnpjLimpo.length !== 14) {
        return null;
    }

    for (var uf in CNPJS_FAMOSOS) {
        var empresas = CNPJS_FAMOSOS[uf];

        if (!Array.isArray(empresas)) {
            continue;
        }

        for (var i = 0; i < empresas.length; i++) {
            var empresa = empresas[i];

            if (!empresa.cnpj) {
                continue;
            }

            var cnpjEmpresa =
                normalizarDocumento(empresa.cnpj);

            if (cnpjEmpresa === cnpjLimpo) {
                console.log(
                    '✅ CNPJ encontrado no banco regional por CNPJ:',
                    empresa.nome
                );

                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual:
                        empresa.faturamento_anual,
                    setor: empresa.setor,
                    uf: uf,
                    nome: empresa.nome,
                    porte: 'GIGANTE'
                };
            }
        }
    }

    return null;
}

async function buscarCNPJPorNome(nome) {
    if (!nome) return null;

    try {
        var results = await buscarGoogleComAbort(
            '"' + nome + '" CNPJ',
            TIMEOUTS.CNPJ_GOOGLE
        );

        if (results && results.length > 0) {
            for (
                var i = 0;
                i < Math.min(results.length, 5);
                i++
            ) {
                var snippet = results[i].snippet || '';

                var match = snippet.match(
                    /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/
                );

                if (match) {
                    console.log(
                        '🔍 CNPJ encontrado via Google: ' +
                        match[0]
                    );

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
        console.warn(
            'Busca por CNPJ no Google falhou: ' +
            e.message
        );
    }

    return null;
}

async function buscarCPFPorNome(nome) {
    if (!nome) return null;

    try {
        var results = await buscarGoogleComAbort(
            '"' + nome + '" CPF',
            TIMEOUTS.GOOGLE_SEARCH
        );

        if (results && results.length > 0) {
            for (
                var i = 0;
                i < Math.min(results.length, 5);
                i++
            ) {
                var snippet = results[i].snippet || '';

                var match = snippet.match(
                    /\d{3}\.\d{3}\.\d{3}-\d{2}/
                );

                if (match) {
                    return {
                        cpf: match[0].replace(/\D/g, ''),
                        nome: nome,
                        fonte: 'google_busca'
                    };
                }
            }
        }

    } catch (e) {
        /* silencioso */
    }

    return null;
}

async function buscarGoogleComAbort(query, timeoutMs) {
    var abort = criarAbortController(
        timeoutMs || TIMEOUTS.GOOGLE_SEARCH
    );

    try {
        var result = await withTimeout(
            googleSearch(query, {
                signal: abort.signal
            }),
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
        var results = await buscarGoogleComAbort(
            queries,
            TIMEOUTS.PROTESTOS
        );

        if (results && results.length > 0) {
            results.forEach(function(item) {
                if (item.title && item.snippet) {
                    var texto = (
                        item.title +
                        ' ' +
                        (item.snippet || '')
                    ).toLowerCase();

                    if (
                        texto.indexOf('protesto') !== -1 ||
                        texto.indexOf('cartorio') !== -1 ||
                        texto.indexOf('cedula') !== -1
                    ) {
                        resultados.push({
                            titulo:
                                'Protesto - ' +
                                item.title,
                            descricao:
                                item.snippet || '',
                            url:
                                item.link || '#',
                            fonte:
                                'Protestos (Centroprot/Cartorios)',
                            tipo: 'protesto'
                        });
                    }
                }
            });
        }

    } catch (err) {
        console.warn(
            'Erro na busca de protestos: ' +
            err.message
        );
    }

    return resultados.slice(0, 10);
}

function identificarTribunal(link) {
    if (!link) return 'Processos Judiciais';

    if (link.indexOf('stf.jus.br') !== -1)
        return 'STF';

    if (link.indexOf('stj.jus.br') !== -1)
        return 'STJ';

    if (link.indexOf('tst.jus.br') !== -1)
        return 'TST';

    if (link.indexOf('trf1.jus.br') !== -1)
        return 'TRF-1';

    if (link.indexOf('trf2.jus.br') !== -1)
        return 'TRF-2';

    if (link.indexOf('trf3.jus.br') !== -1)
        return 'TRF-3';

    if (link.indexOf('trf4.jus.br') !== -1)
        return 'TRF-4';

    if (link.indexOf('trf5.jus.br') !== -1)
        return 'TRF-5';

    if (link.indexOf('trf6.jus.br') !== -1)
        return 'TRF-6';

    if (link.indexOf('trt') !== -1)
        return 'TRT';

    if (link.indexOf('esaj.jus.br') !== -1)
        return 'TJ Estadual';

    if (link.indexOf('cnj.jus.br') !== -1)
        return 'CNJ';

    if (link.indexOf('datajud.cnj.jus.br') !== -1)
        return 'DataJud';

    if (link.indexOf('jusbrasil.com.br') !== -1)
        return 'JusBrasil';

    if (link.indexOf('tj') !== -1)
        return 'TJ Estadual';

    return 'Processos Judiciais';
}

async function buscarProcessosJudiciaisOtimizados(
    queriesJudiciais,
    nome
) {
    var resultados = [];

    if (
        !queriesJudiciais ||
        queriesJudiciais.length === 0
    ) {
        return [];
    }

    var buscas = queriesJudiciais.map(function(q) {
        return buscarGoogleComAbort(
            q,
            TIMEOUTS.PROCESSOS_JUDICIAIS
        );
    });

    var arraysDeResultados =
        await Promise.all(buscas);

    arraysDeResultados.forEach(function(result) {
        if (result && result.length > 0) {
            result.forEach(function(item) {
                if (item.title && item.snippet) {
                    var tribunal =
                        identificarTribunal(item.link);

                    resultados.push({
                        titulo:
                            '[' +
                            tribunal +
                            '] ' +
                            item.title,
                        descricao:
                            item.snippet || '',
                        url:
                            item.link || '#',
                        fonte:
                            'Processos Judiciais - ' +
                            tribunal,
                        tipo: 'judicial',
                        tribunal: tribunal
                    });
                }
            });
        }
    });

    if (
        resultados.length === 0 &&
        nome
    ) {
        try {
            var fallbackQueries = [
                'site:jusbrasil.com.br "' +
                nome +
                '" processo',

                'site:cnj.jus.br "' +
                nome +
                '" processo'
            ];

            var fallbackBuscas =
                fallbackQueries.map(function(q) {
                    return buscarGoogleComAbort(
                        q,
                        TIMEOUTS.PROCESSOS_JUDICIAIS
                    );
                });

            var fallbackResultados =
                await Promise.all(fallbackBuscas);

            fallbackResultados.forEach(
                function(result) {
                    if (
                        result &&
                        result.length > 0
                    ) {
                        result.forEach(
                            function(item) {
                                if (
                                    item.title &&
                                    item.snippet
                                ) {
                                    var tribunal =
                                        identificarTribunal(
                                            item.link
                                        );

                                    resultados.push({
                                        titulo:
                                            '[' +
                                            tribunal +
                                            '] ' +
                                            item.title,
                                        descricao:
                                            item.snippet ||
                                            '',
                                        url:
                                            item.link ||
                                            '#',
                                        fonte:
                                            'Processos Judiciais - ' +
                                            tribunal,
                                        tipo:
                                            'judicial',
                                        tribunal:
                                            tribunal
                                    });
                                }
                            }
                        );
                    }
                }
            );

        } catch (err) {
            console.warn(
                'Fallback JusBrasil/CNJ falhou: ' +
                err.message
            );
        }
    }

    var vistos = {};
    var unicos = [];

    for (
        var j = 0;
        j < resultados.length;
        j++
    ) {
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
        var query =
            '"' +
            nome +
            '" site oficial | home | institucional';

        var results = await buscarGoogleComAbort(
            query,
            TIMEOUTS.SITE_OFICIAL
        );

        if (
            results &&
            results.length > 0
        ) {
            var dominios = [
                '.com.br',
                '.com',
                '.org',
                '.net'
            ];

            for (
                var i = 0;
                i < results.length;
                i++
            ) {
                var link =
                    results[i].link || '';

                if (link) {
                    try {
                        var url = new URL(link);
                        var host = url.hostname;

                        for (
                            var j = 0;
                            j < dominios.length;
                            j++
                        ) {
                            if (
                                host.indexOf(
                                    dominios[j]
                                ) !== -1
                            ) {
                                siteEncontrado = host;

                                console.log(
                                    '✅ Site encontrado via Google: ' +
                                    siteEncontrado
                                );

                                return siteEncontrado;
                            }
                        }

                    } catch (e) {
                        /* URL invalida */
                    }
                }
            }

            if (results[0].link) {
                try {
                    var url =
                        new URL(results[0].link);

                    siteEncontrado =
                        url.hostname;

                    console.log(
                        '✅ Site encontrado via Google (fallback): ' +
                        siteEncontrado
                    );

                    return siteEncontrado;

                } catch (e) {
                    /* URL invalida */
                }
            }
        }

    } catch (e) {
        console.warn(
            '⚠️ Busca por site via Google falhou: ' +
            e.message
        );
    }

    console.log(
        '❌ Site nao encontrado para: ' +
        nome
    );

    return null;
}

async function buscarCNPJnaBrasilAPI(cnpj, tentativa) {
    var tentativaAtual = tentativa || 1;
    var maxTentativas = 2;
    var cnpjLimpo = normalizarDocumento(cnpj);

    await new Promise(function(resolve) {
        setTimeout(resolve, 300 * tentativaAtual);
    });

    console.log(
        '🔍 Buscando BrasilAPI para CNPJ: ' +
        cnpjLimpo +
        ' (tentativa ' +
        tentativaAtual +
        '/' +
        maxTentativas +
        ')'
    );

    try {
        const url = 'https://brasilapi.com.br/api/cnpj/v1/' + cnpjLimpo;

        const response = await fetch(url);

        if (!response.ok) {
            console.warn(
                '⚠️ BrasilAPI retornou status: ' + response.status
            );

            if (response.status === 429 && tentativaAtual < maxTentativas) {
                console.log(
                    '⏳ BrasilAPI com 429, tentando novamente...'
                );

                return await buscarCNPJnaBrasilAPI(
                    cnpj,
                    tentativaAtual + 1
                );
            }

            return null;
        }

        const data = await response.json();

        if (data && !data.error) {
            console.log(
                '✅ BrasilAPI retornou dados para CNPJ: ' +
                cnpjLimpo
            );

            return {
                cnpj: data.cnpj,
                razao_social: data.razao_social || '',
                nome_fantasia: data.nome_fantasia || '',
                porte: data.porte || '',
                data_abertura:
                    data.data_inicio_atividade ||
                    data.abertura ||
                    '',
                situacao:
                    data.descricao_situacao_cadastral ||
                    'ATIVA',
                setor: data.cnae_fiscal_descricao || '',
                email: data.email || '',
                site: data.site || '',
                uf: data.uf || '',
                municipio: data.municipio || '',
                fonte: 'brasilapi'
            };
        }
    } catch (err) {
        console.warn(
            '⚠️ Erro na BrasilAPI: ' + err.message
        );

        if (tentativaAtual < maxTentativas) {
            console.log(
                '⏳ BrasilAPI com erro, tentando novamente...'
            );

            return await buscarCNPJnaBrasilAPI(
                cnpj,
                tentativaAtual + 1
            );
        }
    }

    return null;
}

async function buscarCNPJnaReceitaWS(cnpj) {
    var cnpjLimpo = normalizarDocumento(cnpj);

    console.log(
        '🔍 Buscando ReceitaWS para CNPJ: ' + cnpjLimpo
    );

    try {
        const url =
            'https://www.receitaws.com.br/v1/cnpj/' +
            cnpjLimpo;

        const response = await fetch(url);

        if (!response.ok) {
            console.warn(
                '⚠️ ReceitaWS retornou status: ' +
                response.status
            );

            return null;
        }

        const data = await response.json();

        if (
            data &&
            data.status !== 'ERROR' &&
            !data.error
        ) {
            console.log(
                '✅ ReceitaWS retornou dados para CNPJ: ' +
                cnpjLimpo
            );

            return {
                cnpj: cnpjLimpo,
                razao_social:
                    data.nome ||
                    data.razao_social ||
                    '',
                nome_fantasia:
                    data.fantasia ||
                    data.nome_fantasia ||
                    '',
                porte: data.porte || '',
                data_abertura: data.abertura || '',
                situacao:
                    data.situacao || 'ATIVA',
                setor:
                    data.atividade_principal &&
                    data.atividade_principal.length > 0
                        ? data.atividade_principal[0].text
                        : '',
                email: data.email || '',
                site: data.site || '',
                uf: data.uf || '',
                municipio: data.municipio || '',
                fonte: 'receitaws'
            };
        }
    } catch (err) {
        console.warn(
            '⚠️ Erro na ReceitaWS: ' + err.message
        );
    }

    return null;
}

/*
 * ============================================================
 * CADEIA DE BUSCA DE CNPJ
 *
 * ORDEM:
 *
 * 1. BrasilAPI
 * 2. ReceitaWS
 * 3. CSV no Google Cloud Storage
 *
 * IMPORTANTE:
 * O CSV NÃO é consultado antes das APIs.
 * O CSV somente entra quando as APIs falharem.
 * ============================================================
 */
async function cadeiaDeBuscaCNPJ(limpo) {
    var cnpjNormalizado = normalizarDocumento(limpo);

    if (cnpjNormalizado.length !== 14) {
        console.warn(
            '⚠️ CNPJ inválido para cadeia de busca: ' +
            cnpjNormalizado
        );

        return null;
    }

    console.log(
        '🔍 INICIANDO CADEIA DE BUSCA PARA CNPJ: ' +
        cnpjNormalizado
    );

    /*
     * 1. BRASILAPI
     */
    var brasil = await buscarCNPJnaBrasilAPI(
        cnpjNormalizado
    );

    if (brasil) {
        console.log(
            '✅ CADEIA: BrasilAPI encontrou o CNPJ ' +
            cnpjNormalizado
        );

        return {
            ...brasil,
            fonte: 'brasilapi'
        };
    }

    /*
     * 2. RECEITAWS
     *
     * É fallback da BrasilAPI.
     */
    console.warn(
        '⚠️ CADEIA: BrasilAPI falhou. Tentando ReceitaWS...'
    );

    var receita = await buscarCNPJnaReceitaWS(
        cnpjNormalizado
    );

    if (receita) {
        console.log(
            '✅ CADEIA: ReceitaWS encontrou o CNPJ ' +
            cnpjNormalizado
        );

        return {
            ...receita,
            fonte: 'receitaws'
        };
    }

    /*
     * 3. CSV NO GOOGLE CLOUD STORAGE
     *
     * Somente agora o CSV entra como fallback
     * das APIs.
     */
    console.warn(
        '⚠️ CADEIA: APIs falharam. Tentando CSV no Google Cloud Storage...'
    );

    var csv = await buscarCSVnoStorage(
        cnpjNormalizado
    );

    if (csv) {
        console.log(
            '✅ CADEIA: CSV Storage encontrou o CNPJ ' +
            cnpjNormalizado
        );

        return {
            ...csv,
            fonte: 'csv_storage'
        };
    }

    console.warn(
        '❌ CADEIA: BrasilAPI, ReceitaWS e CSV falharam para CNPJ: ' +
        cnpjNormalizado
    );

    return null;
}

// ============================================================
// EXECUTAR BUSCAS PARALELAS
// ============================================================
async function executarBuscas(queries, nome) {
    var resultados = {
        google: [],
        noticias: [],
        reclameData: [],
        processos: [],
        consumidorData: [],
        protestos: []
    };

    try {
        if (queries.google) {
            resultados.google = await buscarGoogleComAbort(queries.google, TIMEOUTS.GOOGLE_SEARCH) || [];
        }

        if (queries.news) {
            resultados.noticias = await buscarGoogleComAbort(queries.news, TIMEOUTS.NOTICIAS) || [];
        }

        if (queries.reclameFallback) {
            resultados.reclameData = await buscarGoogleComAbort(queries.reclameFallback, TIMEOUTS.RECLAME_AQUI) || [];
        }

        if (queries.judicial && queries.judicial.length > 0) {
            resultados.processos = await buscarProcessosJudiciaisOtimizados(queries.judicial, nome) || [];
        }

        if (queries.protestos) {
            resultados.protestos = await buscarProtestos(queries.protestos) || [];
        }

        if (queries.consumidorFallback) {
            resultados.consumidorData = await buscarGoogleComAbort(queries.consumidorFallback, TIMEOUTS.CONSUMIDOR_GOV) || [];
        }

    } catch (err) {
        console.warn('Erro ao executar buscas paralelas:', err.message);
    }

    return resultados;
}
/*
 * ============================================================
 * COLETA PRINCIPAL DE EVIDÊNCIAS
 * ============================================================
 */
async function coletarEvidenciasReais(
    nome,
    cnpj,
    cpf,
    uf,
    modulo,
    subModulo
) {
    var inicio = Date.now();

    console.log(
        '🔍 INICIANDO COLETA PARA:',
        nome
    );

    var cnpjEncontrado = cnpj;
    var dadosCadastrais = null;

    var faturamentoDoBanco = null;
    var setorDoBanco = null;
    var porteDoBanco = null;

    var ufEncontrada = uf || null;

    /*
     * ========================================================
     * 1. PRIMEIRO: BANCO REGIONAL
     *
     * O banco regional NÃO substitui a consulta cadastral.
     *
     * Ele fornece:
     * - CNPJ
     * - faturamento
     * - setor
     * - porte GIGANTE
     * - UF
     *
     * Depois o CNPJ encontrado segue para a cadeia
     * cadastral.
     * ========================================================
     */

    if (!cnpjEncontrado && nome) {
        var resultadoLocal =
            encontrarCNPJPorNome(nome, uf);

        if (
            resultadoLocal &&
            resultadoLocal.cnpj
        ) {
            console.log(
                '📊 BANCO LOCAL ENCONTRADO:',
                resultadoLocal.nome_encontrado
            );

            console.log(
                '📊 FATURAMENTO DO BANCO:',
                resultadoLocal.faturamento_anual
            );

            cnpjEncontrado =
                resultadoLocal.cnpj;

            faturamentoDoBanco =
                resultadoLocal.faturamento_anual;

            setorDoBanco =
                resultadoLocal.setor;

            porteDoBanco = 'GIGANTE';

            ufEncontrada =
                resultadoLocal.uf || uf;

            console.log(
                'CNPJ encontrado no banco local: ' +
                resultadoLocal.cnpj +
                ' (' +
                resultadoLocal.nome_encontrado +
                ') - UF: ' +
                ufEncontrada
            );

            // 🔧 BUSCAR DATA_ABERTURA PARA GIGANTES DO BANCO REGIONAL
            try {
                var dadosComplementares = await consultarReceita(resultadoLocal.cnpj);
                if (dadosComplementares && dadosComplementares.data_abertura) {
                    resultadoLocal.data_abertura = dadosComplementares.data_abertura;
                    console.log('✅ Data de abertura obtida para GIGANTE:', resultadoLocal.data_abertura);
                }
            } catch (e) {
                console.warn('⚠️ Não foi possível obter data_abertura para o GIGANTE:', resultadoLocal.cnpj);
            }
        }
    }

    /*
     * Se o usuário já forneceu o CNPJ, verifica se ele
     * pertence ao banco regional.
     *
     * Se pertencer:
     * mantém faturamento/porte/setor do banco.
     */
    if (
        cnpjEncontrado &&
        !faturamentoDoBanco
    ) {
        var resultadoPorCNPJ =
            encontrarCNPJPorCNPJ(
                cnpjEncontrado
            );

        if (resultadoPorCNPJ) {
            console.log(
                '📊 BANCO LOCAL ENCONTRADO POR CNPJ:',
                resultadoPorCNPJ.nome
            );

            console.log(
                '📊 FATURAMENTO DO BANCO:',
                resultadoPorCNPJ.faturamento_anual
            );

            faturamentoDoBanco =
                resultadoPorCNPJ.faturamento_anual;

            setorDoBanco =
                resultadoPorCNPJ.setor;

            porteDoBanco = 'GIGANTE';

            ufEncontrada =
                resultadoPorCNPJ.uf ||
                ufEncontrada;

            // 🔧 BUSCAR DATA_ABERTURA PARA GIGANTES DO BANCO REGIONAL
            try {
                var dadosComplementares = await consultarReceita(resultadoPorCNPJ.cnpj);
                if (dadosComplementares && dadosComplementares.data_abertura) {
                    resultadoPorCNPJ.data_abertura = dadosComplementares.data_abertura;
                    console.log('✅ Data de abertura obtida para GIGANTE:', resultadoPorCNPJ.data_abertura);
                }
            } catch (e) {
                console.warn('⚠️ Não foi possível obter data_abertura para o GIGANTE:', resultadoPorCNPJ.cnpj);
            }
        }
    }


    /*
     * ========================================================
     * 2. CONSULTA CADASTRAL
     *
     * O CNPJ encontrado no banco regional segue para
     * consultarReceita().
     *
     * consultarReceita():
     * BrasilAPI
     *     ↓
     * ReceitaWS
     *
     * Somente se essa cadeia falhar:
     *     ↓
     * CSV Storage
     *
     * O CSV NÃO é chamado antes da BrasilAPI.
     * ========================================================
     */

    if (cnpjEncontrado) {
        try {
            console.log(
                '🔍 Buscando dados complementares para CNPJ:',
                cnpjEncontrado
            );

            /*
             * Primeiro consulta Receita, que internamente
             * utiliza BrasilAPI e seu fallback.
             */
            var dadosCadastraisCompletos =
                await consultarReceita(
                    cnpjEncontrado
                );

            /*
             * Se BrasilAPI + fallback da consulta Receita
             * não retornarem nada, somente então consulta
             * o CSV do Google Cloud Storage.
             */
            if (!dadosCadastraisCompletos) {
                console.log(
                    '⚠️ APIs cadastrais falharam, tentando CSV no Storage...'
                );

                dadosCadastraisCompletos =
                    await buscarCSVnoStorage(
                        cnpjEncontrado
                    );
            }

            if (dadosCadastraisCompletos) {

                /*
                 * Preserva faturamento do banco regional.
                 */
                if (faturamentoDoBanco) {
                    dadosCadastraisCompletos.faturamento_anual =
                        faturamentoDoBanco;

                    console.log(
                        '✅ FATURAMENTO DO BANCO PRESERVADO:',
                        faturamentoDoBanco
                    );
                }

                /*
                 * Preserva setor do banco regional.
                 */
                if (setorDoBanco) {
                    dadosCadastraisCompletos.setor =
                        setorDoBanco;
                }

                /*
                 * Preserva porte GIGANTE do banco regional.
                 */
                if (porteDoBanco) {
                    dadosCadastraisCompletos.porte =
                        porteDoBanco;

                    console.log(
                        '✅ PORTE DO BANCO PRESERVADO: GIGANTE'
                    );
                } else {
                    dadosCadastraisCompletos.porte =
                        dadosCadastraisCompletos.porte ||
                        'MEDIO';
                }

                // 🔧 Preserva data_abertura do banco regional se existir
                if (resultadoLocal && resultadoLocal.data_abertura) {
                    dadosCadastraisCompletos.data_abertura =
                        resultadoLocal.data_abertura;
                    console.log('✅ Data de abertura do banco regional preservada:', resultadoLocal.data_abertura);
                } else if (resultadoPorCNPJ && resultadoPorCNPJ.data_abertura) {
                    dadosCadastraisCompletos.data_abertura =
                        resultadoPorCNPJ.data_abertura;
                    console.log('✅ Data de abertura do banco regional preservada:', resultadoPorCNPJ.data_abertura);
                }

                dadosCadastraisCompletos.fonte_cnpj =
                    dadosCadastraisCompletos.fonte ||
                    'consulta_cadastral';

                dadosCadastrais =
                    dadosCadastraisCompletos;

                ufEncontrada =
                    dadosCadastrais.uf ||
                    ufEncontrada;

                console.log(
                    '✅ Dados complementares obtidos para CNPJ: ' +
                    cnpjEncontrado +
                    ' porte: ' +
                    dadosCadastrais.porte +
                    ' abertura: ' +
                    (
                        dadosCadastrais.data_abertura ||
                        dadosCadastrais.abertura ||
                        ''
                    )
                );

            } else {

                console.warn(
                    '⚠️ Nenhuma fonte retornou dados complementares para CNPJ:',
                    cnpjEncontrado
                );

                /*
                 * Ainda temos os dados do banco regional.
                 * Portanto não perdemos faturamento/porte/setor.
                 */
                dadosCadastrais = {
                    cnpj: cnpjEncontrado,
                    razao_social: nome || '',
                    porte:
                        porteDoBanco || 'MEDIO',
                    data_abertura: '',
                    situacao: 'ATIVA',
                    uf:
                        ufEncontrada || '',
                    fonte_cnpj:
                        porteDoBanco
                            ? 'banco_local_sem_api'
                            : 'fallback_final'
                };

                // 🔧 Preserva data_abertura do banco regional se existir
                if (resultadoLocal && resultadoLocal.data_abertura) {
                    dadosCadastrais.data_abertura =
                        resultadoLocal.data_abertura;
                } else if (resultadoPorCNPJ && resultadoPorCNPJ.data_abertura) {
                    dadosCadastrais.data_abertura =
                        resultadoPorCNPJ.data_abertura;
                }

                if (faturamentoDoBanco) {
                    dadosCadastrais.faturamento_anual =
                        faturamentoDoBanco;
                }

                if (setorDoBanco) {
                    dadosCadastrais.setor =
                        setorDoBanco;
                }
            }

        } catch (err) {

            console.warn(
                '⚠️ Erro ao buscar dados complementares:',
                err.message
            );

            /*
             * Se a consulta cadastral gerar erro e o banco
             * regional já tiver dados, preserva esses dados.
             */
            if (
                !dadosCadastrais &&
                faturamentoDoBanco
            ) {
                dadosCadastrais = {
                    cnpj: cnpjEncontrado,
                    razao_social: nome || '',
                    porte:
                        porteDoBanco || 'MEDIO',
                    data_abertura: '',
                    situacao: 'ATIVA',
                    uf:
                        ufEncontrada || '',
                    faturamento_anual:
                        faturamentoDoBanco,
                    setor:
                        setorDoBanco || '',
                    fonte_cnpj:
                        'banco_local_fallback'
                };

                // 🔧 Preserva data_abertura do banco regional se existir
                if (resultadoLocal && resultadoLocal.data_abertura) {
                    dadosCadastrais.data_abertura =
                        resultadoLocal.data_abertura;
                } else if (resultadoPorCNPJ && resultadoPorCNPJ.data_abertura) {
                    dadosCadastrais.data_abertura =
                        resultadoPorCNPJ.data_abertura;
                }
            }
        }
    }


    /*
     * ========================================================
     * FALLBACK FINAL DE SEGURANÇA
     * ========================================================
     */

    if (
        !dadosCadastrais &&
        cnpjEncontrado
    ) {
        dadosCadastrais = {
            cnpj: cnpjEncontrado,
            razao_social: nome || '',
            porte:
                porteDoBanco || 'MEDIO',
            data_abertura: '',
            situacao: 'ATIVA',
            uf:
                ufEncontrada || '',
            fonte_cnpj:
                'fallback_final'
        };

        // 🔧 Preserva data_abertura do banco regional se existir
        if (resultadoLocal && resultadoLocal.data_abertura) {
            dadosCadastrais.data_abertura =
                resultadoLocal.data_abertura;
        } else if (resultadoPorCNPJ && resultadoPorCNPJ.data_abertura) {
            dadosCadastrais.data_abertura =
                resultadoPorCNPJ.data_abertura;
        }

        if (faturamentoDoBanco) {
            dadosCadastrais.faturamento_anual =
                faturamentoDoBanco;
        }

        if (setorDoBanco) {
            dadosCadastrais.setor =
                setorDoBanco;
        }

        console.log(
            '⚠️ Criando dadosCadastrais de fallback para CNPJ:',
            cnpjEncontrado
        );
    }


    /*
     * ========================================================
     * CPF
     * ========================================================
     */

    var cpfEncontrado = cpf;

    if (
        !cpf &&
        nome &&
        !cnpjEncontrado
    ) {
        var cpfInfo =
            await buscarCPFPorNome(nome);

        if (cpfInfo) {
            cpfEncontrado =
                cpfInfo.cpf;
        }
    }


    /*
     * ========================================================
     * PORTE UTILIZADO NAS BUSCAS
     * ========================================================
     */

    var porteParaBusca =
        dadosCadastrais &&
        dadosCadastrais.porte
            ? dadosCadastrais.porte
            : 'MEDIO';

    if (porteDoBanco) {
        porteParaBusca = 'GIGANTE';
    }

    console.log(
        '🔍 PORTE UTILIZADO PARA BUSCAS:',
        porteParaBusca
    );


    /*
     * ========================================================
     * GERAÇÃO DAS QUERIES
     * ========================================================
     */

    var queries = gerarQueries(
        nome,
        cnpjEncontrado,
        cpfEncontrado,
        ufEncontrada,
        porteParaBusca
    );


    /*
     * ========================================================
     * SITE OFICIAL
     * ========================================================
     */

    var siteOficial =
        await buscarSiteOficial(
            nome ||
            (
                dadosCadastrais &&
                dadosCadastrais.razao_social
            ) ||
            ''
        );

    console.log(
        '🔍 Site encontrado: ' +
        siteOficial
    );


    /*
     * ========================================================
     * DEMAIS FONTES
     * ========================================================
     */

    var resultados =
        await executarBuscas(
            queries,
            nome
        );


    /*
     * ========================================================
     * RASTREABILIDADE
     * ========================================================
     */

    var rastreabilidade = {
        google_search: {
            sucesso:
                resultados.google !== null &&
                resultados.google.length > 0,
            itens:
                resultados.google
                    ? resultados.google.length
                    : 0
        },

        reclame_aqui: {
            sucesso:
                resultados.reclameData !== null &&
                resultados.reclameData.length > 0,
            itens:
                resultados.reclameData
                    ? resultados.reclameData.length
                    : 0
        },

        noticias: {
            sucesso:
                resultados.noticias !== null &&
                resultados.noticias.length > 0,
            itens:
                resultados.noticias
                    ? resultados.noticias.length
                    : 0
        },

        processos_judiciais: {
            sucesso:
                resultados.processos !== null &&
                resultados.processos.length > 0,

            itens:
                resultados.processos
                    ? resultados.processos.length
                    : 0,

            tribunais_encontrados:
                resultados.processos
                    ? (function() {
                        var tribunais = {};

                        for (
                            var i = 0;
                            i < resultados.processos.length;
                            i++
                        ) {
                            var t =
                                resultados.processos[i]
                                    .tribunal ||
                                'desconhecido';

                            tribunais[t] = true;
                        }

                        return Object.keys(
                            tribunais
                        );
                    })()
                    : []
        },

        consumidor_gov: {
            sucesso:
                resultados.consumidorData !== null &&
                resultados.consumidorData.length > 0,

            itens:
                resultados.consumidorData
                    ? resultados.consumidorData.length
                    : 0
        },

        protestos: {
            sucesso:
                resultados.protestos !== null &&
                resultados.protestos.length > 0,

            itens:
                resultados.protestos
                    ? resultados.protestos.length
                    : 0
        },

        site_oficial: {
            sucesso:
                siteOficial !== null,
            itens:
                siteOficial
                    ? 1
                    : 0
        },

        cnpj_por_nome: {
            sucesso:
                cnpjEncontrado !== cnpj,

            fonte:
                dadosCadastrais &&
                dadosCadastrais.fonte_cnpj
                    ? dadosCadastrais.fonte_cnpj
                    : 'nao_buscado'
        },

        banco_local: {
            sucesso:
                faturamentoDoBanco !== null
        },

        receita_federal: {
            sucesso:
                dadosCadastrais !== null,
            itens:
                dadosCadastrais
                    ? 1
                    : 0
        }
    };


    /*
     * ========================================================
     * FONTES
     * ========================================================
     */

    var fontes = {
        google_search:
            resultados.google || [],

        reclame_aqui:
            resultados.reclameData || [],

        noticias:
            resultados.noticias || [],

        processos_judiciais:
            resultados.processos || [],

        consumidor_gov:
            resultados.consumidorData || [],

        protestos:
            resultados.protestos || []
    };


    /*
     * ========================================================
     * SITE
     * ========================================================
     */

    if (
        siteOficial &&
        dadosCadastrais
    ) {
        dadosCadastrais.site =
            siteOficial;

    } else if (
        siteOficial &&
        !dadosCadastrais
    ) {
        dadosCadastrais = {
            site: siteOficial
        };
    }


    /*
     * ========================================================
     * UF
     * ========================================================
     */

    if (
        dadosCadastrais &&
        ufEncontrada &&
        !dadosCadastrais.uf
    ) {
        dadosCadastrais.uf =
            ufEncontrada;
    }


    /*
     * ========================================================
     * FATURAMENTO
     *
     * Nunca sobrescrever faturamento do banco regional.
     * ========================================================
     */

    if (
        faturamentoDoBanco &&
        dadosCadastrais
    ) {
        dadosCadastrais.faturamento_anual =
            faturamentoDoBanco;
    }

    console.log(
        '📤 FATURAMENTO FINAL:',
        faturamentoDoBanco
    );


    /*
     * ========================================================
     * RESULTADO FINAL
     * ========================================================
     */

    var resultado = {
        fontes: fontes,

        dados_cadastrais:
            dadosCadastrais || null,

        cnpj_encontrado:
            cnpjEncontrado || null,

        cpf_encontrado:
            cpfEncontrado || null,

        site_encontrado:
            siteOficial || null,

        uf_encontrada:
            ufEncontrada || null,

        faturamento_anual:
            faturamentoDoBanco || null,

        rastreabilidade:
            rastreabilidade,

        fontes_utilizadas:
            FONTES_UTILIZADAS,

        versao_orquestrador:
            VERSAO_ORQUESTRADOR,

        modulo:
            modulo || 'geral',

        subModulo:
            subModulo || 'geral',

        porte_utilizado:
            porteParaBusca,

        _meta: {
            timestamp:
                new Date().toISOString(),

            tempo_total_ms:
                Date.now() - inicio,

            hash_bruto:
                crypto
                    .createHash('sha256')
                    .update(
                        JSON.stringify(fontes)
                    )
                    .digest('hex')
        }
    };

    console.log(
        '📤 ORQUESTRADOR retornando com faturamento_anual: ' +
        resultado.faturamento_anual +
        ' site: ' +
        resultado.site_encontrado
    );

    return resultado;
}


/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
    coletarEvidenciasReais,
    buscarCNPJnaBrasilAPI,
    buscarCNPJnaReceitaWS,
    cadeiaDeBuscaCNPJ
};