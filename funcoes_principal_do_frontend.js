/*
 * ============================================================================
 *  funcoes_principal_do_frontend.js
 * ----------------------------------------------------------------------------
 *  Tudo o que e INTERFACE: montar a arquitetura da rede na tela, ler os botoes
 *  de + e -, criar os campos de entrada de dados e ligar o painel ao animador.
 *
 *  Como os neuronios sao desenhados:
 *
 *    As divs circulares continuam existindo -- elas sao o "esqueleto" que o
 *    flexbox usa para calcular ONDE cada neuronio fica. Mas elas ficam
 *    invisiveis, e quem pinta o neuronio de fato e o <canvas>. Assim o canvas
 *    controla a ordem das camadas (fio atras, neuronio na frente), o brilho, o
 *    halo e o valor numerico dentro do circulo -- coisas impossiveis de fazer
 *    quando metade do desenho e DOM e a outra metade e canvas.
 *
 *    Se o animador nao carregar por qualquer motivo, as divs permanecem
 *    visiveis e o painel continua utilizavel.
 *
 *  JavaScript puro, sem nenhuma biblioteca.
 * ============================================================================
 */

'use strict';

/* ============================================================================
 *  VARIAVEIS GLOBAIS DO PAINEL
 * ========================================================================= */

var arrayIdsIputsDeEntradaDadosParaTreinamentos = [];
var arrayIdsIputsDeDadosDaSaidaReal = [];
var arrayDeDivsDeDadosDeEntradas = [];
var chavesArray = [];

var arrayNeuroniosCamadaEntrada = [];      // ['drawNeuronioEntrada0', ...]
var arrayNeuroniosCamadasEscondidas = [];  // [['drawNeuronioEscondida0_0', ...], ...]
var arrayNeuroniosCamadaSaida = [];        // ['drawNeuronioSaida0', ...]

// Mantido com o nome antigo: outras partes do painel liam esta variavel.
var array_neuronio_draw_saidas_id_global = [];

var neuroniosNaCamadaDeEntrada = 3;
var neuroniosNaCamadaDeSaida = 1;
var qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada = [4];

var animadorDaRede = null;
var neuroniosDesenhadosNoCanvas = false;


/* ============================================================================
 *  1) MONTAGEM VISUAL DA ARQUITETURA
 * ========================================================================= */

/**
 * Calcula o tamanho de cada bolinha para que a camada mais cheia ainda caiba na
 * altura disponivel. Sem isso, ao pedir 30 neuronios, eles vazavam para fora do
 * quadro e as linhas eram desenhadas para coordenadas fora da tela.
 */
function calcularTamanhoDoNeuronio(maiorQuantidadeDeNeuronios, alturaDisponivel) {
    var espacoPorNeuronio = alturaDisponivel / Math.max(1, maiorQuantidadeDeNeuronios);
    var tamanho = Math.floor(espacoPorNeuronio * 0.72);
    if (tamanho > 30) { tamanho = 30; }
    if (tamanho < 4) { tamanho = 4; }
    return tamanho;
}

function criarDivDeNeuronio(identificador, tamanho, margemVertical) {
    var neuronio = document.createElement('div');
    neuronio.id = identificador;
    neuronio.className = 'neuronioDesenhado';
    neuronio.style.width = tamanho + 'px';
    neuronio.style.height = tamanho + 'px';
    neuronio.style.borderRadius = '50%';
    neuronio.style.backgroundImage = 'linear-gradient(to right, #4623CB, #8531EC)';
    neuronio.style.margin = margemVertical + 'px auto';
    neuronio.style.flex = '0 0 auto';
    return neuronio;
}

function criarColunaDeCamada(identificador) {
    var coluna = document.createElement('div');
    coluna.id = identificador;
    coluna.className = 'colunaDeCamada';
    coluna.style.display = 'flex';
    coluna.style.flexDirection = 'column';
    coluna.style.justifyContent = 'center';
    coluna.style.alignItems = 'center';
    coluna.style.flex = '1 1 0';
    coluna.style.minWidth = '0';
    coluna.style.paddingTop = '14px';
    coluna.style.paddingBottom = '14px';
    return coluna;
}

