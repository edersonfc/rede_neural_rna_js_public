/*
 * ============================================================================
 *  rna_pml_js_puro.js
 * ----------------------------------------------------------------------------
 *  ORQUESTRADOR do treinamento.
 *
 *  Este arquivo faz a ponte entre tres mundos:
 *
 *      PAINEL HTML  ->  este arquivo  ->  motor_rede_neural.js  (a matematica)
 *                            |
 *                            +--------->  animacao_rede_neural.js (o canvas)
 *                            +--------->  graficos do Google (a curva)
 *
 *  Ele le a configuracao do painel, monta o conjunto de dados, cria a rede e
 *  executa o treinamento UM PASSO DE CADA VEZ, de forma assincrona. E por isso
 *  que a tela nao congela e que a animacao consegue mostrar, neuronio por
 *  neuronio, o que a rede esta fazendo naquele instante exato.
 *
 *  JavaScript puro, sem nenhuma biblioteca.
 * ============================================================================
 */

'use strict';

/* ============================================================================
 *  ESTADO GLOBAL DO TREINAMENTO
 * ========================================================================= */

// Mantido com o nome original por compatibilidade com o restante do painel.
var dadosEntrada = [];

var TreinamentoRedeNeural = {

    // 'parado' | 'treinando' | 'pausado'
    situacao: 'parado',

    rede: null,
    conjunto: null,
    animador: null,

    epocaAtual: 0,
    amostraAtual: 0,
    totalEpocas: 0,
    totalAmostras: 0,

    taxaDeAprendizagem: 0.1,
    lambda: 0.0001,

    atrasoEntrePassos: 40,
    passosPorLote: 1,

    identificadorTemporizador: null,
    instanteUltimoGrafico: 0,

    // Historico por amostra, ja na escala ORIGINAL dos dados.
    historicoReais: [],
    historicoPrevistos: [],
    historicoErroGeral: [],

    erroAcumuladoDaEpoca: 0
};


/* ============================================================================
 *  1) LEITURA DO PAINEL
 * ========================================================================= */

/**
 * Le um campo do painel como numero, caindo no valor padrao se estiver vazio,
 * invalido ou negativo quando nao pode ser.
 */
function lerNumeroDoCampo(identificador, valorPadrao, minimo, maximo) {
    var elemento = document.getElementById(identificador);
    if (!elemento) { return valorPadrao; }
    var texto = (elemento.value !== undefined ? elemento.value : elemento.textContent);
    var numero = parseFloat(String(texto).replace(',', '.'));
    if (!Number.isFinite(numero)) { return valorPadrao; }
    if (Number.isFinite(minimo) && numero < minimo) { return minimo; }
    if (Number.isFinite(maximo) && numero > maximo) { return maximo; }
    return numero;
}

function lerTextoDoCampo(identificador, valorPadrao) {
    var elemento = document.getElementById(identificador);
    if (!elemento) { return valorPadrao; }
    return (elemento.value !== undefined && elemento.value !== '') ? elemento.value : valorPadrao;
}

/**
 * Converte um texto em numero quando ele representa um numero; caso contrario
 * devolve o proprio texto (que o motor transformara em categoria).
 */
function converterTextoEmValor(texto) {
    var limpo = String(texto).trim();
    if (limpo === '') { return 0; }
    var numero = Number(limpo.replace(',', '.'));
    return Number.isFinite(numero) ? numero : limpo;
}

/**
 * Monta as amostras a partir dos campos de entrada do painel.
 *
 * Cada campo pode conter:
 *   - um unico valor        -> "57"          -> 1 amostra
 *   - varios separados por virgula -> "57,25,15" -> 3 amostras
 *
 * Campos com menos valores que o maior campo repetem o ultimo valor, em vez de
 * gerarem "undefined" no meio dos dados (que era o que acontecia antes).
 */
