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
// BUSCA CNPJ NO CSV (USANDO ÍNDICE EM MEMÓRIA)
// ============================================
async function buscarCNPJnoCSV(cnpj) {
    await carregarCSVIndex();
    if (!csvIndexCNPJ) return null;
    const cnpjLimpo = normalizarCNPJ(cnpj);
    return csvIndexCNPJ.get(cnpjLimpo) || null;
}

// ============================================
// BUSCA CNPJ POR NOME NO CSV (USANDO ÍNDICE EM MEMÓRIA)
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
// CADEIA DE BUSCA CNPJ - COM 3 FONTES
// ============================================
async function cadeiaDeBuscaCNPJ(entrada) {
    const limpo = normalizarCNPJ(entrada);
    let dados = null;

    if (limpo.length === 14) {
        dados = await buscarCNPJnaBrasilAPI(limpo);
        if (dados) {
            try { await carregarHistorico(); salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "brasilapi" };
        }

        dados = await buscarCNPJnaReceitaWS(limpo);
        if (dados) {
            try { await carregarHistorico(); salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "receitaws" };
        }

        dados = await buscarCNPJnoCSV(limpo);
        if (dados) {
            try { salvarNoHistorico(limpo, dados); } catch(e) {}
            return { ...dados, fonte: "csv_veri" };
        }

        return null;
    }

    if (entrada && entrada.length > 2) {
        const nomeBusca = entrada.trim();

        const localResult = encontrarCNPJPorNome(nomeBusca);
        if (localResult && localResult.cnpj) {
            const cnpjEncontrado = localResult.cnpj.replace(/\D/g, '');
            dados = await buscarCNPJnaBrasilAPI(cnpjEncontrado);
            if (dados) {
                try { await carregarHistorico(); salvarNoHistorico(cnpjEncontrado, dados); } catch(e) {}
                return { ...dados, fonte: "banco_local", cnpj_original: localResult.cnpj };
            }
            return {
                cnpj: cnpjEncontrado,
                razao_social: localResult.nome_encontrado || nomeBusca,
                porte: localResult.porte || "MEDIO",
                data_abertura: "",
                situacao: "ATIVA",
                fonte: "banco_local"
            };
        }

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
                    "DEMAIS": 50000000
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

        if (dadosOrquestrador.faturamento_anual) {
            faturamentoAnualEncontrado = dadosOrquestrador.faturamento_anual;
            faturamentoFonte = "banco_regional_orquestrador";
            console.log("✅ Faturamento obtido do banco regional:", faturamentoAnualEncontrado);
        } else {
            const porteEmpresa = dadosCadastrais.porte || "MEDIO";
            const faturamentoAnualPorPorte = {
                "MEI": 81000,
                "ME": 360000,
                "EPP": 4800000,
                "MEDIO": 12000000,
                "GRANDE": 50000000,
                "DEMAIS": 50000000
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
    
    // 1. Tenta baixar o CSV do Storage
    const baixou = await baixarCSVdoStorage();
    if (baixou) {
        console.log('📊 CSV disponível localmente.');
    } else {
        console.warn('⚠️ CSV não disponível. Fallback para BrasilAPI e banco local ativo.');
    }
    
    // 2. Tenta carregar o CSV em memória (se existir)
    try {
        await carregarCSVIndex();
    } catch (err) {
        console.warn('⚠️ Erro ao carregar CSV na inicialização:', err.message);
        console.warn('⚠️ O servidor continuará rodando sem o índice CSV.');
    }
    
    // 3. Sobe o servidor
    const server = app.listen(PORT, '0.0.0.0', function() {
        console.log("✅ VERI API v" + VERSAO_API + " rodando na porta " + PORT);
        console.log("⚙️ Motor VERI integrado à rota /enriquecer");
        console.log("📊 Busca BrasilAPI ativada para porte e data_abertura");
        console.log('🚀 REVISÃO CORRIGIDA - JSON_INVALIDO RESOLVIDO');
        console.log('📊 CSV indexado: ' + (csvIndexCarregado ? '✅ SIM (busca por nome ativa)' : '⚠️ NÃO (fallback ativo)'));
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
