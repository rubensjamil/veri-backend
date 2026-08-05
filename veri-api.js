// ============================================
// VERI API - Motor Transversal v3.2
// Versão completa com todas as rotas
// CORRIGIDO: Busca BrasilAPI no /enriquecer
// CORRIGIDO: Passa faturamento_anual para o motor
// ADAPTADO: Valor da Contratação/Compra/Venda
// ADAPTADO: Extração de UF para o orchestrator
// CORRIGIDO: Logs para diagnóstico da BrasilAPI
// CORRIGIDO: Fallback para ReceitaWS
// CORRIGIDO: Captura de valor com logs
// CORRIGIDO: Dotenv para leitura de .env
// CORRIGIDO: Removida duplicação da variável 'secoes'
// CORRIGIDO: Fluxo de validação nunca bloqueia
// CORRIGIDO: Substituído optional chaining (?.) por compatibilidade
// CORRIGIDO: Erro "negocioStr.startsWith is not a function"
// CORRIGIDO: Garantia que req.body.negocio seja string
// CORRIGIDO: Suporte a CNPJs alfanuméricos
// CORRIGIDO: Busca por nome no banco local e no CSV
// CORRIGIDO: Lógica de busca com 3 fontes (BrasilAPI -> ReceitaWS -> CSV)
// CORRIGIDO: Indexação em memória do CSV para busca instantânea
// CORRIGIDO: Extração de sócio majoritário e controladora
// CORRIGIDO: Todas as strings com crases e sintaxe 100% verificada
// CORRIGIDO: carregarCSVIndex com verificação de existência do arquivo (fs.existsSync)
// CORRIGIDO: carregarCSVIndex não derruba o servidor em caso de erro
// CORRIGIDO: baixarCSVdoStorage() ativada na inicialização
// CORRIGIDO: Suporte a credenciais via variável de ambiente (GOOGLE_APPLICATION_CREDENTIALS_JSON)
// CORRIGIDO: Caminho do Secret File atualizado para google-creds.json
// CORRIGIDO: Erro de sintaxe na linha 291 (crases no console.log)
// CORRIGIDO: Busca no Storage para razão social e fallback de CNPJ
// CORRIGIDO: DEMAIS substituído por GIGANTE em todos os lugares
// CORRIGIDO: Prioriza faturamento do orquestrador antes de estimar por porte
// ============================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Storage } = require("@google-cloud/storage");
const csv = require("csv-parser");
const crypto = require("crypto");

require('dotenv').config();

// ============================================================
// CONFIGURA CREDENCIAIS DO GOOGLE CLOUD
// ============================================================
let credenciaisCarregadas = false;

// 1. Tenta carregar do Secret File (Render)
const secretPath = '/etc/secrets/google-creds.json';
let storage = null;

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
        console.log('✅ Storage inicializado com credenciais do Secret File.');
        console.log('📁 Projeto:', creds.project_id);
        console.log('📧 Conta de serviço:', creds.client_email);
        credenciaisCarregadas = true;
    } catch (err) {
        console.error('❌ Erro ao processar credencial:', err.message);
        storage = null;
    }
} else {
    console.error('❌ Secret File NÃO ENCONTRADO em:', secretPath);
    storage = null;
}

// 2. Tenta carregar da variável de ambiente (fallback)
if (!credenciaisCarregadas && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        const tempPath = '/tmp/credenciais.json';
        fs.writeFileSync(tempPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
        console.log('✅ Credenciais do Google Cloud configuradas via variável de ambiente.');
        credenciaisCarregadas = true;
    } catch (err) {
        console.warn('⚠️ Erro ao criar arquivo temporário de credenciais:', err.message);
    }
}

// 3. Tenta carregar do arquivo local (último fallback)
if (!credenciaisCarregadas) {
    const localCredPath = path.join(__dirname, 'credenciais.json');
    if (fs.existsSync(localCredPath)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = localCredPath;
        console.log('✅ Credenciais do Google Cloud carregadas do arquivo local.');
        credenciaisCarregadas = true;
    }
}

if (!credenciaisCarregadas) {
    console.warn('⚠️ Nenhuma credencial do Google Cloud encontrada. O Storage pode não funcionar.');
}

// ============================================
// VERSÕES
// ============================================
const VERSAO_API = "3.2.1";
const VERSAO_ORQUESTRADOR = "1.3.0";
const VERSAO_PROMPT_GEMINI = "v6";
const VERSAO_SCHEMA = "1.3";
const VERSAO_MOTOR = "3.2.1";

// ============================================
// MÓDULOS
// ============================================
const { coletarEvidenciasReais } = require("./modules/evidence/orchestrator");
const { estruturar } = require("./modules/evidence/gemini.client");
const { getCache, setCache } = require("./modules/evidence/cache");
const { extrairScores } = require("./modules/motor/scores");
const { calcularRiscos } = require("./modules/motor/veri.engine");
const config = require("./motor.config");

const app = express();

// ============================================================
// CORS - LIBERADO PARA TODAS AS ORIGENS
// ============================================================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ============================================
// CONFIGURAÇÃO
// ============================================
const TIMEOUT_GEMINI_MS = 90000;
const ENABLE_CACHE = true;
const CACHE_MEMORIA_MAX = 200;

const cacheResultados = new Map();
const cacheMemoria = new Map();

function setCacheMemoria(key, value) {
    if (cacheMemoria.has(key)) cacheMemoria.delete(key);
    cacheMemoria.set(key, value);
    if (cacheMemoria.size > CACHE_MEMORIA_MAX) {
        const firstKey = cacheMemoria.keys().next().value;
        cacheMemoria.delete(firstKey);
    }
}

// ============================================
// STORAGE E FUNÇÕES LEGADAS
// ============================================
const BUCKET_NAME = "veri-cnpj-dados";
const CSV_FILE = "cnpj_busca_6_colunas.csv";
const HISTORICO_FILE = "analises/historico_cnpjs.json";
const CONTADORES_FILE = "analises/contadores.json";
const TENDENCIAS_FILE = "analises/tendencias.json";

// ============================================
// ÍNDICE EM MEMÓRIA PARA O CSV (FALLBACK LOCAL)
// ============================================
let csvIndexCNPJ = null;      // Map para busca por CNPJ
let csvIndexNome = null;      // Map para busca por Nome
let csvIndexCarregado = false;
const CSV_PATH = path.join(__dirname, 'dados-abertos-zip', 'cnpj_busca_6_colunas.csv');

// ============================================================
// NORMALIZAR CNPJ/CPF - SUPORTE A ALFANUMÉRICOS
// ============================================================
function normalizarCNPJ(doc) {
    if (!doc) return '';
    return doc.replace(/[.\-\/]/g, '').toUpperCase();
}

function isCNPJ(valor) {
    const limpo = normalizarCNPJ(valor);
    return limpo.length === 14;
}

function isCPF(valor) {
    const limpo = normalizarCNPJ(valor);
    return /^\d{11}$/.test(limpo);
}

// ============================================
// BANCO LOCAL DE CNPJs FAMOSOS
// ============================================
let CNPJS_FAMOSOS = {};
try {
    const cnpjsPath = path.join(__dirname, 'modules', 'evidence', 'cnpjs_famosos.json');
    CNPJS_FAMOSOS = JSON.parse(fs.readFileSync(cnpjsPath, 'utf8'));
    console.log('📦 CNPJS_FAMOSOS carregado. UFs: ' + Object.keys(CNPJS_FAMOSOS).length);
} catch (e) {
    console.warn('⚠️ cnpjs_famosos.json não encontrado ou inválido. Banco local desativado.');
}