/**
 * Reconstroi do zero o desenho da rede: apaga tudo dentro de #containerDrawRNA,
 * recria as colunas de neuronios e o canvas, e avisa o animador.
 */
function funcaoPrincipalDeRenderizacaoDaRedeNeural() {

    var containerDrawRNA = document.getElementById('containerDrawRNA');
    if (!containerDrawRNA) { return; }

    // Garante que o canvas seja posicionado em relacao a ESTE container.
    // Antes o canvas era "position: absolute" sem ancestral posicionado, entao
    // ele se alinhava com a pagina inteira -- dai a necessidade das gambiarras
    // com window.scrollY que quebravam assim que a pagina era rolada.
    containerDrawRNA.style.position = 'relative';

    containerDrawRNA.innerHTML = '';

    arrayNeuroniosCamadaEntrada = [];
    arrayNeuroniosCamadasEscondidas = [];
    arrayNeuroniosCamadaSaida = [];

    // Os 48px descontados sao o espaco reservado para o painel de informacao no
    // topo e para os rotulos das camadas no rodape, desenhados pelo animador.
    var alturaDisponivel = (containerDrawRNA.clientHeight || 280) - 48;

    var maiorQuantidade = Math.max(
        neuroniosNaCamadaDeEntrada,
        neuroniosNaCamadaDeSaida,
        Math.max.apply(null, qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.concat([1]))
    );
    var tamanho = calcularTamanhoDoNeuronio(maiorQuantidade, alturaDisponivel);
    var margem = Math.max(1, Math.floor(tamanho * 0.18));

    var indice, coluna, camada;

    // ---- camada de entrada ---------------------------------------------
    coluna = criarColunaDeCamada('containerNeuroniosCamadaEntrada');
    for (indice = 0; indice < neuroniosNaCamadaDeEntrada; indice++) {
        var identificadorEntrada = 'drawNeuronioEntrada' + indice;
        coluna.appendChild(criarDivDeNeuronio(identificadorEntrada, tamanho, margem));
        arrayNeuroniosCamadaEntrada.push(identificadorEntrada);
    }
    containerDrawRNA.appendChild(coluna);

    // ---- camadas escondidas --------------------------------------------
    for (camada = 0; camada < qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.length; camada++) {
        coluna = criarColunaDeCamada('containerNeuroniosCamadaEscondida' + camada);
        var identificadoresDaCamada = [];
        for (indice = 0; indice < qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada[camada]; indice++) {
            // O separador "_" evita que a camada 1 neuronio 12 e a camada 11
            // neuronio 2 gerem o mesmo id ("112").
            var identificadorEscondida = 'drawNeuronioEscondida' + camada + '_' + indice;
            coluna.appendChild(criarDivDeNeuronio(identificadorEscondida, tamanho, margem));
            identificadoresDaCamada.push(identificadorEscondida);
        }
        containerDrawRNA.appendChild(coluna);
        arrayNeuroniosCamadasEscondidas.push(identificadoresDaCamada);
    }

    // ---- camada de saida -----------------------------------------------
    coluna = criarColunaDeCamada('containerNeuroniosCamadaSaida');
    for (indice = 0; indice < neuroniosNaCamadaDeSaida; indice++) {
        var identificadorSaida = 'drawNeuronioSaida' + indice;
        coluna.appendChild(criarDivDeNeuronio(identificadorSaida, tamanho, margem));
        arrayNeuroniosCamadaSaida.push(identificadorSaida);
    }
    containerDrawRNA.appendChild(coluna);

    array_neuronio_draw_saidas_id_global = arrayNeuroniosCamadasEscondidas;

    // ---- canvas por cima de tudo ---------------------------------------
    var canvas = document.createElement('canvas');
    canvas.id = 'meuCanvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    containerDrawRNA.appendChild(canvas);

    prepararAnimador(canvas);
    atualizarResumoDaArquitetura();
}

