<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VERI — Relatório de Análise</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: #0A0A0A;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            color: #EDEDED;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            padding: 1.5rem 1rem;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: #11141F;
            border-radius: 32px;
            padding: 2rem 2rem 2.5rem;
            border: 1px solid #2A2E3A;
            box-shadow: 0 12px 48px rgba(0,0,0,0.4);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            border-bottom: 1px solid #2A2E3A;
            padding-bottom: 0.8rem;
            margin-bottom: 1.5rem;
        }
        .logo {
            font-size: 1.8rem;
            font-weight: 800;
            color: #2DD4BF;
            letter-spacing: 1px;
        }
        .logo sup { font-size: 0.7rem; color: #2DD4BF; }
        .tagline-header {
            font-size: 0.85rem;
            color: #2DD4BF;
            font-weight: 500;
            text-align: right;
        }
        .data-hora {
            font-size: 0.75rem;
            color: #6A6F82;
            text-align: right;
            line-height: 1.4;
            margin-top: 0.2rem;
        }
        .hero {
            text-align: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #2A2E3A;
        }
        .hero h1 {
            font-size: 2.8rem;
            font-weight: 600;
            line-height: 1.2;
            color: #FFFFFF;
        }
        .hero h1 .amarelo { color: #D4A017; font-weight: 700; }
        .hero h1 .verde-menor { color: #2DD4BF; font-weight: 600; font-size: 0.75em; }
        .hero h1 .verde-veri { color: #2DD4BF; font-weight: 700; }
        .hero h1 .marca { font-size: 0.6em; vertical-align: super; color: #2DD4BF; }
        .titulo-relatorio {
            font-size: 1.3rem;
            font-weight: 700;
            color: #2DD4BF;
            text-align: center;
            margin-bottom: 1.5rem;
            letter-spacing: 0.5px;
        }
        .grid-2col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .info-box {
            background: #1A1D2A;
            padding: 1rem 1.2rem;
            border-radius: 16px;
            border-left: 4px solid #2DD4BF;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .info-box .label {
            font-size: 0.7rem;
            color: #2DD4BF;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 0.3rem;
        }
        .info-box .value {
            font-size: 0.95rem;
            color: #EDEDED;
            font-weight: 500;
        }
        .info-box .value strong { color: #FFFFFF; }
        .info-box .doc-linha {
            font-size: 0.85rem;
            color: #94A3B8;
            margin-top: 0.2rem;
        }
        .info-box .doc-linha strong { color: #EDEDED; font-weight: 500; }
        .recomendacao-destaque {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }
        .semaforo {
            display: inline-block;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .semaforo-verde { background: #34D399; box-shadow: 0 0 12px rgba(52,211,153,0.3); }
        .semaforo-amarelo { background: #FBBF24; box-shadow: 0 0 12px rgba(251,191,36,0.3); }
        .semaforo-vermelho { background: #FF0000; box-shadow: 0 0 12px rgba(255,0,0,0.3); }
        .recomendacao-texto {
            font-weight: 700;
            font-size: 1rem;
        }
        .recomendacao-texto.pare { color: #FF0000; }
        .recomendacao-texto.atencao { color: #FBBF24; }
        .recomendacao-texto.siga { color: #2DD4BF; }
        .recomendacao-sub {
            font-size: 0.8rem;
            color: #94A3B8;
            margin-left: 0.3rem;
        }
        .analisado-detalhes { margin-top: 0.5rem; }
        .analisado-detalhes .linha {
            font-size: 0.85rem;
            color: #94A3B8;
            margin-bottom: 0.2rem;
        }
        .analisado-detalhes .linha strong { color: #EDEDED; font-weight: 500; }
        .societaria-wrapper {
            margin-top: 0.8rem;
            border-top: 1px solid #2A2E3A;
            padding-top: 0.8rem;
        }
        .societaria-wrapper .titulo-societaria {
            font-size: 0.8rem;
            color: #2DD4BF;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }
        .socio-item {
            font-size: 0.85rem;
            color: #94A3B8;
            margin-bottom: 0.3rem;
            line-height: 1.5;
        }
        .socio-item strong { color: #EDEDED; font-weight: 500; }
        .socio-item .percentual { color: #2DD4BF; font-weight: 600; }
        .socio-item .qualificacao { color: #FBBF24; font-size: 0.75rem; }
        .socio-item .cpf-cnpj { color: #6A6F82; font-size: 0.75rem; margin-left: 0.5rem; }
        .btn-analisar-controladora {
            display: inline-block;
            margin-top: 0.3rem;
            padding: 0.2rem 0.8rem;
            background: transparent;
            color: #2DD4BF;
            border: 1px solid #2DD4BF;
            border-radius: 24px;
            font-size: 0.7rem;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.2s, color 0.2s;
            text-decoration: none;
        }
        .btn-analisar-controladora:hover { background: #2DD4BF; color: #0A0A0A; }
        .societaria-vazio { display: none; }
        .mais-detalhes {
            font-size: 0.75rem;
            color: #6A6F82;
            margin-top: 0.6rem;
            font-style: italic;
            border-top: 1px solid #2A2E3A;
            padding-top: 0.5rem;
        }
        .scores-container {
            display: flex;
            gap: 1.5rem;
            margin: 1.5rem 0;
            justify-content: center;
        }
        .score-box {
            flex: 1;
            text-align: center;
            background: #1A1D2A;
            padding: 1.5rem 1rem;
            border-radius: 20px;
            border: 1px solid #2A2E3A;
        }
        .score-valor {
            font-size: 2.8rem;
            font-weight: 700;
            color: #EDEDED;
        }
        .score-explicacao {
            font-size: 0.9rem;
            font-weight: 700;
            color: #FFFFFF;
            margin-top: 0.3rem;
        }
        .significa-bloco {
            background: #1A1D2A;
            border-radius: 16px;
            padding: 1.2rem 1.5rem;
            margin: 1.5rem 0;
            border-left: 4px solid #FBBF24;
        }
        .significa-bloco .titulo {
            font-weight: 600;
            color: #FBBF24;
            font-size: 0.9rem;
            margin-bottom: 0.8rem;
        }
        .significa-item {
            display: flex;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: #94A3B8;
            margin-bottom: 0.3rem;
            line-height: 1.5;
        }
        .significa-item .num { color: #2DD4BF; font-weight: 600; flex-shrink: 0; }
        .significa-item .texto { flex: 1; }
        .card-critico-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
            border-top: 1px solid #2A2E3A;
            padding-top: 1rem;
        }
        .card-critico-item {
            background: #0D1A1A;
            border-radius: 12px;
            padding: 0.8rem 1rem;
            border-left: 4px solid #FF0000;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .card-critico-item .label-critico {
            font-size: 0.7rem;
            color: #FF0000;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 0.2rem;
        }
        .card-critico-item .value-critico {
            font-size: 0.9rem;
            color: #EDEDED;
            font-weight: 500;
        }
        .card-critico-item .value-critico a { color: #2DD4BF; text-decoration: none; word-break: break-all; }
        .card-critico-item .value-critico a:hover { text-decoration: underline; }
        .impacto-alerta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin: 1.5rem 0;
        }
        .impacto-box, .alerta-box {
            background: #1A1D2A;
            padding: 1rem;
            border-radius: 16px;
            border-left: 3px solid #2DD4BF;
        }
        .impacto-box .label, .alerta-box .label {
            font-size: 0.7rem;
            color: #2DD4BF;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .impacto-box .value, .alerta-box .value {
            font-size: 0.95rem;
            color: #EDEDED;
            margin-top: 0.2rem;
            font-weight: 500;
        }
        .riscos-wrapper { margin: 1.5rem 0; }
        .riscos-wrapper .titulo-secao {
            font-weight: 600;
            color: #FBBF24;
            font-size: 0.9rem;
            text-align: center;
            margin-bottom: 0.8rem;
        }
        .riscos-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-bottom: 0.5rem;
        }
        .risco-card {
            background: #1A1D2A;
            padding: 1rem;
            text-align: center;
            border-radius: 16px;
            border-top: 3px solid #2DD4BF;
        }
        .risco-card .icone { font-size: 1.5rem; }
        .risco-card .nome {
            font-weight: 600;
            font-size: 0.75rem;
            color: #94A3B8;
            margin: 0.3rem 0;
        }
        .risco-card .percentual {
            font-size: 1.6rem;
            font-weight: 700;
            color: #EDEDED;
        }
        .risco-card .descricao-percentual {
            font-size: 0.7rem;
            color: #94A3B8;
            margin-top: 0.2rem;
            line-height: 1.3;
        }
        .evidencias-dos-riscos {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 0.5rem;
        }
        .evidencia-card {
            background: #11141F;
            padding: 0.8rem 1rem;
            border-radius: 12px;
            border-left: 3px solid #2DD4BF;
            font-size: 0.8rem;
            color: #94A3B8;
            line-height: 1.4;
            border: 1px solid #2A2E3A;
        }
        .evidencia-card .evidencia-url {
            display: block;
            margin-top: 0.3rem;
            font-size: 0.7rem;
            color: #2DD4BF;
            text-decoration: none;
            word-break: break-all;
        }
        .swot-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin: 1.5rem 0;
        }
        .swot-col {
            background: #1A1D2A;
            padding: 1rem;
            border-radius: 16px;
        }
        .swot-col .swot-title {
            font-weight: 600;
            color: #FBBF24;
            font-size: 0.9rem;
            margin-bottom: 0.3rem;
        }
        .swot-col .swot-text {
            font-size: 0.85rem;
            color: #94A3B8;
        }
        .recomendacao-bloco {
            background: #1A1D2A;
            padding: 1.5rem;
            border-radius: 20px;
            text-align: center;
            margin: 1.5rem 0;
            border: 1px solid #2A2E3A;
        }
        .recomendacao-bloco .alerta-grande {
            font-size: 2.2rem;
            font-weight: 700;
        }
        .recomendacao-bloco .alerta-grande.pare { color: #FF0000; }
        .recomendacao-bloco .alerta-grande.atencao { color: #FBBF24; }
        .recomendacao-bloco .alerta-grande.siga { color: #2DD4BF; }
        .recomendacao-bloco .subtitulo {
            color: #94A3B8;
            font-size: 0.9rem;
            margin-top: 0.3rem;
        }
        .acao-protetiva {
            background: #0A2A28;
            padding: 0.8rem 1.2rem;
            border-radius: 12px;
            margin-top: 0.8rem;
            font-size: 0.9rem;
            color: #2DD4BF;
            display: inline-block;
            border: 1px solid #2A2E3A;
        }
        .fechamento {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #2A2E3A;
            text-align: center;
        }
        .fechamento .frase-final {
            color: #2DD4BF;
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.5rem;
        }
        .fechamento .rodape-texto {
            font-size: 0.75rem;
            color: #6A6F82;
            line-height: 1.6;
        }
        .hash {
            font-size: 0.65rem;
            color: #6A6F82;
            word-break: break-all;
            text-align: center;
            margin-top: 0.8rem;
        }
        .selo {
            text-align: center;
            margin-top: 0.5rem;
            color: #2DD4BF;
            font-size: 0.7rem;
            font-weight: 600;
        }
        .footer-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 1.5rem;
        }
        .btn {
            display: inline-block;
            padding: 0.6rem 1.8rem;
            border-radius: 48px;
            font-weight: 600;
            font-size: 0.85rem;
            border: none;
            cursor: pointer;
            font-family: inherit;
            text-decoration: none;
            transition: background 0.2s;
        }
        .btn-secondary { background: #2DD4BF; color: #0A0A0A; }
        .btn-secondary:hover { background: #14B8A6; color: #FFFFFF; }
        .btn-outline {
            background: transparent;
            color: #94A3B8;
            border: 1px solid #2A2E3A;
        }
        .btn-outline:hover { border-color: #2DD4BF; color: #2DD4BF; }
        .btn-simular {
            background: #FBBF24;
            color: #0A0A0A;
        }
        .btn-simular:hover { background: #D4A017; color: #FFFFFF; }
        .btn-aplicar {
            background: #2DD4BF;
            color: #0A0A0A;
        }
        .btn-aplicar:hover { background: #14B8A6; color: #FFFFFF; }
        .feedback-section {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #2A2E3A;
            text-align: center;
        }
        .feedback-section .pergunta-feedback {
            font-size: 1rem;
            font-weight: 500;
            color: #EDEDED;
            margin-bottom: 0.8rem;
        }
        .btn-feedback {
            padding: 0.5rem 2rem;
            border-radius: 48px;
            cursor: pointer;
            font-family: inherit;
            font-weight: 600;
            font-size: 0.9rem;
            border: 1px solid #2A2E3A;
            transition: border-color 0.2s, transform 0.1s;
            background: #1A1D2A;
            color: #EDEDED;
            margin: 0 0.3rem;
        }
        .btn-feedback:hover { border-color: #2DD4BF; transform: translateY(-2px); }
        .btn-feedback.sim { color: #34D399; }
        .btn-feedback.maisoumenos { color: #FBBF24; }
        .btn-feedback.nao { color: #FF0000; }
        .btn-feedback:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .feedback-msg {
            font-size: 0.85rem;
            color: #6A6F82;
            margin-top: 0.8rem;
        }
        .simulacao-campos {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8rem;
            align-items: flex-end;
            justify-content: center;
            margin: 1.5rem 0;
            padding: 1rem;
            background: #1A1D2A;
            border-radius: 16px;
            border: 1px solid #2A2E3A;
        }
        .simulacao-campos .campo {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            flex: 1 1 100px;
            min-width: 80px;
        }
        .simulacao-campos .campo label {
            font-size: 0.6rem;
            color: #2DD4BF;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .simulacao-campos .campo select,
        .simulacao-campos .campo input {
            padding: 0.4rem 0.5rem;
            background: #0A0A0A;
            border: 1px solid #2A2E3A;
            border-radius: 8px;
            color: #EDEDED;
            font-family: inherit;
            font-size: 0.8rem;
            transition: border-color 0.2s;
            width: 100%;
            min-width: 60px;
        }
        .simulacao-campos .campo select:focus,
        .simulacao-campos .campo input:focus {
            outline: none;
            border-color: #2DD4BF;
        }
        .simulacao-campos .botoes {
            display: flex;
            gap: 0.4rem;
            flex-wrap: wrap;
            align-items: center;
        }
        .simulacao-campos .botoes .btn {
            padding: 0.4rem 1rem;
            font-size: 0.75rem;
        }
        .selo-simulacao {
            display: inline-block;
            background: #FBBF24;
            color: #0A0A0A;
            font-size: 0.65rem;
            font-weight: 700;
            padding: 0.15rem 0.6rem;
            border-radius: 12px;
            margin-left: 0.5rem;
            text-transform: uppercase;
        }
        .swot-grid-3col {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin: 1.5rem 0;
        }
        .swot-col-3 {
            background: #1A1D2A;
            padding: 1rem;
            border-radius: 16px;
            text-align: center;
        }
        .swot-col-3 .swot-title {
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 0.3rem;
        }
        .swot-col-3 .swot-title.verde { color: #2DD4BF; }
        .swot-col-3 .swot-title.amarelo { color: #FBBF24; }
        .swot-col-3 .swot-title.azul { color: #2DD4BF; }
        .swot-col-3 .valor-grande {
            font-size: 2.2rem;
            font-weight: 700;
            color: #EDEDED;
        }
        .swot-col-3 .sub-valor {
            font-size: 0.85rem;
            color: #94A3B8;
            margin-top: 0.2rem;
        }
        .swot-col-3 .antes {
            font-size: 0.75rem;
            color: #6A6F82;
            margin-top: 0.3rem;
            border-top: 1px solid #2A2E3A;
            padding-top: 0.3rem;
        }
        .swot-col-3 .antes span { color: #EDEDED; font-weight: 600; }
        .swot-col-3 .nivel-risco {
            font-size: 0.9rem;
            color: #EDEDED;
            margin-top: 0.2rem;
        }
        .titulo-novo-cenario {
            text-align: center;
            font-size: 1.1rem;
            font-weight: 700;
            color: #2DD4BF;
            margin: 1.5rem 0 0.5rem 0;
        }
        @media (max-width: 768px) {
            .container { padding: 1.5rem; }
            .hero h1 { font-size: 1.8rem; }
            .header { flex-direction: column; align-items: center; text-align: center; }
            .tagline-header { text-align: center; }
            .data-hora { text-align: center; }
            .grid-2col { grid-template-columns: 1fr; }
            .impacto-alerta-grid { grid-template-columns: 1fr; }
            .scores-container { flex-direction: column; gap: 0.8rem; }
            .swot-grid { grid-template-columns: 1fr; }
            .swot-grid-3col { grid-template-columns: 1fr; }
            .riscos-grid { grid-template-columns: repeat(2, 1fr); }
            .evidencias-dos-riscos { grid-template-columns: 1fr; }
            .card-critico-grid { grid-template-columns: 1fr; }
            .btn-feedback { width: 100%; margin: 0.3rem 0; }
            .simulacao-campos .campo { flex: 1 1 100%; min-width: 0; }
            .simulacao-campos .botoes { width: 100%; justify-content: center; }
        }
        @media (max-width: 480px) {
            body { padding: 0.5rem; }
            .container { padding: 1rem; border-radius: 20px; }
            .hero h1 { font-size: 1.4rem; }
            .riscos-grid { grid-template-columns: 1fr; }
            .evidencias-dos-riscos { grid-template-columns: 1fr; }
            .recomendacao-bloco .alerta-grande { font-size: 1.6rem; }
            .titulo-relatorio { font-size: 1.1rem; }
            .swot-grid-3col { grid-template-columns: 1fr; }
            .simulacao-campos { flex-direction: column; }
            .simulacao-campos .campo { flex: 1 1 100%; }
        }
        .momento-veri {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.92);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            padding: 2rem;
        }
        .momento-veri.ativo { display: flex; }
        .momento-box {
            max-width: 640px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            background: #11141F;
            border-radius: 24px;
            padding: 2rem 1.5rem;
            border: 1px solid #2A2E3A;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .momento-spinner {
            display: inline-block;
            width: 56px;
            height: 56px;
            border: 4px solid #2A2E3A;
            border-top-color: #2DD4BF;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 0.8rem;
            flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .momento-titulo {
            font-size: 1.5rem;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 0.2rem;
        }
        .momento-titulo .verde { color: #2DD4BF; }
        .momento-sub {
            font-size: 0.9rem;
            color: #94A3B8;
            margin-bottom: 1rem;
        }
        .momento-video {
            margin: 0.5rem 0 0.8rem 0;
            border-radius: 12px;
            overflow: hidden;
            background: #0A0A0A;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-shrink: 0;
        }
        .momento-video video {
            width: 100%;
            max-height: 320px;
            border-radius: 12px;
            background: #0A0A0A;
            object-fit: contain;
        }
        .momento-mensagem {
            font-size: 1rem;
            color: #EDEDED;
            line-height: 1.6;
            min-height: 3rem;
            margin-bottom: 0.8rem;
            background: #1A1D2A;
            padding: 0.8rem 1.2rem;
            border-radius: 12px;
            border-left: 3px solid #2DD4BF;
            text-align: left;
            width: 100%;
            flex-shrink: 0;
        }
        .momento-mensagem .destaque { color: #2DD4BF; }
        .momento-progresso {
            width: 100%;
            height: 4px;
            background: #2A2E3A;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 0.8rem;
            flex-shrink: 0;
        }
        .momento-progresso-bar {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #2DD4BF, #14B8A6);
            border-radius: 4px;
            transition: width 0.6s ease;
        }
        .momento-dicas {
            font-size: 0.8rem;
            color: #6A6F82;
            border-top: 1px solid #2A2E3A;
            padding-top: 0.8rem;
            min-height: 2.5rem;
            width: 100%;
            flex-shrink: 0;
        }
        .momento-dicas .dica-link { color: #2DD4BF; }
        .momento-rodape {
            font-size: 0.7rem;
            color: #6A6F82;
            margin-top: 0.8rem;
            letter-spacing: 0.3px;
        }
        @media (max-width: 480px) {
            .momento-box { padding: 1.5rem 1rem; }
            .momento-titulo { font-size: 1.2rem; }
            .momento-mensagem { font-size: 0.9rem; padding: 0.8rem; }
            .momento-video video { max-height: 200px; }
        }
    </style>
</head>
<body>
<div class="container" id="relatorioContainer">
    <div style="text-align:center; margin:3rem 0; color:#94A3B8;">
        <div style="display:inline-block; width:40px; height:40px; border:3px solid #2A2E3A; border-top-color:#2DD4BF; border-radius:50%; animation: spin 0.8s linear infinite;"></div>
        <p style="margin-top:1rem;">Carregando análise...</p>
    </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
(function() {
    var API_BASE_URL = 'https://veri-backend-o1d4.onrender.com';

    // ============================================================
    // FUNÇÕES AUXILIARES
    // ============================================================
    function limparNomeEmpresa(nome) {
        if (!nome) return 'empresa';
        var nomeLimpo = nome
            .replace(/\s+LTDA\s*/gi, '')
            .replace(/\s+Ltda\s*/g, '')
            .replace(/\s+S\/A\s*/gi, '')
            .replace(/\s+SA\s*/gi, '')
            .replace(/\s+EIRELI\s*/gi, '')
            .replace(/\s+MEI\s*/gi, '')
            .replace(/\s+EPP\s*/gi, '')
            .replace(/\s+ME\s*/gi, '')
            .replace(/\s+EI\s*/gi, '')
            .replace(/\s+-\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return nomeLimpo || 'empresa';
    }

    function getNivelImpacto(dias) {
        if (dias <= 1) return { nivel: 'Muito Baixo', percentual: 3, cor: '🟢' };
        if (dias <= 5) return { nivel: 'Baixo', percentual: 10, cor: '🟢' };
        if (dias <= 10) return { nivel: 'Moderado', percentual: 30, cor: '🟡' };
        if (dias <= 15) return { nivel: 'Alto', percentual: 45, cor: '🟠' };
        if (dias <= 20) return { nivel: 'Muito Alto', percentual: 65, cor: '🔴' };
        return { nivel: 'Crítico', percentual: 75, cor: '🔴🔴' };
    }

    function getFaturamentoPorPorte(porte) {
        var mapa = {
            'MEI': 6750,
            'ME': 30000,
            'EPP': 400000,
            'MEDIO': 1000000,
            'GRANDE': 4166666.67
        };
        return mapa[porte] || 0;
    }

    function calcularParcelaParaBaixo(faturamentoMensal) {
        if (!faturamentoMensal || faturamentoMensal <= 0) return 0;
        var ticketDiario = faturamentoMensal / 30;
        var parcelaBruta = 5 * ticketDiario;
        return Math.round(parcelaBruta / 50) * 50;
    }

    function getClasseRecomendacao(rec) {
        if (rec === 'PARE') return 'pare';
        if (rec === 'ATENCAO') return 'atencao';
        return 'siga';
    }

    function getSemaforoClass(rec) {
        if (rec === 'PARE') return 'semaforo semaforo-vermelho';
        if (rec === 'ATENCAO') return 'semaforo semaforo-amarelo';
        return 'semaforo semaforo-verde';
    }

    function getIconeRisco(nome) {
        var icones = {
            'FINANCEIRO': '💰',
            'RESOLUTIVIDADE': '🔒',
            'RISCO DE INTERRUPÇÃO': '🏢',
            'VERACIDADE': '🔍',
            'COMPORTAMENTAL': '👥',
            'INTEGRIDADE': '⚖️',
            'DETERIORACAO': '📉',
            'CONTRATUAL': '📜',
            'REPUTACIONAL': '⭐',
            'RISCO ENTRE AS PARTES': '🤝',
            'SITUAÇÃO CRÍTICA': '🚨'
        };
        return icones[nome] || '⚠️';
    }

    function formatarMoeda(valor) {
        if (valor === undefined || valor === null || isNaN(valor)) return 'N/A';
        var num = Number(valor);
        if (num === 0) return 'R$ 0,00';
        return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatarFaturamento(valor) {
        if (valor === undefined || valor === null || isNaN(valor)) return 'N/A';
        var num = Number(valor);
        if (num === 0) return 'R$ 0,00';
        if (num >= 1000000000) {
            return 'R$ ' + (num / 1000000000).toFixed(2).replace('.', ',') + ' bilhões';
        }
        if (num >= 1000000) {
            return 'R$ ' + (num / 1000000).toFixed(2).replace('.', ',') + ' milhões';
        }
        if (num >= 1000) {
            return 'R$ ' + (num / 1000).toFixed(2).replace('.', ',') + ' mil';
        }
        return 'R$ ' + num.toFixed(2).replace('.', ',');
    }

    function mapearPorte(porte) {
        if (!porte) return 'N/A';
        var p = porte.toUpperCase().trim();
        if (p === 'MICRO EMPRESA' || p === 'MICROEMPRESA' || p === 'EMPRESA INDIVIDUAL' || p === 'MICRO EMPREENDEDOR INDIVIDUAL') {
            return 'MEI';
        }
        if (p === 'EMPRESA DE PEQUENO PORTE' || p === 'PEQUENO PORTE') {
            return 'ME';
        }
        if (p === 'DEMAIS') return 'GIGANTE';
        if (p === 'GIGANTE') return 'GIGANTE';
        return porte;
    }

    function calcularFaturamentoMensal(porte) {
        var faturamentoAnual = {
            'MEI': 81000,
            'ME': 360000,
            'EPP': 4800000,
            'MEDIO': 12000000,
            'GRANDE': 50000000,
            'GIGANTE': 50000000,
            'MICRO EMPRESA': 81000,
            'MICROEMPRESA': 81000,
            'EMPRESA INDIVIDUAL': 81000,
            'MICRO EMPREENDEDOR INDIVIDUAL': 81000,
            'EMPRESA DE PEQUENO PORTE': 360000,
            'PEQUENO PORTE': 360000
        };
        var faturamento = faturamentoAnual[porte] || faturamentoAnual['MEDIO'];
        return faturamento / 12;
    }

    function calcularDiasComprometimento(valorEfetivo, tipo, porte, renda, faturamentoAnual) {
        var ticketDiario = 0;
        if (tipo === 'pessoa_fisica' || tipo === 'pessoa') {
            var rendaUsada = (renda && renda > 0) ? renda : 3367;
            ticketDiario = rendaUsada / 30;
        } else {
            var faturamentoMensal = 0;
            if (faturamentoAnual) {
                faturamentoMensal = faturamentoAnual / 12;
            } else if (porte && porte !== 'N/A') {
                faturamentoMensal = calcularFaturamentoMensal(mapearPorte(porte));
            }
            if (faturamentoMensal > 0) {
                ticketDiario = faturamentoMensal / 30;
            }
        }
        if (ticketDiario > 0 && valorEfetivo > 0) {
            return Math.round((valorEfetivo / ticketDiario) * 10) / 10;
        }
        return 0;
    }

    function evidenciaJaExiste(lista, texto) {
        if (!lista || !Array.isArray(lista)) return false;
        var textoLower = texto.toLowerCase().trim();
        var palavrasTexto = textoLower.split(' ');
        for (var i = 0; i < lista.length; i++) {
            var itemTexto = lista[i].texto.toLowerCase().trim();
            if (itemTexto === textoLower) return true;
            if (itemTexto.length > 30 && textoLower.length > 30) {
                var palavrasItem = itemTexto.split(' ');
                var comuns = 0;
                for (var j = 0; j < palavrasTexto.length; j++) {
                    if (palavrasItem.indexOf(palavrasTexto[j]) !== -1) comuns++;
                }
                var total = Math.max(palavrasItem.length, palavrasTexto.length);
                if (total > 0 && comuns / total > 0.6) return true;
            }
        }
        return false;
    }

    function extrairTendenciaDasEvidencias(evidencias) {
        if (!evidencias || evidencias.length === 0) return null;
        var palavrasDeterioracao = [
            'fraude', 'investigação', 'pirâmide', 'lavagem', 'bloqueio',
            'queixas', 'reclamações', 'deterioração', 'crise', 'prejuízo',
            'insolvência', 'retenção', 'sanção', 'multa', 'processo',
            'recuperação judicial', 'falência', 'desvio', 'golpe'
        ];
        var palavrasMelhoria = [
            'crescimento', 'expansão', 'investimento', 'lucro', 'aumento',
            'redução', 'melhoria', 'recuperação', 'inovação', 'parceria',
            'abertura', 'lançamento', 'certificação', 'prêmio'
        ];
        var textoCompleto = evidencias.map(function(ev) {
            return (ev.titulo || '') + ' ' + (ev.descricao || '');
        }).join(' ').toLowerCase();
        var temDeterioracao = palavrasDeterioracao.some(function(palavra) {
            return textoCompleto.indexOf(palavra) !== -1;
        });
        var temMelhoria = palavrasMelhoria.some(function(palavra) {
            return textoCompleto.indexOf(palavra) !== -1;
        });
        if (temDeterioracao && !temMelhoria) return 'deteriorando';
        if (temMelhoria && !temDeterioracao) return 'melhorando';
        return 'estavel';
    }

    function gerarTextoPlacar(tendencia, evidencias) {
        if (tendencia === 'deteriorando') {
            return 'Evidências sugerem deterioração da imagem ou situação da empresa.';
        }
        if (tendencia === 'melhorando') {
            return 'Evidências sugerem melhoria ou crescimento da empresa.';
        }
        if (tendencia === 'estavel' && evidencias && evidencias.length > 0) {
            return 'Evidências indicam estabilidade, sem sinais de deterioração ou melhoria';
        }
        return 'Não foram observadas mudanças relevantes (primeira análise).';
    }

    function getDescricaoRisco(nome, contribuicao, percentualComprometimento, porteSol, porteAnal) {
        var descricoes = {
            'FINANCEIRO': function() {
                if (percentualComprometimento !== null && percentualComprometimento > 0 && percentualComprometimento < 1000) {
                    return 'Compromete <strong>' + percentualComprometimento + '%</strong> da capacidade financeira.';
                }
                return 'Risco de não cumprir compromissos financeiros.';
            },
            'RISCO ENTRE AS PARTES': function() {
                var ordem = { 'MEI': 1, 'ME': 2, 'EPP': 3, 'MEDIO': 4, 'GRANDE': 5, 'GIGANTE': 5 };
                var sol = ordem[porteSol] || 4;
                var anal = ordem[porteAnal] || 4;
                if (sol < anal) return 'Risco maior para o <strong>solicitante</strong> (porte menor).';
                if (anal < sol) return 'Risco maior para o <strong>analisado</strong> (porte menor).';
                return 'Risco equivalente para ambas as partes.';
            },
            'RISCO DE INTERRUPÇÃO': function() { return 'Risco da empresa interromper as atividades ou fechar.'; },
            'INTEGRIDADE': function() { return 'Risco de informações inconsistentes ou não verificáveis.'; },
            'VERACIDADE': function() { return 'Risco de dados cadastrais inconsistentes.'; },
            'REPUTACIONAL': function() { return 'Risco de danos à imagem ou credibilidade.'; },
            'COMPORTAMENTAL': function() { return 'Risco baseado na relação entre as partes.'; },
            'RESOLUTIVIDADE': function() { return 'Risco de dificuldade para resolver problemas ou conflitos.'; },
            'DETERIORACAO': function() { return 'Risco de piora da situação financeira da empresa.'; },
            'CONTRATUAL': function() { return 'Risco de cláusulas desfavoráveis no contrato.'; }
        };
        var desc = descricoes[nome];
        if (desc) return desc();
        return 'Risco identificado pela análise VERI.';
    }

    function obterNomeCurto(nomeCompleto, tipo) {
        if (!nomeCompleto) return "Usuário";
        if (tipo === "pessoa_fisica" || tipo === "pessoa") {
            return nomeCompleto.split(" ")[0];
        }
        var nomeLimpo = nomeCompleto.replace(/\s+LTDA\s*/g, "").replace(/\s+Ltda\s*/g, "").replace(/\s+S\/A\s*/g, "").replace(/\s+SA\s*/g, "").replace(/\s+EIRELI\s*/g, "").replace(/\s+MEI\s*/g, "").replace(/\s+EPP\s*/g, "").replace(/\s+ME\s*/g, "").replace(/\s+EI\s*/g, "").trim();
        if (nomeLimpo.length > 20) {
            nomeLimpo = nomeLimpo.substring(0, 20) + "...";
        }
        return nomeLimpo || nomeCompleto;
    }

    function formatarValorPorExtenso(valor) {
        if (!valor || valor <= 0) return null;
        var num = Math.round(valor);
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1).replace('.', ',') + ' bilhão';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace('.', ',') + ' milhões';
        }
        if (num >= 1000) {
            var milhares = num / 1000;
            if (Number.isInteger(milhares)) {
                return milhares + ' mil';
            } else {
                return milhares.toFixed(1).replace('.', ',') + ' mil';
            }
        }
        return num.toString();
    }

    function obterResultado() {
        var dados = localStorage.getItem('resultado_analise');
        if (dados) {
            try { return JSON.parse(dados); } catch(e) {}
        }
        return null;
    }

    function analisarControladora(cnpj) {
        window.location.href = 'analise.html?cnpj=' + encodeURIComponent(cnpj) + '&acao=analisar_controladora';
    }

    function estimarRiscoFinanceiro(dias) {
        if (dias <= 1) return { percentual: 3, nivel: 'Muito Baixo', cor: '🟢' };
        if (dias <= 5) return { percentual: 10, nivel: 'Baixo', cor: '🟢' };
        if (dias <= 10) return { percentual: 30, nivel: 'Moderado', cor: '🟡' };
        if (dias <= 15) return { percentual: 45, nivel: 'Alto', cor: '🟠' };
        if (dias <= 20) return { percentual: 65, nivel: 'Muito Alto', cor: '🔴' };
        return { percentual: 75, nivel: 'Crítico', cor: '🔴🔴' };
    }
// ============================================================
// RENDERIZAR RELATÓRIO COMPLETO (com simulação automática)
// ============================================================
function renderizarRelatorio(dados) {
    var resultado = dados.resultado || {};
    var auditoria = resultado.auditoria || {};
    var motor = resultado.motor || {};
    var dadosEstruturados = resultado.dados || {};
    var dadosEstrutura = dadosEstruturados.dados_estruturados || {};
    var dadosCadastrais = resultado.dados_cadastrais || {};

    var payload = dados.payload || {};
    var solicitante = payload.solicitante || {};
    var nomeSolicitante = dados.nome_solicitante || solicitante.nome || 'Usuário';
    var razaoSocialSolicitante = dados.razao_social_solicitante || solicitante.razao_social || '';
    var docSolicitante = solicitante.documento || '';
    var emailSolicitante = solicitante.email || '';
    var whatsappSolicitante = solicitante.whatsapp || '';
    var tipoSolicitante = solicitante.tipo || 'empresa';
    var rendaSolicitante = solicitante.renda || 0;
    var porteSolicitante = mapearPorte(solicitante.porte) || solicitante.porte || 'MEDIO';
    var valorNegocio = payload.valor || 0;
    var parcelas = payload.parcelas || 1;
    var pagamento = payload.pagamento || 'avista';
    var preocupacoes = payload.preocupacoes || [];
    var acao = payload.acao || 'analisar';
    var conhecimento = payload.conhecimento || 'nao_informado';
    var experiencia = payload.experiencia || 'nao_informada';
    var recomendacaoForm = payload.recomendacao || 'nao';

    var MAPA_PRECUPACOES = {
        'P01': 'não pagar',
        'P02': 'atraso no pagamento',
        'P03': 'quebra de contrato',
        'P04': 'fraude / informações falsas',
        'P05': 'qualidade do produto/serviço',
        'P06': 'atraso na entrega',
        'P07': 'outra preocupação'
    };

    var entrada = dados.entrada || 'N/A';
    var razaoSocial = dadosCadastrais.razao_social || dadosEstrutura.razao_social || entrada;
    var cnpjEncontrado = dadosCadastrais.cnpj || resultado.cnpj_encontrado || '';
    var porteOriginal = dadosCadastrais.porte || dadosEstrutura.porte || 'N/A';
    var porteExibido = mapearPorte(porteOriginal);
    var situacao = dadosCadastrais.situacao || dadosEstrutura.situacao || 'ATIVA';
    var dataAbertura = dadosCadastrais.data_abertura || dadosEstrutura.data_abertura || '';
    var site = dadosCadastrais.site || resultado.site_encontrado || null;
    var faturamentoAnual = dadosCadastrais.faturamento_anual || null;
    var emailAnalisado = dados.analisado_email || dadosCadastrais.email || '';
    var whatsappAnalisado = dados.analisado_whatsapp || dadosCadastrais.whatsapp || '';

    var socioMajoritario = dadosCadastrais.socio_majoritario || null;
    var controladora = dadosCadastrais.controladora || null;

    if (!socioMajoritario && dadosCadastrais.qsa && Array.isArray(dadosCadastrais.qsa) && dadosCadastrais.qsa.length > 0) {
        var maiorPercentual = 0;
        for (var idx = 0; idx < dadosCadastrais.qsa.length; idx++) {
            var socio = dadosCadastrais.qsa[idx];
            var perc = parseFloat(socio.percentual_socio || socio.percentual) || 0;
            if (perc > maiorPercentual) {
                maiorPercentual = perc;
                socioMajoritario = {
                    nome: socio.nome_socio || socio.nome || '',
                    percentual: perc,
                    qualificacao: socio.qualificacao_socio || socio.qualificacao || '',
                    cpf: socio.cpf_socio || socio.cnpj_socio || ''
                };
            }
            if (perc > 50 && (socio.cnpj_socio || socio.cnpj)) {
                controladora = {
                    nome: socio.nome_socio || socio.nome || '',
                    cnpj: socio.cnpj_socio || socio.cnpj || '',
                    percentual: perc
                };
            }
        }
    }

    var tempoMercado = 'N/A';
    var dataAberturaValida = false;
    if (dataAbertura && dataAbertura !== '') {
        var dataAberturaParsed = new Date(dataAbertura);
        if (isNaN(dataAberturaParsed.getTime())) {
            var partes = dataAbertura.split('/');
            if (partes.length === 3) {
                var dia = partes[0].padStart(2, '0');
                var mes = partes[1].padStart(2, '0');
                var ano = partes[2];
                var dataReformatada = ano + '-' + mes + '-' + dia;
                dataAberturaParsed = new Date(dataReformatada);
            }
        }
        if (!isNaN(dataAberturaParsed.getTime())) {
            var agora = new Date();
            var diffMs = agora - dataAberturaParsed;
            var diffAnos = diffMs / (1000 * 60 * 60 * 24 * 365.25);
            var anos = diffAnos.toFixed(1);
            if (!isNaN(anos) && parseFloat(anos) >= 0) {
                tempoMercado = anos + ' anos';
                dataAberturaValida = true;
            }
        }
    }
    if (!dataAberturaValida && dadosCadastrais.tempo_mercado_anos && !isNaN(dadosCadastrais.tempo_mercado_anos) && dadosCadastrais.tempo_mercado_anos > 0) {
        tempoMercado = dadosCadastrais.tempo_mercado_anos.toFixed(1) + ' anos';
        dataAberturaValida = true;
    }
    if (!dataAberturaValida) {
        tempoMercado = 'N/A';
    }

    var faturamentoMensalExibido = 'N/A';
    if (faturamentoAnual) {
        var valorNum = parseFloat(faturamentoAnual) / 12;
        if (!isNaN(valorNum) && valorNum > 0) {
            faturamentoMensalExibido = formatarFaturamento(valorNum);
        }
    } else if (porteOriginal && porteOriginal !== 'N/A') {
        var porteMapeado = mapearPorte(porteOriginal);
        var faturamentoCalculado = calcularFaturamentoMensal(porteMapeado);
        if (faturamentoCalculado > 0) {
            faturamentoMensalExibido = formatarFaturamento(faturamentoCalculado);
        }
    }

    var analisadoTipo = dados.analisado_tipo || 'empresa';
    var analisadoRenda = dados.analisado_renda || 0;
    var modulo = dados.modulo || 'geral';
    var subModulo = dados.subModulo || 'geral';

    var negocio = dados.negocio || 'analisar_geral';
    var mapaTitulo = {
        'comprar_loja': 'COMPRA EM LOJA',
        'comprar_fornecedor': 'COMPRA DE FORNECEDOR',
        'comprar_pessoa_fisica': 'COMPRA DE PESSOA FÍSICA',
        'vender_empresa': 'VENDA PARA EMPRESA',
        'vender_entidade_sem_fins': 'VENDA PARA ENTIDADE SEM FINS LUCRATIVOS',
        'vender_pessoa_fisica': 'VENDA PARA PESSOA FÍSICA',
        'contratar_empresa': 'CONTRATAÇÃO DE EMPRESA',
        'contratar_profissional_liberal': 'CONTRATAÇÃO DE PROFISSIONAL LIBERAL',
        'contratar_empregado': 'CONTRATAÇÃO DE EMPREGADO',
        'contratar_terceirizado': 'CONTRATAÇÃO DE TERCEIRIZADO',
        'contratar_freelancer': 'CONTRATAÇÃO DE FREELANCER',
        'contratar_diarista': 'CONTRATAÇÃO DE DIARISTA',
        'analisar_empresa': 'ANÁLISE DE EMPRESA',
        'analisar_pessoa_fisica': 'ANÁLISE DE PESSOA FÍSICA',
        'analisar_link': 'ANÁLISE DE LINK',
        'analisar_df': 'ANÁLISE DE DEMONSTRAÇÕES FINANCEIRAS'
    };
    var tipoAnalise = mapaTitulo[negocio] || 'ANÁLISE DE NEGÓCIO';

    var moduloLabel = '';
    var mapaModulo = {
        'pessoas': 'PESSOAS',
        'contratos': 'CONTRATOS',
        'leads': 'LEADS',
        'links': 'LINKS',
        'lotes': 'LOTES'
    };
    if (modulo !== 'geral' && mapaModulo[modulo]) {
        moduloLabel = ' — ' + mapaModulo[modulo];
        if (subModulo && subModulo !== 'geral') {
            var mapaSub = {
                'rh': 'RH',
                'terceirizado': 'TERCEIRIZADO',
                'profissional_liberal': 'PROFISSIONAL LIBERAL',
                'socio': 'SÓCIO',
                'prestacao_servico': 'PRESTAÇÃO DE SERVIÇO',
                'compra_venda': 'COMPRA E VENDA',
                'locacao': 'LOCAÇÃO',
                'parceria': 'PARCERIA',
                'financiamento': 'FINANCIAMENTO',
                'potencial_cliente': 'POTENCIAL CLIENTE',
                'fornecedor': 'FORNECEDOR',
                'parceiro_negocios': 'PARCEIRO DE NEGÓCIOS',
                'oportunidade': 'OPORTUNIDADE',
                'url_oferta': 'URL DE OFERTA',
                'link_patrocinado': 'LINK PATROCINADO',
                'url_encurtada': 'URL ENCURTADA',
                'codigo_rastreio': 'CÓDIGO DE RASTREIO',
                'atacado': 'ATACADO',
                'importacao': 'IMPORTAÇÃO',
                'commodities': 'COMMODITIES',
                'revenda': 'REVENDA'
            };
            if (mapaSub[subModulo]) {
                moduloLabel += ' — ' + mapaSub[subModulo];
            }
        }
    }

    var isCompra = (negocio === 'comprar_loja' || negocio === 'comprar_fornecedor' ||
                    negocio === 'comprar_pessoa_fisica' ||
                    negocio === 'contratar_empresa' || negocio === 'contratar_profissional_liberal' ||
                    negocio === 'contratar_empregado' || negocio === 'contratar_terceirizado' ||
                    negocio === 'contratar_freelancer' || negocio === 'contratar_diarista');
    var isVenda = (negocio === 'vender_empresa' || negocio === 'vender_entidade_sem_fins' ||
                   negocio === 'vender_pessoa_fisica');

    var ordemPorte = {
        'MEI': 1,
        'ME': 2,
        'EPP': 3,
        'MEDIO': 4,
        'GRANDE': 5,
        'GIGANTE': 5
    };
    var ordemSol = ordemPorte[porteSolicitante] || 4;
    var ordemAnal = ordemPorte[mapearPorte(porteOriginal)] || 4;

    var textoRelevancia = '';
    if (analisadoTipo === 'pessoa') {
        if (isVenda) {
            textoRelevancia = 'A RELEVÂNCIA deste negócio é maior para <strong>você</strong> (solicitante), pois o analisado é pessoa física (porte menor).';
        } else {
            textoRelevancia = 'A RELEVÂNCIA deste negócio é maior para o <strong>analisado</strong> (pessoa física), pois o porte <strong>dele</strong> é menor.';
        }
    } else {
        if (ordemSol < ordemAnal) {
            textoRelevancia = 'A RELEVÂNCIA deste negócio é maior para <strong>você</strong> (solicitante), pois o porte <strong>seu</strong> é menor.';
        } else if (ordemAnal < ordemSol) {
            textoRelevancia = 'A RELEVÂNCIA deste negócio é maior para o <strong>analisado</strong>, pois o porte <strong>dele</strong> é menor.';
        } else {
            textoRelevancia = 'A RELEVÂNCIA deste negócio é equivalente para ambas as partes.';
        }
    }
var situacaoIrregular = motor.situacao_irregular || false;
var scoreGlobal = situacaoIrregular ? 99 : (motor.score_global !== undefined ? motor.score_global : 50);
var recuperabilidade = situacaoIrregular ? 1 : (motor.recuperabilidade !== undefined ? motor.recuperabilidade : 50);
var recomendacao = situacaoIrregular ? 'PARE' : (motor.recomendacao || 'ATENCAO');
var riscos = motor.riscos || [];
var topRiscos = motor.top_riscos || [];
var riscoPrincipal = motor.risco_principal || 'FINANCEIRO';
var percentualComprometimento = motor.percentual_comprometimento || 0;
var diasComprometimento = motor.dias_comprometimento || 0;

var isRiscoCritico = riscos.some(function(r) { return r.nivel === 'CRITICO'; });

var riscoFinanceiroObj = null;
for (var i = 0; i < riscos.length; i++) {
    if (riscos[i].risco === 'FINANCEIRO') {
        riscoFinanceiroObj = riscos[i];
        break;
    }
}
if (!riscoFinanceiroObj) {
    riscoFinanceiroObj = { contribuicao: 0, nivel: 'BAIXO' };
}

var classeRecomendacao = getClasseRecomendacao(recomendacao);
var semaforoClass = getSemaforoClass(recomendacao);

var textoRecomendacao = '';
if (recomendacao === 'SIGA') textoRecomendacao = 'Recomendamos SIGA: iniciar ou intensificar o negócio.';
else if (recomendacao === 'ATENCAO') textoRecomendacao = 'Recomendamos ATENÇÃO: cuidado e monitoramento.';
else textoRecomendacao = 'Recomendamos PARE: interromper esse negócio.';

var valorFormatado = formatarMoeda(valorNegocio || 0);
var nomeLimpoAnalisado = limparNomeEmpresa(razaoSocial) || 'analisado';

var acaoProtetiva = motor.acao_protetiva || 'Monitore de perto a execução do negócio.';

var textoOportunidade = '';
var textoAmeaca = '';

if (situacaoIrregular) {
    var valorFormatadoIrregular = formatarMoeda(valorNegocio || 0);
    textoOportunidade = '🚫 Não faça negócio com essa empresa e evite prejuízo ou perda no valor de ' + valorFormatadoIrregular + '.';
    textoAmeaca = 'Empresa com situação cadastral irregular. Risco de prejuízo total.';
} else if (isCompra) {
    textoOportunidade = 'Fazer um negócio seguro e confiável.';
    textoAmeaca = 'Receber os produtos/serviços com atraso ou não receber e ter problemas ou prejuízo com o negócio.';
} else if (isVenda) {
    textoOportunidade = 'Obter receita de ' + valorFormatado + ' e lucrar com a venda.';
    if (mapearPorte(porteOriginal) === 'GIGANTE') {
        textoOportunidade += ' <strong>Procure intensificar o relacionamento e negócios com a ' + nomeLimpoAnalisado + '.</strong>';
    }
    textoAmeaca = 'Receber o valor da venda atrasado ou não receber e ter prejuízo com o negócio.';
} else {
    textoOportunidade = 'Fazer o negócio e obter ' + valorFormatado + '.';
    textoAmeaca = 'Perder o montante de ' + valorFormatado + ' se o negócio não der certo.';
}

var textoItem2 = '';
if (isRiscoCritico || situacaoIrregular) {
    textoItem2 = 'Você pode perder ' + valorFormatado + ' se este negócio não der certo.';
} else if (isCompra) {
    textoItem2 = 'Fazer este negócio pode gerar um <strong>custo/despesa</strong> de ' + valorFormatado + '.';
} else if (isVenda) {
    textoItem2 = 'Fazer este negócio pode gerar uma <strong>receita</strong> de ' + valorFormatado + '.';
} else {
    textoItem2 = 'Fazer este negócio pode gerar um impacto de ' + valorFormatado + '.';
}

var listaPreocupacoes = preocupacoes.map(function(id) {
    return MAPA_PRECUPACOES[id] || id;
}).join(', ');

var isParcelado = (pagamento === 'aprazo' || pagamento === 'a prazo') && parcelas > 1;
var valorEfetivoImpacto = isParcelado ? (valorNegocio / parcelas) : valorNegocio;

var diasAnalisado = 0;
if (analisadoTipo === 'pessoa_fisica' || analisadoTipo === 'pessoa') {
    var rendaAnalisadoMensal = analisadoRenda || 3367;
    diasAnalisado = calcularDiasComprometimento(valorEfetivoImpacto, 'pessoa', null, rendaAnalisadoMensal, null);
} else {
    var faturamentoAnualParaCalculo = faturamentoAnual || null;
    diasAnalisado = calcularDiasComprometimento(valorEfetivoImpacto, 'empresa', porteOriginal, 0, faturamentoAnualParaCalculo);
}
if (isNaN(diasAnalisado)) diasAnalisado = 0;

var diasSolicitante = 0;
var baseSolicitante = '';

if (tipoSolicitante === 'pessoa_fisica' || tipoSolicitante === 'pessoa') {
    var rendaSolUsar = rendaSolicitante || 3367;
    diasSolicitante = calcularDiasComprometimento(valorEfetivoImpacto, 'pessoa', null, rendaSolUsar, null);
    baseSolicitante = 'Base: Renda mensal / 30' + (rendaSolicitante > 0 ? '' : ' (Média IBGE 2025)');
} else {
    var faturamentoSolicitante = solicitante.faturamento_anual || null;
    if (!faturamentoSolicitante || faturamentoSolicitante <= 0) {
        faturamentoSolicitante = 120000 * 12;
        baseSolicitante = 'Base: faturamento diário estimado (padrão VERI)';
    } else {
        baseSolicitante = 'Base: faturamento diário informado';
    }
    diasSolicitante = calcularDiasComprometimento(valorEfetivoImpacto, 'empresa', null, 0, faturamentoSolicitante);
}
if (isNaN(diasSolicitante) || diasSolicitante < 0) diasSolicitante = 0;

var nivelAnalisado = getNivelImpacto(diasAnalisado);
var nivelSolicitante = getNivelImpacto(diasSolicitante);

var ameacaOriginal = scoreGlobal;
var oportunidadeOriginal = recuperabilidade;
var riscoFinanceiroOriginal = 0;
for (var ri = 0; ri < riscos.length; ri++) {
    if (riscos[ri].risco === 'FINANCEIRO') {
        riscoFinanceiroOriginal = riscos[ri].contribuicao || 0;
        break;
    }
}
if (riscoFinanceiroOriginal === 0) {
    riscoFinanceiroOriginal = 37.3;
}
var nivelFinanceiroOriginal = getNivelImpacto(diasAnalisado);

var faturamentoMensalAnalisado = 0;
if (faturamentoAnual) {
    faturamentoMensalAnalisado = faturamentoAnual / 12;
} else if (porteOriginal && porteOriginal !== 'N/A') {
    faturamentoMensalAnalisado = calcularFaturamentoMensal(mapearPorte(porteOriginal));
}

var parcelaParaBaixo = calcularParcelaParaBaixo(faturamentoMensalAnalisado);
var parcelasParaBaixo = Math.ceil(valorNegocio / parcelaParaBaixo);
var parcelaFinalBaixo = Math.round(valorNegocio / parcelasParaBaixo);
parcelaFinalBaixo = Math.round(parcelaFinalBaixo / 50) * 50;
if (parcelaFinalBaixo === 0) parcelaFinalBaixo = parcelaParaBaixo;

var todosRiscos = riscos || [];
var riscoFinanceiro = null;
var outrosRiscos = [];

for (var ri2 = 0; ri2 < todosRiscos.length; ri2++) {
    if (todosRiscos[ri2].risco === 'FINANCEIRO') {
        riscoFinanceiro = todosRiscos[ri2];
    } else {
        outrosRiscos.push(todosRiscos[ri2]);
    }
}

outrosRiscos.sort(function(a, b) {
    return (b.contribuicao || 0) - (a.contribuicao || 0);
});

var top3 = outrosRiscos.slice(0, 3);
var riscosSelecionados = [];
var temFinanceiro = false;

for (var rj = 0; rj < top3.length; rj++) {
    riscosSelecionados.push(top3[rj]);
    if (top3[rj].risco === 'FINANCEIRO') temFinanceiro = true;
}

if (!temFinanceiro && riscoFinanceiro) {
    riscosSelecionados.push(riscoFinanceiro);
}

var contadorRiscos = 0;
while (riscosSelecionados.length < 4 && contadorRiscos < outrosRiscos.length) {
    var candidato = outrosRiscos[contadorRiscos];
    var jaExiste = false;
    for (var rk = 0; rk < riscosSelecionados.length; rk++) {
        if (riscosSelecionados[rk].risco === candidato.risco) jaExiste = true;
    }
    if (!jaExiste) {
        riscosSelecionados.push(candidato);
    }
    contadorRiscos++;
}

var somaContrib = 0;
for (var rl = 0; rl < riscosSelecionados.length; rl++) {
    somaContrib += riscosSelecionados[rl].contribuicao || 0;
}

if (somaContrib > 0) {
    var fator = scoreGlobal / somaContrib;
    for (var rm = 0; rm < riscosSelecionados.length; rm++) {
        riscosSelecionados[rm].contribuicaoNormalizada = Math.round((riscosSelecionados[rm].contribuicao * fator) * 10) / 10;
    }
} else {
    for (var rn = 0; rn < riscosSelecionados.length; rn++) {
        riscosSelecionados[rn].contribuicaoNormalizada = 0;
    }
}

riscosSelecionados.sort(function(a, b) {
    return (b.contribuicaoNormalizada || 0) - (a.contribuicaoNormalizada || 0);
});

var riscosFiltrados = riscosSelecionados;

var frase1 = '';
if (recomendacao === 'PARE') {
    frase1 = 'A chance de NÃO dar problema é de ' + recuperabilidade + '%. Recomendamos <strong>PARE</strong>: interromper esse negócio.';
} else if (recomendacao === 'ATENCAO') {
    frase1 = 'A chance de NÃO dar problema é de ' + recuperabilidade + '%. Recomendamos <strong>ATENÇÃO</strong>: cuidado e monitoramento.';
} else {
    frase1 = 'A chance de NÃO dar problema é de ' + recuperabilidade + '%, siga para a conclusão do negócio.';
}

// ============================================================
// RESPOSTAS PARA PREOCUPAÇÕES
// ============================================================
var respostasPreocupacoes = [];
var probAmeaca = scoreGlobal;
var probOportunidade = 100 - probAmeaca;

var MAPA_TEXTO = {
    'P01': { problema: 'NÃO PAGAR', solucao: 'PAGAR' },
    'P02': { problema: 'ATRASO NO PAGAMENTO', solucao: 'PAGAR EM DIA' },
    'P03': { problema: 'QUEBRAR O CONTRATO', solucao: 'CUMPRIR O CONTRATO' },
    'P04': { problema: 'FRAUDE', solucao: 'NÃO HAVER FRAUDE' },
    'P05': { problema: 'PROBLEMAS DE QUALIDADE', solucao: 'QUALIDADE ADEQUADA' },
    'P06': { problema: 'ATRASAR A ENTREGA', solucao: 'ENTREGAR NO PRAZO' },
    'P07': { problema: 'DAR PROBLEMA', solucao: 'NÃO DAR PROBLEMA' }
};

var temPreocupacao = false;

if (preocupacoes && preocupacoes.length > 0) {
    for (var pi = 0; pi < preocupacoes.length; pi++) {
        var id = preocupacoes[pi];
        var texto = MAPA_TEXTO[id];
        if (texto) {
            temPreocupacao = true;
            var linha = 'A probabilidade de <strong>' + texto.problema + '</strong> é <strong style="color:#FF6B6B;">' + probAmeaca + '%</strong>. A probabilidade de <strong>' + texto.solucao + '</strong> é <strong style="color:#34D399;">' + probOportunidade + '%</strong>.';
            respostasPreocupacoes.push(linha);
        }
    }
}

var outraPreocupacao = dados.outra_preocupacao || '';
if (outraPreocupacao && outraPreocupacao.trim() !== '') {
    temPreocupacao = true;
    var textoDigitado = outraPreocupacao.trim().toUpperCase();
    var linha = 'A probabilidade de <strong>OCORRER</strong> <strong>' + textoDigitado + '</strong> é <strong style="color:#FF6B6B;">' + probAmeaca + '%</strong>. A probabilidade de <strong>NÃO OCORRER</strong> <strong>' + textoDigitado + '</strong> é <strong style="color:#34D399;">' + probOportunidade + '%</strong>.';
    respostasPreocupacoes.push(linha);
}

if (!temPreocupacao) {
    var linha = 'A probabilidade de <strong>DAR PROBLEMA</strong> é <strong style="color:#FF6B6B;">' + probAmeaca + '%</strong>. A probabilidade de <strong>NÃO DAR PROBLEMA</strong> é <strong style="color:#34D399;">' + probOportunidade + '%</strong>.';
    respostasPreocupacoes.push(linha);
}

var frases = [];

if (respostasPreocupacoes.length > 0) {
    for (var fi = 0; fi < respostasPreocupacoes.length; fi++) {
        frases.push(respostasPreocupacoes[fi]);
    }
}
frases.push(textoItem2);
frases.push(textoRelevancia);
frases.push(frase1);

var frase4 = '';
if (situacaoIrregular) {
    frase4 = 'A empresa está com situação cadastral irregular: ' + situacao + '. Não recomendamos fazer negócio para não correr risco de prejuízo.';
} else {
    var tendencia = extrairTendenciaDasEvidencias(resultado.evidencias || []);
    var textoPlacar = gerarTextoPlacar(tendencia, resultado.evidencias || []);
    frase4 = 'Tendência captada pela análise: ' + textoPlacar + ' do(a) ' + nomeLimpoAnalisado + '.';
}

var evidenciasExternas = [];
var evidenciasFallback = [];

if (resultado.evidencias && resultado.evidencias.length > 0) {
    for (var ge = 0; ge < resultado.evidencias.length; ge++) {
        var evGemini = resultado.evidencias[ge];
        if (evGemini.descricao) {
            evidenciasExternas.push({
                texto: evGemini.descricao,
                titulo: evGemini.titulo || '',
                fonte: evGemini.fonte || 'IA',
                url: evGemini.url || '#',
                tipo: 'externa'
            });
        }
    }
}

if (dadosEstrutura.reputacional && dadosEstrutura.reputacional.mencoes_midia && dadosEstrutura.reputacional.mencoes_midia.evidencias) {
    var mm = dadosEstrutura.reputacional.mencoes_midia.evidencias;
    for (var e = 0; e < mm.length; e++) {
        var ev = mm[e];
        if (ev.descricao) {
            if (!evidenciaJaExiste(evidenciasExternas, ev.descricao) &&
                !evidenciaJaExiste(evidenciasFallback, ev.descricao)) {
                evidenciasFallback.push({
                    texto: ev.descricao,
                    titulo: '',
                    fonte: 'Fonte externa',
                    url: ev.url || '#',
                    tipo: 'fallback'
                });
            }
        }
    }
}
if (dadosEstrutura.red_flags && dadosEstrutura.red_flags.fraudes && dadosEstrutura.red_flags.fraudes.red_flags) {
    var rf = dadosEstrutura.red_flags.fraudes.red_flags;
    for (var e3 = 0; e3 < rf.length; e3++) {
        var ev3 = rf[e3];
        if (ev3.descricao) {
            if (!evidenciaJaExiste(evidenciasExternas, ev3.descricao) &&
                !evidenciaJaExiste(evidenciasFallback, ev3.descricao)) {
                evidenciasFallback.push({
                    texto: ev3.descricao,
                    titulo: '',
                    fonte: 'Fonte externa',
                    url: ev3.url || '#',
                    tipo: 'fallback'
                });
            }
        }
    }
}

if (evidenciasFallback.length === 0 && resultado.evidencias && resultado.evidencias.length > 0) {
    var fb = resultado.evidencias;
    for (var e6 = 0; e6 < fb.length; e6++) {
        var ev6 = fb[e6];
        if (ev6.descricao) {
            if (!evidenciaJaExiste(evidenciasExternas, ev6.descricao) &&
                !evidenciaJaExiste(evidenciasFallback, ev6.descricao)) {
                evidenciasFallback.push({
                    texto: ev6.descricao,
                    titulo: '',
                    fonte: 'Fonte externa',
                    url: ev6.url || '#',
                    tipo: 'fallback'
                });
            }
        }
    }
}

var fallbackTextos = [];
if (situacao) {
    var texto = 'CNPJ com situação cadastral: ' + situacao + '. Empresa em situação regular perante a Receita Federal.';
    if (!evidenciaJaExiste(evidenciasExternas, texto) && !evidenciaJaExiste(evidenciasFallback, texto)) {
        fallbackTextos.push({ texto: texto, fonte: 'Receita Federal do Brasil', url: 'https://www.gov.br/receitafederal' });
    }
}
if (tempoMercado && tempoMercado !== 'N/A') {
    var porteCorrigidoEvidencia = mapearPorte(porteOriginal);
    var texto = 'Empresa com porte ' + porteCorrigidoEvidencia + ' e ' + tempoMercado + ' de mercado. Tempo de mercado sólido, indicando menor risco de descontinuidade.';
    if (!evidenciaJaExiste(evidenciasExternas, texto) && !evidenciaJaExiste(evidenciasFallback, texto)) {
        fallbackTextos.push({ texto: texto, fonte: 'Receita Federal do Brasil', url: 'https://www.gov.br/receitafederal' });
    }
}

if (diasAnalisado > 0 && diasAnalisado <= 0.5) {
    var textoComprometimento = 'O valor da parcela compromete <strong>' + formatarMoeda(valorEfetivoImpacto) + '</strong> do faturamento diário do analisado (' + nomeLimpoAnalisado + ').';
    if (!evidenciaJaExiste(evidenciasExternas, textoComprometimento) &&
        !evidenciaJaExiste(evidenciasFallback, textoComprometimento)) {
        fallbackTextos.push({
            texto: textoComprometimento,
            fonte: 'Receita Federal do Brasil',
            url: 'https://www.gov.br/receitafederal'
        });
    }
}

var mapaConhecimento = {
    'nenhum': '❌ Não conhece',
    'pouco': '🔍 Conhece pouco',
    'maisoumenos': '🤔 Conhece mais ou menos',
    'bem': '👍 Conhece bem'
};

var mapaExperiencia = {
    'nenhuma': '❌ Nenhuma experiência',
    'positiva': '😊 Experiência positiva',
    'neutra': '😐 Experiência neutra',
    'negativa': '😞 Experiência negativa'
};

var textoConhecimento = mapaConhecimento[conhecimento] || 'Não informado';
var textoExperiencia = mapaExperiencia[experiencia] || 'Não informada';
var textoRecomendacaoForm = recomendacaoForm === 'sim' ? '✅ Sim' : '❌ Não';

var textoContexto = 'Conhecimento sobre a parte: ' + textoConhecimento + '. Experiência anterior: ' + textoExperiencia + '. Recomendação: ' + textoRecomendacaoForm + '.';
if (!evidenciaJaExiste(evidenciasExternas, textoContexto) && !evidenciaJaExiste(evidenciasFallback, textoContexto)) {
    evidenciasFallback.push({
        texto: textoContexto,
        titulo: '📌 Contexto do Relacionamento',
        fonte: 'Usuário',
        url: '#',
        tipo: 'contexto'
    });
}

for (var ft = 0; ft < fallbackTextos.length && evidenciasFallback.length < 2; ft++) {
    var item = fallbackTextos[ft];
    if (!evidenciaJaExiste(evidenciasExternas, item.texto) && !evidenciaJaExiste(evidenciasFallback, item.texto)) {
        evidenciasFallback.push({
            texto: item.texto,
            titulo: '',
            fonte: item.fonte,
            url: item.url,
            tipo: 'fallback'
        });
    }
}

while (evidenciasFallback.length < 2) {
    var textoPadrao = 'Dados cadastrais consultados na base da Receita Federal.';
    if (!evidenciaJaExiste(evidenciasExternas, textoPadrao) &&
        !evidenciaJaExiste(evidenciasFallback, textoPadrao)) {
        evidenciasFallback.push({
            texto: textoPadrao,
            titulo: '',
            fonte: 'Receita Federal do Brasil',
            url: 'https://www.gov.br/receitafederal',
            tipo: 'fallback'
        });
    } else {
        break;
    }
}

evidenciasExternas = evidenciasExternas.slice(0, 2);
evidenciasFallback = evidenciasFallback.slice(0, 2);

var evidenciaDescontinuidade = null;
var evidenciaIntegridade = null;
var evidenciaRelacional = null;
var evidenciaComportamental = null;

var todasEvidencias = evidenciasExternas.concat(evidenciasFallback);

todasEvidencias.forEach(function(ev) {
    var texto = ev.texto || '';
    var titulo = ev.titulo || '';

    if (texto.indexOf('anos de mercado') !== -1 ||
        texto.indexOf('tempo de mercado') !== -1 ||
        texto.indexOf('situação cadastral') !== -1 ||
        texto.indexOf('ATIVA') !== -1 ||
        texto.indexOf('BAIXADA') !== -1) {
        evidenciaDescontinuidade = ev;
    } else if (texto.indexOf('Dados cadastrais consultados') !== -1 ||
               texto.indexOf('Receita Federal') !== -1) {
        evidenciaIntegridade = ev;
    } else if (titulo.indexOf('Contexto do Relacionamento') !== -1 ||
               texto.indexOf('Conhecimento sobre a parte') !== -1 ||
               texto.indexOf('Experiência anterior') !== -1 ||
               texto.indexOf('Recomendação') !== -1) {
        evidenciaRelacional = ev;
    } else {
        evidenciaComportamental = ev;
    }
});

if (!evidenciaDescontinuidade) {
    evidenciaDescontinuidade = {
        texto: 'Empresa com situação regular e tempo de mercado sólido, indicando menor risco de descontinuidade.',
        titulo: '',
        fonte: 'Receita Federal do Brasil',
        url: 'https://www.gov.br/receitafederal',
        tipo: 'fallback'
    };
}
if (!evidenciaIntegridade) {
    evidenciaIntegridade = {
        texto: 'Dados cadastrais consultados na base da Receita Federal.',
        titulo: '',
        fonte: 'Receita Federal do Brasil',
        url: 'https://www.gov.br/receitafederal',
        tipo: 'fallback'
    };
}
if (!evidenciaRelacional) {
    evidenciaRelacional = {
        texto: 'Contexto do relacionamento baseado nas informações fornecidas pelo usuário.',
        titulo: '📌 Contexto do Relacionamento',
        fonte: 'Usuário',
        url: '#',
        tipo: 'contexto'
    };
}
if (!evidenciaComportamental) {
    evidenciaComportamental = null;
}

var evidenciasOrdenadas = [
    evidenciaDescontinuidade,
    evidenciaIntegridade,
    evidenciaRelacional,
    evidenciaComportamental
].filter(function(ev) { return ev !== null && ev !== undefined; });

var ticketDiarioComprador = 0;
var exibirLimite = false;
var valorMaximo = 0;
var limiteFormatado = null;
var sugestaoParcelamento = '';
var valorParcelaIdeal = 0;
var parcelasIdeais = 0;

var parteFinanceira = 'analisado';
if (isCompra || negocio.startsWith('contratar')) {
    parteFinanceira = 'solicitante';
} else if (isVenda) {
    parteFinanceira = 'analisado';
} else if (negocio.startsWith('analisar')) {
    parteFinanceira = 'analisado';
}

if (parteFinanceira === 'solicitante') {
    if (tipoSolicitante === 'pessoa_fisica' || tipoSolicitante === 'pessoa') {
        var rendaSol = rendaSolicitante || 3367;
        ticketDiarioComprador = rendaSol / 30;
        exibirLimite = true;
    } else if (tipoSolicitante === 'empresa') {
        var faturamentoMensalSol = 0;
        var faturamentoAnualSol = solicitante.faturamento_anual || null;
        if (faturamentoAnualSol) {
            faturamentoMensalSol = faturamentoAnualSol / 12;
        } else if (solicitante.porte && solicitante.porte !== 'N/A') {
            faturamentoMensalSol = calcularFaturamentoMensal(mapearPorte(solicitante.porte));
        }
        if (!faturamentoMensalSol || faturamentoMensalSol <= 0) {
            faturamentoMensalSol = 120000;
        }
        ticketDiarioComprador = faturamentoMensalSol / 30;
        exibirLimite = true;
    }
} else {
    if (analisadoTipo === 'pessoa_fisica' || analisadoTipo === 'pessoa') {
        var rendaComprador = (analisadoRenda && analisadoRenda > 0) ? analisadoRenda : 3367;
        ticketDiarioComprador = rendaComprador / 30;
        exibirLimite = true;
    } else if (analisadoTipo === 'empresa' || analisadoTipo === 'instituicao') {
        var faturamentoMensalComprador = 0;
        if (faturamentoAnual) {
            faturamentoMensalComprador = faturamentoAnual / 12;
        } else if (porteOriginal && porteOriginal !== 'N/A') {
            faturamentoMensalComprador = calcularFaturamentoMensal(mapearPorte(porteOriginal));
        }
        if (faturamentoMensalComprador > 0) {
            ticketDiarioComprador = faturamentoMensalComprador / 30;
            exibirLimite = true;
        }
    }
}

if (exibirLimite && ticketDiarioComprador > 0) {
    valorMaximo = Math.round(9 * ticketDiarioComprador);
    limiteFormatado = formatarValorPorExtenso(valorMaximo);

    if (isParcelado) {
        parcelasIdeais = Math.ceil(valorNegocio / valorMaximo);
        valorParcelaIdeal = Math.round(valorNegocio / parcelasIdeais);
        var entrada = valorNegocio - (parcelasIdeais * valorParcelaIdeal);
        if (entrada > 0) {
            sugestaoParcelamento = '💡 Para fechar negócio, ' + (isVenda ? 'venda' : 'parcele') + ' em <strong>' + parcelasIdeais + ' parcelas de ' + formatarMoeda(valorParcelaIdeal) + '</strong> com entrada de <strong>' + formatarMoeda(entrada) + '</strong>.';
        } else {
            sugestaoParcelamento = '💡 Para fechar negócio, ' + (isVenda ? 'venda' : 'parcele') + ' em <strong>' + parcelasIdeais + ' parcelas de ' + formatarMoeda(valorParcelaIdeal) + '</strong>.';
        }
    }
}

var textoOportunidadeFinal = textoOportunidade;
var textoAmeacaFinal = textoAmeaca;

if (isParcelado && sugestaoParcelamento) {
    textoOportunidadeFinal = textoOportunidade + '<br>' + sugestaoParcelamento;
}

var valorParcelaAtual = isParcelado ? (valorNegocio / parcelas) : valorNegocio;
var dataHora = new Date().toLocaleString('pt-BR');
var html = '';
// ============================================================
        // INÍCIO DA CONSTRUÇÃO DO HTML DO RELATÓRIO
        // ============================================================
        html += '<div class="header">';
        html += '<div><span class="logo">VERI<sup>®</sup></span></div>';
        html += '<div><div class="tagline-header">Análise prévia para decisões de negócios mais seguras.</div>';
        html += '<div class="data-hora">' + dataHora + '</div></div>';
        html += '</div>';

        html += '<div class="hero">';
        html += '<h1>';
        html += '<span class="amarelo">ANTES</span>';
        html += ' <span class="verde-menor">de decidir, dá um</span> ';
        html += '<span class="verde-veri">VERI</span><span class="marca">®</span>';
        html += '</h1>';
        html += '</div>';

        html += '<div class="titulo-relatorio">RELATÓRIO DE ANÁLISE VERI DE ' + tipoAnalise + moduloLabel + '</div>';

        html += '<div class="grid-2col">';
        html += '<div class="info-box"><div class="label">SOLICITANTE</div>';

        if (tipoSolicitante === 'empresa' && nomeSolicitante && nomeSolicitante !== razaoSocialSolicitante) {
            html += '<div class="value"><strong>' + nomeSolicitante + '</strong></div>';
            if (razaoSocialSolicitante) {
                html += '<div class="doc-linha"><strong>Empresa:</strong> ' + razaoSocialSolicitante + '</div>';
            }
        } else {
            html += '<div class="value"><strong>' + nomeSolicitante + '</strong></div>';
        }

        var rotuloSolicitante = '';
        if (tipoSolicitante === 'empresa' || (docSolicitante && docSolicitante.replace(/\D/g, '').length === 14)) {
            rotuloSolicitante = 'CNPJ';
        } else if (tipoSolicitante === 'pessoa_fisica' || (docSolicitante && docSolicitante.replace(/\D/g, '').length === 11)) {
            rotuloSolicitante = 'CPF';
        } else {
            rotuloSolicitante = 'Documento';
        }
        if (docSolicitante) {
            html += '<div class="doc-linha"><strong>' + rotuloSolicitante + ':</strong> ' + docSolicitante + '</div>';
        }

        if (tipoSolicitante) {
            var tipoExibido = tipoSolicitante === 'empresa' ? 'Pessoa Jurídica' : 'Pessoa Física';
            html += '<div class="doc-linha"><strong>Tipo:</strong> ' + tipoExibido + '</div>';
        }

        if (tipoSolicitante === 'empresa') {
            var porteSolExibido = mapearPorte(solicitante.porte) || 'MEDIO';
            if (porteSolExibido === 'N/A' || porteSolExibido === '') {
                porteSolExibido = 'MEDIO';
            }
            html += '<div class="doc-linha"><strong>Porte:</strong> ' + porteSolExibido + '</div>';

            var faturamentoMensalSol = 0;
            var faturamentoMensalSolExibido = 'N/A';
            var faturamentoFonteSol = '';
            var faturamentoInformado = solicitante.faturamento_anual ? parseFloat(solicitante.faturamento_anual) : null;

            if (faturamentoInformado && faturamentoInformado > 0) {
                faturamentoMensalSol = faturamentoInformado / 12;
                faturamentoMensalSolExibido = formatarFaturamento(faturamentoMensalSol);
                faturamentoFonteSol = 'Informado';
            } else {
                faturamentoMensalSol = 120000;
                faturamentoMensalSolExibido = formatarFaturamento(faturamentoMensalSol);
                faturamentoFonteSol = 'Estimado (padrão VERI)';
            }
            html += '<div class="doc-linha"><strong>Faturamento mensal estimado:</strong> ' + faturamentoMensalSolExibido + '</div>';
            html += '<div style="font-size:0.65rem; color:#6A6F82;">' + faturamentoFonteSol + '</div>';
        } else if (tipoSolicitante === 'pessoa_fisica' || tipoSolicitante === 'pessoa') {
            var rendaSolExibida = rendaSolicitante || 3367;
            var rendaFonteSol = (rendaSolicitante > 0) ? 'Informada' : 'Média IBGE 2025';
            html += '<div class="doc-linha"><strong>Renda mensal:</strong> ' + formatarMoeda(rendaSolExibida) + '</div>';
            html += '<div style="font-size:0.65rem; color:#6A6F82;">' + rendaFonteSol + '</div>';
        }

        if (emailSolicitante) {
            html += '<div class="doc-linha"><strong>E-mail:</strong> ' + emailSolicitante + '</div>';
        }
        if (whatsappSolicitante) {
            html += '<div class="doc-linha"><strong>WhatsApp:</strong> ' + whatsappSolicitante + '</div>';
        }

        if (tipoSolicitante === 'empresa' && nomeSolicitante && nomeSolicitante !== razaoSocialSolicitante && razaoSocialSolicitante) {
            html += '<div class="doc-linha"><strong>Solicitante:</strong> ' + nomeSolicitante + '</div>';
        }

        html += '<div class="recomendacao-destaque">';
        html += '<span class="' + semaforoClass + '"></span>';
        html += '<span class="recomendacao-texto ' + classeRecomendacao + '">' + recomendacao + '</span>';
        html += '<span class="recomendacao-sub">— ' + textoRecomendacao + '</span>';
        html += '</div>';
        html += '<div class="mais-detalhes">▼ Abaixo mais detalhes da análise.</div>';
        html += '</div>';

        html += '<div class="info-box"><div class="label">ANALISADO</div>';
        var nomeAnalisadoExibicao = razaoSocial || dados.entrada || 'Analisado';
        html += '<div class="value"><strong>' + nomeAnalisadoExibicao + '</strong></div>';
        var rotuloAnalisado = '';
        if (analisadoTipo === 'empresa' || (cnpjEncontrado && cnpjEncontrado.replace(/\D/g, '').length === 14)) {
            rotuloAnalisado = 'CNPJ';
        } else if (analisadoTipo === 'pessoa' || (cnpjEncontrado && cnpjEncontrado.replace(/\D/g, '').length === 11)) {
            rotuloAnalisado = 'CPF';
        } else {
            rotuloAnalisado = 'Documento';
        }
        html += '<div class="analisado-detalhes">';
        html += '<div class="linha"><strong>' + rotuloAnalisado + ':</strong> ' + (cnpjEncontrado || 'N/A') + '</div>';
        html += '<div class="linha"><strong>Porte:</strong> ' + mapearPorte(porteOriginal) + '</div>';
        html += '<div class="linha"><strong>Situação:</strong> ' + situacao + '</div>';
        html += '<div class="linha"><strong>Tempo de mercado:</strong> ' + tempoMercado + '</div>';
        if (analisadoTipo === 'pessoa') {
            if (analisadoRenda && analisadoRenda > 0) {
                html += '<div class="linha"><strong>Renda:</strong> ' + formatarMoeda(analisadoRenda) + '</div>';
            } else {
                html += '<div class="linha"><strong>Renda:</strong> R$ 3.367,00 (média IBGE 2025)</div>';
            }
        } else {
            html += '<div class="linha"><strong>Faturamento mensal estimado:</strong> ' + faturamentoMensalExibido + '</div>';
        }

        if (site && site !== 'Não encontrado' && site !== 'null' && site !== '' && !site.startsWith('www.')) {
            html += '<div class="linha"><strong>Site:</strong> <a href="https://' + site + '" target="_blank" style="color:#2DD4BF; text-decoration:none;">' + site + '</a></div>';
        }

        if (emailAnalisado) {
            html += '<div class="linha"><strong>E-mail:</strong> ' + emailAnalisado + '</div>';
        }
        if (whatsappAnalisado) {
            html += '<div class="linha"><strong>WhatsApp:</strong> ' + whatsappAnalisado + '</div>';
        }

        var temSocietaria = (socioMajoritario !== null || controladora !== null);
        if (temSocietaria) {
            html += '<div class="societaria-wrapper">';
            html += '<div class="titulo-societaria">👤 ESTRUTURA SOCIETÁRIA</div>';
            if (socioMajoritario !== null) {
                var labelSocio = 'Sócio';
                if (socioMajoritario.percentual && socioMajoritario.percentual > 50) {
                    labelSocio = 'Sócio Majoritário';
                }
                html += '<div class="socio-item">';
                html += '<strong>' + labelSocio + ':</strong> ' + socioMajoritario.nome;
                if (socioMajoritario.percentual !== undefined && socioMajoritario.percentual !== null && socioMajoritario.percentual > 0) {
                    html += ' <span class="percentual">(' + socioMajoritario.percentual + '%)</span>';
                }
                if (socioMajoritario.qualificacao) {
                    html += ' <span class="qualificacao">— ' + socioMajoritario.qualificacao + '</span>';
                }
                if (socioMajoritario.cpf) {
                    var cpfFormatado = socioMajoritario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                    html += ' <span class="cpf-cnpj">CPF: ' + cpfFormatado + '</span>';
                }
                html += '</div>';
            }
            if (controladora !== null) {
                html += '<div class="socio-item">';
                html += '<strong>Controladora:</strong> ' + controladora.nome;
                if (controladora.percentual !== undefined && controladora.percentual !== null && controladora.percentual > 0) {
                    html += ' <span class="percentual">(' + controladora.percentual + '%)</span>';
                }
                if (controladora.cnpj) {
                    var cnpjFormatado = controladora.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                    html += ' <span class="cpf-cnpj">CNPJ: ' + cnpjFormatado + '</span>';
                }
                html += ' <button class="btn-analisar-controladora" onclick="analisarControladora(\'' + controladora.cnpj + '\')">🔍 Analisar Controladora</button>';
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div></div></div>';

        var corScore = scoreGlobal > 65 ? '#FF0000' : scoreGlobal > 35 ? '#FBBF24' : '#2DD4BF';
        var corRecuperabilidade = recuperabilidade > 65 ? '#2DD4BF' : recuperabilidade > 35 ? '#FBBF24' : '#FF0000';

        html += '<div class="scores-container">';
        html += '<div class="score-box"><div class="score-valor" style="color:' + corScore + ';">' + scoreGlobal + '%</div>';
        html += '<div class="score-explicacao" style="color:#FF6B6B; font-weight:700;">🔴 AMEAÇA</div>';
        html += '<div style="font-size:0.7rem; color:#94A3B8; margin-top:0.2rem;">Chance de não dar certo</div>';
        html += '</div>';
        html += '<div class="score-box"><div class="score-valor" style="color:' + corRecuperabilidade + ';">' + recuperabilidade + '%</div>';
        html += '<div class="score-explicacao" style="color:#34D399; font-weight:700;">🟢 OPORTUNIDADE</div>';
        html += '<div style="font-size:0.7rem; color:#94A3B8; margin-top:0.2rem;">Chance de dar certo</div>';
        html += '</div>';
        html += '</div>';

        html += '<div class="significa-bloco"><div class="titulo">📋 O QUE ISSO SIGNIFICA NA PRÁTICA</div>';
        frases.forEach(function(f, idx) {
            html += '<div class="significa-item"><span class="num">' + (idx+1) + '.</span><span class="texto">' + f + '</span></div>';
        });

        var situacaoCritica = ['BAIXADA', 'SUSPENSA', 'INAPTA', 'INATIVA', 'CANCELADA', 'NULA', 'LIQUIDAÇÃO', 'LIQUIDACAO', 'RECUPERAÇÃO', 'RECUPERACAO', 'FALÊNCIA', 'FALENCIA', 'INTERVENÇÃO', 'INTERVENCAO', 'INAPTIDÃO'];
        var isSituacaoCritica = situacaoCritica.some(function(palavra) {
            return situacao.toUpperCase().indexOf(palavra) !== -1;
        });

        if (isSituacaoCritica || situacaoIrregular) {
            html += '<div class="card-critico-grid">';
            html += '<div class="card-critico-item">';
            html += '<div class="label-critico">🚨 SITUAÇÃO CRÍTICA</div>';
            html += '<div class="value-critico"><strong>CNPJ com situação: ' + situacao + '</strong></div>';
            html += '</div>';
            html += '<div class="card-critico-item" style="border-left-color:#2DD4BF;">';
            html += '<div class="label-critico" style="color:#2DD4BF;">📎 EVIDÊNCIA</div>';
            html += '<div class="value-critico"><strong>Receita Federal do Brasil</strong> — CNPJ consultado na base oficial. Situação cadastral: <strong>' + situacao + '</strong>.</div>';
            html += '</div>';
            html += '</div>';
        }

        html += '</div>';

        var impactoTexto = formatarMoeda(valorNegocio) +
            (isParcelado ? ' (' + parcelas + 'x de ' + formatarMoeda(valorNegocio / parcelas) + ')' : '');

        var baseSolicitante = '';
        var baseAnalisado = '';

        if (tipoSolicitante === 'pessoa_fisica' || tipoSolicitante === 'pessoa') {
            var rendaUsada = rendaSolicitante || 3367;
            baseSolicitante = 'Base: Renda mensal / 30' + (rendaSolicitante > 0 ? '' : ' (Média IBGE 2025)');
        } else {
            var porteSolBase = mapearPorte(solicitante.porte) || 'MEDIO';
            baseSolicitante = 'Base: faturamento diário estimado pelo porte (' + porteSolBase + ')';
        }

        if (analisadoTipo === 'pessoa_fisica' || analisadoTipo === 'pessoa') {
            baseAnalisado = 'Base: Renda mensal / 30';
        } else {
            var porteAnalBase = mapearPorte(porteOriginal) || 'MEDIO';
            baseAnalisado = 'Base: faturamento diário estimado pelo porte (' + porteAnalBase + ')';
        }

        html += '<div class="impacto-alerta-grid">';
        html += '<div class="impacto-box">';
        html += '<div class="label">📊 IMPACTO FINANCEIRO no SOLICITANTE</div>';
        html += '<div style="font-size:1.2rem; font-weight:700; color:' + (diasSolicitante > 10 ? '#FF6B6B' : '#2DD4BF') + ';">' + nivelSolicitante.nivel + ' (' + nivelSolicitante.percentual + '%)</div>';
        html += '<div class="value">' + impactoTexto + '</div>';
        html += '<div style="font-size:0.85rem; color:#94A3B8; margin-top:0.2rem;">Equivalente a <strong>' + diasSolicitante.toFixed(1) + ' dia(s)</strong> do seu ' + (tipoSolicitante === 'pessoa_fisica' ? 'trabalho' : 'faturamento') + '</div>';
        html += '<div style="font-size:0.7rem; color:#6A6F82; margin-top:0.3rem;">' + baseSolicitante + '</div>';
        html += '</div>';

        html += '<div class="impacto-box">';
        html += '<div class="label">📊 IMPACTO FINANCEIRO no ANALISADO</div>';
        html += '<div style="font-size:1.2rem; font-weight:700; color:' + (diasAnalisado > 10 ? '#FF6B6B' : '#2DD4BF') + ';">' + nivelAnalisado.nivel + ' (' + nivelAnalisado.percentual + '%)</div>';
        html += '<div class="value">' + impactoTexto + '</div>';
        html += '<div style="font-size:0.85rem; color:#94A3B8; margin-top:0.2rem;">Equivalente a <strong>' + diasAnalisado.toFixed(1) + ' dia(s)</strong> do faturamento do analisado</div>';
        html += '<div style="font-size:0.7rem; color:#6A6F82; margin-top:0.3rem;">' + baseAnalisado + '</div>';
        html += '</div>';
        html += '</div>';

        var negocioDentroDoLimite = valorParcelaAtual <= valorMaximo;
        var corStatus = negocioDentroDoLimite ? '#2DD4BF' : '#FBBF24';
        var statusTexto = negocioDentroDoLimite ? 'ABAIXO' : 'ACIMA';
        var iconeStatus = negocioDentroDoLimite ? '✅' : '⚠️';
        var diferenca = Math.abs(valorParcelaAtual - valorMaximo);

        html += '<div style="margin: 1.5rem 0; padding: 1rem 0; border-top: 2px solid #2A2E3A; border-bottom: 2px solid #2A2E3A; text-align: center;">';
        html += '<div style="font-size: 1.2rem; font-weight: 700; color: #2DD4BF; margin-bottom: 0.3rem;">';
        html += '🔒 LIMITE FINANCEIRO SEGURO: ';
        html += '<span style="color: #EDEDED;">' + formatarMoeda(valorMaximo) + '</span>';
        html += '</div>';
        html += '<div style="font-size: 0.95rem; color: ' + corStatus + '; margin-top: 0.2rem;">';
        if (isParcelado) {
            html += iconeStatus + ' A parcela de <strong>' + formatarMoeda(valorParcelaAtual) + '</strong> está <strong>' + formatarMoeda(diferenca) + '</strong> ' + statusTexto + ' do limite seguro.';
        } else {
            html += iconeStatus + ' O valor total de <strong>' + formatarMoeda(valorNegocio) + '</strong> está <strong>' + formatarMoeda(diferenca) + '</strong> ' + statusTexto + ' do limite seguro.';
        }
        html += '</div>';
        html += '</div>';

        // ============================================================
        // PARTE 4 – RISCOS, RECOMENDAÇÃO, SIMULAÇÃO
        // ============================================================
        html += '<div class="riscos-wrapper">';
        html += '<div class="titulo-secao">📊 PRINCIPAIS RISCOS</div>';
        html += '<div class="riscos-grid">';
        riscosFiltrados.forEach(function(r) {
            var contrib = r.contribuicaoNormalizada || 0;
            var cor = contrib >= 8 ? '#FF0000' : contrib >= 4 ? '#FBBF24' : '#2DD4BF';
            var nomeExibicao = r.risco === 'DESCONTINUIDADE' ? 'RISCO DE INTERRUPÇÃO' : r.risco;
            var descricao = getDescricaoRisco(nomeExibicao, contrib, percentualComprometimento, porteSolicitante, porteOriginal);
            
            html += '<div class="risco-card">';
            html += '<div class="icone">' + getIconeRisco(nomeExibicao) + '</div>';
            html += '<div class="nome">' + nomeExibicao + '</div>';
            html += '<div class="percentual" style="color:' + cor + ';">' + contrib + '%</div>';
            html += '<div class="descricao-percentual">' + descricao + '</div>';
            html += '</div>';
        });
        html += '</div>';

        html += '<div class="evidencias-dos-riscos">';
        evidenciasOrdenadas.forEach(function(evItem) {
            var isExterna = evItem.tipo === 'externa';
            var isContexto = evItem.tipo === 'contexto';
            var corBorda = isExterna ? '#2DD4BF' : (isContexto ? '#FBBF24' : '#2DD4BF');
            var label = isExterna ? '🤖 IA' : (isContexto ? '🔍 Contexto' : '📋 Dados');
            
            html += '<div class="evidencia-card" style="border-left: 3px solid ' + corBorda + ';">';
            if (evItem.titulo) {
                html += '<div style="font-weight:600; color:#EDEDED; font-size:0.8rem;">' + evItem.titulo + '</div>';
            }
            html += '<div style="font-size:0.8rem; color:#94A3B8;">' + evItem.texto + '</div>';
            html += '<div style="font-size:0.65rem; color:#6A6F82; margin-top:0.2rem;">' + label + ' • ' + evItem.fonte + '</div>';
            if (evItem.url && evItem.url !== '#') {
                html += '<a href="' + evItem.url + '" target="_blank" class="evidencia-url">🔗 Ver fonte</a>';
            }
            html += '</div>';
        });
        html += '</div></div>';

        var recomendacaoHTML = '';
        recomendacaoHTML += '<div class="recomendacao-bloco">';
        recomendacaoHTML += '<div class="alerta-grande ' + classeRecomendacao + '">' + recomendacao + '</div>';
        recomendacaoHTML += '<div class="subtitulo">' + textoRecomendacao + '</div>';

        if (recomendacao === 'PARE' || recomendacao === 'ATENCAO') {
            recomendacaoHTML += '<div style="margin-top: 1rem; font-size: 1rem; color: #FBBF24; font-weight: 600;">';
            recomendacaoHTML += '🛡️ Mas se quiser fazer o negócio:';
            recomendacaoHTML += '</div>';
        }

        if ((recomendacao === 'PARE' || recomendacao === 'ATENCAO') && exibirLimite && valorMaximo > 0 && valorParcelaAtual > valorMaximo) {
            if (parcelaFinalBaixo > 0) {
                recomendacaoHTML += '<div class="acao-protetiva" style="margin-top:0.5rem; background:#0A2A28; border-color:#2DD4BF;">';
                recomendacaoHTML += '🛡️ Reduza a parcela para <strong>' + formatarMoeda(parcelaFinalBaixo) + '</strong> — assim o risco financeiro fica em nível Baixo.';
                recomendacaoHTML += '</div>';
            } else {
                recomendacaoHTML += '<div class="acao-protetiva" style="margin-top:0.5rem; background:#0A2A28; border-color:#FF0000;">';
                recomendacaoHTML += '🛡️ Reduza a parcela para <strong>' + formatarMoeda(valorParcelaIdeal) + '</strong> — assim o risco financeiro fica em nível Baixo.';
                recomendacaoHTML += '</div>';
            }
        } else if (isParcelado && exibirLimite && valorMaximo > 0 && valorParcelaAtual <= valorMaximo) {
            recomendacaoHTML += '<div class="acao-protetiva" style="margin-top:0.5rem; background:#0A2A28; border-color:#2DD4BF;">';
            recomendacaoHTML += '🛡️ A parcela atual (' + formatarMoeda(valorParcelaAtual) + ') está dentro do limite de ' + formatarMoeda(valorMaximo) + '.';
            recomendacaoHTML += '</div>';
        } else {
            recomendacaoHTML += '<div class="acao-protetiva">🛡️ ' + acaoProtetiva + '</div>';
        }

        recomendacaoHTML += '</div>';

        // ============================================================
        // SIMULAÇÃO AUTOMÁTICA (NOVO CENÁRIO)
        // ============================================================
        var riscoFinanceiroCard = 0;
        for (var i = 0; i < riscos.length; i++) {
            if (riscos[i].risco === 'FINANCEIRO') {
                riscoFinanceiroCard = riscos[i].contribuicaoNormalizada || riscos[i].contribuicao || 0;
                break;
            }
        }
        if (riscoFinanceiroCard === 0) {
            riscoFinanceiroCard = 37.3;
        }

        var precisaAjustar = isParcelado && exibirLimite && valorMaximo > 0 && valorParcelaAtual > valorMaximo;
        var novoRiscoFinanceiro = null;
        var novaOportunidade = null;
        var novaAmeaca = null;
        var novoValorParcela = null;

        if (precisaAjustar) {
            var novosDiasBaixo = calcularDiasComprometimento(
                parcelaFinalBaixo,
                analisadoTipo,
                porteOriginal,
                analisadoRenda,
                faturamentoAnual
            );

            if (diasAnalisado > 0 && novosDiasBaixo > 0 && riscoFinanceiroCard > 0) {
                var proporcao = (parcelaFinalBaixo / valorParcelaAtual);
                var novoRiscoPercentual = Math.round(riscoFinanceiroCard * proporcao);
                var novaAmeacaPercentual = Math.round(ameacaOriginal * proporcao);
                var novaOportunidadePercentual = 100 - novaAmeacaPercentual;
                var nivelNovo = getNivelImpacto(novosDiasBaixo);

                novoRiscoFinanceiro = {
                    percentual: novoRiscoPercentual,
                    nivel: nivelNovo.nivel,
                    cor: nivelNovo.cor
                };
                novaAmeaca = novaAmeacaPercentual;
                novaOportunidade = novaOportunidadePercentual;
                novoValorParcela = parcelaFinalBaixo;
            }
        }

        var simAuto = null;
        var usarSimulacaoAutomatica = false;

        if (isParcelado && exibirLimite && valorMaximo > 0 && valorParcelaAtual > valorMaximo) {
            var ticketDiarioSim = 0;
            if (analisadoTipo === 'pessoa_fisica' || analisadoTipo === 'pessoa') {
                var rendaSim = (analisadoRenda && analisadoRenda > 0) ? analisadoRenda : 3367;
                ticketDiarioSim = rendaSim / 30;
            } else {
                var faturamentoMensalSim = 0;
                if (faturamentoAnual) {
                    faturamentoMensalSim = faturamentoAnual / 12;
                } else if (porteOriginal && porteOriginal !== 'N/A') {
                    faturamentoMensalSim = calcularFaturamentoMensal(mapearPorte(porteOriginal));
                }
                if (faturamentoMensalSim > 0) {
                    ticketDiarioSim = faturamentoMensalSim / 30;
                }
            }
            
            var parcelaIdeal = 0;
            if (ticketDiarioSim > 0) {
                parcelaIdeal = Math.round(5 * ticketDiarioSim);
                parcelaIdeal = Math.round(parcelaIdeal / 50) * 50;
                if (parcelaIdeal === 0) parcelaIdeal = Math.round(5 * ticketDiarioSim);
            }
            
            if (parcelaIdeal > 0 && parcelaIdeal < valorParcelaAtual) {
                var novasParcelasAuto = Math.ceil(valorNegocio / parcelaIdeal);
                if (novasParcelasAuto < 1) novasParcelasAuto = 1;
                var novaParcelaAuto = Math.round(valorNegocio / novasParcelasAuto);
                novaParcelaAuto = Math.round(novaParcelaAuto / 50) * 50;
                if (novaParcelaAuto === 0) novaParcelaAuto = parcelaIdeal;
                
                var proporcaoAuto = (novaParcelaAuto / valorParcelaAtual);
                var novoRiscoPercentualAuto = Math.round(riscoFinanceiroCard * proporcaoAuto);
                var novaAmeacaPercentualAuto = Math.round(ameacaOriginal * proporcaoAuto);
                var novaOportunidadePercentualAuto = 100 - novaAmeacaPercentualAuto;
                
                var novosDiasAuto = calcularDiasComprometimento(
                    novaParcelaAuto,
                    analisadoTipo,
                    porteOriginal,
                    analisadoRenda,
                    faturamentoAnual
                );
                var nivelNovoAuto = getNivelImpacto(novosDiasAuto);
                
                simAuto = {
                    parcelaIdeal: novaParcelaAuto,
                    parcelas: novasParcelasAuto,
                    oportunidade: novaOportunidadePercentualAuto,
                    ameaca: novaAmeacaPercentualAuto,
                    riscoFinanceiro: novoRiscoPercentualAuto,
                    nivelRisco: nivelNovoAuto.nivel,
                    corRisco: nivelNovoAuto.cor,
                    riscoOriginal: riscoFinanceiroCard,
                    nivelOriginal: nivelFinanceiroOriginal ? nivelFinanceiroOriginal.nivel : 'Alto',
                    corOriginal: nivelFinanceiroOriginal ? nivelFinanceiroOriginal.cor : '🔴'
                };
                usarSimulacaoAutomatica = true;
            }
        }

        var gridHTML = '';

        if (usarSimulacaoAutomatica) {
            var novaOportunidade = simAuto.oportunidade;
            var novaAmeaca = simAuto.ameaca;
            var novoRiscoPercentual = simAuto.riscoFinanceiro;
            var nivelNovo = { nivel: simAuto.nivelRisco, cor: simAuto.corRisco };
            var riscoOriginal = simAuto.riscoOriginal;
            var nivelOriginalStr = simAuto.nivelOriginal;
            var corOriginal = simAuto.corOriginal;
            
            gridHTML += '<div class="titulo-novo-cenario">📊 Novo Cenário com risco Baixo.</div>';
            
            gridHTML += '<div class="swot-grid-3col">';
            
            gridHTML += '<div class="swot-col-3">';
            gridHTML += '<div class="swot-title verde">✅ OPORTUNIDADE (' + novaOportunidade + '%)</div>';
            gridHTML += '<div style="font-size:0.7rem; color:#94A3B8; margin-top:-0.2rem; margin-bottom:0.3rem;">chance de dar certo</div>';
            gridHTML += '<div class="swot-text" style="font-size:0.85rem; color:#94A3B8;">' + textoOportunidadeFinal + '</div>';
            gridHTML += '<div class="antes">Antes era <span>' + oportunidadeOriginal + '%</span></div>';
            gridHTML += '</div>';
            
            gridHTML += '<div class="swot-col-3">';
            gridHTML += '<div class="swot-title amarelo">⚠️ AMEAÇA (' + novaAmeaca + '%)</div>';
            gridHTML += '<div style="font-size:0.7rem; color:#94A3B8; margin-top:-0.2rem; margin-bottom:0.3rem;">chance de não dar certo</div>';
            gridHTML += '<div class="swot-text" style="font-size:0.85rem; color:#94A3B8;">' + textoAmeacaFinal + '</div>';
            gridHTML += '<div class="antes">Antes era <span>' + ameacaOriginal + '%</span></div>';
            gridHTML += '</div>';
            
            var corRiscoNovo = novoRiscoPercentual > 50 ? '#FF6B6B' : '#2DD4BF';
            gridHTML += '<div class="swot-col-3">';
            gridHTML += '<div class="swot-title azul">📊 NOVO RISCO FINANCEIRO</div>';
            gridHTML += '<div class="valor-grande" style="color:' + corRiscoNovo + ';">' + novoRiscoPercentual + '%</div>';
            gridHTML += '<div class="nivel-risco">' + nivelNovo.nivel + ' ' + nivelNovo.cor + '</div>';
            gridHTML += '<div class="antes">Antes era <span>' + riscoOriginal + '% (' + nivelOriginalStr + ' ' + corOriginal + ')</span></div>';
            gridHTML += '<div class="sub-valor">Com parcela de ' + formatarMoeda(valorParcelaAtual) + '</div>';
            gridHTML += '</div>';
            
            gridHTML += '</div>';
            
        } else if (precisaAjustar && novoRiscoFinanceiro && novaOportunidade !== null && novaAmeaca !== null) {
            gridHTML += '<div class="titulo-novo-cenario">📊 Novo Cenário com risco Baixo.</div>';
            
            gridHTML += '<div class="swot-grid-3col">';
            
            gridHTML += '<div class="swot-col-3">';
            gridHTML += '<div class="swot-title verde">✅ OPORTUNIDADE (' + novaOportunidade + '%)</div>';
            gridHTML += '<div style="font-size:0.7rem; color:#94A3B8; margin-top:-0.2rem; margin-bottom:0.3rem;">chance de dar certo</div>';
            gridHTML += '<div class="swot-text" style="font-size:0.85rem; color:#94A3B8;">' + textoOportunidadeFinal + '</div>';
            gridHTML += '<div class="antes">Antes era <span>' + oportunidadeOriginal + '%</span></div>';
            gridHTML += '</div>';
            
            gridHTML += '<div class="swot-col-3">';
            gridHTML += '<div class="swot-title amarelo">⚠️ AMEAÇA (' + novaAmeaca + '%)</div>';
            gridHTML += '<div style="font-size:0.7rem; color:#94A3B8; margin-top:-0.2rem; margin-bottom:0.3rem;">chance de não dar certo</div>';
            gridHTML += '<div class="swot-text" style="font-size:0.85rem; color:#94A3B8;">' + textoAmeacaFinal + '</div>';
            gridHTML += '<div class="antes">Antes era <span>' + ameacaOriginal + '%</span></div>';
            gridHTML += '</div>';
            
            var corRiscoNovo = novoRiscoFinanceiro.percentual > 50 ? '#FF6B6B' : '#2DD4BF';
            gridHTML += '<div class="swot-col-3">';
            gridHTML += '<div class="swot-title azul">📊 NOVO RISCO FINANCEIRO</div>';
            gridHTML += '<div class="valor-grande" style="color:' + corRiscoNovo + ';">' + novoRiscoFinanceiro.percentual + '%</div>';
            gridHTML += '<div class="nivel-risco">' + novoRiscoFinanceiro.nivel + ' ' + novoRiscoFinanceiro.cor + '</div>';
            gridHTML += '<div class="antes">Antes era <span>' + riscoFinanceiroCard + '% (' + nivelFinanceiroOriginal.nivel + ' ' + nivelFinanceiroOriginal.cor + ')</span></div>';
            gridHTML += '<div class="sub-valor">Com parcela de ' + formatarMoeda(valorParcelaAtual) + '</div>';
            gridHTML += '</div>';
            
            gridHTML += '</div>';
        } else {
            gridHTML += '<div class="swot-grid">';
            gridHTML += '<div class="swot-col"><div class="swot-title">✅ OPORTUNIDADE (' + recuperabilidade + '%)</div><div class="swot-text">' + textoOportunidadeFinal + '</div></div>';
            gridHTML += '<div class="swot-col"><div class="swot-title">⚠️ AMEAÇA (' + scoreGlobal + '%)</div><div class="swot-text">' + textoAmeacaFinal + '</div></div>';
            gridHTML += '</div>';
        }

        if (recomendacao === 'SIGA') {
            html += gridHTML;
            html += recomendacaoHTML;
        } else {
            html += recomendacaoHTML;
            html += gridHTML;
        }

        // ============================================================
        // PARTE 5 – SIMULAÇÃO INTERATIVA E FINALIZAÇÃO
        // ============================================================
        var porteAtual = mapearPorte(porteOriginal) || 'MEDIO';
        var opcoesPorte = [
            { value: 'MEI', label: 'MEI' },
            { value: 'ME', label: 'ME' },
            { value: 'EPP', label: 'EPP' },
            { value: 'MEDIO', label: 'Médio' },
            { value: 'GRANDE', label: 'Grande' }
        ];
        var isPF2 = (analisadoTipo === 'pessoa_fisica' || analisadoTipo === 'pessoa');
        var valorFaturamento2 = isPF2 ? (analisadoRenda || 3367) : (faturamentoAnual ? (faturamentoAnual / 12) : '');
        
        var valorParcelaCampo = valorParcelaAtual;
        var parcelasCampo = parcelas;
        if (simAuto !== null && simAuto.parcelaIdeal > 0) {
            valorParcelaCampo = simAuto.parcelaIdeal;
            parcelasCampo = simAuto.parcelas;
        }
        
        var valorTotalInicial = valorNegocio;
        if (parcelasCampo > 0) {
            var parcelaSemJuros = valorNegocio / parcelasCampo;
            valorTotalInicial = parcelaSemJuros * parcelasCampo;
        }
        
        html += '<div class="simulacao-campos" id="simulacaoCampos">';
        
        html += '<div class="campo">';
        html += '<label for="simPorte">Porte</label>';
        html += '<select id="simPorte">';
        for (var op2 = 0; op2 < opcoesPorte.length; op2++) {
            var selected2 = (porteAtual === opcoesPorte[op2].value) ? ' selected' : '';
            html += '<option value="' + opcoesPorte[op2].value + '"' + selected2 + '>' + opcoesPorte[op2].label + '</option>';
        }
        html += '</select>';
        html += '</div>';
        
        html += '<div class="campo">';
        var labelFaturamento2 = isPF2 ? 'Renda mensal' : 'Faturamento mensal';
        html += '<label for="simFaturamento">' + labelFaturamento2 + '</label>';
        html += '<input type="number" id="simFaturamento" step="0.01" min="0" value="' + valorFaturamento2 + '" />';
        html += '</div>';
        
        html += '<div class="campo">';
        html += '<label for="simValorNegocio">Valor do negócio</label>';
        html += '<input type="number" id="simValorNegocio" step="0.01" min="0" value="' + valorNegocio + '" />';
        html += '</div>';
        
        html += '<div class="campo" style="border:2px solid #2DD4BF; border-radius:8px; padding:0.2rem 0.5rem; background:#0A2A28;">';
        html += '<label for="simValorParcela" style="color:#2DD4BF; font-weight:700;">⬅️ Valor da parcela</label>';
        html += '<input type="number" id="simValorParcela" step="0.01" min="0" value="' + valorParcelaCampo + '" style="font-weight:700;" />';
        html += '</div>';
        
        html += '<div class="campo">';
        html += '<label for="simParcelas">Parcelas</label>';
        html += '<input type="number" id="simParcelas" min="1" step="1" value="' + parcelasCampo + '" />';
        html += '</div>';
        
        html += '<div class="campo">';
        html += '<label for="simJuros">Taxa de Juros (%)</label>';
        html += '<input type="number" id="simJuros" step="0.01" min="0" value="0" />';
        html += '</div>';
        
        html += '<div class="campo" style="flex:1.5; min-width:130px; background:#0A2A28; border-radius:8px; padding:0.2rem 0.5rem; border:1px solid #2DD4BF;">';
        html += '<label for="simValorTotal" style="color:#2DD4BF; font-size:0.6rem;">💰 Valor Total com Juros</label>';
        html += '<input type="text" id="simValorTotal" readonly style="background:transparent; border:none; color:#EDEDED; font-weight:700; font-size:0.95rem; width:100%; padding:0.2rem 0;" value="' + formatarMoeda(valorTotalInicial) + '" />';
        html += '</div>';
        
        html += '<div class="botoes">';
        html += '<button class="btn btn-simular" id="btnSimular">🔄 Simular</button>';
        html += '<button class="btn btn-aplicar" id="btnAplicar">💾 Aplicar</button>';
        html += '</div>';
        html += '</div>';

        var nomeFechamento = obterNomeCurto(nomeSolicitante, tipoSolicitante) || nomeSolicitante || 'Usuário';
        html += '<div class="fechamento">';
        html += '<div class="frase-final">📌 A recomendação é da VERI. A decisão é sua, ' + nomeFechamento + '.</div>';
        html += '<div class="rodape-texto">🔒 Análise baseada em dados públicos e informações fornecidas, em conformidade com a LGPD.</div>';
        html += '<div class="rodape-texto">🔐 Esta análise possui hash de auditoria para recuperabilidade integral dos dados.</div>';
        html += '<div class="rodape-texto">VERI — Análise prévia para decisões de negócios mais seguras.</div>';
        html += '</div>';

        html += '<div class="hash">🔑 Hash de auditoria: ' + (auditoria.hash || 'N/A') + '</div>';
        html += '<div class="selo">✅ VERIFIED BY VERI</div>';

        html += '<div class="footer-buttons">';
        html += '<a href="analise.html" class="btn btn-secondary" id="btnNovaAnalise">🔍 Nova Análise</a>';
        html += '<button class="btn btn-outline" id="btnCompartilhar">🔗 Compartilhar</button>';
        html += '<button class="btn btn-outline" id="btnPDF">📄 Salvar PDF</button>';
        html += '</div>';

        html += '<div class="feedback-section">';
        html += '<p class="pergunta-feedback">📝 <strong>A VERI ajudou você a decidir melhor?</strong></p>';
        html += '<div class="feedback-buttons">';
        html += '<button class="btn-feedback sim" data-value="sim">👍 Sim</button>';
        html += '<button class="btn-feedback maisoumenos" data-value="maisoumenos">🤔 Mais ou menos</button>';
        html += '<button class="btn-feedback nao" data-value="nao">👎 Não</button>';
        html += '</div>';
        html += '<div class="feedback-msg" id="feedbackMsg"></div>';
        html += '</div>';

        html += '<div class="observacao-section" style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #2A2E3A;">';
        html += '<p style="font-size:0.9rem; color:#EDEDED; margin-bottom:0.3rem;">';
        html += '📝 Alguma observação ou sugestão?';
        html += '<span style="color:#6A6F82; font-size:0.8rem; margin-left:0.5rem;">(opcional)</span>';
        html += '</p>';
        html += '<p style="font-size:0.75rem; color:#6A6F82; margin-bottom:0.5rem;">';
        html += '🔁 Caso precise corrigir algum dado, use os campos de simulação acima.';
        html += '</p>';
        html += '<textarea id="observacaoUsuario" rows="2" style="width:100%; padding:0.75rem; background:#1A1D2A; border:1px solid #2A2E3A; border-radius:12px; color:#EDEDED; font-family:inherit; font-size:0.9rem; resize:vertical;" placeholder="Ex: Gostei da análise, mas fiquei com dúvida sobre..." oninput="salvarObservacao()"></textarea>';
        html += '</div>';

        document.getElementById('relatorioContainer').innerHTML = html;

        function salvarObservacao() {
            var obs = document.getElementById('observacaoUsuario').value;
            try {
                var dados = JSON.parse(localStorage.getItem('observacao_veri') || '{}');
                dados[window.location.href] = obs;
                localStorage.setItem('observacao_veri', JSON.stringify(dados));
            } catch(e) {}
        }

        document.getElementById('btnPDF').addEventListener('click', function() { gerarPDF(); });
        document.getElementById('btnCompartilhar').addEventListener('click', function() { compartilhar(); });

        document.getElementById('btnNovaAnalise').addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('resultado_analise');
            window.location.href = 'analise.html';
        });

        document.querySelectorAll('.btn-feedback').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var val = this.getAttribute('data-value');
                var msg = document.getElementById('feedbackMsg');
                var labels = { 'sim': '👍 Sim', 'maisoumenos': '🤔 Mais ou menos', 'nao': '👎 Não' };
                msg.textContent = '✅ Obrigado! Sua resposta ("' + labels[val] + '") ajuda a VERI a melhorar.';
                try {
                    var fb = JSON.parse(localStorage.getItem('feedback_veri') || '[]');
                    fb.push({ analise: window.location.href, feedback: val, data: new Date().toISOString() });
                    localStorage.setItem('feedback_veri', JSON.stringify(fb));
                } catch(e) {}
                this.disabled = true;
                document.querySelectorAll('.btn-feedback').forEach(function(b) {
                    if (b !== btn) b.style.opacity = '0.5';
                });
            });
        });

        var btnSimular = document.getElementById('btnSimular');
        var btnAplicar = document.getElementById('btnAplicar');
        var simPorte = document.getElementById('simPorte');
        var simFaturamento = document.getElementById('simFaturamento');
        var simValorNegocio = document.getElementById('simValorNegocio');
        var simValorParcela = document.getElementById('simValorParcela');
        var simParcelas = document.getElementById('simParcelas');
        var simJuros = document.getElementById('simJuros');
        var simValorTotal = document.getElementById('simValorTotal');

        function atualizarValorTotal() {
            var valorParcela = parseFloat(simValorParcela.value) || 0;
            var parcelas = parseInt(simParcelas.value) || 1;
            var valorNegocio = parseFloat(simValorNegocio.value) || 0;
            
            if (simValorTotal) {
                var valorTotal = valorParcela * parcelas;
                simValorTotal.value = formatarMoeda(valorTotal);
                
                var juros = valorTotal - valorNegocio;
                if (juros > 0.01) {
                    simValorTotal.style.color = '#FBBF24';
                    simValorTotal.title = 'Juros: ' + formatarMoeda(juros);
                } else {
                    simValorTotal.style.color = '#2DD4BF';
                    simValorTotal.title = 'Sem juros';
                }
            }
        }

        function recalcularComJuros() {
            var valorNegocio = parseFloat(simValorNegocio.value) || 0;
            var parcelas = parseInt(simParcelas.value) || 1;
            var taxa = parseFloat(simJuros.value) || 0;
            
            if (valorNegocio > 0 && parcelas > 0) {
                var valorParcela = calcularParcelaComJuros(valorNegocio, parcelas, taxa);
                simValorParcela.value = Math.round(valorParcela * 100) / 100;
                atualizarValorTotal();
            }
        }

        if (simValorParcela && simParcelas && simValorNegocio && simJuros) {
            simValorParcela.addEventListener('input', function() {
                var valorNegocio = parseFloat(simValorNegocio.value) || 0;
                var valorParcela = parseFloat(this.value) || 0;
                if (valorNegocio > 0 && valorParcela > 0) {
                    var parcelasCalculadas = Math.ceil(valorNegocio / valorParcela);
                    simParcelas.value = parcelasCalculadas;
                    atualizarValorTotal();
                }
            });

            simParcelas.addEventListener('input', function() {
                recalcularComJuros();
            });

            simValorNegocio.addEventListener('input', function() {
                recalcularComJuros();
            });

            simJuros.addEventListener('input', function() {
                recalcularComJuros();
            });
        }
       
        if (simPorte && simFaturamento) {
            simPorte.addEventListener('change', function() {
                var porteSelecionado = this.value;
                if (porteSelecionado === 'GIGANTE') return;
                var faturamento = getFaturamentoPorPorte(porteSelecionado);
                if (faturamento > 0) {
                    simFaturamento.value = faturamento;
                }
            });
        }

        if (btnSimular) {
            btnSimular.addEventListener('click', function() {
                var novoPorte = document.getElementById('simPorte').value;
                var novoFaturamento = parseFloat(document.getElementById('simFaturamento').value) || 0;
                var novoValorNegocio = parseFloat(document.getElementById('simValorNegocio').value) || 0;
                var novoValorParcela = parseFloat(document.getElementById('simValorParcela').value) || 0;
                var novasParcelas = parseInt(document.getElementById('simParcelas').value) || 1;
                var novaTaxa = parseFloat(document.getElementById('simJuros').value) || 0;

                if (novoValorNegocio > 0 && novasParcelas > 0) {
                    novoValorParcela = calcularParcelaComJuros(novoValorNegocio, novasParcelas, novaTaxa);
                }

                var isPFSim = (analisadoTipo === 'pessoa_fisica' || analisadoTipo === 'pessoa');
                var novoFaturamentoAnual = isPFSim ? null : (novoFaturamento * 12);
                var novaRendaSim = isPFSim ? novoFaturamento : 0;
                var novoPorteMapeado = mapearPorte(novoPorte);

                var novosDias = calcularDiasComprometimento(
                    novoValorParcela,
                    analisadoTipo,
                    novoPorteMapeado,
                    novaRendaSim,
                    novoFaturamentoAnual
                );

                if (diasAnalisado > 0 && novosDias > 0) {
                    var proporcao = novosDias / diasAnalisado;

                    var novoRiscoPercentual = Math.round(riscoFinanceiroCard * proporcao);
                    var novaAmeacaPercentual = Math.round(ameacaOriginal * proporcao);
                    var novaOportunidadePercentual = 100 - novaAmeacaPercentual;

                    var nivelNovo = getNivelImpacto(novosDias);

                    var cardOportunidade = document.querySelector('.swot-grid-3col .swot-col-3:first-child .swot-title');
                    var cardAmeaca = document.querySelector('.swot-grid-3col .swot-col-3:nth-child(2) .swot-title');
                    var cardRisco = document.querySelector('.swot-grid-3col .swot-col-3:last-child .valor-grande');
                    var cardRiscoNivel = document.querySelector('.swot-grid-3col .swot-col-3:last-child .nivel-risco');
                    var antesOportunidade = document.querySelector('.swot-grid-3col .swot-col-3:first-child .antes span');
                    var antesAmeaca = document.querySelector('.swot-grid-3col .swot-col-3:nth-child(2) .antes span');
                    var antesRisco = document.querySelector('.swot-grid-3col .swot-col-3:last-child .antes span');

                    if (cardOportunidade) {
                        cardOportunidade.innerHTML = '✅ OPORTUNIDADE (' + novaOportunidadePercentual + '%) <span class="selo-simulacao">SIMULAÇÃO</span>';
                    }
                    if (cardAmeaca) {
                        cardAmeaca.innerHTML = '⚠️ AMEAÇA (' + novaAmeacaPercentual + '%) <span class="selo-simulacao">SIMULAÇÃO</span>';
                    }
                    if (cardRisco) {
                        cardRisco.textContent = novoRiscoPercentual + '%';
                        cardRisco.style.color = novoRiscoPercentual > 50 ? '#FF6B6B' : '#2DD4BF';
                    }
                    if (cardRiscoNivel) {
                        cardRiscoNivel.textContent = nivelNovo.nivel + ' ' + nivelNovo.cor;
                    }
                    if (antesOportunidade) {
                        antesOportunidade.textContent = oportunidadeOriginal + '%';
                    }
                    if (antesAmeaca) {
                        antesAmeaca.textContent = ameacaOriginal + '%';
                    }
                    if (antesRisco) {
                        var riscoFinanceiroOriginalCorreto = 0;
                        for (var riCorreto = 0; riCorreto < riscos.length; riCorreto++) {
                            if (riscos[riCorreto].risco === 'FINANCEIRO') {
                                riscoFinanceiroOriginalCorreto = riscos[riCorreto].contribuicaoNormalizada || riscos[riCorreto].contribuicao || 0;
                                break;
                            }
                        }
                        if (riscoFinanceiroOriginalCorreto === 0) {
                            riscoFinanceiroOriginalCorreto = 37.3;
                        }
                        var nivelOriginalStr = nivelFinanceiroOriginal ? nivelFinanceiroOriginal.nivel : 'Alto';
                        var corOriginal = nivelFinanceiroOriginal ? nivelFinanceiroOriginal.cor : '🔴';
                        antesRisco.textContent = riscoFinanceiroOriginalCorreto + '% (' + nivelOriginalStr + ' ' + corOriginal + ')';
                    }

                    var fraseParcelaOriginal = document.querySelector('.swot-grid-3col .swot-col-3:last-child .sub-valor');
                    if (fraseParcelaOriginal) {
                        fraseParcelaOriginal.textContent = 'Com parcela de ' + formatarMoeda(valorParcelaAtual);
                    }

                    var limiteElemento = document.querySelector('.limite-seguro-valor');
                    if (limiteElemento) {
                        var novoLimite = Math.round(9 * (novoFaturamento / 30));
                        limiteElemento.textContent = formatarMoeda(novoLimite);
                    }

                    var statusLimite = document.querySelector('.status-limite');
                    if (statusLimite) {
                        var novoLimiteStatus = Math.round(9 * (novoFaturamento / 30));
                        if (novoValorParcela > novoLimiteStatus) {
                            statusLimite.textContent = '⚠️ A parcela de ' + formatarMoeda(novoValorParcela) + ' está ' + formatarMoeda(novoValorParcela - novoLimiteStatus) + ' ACIMA do limite seguro.';
                            statusLimite.style.color = '#FBBF24';
                        } else {
                            statusLimite.textContent = '✅ A parcela de ' + formatarMoeda(novoValorParcela) + ' está DENTRO do limite seguro.';
                            statusLimite.style.color = '#2DD4BF';
                        }
                    }

                    var medidaElemento = document.querySelector('.acao-protetiva');
                    if (medidaElemento) {
                        var parcelaBaixoSim = calcularParcelaParaBaixo(novoFaturamento);
                        if (parcelaBaixoSim > 0 && novoValorParcela > parcelaBaixoSim) {
                            medidaElemento.innerHTML = '🛡️ Reduza a parcela para <strong>' + formatarMoeda(parcelaBaixoSim) + '</strong> — assim o risco financeiro fica em nível Baixo.';
                        }
                    }
                    
                    atualizarValorTotal();
                }
            });
        }

        if (btnAplicar) {
            btnAplicar.addEventListener('click', function() {
                var novoPorte = document.getElementById('simPorte').value;
                var novoFaturamento = parseFloat(document.getElementById('simFaturamento').value) || 0;
                var novoValorNegocio = parseFloat(document.getElementById('simValorNegocio').value) || 0;
                var novoValorParcela = parseFloat(document.getElementById('simValorParcela').value) || 0;
                var novasParcelas = parseInt(document.getElementById('simParcelas').value) || 1;
                var novaTaxa = parseFloat(document.getElementById('simJuros').value) || 0;

                var dadosAtuais = localStorage.getItem('resultado_analise');
                if (dadosAtuais) {
                    try {
                        var dadosObj = JSON.parse(dadosAtuais);
                        dadosObj.payload.parcelas = novasParcelas;
                        dadosObj.payload.valor = novoValorNegocio;
                        dadosObj.payload.analisado.porte = novoPorte;
                        dadosObj.payload.juros = novaTaxa;
                        if (analisadoTipo === 'empresa') {
                            dadosObj.payload.analisado.faturamento_anual = novoFaturamento * 12;
                        } else {
                            dadosObj.payload.analisado.renda = novoFaturamento;
                        }
                        localStorage.setItem('resultado_analise', JSON.stringify(dadosObj));
                        localStorage.setItem('dados_solicitante_voltar', JSON.stringify({
                            tipo: analisadoTipo,
                            porte: novoPorte,
                            faturamento: analisadoTipo === 'empresa' ? novoFaturamento : null,
                            renda: analisadoTipo === 'pessoa_fisica' || analisadoTipo === 'pessoa' ? novoFaturamento : null,
                            parcelas: novasParcelas,
                            valor: novoValorNegocio,
                            juros: novaTaxa
                        }));
                        window.location.href = 'analise.html?voltar=true';
                    } catch(e) {
                        alert('Erro ao aplicar alterações. Tente novamente.');
                    }
                }
            });
        }

        localStorage.removeItem('resultado_analise');
    }

    async function gerarPDF() {
        try {
            var el = document.querySelector('.container');
            if (!el) throw new Error('Elemento não encontrado');
            var canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: '#11141F',
                height: el.scrollHeight,
                windowHeight: el.scrollHeight,
                useCORS: true,
                logging: false
            });
            var imgData = canvas.toDataURL('image/png');
            var pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
            var pdfWidth = 210;
            var pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('relatorio_veri.pdf');
        } catch (err) {
            alert('Erro ao gerar PDF: ' + err.message + '\nTente salvar pelo navegador (Ctrl+P).');
        }
    }

    function compartilhar() {
        var u = window.location.href;
        if (navigator.share) {
            navigator.share({ title: 'Relatório VERI', text: 'Análise VERI', url: u });
        } else {
            navigator.clipboard.writeText(u).then(function() {
                alert('Link copiado!');
            }).catch(function() {
                alert('Compartilhe o link: ' + u);
            });
        }
    }

    window.analisarControladora = function(cnpj) {
        window.location.href = 'analise.html?cnpj=' + encodeURIComponent(cnpj) + '&acao=analisar_controladora';
    };

    var dados = obterResultado();
    if (!dados) {
        document.getElementById('relatorioContainer').innerHTML = '<div style="text-align:center; margin:3rem 0;"><p style="color:#FBBF24; font-size:1.2rem;">Nenhuma análise encontrada</p><p style="color:#94A3B8;"><a href="analise.html" style="color:#2DD4BF;">Fazer nova análise</a></p></div>';
    } else {
        renderizarRelatorio(dados);
    }
})();
</script>
</body>
</html>
   

