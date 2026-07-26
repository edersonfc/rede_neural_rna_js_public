/**
 * @jest-environment node
 *
 * Testes da MATEMATICA da rede neural.
 * Rodam sem navegador, porque motor_rede_neural.js nao toca em DOM nenhum.
 */

const Motor = require('../motor_rede_neural.js');

/* ==========================================================================
 *  FUNCOES DE ATIVACAO
 * ======================================================================= */
describe('Funcoes de ativacao', () => {

    test('sigmoide devolve 0.5 no zero e fica presa entre 0 e 1', () => {
        const sigmoide = Motor.ATIVACOES.sigmoide;
        expect(sigmoide.fn(0)).toBeCloseTo(0.5, 10);
        expect(sigmoide.fn(50)).toBeGreaterThan(0.999);
        expect(sigmoide.fn(-50)).toBeLessThan(0.001);
    });

    test('derivada da sigmoide e maxima no zero (0.25)', () => {
        const sigmoide = Motor.ATIVACOES.sigmoide;
        expect(sigmoide.derivada(0, sigmoide.fn(0))).toBeCloseTo(0.25, 10);
        expect(sigmoide.derivada(6, sigmoide.fn(6))).toBeLessThan(0.01);
    });

    test('tanh e centrada em zero e vai de -1 a 1', () => {
        const tanh = Motor.ATIVACOES.tanh;
        expect(tanh.fn(0)).toBeCloseTo(0, 10);
        expect(tanh.fn(20)).toBeCloseTo(1, 6);
        expect(tanh.fn(-20)).toBeCloseTo(-1, 6);
        expect(tanh.derivada(0, tanh.fn(0))).toBeCloseTo(1, 10);
    });

    test('ReLU zera o negativo e mantem o positivo', () => {
        const relu = Motor.ATIVACOES.relu;
        expect(relu.fn(-3)).toBe(0);
        expect(relu.fn(3)).toBe(3);
        expect(relu.derivada(-3)).toBe(0);
        expect(relu.derivada(3)).toBe(1);
    });

    test('Leaky ReLU deixa um fio de sinal passar no negativo', () => {
        const vazada = Motor.ATIVACOES.leakyRelu;
        expect(vazada.fn(-10)).toBeCloseTo(-0.1, 10);
        expect(vazada.derivada(-10)).toBeCloseTo(0.01, 10);
    });

    test('linear e a identidade e tem derivada 1', () => {
        expect(Motor.ATIVACOES.linear.fn(7.5)).toBe(7.5);
        expect(Motor.ATIVACOES.linear.derivada(7.5)).toBe(1);
    });

    test('um nome de ativacao desconhecido cai na sigmoide em vez de quebrar', () => {
        expect(Motor.obterAtivacao('nao_existe')).toBe(Motor.ATIVACOES.sigmoide);
    });
});


/* ==========================================================================
 *  GERADOR ALEATORIO E INICIALIZACAO DOS PESOS
 * ======================================================================= */
describe('Gerador aleatorio e inicializacao Glorot', () => {

    test('a mesma semente produz sempre a mesma sequencia', () => {
        const primeiro = Motor.criarGeradorAleatorio(12345);
        const segundo = Motor.criarGeradorAleatorio(12345);
        for (let i = 0; i < 20; i++) {
            expect(primeiro()).toBe(segundo());
        }
    });

    test('sementes diferentes produzem sequencias diferentes', () => {
        const a = Motor.criarGeradorAleatorio(1)();
        const b = Motor.criarGeradorAleatorio(2)();
        expect(a).not.toBe(b);
    });

    test('os numeros sorteados ficam sempre dentro de [0, 1)', () => {
        const aleatorio = Motor.criarGeradorAleatorio(99);
        for (let i = 0; i < 500; i++) {
            const valor = aleatorio();
            expect(valor).toBeGreaterThanOrEqual(0);
            expect(valor).toBeLessThan(1);
        }
    });

    test('Glorot respeita o limite raiz(6 / (entradas + saidas))', () => {
        const entradas = 4;
        const saidas = 3;
        const limite = Math.sqrt(6 / (entradas + saidas));
        const aleatorio = Motor.criarGeradorAleatorio(2024);
        for (let i = 0; i < 300; i++) {
            const peso = Motor.inicializacaoGlorot(entradas, saidas, aleatorio);
            expect(Math.abs(peso)).toBeLessThanOrEqual(limite);
        }
    });
});