/** Monta a lista de camadas/ids que o animador usa para achar as posicoes. */
function montarDescricaoDasCamadas() {
    var camadas = [{ tipo: 'entrada', rotulo: 'Entrada', ids: arrayNeuroniosCamadaEntrada }];
    for (var c = 0; c < arrayNeuroniosCamadasEscondidas.length; c++) {
        camadas.push({ tipo: 'escondida', rotulo: 'Oculta ' + (c + 1), ids: arrayNeuroniosCamadasEscondidas[c] });
    }
    camadas.push({ tipo: 'saida', rotulo: 'Saida', ids: arrayNeuroniosCamadaSaida });
    return camadas;
}

/** Cria (ou reaproveita) o animador e o aponta para o canvas novo. */
function prepararAnimador(canvas) {

    if (typeof AnimadorRedeNeural !== 'function') {
        // Sem o animador, mantem as bolinhas do DOM visiveis para o painel
        // continuar fazendo sentido.
        neuroniosDesenhadosNoCanvas = false;
        return;
    }

    animadorDaRede = new AnimadorRedeNeural({
        canvas: canvas,
        obterGeometria: function () {
            return AnimacaoRedeNeural.lerGeometriaDoDOM(canvas, montarDescricaoDasCamadas());
        },
        obterRede: function () {
            return TreinamentoRedeNeural ? TreinamentoRedeNeural.rede : null;
        }
    });

    animadorDaRede.mostrarValores = obterEstadoDoInterruptor('id_mostrarValores', true);
    animadorDaRede.mostrarPesos = obterEstadoDoInterruptor('id_mostrarPesos', false);
    animadorDaRede.ligado = obterEstadoDoInterruptor('id_animacaoLigada', true);

    TreinamentoRedeNeural.animador = animadorDaRede;

    // Agora que o canvas assume o desenho, as divs viram apenas ancoras de
    // posicao: continuam ocupando espaco (o flexbox precisa delas), mas nao
    // aparecem.
    esconderDivsDeNeuronios();
    neuroniosDesenhadosNoCanvas = true;

    // O layout so tem medidas confiaveis depois que o navegador desenha.
    //
    // Aqui a rede e desenhada UMA vez, parada. O laco de animacao NAO comeca:
    // ele so roda enquanto a rede esta treinando ou durante a demonstracao do
    // botao "Testar Conexoes". Animar com a pagina recem-aberta daria a
    // impressao de que a rede esta processando algo quando ela esta parada.
    requestAnimationFrame(function () {
        animadorDaRede.atualizarGeometria();
        animadorDaRede.desenharQuadroEstatico();
    });
}

/** Redesenha a rede parada, mas so quando a animacao nao esta rodando. */
function redesenharSeEstiverParado() {
    if (animadorDaRede && !animadorDaRede.rodando) {
        animadorDaRede.desenharQuadroEstatico();
    }
}

function esconderDivsDeNeuronios() {
    var divs = document.querySelectorAll('.neuronioDesenhado');
    for (var i = 0; i < divs.length; i++) {
        divs[i].style.visibility = 'hidden';
    }
}

function obterEstadoDoInterruptor(identificador, valorPadrao) {
    var elemento = document.getElementById(identificador);
    return elemento ? !!elemento.checked : valorPadrao;
}

/** Texto de resumo abaixo do desenho: "3 -> 4 -> 1  (21 parametros)". */
function atualizarResumoDaArquitetura() {

    var elemento = document.getElementById('id_resumoArquitetura');
    if (!elemento) { return; }

    var camadas = [neuroniosNaCamadaDeEntrada]
        .concat(qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada)
        .concat([neuroniosNaCamadaDeSaida]);

    var totalDeConexoes = 0;
    var entradasBrutas = arrayIdsIputsDeEntradaDadosParaTreinamentos.length || 1;
    var anterior = entradasBrutas;
    for (var i = 0; i < camadas.length; i++) {
        totalDeConexoes += anterior * camadas[i];
        anterior = camadas[i];
    }

    elemento.textContent = entradasBrutas + ' dados -> ' + camadas.join(' -> ') +
        '   |   ' + totalDeConexoes + ' conexoes';
}


/* ============================================================================
 *  2) BOTOES QUE MUDAM A ARQUITETURA
 * ========================================================================= */

function definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao() {
    try {
        pararTreinamento();
        funcaoPrincipalDeRenderizacaoDaRedeNeural();
    } catch (erro) {
        console.error('Falha ao redesenhar a rede:', erro);
    }
}

function adicionarOuRemoverNeuroniosCamadaDeEntrada(menosOuMais) {
    var mostrador = document.getElementById('entradaQtdeNeuronios');
    var valorAtual = parseInt(mostrador.textContent, 10) || 1;
    if (menosOuMais === '-') {
        if (valorAtual <= 1) { return; }
        valorAtual -= 1;
    } else {
        if (valorAtual >= 60) { return; }
        valorAtual += 1;
    }
    mostrador.textContent = String(valorAtual);
    neuroniosNaCamadaDeEntrada = valorAtual;
    definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
}

function adicionarOuRemoverNeuroniosCamadaDeSaida(menosOuMais) {
    var mostrador = document.getElementById('saidaQtdeNeuronios');
    var valorAtual = parseInt(mostrador.textContent, 10) || 1;
    if (menosOuMais === '-') {
        if (valorAtual <= 1) { return; }
        valorAtual -= 1;
    } else {
        if (valorAtual >= 20) { return; }
        valorAtual += 1;
    }
    mostrador.textContent = String(valorAtual);
    neuroniosNaCamadaDeSaida = valorAtual;

    // A camada de saida e a quantidade de colunas de saida dos dados sao a
    // mesma coisa: mantem os dois campos sempre em sincronia.
    var campoQuantidade = document.getElementById('idQtdeSaidaRede');
    if (campoQuantidade) {
        campoQuantidade.value = valorAtual;
        criandoElementoDeEntradaDeDados();
    }
    definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
}

function criarComponentesDaCamadaEscondida(menosOuMais) {

    var container = document.getElementById('containerCamadaEscondidaMostrador');
    var mostradorQuantidade = document.getElementById('qtdeCamadasEscondidasMostrador');
    var valorAtual = parseInt(mostradorQuantidade.textContent, 10) || 1;

    if (menosOuMais === '-') {
        if (valorAtual <= 1) { return; }
        var ultimoCartao = document.getElementById('camadaEscondidaMostrador' + (valorAtual - 1));
        if (ultimoCartao) { container.removeChild(ultimoCartao); }
        qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.pop();
        mostradorQuantidade.textContent = String(valorAtual - 1);
    } else {
        if (valorAtual >= 8) { return; }
        container.appendChild(criarCartaoDeCamadaEscondida(valorAtual, 4));
        qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.push(4);
        mostradorQuantidade.textContent = String(valorAtual + 1);
    }

    definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
}

/** Cria o cartao roxo com os botoes + / - de uma camada escondida. */
function criarCartaoDeCamadaEscondida(indice, quantidadeInicial) {

    var cartao = document.createElement('div');
    cartao.id = 'camadaEscondidaMostrador' + indice;
    cartao.className = 'cartaoCamadaEscondida';

    var titulo = document.createElement('label');
    titulo.textContent = 'Neuronios';
    titulo.style.textAlign = 'center';
    titulo.style.fontSize = '13px';
    titulo.style.color = 'white';

    var linha = document.createElement('div');
    linha.style.display = 'flex';
    linha.style.flexDirection = 'row';

    var botaoRemover = document.createElement('button');
    botaoRemover.id = 'escondidaQtdeNeuronioxRemover' + indice;
    botaoRemover.textContent = '-';
    botaoRemover.className = 'botaoSubtrair2';
    botaoRemover.onclick = function () { adicionarOuRemoverNeuroniosCamadaEscondida(this); };

    var botaoAdicionar = document.createElement('button');
    botaoAdicionar.id = 'escondidaQtdeNeuronioxAdicionar' + indice;
    botaoAdicionar.textContent = '+';
    botaoAdicionar.className = 'botaoSomar2';
    botaoAdicionar.onclick = function () { adicionarOuRemoverNeuroniosCamadaEscondida(this); };

    var mostrador = document.createElement('label');
    mostrador.id = 'qtdeNeuronioCamadaEscondida' + indice;
    mostrador.textContent = String(quantidadeInicial);
    mostrador.style.fontWeight = 'bolder';
    mostrador.style.textAlign = 'center';
    mostrador.style.width = '22px';

    linha.appendChild(botaoRemover);
    linha.appendChild(botaoAdicionar);
    linha.appendChild(mostrador);
    cartao.appendChild(titulo);
    cartao.appendChild(linha);

    return cartao;
}

