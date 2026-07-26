/**
 * Testes do MOTOR DE ANIMACAO do canvas.
 *
 * O jsdom nao desenha nada de verdade; quem fornece um contexto 2D de mentira
 * e a biblioteca jest-canvas-mock (carregada em jest.config.js). Com ela da
 * para verificar QUE chamadas de desenho foram feitas -- arcos, linhas, textos.
 */

const Animacao = require('../animacao_rede_neural.js');
const Motor = require('../motor_rede_neural.js');

const { AnimadorRedeNeural, lerGeometriaDoDOM } = Animacao;

/** Geometria de mentira: 2 entradas -> 3 ocultas -> 1 saida. */
function geometriaDeExemplo() {
    return {
        camadas: [
            {
                tipo: 'entrada', rotulo: 'Entrada', neuronios: [
                    { id: 'e0', x: 60, y: 100, raio: 15 },
                    { id: 'e1', x: 60, y: 180, raio: 15 }
                ]
            },
            {
                tipo: 'escondida', rotulo: 'Oculta 1', neuronios: [
                    { id: 'h0', x: 300, y: 70, raio: 15 },
                    { id: 'h1', x: 300, y: 140, raio: 15 },
                    { id: 'h2', x: 300, y: 210, raio: 15 }
                ]
            },
            {
                tipo: 'saida', rotulo: 'Saida', neuronios: [
                    { id: 's0', x: 540, y: 140, raio: 15 }
                ]
            }
        ]
    };
}

function criarAnimador(opcoes) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 280;
    document.body.appendChild(canvas);

    const animador = new AnimadorRedeNeural(Object.assign({
        canvas,
        obterGeometria: geometriaDeExemplo,
        obterRede: () => null
    }, opcoes));

    animador.ajustarResolucao();
    animador.geometria = geometriaDeExemplo();
    return animador;
}

beforeEach(() => { document.body.innerHTML = ''; });


/* ==========================================================================
 *  MATEMATICA INTERNA DA ANIMACAO
 * ======================================================================= */
describe('Utilitarios da animacao', () => {

    test('limitar prende o valor na faixa e trata NaN', () => {
        expect(Animacao._limitar(5, 0, 1)).toBe(1);
        expect(Animacao._limitar(-5, 0, 1)).toBe(0);
        expect(Animacao._limitar(0.5, 0, 1)).toBe(0.5);
        expect(Animacao._limitar(NaN, 0, 1)).toBe(0);
    });

    test('suavizar e uma curva S que preserva as pontas', () => {
        expect(Animacao._suavizar(0)).toBe(0);
        expect(Animacao._suavizar(1)).toBe(1);
        expect(Animacao._suavizar(0.5)).toBeCloseTo(0.5, 10);
        // Comeca e termina devagar: no primeiro quarto anda menos que o linear.
        expect(Animacao._suavizar(0.25)).toBeLessThan(0.25);
        expect(Animacao._suavizar(0.75)).toBeGreaterThan(0.75);
    });

    test('formatarCompacto escolhe as casas decimais pelo tamanho do numero', () => {
        expect(Animacao._formatarCompacto(0.12345)).toBe('0.12');
        expect(Animacao._formatarCompacto(12.345)).toBe('12.3');
        expect(Animacao._formatarCompacto(123.45)).toBe('123');
        expect(Animacao._formatarCompacto(NaN)).toBe('--');
        expect(Animacao._formatarCompacto(Infinity)).toBe('--');
    });

    test('rgba monta a cor com a transparencia pedida', () => {
        expect(Animacao._rgba([10, 20, 30], 0.5)).toBe('rgba(10,20,30,0.500)');
    });
});


/* ==========================================================================
 *  ONDAS: quem esta aceso e quando
 * ======================================================================= */