function montarAmostrasAPartirDoPainel(identificadoresEntrada, identificadoresSaida) {

    var todosOsIdentificadores = identificadoresEntrada.concat(identificadoresSaida);
    var colunas = {};
    var quantidadeDeAmostras = 1;

    todosOsIdentificadores.forEach(function (identificador) {
        var elemento = document.getElementById(identificador);
        var bruto = elemento ? String(elemento.value) : '';
        var partes = bruto.split(',').map(function (parte) { return parte.trim(); });
        colunas[identificador] = partes;
        if (partes.length > quantidadeDeAmostras) { quantidadeDeAmostras = partes.length; }
    });

    var amostras = [];
    for (var i = 0; i < quantidadeDeAmostras; i++) {
        var amostra = {};
        todosOsIdentificadores.forEach(function (identificador) {
            var partes = colunas[identificador];
            var texto = (i < partes.length) ? partes[i] : partes[partes.length - 1];
            amostra[identificador] = converterTextoEmValor(texto);
        });
        amostras.push(amostra);
    }

    return amostras;
}

/**
 * Descobre quantos neuronios existem em cada camada escondida lendo os
 * mostradores do painel.
 */
function lerArquiteturaDasCamadasEscondidas() {
    var quantidades = [];
    var indice = 0;
    while (true) {
        var mostrador = document.getElementById('qtdeNeuronioCamadaEscondida' + indice);
        if (!mostrador) { break; }
        var quantidade = parseInt(mostrador.textContent, 10);
        quantidades.push(Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1);
        indice++;
    }
    return quantidades.length > 0 ? quantidades : [2];
}


/* ============================================================================
 *  2) FUNCAO PRINCIPAL - INICIA O TREINAMENTO
 * ----------------------------------------------------------------------------
 *  Assinatura mantida igual a original para nao quebrar quem ja chamava.
 * ========================================================================= */
