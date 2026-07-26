/*
 * ============================================================================
 *  funcoes_auxiliares.js
 * ----------------------------------------------------------------------------
 *  Ferramentas de uso geral do painel: geometria, leitura de coordenadas e
 *  pequenas conversoes de texto.
 *
 *  NOTA SOBRE O QUE SAIU DAQUI:
 *    As antigas funcoes de desenho no canvas (canvasCriandoSetas, mudarCorSeta
 *    e responsavelPorAnimarAsInteracoesDosNeuroniosDaRedeRNA) foram removidas.
 *    Elas redesenhavam o canvas INTEIRO a cada seta que mudava de cor -- com N
 *    conexoes isso custava N x N redesenhos -- e calculavam a posicao usando
 *    window.scrollY somado a altura de uma faixa de botoes, o que fazia as
 *    linhas sairem do lugar assim que a pagina era rolada.
 *    O desenho e a animacao agora vivem em animacao_rede_neural.js.
 *
 *  JavaScript puro, sem nenhuma biblioteca.
 * ============================================================================
 */

'use strict';

/* ============================================================================
 *  1) COORDENADAS
 * ========================================================================= */

/**
 * Devolve a posicao e o tamanho de um elemento EM RELACAO A JANELA.
 * Aceita tanto o id (string) quanto o proprio elemento.
 */
function pegandoCoordenada_e_dimenssoes_do_componente(elementoOuId) {

    var elemento = (typeof elementoOuId === 'string')
        ? document.getElementById(elementoOuId)
        : elementoOuId;

    if (!elemento || typeof elemento.getBoundingClientRect !== 'function') {
        return null;
    }

    var retangulo = elemento.getBoundingClientRect();
    return {
        coordenadaX: retangulo.left,
        coordenadaY: retangulo.top,
        largura: retangulo.width,
        altura: retangulo.height,
        centroX: retangulo.left + retangulo.width / 2,
        centroY: retangulo.top + retangulo.height / 2
    };
}

/**
 * Converte a posicao de um elemento para coordenadas DENTRO de um canvas.
 *
 * Esta e a conta correta e a razao de todo o desalinhamento antigo ter sumido:
 * como os dois retangulos vem do mesmo referencial (a janela), basta subtrair
 * um do outro. Nao ha scroll, margem nem altura de barra para compensar.
 */
function converterPosicaoParaCoordenadasDoCanvas(elementoOuId, canvas) {

    var posicaoElemento = pegandoCoordenada_e_dimenssoes_do_componente(elementoOuId);
    var posicaoCanvas = pegandoCoordenada_e_dimenssoes_do_componente(canvas);

    if (!posicaoElemento || !posicaoCanvas) { return null; }

    return {
        x: posicaoElemento.centroX - posicaoCanvas.coordenadaX,
        y: posicaoElemento.centroY - posicaoCanvas.coordenadaY,
        raio: Math.max(posicaoElemento.largura, posicaoElemento.altura) / 2
    };
}

/** Posiciona um elemento ao lado de outro, com um deslocamento. */
function setPositionEntreDoisComponente2(alvo, referencia, deslocamentoX, deslocamentoY) {
    if (!alvo || !referencia) { return; }
    var retangulo = referencia.getBoundingClientRect();
    alvo.style.left = (retangulo.left - deslocamentoX) + 'px';
    alvo.style.top = (retangulo.top - deslocamentoY) + 'px';
}


/* ============================================================================
 *  2) GEOMETRIA (usada para posicionar e medir os fios)
 * ========================================================================= */

/** Angulo em graus da reta que vai de (x1, y1) ate (x2, y2). */
function calcularAnguloReta(xInicial, yInicial, xFinal, yFinal) {
    return Math.atan2(yFinal - yInicial, xFinal - xInicial) * 180 / Math.PI;
}