describe('Progresso das ondas', () => {

    test('nada esta aceso quando a fase esta fora da janela', () => {
        const animador = criarAnimador();
        animador.fase = 0.9;   // fora da janela de propagacao (0 a 0.55)

        const progresso = animador.calcularProgressoDosSegmentos(4, 0, 0.55, false);

        expect(progresso).toHaveLength(4);
        expect(progresso.every((segmento) => segmento.ativo === false)).toBe(true);
    });

    test('a onda de ida acende o PRIMEIRO segmento no comeco do ciclo', () => {
        const animador = criarAnimador();
        animador.fase = 0.01;

        const progresso = animador.calcularProgressoDosSegmentos(4, 0, 0.55, false);

        expect(progresso[0].ativo).toBe(true);
        expect(progresso[3].ativo).toBe(false);
    });

    test('a onda de ida chega no ULTIMO segmento no fim da janela', () => {
        const animador = criarAnimador();
        animador.fase = 0.54;

        const progresso = animador.calcularProgressoDosSegmentos(4, 0, 0.55, false);

        expect(progresso[3].ativo).toBe(true);
        expect(progresso[0].ativo).toBe(false);
    });

    test('a onda de VOLTA percorre os segmentos na ordem inversa', () => {
        const animador = criarAnimador();
        animador.fase = 0.63;   // logo no comeco da janela de retropropagacao

        const progresso = animador.calcularProgressoDosSegmentos(4, 0.62, 1, true);

        // Invertido: o erro nasce no fim da rede e caminha para tras.
        expect(progresso[3].ativo).toBe(true);
        expect(progresso[0].ativo).toBe(false);
    });

    test('a posicao do pulso vai de 0 a 1 dentro do segmento', () => {
        const animador = criarAnimador();
        const posicoes = [];

        for (let fase = 0; fase < 0.13; fase += 0.01) {
            animador.fase = fase;
            const progresso = animador.calcularProgressoDosSegmentos(4, 0, 0.55, false);
            if (progresso[0].ativo) { posicoes.push(progresso[0].posicao); }
        }

        expect(posicoes.length).toBeGreaterThan(3);
        posicoes.forEach((posicao) => {
            expect(posicao).toBeGreaterThanOrEqual(0);
            expect(posicao).toBeLessThanOrEqual(1);
        });
        // O pulso anda sempre para frente, nunca volta.
        for (let i = 1; i < posicoes.length; i++) {
            expect(posicoes[i]).toBeGreaterThanOrEqual(posicoes[i - 1]);
        }
    });

    test('a intensidade do pulso sobe e desce (parece um pulso mesmo)', () => {
        const animador = criarAnimador();
        const intensidades = [];

        for (let fase = 0; fase < 0.19; fase += 0.005) {
            animador.fase = fase;
            const progresso = animador.calcularProgressoDosSegmentos(4, 0, 0.55, false);
            if (progresso[0].ativo) { intensidades.push(progresso[0].intensidade); }
        }

        const maior = Math.max(...intensidades);
        expect(maior).toBeGreaterThan(0.9);
        expect(intensidades[0]).toBeLessThan(maior);
        expect(intensidades[intensidades.length - 1]).toBeLessThan(maior);
    });
});


/* ==========================================================================
 *  RELOGIO DA ANIMACAO
 * ======================================================================= */
describe('Avanco do tempo', () => {

    test('a fase avanca proporcionalmente ao tempo decorrido', () => {
        const animador = criarAnimador();
        animador.duracaoCiclo = 1000;
        animador.fase = 0;

        animador.avancar(250);

        expect(animador.fase).toBeCloseTo(0.25, 10);
    });

    test('a fase da a volta ao completar um ciclo', () => {
        const animador = criarAnimador();
        animador.duracaoCiclo = 1000;
        animador.fase = 0.9;

        animador.avancar(300);

        expect(animador.fase).toBeCloseTo(0.2, 10);
        expect(animador.fase).toBeLessThan(1);
    });

    test('o brilho dos neuronios apaga sozinho com o tempo', () => {
        const animador = criarAnimador();
        animador.brilhoPorNeuronio = { '0:0': 1 };

        animador.avancar(100);
        const depoisDeUmPouco = animador.brilhoPorNeuronio['0:0'];
        expect(depoisDeUmPouco).toBeLessThan(1);
        expect(depoisDeUmPouco).toBeGreaterThan(0);

        animador.avancar(3000);
        expect(animador.brilhoPorNeuronio['0:0']).toBeUndefined();
    });

    test('as ondas circulares somem quando passam da duracao', () => {
        const animador = criarAnimador();
        animador.ondas = [{ x: 0, y: 0, raioInicial: 10, idade: 0, duracao: 500, cor: [0, 0, 0] }];

        animador.avancar(200);
        expect(animador.ondas).toHaveLength(1);

        animador.avancar(400);
        expect(animador.ondas).toHaveLength(0);
    });

    test('definirVelocidade prende a duracao numa faixa utilizavel', () => {
        const animador = criarAnimador();
        animador.definirVelocidade(10);
        expect(animador.duracaoCiclo).toBe(120);
        animador.definirVelocidade(99999);
        expect(animador.duracaoCiclo).toBe(6000);
        animador.definirVelocidade(800);
        expect(animador.duracaoCiclo).toBe(800);
    });
});