function treinarRedeNeural(
    arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA,
    arrayIdsIputsDeEntradaDadosParaTreinamentos,
    arrayIdsIputsDeDadosDaSaidaReal,
    chavesArray
) {

    try {

        pararTreinamento();

        var identificadoresEntrada = arrayIdsIputsDeEntradaDadosParaTreinamentos || [];
        var identificadoresSaida = arrayIdsIputsDeDadosDaSaidaReal || [];

        if (identificadoresEntrada.length === 0 || identificadoresSaida.length === 0) {
            avisar('Configure ao menos uma coluna de entrada e uma de saida em "Configurar Entrada de Dados".');
            return null;
        }

        // ---- 2.1 Dados -------------------------------------------------
        var amostras = montarAmostrasAPartirDoPainel(identificadoresEntrada, identificadoresSaida);
        var conjunto = MotorRedeNeural.prepararConjuntoDeDados(amostras, identificadoresEntrada, identificadoresSaida);
        dadosEntrada = amostras;

        mostrarDadosNormalizados(conjunto);

        // ---- 2.2 Arquitetura -------------------------------------------
        var neuroniosCamadaEntrada = Math.max(1, parseInt(document.getElementById('entradaQtdeNeuronios').textContent, 10) || 1);
        var camadasEscondidas = (arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA &&
            arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA.length > 0)
            ? arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA.slice()
            : lerArquiteturaDasCamadasEscondidas();

        // A camada de saida DEVE ter exatamente um neuronio por coluna de saida.
        // Antes isso podia divergir e o treinamento comparava vetores de tamanhos
        // diferentes. Agora o painel e ajustado para bater com os dados.
        var neuroniosCamadaSaida = identificadoresSaida.length;
        var mostradorSaida = document.getElementById('saidaQtdeNeuronios');
        if (mostradorSaida && parseInt(mostradorSaida.textContent, 10) !== neuroniosCamadaSaida) {
            mostradorSaida.textContent = String(neuroniosCamadaSaida);
        }

        // camadas = [dados brutos, camada de entrada, escondidas..., saida]
        var camadas = [identificadoresEntrada.length, neuroniosCamadaEntrada]
            .concat(camadasEscondidas)
            .concat([neuroniosCamadaSaida]);

        // ---- 2.3 Hiper-parametros --------------------------------------
        var totalEpocas = Math.round(lerNumeroDoCampo('id_epocasDeTreinamento', 300, 1, 100000));
        var taxaDeAprendizagem = lerNumeroDoCampo('id_taxaDeAprendizagem', 0.1, 0.0000001, 10);
        var lambda = lerNumeroDoCampo('id_regulacaoLambda', 0.0001, 0, 10);
        var ativacaoOculta = lerTextoDoCampo('id_funcaoAtivacaoOculta', 'sigmoide');
        var ativacaoSaida = lerTextoDoCampo('id_funcaoAtivacaoSaida', 'linear');

        var rede = MotorRedeNeural.criarRede({
            camadas: camadas,
            ativacaoOculta: ativacaoOculta,
            ativacaoSaida: ativacaoSaida,
            semente: Date.now() & 0xffff
        });

        // ---- 2.4 Prepara o estado --------------------------------------
        TreinamentoRedeNeural.rede = rede;
        TreinamentoRedeNeural.conjunto = conjunto;
        TreinamentoRedeNeural.totalEpocas = totalEpocas;
        TreinamentoRedeNeural.totalAmostras = conjunto.entradas.length;
        TreinamentoRedeNeural.taxaDeAprendizagem = taxaDeAprendizagem;
        TreinamentoRedeNeural.lambda = lambda;
        TreinamentoRedeNeural.epocaAtual = 0;
        TreinamentoRedeNeural.amostraAtual = 0;
        TreinamentoRedeNeural.erroAcumuladoDaEpoca = 0;
        TreinamentoRedeNeural.historicoErroGeral = [];
        TreinamentoRedeNeural.historicoReais = [];
        TreinamentoRedeNeural.historicoPrevistos = [];
        for (var a = 0; a < conjunto.entradas.length; a++) {
            TreinamentoRedeNeural.historicoReais.push([]);
            TreinamentoRedeNeural.historicoPrevistos.push([]);
        }

        aplicarVelocidadeDoPainel();
        prepararGraficosParaAsAmostras(conjunto.entradas.length);

        // A animacao comeca AQUI, junto com o treinamento -- nunca antes.
        if (TreinamentoRedeNeural.animador) {
            TreinamentoRedeNeural.animador.limpar();
            TreinamentoRedeNeural.animador.atualizarGeometria();
            TreinamentoRedeNeural.animador.emTreinamento = true;
            if (TreinamentoRedeNeural.animador.ligado) {
                TreinamentoRedeNeural.animador.iniciar();
            }
        }

        TreinamentoRedeNeural.situacao = 'treinando';
        atualizarBotoesDeControle();
        agendarProximoLote();

        return TreinamentoRedeNeural;

    } catch (erro) {
        console.error('Falha ao iniciar o treinamento:', erro);
        avisar('Nao foi possivel iniciar o treinamento.\n\n' + erro.message);
        TreinamentoRedeNeural.situacao = 'parado';
        atualizarBotoesDeControle();
        return null;
    }
}


/* ============================================================================
 *  3) LACO ASSINCRONO DE TREINAMENTO
 * ----------------------------------------------------------------------------
 *  O laco NAO agenda todos os passos de uma vez (era o que a versao anterior
 *  fazia com setTimeout dentro de dois "for", o que fazia epocas de amostras
 *  diferentes dispararem no mesmo instante e embaralhava tudo).
 *
 *  Aqui existe um unico temporizador vivo por vez: ele executa um lote de
 *  passos, devolve o controle ao navegador (para a tela respirar e a animacao
 *  desenhar) e so entao agenda o proximo lote.
 * ========================================================================= */

function agendarProximoLote() {
    if (TreinamentoRedeNeural.situacao !== 'treinando') { return; }
    TreinamentoRedeNeural.identificadorTemporizador = setTimeout(
        executarLoteDePassos,
        TreinamentoRedeNeural.atrasoEntrePassos
    );
}

