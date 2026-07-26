/**
 * Testes das funcoes auxiliares (geometria, coordenadas e texto).
 * Ambiente jsdom, porque parte delas le elementos do DOM.
 */

const Auxiliares = require('../funcoes_auxiliares.js');

/* ==========================================================================
 *  GEOMETRIA
 * ======================================================================= */
describe('Geometria das retas', () => {

    test('angulo 0 grau para a direita, 90 para baixo, -90 para cima', () => {
        expect(Auxiliares.calcularAnguloReta(0, 0, 10, 0)).toBeCloseTo(0, 10);
        expect(Auxiliares.calcularAnguloReta(0, 0, 0, 10)).toBeCloseTo(90, 10);
        expect(Auxiliares.calcularAnguloReta(0, 0, 0, -10)).toBeCloseTo(-90, 10);
        expect(Auxiliares.calcularAnguloReta(0, 0, -10, 0)).toBeCloseTo(180, 10);
    });

    test('comprimento pelo Teorema de Pitagoras (3, 4, 5)', () => {
        expect(Auxiliares.calcularComprimentoReta(0, 0, 3, 4)).toBeCloseTo(5, 10);
        expect(Auxiliares.calcularComprimentoReta(10, 10, 10, 10)).toBe(0);
    });

    test('pontoNaReta anda a fracao pedida do caminho', () => {
        expect(Auxiliares.pontoNaReta(0, 0, 100, 200, 0)).toEqual({ x: 0, y: 0 });
        expect(Auxiliares.pontoNaReta(0, 0, 100, 200, 1)).toEqual({ x: 100, y: 200 });
        expect(Auxiliares.pontoNaReta(0, 0, 100, 200, 0.5)).toEqual({ x: 50, y: 100 });
        expect(Auxiliares.pontoNaReta(20, 20, 40, 60, 0.25)).toEqual({ x: 25, y: 30 });
    });
});


/* ==========================================================================
 *  COORDENADAS -- O BUG DO SCROLL
 * ======================================================================= */
describe('Coordenadas em relacao ao canvas', () => {

    function elementoFalso(id, retangulo) {
        const elemento = document.createElement('div');
        elemento.id = id;
        elemento.getBoundingClientRect = () => retangulo;
        document.body.appendChild(elemento);
        return elemento;
    }

    beforeEach(() => { document.body.innerHTML = ''; });

    test('devolve posicao, tamanho e centro do elemento', () => {
        elementoFalso('alvo', { left: 100, top: 50, width: 30, height: 30 });
        const posicao = Auxiliares.pegandoCoordenada_e_dimenssoes_do_componente('alvo');

        expect(posicao.coordenadaX).toBe(100);
        expect(posicao.coordenadaY).toBe(50);
        expect(posicao.largura).toBe(30);
        expect(posicao.centroX).toBe(115);
        expect(posicao.centroY).toBe(65);
    });

    test('devolve null (em vez de quebrar) quando o elemento nao existe', () => {
        expect(Auxiliares.pegandoCoordenada_e_dimenssoes_do_componente('nao_existe')).toBeNull();
        expect(Auxiliares.converterPosicaoParaCoordenadasDoCanvas('nao_existe', null)).toBeNull();
    });

    test('converte a posicao do neuronio para dentro do canvas', () => {
        const canvas = elementoFalso('meuCanvas', { left: 100, top: 50, width: 600, height: 280 });
        elementoFalso('neuronio', { left: 130, top: 80, width: 30, height: 30 });

        const coordenada = Auxiliares.converterPosicaoParaCoordenadasDoCanvas('neuronio', canvas);

        // centro do neuronio = (145, 95); canto do canvas = (100, 50)
        expect(coordenada.x).toBe(45);
        expect(coordenada.y).toBe(45);
        expect(coordenada.raio).toBe(15);
    });

    test('a coordenada NAO muda quando a pagina e rolada', () => {
        // Este e o teste do bug antigo: a conta usava window.scrollY somado a
        // altura de uma faixa de botoes, entao rolar a pagina desalinhava todas
        // as linhas do canvas. Com getBoundingClientRect nos DOIS elementos, o
        // scroll se cancela sozinho.
        const canvasAntes = { left: 100, top: 50, width: 600, height: 280 };
        const neuronioAntes = { left: 130, top: 80, width: 30, height: 30 };

        const deslocamento = 300; // a pagina rolou 300px para baixo
        const canvasDepois = Object.assign({}, canvasAntes, { top: canvasAntes.top - deslocamento });
        const neuronioDepois = Object.assign({}, neuronioAntes, { top: neuronioAntes.top - deslocamento });

        document.body.innerHTML = '';
        const canvas1 = elementoFalso('meuCanvas', canvasAntes);
        elementoFalso('neuronio', neuronioAntes);
        const antes = Auxiliares.converterPosicaoParaCoordenadasDoCanvas('neuronio', canvas1);

        document.body.innerHTML = '';
        const canvas2 = elementoFalso('meuCanvas', canvasDepois);
        elementoFalso('neuronio', neuronioDepois);
        const depois = Auxiliares.converterPosicaoParaCoordenadasDoCanvas('neuronio', canvas2);

        expect(depois).toEqual(antes);
    });

    test('setPositionEntreDoisComponente2 posiciona com o deslocamento pedido', () => {
        const alvo = elementoFalso('alvo', { left: 0, top: 0, width: 10, height: 10 });
        const referencia = elementoFalso('ref', { left: 200, top: 300, width: 10, height: 10 });

        Auxiliares.setPositionEntreDoisComponente2(alvo, referencia, -50, -20);

        expect(alvo.style.left).toBe('250px');
        expect(alvo.style.top).toBe('320px');
    });

    test('nao quebra quando recebe elementos nulos', () => {
        expect(() => Auxiliares.setPositionEntreDoisComponente2(null, null, 0, 0)).not.toThrow();
    });
});