/* ==========================================================================
 *  CRIACAO DA REDE
 * ======================================================================= */
describe('criarRede', () => {

    test('monta um bloco de pesos entre cada par de camadas', () => {
        const rede = Motor.criarRede({ camadas: [3, 2, 4, 1], semente: 1 });
        expect(rede.pesos).toHaveLength(3);
        expect(rede.vieses).toHaveLength(3);
    });

    test('cada bloco tem o formato [destino][origem]', () => {
        const rede = Motor.criarRede({ camadas: [3, 2, 4, 1], semente: 1 });

        expect(rede.pesos[0]).toHaveLength(2);      // 2 neuronios de destino
        expect(rede.pesos[0][0]).toHaveLength(3);   // 3 entradas cada um

        expect(rede.pesos[1]).toHaveLength(4);
        expect(rede.pesos[1][0]).toHaveLength(2);

        expect(rede.pesos[2]).toHaveLength(1);
        expect(rede.pesos[2][0]).toHaveLength(4);
    });

    test('os vieses comecam zerados', () => {
        const rede = Motor.criarRede({ camadas: [2, 3, 1], semente: 1 });
        rede.vieses.forEach((bloco) => bloco.forEach((vies) => expect(vies).toBe(0)));
    });

    test('contarConexoes e contarParametros batem com a arquitetura', () => {
        const rede = Motor.criarRede({ camadas: [3, 2, 4, 1], semente: 1 });
        // conexoes: 3x2 + 2x4 + 4x1 = 6 + 8 + 4 = 18
        expect(Motor.contarConexoes(rede)).toBe(18);
        // vieses: 2 + 4 + 1 = 7
        expect(Motor.contarParametros(rede)).toBe(18 + 7);
    });

    test('a mesma semente reproduz exatamente os mesmos pesos', () => {
        const primeira = Motor.criarRede({ camadas: [3, 4, 1], semente: 777 });
        const segunda = Motor.criarRede({ camadas: [3, 4, 1], semente: 777 });
        expect(segunda.pesos).toEqual(primeira.pesos);
    });

    test('recusa arquiteturas invalidas com uma mensagem clara', () => {
        expect(() => Motor.criarRede({ camadas: [3] })).toThrow(/ao menos 2 camadas/);
        expect(() => Motor.criarRede({ camadas: [3, 0, 1] })).toThrow(/pelo menos 1 neuronio/);
        expect(() => Motor.criarRede({})).toThrow(/ao menos 2 camadas/);
    });
});


/* ==========================================================================
 *  PROPAGACAO PARA FRENTE
 * ======================================================================= */