function executarLoteDePassos() {

    if (TreinamentoRedeNeural.situacao !== 'treinando') { return; }

    var quantidade = Math.max(1, TreinamentoRedeNeural.passosPorLote);

    for (var i = 0; i < quantidade; i++) {
        if (!executarUmPasso()) { return; }
    }

    agendarProximoLote();
}

/**
 * Executa UM passo de treinamento (uma amostra) e devolve false quando o
 * treinamento inteiro terminou.
 */
function executarUmPasso() {

    var estado = TreinamentoRedeNeural;
    var conjunto = estado.conjunto;

    var indiceAmostra = estado.amostraAtual;
    var entradas = conjunto.entradas[indiceAmostra];
    var alvos = conjunto.saidas[indiceAmostra];

    var passo;
    try {
        passo = MotorRedeNeural.treinarUmPasso(estado.rede, entradas, alvos, estado.taxaDeAprendizagem, estado.lambda);
    } catch (erro) {
        console.error('Erro durante o passo de treinamento:', erro);
        avisar('O treinamento foi interrompido: ' + erro.message);
        pararTreinamento();
        return false;
    }

    // Se os numeros explodiram, parar e explicar o motivo em vez de encher a
    // tela de NaN sem dizer nada.
    if (!Number.isFinite(passo.erro)) {
        avisar('Os valores da rede explodiram (NaN/Infinito).\n\n' +
            'Reduza a "Taxa Aprendizagem" e tente novamente.');
        pararTreinamento();
        return false;
    }

    estado.erroAcumuladoDaEpoca += passo.erro;

    // ---- Alimenta a animacao com os numeros REAIS deste passo -----------
    if (estado.animador) {
        estado.animador.registrarPasso({
            ativacoes: passo.ativacoes,
            deltas: passo.deltas,
            saida: passo.saida,
            alvos: passo.alvos,
            erro: passo.erro,
            epoca: estado.epocaAtual + 1,
            totalEpocas: estado.totalEpocas,
            amostra: indiceAmostra + 1,
            totalAmostras: estado.totalAmostras
        });
    }

    // ---- Mostra os numeros no painel -----------------------------------
    var previstoNaEscalaOriginal = MotorRedeNeural.desnormalizarSaidaDaRede(passo.saida, conjunto);
    var realNaEscalaOriginal = conjunto.saidasOriginais[indiceAmostra];

    atualizarPainelDeResultados(realNaEscalaOriginal, previstoNaEscalaOriginal, passo.erro);
    atualizarTextoDosPesos(estado.rede);

    estado.historicoReais[indiceAmostra].push(realNaEscalaOriginal[0]);
    estado.historicoPrevistos[indiceAmostra].push(previstoNaEscalaOriginal[0]);

    // ---- Avanca os contadores ------------------------------------------
    estado.amostraAtual++;

    if (estado.amostraAtual >= estado.totalAmostras) {
        estado.amostraAtual = 0;
        estado.epocaAtual++;

        var erroMedioDaEpoca = estado.erroAcumuladoDaEpoca / estado.totalAmostras;
        estado.historicoErroGeral.push(erroMedioDaEpoca);
        estado.erroAcumuladoDaEpoca = 0;

        atualizarTextoDeSaidasPorEpoca();
        redesenharGraficos(false);

        if (estado.epocaAtual >= estado.totalEpocas) {
            concluirTreinamento();
            return false;
        }
    }

    redesenharGraficos(true);
    return true;
}

function concluirTreinamento() {
    TreinamentoRedeNeural.situacao = 'parado';
    limparTemporizador();
    redesenharGraficos(false);
    if (TreinamentoRedeNeural.animador) {
        TreinamentoRedeNeural.animador.encerrarTreinamento();
    }
    atualizarBotoesDeControle();
    var elemento = document.getElementById('id_situacaoTreinamento');
    if (elemento) {
        var erroFinal = TreinamentoRedeNeural.historicoErroGeral.slice(-1)[0];
        elemento.textContent = 'Treinamento concluido - erro final ' +
            (Number.isFinite(erroFinal) ? erroFinal.toFixed(6) : '--');
    }
}