/* ==========================================================================
 *  RECEBIMENTO DOS PASSOS DE TREINAMENTO
 * ======================================================================= */
describe('registrarPasso', () => {

    test('guarda epoca, amostra e erro para mostrar no painel do canvas', () => {
        const animador = criarAnimador();

        animador.registrarPasso({
            ativacoes: [[1], [0.5], [0.2]], deltas: [[0], [0.1], [0.3]],
            erro: 0.0123, epoca: 7, totalEpocas: 100, amostra: 2, totalAmostras: 3
        });

        expect(animador.informacao.epoca).toBe(7);
        expect(animador.informacao.amostra).toBe(2);
        expect(animador.informacao.erro).toBeCloseTo(0.0123, 10);
        expect(animador.emTreinamento).toBe(true);
    });

    test('quando o treino corre mais rapido que a animacao, mostra o mais recente', () => {
        const animador = criarAnimador();

        for (let i = 1; i <= 10; i++) {
            animador.registrarPasso({ ativacoes: [[i]], deltas: [[0]], erro: 0.1, epoca: i });
        }

        // A fila nunca cresce sem limite...
        expect(animador.filaDePassos.length).toBeLessThanOrEqual(3);

        animador.consumirProximoPasso();
        // ...e o passo mostrado e o ultimo que chegou, nao um passo velho.
        expect(animador.passoAtual.epoca).toBe(10);
        expect(animador.filaDePassos).toHaveLength(0);
    });

    test('ignora chamadas sem dados', () => {
        const animador = criarAnimador();
        expect(() => animador.registrarPasso(null)).not.toThrow();
        expect(animador.passoAtual).toBeNull();
    });

    test('limpar zera tudo o que estava desenhado', () => {
        const animador = criarAnimador();
        animador.registrarPasso({ ativacoes: [[1]], deltas: [[0]], erro: 1, epoca: 5 });
        animador.brilhoPorNeuronio = { '0:0': 1 };
        animador.ondas = [{ x: 0, y: 0, raioInicial: 5, idade: 0, duracao: 100, cor: [0, 0, 0] }];

        animador.limpar();

        expect(animador.passoAtual).toBeNull();
        expect(animador.filaDePassos).toEqual([]);
        expect(animador.brilhoPorNeuronio).toEqual({});
        expect(animador.ondas).toEqual([]);
        expect(animador.emTreinamento).toBe(false);
        expect(animador.informacao.erro).toBeNull();
    });
});


/* ==========================================================================
 *  LIGACAO ENTRE AS CAMADAS DESENHADAS E AS CAMADAS DO MOTOR
 * ------------------------------------------------------------------------
 *  O motor tem uma camada a mais que o desenho: a camada 0 dele sao os DADOS
 *  BRUTOS, que nao aparecem como bolinha na tela. Entao a camada desenhada 0
 *  (a "Entrada") corresponde a ativacoes[1]. Se esse deslocamento estiver
 *  errado, a animacao acende os neuronios com os numeros da camada errada.
 * ======================================================================= */