describe('propagarParaFrente', () => {

    test('faz a conta soma-ponderada + vies e aplica a ativacao', () => {
        const rede = Motor.criarRede({ camadas: [2, 1], ativacaoSaida: 'linear', semente: 1 });
        // Substitui os pesos por valores conhecidos para conferir na mao.
        rede.pesos[0] = [[0.5, -2]];
        rede.vieses[0] = [1];

        const resultado = Motor.propagarParaFrente(rede, [4, 3]);

        // soma = 1 + (4 * 0.5) + (3 * -2) = 1 + 2 - 6 = -3
        expect(resultado.somas[1][0]).toBeCloseTo(-3, 10);
        expect(resultado.saida[0]).toBeCloseTo(-3, 10);
    });

    test('aplica a sigmoide na camada escondida e a linear na saida', () => {
        const rede = Motor.criarRede({
            camadas: [1, 1, 1], ativacaoOculta: 'sigmoide', ativacaoSaida: 'linear', semente: 1
        });
        rede.pesos[0] = [[2]];
        rede.pesos[1] = [[3]];

        const resultado = Motor.propagarParaFrente(rede, [1]);

        const escondida = 1 / (1 + Math.exp(-2));
        expect(resultado.ativacoes[1][0]).toBeCloseTo(escondida, 10);
        expect(resultado.saida[0]).toBeCloseTo(escondida * 3, 10);
    });

    test('TODAS as camadas escondidas participam do calculo', () => {
        // Este teste protege contra a falha que existia na versao anterior, em
        // que a ultima camada escondida era removida do array com .pop() e a
        // rede passava a devolver sempre zero.
        const rede = Motor.criarRede({ camadas: [2, 3, 4, 5, 1], semente: 3 });
        const resultado = Motor.propagarParaFrente(rede, [0.5, 0.25]);

        expect(resultado.ativacoes.map((camada) => camada.length)).toEqual([2, 3, 4, 5, 1]);
        expect(resultado.saida).toHaveLength(1);
        expect(resultado.saida[0]).not.toBe(0);
        expect(Number.isFinite(resultado.saida[0])).toBe(true);
    });

    test('reclama quando a quantidade de entradas nao bate com a rede', () => {
        const rede = Motor.criarRede({ camadas: [3, 2, 1], semente: 1 });
        expect(() => Motor.propagarParaFrente(rede, [1, 2])).toThrow(/esperava 3 valores/);
        expect(() => Motor.propagarParaFrente(rede, 'abc')).toThrow(/esperava 3 valores/);
    });
});


/* ==========================================================================
 *  ERRO QUADRATICO MEDIO
 * ======================================================================= */
describe('calcularErroMSE', () => {

    test('erro zero quando a previsao e exata', () => {
        expect(Motor.calcularErroMSE([1, 2, 3], [1, 2, 3])).toBe(0);
    });

    test('calcula a media dos quadrados das diferencas', () => {
        // diferencas: 1 e 3  ->  (1 + 9) / 2 = 5
        expect(Motor.calcularErroMSE([10, 20], [9, 17])).toBeCloseTo(5, 10);
    });

    test('nunca devolve valor negativo', () => {
        expect(Motor.calcularErroMSE([-5], [5])).toBe(100);
    });

    test('recusa arrays vazios ou de tamanhos diferentes', () => {
        expect(() => Motor.calcularErroMSE([], [])).toThrow(/invalidas/);
        expect(() => Motor.calcularErroMSE([1, 2], [1])).toThrow(/invalidas/);
        expect(() => Motor.calcularErroMSE(1, 1)).toThrow(/arrays/);
    });

    test('avisa quando o resultado da NaN em vez de propagar o lixo', () => {
        expect(() => Motor.calcularErroMSE([NaN], [1])).toThrow(/invalido/);
    });
});


/* ==========================================================================
 *  RETROPROPAGACAO -- CONFERIDA CONTRA A DERIVADA NUMERICA
 * ------------------------------------------------------------------------
 *  Este e o teste mais importante do arquivo. Ele compara o gradiente que o
 *  backpropagation calcula com o gradiente medido "na forca bruta", mexendo um
 *  peso de cada vez e observando o quanto o erro muda:
 *
 *      gradiente numerico = ( Erro(peso + h) - Erro(peso - h) ) / (2h)
 *
 *  Se a regra da cadeia estiver errada em qualquer camada, os dois numeros
 *  divergem e o teste falha.
 * ======================================================================= */