/* ============================================================================
 *  4) CONTROLES: PARAR, PAUSAR, RETOMAR, VELOCIDADE
 * ========================================================================= */

function limparTemporizador() {
    if (TreinamentoRedeNeural.identificadorTemporizador !== null) {
        clearTimeout(TreinamentoRedeNeural.identificadorTemporizador);
        TreinamentoRedeNeural.identificadorTemporizador = null;
    }
}

function pararTreinamento() {
    limparTemporizador();
    TreinamentoRedeNeural.situacao = 'parado';
    if (TreinamentoRedeNeural.animador) {
        TreinamentoRedeNeural.animador.encerrarTreinamento();
    }
    atualizarBotoesDeControle();
}

function pausarOuRetomarTreinamento() {

    var animador = TreinamentoRedeNeural.animador;

    if (TreinamentoRedeNeural.situacao === 'treinando') {
        limparTemporizador();
        TreinamentoRedeNeural.situacao = 'pausado';
        // Pausado significa parado: a animacao congela junto, senao os pulsos
        // continuariam correndo pela rede sem nenhum calculo acontecendo.
        if (animador) { animador.parar(); }

    } else if (TreinamentoRedeNeural.situacao === 'pausado') {
        TreinamentoRedeNeural.situacao = 'treinando';
        if (animador && animador.ligado) { animador.iniciar(); }
        agendarProximoLote();
    }

    atualizarBotoesDeControle();
}

/**
 * Traduz a posicao do controle deslizante (1 = bem devagar, 100 = maximo) em
 * atraso entre passos, tamanho do lote e duracao do ciclo da animacao.
 *
 * Na velocidade baixa da para acompanhar cada onda percorrendo a rede fio a
 * fio; na velocidade alta o treino corre solto e a animacao mostra sempre o
 * passo mais recente.
 */
function aplicarVelocidadeDoPainel() {

    var velocidade = lerNumeroDoCampo('id_velocidadeTreinamento', 45, 1, 100);
    var fracao = (velocidade - 1) / 99;

    // Curva exponencial: 1400ms na ponta lenta, ~8ms na ponta rapida.
    var atraso = Math.round(1400 * Math.pow(0.006, fracao));
    var passosPorLote = velocidade > 85 ? Math.round(1 + (velocidade - 85) * 3) : 1;

    TreinamentoRedeNeural.atrasoEntrePassos = Math.max(4, atraso);
    TreinamentoRedeNeural.passosPorLote = passosPorLote;

    if (TreinamentoRedeNeural.animador) {
        // O ciclo da animacao acompanha o passo, com um minimo para nao virar
        // um borrao ilegivel quando o treino esta muito rapido.
        TreinamentoRedeNeural.animador.definirVelocidade(Math.max(280, Math.min(atraso, 2600)));
    }

    var rotulo = document.getElementById('id_rotuloVelocidade');
    if (rotulo) {
        rotulo.textContent = atraso >= 400 ? 'passo a passo' : (atraso >= 80 ? 'normal' : 'rapido');
    }
}

function atualizarBotoesDeControle() {

    var botaoIniciar = document.getElementById('botaoIniciar');
    var botaoPausar = document.getElementById('id_botaoPausar');
    var botaoParar = document.getElementById('id_botaoParar');
    var situacao = document.getElementById('id_situacaoTreinamento');

    var estaTreinando = TreinamentoRedeNeural.situacao === 'treinando';
    var estaPausado = TreinamentoRedeNeural.situacao === 'pausado';

    if (botaoIniciar) { botaoIniciar.textContent = (estaTreinando || estaPausado) ? 'Reiniciar' : 'Iniciar'; }
    if (botaoPausar) {
        botaoPausar.textContent = estaPausado ? 'Continuar' : 'Pausar';
        botaoPausar.disabled = !(estaTreinando || estaPausado);
    }
    if (botaoParar) { botaoParar.disabled = !(estaTreinando || estaPausado); }

    if (situacao && (estaTreinando || estaPausado)) {
        situacao.textContent = estaPausado
            ? 'Pausado na epoca ' + TreinamentoRedeNeural.epocaAtual
            : 'Treinando... epoca ' + (TreinamentoRedeNeural.epocaAtual + 1) + '/' + TreinamentoRedeNeural.totalEpocas;
    }
}