function adicionarOuRemoverNeuroniosCamadaEscondida(botao) {

    // O indice vem do final do id do botao. Pegar "todos os digitos" quebrava
    // se o id tivesse numero em outro lugar; aqui pegamos so o sufixo numerico.
    var casamento = /(\d+)$/.exec(botao.id);
    if (!casamento) { return; }
    var indice = parseInt(casamento[1], 10);

    var mostrador = document.getElementById('qtdeNeuronioCamadaEscondida' + indice);
    if (!mostrador) { return; }

    var quantidade = parseInt(mostrador.textContent, 10) || 1;

    if (botao.id.indexOf('Adicionar') !== -1) {
        if (quantidade >= 60) { return; }
        quantidade += 1;
    } else {
        if (quantidade <= 1) { return; }
        quantidade -= 1;
    }

    mostrador.textContent = String(quantidade);
    qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada[indice] = quantidade;
    definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
}


/* ============================================================================
 *  3) CAMPOS DE ENTRADA DE DADOS
 * ========================================================================= */

/**
 * Le o JSON da caixa de configuracao e cria um campo para cada coluna.
 * As ultimas N colunas viram as SAIDAS (o que a rede deve prever).
 */
function criandoElementoDeEntradaDeDados() {

    var caixaDeTexto = document.getElementById('idObjetoDeDadosDeEntrada');
    if (!caixaDeTexto) { return; }

    var amostras;
    try {
        // Sempre .value: em <textarea>, .textContent devolve o conteudo ORIGINAL
        // do HTML e ignora tudo o que o usuario digitou depois.
        amostras = JSON.parse(caixaDeTexto.value);
    } catch (erro) {
        alert('O JSON dos dados de entrada esta invalido:\n\n' + erro.message);
        return;
    }

    if (!Array.isArray(amostras) || amostras.length === 0) {
        alert('Os dados de entrada precisam ser uma lista de objetos JSON, com pelo menos um objeto.');
        return;
    }

    chavesArray = extrairNomesChavesArrayDeJson(amostras);
    document.getElementById('idQtdeChaves').textContent = String(chavesArray.length);

    var quantidadeDeSaidas = parseInt(document.getElementById('idQtdeSaidaRede').value, 10) || 1;
    if (quantidadeDeSaidas >= chavesArray.length) {
        quantidadeDeSaidas = chavesArray.length - 1;
        document.getElementById('idQtdeSaidaRede').value = quantidadeDeSaidas;
    }
    if (quantidadeDeSaidas < 1) { quantidadeDeSaidas = 1; }

    // Remove os campos da configuracao anterior.
    arrayDeDivsDeDadosDeEntradas.forEach(function (identificador) {
        var div = document.getElementById(identificador);
        if (div && div.parentNode) { div.parentNode.removeChild(div); }
    });
    arrayDeDivsDeDadosDeEntradas = [];
    arrayIdsIputsDeEntradaDadosParaTreinamentos = [];
    arrayIdsIputsDeDadosDaSaidaReal = [];

    var containerPrincipal = document.getElementById('id_divEntradaDeDadosPrincipalContainer');
    var divDosCamposDeEntrada = document.getElementById('id_div_dados_de_entrada_input');

    var usarSomenteOPrimeiroIndice = document.getElementById('id_botaoUsarSoUmIndice').textContent.trim() === 'Sim';

    for (var i = 0; i < chavesArray.length; i++) {

        var chave = chavesArray[i];
        var ehSaida = i >= (chavesArray.length - quantidadeDeSaidas);

        var bloco = document.createElement('div');
        bloco.id = 'id_divsDeDadosDeEntradas' + i;
        bloco.className = 'blocoCampoDeDado';
        arrayDeDivsDeDadosDeEntradas.push(bloco.id);

        var rotulo = document.createElement('label');
        rotulo.style.fontSize = '13px';
        rotulo.textContent = separarPalavrasCamelCase(chave);

        var campo = document.createElement('input');
        campo.id = chave;
        campo.className = 'campoDeDado';
        campo.title = ehSaida
            ? 'Coluna de SAIDA: o valor que a rede deve aprender a prever.'
            : 'Coluna de ENTRADA: um dos dados que alimentam a rede.';

        // Preenche com o primeiro registro ou com todos separados por virgula.
        if (usarSomenteOPrimeiroIndice) {
            campo.value = amostras[0][chave] !== undefined ? amostras[0][chave] : '';
        } else {
            campo.value = amostras.map(function (amostra) {
                return amostra[chave] !== undefined ? amostra[chave] : '';
            }).join(',');
        }

        bloco.appendChild(rotulo);
        bloco.appendChild(campo);

        if (ehSaida) {
            arrayIdsIputsDeDadosDaSaidaReal.push(chave);
            containerPrincipal.appendChild(bloco);
        } else {
            arrayIdsIputsDeEntradaDadosParaTreinamentos.push(chave);
            containerPrincipal.insertBefore(bloco, divDosCamposDeEntrada);
        }
    }

    // A camada de saida desenhada precisa ter o mesmo tamanho da saida dos dados.
    var mostradorSaida = document.getElementById('saidaQtdeNeuronios');
    if (mostradorSaida && parseInt(mostradorSaida.textContent, 10) !== quantidadeDeSaidas) {
        mostradorSaida.textContent = String(quantidadeDeSaidas);
        neuroniosNaCamadaDeSaida = quantidadeDeSaidas;
        funcaoPrincipalDeRenderizacaoDaRedeNeural();
    }

    atualizarResumoDaArquitetura();
    mostrar_e_esconder_div_configuracao_entrada('none');
    toggleIconAndCallFunction('fechar');
}