/* ==========================================================================
 *  EXTRACAO DAS COLUNAS DO JSON
 * ======================================================================= */
describe('extrairNomesChavesArrayDeJson', () => {

    test('pega as colunas na ordem em que aparecem, sem repetir', () => {
        const chaves = Auxiliares.extrairNomesChavesArrayDeJson([
            { horasEstudo: 1, horasSono: 2, nota: 3 },
            { horasEstudo: 4, horasSono: 5, nota: 6 }
        ]);
        expect(chaves).toEqual(['horasEstudo', 'horasSono', 'nota']);
    });

    test('a ORDEM importa: as ultimas colunas viram as saidas da rede', () => {
        const chaves = Auxiliares.extrairNomesChavesArrayDeJson([{ a: 1, b: 2, c: 3 }]);
        expect(chaves[chaves.length - 1]).toBe('c');
    });

    test('junta colunas que so aparecem em alguns objetos', () => {
        const chaves = Auxiliares.extrairNomesChavesArrayDeJson([
            { a: 1 },
            { b: 2 },
            { a: 3, c: 4 }
        ]);
        expect(chaves).toEqual(['a', 'b', 'c']);
    });

    test('devolve lista vazia para entradas invalidas em vez de quebrar', () => {
        expect(Auxiliares.extrairNomesChavesArrayDeJson(null)).toEqual([]);
        expect(Auxiliares.extrairNomesChavesArrayDeJson('texto')).toEqual([]);
        expect(Auxiliares.extrairNomesChavesArrayDeJson([null, undefined])).toEqual([]);
    });
});


/* ==========================================================================
 *  TEXTO
 * ======================================================================= */
describe('separarPalavrasCamelCase', () => {

    test('separa camelCase e coloca a inicial em maiuscula', () => {
        expect(Auxiliares.separarPalavrasCamelCase('horasEstudo')).toBe('Horas Estudo');
        expect(Auxiliares.separarPalavrasCamelCase('notaProvaPorcentagem')).toBe('Nota Prova Porcentagem');
    });

    test('nao quebra com textos SEM letra minuscula (o bug antigo)', () => {
        // A versao anterior chamava .join() em cima de null e lancava
        // "Cannot read properties of null" para chaves como "ID" ou "2024".
        expect(() => Auxiliares.separarPalavrasCamelCase('ID')).not.toThrow();
        expect(() => Auxiliares.separarPalavrasCamelCase('2024')).not.toThrow();
        expect(() => Auxiliares.separarPalavrasCamelCase('___')).not.toThrow();
        expect(Auxiliares.separarPalavrasCamelCase('___')).toBe('___');
    });

    test('trata nulo e indefinido como texto vazio', () => {
        expect(Auxiliares.separarPalavrasCamelCase(null)).toBe('');
        expect(Auxiliares.separarPalavrasCamelCase(undefined)).toBe('');
    });

    test('separa numeros grudados na palavra', () => {
        expect(Auxiliares.separarPalavrasCamelCase('nota2024')).toBe('Nota 2024');
    });
});


describe('Pequenos utilitarios', () => {

    test('removeItensDuplicadosEmArrays preserva a ordem original', () => {
        expect(Auxiliares.removeItensDuplicadosEmArrays(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
        expect(Auxiliares.removeItensDuplicadosEmArrays(null)).toEqual([]);
    });

    test('criarMatrizMultiDimenssional cria N arrays INDEPENDENTES', () => {
        const matriz = Auxiliares.criarMatrizMultiDimenssional(3);
        matriz[0].push('x');
        expect(matriz).toHaveLength(3);
        expect(matriz[1]).toEqual([]);   // nao pode compartilhar a mesma referencia
    });

    test('obterUltimoValor devolve o ultimo item ou undefined', () => {
        expect(Auxiliares.obterUltimoValor([1, 2, 3])).toBe(3);
        expect(Auxiliares.obterUltimoValor([])).toBeUndefined();
        expect(Auxiliares.obterUltimoValor(null)).toBeUndefined();
    });

    test('tipoDeDado distingue array, objeto, nulo e primitivos', () => {
        expect(Auxiliares.tipoDeDado([1, 2])).toBe('array');
        expect(Auxiliares.tipoDeDado({ a: 1 })).toBe('objeto');
        expect(Auxiliares.tipoDeDado(null)).toBe('nulo');
        expect(Auxiliares.tipoDeDado('texto')).toBe('string');
        expect(Auxiliares.tipoDeDado(42)).toBe('number');
    });
});