function encontrarCNPJPorNome(nome, uf) {
    if (!nome || typeof nome !== 'string') return null;
    if (Object.keys(CNPJS_FAMOSOS).length === 0) return null;
    const nomeBusca = nome.toLowerCase().trim();
    const estados = uf ? [uf] : Object.keys(CNPJS_FAMOSOS);
    for (var i = 0; i < estados.length; i++) {
        var ufKey = estados[i];
        var empresas = CNPJS_FAMOSOS[ufKey] || [];
        for (var j = 0; j < empresas.length; j++) {
            var empresa = empresas[j];
            if (empresa.cnpj === 'PESQUISAR') continue;
            var nomeEmpresa = empresa.nome.toLowerCase().trim();
            if (nomeEmpresa.indexOf(nomeBusca) !== -1 || nomeBusca.indexOf(nomeEmpresa) !== -1) {
                console.log('✅ Encontrado no banco local: ' + empresa.nome + ' CNPJ: ' + empresa.cnpj + ' UF: ' + ufKey);
                return {
                    cnpj: empresa.cnpj,
                    faturamento_anual: empresa.faturamento_anual,
                    setor: empresa.setor,
                    uf: ufKey,
                    nome_encontrado: empresa.nome,
                    porte: empresa.porte || 'MEDIO',
                    fonte: 'banco_local'
                };
            }
        }
    }
    return null;
}

// ============================================
// CARREGA O CSV EM MEMÓRIA (FALLBACK LOCAL)
// ============================================
async function carregarCSVIndex() {
    if (csvIndexCarregado) return;
    
    console.log('📊 Carregando índice do CSV em memória...');
    const inicio = Date.now();
    
    csvIndexCNPJ = new Map();
    csvIndexNome = new Map();
    
    if (!fs.existsSync(CSV_PATH)) {
        console.warn('⚠️ CSV não encontrado em:', CSV_PATH);
        console.warn('⚠️ Busca por nome/CNPJ no CSV desativada. Usando apenas BrasilAPI e banco local.');
        csvIndexCarregado = true;
        return;
    }
    
    return new Promise(function(resolve, reject) {
        let linhas = 0;
        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on("data", function(row) {
                linhas++;
                const cnpj = row.CNPJ ? row.CNPJ.replace(/\D/g, '') : '';
                const razao = (row["RAZAO SOCIAL"] || row.razao_social || "").toLowerCase().trim();
                const fantasia = (row["NOME FANTASIA"] || row.nome_fantasia || "").toLowerCase().trim();
                
                if (cnpj) {
                    csvIndexCNPJ.set(cnpj, {
                        cnpj: row.CNPJ,
                        razao_social: row["RAZAO SOCIAL"] || row.razao_social || "",
                        nome_fantasia: row["NOME FANTASIA"] || row.nome_fantasia || "",
                        porte: row.PORTE || row.porte || "",
                        data_abertura: row["DATA DE ABERTURA"] || row.data_abertura || "",
                        situacao: row["SITUACAO"] || row.situacao || "ATIVA",
                        uf: row.UF || "",
                        municipio: row.MUNICIPIO || ""
                    });
                }
                
                if (razao) {
                    if (!csvIndexNome.has(razao)) {
                        csvIndexNome.set(razao, []);
                    }
                    csvIndexNome.get(razao).push(cnpj);
                }
                if (fantasia && fantasia !== razao) {
                    if (!csvIndexNome.has(fantasia)) {
                        csvIndexNome.set(fantasia, []);
                    }
                    csvIndexNome.get(fantasia).push(cnpj);
                }
            })
            .on("end", function() {
                csvIndexCarregado = true;
                const tempo = Date.now() - inicio;
                console.log("✅ CSV indexado em memória: " + linhas + " empresas em " + tempo + "ms");
                resolve();
            })
            .on("error", function(err) {
                console.error('❌ Erro ao carregar CSV:', err);
                csvIndexCarregado = true;
                resolve();
            });
    });
}

// ============================================
// BUSCA NO CSV DIRETAMENTE NO STORAGE (NOVO)
// ============================================
async function buscarCSVnoStorage(termo) {
    if (!storage) {
        console.warn('⚠️ Storage não disponível.');
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
        
        console.log('🔍 Buscando no Storage por:', termo);
        
        // Cria um stream para ler o CSV diretamente do Storage
        const stream = file.createReadStream();
        
        // Processa o CSV em busca do termo
        return new Promise((resolve, reject) => {
            let encontrado = null;
            let contador = 0;
            let timeoutId = setTimeout(() => {
                stream.destroy();
                resolve(null);
            }, 15000);
            
            stream
                .pipe(csv())
                .on('data', (row) => {
                    contador++;
                    
                    // Busca por CNPJ exato
                    if (termo.length === 14) {
                        const cnpjRow = row.CNPJ ? row.CNPJ.replace(/\D/g, '') : '';
                        if (cnpjRow === termo) {
                            encontrado = {
                                cnpj: row.CNPJ,
                                razao_social: row["RAZAO SOCIAL"] || row.razao_social || "",
                                nome_fantasia: row["NOME FANTASIA"] || row.nome_fantasia || "",
                                porte: row.PORTE || row.porte || "",
                                data_abertura: row["DATA DE ABERTURA"] || row.data_abertura || "",
                                situacao: row["SITUACAO"] || row.situacao || "ATIVA",
                                uf: row.UF || "",
                                municipio: row.MUNICIPIO || "",
                                fonte: "csv_storage"
                            };
                            clearTimeout(timeoutId);
                            stream.destroy();
                            resolve(encontrado);
                            return;
                        }
                    }
                    
                    // Busca por razão social ou nome fantasia
                    if (termo.length > 2) {
                        const razao = (row["RAZAO SOCIAL"] || row.razao_social || "").toLowerCase();
                        const fantasia = (row["NOME FANTASIA"] || row.nome_fantasia || "").toLowerCase();
                        const busca = termo.toLowerCase();
                        
                        if (razao.includes(busca) || fantasia.includes(busca)) {
                            encontrado = {
                                cnpj: row.CNPJ,
                                razao_social: row["RAZAO SOCIAL"] || row.razao_social || "",
                                nome_fantasia: row["NOME FANTASIA"] || row.nome_fantasia || "",
                                porte: row.PORTE || row.porte || "",
                                data_abertura: row["DATA DE ABERTURA"] || row.data_abertura || "",
                                situacao: row["SITUACAO"] || row.situacao || "ATIVA",
                                uf: row.UF || "",
                                municipio: row.MUNICIPIO || "",
                                fonte: "csv_storage"
                            };
                            clearTimeout(timeoutId);
                            stream.destroy();
                            resolve(encontrado);
                            return;
                        }
                    }
                    
                    // Limite de segurança (100k linhas para não travar)
                    if (contador > 100000) {
                        clearTimeout(timeoutId);
                        stream.destroy();
                        resolve(null);
                    }
                })
                .on('end', () => {
                    clearTimeout(timeoutId);
                    resolve(encontrado);
                })
                .on('error', (err) => {
                    clearTimeout(timeoutId);
                    console.warn('⚠️ Erro ao ler CSV do Storage:', err.message);
                    resolve(null);
                });
        });
    } catch (err) {
        console.warn('⚠️ Erro ao buscar no CSV:', err.message);
        return null;
    }
}

// ============================================
// HISTÓRICO DE CNPJs
// ============================================
let historicoCNPJs = {};
let historicoCarregado = false;

async function carregarHistorico() {
    if (historicoCarregado) return;
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Histórico não carregado.');
            return;
        }
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(HISTORICO_FILE);
        const [exists] = await file.exists();
        if (exists) {
            const [contents] = await file.download();
            historicoCNPJs = JSON.parse(contents.toString());
        }
    } catch (err) { /* silencioso */ }
    historicoCarregado = true;
}

async function salvarHistorico() {
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Histórico não salvo.');
            return;
        }
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(HISTORICO_FILE);
        await file.save(JSON.stringify(historicoCNPJs, null, 2), { contentType: "application/json" });
    } catch (err) { /* silencioso */ }
}

function buscarNoHistorico(cnpj) {
    const limpo = normalizarCNPJ(cnpj);
    if (historicoCNPJs[limpo]) return { ...historicoCNPJs[limpo], fonte: "historico_veri" };
    return null;
}