describe('retropropagar (backpropagation)', () => {

    function erroDaRede(rede, entradas, alvos) {
        const frente = Motor.propagarParaFrente(rede, entradas);
        return Motor.calcularErroMSE(alvos, frente.saida);
    }

    function conferirGradientesContraDerivadaNumerica(configuracao, entradas, alvos) {

        const rede = Motor.criarRede(configuracao);
        const frente = Motor.propagarParaFrente(rede, entradas);
        const tras = Motor.retropropagar(rede, frente, alvos);
        const h = 1e-5;

        for (let bloco = 0; bloco < rede.pesos.length; bloco++) {
            for (let destino = 0; destino < rede.pesos[bloco].length; destino++) {

                for (let origem = 0; origem < rede.pesos[bloco][destino].length; origem++) {
                    const original = rede.pesos[bloco][destino][origem];

                    rede.pesos[bloco][destino][origem] = original + h;
                    const erroAcima = erroDaRede(rede, entradas, alvos);
                    rede.pesos[bloco][destino][origem] = original - h;
                    const erroAbaixo = erroDaRede(rede, entradas, alvos);
                    rede.pesos[bloco][destino][origem] = original;

                    const gradienteNumerico = (erroAcima - erroAbaixo) / (2 * h);
                    expect(tras.gradientesPesos[bloco][destino][origem]).toBeCloseTo(gradienteNumerico, 5);
                }

                // O mesmo para o vies.
                const viesOriginal = rede.vieses[bloco][destino];
                rede.vieses[bloco][destino] = viesOriginal + h;
                const erroAcimaVies = erroDaRede(rede, entradas, alvos);
                rede.vieses[bloco][destino] = viesOriginal - h;
                const erroAbaixoVies = erroDaRede(rede, entradas, alvos);
                rede.vieses[bloco][destino] = viesOriginal;

                const gradienteNumericoVies = (erroAcimaVies - erroAbaixoVies) / (2 * h);
                expect(tras.gradientesVieses[bloco][destino]).toBeCloseTo(gradienteNumericoVies, 5);
            }
        }
    }

    test('gradientes corretos com sigmoide nas ocultas e linear na saida', () => {
        conferirGradientesContraDerivadaNumerica(
            { camadas: [3, 4, 2], ativacaoOculta: 'sigmoide', ativacaoSaida: 'linear', semente: 7 },
            [0.3, -0.7, 0.9],
            [0.2, 0.8]
        );
    });

    test('gradientes corretos atravessando DUAS camadas escondidas', () => {
        conferirGradientesContraDerivadaNumerica(
            { camadas: [2, 3, 3, 1], ativacaoOculta: 'sigmoide', ativacaoSaida: 'linear', semente: 11 },
            [0.6, -0.4],
            [0.35]
        );
    });

    test('gradientes corretos com tanh', () => {
        conferirGradientesContraDerivadaNumerica(
            { camadas: [2, 4, 2], ativacaoOculta: 'tanh', ativacaoSaida: 'tanh', semente: 13 },
            [0.8, 0.1],
            [-0.5, 0.5]
        );
    });

    test('gradientes corretos com sigmoide tambem na saida', () => {
        conferirGradientesContraDerivadaNumerica(
            { camadas: [3, 3, 2], ativacaoOculta: 'sigmoide', ativacaoSaida: 'sigmoide', semente: 17 },
            [1, 0.5, -0.25],
            [0.9, 0.1]
        );
    });

    test('devolve um delta por camada, com o tamanho de cada camada', () => {
        const rede = Motor.criarRede({ camadas: [2, 3, 4, 1], semente: 5 });
        const frente = Motor.propagarParaFrente(rede, [0.5, 0.5]);
        const tras = Motor.retropropagar(rede, frente, [0.7]);
        expect(tras.deltas.map((camada) => camada.length)).toEqual([2, 3, 4, 1]);
    });

    test('reclama quando a quantidade de valores esperados nao bate', () => {
        const rede = Motor.criarRede({ camadas: [2, 3, 2], semente: 5 });
        const frente = Motor.propagarParaFrente(rede, [0.5, 0.5]);
        expect(() => Motor.retropropagar(rede, frente, [1])).toThrow(/esperava 2 valores/);
    });
});


/* ==========================================================================
 *  ATUALIZACAO DOS PESOS
 * ======================================================================= */