/** Comprimento da reta (Teorema de Pitagoras). */
function calcularComprimentoReta(xInicial, yInicial, xFinal, yFinal) {
    var deltaX = xFinal - xInicial;
    var deltaY = yFinal - yInicial;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

/** Ponto que fica na fracao t (0 a 1) do caminho entre dois pontos. */
function pontoNaReta(xInicial, yInicial, xFinal, yFinal, t) {
    return {
        x: xInicial + (xFinal - xInicial) * t,
        y: yInicial + (yFinal - yInicial) * t
    };
}


/* ============================================================================
 *  3) TEXTO E DADOS
 * ========================================================================= */

/**
 * Extrai os nomes das colunas de uma lista de objetos JSON, sem repetir.
 * A ordem das colunas importa: as ULTIMAS viram as saidas da rede.
 */
function extrairNomesChavesArrayDeJson(listaDeObjetos) {

    if (!Array.isArray(listaDeObjetos)) { return []; }

    var nomes = [];
    var jaVistos = {};

    listaDeObjetos.forEach(function (objeto) {
        if (!objeto || typeof objeto !== 'object') { return; }
        Object.keys(objeto).forEach(function (chave) {
            if (!jaVistos[chave]) {
                jaVistos[chave] = true;
                nomes.push(chave);
            }
        });
    });

    return nomes;
}

/**
 * "NotaProvaPorcentagem" -> "Nota Prova Porcentagem".
 *
 * A versao anterior quebrava com um erro quando o texto nao tinha nenhuma letra
 * minuscula (ex.: "ID" ou "2024"), porque String.match devolve null e o codigo
 * chamava .join() em cima do null.
 */
function separarPalavrasCamelCase(texto) {

    if (texto === null || texto === undefined) { return ''; }

    var comInicialMaiuscula = String(texto).charAt(0).toUpperCase() + String(texto).slice(1);
    var palavras = comInicialMaiuscula.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g);

    return palavras ? palavras.join(' ') : comInicialMaiuscula;
}

/** Remove itens repetidos de um array, preservando a ordem. */
function removeItensDuplicadosEmArrays(array) {
    return Array.isArray(array) ? array.filter(function (item, indice) {
        return array.indexOf(item) === indice;
    }) : [];
}

/** Cria um array com N arrays vazios dentro. */
function criarMatrizMultiDimenssional(tamanho) {
    var matriz = [];
    for (var i = 0; i < tamanho; i++) { matriz.push([]); }
    return matriz;
}

/** Ultimo elemento de um array (undefined se estiver vazio). */
function obterUltimoValor(array) {
    return (Array.isArray(array) && array.length) ? array[array.length - 1] : undefined;
}

/** Diz se a variavel e um array, um objeto ou um tipo primitivo. */
function tipoDeDado(variavel) {
    if (Array.isArray(variavel)) { return 'array'; }
    if (variavel === null) { return 'nulo'; }
    if (typeof variavel === 'object') { return 'objeto'; }
    return typeof variavel;
}


/* ============================================================================
 *  EXPORTACAO PARA OS TESTES AUTOMATIZADOS
 * ========================================================================= */
if (typeof module === 'object' && module.exports) {
    module.exports = {
        pegandoCoordenada_e_dimenssoes_do_componente: pegandoCoordenada_e_dimenssoes_do_componente,
        converterPosicaoParaCoordenadasDoCanvas: converterPosicaoParaCoordenadasDoCanvas,
        setPositionEntreDoisComponente2: setPositionEntreDoisComponente2,
        calcularAnguloReta: calcularAnguloReta,
        calcularComprimentoReta: calcularComprimentoReta,
        pontoNaReta: pontoNaReta,
        extrairNomesChavesArrayDeJson: extrairNomesChavesArrayDeJson,
        separarPalavrasCamelCase: separarPalavrasCamelCase,
        removeItensDuplicadosEmArrays: removeItensDuplicadosEmArrays,
        criarMatrizMultiDimenssional: criarMatrizMultiDimenssional,
        obterUltimoValor: obterUltimoValor,
        tipoDeDado: tipoDeDado
    };
}