describe('Mapeamento entre o desenho e o motor', () => {

    test('a camada desenhada N usa as ativacoes da camada N+1 do motor', () => {
        const animador = criarAnimador();
        animador.passoAtual = {
            ativacoes: [
                [9, 9, 9],      // dados brutos - nao sao desenhados
                [0.1, 0.2],     // camada de entrada  -> desenhada 0
                [0.3, 0.4, 0.5],// camada oculta      -> desenhada 1
                [0.9]           // camada de saida    -> desenhada 2
            ]
        };

        expect(animador.valorDaAtivacao(0, 0)).toBeCloseTo(0.1, 10);
        expect(animador.valorDaAtivacao(0, 1)).toBeCloseTo(0.2, 10);
        expect(animador.valorDaAtivacao(1, 2)).toBeCloseTo(0.5, 10);
        expect(animador.valorDaAtivacao(2, 0)).toBeCloseTo(0.9, 10);
    });

    test('devolve null quando ainda nao ha passo nenhum', () => {
        const animador = criarAnimador();
        expect(animador.valorDaAtivacao(0, 0)).toBeNull();
        expect(animador.intensidadeDaAtivacao(0, 0)).toBeCloseTo(0.55, 10);
    });

    test('a intensidade cresce junto com a ativacao e nunca passa de 1', () => {
        const animador = criarAnimador();
        animador.passoAtual = { ativacoes: [[0], [0, 0.5, 5, -5]] };

        const zero = animador.intensidadeDaAtivacao(0, 0);
        const meio = animador.intensidadeDaAtivacao(0, 1);
        const alto = animador.intensidadeDaAtivacao(0, 2);
        const negativo = animador.intensidadeDaAtivacao(0, 3);

        expect(zero).toBe(0);
        expect(meio).toBeGreaterThan(zero);
        expect(alto).toBeGreaterThan(meio);
        expect(alto).toBeLessThanOrEqual(1);
        // O que importa e a FORCA do sinal, nao o sinal dele.
        expect(negativo).toBeCloseTo(alto, 10);
    });

    test('a intensidade do erro e relativa ao maior delta da camada', () => {
        const animador = criarAnimador();
        animador.passoAtual = { deltas: [[0], [0.1, 0.5, 1.0]] };

        expect(animador.intensidadeDoDelta(0, 2)).toBeCloseTo(1, 10);
        expect(animador.intensidadeDoDelta(0, 1)).toBeCloseTo(0.5, 10);
        expect(animador.intensidadeDoDelta(0, 0)).toBeCloseTo(0.1, 10);
    });

    test('deltas todos zerados nao geram divisao por zero', () => {
        const animador = criarAnimador();
        animador.passoAtual = { deltas: [[0], [0, 0, 0]] };
        expect(Number.isFinite(animador.intensidadeDoDelta(0, 0))).toBe(true);
    });
});


/* ==========================================================================
 *  DESENHO NO CANVAS
 * ======================================================================= */