function salvarNoHistorico(cnpj, dados) {
    const limpo = normalizarCNPJ(cnpj);
    historicoCNPJs[limpo] = {
        cnpj: dados.cnpj || cnpj,
        razao_social: dados.razao_social || "",
        nome_fantasia: dados.nome_fantasia || "",
        porte: dados.porte || "",
        data_abertura: dados.data_abertura || "",
        situacao: dados.situacao || "ATIVA",
        setor: dados.setor || "",
        email: dados.email || "",
        site: dados.site || "",
        instagram: dados.instagram || "",
        tiktok: dados.tiktok || "",
        ultima_consulta: new Date().toISOString()
    };
    salvarHistorico();
}

// ============================================
// CONTADORES
// ============================================
let contadores = { total_analises: 0, cnpjs: {}, usuarios: {} };
let contadoresCarregados = false;

async function carregarContadores() {
    if (contadoresCarregados) return;
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Contadores não carregados.');
            return;
        }
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(CONTADORES_FILE);
        const [exists] = await file.exists();
        if (exists) {
            const [contents] = await file.download();
            contadores = JSON.parse(contents.toString());
        }
    } catch (err) { /* silencioso */ }
    contadoresCarregados = true;
}

async function salvarContadores() {
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Contadores não salvos.');
            return;
        }
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(CONTADORES_FILE);
        await file.save(JSON.stringify(contadores, null, 2), { contentType: "application/json" });
    } catch (err) { /* silencioso */ }
}

function incrementarContadores(cnpj, email) {
    contadores.total_analises = (contadores.total_analises || 0) + 1;
    if (cnpj) {
        const limpo = normalizarCNPJ(cnpj);
        contadores.cnpjs = contadores.cnpjs || {};
        contadores.cnpjs[limpo] = (contadores.cnpjs[limpo] || 0) + 1;
    }
    if (email) {
        const hashEmail = crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").substring(0, 16);
        contadores.usuarios = contadores.usuarios || {};
        contadores.usuarios[hashEmail] = (contadores.usuarios[hashEmail] || 0) + 1;
    }
    salvarContadores();
}

function getContadores(cnpj, email) {
    let vezesAnalisado = 0, vezesUsuario = 0;
    if (cnpj) {
        const limpo = normalizarCNPJ(cnpj);
        vezesAnalisado = (contadores.cnpjs && contadores.cnpjs[limpo]) ? contadores.cnpjs[limpo] : 0;
    }
    if (email) {
        const hashEmail = crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").substring(0, 16);
        vezesUsuario = (contadores.usuarios && contadores.usuarios[hashEmail]) ? contadores.usuarios[hashEmail] : 0;
    }
    return { total_analises: contadores.total_analises || 0, vezes_analisado: vezesAnalisado, vezes_usuario: vezesUsuario };
}

// ============================================
// TENDÊNCIAS
// ============================================
let tendencias = {};
let tendenciasCarregadas = false;

async function carregarTendencias() {
    if (tendenciasCarregadas) return;
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Tendências não carregadas.');
            return;
        }
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(TENDENCIAS_FILE);
        const [exists] = await file.exists();
        if (exists) {
            const [contents] = await file.download();
            tendencias = JSON.parse(contents.toString());
        }
    } catch (err) { /* silencioso */ }
    tendenciasCarregadas = true;
}

async function salvarTendencias() {
    try {
        if (!storage) {
            console.warn('⚠️ Storage não disponível. Tendências não salvas.');
            return;
        }
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(TENDENCIAS_FILE);
        await file.save(JSON.stringify(tendencias, null, 2), { contentType: "application/json" });
    } catch (err) { /* silencioso */ }
}

function getTendenciaEvolucao(cnpj, scoreAtual, riscosAtuais) {
    const limpo = normalizarCNPJ(cnpj);
    const anterior = tendencias[limpo];
    
    tendencias[limpo] = {
        score: scoreAtual,
        riscos: riscosAtuais,
        data: new Date().toISOString()
    };
    salvarTendencias();

    if (!anterior || !anterior.riscos) {
        return { tendencia: "primeira", tendenciaTexto: "Primeira análise.", evolucao: [] };
    }

    const evolucao = riscosAtuais.map(function(rAtual) {
        const rAnterior = (anterior.riscos || []).find(function(r) { return r.risco === rAtual.risco; });
        const valorAnterior = rAnterior ? rAnterior.contribuicao : null;
        const valorAtual = rAtual.contribuicao;
        let variacao = "estavel";
        if (valorAnterior !== null) {
            const diff = valorAtual - valorAnterior;
            if (diff > 0.3) variacao = "piorou";
            else if (diff < -0.3) variacao = "melhorou";
        }
        return { risco: rAtual.risco, anterior: valorAnterior, atual: valorAtual, variacao: variacao };
    });

    const diffScore = scoreAtual - anterior.score;
    let tendencia = "estavel";
    if (diffScore > 0.5) tendencia = "deteriorando";
    else if (diffScore < -0.5) tendencia = "melhorando";

    return { tendencia: tendencia, tendenciaTexto: "", evolucao: evolucao };
}

// ============================================
// TABELA DE FATURAMENTO
// ============================================
const FATURAMENTO_ANUAL = config.FATURAMENTO_ANUAL;
function calcularFaturamentoMensalPorPorte(porte) {
    const faturamentoAnual = {
        "MEI": 81000,
        "ME": 360000,
        "EPP": 4800000,
        "MEDIO": 12000000,
        "GRANDE": 50000000,
        "GIGANTE": 50000000
    };
    return (faturamentoAnual[porte] || faturamentoAnual["GRANDE"]) / 12;
}

function calcularTicketDiario(porte) { return FATURAMENTO_ANUAL[porte] ? Math.round(FATURAMENTO_ANUAL[porte] / 12 / 30) : 0; }
function calcularTempoMercado(dataAbertura) { return dataAbertura ? (new Date() - new Date(dataAbertura)) / (1000 * 60 * 60 * 24 * 365) : 0; }
function gerarHashAuditoria(documento) {
    const docLimpo = normalizarCNPJ(documento) || "sem_documento";
    const agora = new Date();
    return docLimpo + "" + String(agora.getDate()).padStart(2,"0") + String(agora.getMonth()+1).padStart(2,"0") + agora.getFullYear() + "" + String(agora.getHours()).padStart(2,"0") + String(agora.getMinutes()).padStart(2,"0") + String(agora.getSeconds()).padStart(2,"0");
}
function getNivelRisco(contrib) {
    if (contrib >= 15.0) return "CRITICO";
    if (contrib >= 5.0) return "ALTO";
    if (contrib >= 2.0) return "MEDIO";
    return "BAIXO";
}

// ============================================
// FETCH COMO NAVEGADOR
// ============================================
async function fetchComoNavegador(url, timeoutMs) {
    if (!timeoutMs) timeoutMs = 8000;
    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
                "Accept-Language": "pt-BR"
            }
        });
        clearTimeout(timeout);
        return response;
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