/* ============================================================================
 *  4) MOSTRAR E ESCONDER AS CAIXAS DE CONFIGURACAO
 * ========================================================================= */

function mostrar_e_esconder_div_configuracao_entrada(statusShowHidden) {

    var caixa = document.getElementById('id_div_configuracao_entrada_de_dados');
    var fundo = document.getElementById('fundoCaixaDeDialogBlackTranslucido_id');
    if (!caixa || !fundo) { return; }

    if (statusShowHidden === 'block') {
        caixa.style.display = 'block';
        fundo.style.display = 'block';
        fundo.style.height = Math.max(document.body.scrollHeight, window.innerHeight) + 'px';
    } else {
        caixa.style.display = 'none';
        fundo.style.display = 'none';
    }
}

function toggleIconAndCallFunction(status) {

    var icone = document.getElementById('icon_arrow');
    var caixa = document.getElementById('id_div_configuracao_entrada_de_dados_normalizado');
    if (!icone || !caixa) { return; }

    var deveFechar = (status === 'fechar') || icone.classList.contains('fa-arrow-left');

    if (deveFechar) {
        icone.classList.remove('fa-arrow-left');
        icone.classList.add('fa-arrow-right');
        caixa.style.display = 'none';
    } else {
        icone.classList.remove('fa-arrow-right');
        icone.classList.add('fa-arrow-left');
        caixa.style.display = 'block';
        posicionarDivDosDadosNormalizadosAoLadoDeDivEntradaDeDados();
    }
}

function posicionarDivDosDadosNormalizadosAoLadoDeDivEntradaDeDados() {
    var alvo = document.getElementById('id_div_configuracao_entrada_de_dados_normalizado');
    var referencia = document.getElementById('id_div_configuracao_entrada_de_dados');
    if (alvo && referencia) {
        setPositionEntreDoisComponente2(alvo, referencia, -120, -130);
    }
}


/* ============================================================================
 *  5) LIGACAO DOS BOTOES DO PAINEL
 * ========================================================================= */

function coletarArquiteturaEscondidaParaOMotor() {
    return qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.slice();
}