/* ============================================================================
 *  5) SAIDA NA TELA (textareas e labels)
 * ========================================================================= */

function definirValorDoCampo(identificador, texto) {
    var elemento = document.getElementById(identificador);
    if (!elemento) { return; }
    // Em <textarea> o correto e mexer em .value. Usar .innerHTML deixava o
    // conteudo visivel dessincronizado do conteudo real do campo.
    if (elemento.value !== undefined) {
        elemento.value = texto;
    } else {
        elemento.textContent = texto;
    }
}

function formatarLista(valores, casasDecimais) {
    return valores.map(function (valor) {
        return Number.isFinite(valor) ? valor.toFixed(casasDecimais) : String(valor);
    }).join(' | ');
}

function atualizarPainelDeResultados(reais, previstos, erro) {
    var real = document.getElementById('resultadoReal');
    var previsto = document.getElementById('resultadoPrevisto');
    var mse = document.getElementById('erroQuadraticoMedio');
    if (real) { real.textContent = formatarLista(reais, 2); }
    if (previsto) { previsto.textContent = formatarLista(previstos, 2); }
    if (mse) { mse.textContent = erro.toFixed(6); }
}

/**
 * Escreve os pesos de cada bloco nas tres caixas de texto do painel.
 * A caixa "Pesos Escondidos" mostra todos os blocos intermediarios.
 */
function atualizarTextoDosPesos(rede) {

    if (!rede || !rede.pesos.length) { return; }

    var ultimoBloco = rede.pesos.length - 1;

    definirValorDoCampo('pesosEntrada', formatarBlocoDePesos(rede.pesos[0], rede.vieses[0]));

    var textoEscondidos = '';
    for (var bloco = 1; bloco < ultimoBloco; bloco++) {
        textoEscondidos += '--- camada ' + bloco + ' ---\n';
        textoEscondidos += formatarBlocoDePesos(rede.pesos[bloco], rede.vieses[bloco]) + '\n';
    }
    if (textoEscondidos === '') { textoEscondidos = '(rede sem bloco escondido intermediario)'; }
    definirValorDoCampo('pesosEscondidos', textoEscondidos);

    if (ultimoBloco > 0) {
        definirValorDoCampo('pesosSaida', formatarBlocoDePesos(rede.pesos[ultimoBloco], rede.vieses[ultimoBloco]));
    }
}

function formatarBlocoDePesos(matriz, vieses) {
    var linhas = [];
    for (var destino = 0; destino < matriz.length; destino++) {
        var pesosFormatados = matriz[destino].map(function (peso) {
            return (peso >= 0 ? ' ' : '') + peso.toFixed(6);
        }).join('  ');
        linhas.push('n' + destino + ': ' + pesosFormatados + '   [vies ' + vieses[destino].toFixed(6) + ']');
    }
    return linhas.join('\n');
}

function atualizarTextoDeSaidasPorEpoca() {
    var estado = TreinamentoRedeNeural;
    var linhas = [];
    for (var amostra = 0; amostra < estado.historicoPrevistos.length; amostra++) {
        var previstos = estado.historicoPrevistos[amostra];
        var real = estado.historicoReais[amostra][0];
        linhas.push('Amostra ' + (amostra + 1) +
            ' | real: ' + (Number.isFinite(real) ? real.toFixed(2) : real) +
            ' | previsto por epoca: ' + previstos.map(function (v) { return v.toFixed(2); }).join(', '));
    }
    definirValorDoCampo('valoresDeSaidas', linhas.join('\n'));
}

