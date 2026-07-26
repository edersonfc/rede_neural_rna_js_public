/*
 * ============================================================================
 *  animacao_rede_neural.js
 * ----------------------------------------------------------------------------
 *  Motor de ANIMACAO da rede neural no <canvas id="meuCanvas">.
 *
 *  O que este arquivo desenha, quadro a quadro:
 *    - os FIOS (conexoes), com cor e espessura vindas do peso sinaptico real;
 *    - os PULSOS que viajam pelos fios durante a propagacao para frente;
 *    - os PULSOS de volta (laranja) durante a retropropagacao do erro;
 *    - os NEURONIOS acendendo com brilho proporcional a sua ativacao real;
 *    - o valor numerico dentro de cada neuronio e o peso sobre cada fio;
 *    - um painel (HUD) com epoca, amostra e erro.
 *
 *  Os numeros NAO sao inventados: vem do motor_rede_neural.js a cada passo de
 *  treinamento. A animacao e um raio-X do que a rede esta realmente fazendo.
 *
 *  JavaScript puro, sem nenhuma biblioteca.
 * ============================================================================
 */

(function (raizGlobal, fabrica) {

    var api = fabrica();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (raizGlobal) {
        raizGlobal.AnimadorRedeNeural = api.AnimadorRedeNeural;
        raizGlobal.AnimacaoRedeNeural = api;
    }

})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function () {

    'use strict';

    /* ========================================================================
     *  PALETA DE CORES
     * ===================================================================== */
    var CORES = {
        fioPositivo: [90, 170, 255],    // azul  = peso positivo (estimula)
        fioNegativo: [255, 105, 120],   // rosa  = peso negativo (inibe)
        pulsoFrente: [165, 255, 61],    // verde = sinal indo para frente
        pulsoTras: [255, 154, 61],      // laranja = erro voltando
        neuronioBaseA: '#4623CB',
        neuronioBaseB: '#8531EC',
        neuronioAceso: '#a5d817',
        neuronioErro: '#ff9a3d',
        textoClaro: '#d8e6f2',
        textoApagado: 'rgba(216, 230, 242, 0.55)'
    };

    // Fatias do ciclo da animacao (0 = inicio do ciclo, 1 = fim).
    var JANELA_FRENTE_INICIO = 0.00;
    var JANELA_FRENTE_FIM = 0.55;
    var JANELA_TRAS_INICIO = 0.62;
    var JANELA_TRAS_FIM = 1.00;

    // Limite de pulsos desenhados por quadro. Acima disso a animacao passa a
    // sortear um subconjunto dos fios, senao a tela vira uma mancha e trava.
    var MAXIMO_PULSOS_POR_QUADRO = 260;


    /* ========================================================================
     *  FUNCOES AUXILIARES DE DESENHO
     * ===================================================================== */

    function rgba(corRGB, alfa) {
        return 'rgba(' + corRGB[0] + ',' + corRGB[1] + ',' + corRGB[2] + ',' + alfa.toFixed(3) + ')';
    }

    /** Prende um numero dentro de [minimo, maximo]. */
    function limitar(valor, minimo, maximo) {
        if (!Number.isFinite(valor)) { return minimo; }
        return valor < minimo ? minimo : (valor > maximo ? maximo : valor);
    }

    /** Suaviza a transicao 0->1 (curva S). Deixa o movimento menos robotico. */
    function suavizar(t) {
        t = limitar(t, 0, 1);
        return t * t * (3 - 2 * t);
    }

    /** Formata um numero para caber dentro do circulo do neuronio. */
    function formatarCompacto(valor) {
        if (!Number.isFinite(valor)) { return '--'; }
        var absoluto = Math.abs(valor);
        if (absoluto >= 1000) { return valor.toExponential(0); }
        if (absoluto >= 100) { return valor.toFixed(0); }
        if (absoluto >= 10) { return valor.toFixed(1); }
        return valor.toFixed(2);
    }


    /* ========================================================================
     *  CONSTRUTOR DO ANIMADOR
     * ------------------------------------------------------------------------
     *  opcoes = {
     *      canvas          : elemento <canvas> onde tudo e desenhado,
     *      obterGeometria  : funcao que devolve a posicao de cada neuronio,
     *      obterRede       : funcao que devolve a rede do motor (para os pesos)
     *  }
     * ===================================================================== */
    function AnimadorRedeNeural(opcoes) {

        opcoes = opcoes || {};

        this.canvas = opcoes.canvas || null;
        this.obterGeometria = opcoes.obterGeometria || function () { return null; };
        this.obterRede = opcoes.obterRede || function () { return null; };

        this.contexto = null;
        this.geometria = null;

        // Estado da animacao
        this.ligado = true;
        this.rodando = false;
        this.identificadorQuadro = null;
        this.instanteAnterior = 0;

        this.fase = 0;                 // posicao dentro do ciclo atual: 0 -> 1
        this.duracaoCiclo = 1100;      // milissegundos de um ciclo frente+tras
        this.passoAtual = null;        // dados do ultimo passo de treinamento
        this.filaDePassos = [];        // passos aguardando para serem animados
        this.emTreinamento = false;

        // Opcoes visuais (ligadas/desligadas pelo painel)
        this.mostrarValores = true;
        this.mostrarPesos = false;

        // Brilho residual de cada neuronio, para o aceso "apagar" devagar.
        this.brilhoPorNeuronio = {};
        // Ondas circulares que saem do neuronio quando ele dispara.
        this.ondas = [];

        this.informacao = { epoca: 0, totalEpocas: 0, amostra: 0, totalAmostras: 0, erro: null };

        if (this.canvas && typeof this.canvas.getContext === 'function') {
            this.contexto = this.canvas.getContext('2d');
        }
    }


    /* ------------------------------------------------------------------------
     *  Ajusta o canvas a densidade de pixels da tela (telas Retina/4K ficavam
     *  com as linhas borradas porque o canvas nao era escalado pelo devicePixelRatio).
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.ajustarResolucao = function () {

        if (!this.canvas || !this.contexto) { return; }

        // O tamanho vem do CSS (o canvas ocupa 100% do container). Medimos o
        // container, e nao o proprio canvas: se lessemos o canvas e depois
        // fixassemos a largura dele em pixels, ele nunca mais conseguiria
        // encolher quando a janela diminuisse.
        var pai = this.canvas.parentNode;
        var larguraCss = (pai && pai.clientWidth) || this.canvas.clientWidth ||
            parseInt(this.canvas.getAttribute('width'), 10) || 600;
        var alturaCss = (pai && pai.clientHeight) || this.canvas.clientHeight ||
            parseInt(this.canvas.getAttribute('height'), 10) || 280;

        var densidade = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

        this.larguraLogica = larguraCss;
        this.alturaLogica = alturaCss;

        // O canvas guarda mais pixels do que ocupa na tela (densidade), senao as
        // linhas finas ficam borradas em telas Retina/4K.
        var larguraFisica = Math.round(larguraCss * densidade);
        var alturaFisica = Math.round(alturaCss * densidade);

        if (this.canvas.width !== larguraFisica || this.canvas.height !== alturaFisica) {
            this.canvas.width = larguraFisica;
            this.canvas.height = alturaFisica;
        }

        this.contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
    };


    /* ------------------------------------------------------------------------
     *  Recarrega a geometria (posicao dos neuronios) e limpa o estado visual.
     *  Deve ser chamado sempre que a arquitetura da rede muda no painel.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.atualizarGeometria = function () {
        this.geometria = this.obterGeometria();
        this.brilhoPorNeuronio = {};
        this.ondas = [];
        this.ajustarResolucao();
        return this.geometria;
    };


    /* ========================================================================
     *  CICLO DE VIDA DA ANIMACAO
     * ===================================================================== */

    AnimadorRedeNeural.prototype.iniciar = function () {
        if (this.rodando || !this.contexto) { return; }
        this.rodando = true;
        this.instanteAnterior = 0;
        this.agendarProximoQuadro();
    };

    AnimadorRedeNeural.prototype.parar = function () {
        this.rodando = false;
        if (this.identificadorQuadro !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.identificadorQuadro);
        }
        this.identificadorQuadro = null;
    };

    AnimadorRedeNeural.prototype.agendarProximoQuadro = function () {
        var animador = this;
        if (!this.rodando) { return; }
        if (typeof requestAnimationFrame === 'function') {
            this.identificadorQuadro = requestAnimationFrame(function (instante) {
                animador.aoQuadro(instante);
            });
        } else {
            // Ambiente sem requestAnimationFrame (por exemplo, os testes).
            this.identificadorQuadro = setTimeout(function () { animador.aoQuadro(Date.now()); }, 16);
        }
    };

    AnimadorRedeNeural.prototype.aoQuadro = function (instante) {

        if (!this.rodando) { return; }

        var decorrido = this.instanteAnterior ? (instante - this.instanteAnterior) : 16;
        this.instanteAnterior = instante;
        // Se a aba ficou em segundo plano, o salto de tempo pode ser enorme.
        decorrido = limitar(decorrido, 0, 100);

        this.avancar(decorrido);
        this.desenhar();
        this.agendarProximoQuadro();
    };


    /* ------------------------------------------------------------------------
     *  Avanca o relogio interno da animacao.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.avancar = function (milissegundos) {

        var incremento = milissegundos / Math.max(this.duracaoCiclo, 60);
        this.fase += incremento;

        // Terminou um ciclo: pega o proximo passo de treinamento da fila.
        while (this.fase >= 1) {
            this.fase -= 1;
            this.consumirProximoPasso();
        }

        // O brilho de cada neuronio decai suavemente ate apagar.
        var fatorDecaimento = Math.pow(0.001, milissegundos / 700);
        for (var identificador in this.brilhoPorNeuronio) {
            if (!Object.prototype.hasOwnProperty.call(this.brilhoPorNeuronio, identificador)) { continue; }
            this.brilhoPorNeuronio[identificador] *= fatorDecaimento;
            if (this.brilhoPorNeuronio[identificador] < 0.005) {
                delete this.brilhoPorNeuronio[identificador];
            }
        }

        // As ondas circulares crescem e somem.
        for (var i = this.ondas.length - 1; i >= 0; i--) {
            this.ondas[i].idade += milissegundos;
            if (this.ondas[i].idade > this.ondas[i].duracao) {
                this.ondas.splice(i, 1);
            }
        }
    };

    AnimadorRedeNeural.prototype.consumirProximoPasso = function () {
        if (this.filaDePassos.length > 0) {
            // Se o treino esta mais rapido que a animacao, descarta os passos
            // atrasados e mostra sempre o mais recente: e o que interessa ver.
            this.passoAtual = this.filaDePassos.pop();
            this.filaDePassos.length = 0;
        }
    };


    /* ------------------------------------------------------------------------
     *  Recebe do treinamento os numeros de UM passo (uma amostra).
     *  passo = { ativacoes, deltas, saida, alvos, erro, epoca, amostra, ... }
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.registrarPasso = function (passo) {
        if (!passo) { return; }
        this.emTreinamento = true;
        this.informacao = {
            epoca: passo.epoca || 0,
            totalEpocas: passo.totalEpocas || 0,
            amostra: passo.amostra || 0,
            totalAmostras: passo.totalAmostras || 0,
            erro: Number.isFinite(passo.erro) ? passo.erro : null
        };
        this.filaDePassos.push(passo);
        if (this.filaDePassos.length > 3) {
            this.filaDePassos.splice(0, this.filaDePassos.length - 3);
        }
        if (!this.passoAtual) { this.consumirProximoPasso(); }
    };

    AnimadorRedeNeural.prototype.encerrarTreinamento = function () {
        this.emTreinamento = false;
    };

    AnimadorRedeNeural.prototype.limpar = function () {
        this.passoAtual = null;
        this.filaDePassos = [];
        this.brilhoPorNeuronio = {};
        this.ondas = [];
        this.emTreinamento = false;
        this.informacao = { epoca: 0, totalEpocas: 0, amostra: 0, totalAmostras: 0, erro: null };
        if (this.contexto && this.canvas) {
            this.contexto.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    };

    AnimadorRedeNeural.prototype.definirVelocidade = function (duracaoCicloEmMs) {
        this.duracaoCiclo = limitar(duracaoCicloEmMs, 120, 6000);
    };


    /* ========================================================================
     *  CALCULO DAS ONDAS
     * ------------------------------------------------------------------------
     *  O ciclo e dividido em SEGMENTOS. Cada segmento e uma "pernada" do sinal:
     *
     *      [dados] -> entrada -> escondida1 -> ... -> saida -> [resultado]
     *         seg0      seg1        seg2                seg N
     *
     *  A onda de ida percorre os segmentos da esquerda para a direita dentro da
     *  janela de tempo da propagacao. A onda de volta percorre no sentido
     *  contrario dentro da janela da retropropagacao.
     *
     *  Devolve, para cada segmento, o quanto ele esta "aceso" agora (0 a 1) e a
     *  posicao do pulso dentro dele.
     * ===================================================================== */
    AnimadorRedeNeural.prototype.calcularProgressoDosSegmentos = function (quantidadeSegmentos, inicioJanela, fimJanela, inverter) {

        var progresso = [];
        var duracaoJanela = fimJanela - inicioJanela;
        var faseLocal = (this.fase - inicioJanela) / duracaoJanela;

        if (faseLocal < 0 || faseLocal > 1) {
            for (var vazio = 0; vazio < quantidadeSegmentos; vazio++) {
                progresso.push({ ativo: false, posicao: 0, intensidade: 0 });
            }
            return progresso;
        }

        // Os segmentos se sobrepoem um pouco (fator 1.35) para o movimento
        // parecer continuo em vez de dar "solavancos" a cada camada.
        var duracaoSegmento = 1 / quantidadeSegmentos;
        var duracaoEsticada = duracaoSegmento * 1.35;

        for (var s = 0; s < quantidadeSegmentos; s++) {
            var indiceNaOrdem = inverter ? (quantidadeSegmentos - 1 - s) : s;
            var inicio = indiceNaOrdem * duracaoSegmento;
            var posicaoBruta = (faseLocal - inicio) / duracaoEsticada;

            if (posicaoBruta >= 0 && posicaoBruta <= 1) {
                progresso.push({
                    ativo: true,
                    posicao: suavizar(posicaoBruta),
                    // Intensidade sobe rapido e cai no fim: parece um pulso.
                    intensidade: Math.sin(posicaoBruta * Math.PI)
                });
            } else {
                progresso.push({ ativo: false, posicao: 0, intensidade: 0 });
            }
        }

        return progresso;
    };


    /* ========================================================================
     *  DESENHO DE UM QUADRO
     * ===================================================================== */
    AnimadorRedeNeural.prototype.desenhar = function () {

        if (!this.contexto) { return; }
        if (!this.geometria) { this.atualizarGeometria(); }

        var ctx = this.contexto;
        var geometria = this.geometria;

        ctx.clearRect(0, 0, this.larguraLogica || 600, this.alturaLogica || 280);

        if (!geometria || !geometria.camadas || geometria.camadas.length === 0) { return; }

        var rede = this.obterRede();
        var quantidadeCamadas = geometria.camadas.length;
        // Segmentos = entrada de dados + (camadas - 1) ligacoes + saida final.
        var quantidadeSegmentos = quantidadeCamadas + 1;

        var ondaFrente = this.ligado
            ? this.calcularProgressoDosSegmentos(quantidadeSegmentos, JANELA_FRENTE_INICIO, JANELA_FRENTE_FIM, false)
            : [];
        var ondaTras = (this.ligado && this.emTreinamento)
            ? this.calcularProgressoDosSegmentos(quantidadeSegmentos, JANELA_TRAS_INICIO, JANELA_TRAS_FIM, true)
            : [];

        this.desenharFiosEPulsos(ctx, geometria, rede, ondaFrente, ondaTras);
        this.desenharPontasDeEntradaESaida(ctx, geometria, ondaFrente, ondaTras);
        this.desenharOndasCirculares(ctx);
        this.desenharNeuronios(ctx, geometria, ondaFrente);
        this.desenharRotulosDasCamadas(ctx, geometria);
        this.desenharPainelDeInformacao(ctx);
    };


    /* ------------------------------------------------------------------------
     *  Nome e tamanho de cada camada, escritos embaixo da coluna. Ajuda quem
     *  esta aprendendo a nao se perder em qual coluna e qual.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.desenharRotulosDasCamadas = function (ctx, geometria) {

        var altura = this.alturaLogica || 280;
        ctx.font = '9px Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        for (var c = 0; c < geometria.camadas.length; c++) {
            var camada = geometria.camadas[c];
            if (!camada.neuronios.length) { continue; }

            var somaX = 0;
            for (var n = 0; n < camada.neuronios.length; n++) { somaX += camada.neuronios[n].x; }
            var centroX = somaX / camada.neuronios.length;

            ctx.fillStyle = CORES.textoApagado;
            ctx.fillText((camada.rotulo || camada.tipo) + ' (' + camada.neuronios.length + ')', centroX, altura - 20);
        }
    };


    /* ------------------------------------------------------------------------
     *  FIOS + PULSOS entre as camadas desenhadas.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.desenharFiosEPulsos = function (ctx, geometria, rede, ondaFrente, ondaTras) {

        var animador = this;
        var camadas = geometria.camadas;

        for (var c = 0; c < camadas.length - 1; c++) {

            var origem = camadas[c].neuronios;
            var destino = camadas[c + 1].neuronios;

            // O bloco de pesos correspondente no motor. A camada desenhada 0
            // (entrada) e a camada 1 do motor, entao somamos 1.
            var blocoDePesos = (rede && rede.pesos && rede.pesos[c + 1]) ? rede.pesos[c + 1] : null;
            var maiorPeso = blocoDePesos ? this.maiorAbsoluto(blocoDePesos) : 1;

            // Segmento 0 e a entrada dos dados; as ligacoes entre camadas
            // desenhadas comecam no segmento 1.
            var segmentoFrente = ondaFrente[c + 1] || { ativo: false };
            var segmentoTras = ondaTras[c + 1] || { ativo: false };

            var totalDeFios = origem.length * destino.length;
            var passoDeAmostragem = totalDeFios > MAXIMO_PULSOS_POR_QUADRO
                ? Math.ceil(totalDeFios / MAXIMO_PULSOS_POR_QUADRO)
                : 1;
            var contadorDeFios = 0;

            for (var o = 0; o < origem.length; o++) {
                for (var d = 0; d < destino.length; d++) {

                    var peso = blocoDePesos && blocoDePesos[d] ? blocoDePesos[d][o] : null;
                    var intensidadeDoPeso = (peso !== null && maiorPeso > 0)
                        ? limitar(Math.abs(peso) / maiorPeso, 0, 1)
                        : 0.45;

                    // ---- o fio em si -------------------------------------
                    var corDoFio = (peso === null || peso >= 0) ? CORES.fioPositivo : CORES.fioNegativo;
                    ctx.strokeStyle = rgba(corDoFio, 0.18 + intensidadeDoPeso * 0.5);
                    ctx.lineWidth = 0.6 + intensidadeDoPeso * 2.1;
                    ctx.beginPath();
                    ctx.moveTo(origem[o].x, origem[o].y);
                    ctx.lineTo(destino[d].x, destino[d].y);
                    ctx.stroke();

                    // ---- o peso escrito sobre o fio ----------------------
                    if (this.mostrarPesos && peso !== null && totalDeFios <= 24) {
                        this.desenharRotuloDoPeso(ctx, origem[o], destino[d], peso);
                    }

                    // ---- os pulsos viajando ------------------------------
                    var deveAnimarEsteFio = (contadorDeFios % passoDeAmostragem === 0);
                    contadorDeFios++;
                    if (!deveAnimarEsteFio) { continue; }

                    if (segmentoFrente.ativo) {
                        var forcaDoSinal = this.intensidadeDaAtivacao(c, o);
                        animador.desenharPulso(
                            ctx, origem[o], destino[d], segmentoFrente.posicao,
                            CORES.pulsoFrente,
                            segmentoFrente.intensidade * (0.35 + 0.65 * forcaDoSinal) * (0.4 + 0.6 * intensidadeDoPeso)
                        );
                    }

                    if (segmentoTras.ativo) {
                        var forcaDoErro = this.intensidadeDoDelta(c + 1, d);
                        // No caminho de volta o pulso anda de destino para origem.
                        animador.desenharPulso(
                            ctx, destino[d], origem[o], segmentoTras.posicao,
                            CORES.pulsoTras,
                            segmentoTras.intensidade * (0.3 + 0.7 * forcaDoErro)
                        );
                    }
                }
            }
        }
    };

    AnimadorRedeNeural.prototype.maiorAbsoluto = function (matriz) {
        var maior = 0;
        for (var d = 0; d < matriz.length; d++) {
            for (var o = 0; o < matriz[d].length; o++) {
                var absoluto = Math.abs(matriz[d][o]);
                if (absoluto > maior) { maior = absoluto; }
            }
        }
        return maior || 1;
    };

    /**
     * Desenha um pulso (bolinha luminosa) na posicao t do trecho A->B.
     */
    AnimadorRedeNeural.prototype.desenharPulso = function (ctx, pontoA, pontoB, t, cor, forca) {

        forca = limitar(forca, 0, 1);
        if (forca < 0.03) { return; }

        var x = pontoA.x + (pontoB.x - pontoA.x) * t;
        var y = pontoA.y + (pontoB.y - pontoA.y) * t;
        var raio = 1.6 + forca * 2.9;

        // Rastro curto atras do pulso, para dar sensacao de movimento.
        var tRastro = limitar(t - 0.11, 0, 1);
        var xRastro = pontoA.x + (pontoB.x - pontoA.x) * tRastro;
        var yRastro = pontoA.y + (pontoB.y - pontoA.y) * tRastro;
        ctx.strokeStyle = rgba(cor, forca * 0.45);
        ctx.lineWidth = raio * 0.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xRastro, yRastro);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Halo suave.
        ctx.fillStyle = rgba(cor, forca * 0.22);
        ctx.beginPath();
        ctx.arc(x, y, raio * 2.4, 0, Math.PI * 2);
        ctx.fill();

        // Nucleo brilhante.
        ctx.fillStyle = rgba(cor, limitar(forca + 0.25, 0, 1));
        ctx.beginPath();
        ctx.arc(x, y, raio, 0, Math.PI * 2);
        ctx.fill();
    };

    AnimadorRedeNeural.prototype.desenharRotuloDoPeso = function (ctx, pontoA, pontoB, peso) {
        var meioX = (pontoA.x + pontoB.x) / 2;
        var meioY = (pontoA.y + pontoB.y) / 2;
        var texto = peso.toFixed(2);

        ctx.font = '9px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        var largura = ctx.measureText(texto).width + 6;
        ctx.fillStyle = 'rgba(3, 27, 45, 0.82)';
        ctx.fillRect(meioX - largura / 2, meioY - 6, largura, 12);

        ctx.fillStyle = peso >= 0 ? rgba(CORES.fioPositivo, 0.95) : rgba(CORES.fioNegativo, 0.95);
        ctx.fillText(texto, meioX, meioY);
    };


    /* ------------------------------------------------------------------------
     *  Intensidade (0 a 1) da ativacao de um neuronio desenhado.
     *  camadaDesenhada 0 = camada de entrada  ->  ativacoes[1] no motor.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.intensidadeDaAtivacao = function (camadaDesenhada, indiceNeuronio) {
        var valor = this.valorDaAtivacao(camadaDesenhada, indiceNeuronio);
        if (valor === null) { return 0.55; }
        // A escala nao e conhecida de antemao (ReLU pode passar de 1), entao
        // usamos uma curva que satura suavemente.
        return limitar(Math.abs(valor) / (1 + Math.abs(valor)) * 2, 0, 1);
    };

    AnimadorRedeNeural.prototype.valorDaAtivacao = function (camadaDesenhada, indiceNeuronio) {
        if (!this.passoAtual || !this.passoAtual.ativacoes) { return null; }
        var camada = this.passoAtual.ativacoes[camadaDesenhada + 1];
        if (!camada || !Number.isFinite(camada[indiceNeuronio])) { return null; }
        return camada[indiceNeuronio];
    };

    AnimadorRedeNeural.prototype.intensidadeDoDelta = function (camadaDesenhada, indiceNeuronio) {
        if (!this.passoAtual || !this.passoAtual.deltas) { return 0.5; }
        var camada = this.passoAtual.deltas[camadaDesenhada + 1];
        if (!camada || !Number.isFinite(camada[indiceNeuronio])) { return 0.5; }
        var maior = 0;
        for (var i = 0; i < camada.length; i++) {
            var absoluto = Math.abs(camada[i]);
            if (absoluto > maior) { maior = absoluto; }
        }
        if (maior === 0) { return 0.15; }
        return limitar(Math.abs(camada[indiceNeuronio]) / maior, 0, 1);
    };


    /* ------------------------------------------------------------------------
     *  Pontas: os fios curtos que entram na camada de entrada (os DADOS) e os
     *  que saem da camada de saida (o RESULTADO). Sem eles a animacao comeca
     *  "no meio do nada".
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.desenharPontasDeEntradaESaida = function (ctx, geometria, ondaFrente, ondaTras) {

        var camadas = geometria.camadas;
        var primeira = camadas[0].neuronios;
        var ultima = camadas[camadas.length - 1].neuronios;
        var comprimento = 26;

        var segmentoEntrada = ondaFrente[0] || { ativo: false };
        var segmentoSaida = ondaFrente[camadas.length] || { ativo: false };
        var segmentoTrasSaida = ondaTras[camadas.length] || { ativo: false };

        var i, ponto, inicio, fim;

        for (i = 0; i < primeira.length; i++) {
            ponto = primeira[i];
            inicio = { x: ponto.x - comprimento, y: ponto.y };
            fim = { x: ponto.x, y: ponto.y };
            ctx.strokeStyle = rgba(CORES.fioPositivo, 0.32);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(inicio.x, inicio.y);
            ctx.lineTo(fim.x, fim.y);
            ctx.stroke();
            if (segmentoEntrada.ativo) {
                this.desenharPulso(ctx, inicio, fim, segmentoEntrada.posicao, CORES.pulsoFrente, segmentoEntrada.intensidade);
            }
        }

        for (i = 0; i < ultima.length; i++) {
            ponto = ultima[i];
            inicio = { x: ponto.x, y: ponto.y };
            fim = { x: ponto.x + comprimento, y: ponto.y };
            ctx.strokeStyle = rgba(CORES.fioPositivo, 0.32);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(inicio.x, inicio.y);
            ctx.lineTo(fim.x, fim.y);
            ctx.stroke();
            if (segmentoSaida.ativo) {
                this.desenharPulso(ctx, inicio, fim, segmentoSaida.posicao, CORES.pulsoFrente, segmentoSaida.intensidade);
            }
            if (segmentoTrasSaida.ativo) {
                // O erro nasce aqui: compara previsto x real e volta.
                this.desenharPulso(ctx, fim, inicio, segmentoTrasSaida.posicao, CORES.pulsoTras, segmentoTrasSaida.intensidade);
            }
        }
    };


    /* ------------------------------------------------------------------------
     *  Ondas circulares que saem do neuronio quando ele dispara.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.desenharOndasCirculares = function (ctx) {
        for (var i = 0; i < this.ondas.length; i++) {
            var onda = this.ondas[i];
            var avanco = onda.idade / onda.duracao;
            var raio = onda.raioInicial + avanco * 18;
            ctx.strokeStyle = rgba(onda.cor, (1 - avanco) * 0.5);
            ctx.lineWidth = 1.5 * (1 - avanco) + 0.3;
            ctx.beginPath();
            ctx.arc(onda.x, onda.y, raio, 0, Math.PI * 2);
            ctx.stroke();
        }
    };


    /* ------------------------------------------------------------------------
     *  NEURONIOS: circulo, brilho proporcional a ativacao e valor numerico.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.desenharNeuronios = function (ctx, geometria, ondaFrente) {

        var camadas = geometria.camadas;

        for (var c = 0; c < camadas.length; c++) {

            var neuronios = camadas[c].neuronios;
            // O neuronio acende quando a onda que CHEGA nele passa dos 75%.
            var segmentoQueChega = ondaFrente[c] || { ativo: false, posicao: 0 };
            var chegou = segmentoQueChega.ativo && segmentoQueChega.posicao > 0.75;

            for (var n = 0; n < neuronios.length; n++) {

                var neuronio = neuronios[n];
                var chave = c + ':' + n;
                var forca = this.intensidadeDaAtivacao(c, n);

                if (chegou) {
                    var brilhoAnterior = this.brilhoPorNeuronio[chave] || 0;
                    if (brilhoAnterior < forca) {
                        this.brilhoPorNeuronio[chave] = forca;
                        // Dispara a onda circular apenas na primeira vez.
                        if (brilhoAnterior < 0.02 && this.ondas.length < 60) {
                            this.ondas.push({
                                x: neuronio.x, y: neuronio.y, raioInicial: neuronio.raio,
                                idade: 0, duracao: 520, cor: CORES.pulsoFrente
                            });
                        }
                    }
                }

                var brilho = limitar(this.brilhoPorNeuronio[chave] || 0, 0, 1);
                this.desenharUmNeuronio(ctx, neuronio, brilho, c, n);
            }
        }
    };

    AnimadorRedeNeural.prototype.desenharUmNeuronio = function (ctx, neuronio, brilho, camada, indice) {

        var raio = neuronio.raio;

        // 1) Halo externo proporcional ao brilho.
        if (brilho > 0.02) {
            var halo = ctx.createRadialGradient(neuronio.x, neuronio.y, raio * 0.6, neuronio.x, neuronio.y, raio * 2.6);
            halo.addColorStop(0, rgba(CORES.pulsoFrente, 0.45 * brilho));
            halo.addColorStop(1, rgba(CORES.pulsoFrente, 0));
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(neuronio.x, neuronio.y, raio * 2.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2) Corpo do neuronio: roxo em repouso, indo para o verde quando acende.
        var corpo = ctx.createLinearGradient(neuronio.x - raio, neuronio.y - raio, neuronio.x + raio, neuronio.y + raio);
        if (brilho > 0.02) {
            corpo.addColorStop(0, CORES.neuronioAceso);
            corpo.addColorStop(1, CORES.neuronioBaseB);
        } else {
            corpo.addColorStop(0, CORES.neuronioBaseA);
            corpo.addColorStop(1, CORES.neuronioBaseB);
        }
        ctx.fillStyle = corpo;
        ctx.beginPath();
        ctx.arc(neuronio.x, neuronio.y, raio, 0, Math.PI * 2);
        ctx.fill();

        // 3) Contorno.
        ctx.strokeStyle = brilho > 0.02
            ? 'rgba(255, 255, 160, ' + (0.35 + 0.65 * brilho).toFixed(3) + ')'
            : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(neuronio.x, neuronio.y, raio, 0, Math.PI * 2);
        ctx.stroke();

        // 4) Valor da ativacao dentro do circulo.
        if (this.mostrarValores && raio >= 10) {
            var valor = this.valorDaAtivacao(camada, indice);
            if (valor !== null) {
                ctx.font = 'bold ' + Math.max(8, Math.round(raio * 0.62)) + 'px Consolas, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                ctx.fillText(formatarCompacto(valor), neuronio.x, neuronio.y + 0.8);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(formatarCompacto(valor), neuronio.x, neuronio.y);
            }
        }
    };


    /* ------------------------------------------------------------------------
     *  HUD: epoca, amostra, erro e legenda das cores.
     * --------------------------------------------------------------------- */
    AnimadorRedeNeural.prototype.desenharPainelDeInformacao = function (ctx) {

        var largura = this.larguraLogica || 600;
        var altura = this.alturaLogica || 280;

        ctx.font = '10px Consolas, monospace';
        ctx.textBaseline = 'middle';

        // --- linha de status no topo ---
        if (this.informacao.totalEpocas > 0) {
            var status = 'Epoca ' + this.informacao.epoca + '/' + this.informacao.totalEpocas +
                '   Amostra ' + this.informacao.amostra + '/' + this.informacao.totalAmostras;
            if (this.informacao.erro !== null) {
                status += '   Erro ' + this.informacao.erro.toFixed(5);
            }
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(3, 27, 45, 0.78)';
            ctx.fillRect(6, 5, ctx.measureText(status).width + 12, 16);
            ctx.fillStyle = CORES.textoClaro;
            ctx.fillText(status, 12, 13);
        }

        // --- indicador da fase atual do ciclo ---
        var fase = this.faseAtualEmTexto();
        if (fase) {
            ctx.textAlign = 'right';
            ctx.fillStyle = fase.cor;
            ctx.fillText(fase.texto, largura - 10, 13);
        }

        // --- legenda das cores no rodape ---
        var legendas = [
            { cor: rgba(CORES.pulsoFrente, 0.95), texto: 'sinal ->' },
            { cor: rgba(CORES.pulsoTras, 0.95), texto: 'erro <-' },
            { cor: rgba(CORES.fioPositivo, 0.95), texto: 'peso +' },
            { cor: rgba(CORES.fioNegativo, 0.95), texto: 'peso -' }
        ];
        var x = 10;
        var y = altura - 9;
        ctx.textAlign = 'left';
        for (var i = 0; i < legendas.length; i++) {
            ctx.fillStyle = legendas[i].cor;
            ctx.beginPath();
            ctx.arc(x + 3, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = CORES.textoApagado;
            ctx.fillText(legendas[i].texto, x + 10, y);
            x += 12 + ctx.measureText(legendas[i].texto).width + 12;
        }
    };

    AnimadorRedeNeural.prototype.faseAtualEmTexto = function () {
        if (!this.ligado) { return null; }
        if (this.fase >= JANELA_FRENTE_INICIO && this.fase <= JANELA_FRENTE_FIM) {
            return { texto: 'PROPAGACAO ->', cor: rgba(CORES.pulsoFrente, 0.9) };
        }
        if (this.emTreinamento && this.fase >= JANELA_TRAS_INICIO) {
            return { texto: '<- RETROPROPAGACAO', cor: rgba(CORES.pulsoTras, 0.9) };
        }
        return { texto: 'calculando erro...', cor: CORES.textoApagado };
    };


    /* ========================================================================
     *  LEITOR DE GEOMETRIA A PARTIR DO DOM
     * ------------------------------------------------------------------------
     *  Converte a posicao das divs dos neuronios (que o flexbox posiciona) em
     *  coordenadas RELATIVAS AO CANVAS.
     *
     *  A versao antiga misturava getBoundingClientRect com window.scrollY e com
     *  a altura de uma faixa de botoes, o que fazia as linhas sairem do lugar
     *  assim que a pagina era rolada. Aqui a conta e simples e sempre correta:
     *
     *      x = centroDoNeuronio.left - canvas.left
     *      y = centroDoNeuronio.top  - canvas.top
     *
     *  Como os dois retangulos vem do mesmo referencial (a janela), a diferenca
     *  entre eles ja e a coordenada dentro do canvas -- com ou sem scroll.
     * ===================================================================== */
    function lerGeometriaDoDOM(canvas, camadasDeIds) {

        if (!canvas || typeof canvas.getBoundingClientRect !== 'function') { return null; }

        var retanguloCanvas = canvas.getBoundingClientRect();
        var camadas = [];

        for (var c = 0; c < camadasDeIds.length; c++) {

            var grupo = camadasDeIds[c];
            var neuronios = [];

            for (var n = 0; n < grupo.ids.length; n++) {
                var elemento = document.getElementById(grupo.ids[n]);
                if (!elemento) { continue; }
                var retangulo = elemento.getBoundingClientRect();
                neuronios.push({
                    id: grupo.ids[n],
                    elemento: elemento,
                    x: retangulo.left - retanguloCanvas.left + retangulo.width / 2,
                    y: retangulo.top - retanguloCanvas.top + retangulo.height / 2,
                    raio: Math.max(retangulo.width, retangulo.height) / 2 || 15
                });
            }

            if (neuronios.length > 0) {
                camadas.push({ tipo: grupo.tipo, rotulo: grupo.rotulo, neuronios: neuronios });
            }
        }

        return { camadas: camadas };
    }


    return {
        AnimadorRedeNeural: AnimadorRedeNeural,
        lerGeometriaDoDOM: lerGeometriaDoDOM,
        CORES: CORES,
        // Expostos para os testes automatizados:
        _limitar: limitar,
        _suavizar: suavizar,
        _formatarCompacto: formatarCompacto,
        _rgba: rgba
    };
});