describe('atualizacao dos pesos', () => {

    test('formula da regularizacao L2 conferida na mao', () => {
        // novoPeso = 0.5 - 0.1 * (2 + 0.01 * 0.5) = 0.5 - 0.1 * 2.005 = 0.2995
        expect(Motor.atualizarPesoRegularizacaoL2(0.5, 2, 0.1, 0.01)).toBeCloseTo(0.2995, 10);
    });

    test('sem gradiente, o L2 sozinho empurra o peso na direcao do zero', () => {
        const positivo = Motor.atualizarPesoRegularizacaoL2(1, 0, 0.1, 0.5);
        const negativo = Motor.atualizarPesoRegularizacaoL2(-1, 0, 0.1, 0.5);
        expect(positivo).toBeLessThan(1);
        expect(positivo).toBeGreaterThan(0);
        expect(negativo).toBeGreaterThan(-1);
        expect(negativo).toBeLessThan(0);
    });

    test('limitarGradiente prende o valor na faixa e mata NaN/Infinito', () => {
        expect(Motor.limitarGradiente(100, 5)).toBe(5);
        expect(Motor.limitarGradiente(-100, 5)).toBe(-5);
        expect(Motor.limitarGradiente(2, 5)).toBe(2);
        expect(Motor.limitarGradiente(NaN, 5)).toBe(0);
        expect(Motor.limitarGradiente(Infinity, 5)).toBe(5);
    });

    test('atualizarPesos mexe em todos os blocos e nos vieses', () => {
        const rede = Motor.criarRede({ camadas: [2, 2, 1], semente: 21 });
        const antes = JSON.parse(JSON.stringify(rede.pesos));

        const frente = Motor.propagarParaFrente(rede, [1, 1]);
        const tras = Motor.retropropagar(rede, frente, [0]);
        Motor.atualizarPesos(rede, tras, 0.5, 0.001);

        expect(rede.pesos).not.toEqual(antes);
        rede.vieses.forEach((bloco) => bloco.forEach((vies) => expect(vies).not.toBe(0)));
    });

    test('o vies NAO recebe regularizacao L2', () => {
        const rede = Motor.criarRede({ camadas: [1, 1], ativacaoSaida: 'linear', semente: 3 });
        rede.vieses[0] = [2];

        // Gradiente zero: se houvesse L2 no vies, ele encolheria mesmo assim.
        const gradientesFalsos = {
            gradientesPesos: [[[0]]],
            gradientesVieses: [[0]]
        };
        Motor.atualizarPesos(rede, gradientesFalsos, 0.1, 0.9);

        expect(rede.vieses[0][0]).toBe(2);
    });
});


/* ==========================================================================
 *  TREINAMENTO DE VERDADE
 * ======================================================================= */
