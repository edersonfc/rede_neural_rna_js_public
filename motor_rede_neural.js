/*
 * ============================================================================
 *  motor_rede_neural.js
 * ----------------------------------------------------------------------------
 *  Motor matematico PURO da Rede Neural Perceptron Multi-Layer.
 *
 *  REGRA DESTE ARQUIVO: aqui NAO existe document, window, canvas nem alert.
 *  So existe matematica. Isso permite:
 *    1) Ensinar a teoria sem o barulho da interface;
 *    2) Rodar os testes automatizados sem precisar de navegador;
 *    3) A animacao do canvas consumir os numeros REAIS do treinamento.
 *
 *  JavaScript puro, sem nenhuma biblioteca.
 * ============================================================================
 */

(function (raizGlobal, fabricaDoMotor) {

    var motor = fabricaDoMotor();

    // No Node (usado pelos testes) exporta pelo module.exports.
    if (typeof module === 'object' && module.exports) {
        module.exports = motor;
    }
    // No navegador publica como uma unica variavel global: MotorRedeNeural.
    if (raizGlobal) {
        raizGlobal.MotorRedeNeural = motor;
    }

})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function () {

    'use strict';

    /* ========================================================================
     *  1) FUNCOES DE ATIVACAO
     * ------------------------------------------------------------------------
     *  A funcao de ativacao e o que da NAO-LINEARIDADE para a rede.
     *  Sem ela, empilhar 10 camadas tem exatamente o mesmo poder de uma unica
     *  camada, porque a composicao de funcoes lineares continua sendo linear.
     *
     *  Cada ativacao tem:
     *    fn(soma)            -> valor de saida do neuronio;
     *    derivada(soma, saida) -> inclinacao naquele ponto, usada no backprop.
     *  A derivada recebe tambem a saida ja calculada porque, para a sigmoide e
     *  a tangente hiperbolica, a conta fica mais barata usando o proprio valor
     *  de saida em vez de recalcular a exponencial.
     * ===================================================================== */
    var ATIVACOES = {

        // Sigmoide: espreme qualquer numero para dentro do intervalo (0, 1).
        sigmoide: {
            rotulo: 'Sigmoide',
            fn: function (soma) { return 1 / (1 + Math.exp(-soma)); },
            derivada: function (soma, saida) { return saida * (1 - saida); }
        },

        // Tangente hiperbolica: espreme para dentro de (-1, 1), centrada em 0.
        tanh: {
            rotulo: 'Tangente Hiperbolica',
            fn: function (soma) { return Math.tanh(soma); },
            derivada: function (soma, saida) { return 1 - saida * saida; }
        },

        // ReLU: deixa passar o positivo e zera o negativo. Rapida e popular.
        relu: {
            rotulo: 'ReLU',
            fn: function (soma) { return soma > 0 ? soma : 0; },
            derivada: function (soma) { return soma > 0 ? 1 : 0; }
        },

        // Leaky ReLU: igual a ReLU, mas deixa um fiozinho passar no negativo,
        // evitando o problema do "neuronio morto" que nunca mais aprende.
        leakyRelu: {
            rotulo: 'Leaky ReLU',
            fn: function (soma) { return soma > 0 ? soma : 0.01 * soma; },
            derivada: function (soma) { return soma > 0 ? 1 : 0.01; }
        },

        // Linear (identidade): nao faz nada. Util na camada de SAIDA quando o
        // problema e de regressao (prever um numero, e nao uma classe).
        linear: {
            rotulo: 'Linear',
            fn: function (soma) { return soma; },
            derivada: function () { return 1; }
        }
    };

    /**
     * Devolve a ativacao pedida pelo nome. Se o nome nao existir, cai na
     * sigmoide em vez de quebrar o treinamento inteiro.
     */
    function obterAtivacao(nome) {
        return ATIVACOES[nome] || ATIVACOES.sigmoide;
    }


    /* ========================================================================
     *  2) GERADOR DE NUMEROS ALEATORIOS COM SEMENTE
     * ------------------------------------------------------------------------
     *  Math.random() nao pode ser repetido. Para os testes automatizados e para
     *  o botao "Reiniciar Pesos" conseguirem reproduzir exatamente o mesmo
     *  treinamento, usamos um gerador proprio com semente (algoritmo mulberry32).
     * ===================================================================== */
    function criarGeradorAleatorio(semente) {
        var estado = (typeof semente === 'number' ? semente : Date.now()) >>> 0;
        return function proximoAleatorio() {
            estado = (estado + 0x6D2B79F5) >>> 0;
            var t = estado;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }


    /* ========================================================================
     *  3) INICIALIZACAO DOS PESOS (GLOROT / XAVIER)
     * ------------------------------------------------------------------------
     *  Se todos os pesos comecarem iguais, todos os neuronios de uma camada
     *  aprendem exatamente a mesma coisa (problema da simetria). Por isso eles
     *  comecam aleatorios. E se comecarem grandes demais, a sigmoide satura e o
     *  gradiente morre. Glorot resolve isso escolhendo o limite do sorteio em
     *  funcao de quantas conexoes entram e saem do neuronio:
     *
     *      limite = raiz( 6 / (entradas + saidas) )
     *      peso   = sorteio uniforme dentro de [-limite, +limite]
     * ===================================================================== */
    function inicializacaoGlorot(quantidadeEntradas, quantidadeSaidas, aleatorio) {
        var limite = Math.sqrt(6 / (quantidadeEntradas + quantidadeSaidas));
        return aleatorio() * 2 * limite - limite;
    }


    /* ========================================================================
     *  4) CRIACAO DA REDE
     * ------------------------------------------------------------------------
     *  A rede e descrita por um vetor de camadas, por exemplo:
     *
     *      camadas = [3, 2, 4, 1]
     *                 |  |  |  |
     *                 |  |  |  +-- camada de saida        : 1 neuronio
     *                 |  |  +----- camada escondida       : 4 neuronios
     *                 |  +-------- camada de entrada      : 2 neuronios
     *                 +----------- dados brutos de entrada: 3 valores
     *
     *  Entre cada par de camadas existe um BLOCO de pesos. Portanto o numero de
     *  blocos e sempre (quantidade de camadas - 1).
     *
     *  Formato dos pesos:  pesos[bloco][neuronioDestino][neuronioOrigem]
     *  Formato dos vieses: vieses[bloco][neuronioDestino]
     * ===================================================================== */
    function criarRede(configuracao) {

        var config = configuracao || {};
        var camadas = config.camadas;

        if (!Array.isArray(camadas) || camadas.length < 2) {
            throw new Error('criarRede: e preciso informar ao menos 2 camadas. Recebido: ' + JSON.stringify(camadas));
        }
        for (var v = 0; v < camadas.length; v++) {
            if (!Number.isFinite(camadas[v]) || camadas[v] < 1) {
                throw new Error('criarRede: a camada de indice ' + v + ' precisa ter pelo menos 1 neuronio.');
            }
        }

        var aleatorio = criarGeradorAleatorio(config.semente);
        var pesos = [];
        var vieses = [];

        for (var bloco = 0; bloco < camadas.length - 1; bloco++) {

            var quantidadeOrigem = camadas[bloco];
            var quantidadeDestino = camadas[bloco + 1];
            var matrizDoBloco = [];
            var viesesDoBloco = [];

            for (var destino = 0; destino < quantidadeDestino; destino++) {
                var linha = [];
                for (var origem = 0; origem < quantidadeOrigem; origem++) {
                    linha.push(inicializacaoGlorot(quantidadeOrigem, quantidadeDestino, aleatorio));
                }
                matrizDoBloco.push(linha);
                // O vies comeca em zero: ele so precisa deslocar a funcao, nao
                // sofre do problema de simetria que os pesos sofrem.
                viesesDoBloco.push(0);
            }

            pesos.push(matrizDoBloco);
            vieses.push(viesesDoBloco);
        }

        return {
            camadas: camadas.slice(),
            pesos: pesos,
            vieses: vieses,
            ativacaoOculta: config.ativacaoOculta || 'sigmoide',
            ativacaoSaida: config.ativacaoSaida || 'linear',
            usarVies: config.usarVies !== false,
            limiteGradiente: Number.isFinite(config.limiteGradiente) ? config.limiteGradiente : 5
        };
    }


    /**
     * Descobre qual ativacao se aplica a um determinado bloco de pesos.
     * O ultimo bloco desemboca na camada de saida, os demais em camadas ocultas.
     */
    function ativacaoDoBloco(rede, indiceBloco) {
        var ehUltimoBloco = (indiceBloco === rede.pesos.length - 1);
        return obterAtivacao(ehUltimoBloco ? rede.ativacaoSaida : rede.ativacaoOculta);
    }


    /* ========================================================================
     *  5) PROPAGACAO PARA FRENTE (FORWARD PASS)
     * ------------------------------------------------------------------------
     *  E o "pensar" da rede. Para cada neuronio de destino:
     *
     *      soma  = vies + SOMATORIO( entrada[i] * peso[destino][i] )
     *      saida = ativacao(soma)
     *
     *  Devolve TODAS as somas e TODAS as ativacoes de TODAS as camadas, porque
     *  o backpropagation precisa desses valores intermediarios -- e porque a
     *  animacao do canvas usa exatamente esses numeros para acender cada
     *  neuronio na intensidade certa.
     * ===================================================================== */
    function propagarParaFrente(rede, entradas) {

        if (!Array.isArray(entradas) || entradas.length !== rede.camadas[0]) {
            throw new Error('propagarParaFrente: esperava ' + rede.camadas[0] +
                ' valores de entrada e recebeu ' + (Array.isArray(entradas) ? entradas.length : typeof entradas) + '.');
        }

        // A camada 0 nao calcula nada: ela SO segura os dados de entrada.
        var ativacoes = [entradas.slice()];
        var somas = [entradas.slice()];

        for (var bloco = 0; bloco < rede.pesos.length; bloco++) {

            var matriz = rede.pesos[bloco];
            var viesesDoBloco = rede.vieses[bloco];
            var ativacao = ativacaoDoBloco(rede, bloco);
            var entradaDaVez = ativacoes[bloco];

            var somasDaCamada = [];
            var ativacoesDaCamada = [];

            for (var destino = 0; destino < matriz.length; destino++) {
                var soma = rede.usarVies ? viesesDoBloco[destino] : 0;
                var linha = matriz[destino];
                for (var origem = 0; origem < linha.length; origem++) {
                    soma += entradaDaVez[origem] * linha[origem];
                }
                somasDaCamada.push(soma);
                ativacoesDaCamada.push(ativacao.fn(soma));
            }

            somas.push(somasDaCamada);
            ativacoes.push(ativacoesDaCamada);
        }

        return {
            somas: somas,
            ativacoes: ativacoes,
            saida: ativacoes[ativacoes.length - 1].slice()
        };
    }


    /* ========================================================================
     *  6) ERRO QUADRATICO MEDIO (MSE)
     * ------------------------------------------------------------------------
     *      MSE = ( 1/n ) * SOMATORIO( (real - previsto)^2 )
     * ===================================================================== */
    function calcularErroMSE(saidaReal, saidaPrevista) {

        if (!Array.isArray(saidaReal) || !Array.isArray(saidaPrevista)) {
            throw new Error('calcularErroMSE: as entradas precisam ser arrays.');
        }
        if (saidaReal.length === 0 || saidaReal.length !== saidaPrevista.length) {
            throw new Error('calcularErroMSE: entradas invalidas - os arrays devem ter o mesmo tamanho e nao podem estar vazios.');
        }

        var somaDosQuadrados = 0;
        for (var i = 0; i < saidaReal.length; i++) {
            var diferenca = saidaReal[i] - saidaPrevista[i];
            somaDosQuadrados += diferenca * diferenca;
        }

        var mse = somaDosQuadrados / saidaReal.length;
        if (!Number.isFinite(mse)) {
            throw new Error('calcularErroMSE: resultado invalido (NaN ou Infinito). Confira os dados de entrada.');
        }
        return mse;
    }


    /* ========================================================================
     *  7) RETROPROPAGACAO (BACKPROPAGATION)
     * ------------------------------------------------------------------------
     *  Aqui mora a REGRA DA CADEIA, o coracao do aprendizado.
     *
     *  Camada de SAIDA:
     *      delta[j] = dErro/dSaida[j] * derivadaAtivacao(soma[j])
     *      onde, para o MSE,  dErro/dSaida[j] = (2/n) * (previsto[j] - real[j])
     *
     *  Camadas ESCONDIDAS (o erro volta "diluido" pelos pesos):
     *      delta[i] = ( SOMATORIO_j  delta[j] * peso[j][i] ) * derivadaAtivacao(soma[i])
     *
     *  Gradiente de cada peso e de cada vies:
     *      dErro/dPeso[j][i] = delta[j] * ativacaoAnterior[i]
     *      dErro/dVies[j]    = delta[j]
     * ===================================================================== */
    function retropropagar(rede, resultadoDoForward, alvos) {

        var ativacoes = resultadoDoForward.ativacoes;
        var somas = resultadoDoForward.somas;
        var quantidadeBlocos = rede.pesos.length;
        var indiceUltimaCamada = ativacoes.length - 1;
        var saidaPrevista = ativacoes[indiceUltimaCamada];

        if (!Array.isArray(alvos) || alvos.length !== saidaPrevista.length) {
            throw new Error('retropropagar: esperava ' + saidaPrevista.length +
                ' valores esperados e recebeu ' + (Array.isArray(alvos) ? alvos.length : typeof alvos) + '.');
        }

        var deltasPorCamada = new Array(ativacoes.length);
        var gradientesPesos = new Array(quantidadeBlocos);
        var gradientesVieses = new Array(quantidadeBlocos);

        // ---- Passo A: delta da camada de saida ----------------------------
        var ativacaoSaida = obterAtivacao(rede.ativacaoSaida);
        var quantidadeSaidas = saidaPrevista.length;
        var deltasDaSaida = [];
        for (var j = 0; j < quantidadeSaidas; j++) {
            var derivadaDoErro = (2 / quantidadeSaidas) * (saidaPrevista[j] - alvos[j]);
            deltasDaSaida.push(derivadaDoErro * ativacaoSaida.derivada(somas[indiceUltimaCamada][j], saidaPrevista[j]));
        }
        deltasPorCamada[indiceUltimaCamada] = deltasDaSaida;

        // ---- Passo B: volta camada por camada, da direita para a esquerda --
        for (var bloco = quantidadeBlocos - 1; bloco >= 0; bloco--) {

            var matriz = rede.pesos[bloco];
            var deltasDestino = deltasPorCamada[bloco + 1];
            var ativacoesOrigem = ativacoes[bloco];

            // B.1 - gradientes dos pesos e vieses deste bloco.
            var gradientesDoBloco = [];
            var gradientesViesDoBloco = [];
            for (var d = 0; d < matriz.length; d++) {
                var linhaGradiente = [];
                for (var o = 0; o < matriz[d].length; o++) {
                    linhaGradiente.push(deltasDestino[d] * ativacoesOrigem[o]);
                }
                gradientesDoBloco.push(linhaGradiente);
                gradientesViesDoBloco.push(deltasDestino[d]);
            }
            gradientesPesos[bloco] = gradientesDoBloco;
            gradientesVieses[bloco] = gradientesViesDoBloco;

            // B.2 - delta da camada anterior (nao se calcula para a camada 0,
            //       que e apenas o dado bruto e nao tem ativacao para derivar).
            if (bloco > 0) {
                var ativacaoAnterior = ativacaoDoBloco(rede, bloco - 1);
                var deltasOrigem = [];
                for (var i = 0; i < ativacoesOrigem.length; i++) {
                    var erroAcumulado = 0;
                    for (var k = 0; k < matriz.length; k++) {
                        erroAcumulado += deltasDestino[k] * matriz[k][i];
                    }
                    deltasOrigem.push(erroAcumulado * ativacaoAnterior.derivada(somas[bloco][i], ativacoesOrigem[i]));
                }
                deltasPorCamada[bloco] = deltasOrigem;
            } else {
                deltasPorCamada[0] = ativacoesOrigem.map(function () { return 0; });
            }
        }

        return {
            deltas: deltasPorCamada,
            gradientesPesos: gradientesPesos,
            gradientesVieses: gradientesVieses
        };
    }


    /* ========================================================================
     *  8) ATUALIZACAO DOS PESOS COM REGULARIZACAO L2
     * ------------------------------------------------------------------------
     *      novoPeso = pesoAtual - taxaAprendizagem * ( gradiente + lambda * pesoAtual )
     *
     *  O termo "lambda * pesoAtual" e a regularizacao L2: ele empurra os pesos
     *  na direcao do zero a cada passo, o que desestimula a rede a decorar os
     *  dados de treino (overfitting).
     *
     *  O vies NAO recebe regularizacao -- ele nao contribui para o overfitting
     *  da mesma forma que os pesos, e penaliza-lo so atrapalha o ajuste.
     * ===================================================================== */
    function atualizarPesoRegularizacaoL2(pesoAtual, gradiente, taxaDeAprendizagem, lambda) {
        var termoRegularizacao = lambda * pesoAtual;
        return pesoAtual - taxaDeAprendizagem * (gradiente + termoRegularizacao);
    }

    /**
     * Limita o gradiente a uma faixa (gradient clipping). Sem isso, uma taxa de
     * aprendizagem alta faz o gradiente explodir para Infinity/NaN e o painel
     * inteiro passa a mostrar "NaN" para sempre.
     */
    function limitarGradiente(valor, limite) {
        // NaN nao tem direcao nenhuma: o unico valor seguro e nao mexer no peso.
        if (Number.isNaN(valor) || valor === undefined || valor === null) { return 0; }
        if (!Number.isFinite(limite) || limite <= 0) { return Number.isFinite(valor) ? valor : 0; }
        // Infinito TEM direcao: vale prende-lo no limite, preservando o sentido
        // da correcao, em vez de zerar e travar o aprendizado daquele peso.
        if (valor > limite) { return limite; }
        if (valor < -limite) { return -limite; }
        return valor;
    }

    function atualizarPesos(rede, gradientes, taxaDeAprendizagem, lambda) {

        var limite = rede.limiteGradiente;

        for (var bloco = 0; bloco < rede.pesos.length; bloco++) {
            var matriz = rede.pesos[bloco];
            var gradientesDoBloco = gradientes.gradientesPesos[bloco];

            for (var d = 0; d < matriz.length; d++) {
                for (var o = 0; o < matriz[d].length; o++) {
                    var gradiente = limitarGradiente(gradientesDoBloco[d][o], limite);
                    matriz[d][o] = atualizarPesoRegularizacaoL2(matriz[d][o], gradiente, taxaDeAprendizagem, lambda);
                }
                if (rede.usarVies) {
                    var gradienteVies = limitarGradiente(gradientes.gradientesVieses[bloco][d], limite);
                    rede.vieses[bloco][d] = rede.vieses[bloco][d] - taxaDeAprendizagem * gradienteVies;
                }
            }
        }
        return rede;
    }


    /* ========================================================================
     *  9) UM PASSO COMPLETO DE TREINAMENTO
     * ------------------------------------------------------------------------
     *  Frente -> mede o erro -> volta -> corrige os pesos.
     *  Este e o "tijolo" que a interface repete milhares de vezes, e e tambem
     *  o objeto que a animacao do canvas recebe para desenhar cada onda.
     * ===================================================================== */
    function treinarUmPasso(rede, entradas, alvos, taxaDeAprendizagem, lambda) {

        var frente = propagarParaFrente(rede, entradas);
        var erro = calcularErroMSE(alvos, frente.saida);
        var tras = retropropagar(rede, frente, alvos);

        atualizarPesos(rede, tras, taxaDeAprendizagem, lambda);

        return {
            ativacoes: frente.ativacoes,
            somas: frente.somas,
            saida: frente.saida,
            alvos: alvos.slice(),
            deltas: tras.deltas,
            gradientesPesos: tras.gradientesPesos,
            erro: erro
        };
    }


    /* ========================================================================
     * 10) NORMALIZACAO DOS DADOS
     * ------------------------------------------------------------------------
     *  Uma rede neural nao lida bem com escalas misturadas. Se uma coluna vai
     *  de 0 a 100 e outra de 0 a 1, a primeira domina o aprendizado. Por isso
     *  colocamos TODAS as colunas na mesma faixa [0, 1] com min-max:
     *
     *      normalizado = (valor - minimo) / (maximo - minimo)
     *
     *  E, no fim, desfazemos a conta para mostrar o resultado na unidade
     *  original que o usuario entende.
     * ===================================================================== */

    /**
     * Converte colunas de TEXTO em numeros de forma DETERMINISTICA.
     * (A versao antiga sorteava um numero aleatorio para cada texto, o que fazia
     *  o mesmo texto virar um numero diferente a cada execucao e podia dar o
     *  mesmo numero para textos diferentes.)
     */
    function mapearTextosParaNumeros(amostras) {

        var mapeamentos = {};
        var i, chave;

        for (i = 0; i < amostras.length; i++) {
            for (chave in amostras[i]) {
                if (Object.prototype.hasOwnProperty.call(amostras[i], chave) && typeof amostras[i][chave] === 'string') {
                    if (!mapeamentos[chave]) { mapeamentos[chave] = {}; }
                    if (!(amostras[i][chave] in mapeamentos[chave])) {
                        // Numera na ordem em que o texto aparece: 0, 1, 2, ...
                        mapeamentos[chave][amostras[i][chave]] = Object.keys(mapeamentos[chave]).length;
                    }
                }
            }
        }

        var convertidas = amostras.map(function (amostra) {
            var copia = {};
            for (var c in amostra) {
                if (!Object.prototype.hasOwnProperty.call(amostra, c)) { continue; }
                if (typeof amostra[c] === 'string' && mapeamentos[c]) {
                    copia[c] = mapeamentos[c][amostra[c]];
                } else {
                    var numero = Number(amostra[c]);
                    copia[c] = Number.isFinite(numero) ? numero : 0;
                }
            }
            return copia;
        });

        return { amostras: convertidas, mapeamentos: mapeamentos };
    }

    /**
     * Calcula minimo e maximo de cada coluna.
     */
    function calcularEstatisticas(amostras, chaves) {
        var estatisticas = {};
        chaves.forEach(function (chave) {
            var minimo = Infinity;
            var maximo = -Infinity;
            for (var i = 0; i < amostras.length; i++) {
                var valor = Number(amostras[i][chave]);
                if (!Number.isFinite(valor)) { continue; }
                if (valor < minimo) { minimo = valor; }
                if (valor > maximo) { maximo = valor; }
            }
            if (!Number.isFinite(minimo)) { minimo = 0; maximo = 1; }
            // Coluna com um valor so (ou todos iguais): evita divisao por zero.
            if (maximo === minimo) { maximo = minimo + 1; }
            estatisticas[chave] = { minimo: minimo, maximo: maximo };
        });
        return estatisticas;
    }

    function normalizarValor(valor, estatistica) {
        if (!estatistica) { return valor; }
        return (valor - estatistica.minimo) / (estatistica.maximo - estatistica.minimo);
    }

    function desnormalizarValor(valorNormalizado, estatistica) {
        if (!estatistica) { return valorNormalizado; }
        return valorNormalizado * (estatistica.maximo - estatistica.minimo) + estatistica.minimo;
    }

    /**
     * Prepara o conjunto completo para o treinamento:
     * separa as colunas de entrada das de saida, converte texto em numero e
     * normaliza tudo para [0, 1], guardando as estatisticas para desfazer depois.
     */
    function prepararConjuntoDeDados(amostrasBrutas, chavesEntrada, chavesSaida) {

        if (!Array.isArray(amostrasBrutas) || amostrasBrutas.length === 0) {
            throw new Error('prepararConjuntoDeDados: nenhuma amostra foi informada.');
        }

        var convertido = mapearTextosParaNumeros(amostrasBrutas);
        var todasAsChaves = chavesEntrada.concat(chavesSaida);
        var estatisticas = calcularEstatisticas(convertido.amostras, todasAsChaves);

        var entradas = [];
        var saidas = [];
        var saidasOriginais = [];

        convertido.amostras.forEach(function (amostra) {
            entradas.push(chavesEntrada.map(function (chave) {
                return normalizarValor(amostra[chave], estatisticas[chave]);
            }));
            saidas.push(chavesSaida.map(function (chave) {
                return normalizarValor(amostra[chave], estatisticas[chave]);
            }));
            saidasOriginais.push(chavesSaida.map(function (chave) { return amostra[chave]; }));
        });

        return {
            entradas: entradas,
            saidas: saidas,
            saidasOriginais: saidasOriginais,
            estatisticas: estatisticas,
            mapeamentos: convertido.mapeamentos,
            chavesEntrada: chavesEntrada.slice(),
            chavesSaida: chavesSaida.slice()
        };
    }

    /**
     * Converte um vetor de saida da rede (normalizado) de volta para a escala
     * original dos dados, para exibir no painel e no grafico.
     */
    function desnormalizarSaidaDaRede(vetorNormalizado, conjunto) {
        return vetorNormalizado.map(function (valor, indice) {
            var chave = conjunto.chavesSaida[indice];
            return desnormalizarValor(valor, conjunto.estatisticas[chave]);
        });
    }


    /* ========================================================================
     * 11) UTILITARIOS DE INSPECAO (usados pela animacao e pelos testes)
     * ===================================================================== */

    /** Maior valor absoluto encontrado em um bloco de pesos. */
    function maiorPesoAbsoluto(matriz) {
        var maior = 0;
        for (var d = 0; d < matriz.length; d++) {
            for (var o = 0; o < matriz[d].length; o++) {
                var absoluto = Math.abs(matriz[d][o]);
                if (absoluto > maior) { maior = absoluto; }
            }
        }
        return maior;
    }

    /** Total de conexoes (fios) da rede inteira. */
    function contarConexoes(rede) {
        var total = 0;
        for (var bloco = 0; bloco < rede.pesos.length; bloco++) {
            for (var d = 0; d < rede.pesos[bloco].length; d++) {
                total += rede.pesos[bloco][d].length;
            }
        }
        return total;
    }

    /** Total de parametros treinaveis (pesos + vieses). */
    function contarParametros(rede) {
        var total = contarConexoes(rede);
        if (rede.usarVies) {
            for (var bloco = 0; bloco < rede.vieses.length; bloco++) {
                total += rede.vieses[bloco].length;
            }
        }
        return total;
    }


    /* ========================================================================
     *  API PUBLICA DO MOTOR
     * ===================================================================== */
    return {
        ATIVACOES: ATIVACOES,
        obterAtivacao: obterAtivacao,
        criarGeradorAleatorio: criarGeradorAleatorio,
        inicializacaoGlorot: inicializacaoGlorot,
        criarRede: criarRede,
        propagarParaFrente: propagarParaFrente,
        calcularErroMSE: calcularErroMSE,
        retropropagar: retropropagar,
        atualizarPesoRegularizacaoL2: atualizarPesoRegularizacaoL2,
        limitarGradiente: limitarGradiente,
        atualizarPesos: atualizarPesos,
        treinarUmPasso: treinarUmPasso,
        mapearTextosParaNumeros: mapearTextosParaNumeros,
        calcularEstatisticas: calcularEstatisticas,
        normalizarValor: normalizarValor,
        desnormalizarValor: desnormalizarValor,
        prepararConjuntoDeDados: prepararConjuntoDeDados,
        desnormalizarSaidaDaRede: desnormalizarSaidaDaRede,
        maiorPesoAbsoluto: maiorPesoAbsoluto,
        contarConexoes: contarConexoes,
        contarParametros: contarParametros
    };
});