describe('Desenho no canvas', () => {

    test('desenha os fios e os neuronios sem estourar erro', () => {
        const animador = criarAnimador();
        const contexto = animador.contexto;

        const desenharLinha = jest.spyOn(contexto, 'lineTo');
        const desenharCirculo = jest.spyOn(contexto, 'arc');

        animador.fase = 0.2;
        expect(() => animador.desenhar()).not.toThrow();

        // 2x3 + 3x1 = 9 fios, mais as pontas de entrada e saida.
        expect(desenharLinha.mock.calls.length).toBeGreaterThanOrEqual(9);
        // Um arco por neuronio, no minimo (6 neuronios).
        expect(desenharCirculo.mock.calls.length).toBeGreaterThanOrEqual(6);
    });

    test('limpa o quadro anterior antes de desenhar o proximo', () => {
        const animador = criarAnimador();
        const limpar = jest.spyOn(animador.contexto, 'clearRect');

        animador.desenhar();

        expect(limpar).toHaveBeenCalled();
    });

    test('desenha os PULSOS enquanto a onda esta passando', () => {
        const animador = criarAnimador();
        animador.registrarPasso({
            ativacoes: [[1, 1], [0.8, 0.9], [0.5, 0.6, 0.7], [0.4]],
            deltas: [[0, 0], [0.1, 0.2], [0.1, 0.2, 0.3], [0.4]],
            erro: 0.5, epoca: 1, totalEpocas: 10, amostra: 1, totalAmostras: 1
        });

        const contexto = animador.contexto;

        animador.ligado = false;
        animador.fase = 0.25;
        contexto.arc.mockClear ? contexto.arc.mockClear() : null;
        const semAnimacao = jest.spyOn(contexto, 'arc');
        animador.desenhar();
        const arcosParado = semAnimacao.mock.calls.length;
        semAnimacao.mockRestore();

        animador.ligado = true;
        const comAnimacao = jest.spyOn(contexto, 'arc');
        animador.desenhar();
        const arcosAnimando = comAnimacao.mock.calls.length;

        // Com a animacao ligada ha MAIS circulos: os pulsos e seus halos.
        expect(arcosAnimando).toBeGreaterThan(arcosParado);
    });

    test('escreve o valor de ativacao dentro do neuronio quando pedido', () => {
        const animador = criarAnimador();
        animador.passoAtual = {
            ativacoes: [[1, 1], [0.42, 0.42], [0.5, 0.5, 0.5], [0.77]]
        };
        animador.brilhoPorNeuronio = { '0:0': 1 };

        const escrever = jest.spyOn(animador.contexto, 'fillText');

        animador.mostrarValores = true;
        animador.desenhar();
        const textos = escrever.mock.calls.map((chamada) => chamada[0]);

        expect(textos).toContain('0.42');
        expect(textos).toContain('0.77');
    });

    test('nao escreve os valores quando o interruptor esta desligado', () => {
        const animador = criarAnimador();
        animador.passoAtual = { ativacoes: [[1, 1], [0.42, 0.42], [0.5, 0.5, 0.5], [0.77]] };

        const escrever = jest.spyOn(animador.contexto, 'fillText');
        animador.mostrarValores = false;
        animador.desenhar();

        const textos = escrever.mock.calls.map((chamada) => chamada[0]);
        expect(textos).not.toContain('0.42');
    });

    test('usa os pesos reais da rede para colorir os fios', () => {
        const rede = Motor.criarRede({ camadas: [2, 2, 3, 1], semente: 5 });
        // Deixa um peso claramente positivo e outro claramente negativo.
        rede.pesos[1][0][0] = 2;
        rede.pesos[1][1][0] = -2;

        const animador = criarAnimador({ obterRede: () => rede });
        const cores = [];
        Object.defineProperty(animador.contexto, 'strokeStyle', {
            set(valor) { cores.push(valor); },
            get() { return '#000'; },
            configurable: true
        });

        animador.desenhar();

        expect(cores.some((cor) => String(cor).startsWith('rgba(90,170,255'))).toBe(true);  // peso +
        expect(cores.some((cor) => String(cor).startsWith('rgba(255,105,120'))).toBe(true); // peso -
    });

    test('escreve o rotulo de cada camada abaixo dela', () => {
        const animador = criarAnimador();
        const escrever = jest.spyOn(animador.contexto, 'fillText');

        animador.desenhar();
        const textos = escrever.mock.calls.map((chamada) => chamada[0]);

        expect(textos).toContain('Entrada (2)');
        expect(textos).toContain('Oculta 1 (3)');
        expect(textos).toContain('Saida (1)');
    });

    test('mostra epoca, amostra e erro no painel do canvas', () => {
        const animador = criarAnimador();
        animador.registrarPasso({
            ativacoes: [[1]], deltas: [[0]], erro: 0.012345,
            epoca: 12, totalEpocas: 300, amostra: 2, totalAmostras: 5
        });

        const escrever = jest.spyOn(animador.contexto, 'fillText');
        animador.desenhar();
        const textos = escrever.mock.calls.map((chamada) => String(chamada[0]));

        expect(textos.some((texto) => texto.includes('Epoca 12/300'))).toBe(true);
        expect(textos.some((texto) => texto.includes('Amostra 2/5'))).toBe(true);
        expect(textos.some((texto) => texto.includes('Erro 0.01235'))).toBe(true);
    });

    test('aguenta uma rede grande sem travar (limite de pulsos por quadro)', () => {
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);

        function camadaGrande(quantidade, x, prefixo) {
            const neuronios = [];
            for (let i = 0; i < quantidade; i++) {
                neuronios.push({ id: prefixo + i, x, y: 10 + i * 4, raio: 2 });
            }
            return { tipo: 'escondida', rotulo: prefixo, neuronios };
        }

        const animador = new AnimadorRedeNeural({
            canvas,
            obterGeometria: () => ({ camadas: [camadaGrande(60, 60, 'a'), camadaGrande(60, 540, 'b')] }),
            obterRede: () => null
        });
        animador.ajustarResolucao();
        animador.atualizarGeometria();
        animador.fase = 0.2;

        const inicio = Date.now();
        animador.desenhar();
        expect(Date.now() - inicio).toBeLessThan(2000);
    });

    test('nao quebra quando a geometria esta vazia', () => {
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const animador = new AnimadorRedeNeural({
            canvas, obterGeometria: () => ({ camadas: [] }), obterRede: () => null
        });
        animador.ajustarResolucao();
        expect(() => animador.desenhar()).not.toThrow();
    });

    test('nao quebra quando nao ha canvas nenhum', () => {
        const animador = new AnimadorRedeNeural({});
        expect(() => animador.desenhar()).not.toThrow();
        expect(() => animador.iniciar()).not.toThrow();
        expect(animador.rodando).toBe(false);
    });
});