describe('treinarUmPasso e aprendizado', () => {

    test('um passo devolve tudo o que a animacao precisa desenhar', () => {
        const rede = Motor.criarRede({ camadas: [2, 3, 1], semente: 8 });
        const passo = Motor.treinarUmPasso(rede, [0.5, 0.5], [1], 0.1, 0.0001);

        expect(passo).toHaveProperty('ativacoes');
        expect(passo).toHaveProperty('deltas');
        expect(passo).toHaveProperty('erro');
        expect(passo.ativacoes.map((c) => c.length)).toEqual([2, 3, 1]);
        expect(passo.deltas.map((c) => c.length)).toEqual([2, 3, 1]);
        expect(Number.isFinite(passo.erro)).toBe(true);
    });

    test('repetir o passo faz o erro CAIR (a rede realmente aprende)', () => {
        const rede = Motor.criarRede({
            camadas: [2, 4, 1], ativacaoOculta: 'sigmoide', ativacaoSaida: 'linear', semente: 42
        });

        const erroInicial = Motor.treinarUmPasso(rede, [0.9, 0.2], [0.75], 0.3, 0).erro;
        let erroFinal = erroInicial;
        for (let i = 0; i < 400; i++) {
            erroFinal = Motor.treinarUmPasso(rede, [0.9, 0.2], [0.75], 0.3, 0).erro;
        }

        expect(erroFinal).toBeLessThan(erroInicial);
        expect(erroFinal).toBeLessThan(1e-4);
    });

    test('aprende o XOR - problema que NENHUMA rede linear consegue resolver', () => {
        // Este teste prova que a nao-linearidade esta funcionando de verdade.
        // Uma rede sem funcao de ativacao (como era a versao anterior) nunca
        // consegue separar o XOR, por mais camadas que tenha.
        const rede = Motor.criarRede({
            camadas: [2, 6, 1], ativacaoOculta: 'tanh', ativacaoSaida: 'sigmoide', semente: 1234
        });

        const casos = [
            { entrada: [0, 0], alvo: [0] },
            { entrada: [0, 1], alvo: [1] },
            { entrada: [1, 0], alvo: [1] },
            { entrada: [1, 1], alvo: [0] }
        ];

        for (let epoca = 0; epoca < 4000; epoca++) {
            casos.forEach((caso) => Motor.treinarUmPasso(rede, caso.entrada, caso.alvo, 0.5, 0));
        }

        casos.forEach((caso) => {
            const previsto = Motor.propagarParaFrente(rede, caso.entrada).saida[0];
            expect(Math.round(previsto)).toBe(caso.alvo[0]);
        });
    });

    test('a rede aprende varias amostras ao mesmo tempo', () => {
        const rede = Motor.criarRede({
            camadas: [2, 5, 1], ativacaoOculta: 'sigmoide', ativacaoSaida: 'linear', semente: 99
        });

        const amostras = [
            { entrada: [0.1, 0.9], alvo: [0.2] },
            { entrada: [0.5, 0.5], alvo: [0.5] },
            { entrada: [0.9, 0.1], alvo: [0.8] }
        ];

        function erroMedio() {
            return amostras.reduce((soma, amostra) => {
                const previsto = Motor.propagarParaFrente(rede, amostra.entrada).saida;
                return soma + Motor.calcularErroMSE(amostra.alvo, previsto);
            }, 0) / amostras.length;
        }

        const antes = erroMedio();
        for (let epoca = 0; epoca < 2000; epoca++) {
            amostras.forEach((amostra) => Motor.treinarUmPasso(rede, amostra.entrada, amostra.alvo, 0.2, 0));
        }
        const depois = erroMedio();

        expect(depois).toBeLessThan(antes);
        expect(depois).toBeLessThan(0.005);
    });

    test('uma taxa de aprendizagem absurda nao gera NaN, gracas ao clipping', () => {
        const rede = Motor.criarRede({ camadas: [2, 3, 1], semente: 55 });
        for (let i = 0; i < 50; i++) {
            Motor.treinarUmPasso(rede, [1, 1], [1], 50, 0.1);
        }
        rede.pesos.forEach((bloco) =>
            bloco.forEach((linha) =>
                linha.forEach((peso) => expect(Number.isFinite(peso)).toBe(true))));
    });
});


/* ==========================================================================
 *  NORMALIZACAO DOS DADOS
 * ======================================================================= */