function iniciarTreinamentoPeloPainel() {
    treinarRedeNeural(
        coletarArquiteturaEscondidaParaOMotor(),
        arrayIdsIputsDeEntradaDadosParaTreinamentos,
        arrayIdsIputsDeDadosDaSaidaReal,
        chavesArray
    );
}

/**
 * "Testar Conexoes": roda a animacao por alguns ciclos, sem treinar, so para o
 * aluno ver o caminho que o sinal percorre. Como nao ha passo de treinamento, o
 * animador desenha apenas a onda de ida -- e para sozinho no fim.
 */
function testarAnimacaoDasConexoes() {
    if (!animadorDaRede) { return; }
    animadorDaRede.limpar();
    animadorDaRede.atualizarGeometria();
    animadorDaRede.iniciarDemonstracao(3);
}

function ligarBotoesDoPainel() {

    var botaoIniciar = document.getElementById('botaoIniciar');
    if (botaoIniciar) { botaoIniciar.addEventListener('click', iniciarTreinamentoPeloPainel); }

    var botaoPausar = document.getElementById('id_botaoPausar');
    if (botaoPausar) { botaoPausar.addEventListener('click', pausarOuRetomarTreinamento); }

    var botaoParar = document.getElementById('id_botaoParar');
    if (botaoParar) { botaoParar.addEventListener('click', pararTreinamento); }

    var botaoTestar = document.getElementById('pintarNeuronio');
    if (botaoTestar) {
        botaoTestar.addEventListener('click', function (evento) {
            evento.preventDefault();
            testarAnimacaoDasConexoes();
        });
    }

    var botaoLimpar = document.getElementById('limparCanvas');
    if (botaoLimpar) {
        botaoLimpar.addEventListener('click', function (evento) {
            evento.preventDefault();
            pararTreinamento();
            if (animadorDaRede) {
                animadorDaRede.parar();
                animadorDaRede.limpar();
                // Apaga o que o treinamento deixou (brilhos, valores, erro) e
                // redesenha a rede em repouso. Sem isso o painel ficaria preto,
                // sem nenhuma forma de trazer o desenho de volta.
                animadorDaRede.desenharQuadroEstatico();
            }
        });
    }

    var controleVelocidade = document.getElementById('id_velocidadeTreinamento');
    if (controleVelocidade) {
        controleVelocidade.addEventListener('input', aplicarVelocidadeDoPainel);
    }

    ligarInterruptor('id_animacaoLigada', function (ligado) {
        if (!animadorDaRede) { return; }
        animadorDaRede.ligado = ligado;
        if (ligado) {
            // Religar so volta a animar se houver algo acontecendo de fato.
            if (animadorDaRede.emTreinamento || animadorDaRede.emDemonstracao) {
                animadorDaRede.iniciar();
            } else {
                animadorDaRede.desenharQuadroEstatico();
            }
        } else {
            animadorDaRede.desenharQuadroEstatico();
        }
    });
    ligarInterruptor('id_mostrarValores', function (ligado) {
        if (!animadorDaRede) { return; }
        animadorDaRede.mostrarValores = ligado;
        redesenharSeEstiverParado();
    });
    ligarInterruptor('id_mostrarPesos', function (ligado) {
        if (!animadorDaRede) { return; }
        animadorDaRede.mostrarPesos = ligado;
        redesenharSeEstiverParado();
    });

    var carregarJson = document.getElementById('idCarregarJson');
    if (carregarJson) { carregarJson.addEventListener('click', abrirArquivoJson); }

    var caixaJson = document.getElementById('idObjetoDeDadosDeEntrada');
    if (caixaJson) {
        // Valida o JSON quando o campo perde o foco, e nao a cada tecla
        // digitada -- antes, um alert() disparava a cada caractere.
        caixaJson.addEventListener('blur', function () {
            var texto = caixaJson.value.trim();
            if (texto === '') { return; }
            try {
                caixaJson.value = JSON.stringify(JSON.parse(texto), null, 4);
                marcarCaixaJson(caixaJson, true);
            } catch (erro) {
                marcarCaixaJson(caixaJson, false);
            }
        });
    }

    // Redesenhar a geometria quando a janela muda de tamanho: as posicoes dos
    // neuronios sao lidas do layout, entao elas mudam junto.
    window.addEventListener('resize', function () {
        if (!animadorDaRede) { return; }
        animadorDaRede.atualizarGeometria();
        // Com a animacao parada nao ha proximo quadro para corrigir o desenho,
        // entao e preciso redesenhar a rede na posicao nova.
        redesenharSeEstiverParado();
    });
}