/* ==========================================================================
 *  LEITURA DA GEOMETRIA DIRETO DO DOM
 * ======================================================================= */
describe('lerGeometriaDoDOM', () => {

    function prepararDOM() {
        document.body.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'meuCanvas';
        canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 600, height: 280 });
        document.body.appendChild(canvas);

        [
            { id: 'n0', left: 130, top: 80 },
            { id: 'n1', left: 130, top: 160 },
            { id: 'n2', left: 430, top: 120 }
        ].forEach((posicao) => {
            const div = document.createElement('div');
            div.id = posicao.id;
            div.getBoundingClientRect = () => ({
                left: posicao.left, top: posicao.top, width: 30, height: 30
            });
            document.body.appendChild(div);
        });

        return canvas;
    }

    test('converte a posicao dos neuronios para coordenadas do canvas', () => {
        const canvas = prepararDOM();

        const geometria = lerGeometriaDoDOM(canvas, [
            { tipo: 'entrada', rotulo: 'Entrada', ids: ['n0', 'n1'] },
            { tipo: 'saida', rotulo: 'Saida', ids: ['n2'] }
        ]);

        expect(geometria.camadas).toHaveLength(2);
        // centro de n0 = (145, 95); canto do canvas = (100, 50)
        expect(geometria.camadas[0].neuronios[0]).toMatchObject({ x: 45, y: 45, raio: 15 });
        expect(geometria.camadas[0].neuronios[1]).toMatchObject({ x: 45, y: 125 });
        expect(geometria.camadas[1].neuronios[0]).toMatchObject({ x: 345, y: 85 });
    });

    test('preserva o rotulo e o tipo de cada camada', () => {
        const canvas = prepararDOM();
        const geometria = lerGeometriaDoDOM(canvas, [
            { tipo: 'escondida', rotulo: 'Oculta 1', ids: ['n0'] }
        ]);
        expect(geometria.camadas[0].rotulo).toBe('Oculta 1');
        expect(geometria.camadas[0].tipo).toBe('escondida');
    });

    test('descarta camadas cujos elementos nao existem mais', () => {
        const canvas = prepararDOM();
        const geometria = lerGeometriaDoDOM(canvas, [
            { tipo: 'entrada', rotulo: 'Entrada', ids: ['n0'] },
            { tipo: 'fantasma', rotulo: 'Sumiu', ids: ['nao_existe'] }
        ]);
        expect(geometria.camadas).toHaveLength(1);
    });

    test('devolve null quando nao recebe um canvas valido', () => {
        expect(lerGeometriaDoDOM(null, [])).toBeNull();
        expect(lerGeometriaDoDOM({}, [])).toBeNull();
    });
});