describe('Normalizacao dos dados', () => {

    test('mapeia textos para numeros de forma DETERMINISTICA', () => {
        const dados = [
            { nivel: 'Bom', nota: 7 },
            { nivel: 'Otimo', nota: 9 },
            { nivel: 'Bom', nota: 8 }
        ];

        const primeira = Motor.mapearTextosParaNumeros(dados);
        const segunda = Motor.mapearTextosParaNumeros(dados);

        // O mesmo texto sempre vira o mesmo numero, e em execucoes diferentes.
        expect(primeira.amostras[0].nivel).toBe(primeira.amostras[2].nivel);
        expect(primeira.amostras).toEqual(segunda.amostras);
        expect(primeira.mapeamentos.nivel).toEqual({ Bom: 0, Otimo: 1 });
    });

    test('textos diferentes nunca recebem o mesmo numero', () => {
        const dados = [{ c: 'a' }, { c: 'b' }, { c: 'c' }, { c: 'd' }];
        const resultado = Motor.mapearTextosParaNumeros(dados);
        const numeros = resultado.amostras.map((a) => a.c);
        expect(new Set(numeros).size).toBe(4);
    });

    test('calcularEstatisticas acha o minimo e o maximo de cada coluna', () => {
        const estatisticas = Motor.calcularEstatisticas(
            [{ x: 10, y: 1 }, { x: 30, y: 5 }, { x: 20, y: 3 }],
            ['x', 'y']
        );
        expect(estatisticas.x).toEqual({ minimo: 10, maximo: 30 });
        expect(estatisticas.y).toEqual({ minimo: 1, maximo: 5 });
    });

    test('coluna com todos os valores iguais nao causa divisao por zero', () => {
        const estatisticas = Motor.calcularEstatisticas([{ x: 7 }, { x: 7 }], ['x']);
        expect(estatisticas.x.maximo).not.toBe(estatisticas.x.minimo);
        expect(Number.isFinite(Motor.normalizarValor(7, estatisticas.x))).toBe(true);
    });

    test('normalizar e desnormalizar sao operacoes inversas', () => {
        const estatistica = { minimo: 15, maximo: 57 };
        [15, 25, 40, 57].forEach((valor) => {
            const normalizado = Motor.normalizarValor(valor, estatistica);
            expect(normalizado).toBeGreaterThanOrEqual(0);
            expect(normalizado).toBeLessThanOrEqual(1);
            expect(Motor.desnormalizarValor(normalizado, estatistica)).toBeCloseTo(valor, 10);
        });
    });

    test('prepararConjuntoDeDados separa entradas de saidas e escala tudo', () => {
        const amostras = [
            { horasEstudo: 57, horasSono: 8, nota: 97 },
            { horasEstudo: 25, horasSono: 5, nota: 75 },
            { horasEstudo: 15, horasSono: 7, nota: 80 }
        ];

        const conjunto = Motor.prepararConjuntoDeDados(amostras, ['horasEstudo', 'horasSono'], ['nota']);

        expect(conjunto.entradas).toHaveLength(3);
        expect(conjunto.entradas[0]).toHaveLength(2);
        expect(conjunto.saidas[0]).toHaveLength(1);
        expect(conjunto.saidasOriginais[0]).toEqual([97]);

        // Todo valor normalizado precisa estar dentro de [0, 1].
        conjunto.entradas.flat().concat(conjunto.saidas.flat()).forEach((valor) => {
            expect(valor).toBeGreaterThanOrEqual(0);
            expect(valor).toBeLessThanOrEqual(1);
        });

        // 57 e o maior valor de horasEstudo -> vira exatamente 1.
        expect(conjunto.entradas[0][0]).toBeCloseTo(1, 10);
        // 15 e o menor -> vira exatamente 0.
        expect(conjunto.entradas[2][0]).toBeCloseTo(0, 10);
    });

    test('desnormalizarSaidaDaRede devolve o valor na unidade original', () => {
        const conjunto = Motor.prepararConjuntoDeDados(
            [{ x: 1, y: 50 }, { x: 2, y: 100 }],
            ['x'], ['y']
        );
        expect(Motor.desnormalizarSaidaDaRede([0], conjunto)[0]).toBeCloseTo(50, 10);
        expect(Motor.desnormalizarSaidaDaRede([1], conjunto)[0]).toBeCloseTo(100, 10);
        expect(Motor.desnormalizarSaidaDaRede([0.5], conjunto)[0]).toBeCloseTo(75, 10);
    });

    test('reclama quando nao ha amostra nenhuma', () => {
        expect(() => Motor.prepararConjuntoDeDados([], ['x'], ['y'])).toThrow(/nenhuma amostra/);
    });
});


/* ==========================================================================
 *  UTILITARIOS DE INSPECAO
 * ======================================================================= */
describe('Utilitarios de inspecao', () => {

    test('maiorPesoAbsoluto ignora o sinal', () => {
        expect(Motor.maiorPesoAbsoluto([[0.1, -0.9], [0.4, 0.2]])).toBeCloseTo(0.9, 10);
    });
});