function mostrarDadosNormalizados(conjunto) {
    var linhas = conjunto.entradas.map(function (entrada, indice) {
        var objeto = {};
        conjunto.chavesEntrada.forEach(function (chave, i) { objeto[chave] = Number(entrada[i].toFixed(4)); });
        conjunto.chavesSaida.forEach(function (chave, i) { objeto[chave] = Number(conjunto.saidas[indice][i].toFixed(4)); });
        return objeto;
    });
    definirValorDoCampo('idObjetoDeDadosDeEntradaNormalizado', JSON.stringify({
        observacao: 'Valores reescalados para a faixa 0..1 (min-max) antes de entrar na rede.',
        minimosEMaximos: conjunto.estatisticas,
        categoriasDeTexto: conjunto.mapeamentos,
        amostrasNormalizadas: linhas
    }, null, 4));
}

function avisar(mensagem) {
    var elemento = document.getElementById('id_situacaoTreinamento');
    if (elemento) { elemento.textContent = mensagem.split('\n')[0]; }
    if (typeof alert === 'function') { alert(mensagem); }
}


/* ============================================================================
 *  6) GRAFICOS (biblioteca do Google)
 * ----------------------------------------------------------------------------
 *  Todas as chamadas sao protegidas: se a pagina for aberta sem internet, a
 *  biblioteca do Google nao carrega e o painel precisa continuar funcionando
 *  (antes, isso derrubava o treinamento inteiro com um erro).
 * ========================================================================= */

var graficoDisponivel = false;

function inicializarGrafico() {
    if (typeof google === 'undefined' || !google.charts) {
        console.warn('Biblioteca de graficos do Google indisponivel (sem internet?). O treinamento continua funcionando.');
        return;
    }
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(function () {
        graficoDisponivel = true;
        redesenharGraficos(false);
    });
}

function graficoEstaPronto() {
    return graficoDisponivel && typeof google !== 'undefined' && google.visualization && google.visualization.LineChart;
}

/** Cria uma div de grafico por amostra, alem da que ja existe no HTML. */
function prepararGraficosParaAsAmostras(quantidadeDeAmostras) {

    var container = document.getElementById('divGraficoVariosGraficos');
    if (!container) { return; }

    // Remove os graficos extras da execucao anterior, preservando o grafico0.
    Array.prototype.slice.call(container.children).forEach(function (filho) {
        if (filho.id !== 'grafico0') { container.removeChild(filho); }
    });

    var modelo = document.getElementById('grafico0');
    if (!modelo) { return; }

    for (var i = 1; i < quantidadeDeAmostras; i++) {
        var div = document.createElement('div');
        div.id = 'grafico' + i;
        div.className = 'divgraficos';
        div.style.height = (modelo.offsetHeight || 220) + 'px';
        container.appendChild(div);
    }
}

/**
 * Redesenha as curvas. Quando "comLimite" e verdadeiro, so redesenha se ja
 * passou tempo suficiente desde a ultima vez -- redesenhar um grafico do Google
 * a cada passo derrubaria a taxa de quadros da animacao.
 */
function redesenharGraficos(comLimite) {

    if (!graficoEstaPronto()) { return; }

    var agora = Date.now();
    if (comLimite && (agora - TreinamentoRedeNeural.instanteUltimoGrafico) < 300) { return; }
    TreinamentoRedeNeural.instanteUltimoGrafico = agora;

    var estado = TreinamentoRedeNeural;

    for (var amostra = 0; amostra < estado.historicoPrevistos.length; amostra++) {
        desenharGrafico(
            estado.historicoReais[amostra],
            estado.historicoPrevistos[amostra],
            'grafico' + amostra,
            'Amostra ' + (amostra + 1) + ' - real x previsto'
        );
    }

    desenharGraficoDeErro(estado.historicoErroGeral, 'graficoErro');
}