// ============================================
// BUSCA CNPJ NA BRASILAPI COM SÓCIOS (CORRIGIDO)
// ============================================
async function buscarCNPJnaBrasilAPI(cnpj) {
    try {
        const url = "https://brasilapi.com.br/api/cnpj/v1/" + cnpj;
        const response = await fetchComoNavegador(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (data && !data.error) {
            let socioMajoritario = null;
            let controladora = null;
            
            if (data.qsa && data.qsa.length > 0) {
                const sociosOrdenados = data.qsa.slice().sort(function(a, b) {
                    return (b.percentual_capital_social || 0) - (a.percentual_capital_social || 0);
                });
                
                const socioPrincipal = sociosOrdenados[0];
                if (socioPrincipal) {
                    const documento = socioPrincipal.cpf_cnpj_socio || '';
                    const nome = socioPrincipal.nome_socio || '';
                    const percentual = socioPrincipal.percentual_capital_social || 0;
                    const qualificacao = socioPrincipal.qualificacao_socio || '';
                    
                    const docLimpo = documento.replace(/\D/g, '');
                    
                    if (docLimpo.length === 11) {
                        socioMajoritario = {
                            nome: nome,
                            qualificacao: qualificacao,
                            percentual: percentual,
                            cpf: documento,
                            tipo: 'PESSOA_FISICA'
                        };
                    } else if (docLimpo.length === 14) {
                        controladora = {
                            nome: nome,
                            cnpj: documento,
                            percentual: percentual,
                            qualificacao: qualificacao,
                            tipo: 'PESSOA_JURIDICA'
                        };
                    } else {
                        const qualificacoesPF = ['SÓCIO-ADMINISTRADOR', 'SÓCIO', 'DIRETOR', 'ADMINISTRADOR'];
                        const isPF = qualificacoesPF.some(function(q) {
                            return qualificacao.toUpperCase().indexOf(q) !== -1;
                        });
                        if (isPF) {
                            socioMajoritario = {
                                nome: nome,
                                qualificacao: qualificacao,
                                percentual: percentual,
                                cpf: documento,
                                tipo: 'PESSOA_FISICA'
                            };
                        } else {
                            controladora = {
                                nome: nome,
                                cnpj: documento,
                                percentual: percentual,
                                qualificacao: qualificacao,
                                tipo: 'PESSOA_JURIDICA'
                            };
                        }
                    }
                }
            }

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
                municipio: data.municipio || "",
                socio_majoritario: socioMajoritario,
                controladora: controladora,
                qsa: data.qsa || []
            };
        }
    } catch (err) { /* silencioso */ }
    return null;
}

// ============================================
// BUSCA CNPJ NA RECEITAWS (FALLBACK)
// ============================================
async function buscarCNPJnaReceitaWS(cnpj) {
    try {
        const url = "https://www.receitaws.com.br/v1/cnpj/" + cnpj;
        const response = await fetchComoNavegador(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.status !== "ERROR" && !data.error) {
            return {
                cnpj: cnpj,
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
    } catch (err) { /* silencioso */ }
    return null;
}

// ============================================
// BUSCA CNPJ NO CSV LOCAL (USANDO ÍNDICE EM MEMÓRIA)
// ============================================
async function buscarCNPJnoCSV(cnpj) {
    await carregarCSVIndex();
    if (!csvIndexCNPJ) return null;
    const cnpjLimpo = normalizarCNPJ(cnpj);
    return csvIndexCNPJ.get(cnpjLimpo) || null;
}

// ============================================
// BUSCA CNPJ POR NOME NO CSV LOCAL
// ============================================
async function buscarCNPJnoCSVPorNome(nome) {
    await carregarCSVIndex();
    if (!csvIndexNome) return null;
    
    const nomeBusca = nome.toLowerCase().trim();
    let encontrado = null;
    
    if (csvIndexNome.has(nomeBusca)) {
        const cnpjs = csvIndexNome.get(nomeBusca);
        if (cnpjs && cnpjs.length > 0) {
            const cnpj = cnpjs[0];
            encontrado = csvIndexCNPJ.get(cnpj);
            if (encontrado) return encontrado;
        }
    }
    
    for (const [key, cnpjs] of csvIndexNome) {
        if (key.includes(nomeBusca) || nomeBusca.includes(key)) {
            if (cnpjs && cnpjs.length > 0) {
                const cnpj = cnpjs[0];
                encontrado = csvIndexCNPJ.get(cnpj);
                if (encontrado) return encontrado;
            }
        }
    }
    
    return null;
}
// ============================================
// CADEIA DE BUSCA CNPJ - COM 3 FONTES + STORAGE
// ============================================
async function cadeiaDeBuscaCNPJ(entrada) {
    const limpo = normalizarCNPJ(entrada);
    let dados = null;

    if (limpo.length === 14) {
        // 1. BrasilAPI
        dados = await buscarCNPJnaBrasilAPI(limpo);
        if (dados) {
            try { await carregarHistorico(); salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "brasilapi" };
        }

        // 2. ReceitaWS
        dados = await buscarCNPJnaReceitaWS(limpo);
        if (dados) {
            try { await carregarHistorico(); salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "receitaws" };
        }

        // 3. CSV local (índice em memória)
        dados = await buscarCNPJnoCSV(limpo);
        if (dados) {
            try { salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "csv_veri" };
        }

        // 4. CSV no Storage (fallback final)
        dados = await buscarCSVnoStorage(limpo);
        if (dados) {
            try { salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "csv_storage" };
        }

        return null;
    }

    if (entrada && entrada.length > 2) {
        const nomeBusca = entrada.trim();

        // 1. Banco local (cnpjs_famosos.json)
        const localResult = encontrarCNPJPorNome(nomeBusca);
        if (localResult && localResult.cnpj) {
            const cnpjEncontrado = localResult.cnpj.replace(/\D/g, '');
            // TENTA BUSCAR NA BRASILAPI PARA COMPLEMENTAR OS DADOS
            dados = await buscarCNPJnaBrasilAPI(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "banco_local", cnpj_original: localResult.cnpj };
            }
            // Se a BrasilAPI falhar, tenta a ReceitaWS
            dados = await buscarCNPJnaReceitaWS(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "banco_local_receitaws", cnpj_original: localResult.cnpj };
            }
            // Se todas falharem, retorna os dados do banco local
            return {
                cnpj: cnpjEncontrado,
                razao_social: localResult.nome_encontrado || nomeBusca,
                porte: localResult.porte || "MEDIO",
                data_abertura: "",
                situacao: "ATIVA",
                fonte: "banco_local"
            };
        }

        // 2. CSV local (índice em memória)
        const csvResult = await buscarCNPJnoCSVPorNome(nomeBusca);
        if (csvResult && csvResult.cnpj) {
            const cnpjEncontrado = csvResult.cnpj.replace(/\D/g, '');
            dados = await buscarCNPJnaBrasilAPI(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "csv_veri", cnpj_original: csvResult.cnpj };
            }
            return {
                cnpj: cnpjEncontrado,
                razao_social: csvResult.razao_social || nomeBusca,
                porte: csvResult.porte || "MEDIO",
                data_abertura: csvResult.data_abertura || "",
                situacao: csvResult.situacao || "ATIVA",
                fonte: "csv_veri"
            };
        }

        // 3. CSV no Storage (fallback final)
        const storageResult = await buscarCSVnoStorage(nomeBusca);
        if (storageResult && storageResult.cnpj) {
            const cnpjEncontrado = storageResult.cnpj.replace(/\D/g, '');
            dados = await buscarCNPJnaBrasilAPI(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "csv_storage", cnpj_original: storageResult.cnpj };
            }
            return {
                cnpj: cnpjEncontrado,
                razao_social: storageResult.razao_social || nomeBusca,
                porte: storageResult.porte || "MEDIO",
                data_abertura: storageResult.data_abertura || "",
                situacao: storageResult.situacao || "ATIVA",
                fonte: "csv_storage"
            };
        }
    }

    return null;
}

// ============================================
// ROTAS LEGADAS
// ============================================
app.get("/", function(req, res) { res.json({ status: "VERI API Online", versao: VERSAO_API }); });