function marcarCaixaJson(caixa, valido) {
    caixa.style.border = valido ? '1px solid #ccc' : '2px solid #cf3535';
}

function ligarInterruptor(identificador, aoMudar) {
    var elemento = document.getElementById(identificador);
    if (!elemento) { return; }
    elemento.addEventListener('change', function () { aoMudar(!!elemento.checked); });
}

function abrirArquivoJson() {
    var seletor = document.createElement('input');
    seletor.type = 'file';
    seletor.accept = '.json,application/json';
    seletor.onchange = function (evento) {
        var arquivo = evento.target.files && evento.target.files[0];
        if (!arquivo) { return; }
        var leitor = new FileReader();
        leitor.onload = function () {
            var caixa = document.getElementById('idObjetoDeDadosDeEntrada');
            try {
                caixa.value = JSON.stringify(JSON.parse(leitor.result), null, 4);
                marcarCaixaJson(caixa, true);
            } catch (erro) {
                alert('O arquivo escolhido nao contem um JSON valido:\n\n' + erro.message);
            }
        };
        leitor.readAsText(arquivo);
    };
    seletor.click();
}


/* ============================================================================
 *  6) PARTIDA
 * ========================================================================= */

function iniciarPainel() {

    var mostradorEntrada = document.getElementById('entradaQtdeNeuronios');
    var mostradorSaida = document.getElementById('saidaQtdeNeuronios');
    if (mostradorEntrada) { neuroniosNaCamadaDeEntrada = parseInt(mostradorEntrada.textContent, 10) || 3; }
    if (mostradorSaida) { neuroniosNaCamadaDeSaida = parseInt(mostradorSaida.textContent, 10) || 1; }

    qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada = lerArquiteturaDasCamadasEscondidas();

    criandoElementoDeEntradaDeDados();
    funcaoPrincipalDeRenderizacaoDaRedeNeural();
    ligarBotoesDoPainel();
    aplicarVelocidadeDoPainel();
    atualizarBotoesDeControle();
    inicializarGrafico();
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarPainel);
    } else {
        iniciarPainel();
    }
}


/* ============================================================================
 *  EXPORTACAO PARA OS TESTES AUTOMATIZADOS
 * ========================================================================= */
if (typeof module === 'object' && module.exports) {
    module.exports = {
        iniciarPainel: iniciarPainel,
        funcaoPrincipalDeRenderizacaoDaRedeNeural: funcaoPrincipalDeRenderizacaoDaRedeNeural,
        criandoElementoDeEntradaDeDados: criandoElementoDeEntradaDeDados,
        adicionarOuRemoverNeuroniosCamadaDeEntrada: adicionarOuRemoverNeuroniosCamadaDeEntrada,
        adicionarOuRemoverNeuroniosCamadaDeSaida: adicionarOuRemoverNeuroniosCamadaDeSaida,
        adicionarOuRemoverNeuroniosCamadaEscondida: adicionarOuRemoverNeuroniosCamadaEscondida,
        criarComponentesDaCamadaEscondida: criarComponentesDaCamadaEscondida,
        calcularTamanhoDoNeuronio: calcularTamanhoDoNeuronio,
        montarDescricaoDasCamadas: montarDescricaoDasCamadas,
        obterEstadoInterno: function () {
            return {
                entrada: arrayNeuroniosCamadaEntrada,
                escondidas: arrayNeuroniosCamadasEscondidas,
                saida: arrayNeuroniosCamadaSaida,
                idsEntradaDeDados: arrayIdsIputsDeEntradaDadosParaTreinamentos,
                idsSaidaDeDados: arrayIdsIputsDeDadosDaSaidaReal,
                arquiteturaEscondida: qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada,
                animador: animadorDaRede
            };
        }
    };
}