function desenharGrafico(valoresReais, valoresPrevistos, identificadorGrafico, titulo) {

    if (!graficoEstaPronto()) { return; }
    var alvo = document.getElementById(identificadorGrafico);
    if (!alvo || !valoresPrevistos || valoresPrevistos.length === 0) { return; }

    var dados = [['Passo', 'Valor Previsto', 'Valor Real']];
    for (var i = 0; i < valoresPrevistos.length; i++) {
        dados.push([i, Number(valoresPrevistos[i]) || 0, Number(valoresReais[i]) || 0]);
    }

    try {
        var tabela = google.visualization.arrayToDataTable(dados);
        var chart = new google.visualization.LineChart(alvo);
        chart.draw(tabela, {
            title: titulo || 'Grafico de Aprendizagem',
            titleTextStyle: { color: '#d3d3d3' },
            curveType: 'function',
            legend: { position: 'bottom', textStyle: { color: '#d3d3d3' } },
            backgroundColor: '#042944',
            colors: ['#a5d817', '#00eeff'],
            hAxis: { title: 'Passo de treinamento', textStyle: { color: '#9fb6c6' }, titleTextStyle: { color: '#9fb6c6' } },
            vAxis: { title: 'Valor', textStyle: { color: '#9fb6c6' }, titleTextStyle: { color: '#9fb6c6' } },
            chartArea: { width: '78%', height: '68%' }
        });
    } catch (erro) {
        console.warn('Nao foi possivel desenhar o grafico ' + identificadorGrafico + ':', erro);
    }
}

function desenharGraficoDeErro(historicoDeErro, identificadorGrafico) {

    if (!graficoEstaPronto()) { return; }
    var alvo = document.getElementById(identificadorGrafico);
    if (!alvo || !historicoDeErro || historicoDeErro.length === 0) { return; }

    var dados = [['Epoca', 'Erro Quadratico Medio']];
    for (var i = 0; i < historicoDeErro.length; i++) {
        dados.push([i + 1, historicoDeErro[i]]);
    }

    try {
        var tabela = google.visualization.arrayToDataTable(dados);
        var chart = new google.visualization.LineChart(alvo);
        chart.draw(tabela, {
            title: 'Curva de Erro (quanto menor, mais a rede aprendeu)',
            titleTextStyle: { color: '#d3d3d3' },
            curveType: 'function',
            legend: { position: 'none' },
            backgroundColor: '#042944',
            colors: ['#ff9a3d'],
            hAxis: { title: 'Epoca', textStyle: { color: '#9fb6c6' }, titleTextStyle: { color: '#9fb6c6' } },
            vAxis: { title: 'Erro', textStyle: { color: '#9fb6c6' }, titleTextStyle: { color: '#9fb6c6' } },
            chartArea: { width: '78%', height: '62%' }
        });
    } catch (erro) {
        console.warn('Nao foi possivel desenhar a curva de erro:', erro);
    }
}


/* ============================================================================
 *  EXPORTACAO PARA OS TESTES AUTOMATIZADOS
 * ========================================================================= */
if (typeof module === 'object' && module.exports) {
    module.exports = {
        TreinamentoRedeNeural: TreinamentoRedeNeural,
        treinarRedeNeural: treinarRedeNeural,
        pararTreinamento: pararTreinamento,
        pausarOuRetomarTreinamento: pausarOuRetomarTreinamento,
        aplicarVelocidadeDoPainel: aplicarVelocidadeDoPainel,
        montarAmostrasAPartirDoPainel: montarAmostrasAPartirDoPainel,
        converterTextoEmValor: converterTextoEmValor,
        lerNumeroDoCampo: lerNumeroDoCampo,
        lerArquiteturaDasCamadasEscondidas: lerArquiteturaDasCamadasEscondidas,
        formatarBlocoDePesos: formatarBlocoDePesos,
        formatarLista: formatarLista
    };
}