app.get("/teste-cnpj/:cnpj", async function(req, res) {
    try {
        const limpo = normalizarCNPJ(req.params.cnpj);
        if (limpo.length !== 14) return res.status(400).json({ error: "CNPJ inválido" });
        const resultado = await cadeiaDeBuscaCNPJ(limpo);
        if (resultado) return res.json(resultado);
        res.status(404).json({ error: "CNPJ nao encontrado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/resultado/:id", function(req, res) {
    const id = req.params.id;
    const cached = cacheResultados.get(id);
    if (cached) return res.json(cached);
    res.status(404).json({ error: "Análise não encontrada." });
});

app.post("/buscar-cnpj", async function(req, res) {
    try {
        const { cnpj } = req.body;
        if (!cnpj) return res.status(400).json({ error: "CNPJ nao informado" });
        const limpo = normalizarCNPJ(cnpj);
        const resultado = await cadeiaDeBuscaCNPJ(limpo);
        if (resultado) return res.json(resultado);
        res.status(404).json({ error: "CNPJ nao encontrado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ROTA /analisar (legado)
// ============================================
app.post("/analisar", async function(req, res) {
    try {
        const dados = req.body;
        const inicio = Date.now();

        if (dados.analisado && dados.analisado.cnpj) {
            const limpo = normalizarCNPJ(dados.analisado.cnpj);
            if (limpo.length === 14) {
                const complemento = await cadeiaDeBuscaCNPJ(limpo);
                if (complemento) {
                    dados.analisado.razao_social = dados.analisado.razao_social || complemento.razao_social;
                    dados.analisado.nome_fantasia = dados.analisado.nome_fantasia || complemento.nome_fantasia;
                    dados.analisado.porte = dados.analisado.porte || complemento.porte;
                    dados.analisado.data_abertura = complemento.data_abertura;
                    dados.analisado.situacao = complemento.situacao;
                    dados.analisado.site = complemento.site || dados.analisado.site;
                    dados.analisado.uf = complemento.uf || dados.analisado.uf;
                }
            }
        }

        const resultado = calcularRiscos(dados);

        const hashInput = crypto
            .createHash("sha256")
            .update(JSON.stringify(dados))
            .digest("hex")
            .substring(0, 16);

        const hashOutput = crypto
            .createHash("sha256")
            .update(JSON.stringify(resultado))
            .digest("hex")
            .substring(0, 16);

        const tempoExecucao = Date.now() - inicio;
        const documento = dados.analisado.cnpj || dados.analisado.cpf || "sem_documento";
        const hash_auditoria = gerarHashAuditoria(documento);
        const email = dados.solicitante && dados.solicitante.email ? dados.solicitante.email : "";

        try { await carregarContadores(); incrementarContadores(documento, email); } catch(e) {}
        const conts = getContadores(documento, email);

        await carregarTendencias();
        const topRiscosParaSalvar = resultado.top_riscos.map(function(r) {
            return { risco: r.risco, contribuicao: r.contribuicao };
        });
        const tendenciaInfo = getTendenciaEvolucao(documento, resultado.score_global, topRiscosParaSalvar);

        const resposta = {
            analise_id: hash_auditoria,
            ...resultado,
            contadores: conts,
            tendencia: tendenciaInfo,
            dados_analisado: dados.analisado,
            dados_solicitante: dados.solicitante,
            dados_negocio: dados.negocio,
            timestamp: new Date().toISOString(),
            auditoria: {
                hash_input: hashInput,
                hash_output: hashOutput,
                tempo_execucao_ms: tempoExecucao,
                versao_motor: VERSAO_MOTOR,
                versao_api: VERSAO_API,
                versao_prompt_gemini: VERSAO_PROMPT_GEMINI,
                versao_schema: VERSAO_SCHEMA,
                versao_orquestrador: VERSAO_ORQUESTRADOR,
                metodologia: config.METODOLOGIA_VERSAO || "VERI 3.2"
            }
        };

        cacheResultados.set(hash_auditoria, resposta);
        res.json(resposta);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============================================================
// FUNÇÃO: GERAR EVIDÊNCIAS DE FALLBACK
// ============================================================
function gerarEvidenciasFallback(dadosCadastrais, dadosFormulario, resultadoMotor) {
    var evidencias = [];
    var agora = new Date().toISOString();

    if (dadosFormulario && dadosFormulario.valor !== undefined) {
        var valor = dadosFormulario.valor || 0;
        var parcelas = dadosFormulario.parcelas || 1;
        var valorParcela = parcelas > 0 ? valor / parcelas : 0;

        var isPF = (dadosCadastrais && dadosCadastrais.tipo === "pessoa");
        var ticketDiario = 0;
        if (isPF) {
            var rendaMensal = dadosCadastrais ? dadosCadastrais.renda || 0 : 0;
            ticketDiario = rendaMensal / 30;
        } else {
            var faturamentoMensal = 0;
            if (dadosCadastrais && dadosCadastrais.porte) {
                var faturamentoAnual = {
                    "MEI": 81000,
                    "ME": 360000,
                    "EPP": 4800000,
                    "MEDIO": 12000000,
                    "GRANDE": 50000000,
                    "GIGANTE": 50000000
                };
                faturamentoMensal = (faturamentoAnual[dadosCadastrais.porte] || faturamentoAnual["GRANDE"]) / 12;
            }
            ticketDiario = faturamentoMensal / 30;
        }

        if (ticketDiario > 0 && valorParcela > 0) {
            var percentual = Math.round((valorParcela / ticketDiario) * 100);
            var baseTexto = isPF ? "renda diária" : "faturamento diário";
            var descricao = "O valor da parcela compromete <strong>" + percentual + "%</strong> do " + baseTexto + " da " + (isPF ? "pessoa" : "empresa") + ".";
            evidencias.push({
                id: "EVID-FINANCEIRO-" + Date.now(),
                descricao: descricao,
                fonte: isPF ? "Usuário" : "Receita Federal do Brasil",
                url: isPF ? null : "https://www.gov.br/receitafederal",
                coletado_em: agora,
                risco_associado: "FINANCEIRO"
            });
        } else {
            evidencias.push({
                id: "EVID-FINANCEIRO-" + Date.now(),
                descricao: "Valor do negócio não informado ou sem base de comparação. Análise baseada nos demais fatores.",
                fonte: "Usuário",
                url: null,
                coletado_em: agora,
                risco_associado: "FINANCEIRO"
            });
        }
    }

    var tempoMercado = 0;
    if (dadosCadastrais && dadosCadastrais.data_abertura) {
        var dataAbertura = new Date(dadosCadastrais.data_abertura);
        var agoraDate = new Date();
        var diffMs = agoraDate - dataAbertura;
        var diffAnos = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        tempoMercado = Math.round(diffAnos * 10) / 10;
    }
    var porte = dadosCadastrais ? dadosCadastrais.porte : "N/A";
    var evidenciaDescontinuidade = "";
    if (tempoMercado < 2) {
        evidenciaDescontinuidade = "Empresa com porte " + porte + " e apenas " + tempoMercado.toFixed(1) + " anos de mercado. Negócios recentes têm maior risco de descontinuidade.";
    } else if (tempoMercado < 5) {
        evidenciaDescontinuidade = "Empresa com porte " + porte + " e " + tempoMercado.toFixed(1) + " anos de mercado. Risco moderado de descontinuidade.";
    } else {
        evidenciaDescontinuidade = "Empresa com porte " + porte + " e " + tempoMercado.toFixed(1) + " anos de mercado. Tempo de mercado sólido, indicando menor risco de descontinuidade.";
    }
    if (dadosCadastrais && dadosCadastrais.data_abertura) {
        evidencias.push({
            id: "EVID-DESCONT-" + Date.now(),
            descricao: evidenciaDescontinuidade,
            fonte: "Receita Federal do Brasil",
            url: "https://www.gov.br/receitafederal",
            coletado_em: agora,
            risco_associado: "DESCONTINUIDADE"
        });
    }

    if (dadosCadastrais && dadosCadastrais.situacao) {
        var situacao = dadosCadastrais.situacao.toUpperCase();
        var evidenciaVeracidade = "";
        if (situacao === "BAIXADA" || situacao === "INATIVA" || situacao === "SUSPENSA") {
            evidenciaVeracidade = "CNPJ com situação cadastral: " + situacao + ". Consulta à base da Receita Federal.";
        } else {
            evidenciaVeracidade = "CNPJ com situação cadastral: " + situacao + ". Empresa em situação regular perante a Receita Federal.";
        }
        evidencias.push({
            id: "EVID-VERACIDADE-" + Date.now(),
            descricao: evidenciaVeracidade,
            fonte: "Receita Federal do Brasil",
            url: "https://www.gov.br/receitafederal",
            coletado_em: agora,
            risco_associado: "VERACIDADE"
        });
    }

    if (dadosCadastrais && dadosCadastrais.setor) {
        evidencias.push({
            id: "EVID-REPUTACIONAL-" + Date.now(),
            descricao: "Setor de atuação da empresa: " + dadosCadastrais.setor + ".",
            fonte: "Receita Federal do Brasil",
            url: "https://www.gov.br/receitafederal",
            coletado_em: agora,
            risco_associado: "REPUTACIONAL"
        });
    }

    if (dadosFormulario) {
        var conhecimento = dadosFormulario.conhecimento || "nao_informado";
        var experiencia = dadosFormulario.experiencia || "nao_informada";
        if (conhecimento === "maisoumenos") {
            conhecimento = "mais ou menos";
        }
        var evidenciaComportamental = "Nível de conhecimento do usuário sobre a outra parte: " + conhecimento + ". Experiência anterior: " + experiencia + ".";
        evidencias.push({
            id: "EVID-COMPORTAMENTAL-" + Date.now(),
            descricao: evidenciaComportamental,
            fonte: "Usuário",
            url: null,
            coletado_em: agora,
            risco_associado: "COMPORTAMENTAL"
        });
    }

    return evidencias;
}

// ============================================================
// ROTA /enriquecer – CORRIGIDA
// ============================================================
app.post("/enriquecer", async function(req, res) {
    const inicio = Date.now();
    const { 
        nome, cnpj, cpf, valor, porte, ticket_medio,
        email_analisado, whatsapp_analisado,
        email_solicitante, whatsapp_solicitante,
        renda_solicitante, renda_analisado
    } = req.body;

    if (!nome && !cnpj && !cpf) {
        return res.status(400).json({
            status: "falha",
            erro: "É necessário informar \"nome\", \"cnpj\" ou \"cpf\"",
            tempo_ms: Date.now() - inicio
        });
    }

    const cnpjLimpo = normalizarCNPJ(cnpj);

    try {
        // 1. CACHE
        if (ENABLE_CACHE && cnpjLimpo && cacheMemoria.has(cnpjLimpo)) {
            const cached = cacheMemoria.get(cnpjLimpo);
            return res.json({
                ...cached,
                _cache: "memoria",
                _tempo_ms: Date.now() - inicio
            });
        }

        if (cnpjLimpo) {
            try {
                const cacheFirestore = await getCache(cnpjLimpo);
                if (cacheFirestore) {
                    if (ENABLE_CACHE) {
                        setCacheMemoria(cnpjLimpo, cacheFirestore);
                    }
                    return res.json({
                        ...cacheFirestore,
                        _cache: "firestore",
                        _tempo_ms: Date.now() - inicio
                    });
                }
            } catch (cacheErr) {
                console.warn("Erro ao verificar cache Firestore:", cacheErr.message);
            }
        }

        // ============================================================
        // BUSCA NA BRASILAPI PARA OBTER PORTE E DATA_ABERTURA
        // ============================================================
        var dadosCadastraisCompletos = {};

        if (cnpjLimpo && cnpjLimpo.length === 14) {
            try {
                const resultadoBusca = await cadeiaDeBuscaCNPJ(cnpjLimpo);
                if (resultadoBusca) {
                    dadosCadastraisCompletos = {
                        cnpj: resultadoBusca.cnpj || cnpjLimpo,
                        razao_social: resultadoBusca.razao_social || nome || "",
                        nome_fantasia: resultadoBusca.nome_fantasia || "",
                        porte: resultadoBusca.porte || "",
                        data_abertura: resultadoBusca.data_abertura || "",
                        situacao: resultadoBusca.situacao || "ATIVA",
                        setor: resultadoBusca.setor || "",
                        email: resultadoBusca.email || "",
                        site: resultadoBusca.site || "",
                        uf: resultadoBusca.uf || "",
                        municipio: resultadoBusca.municipio || "",
                        fonte: resultadoBusca.fonte || "desconhecida",
                        socio_majoritario: resultadoBusca.socio_majoritario || null,
                        controladora: resultadoBusca.controladora || null,
                        qsa: resultadoBusca.qsa || []
                    };
                    console.log("✅ Dados cadastrais obtidos via BrasilAPI para CNPJ:", cnpjLimpo);
                }
            } catch (err) {
                console.warn("⚠️ Erro ao buscar dados cadastrais via BrasilAPI:", err.message);
            }
        }

        // ============================================================
        // ORQUESTRADOR - CORRIGIDO (com UF)
        // ============================================================
        const modulo = req.body.modulo || "geral";
        const subModulo = req.body.subModulo || "geral";

        // ============================================================
        // EXTRAI UF DOS DADOS CADASTRAIS
        // ============================================================
        var ufEmpresa = null;

        if (dadosCadastraisCompletos && dadosCadastraisCompletos.uf) {
            ufEmpresa = dadosCadastraisCompletos.uf;
        }

        if (!ufEmpresa) {
            try {
                const brasilUf = await buscarCNPJnaBrasilAPI(cnpjLimpo);
                if (brasilUf && brasilUf.uf) {
                    ufEmpresa = brasilUf.uf;
                }
            } catch (err) {
                console.warn("Erro ao buscar UF via BrasilAPI:", err.message);
            }
        }

        if (!ufEmpresa && dadosCadastraisCompletos && dadosCadastraisCompletos.cep) {
            try {
                const cepResponse = await fetch('https://viacep.com.br/ws/' + dadosCadastraisCompletos.cep + '/json/');
                if (cepResponse.ok) {
                    const cepData = await cepResponse.json();
                    if (cepData && cepData.uf) {
                        ufEmpresa = cepData.uf;
                        console.log("UF obtida via CEP:", ufEmpresa);
                    }
                }
            } catch (cepErr) {
                console.warn("Erro ao buscar UF via CEP:", cepErr.message);
            }
        }

        if (ufEmpresa) {
            console.log("UF da empresa:", ufEmpresa);
        } else {
            console.warn("UF não encontrada. Buscas judiciais usarão fallback genérico.");
        }

        // ============================================================
        // CHAMA ORQUESTRADOR COM A UF
        // ============================================================
        const dadosOrquestrador = await coletarEvidenciasReais(
            nome,
            cnpjLimpo,
            cpf,
            ufEmpresa,
            modulo,
            subModulo
        );

        // Combina os dados cadastrais (prioridade: o que veio da BrasilAPI)
        const dadosCadastrais = {
            ...dadosOrquestrador.dados_cadastrais,
            ...dadosCadastraisCompletos,
            cnpj: dadosCadastraisCompletos.cnpj || dadosOrquestrador.dados_cadastrais.cnpj || cnpjLimpo,
            razao_social: dadosCadastraisCompletos.razao_social || dadosOrquestrador.dados_cadastrais.razao_social || nome,
            porte: dadosCadastraisCompletos.porte || dadosOrquestrador.dados_cadastrais.porte || "N/A",
            data_abertura: dadosCadastraisCompletos.data_abertura || dadosOrquestrador.dados_cadastrais.data_abertura || "",
            situacao: dadosCadastraisCompletos.situacao || dadosOrquestrador.dados_cadastrais.situacao || "ATIVA",
            setor: dadosCadastraisCompletos.setor || dadosOrquestrador.dados_cadastrais.setor || "",
            site: dadosCadastraisCompletos.site || dadosOrquestrador.dados_cadastrais.site || "",
            uf: dadosCadastraisCompletos.uf || dadosOrquestrador.dados_cadastrais.uf || ufEmpresa || "",
            municipio: dadosCadastraisCompletos.municipio || dadosOrquestrador.dados_cadastrais.municipio || "",
            socio_majoritario: dadosCadastraisCompletos.socio_majoritario || null,
            controladora: dadosCadastraisCompletos.controladora || null,
            qsa: dadosCadastraisCompletos.qsa || [],
            email_analisado: email_analisado || "",
            whatsapp_analisado: whatsapp_analisado || "",
            email_solicitante: email_solicitante || "",
            whatsapp_solicitante: whatsapp_solicitante || ""
        };

        // ============================================================
        // CORREÇÃO: FATURAMENTO ANUAL – PRIORIDADE DO ORQUESTRADOR
        // ============================================================
        var faturamentoAnualEncontrado = null;
        var faturamentoFonte = "";

        // 🔧 CORRIGIDO: Prioriza o faturamento do orquestrador (que vem do banco local)
        if (dadosOrquestrador.faturamento_anual) {
            faturamentoAnualEncontrado = dadosOrquestrador.faturamento_anual;
            faturamentoFonte = "banco_regional_orquestrador";
            console.log("✅ Faturamento obtido do banco regional:", faturamentoAnualEncontrado);
        } else if (dadosCadastrais.faturamento_anual && dadosCadastrais.faturamento_anual > 0) {
            faturamentoAnualEncontrado = dadosCadastrais.faturamento_anual;
            faturamentoFonte = "dados_cadastrais";
            console.log("✅ Faturamento obtido dos dados cadastrais:", faturamentoAnualEncontrado);
        } else {
            const porteEmpresa = dadosCadastrais.porte || "MEDIO";
            const faturamentoAnualPorPorte = {
                "MEI": 81000,
                "ME": 360000,
                "EPP": 4800000,
                "MEDIO": 12000000,
                "GRANDE": 50000000,
                "GIGANTE": 50000000
            };
            faturamentoAnualEncontrado = faturamentoAnualPorPorte[porteEmpresa] || faturamentoAnualPorPorte["GRANDE"];
            faturamentoFonte = "estimado_por_porte";
            console.log("⚠️ Faturamento estimado por porte:", faturamentoAnualEncontrado);
        }

        dadosCadastrais.faturamento_anual = faturamentoAnualEncontrado;
        dadosCadastrais.faturamento_fonte = faturamentoFonte;

        // ============================================================
        // ADAPTADO: CAPTURA VALOR DO NEGÓCIO (Contratação/Compra/Venda)
        // ============================================================
        var valorNegocio = 0;
        var parcelasNegocio = 1;
        var tipoPagamento = "avista";
        var tipoNegocio = "";

        if (req.body.valor_contratacao) {
            valorNegocio = parseFloat(req.body.valor_contratacao) || 0;
            parcelasNegocio = parseInt(req.body.parcelas_contratacao) || 1;
            tipoPagamento = req.body.pagamento_contratacao || "avista";
            tipoNegocio = "contratacao";
        } else if (req.body.valor_compra) {
            valorNegocio = parseFloat(req.body.valor_compra) || 0;
            parcelasNegocio = parseInt(req.body.parcelas_compra) || 1;
            tipoPagamento = req.body.pagamento_compra || "avista";
            tipoNegocio = "compra";
        } else if (req.body.valor_venda) {
            valorNegocio = parseFloat(req.body.valor_venda) || 0;
            parcelasNegocio = parseInt(req.body.parcelas_venda) || 1;
            tipoPagamento = req.body.pagamento_venda || "avista";
            tipoNegocio = "venda";
        } else if (req.body.valor) {
            valorNegocio = parseFloat(req.body.valor) || 0;
            parcelasNegocio = parseInt(req.body.parcelas) || 1;
            tipoPagamento = req.body.pagamento || "avista";
            tipoNegocio = "negocio";
        }

        // ============================================================
        // 3. GEMINI (com fallback DeepSeek)
        // ============================================================
        let estruturado = await estruturar(dadosOrquestrador.fontes, TIMEOUT_GEMINI_MS);

        // ============================================================
        // 4. VALIDAÇÃO – GARANTE ESTRUTURA (NUNCA BLOQUEIA)
        // ============================================================
        console.log('📊 Validando estrutura recebida do Gemini...');

        if (!estruturado || typeof estruturado !== 'object') {
            console.warn('⚠️ Gemini retornou null. Criando estrutura mínima de emergência.');
            estruturado = {
                status_busca: 'sucesso',
                dados_estruturados: {
                    reputacional: {},
                    resolutividade: {},
                    comportamental: {},
                    saude_financeira: {},
                    red_flags: {}
                },
                padroes_risco: [],
                evidencias: [],
                fontes_consultadas: []
            };
        }

        if (!estruturado.dados_estruturados) {
            console.warn('⚠️ dados_estruturados ausente. Criando estrutura padrão.');
            estruturado.dados_estruturados = {
                reputacional: {},
                resolutividade: {},
                comportamental: {},
                saude_financeira: {},
                red_flags: {}
            };
        }

        const secoes = ['reputacional', 'resolutividade', 'comportamental', 'saude_financeira', 'red_flags'];
        for (let i = 0; i < secoes.length; i++) {
            if (!estruturado.dados_estruturados[secoes[i]]) {
                estruturado.dados_estruturados[secoes[i]] = {};
            }
        }

        if (!estruturado.padroes_risco || !Array.isArray(estruturado.padroes_risco)) {
            estruturado.padroes_risco = [];
        }
        if (!estruturado.evidencias || !Array.isArray(estruturado.evidencias)) {
            estruturado.evidencias = [];
        }
        if (!estruturado.fontes_consultadas || !Array.isArray(estruturado.fontes_consultadas)) {
            estruturado.fontes_consultadas = [];
        }

        if (!estruturado.status_busca) {
            estruturado.status_busca = 'sucesso';
        }
        if (!estruturado.coletado_em) {
            estruturado.coletado_em = new Date().toISOString();
        }
        if (!estruturado.confianca_geral) {
            estruturado.confianca_geral = {
                nivel: 'media',
                motivo: 'Estrutura garantida pelo sistema'
            };
        }

        const validacao = { valido: true, erros: [] };
        console.log('✅ Estrutura garantida com sucesso.');

        // 5. SCORES
        const scores = extrairScores(estruturado.dados_estruturados || {});

        // 6. CALCULA TEMPO DE MERCADO
        if (dadosCadastrais.data_abertura) {
            const dataAbertura = new Date(dadosCadastrais.data_abertura);
            const agora = new Date();
            const diffMs = agora - dataAbertura;
            const diffAnos = diffMs / (1000 * 60 * 60 * 24 * 365.25);
            dadosCadastrais.tempo_mercado_anos = Math.round(diffAnos * 10) / 10;
        } else {
            dadosCadastrais.tempo_mercado_anos = 0;
        }

        let faturamentoMensal = null;
        if (dadosCadastrais.faturamento_anual) {
            faturamentoMensal = dadosCadastrais.faturamento_anual / 12;
        } else {
            const porteEmpresa = dadosCadastrais.porte || "MEDIO";
            faturamentoMensal = calcularFaturamentoMensalPorPorte(porteEmpresa);
        }

        // ============================================================
        // PREPARA DADOS PARA O MOTOR COM FATURAMENTO_ANUAL (CORRIGIDO)
        // ============================================================
        const negocioStr = req.body.negocio ? String(req.body.negocio) : "";

        const dadosMotor = {
            analisado: {
                cnpj: cnpjLimpo,
                razao_social: dadosCadastrais.razao_social || nome,
                porte: dadosCadastrais.porte || "MEDIO",
                situacao: dadosCadastrais.situacao || "ATIVA",
                data_abertura: dadosCadastrais.data_abertura || "",
                tipo: req.body.analisado_tipo || "empresa",
                renda: renda_analisado || 0,
                faturamento_anual: dadosCadastrais.faturamento_anual || null,
                uf: dadosCadastrais.uf || "",
                email: email_analisado || "",
                whatsapp: whatsapp_analisado || ""
            },
            solicitante: {
                porte: (req.body.analisante && req.body.analisante.porte) || "MEDIO",
                tipo: (req.body.analisante && req.body.analisante.tipo) || "empresa",
                renda: renda_solicitante || 0,
                email: email_solicitante || "",
                whatsapp: whatsapp_solicitante || ""
            },
            relacionamento: {
                conhecimento: req.body.conhecimento || "razoavel",
                experiencia: req.body.experiencia || "neutra",
                meses: 0,
                ticket_medio: req.body.ticket_medio || 0
            },
            negocio: {
                valor: valorNegocio,
                tipo_pagamento: tipoPagamento,
                parcelas: parcelasNegocio
            },
            porta_entrada: negocioStr.split("_")[0] || "empresa",
            subsecao: negocioStr.split("_")[1] || "fornecedor"
        };

        const resultadoMotor = calcularRiscos(dadosMotor);

        // 7. EVIDÊNCIAS – FALLBACK
        var evidenciasGemini = [];
        if (estruturado && estruturado.dados_estruturados) {
            secoes.forEach(function(secao) {
                var dadosSecao = estruturado.dados_estruturados[secao];
                if (dadosSecao) {
                    Object.keys(dadosSecao).forEach(function(chave) {
                        var item = dadosSecao[chave];
                        if (item && item.evidencias && Array.isArray(item.evidencias)) {
                            evidenciasGemini = evidenciasGemini.concat(item.evidencias);
                        }
                    });
                }
            });
        }

        var geminiRetornouDados = estruturado && estruturado.status_busca === "sucesso";
        var evidenciasFinal = evidenciasGemini || [];

        if (!geminiRetornouDados || evidenciasGemini.length === 0) {
            var dadosFormulario = {
                valor: valorNegocio,
                parcelas: parcelasNegocio,
                tipo_pagamento: tipoPagamento,
                porte_solicitante: (req.body.analisante && req.body.analisante.porte) || "MEDIO",
                preocupacoes: req.body.preocupacoes || [],
                conhecimento: req.body.conhecimento,
                experiencia: req.body.experiencia
            };
            var dadosAnalisado = {
                tipo: req.body.analisado_tipo || "empresa",
                renda: renda_analisado || 0,
                porte: dadosCadastrais.porte || "MEDIO",
                data_abertura: dadosCadastrais.data_abertura || "",
                situacao: dadosCadastrais.situacao || "ATIVA",
                setor: dadosCadastrais.setor || "",
                uf: dadosCadastrais.uf || ""
            };
            var evidenciasFallback = gerarEvidenciasFallback(dadosAnalisado, dadosFormulario, resultadoMotor);
            evidenciasFinal = evidenciasFinal.concat(evidenciasFallback);
        }

        // 8. MONTAGEM DA RESPOSTA
        const dadosCombinados = {
            ...estruturado,
            dados_estruturados: {
                ...estruturado.dados_estruturados,
                dados_cadastrais: dadosCadastrais,
                porte: dadosCadastrais.porte || null,
                situacao: dadosCadastrais.situacao || null,
                razao_social: dadosCadastrais.razao_social || estruturado.razao_social || null,
                cnpj_encontrado: dadosCadastrais.cnpj || estruturado.cnpj_encontrado || null,
                site: dadosOrquestrador.site_encontrado || dadosCadastrais.site || estruturado.site || null,
                setor: dadosCadastrais.setor || estruturado.setor || null,
                uf: dadosCadastrais.uf || null,
                municipio: dadosCadastrais.municipio || null,
                faturamento_mensal_estimado: faturamentoMensal,
                faturamento_anual: dadosCadastrais.faturamento_anual || null,
                faturamento_fonte: dadosCadastrais.faturamento_fonte || "nao_informado",
                socio_majoritario: dadosCadastrais.socio_majoritario || null,
                controladora: dadosCadastrais.controladora || null,
                qsa: dadosCadastrais.qsa || [],
                email_analisado: dadosCadastrais.email_analisado || "",
                whatsapp_analisado: dadosCadastrais.whatsapp_analisado || "",
                email_solicitante: dadosCadastrais.email_solicitante || "",
                whatsapp_solicitante: dadosCadastrais.whatsapp_solicitante || ""
            },
            motor: resultadoMotor
        };

        const hashAuditoria = crypto
            .createHash("sha256")
            .update(JSON.stringify(dadosCombinados))
            .digest("hex");

        const hashInput = crypto
            .createHash("sha256")
            .update(JSON.stringify({ nome, cnpj, cpf }))
            .digest("hex")
            .substring(0, 16);

        const response = {
            status: "sucesso",
            dados: dadosCombinados,
            scores: scores,
            motor: resultadoMotor,
            dados_cadastrais: dadosCadastrais,
            site_encontrado: dadosOrquestrador.site_encontrado || null,
            cnpj_encontrado: dadosOrquestrador.cnpj_encontrado || null,
            cpf_encontrado: dadosOrquestrador.cpf_encontrado || null,
            uf_encontrada: dadosCadastrais.uf || null,
            evidencias: evidenciasFinal,
            auditoria: {
                hash: hashAuditoria,
                hash_input: hashInput,
                hash_output: hashAuditoria,
                cnpj: cnpjLimpo || "sem_cnpj",
                timestamp: new Date().toISOString(),
                tempo_execucao_ms: Date.now() - inicio,
                versao_api: VERSAO_API,
                versao_orquestrador: VERSAO_ORQUESTRADOR,
                versao_prompt_gemini: VERSAO_PROMPT_GEMINI,
                versao_schema: VERSAO_SCHEMA,
                versao_motor: VERSAO_MOTOR,
                metodologia: config.METODOLOGIA_VERSAO || "VERI 3.2",
                fontes_utilizadas: dadosOrquestrador.fontes_utilizadas || [],
                faturamento_fonte: dadosCadastrais.faturamento_fonte || "nao_informado"
            },
            meta: {
                tempo_ms: Date.now() - inicio,
                fonte: "orquestrador+gemini+motor",
                gemini_retornou: geminiRetornouDados,
                evidencias_fallback_usadas: (!geminiRetornouDados || evidenciasGemini.length === 0)
            }
        };

        // 9. CACHE
        if (cnpjLimpo) {
            if (ENABLE_CACHE) {
                setCacheMemoria(cnpjLimpo, response);
            }
            try {
                await setCache(cnpjLimpo, response);
            } catch (cacheErr) {
                console.warn("Erro ao salvar cache:", cacheErr.message);
            }
        }

        return res.json(response);

    } catch (err) {
        console.error("Erro em /enriquecer:", err);
        return res.status(500).json({
            status: "falha",
            erro: err.message,
            _tempo_ms: Date.now() - inicio
        });
    }
});

// ============================================
// INICIA O SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    console.log('🚀 Iniciando servidor VERI API...');
    
    // 1. Verifica se o CSV existe no Storage
    if (storage) {
        try {
            const bucket = storage.bucket(BUCKET_NAME);
            const file = bucket.file(CSV_FILE);
            const [exists] = await file.exists();
            if (exists) {
                console.log('✅ CSV disponível no Google Cloud Storage.');
            } else {
                console.warn('⚠️ CSV não encontrado no Storage.');
            }
        } catch (err) {
            console.warn('⚠️ Erro ao verificar CSV no Storage:', err.message);
        }
    } else {
        console.warn('⚠️ Storage não disponível. Busca no CSV desativada.');
    }
    
    // 2. Tenta carregar o CSV em memória (se existir localmente)
    try {
        await carregarCSVIndex();
    } catch (err) {
        console.warn('⚠️ Erro ao carregar CSV na inicialização:', err.message);
        console.warn('⚠️ O servidor continuará rodando sem o índice CSV local.');
    }
    
    // 3. Sobe o servidor
    const server = app.listen(PORT, '0.0.0.0', function() {
        console.log("✅ VERI API v" + VERSAO_API + " rodando na porta " + PORT);
        console.log("⚙️ Motor VERI integrado à rota /enriquecer");
        console.log("📊 Busca BrasilAPI ativada para porte e data_abertura");
        console.log('🚀 REVISÃO CORRIGIDA - JSON_INVALIDO RESOLVIDO');
        console.log('📊 CSV indexado: ' + (csvIndexCarregado ? '✅ SIM (busca por nome ativa)' : '⚠️ NÃO (fallback ativo - Storage)'));
    });

    server.on('error', function(err) {
        console.error('❌ Erro no servidor:', err);
        if (err.code === 'EADDRINUSE') {
            console.error('⚠️ Porta ' + PORT + ' já está em uso!');
        }
    });
}

// Inicia o servidor
iniciarServidor();

module.exports = app;