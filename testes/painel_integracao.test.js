/**
 * Testes de INTEGRACAO do painel inteiro.
 *
 * Carrega o painel_rede_neural_pml.html de verdade dentro do jsdom e executa os
 * cinco arquivos JavaScript da aplicacao na mesma ordem do navegador. Depois
 * clica nos botoes e confere o que acontece na tela.
 */

const { montarPainelCompleto, simularLayout } = require('./ajudantes');

/** Coloca cada bolinha de neuronio numa posicao previsivel. */
function simularLayoutDosNeuronios() {
    const posicoes = {};
    const colunas = { Entrada: 60, Escondida: 300, Saida: 540 };

    document.querySelectorAll('.neuronioDesenhado').forEach((neuronio, indice) => {
        let x = colunas.Escondida;
        if (neuronio.id.indexOf('Entrada') !== -1) { x = colunas.Entrada; }
        if (neuronio.id.indexOf('Saida') !== -1) { x = colunas.Saida; }
        posicoes[neuronio.id] = { left: x, top: 60 + (indice % 6) * 34, width: 30, height: 30 };
    });

    simularLayout(posicoes);
}

let contexto;

beforeEach(() => {
    // O requestAnimationFrame fica de FORA dos timers falsos de proposito: o
    // laco da animacao roda para sempre, e acelera-lo junto com o treinamento
    // geraria dezenas de milhares de quadros dentro de um unico teste.
    // Aqui o treinamento e acelerado e a animacao e desenhada sob demanda.
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });

    contexto = montarPainelCompleto();

    // O animador e criado ligado (comportamento correto no navegador); nos
    // testes o laco fica parado e cada teste chama desenhar() quando precisa.
    if (TreinamentoRedeNeural.animador) { TreinamentoRedeNeural.animador.parar(); }
});

afterEach(() => {
    if (typeof pararTreinamento === 'function') { pararTreinamento(); }
    if (TreinamentoRedeNeural.animador) { TreinamentoRedeNeural.animador.parar(); }
    jest.clearAllTimers();
    jest.useRealTimers();
});


/* ==========================================================================
 *  CARREGAMENTO
 * ======================================================================= */
describe('Carregamento do painel', () => {

    test('a pagina carrega sem nenhum erro de JavaScript', () => {
        expect(contexto.errosDeScript).toEqual([]);
    });

    test('os modulos da aplicacao ficam disponiveis globalmente', () => {
        expect(typeof MotorRedeNeural).toBe('object');
        expect(typeof AnimadorRedeNeural).toBe('function');
        expect(typeof treinarRedeNeural).toBe('function');
        expect(typeof funcaoPrincipalDeRenderizacaoDaRedeNeural).toBe('function');
    });

    test('os elementos essenciais do painel existem', () => {
        [
            'containerDrawRNA', 'meuCanvas', 'botaoIniciar', 'id_botaoPausar', 'id_botaoParar',
            'id_taxaDeAprendizagem', 'id_regulacaoLambda', 'id_epocasDeTreinamento',
            'id_funcaoAtivacaoOculta', 'id_funcaoAtivacaoSaida', 'id_velocidadeTreinamento',
            'entradaQtdeNeuronios', 'saidaQtdeNeuronios', 'qtdeCamadasEscondidasMostrador',
            'resultadoReal', 'resultadoPrevisto', 'erroQuadraticoMedio',
            'pesosEntrada', 'pesosEscondidos', 'pesosSaida', 'graficoErro', 'grafico0'
        ].forEach((identificador) => {
            expect(document.getElementById(identificador)).not.toBeNull();
        });
    });

    test('o canvas fica ancorado no container do desenho', () => {
        // Sem "position: relative" no container, o canvas se alinha com a pagina
        // inteira -- foi essa a causa do desalinhamento das linhas na versao antiga.
        const container = document.getElementById('containerDrawRNA');
        const canvas = document.getElementById('meuCanvas');
        expect(container.style.position).toBe('relative');
        expect(canvas.style.position).toBe('absolute');
        expect(canvas.parentNode).toBe(container);
    });
});


/* ==========================================================================
 *  MONTAGEM DA ARQUITETURA PELOS BOTOES
 * ======================================================================= */
describe('Botoes que montam a arquitetura', () => {

    function contarNeuronios(prefixo) {
        return document.querySelectorAll(`[id^="${prefixo}"]`).length;
    }

    test('a arquitetura inicial e desenhada a partir do painel', () => {
        expect(document.getElementById('entradaQtdeNeuronios').textContent).toBe('3');
        expect(contarNeuronios('drawNeuronioEntrada')).toBe(3);
        expect(contarNeuronios('drawNeuronioEscondida')).toBe(4);
        expect(contarNeuronios('drawNeuronioSaida')).toBe(1);
    });

    test('adicionar neuronio na camada de entrada redesenha a rede', () => {
        adicionarOuRemoverNeuroniosCamadaDeEntrada('+');
        expect(document.getElementById('entradaQtdeNeuronios').textContent).toBe('4');
        expect(contarNeuronios('drawNeuronioEntrada')).toBe(4);
    });

    test('remover neuronio funciona, mas nunca desce abaixo de 1', () => {
        for (let i = 0; i < 10; i++) { adicionarOuRemoverNeuroniosCamadaDeEntrada('-'); }
        expect(document.getElementById('entradaQtdeNeuronios').textContent).toBe('1');
        expect(contarNeuronios('drawNeuronioEntrada')).toBe(1);
    });

    test('adicionar uma camada escondida cria o cartao e a coluna de neuronios', () => {
        criarComponentesDaCamadaEscondida('+');

        expect(document.getElementById('qtdeCamadasEscondidasMostrador').textContent).toBe('2');
        expect(document.getElementById('camadaEscondidaMostrador1')).not.toBeNull();
        expect(document.getElementById('containerNeuroniosCamadaEscondida1')).not.toBeNull();
        expect(contarNeuronios('drawNeuronioEscondida')).toBe(8);   // 4 + 4
    });

    test('remover camada escondida nunca deixa a rede sem nenhuma', () => {
        for (let i = 0; i < 5; i++) { criarComponentesDaCamadaEscondida('-'); }
        expect(document.getElementById('qtdeCamadasEscondidasMostrador').textContent).toBe('1');
        expect(document.getElementById('containerNeuroniosCamadaEscondida0')).not.toBeNull();
    });

    test('os ids dos neuronios escondidos nunca colidem entre camadas', () => {
        // Com o formato antigo ("Escondida" + camada + indice), a camada 1
        // neuronio 12 e a camada 11 neuronio 2 geravam o mesmo id "112".
        for (let i = 0; i < 3; i++) { criarComponentesDaCamadaEscondida('+'); }

        const identificadores = Array.from(document.querySelectorAll('[id^="drawNeuronioEscondida"]'))
            .map((elemento) => elemento.id);

        expect(new Set(identificadores).size).toBe(identificadores.length);
    });

    test('mais / menos neuronios numa camada escondida especifica', () => {
        const botaoAdicionar = document.getElementById('escondidaQtdeNeuronioxAdicionar0');
        adicionarOuRemoverNeuroniosCamadaEscondida(botaoAdicionar);

        expect(document.getElementById('qtdeNeuronioCamadaEscondida0').textContent).toBe('5');
        expect(contarNeuronios('drawNeuronioEscondida')).toBe(5);

        const botaoRemover = document.getElementById('escondidaQtdeNeuronioxRemover0');
        adicionarOuRemoverNeuroniosCamadaEscondida(botaoRemover);
        expect(document.getElementById('qtdeNeuronioCamadaEscondida0').textContent).toBe('4');
    });

    test('as bolinhas encolhem para caber quando ha muitos neuronios', () => {
        const grande = calcularTamanhoDoNeuronio(4, 250);
        const apertado = calcularTamanhoDoNeuronio(40, 250);

        expect(grande).toBe(30);                 // nunca passa de 30px
        expect(apertado).toBeLessThan(grande);
        expect(apertado).toBeGreaterThanOrEqual(4); // nunca some por completo
    });

    test('a camada de saida acompanha a quantidade de colunas de saida', () => {
        adicionarOuRemoverNeuroniosCamadaDeSaida('+');
        expect(document.getElementById('saidaQtdeNeuronios').textContent).toBe('2');
        expect(document.getElementById('idQtdeSaidaRede').value).toBe('2');
        expect(contarNeuronios('drawNeuronioSaida')).toBe(2);
    });
});


/* ==========================================================================
 *  CAMPOS DE ENTRADA DE DADOS
 * ======================================================================= */
describe('Campos de entrada de dados', () => {

    test('cria um campo para cada coluna do JSON', () => {
        ['horasEstudo', 'horasSono', 'simuladoPorcentagem', 'notaProvaPorcentagem']
            .forEach((chave) => expect(document.getElementById(chave)).not.toBeNull());
        expect(document.getElementById('idQtdeChaves').textContent).toBe('4');
    });

    test('a ULTIMA coluna vira a saida e as demais viram entradas', () => {
        expect(arrayIdsIputsDeEntradaDadosParaTreinamentos)
            .toEqual(['horasEstudo', 'horasSono', 'simuladoPorcentagem']);
        expect(arrayIdsIputsDeDadosDaSaidaReal).toEqual(['notaProvaPorcentagem']);
    });

    test('preenche os campos com todos os registros separados por virgula', () => {
        const campo = document.getElementById('horasEstudo');
        expect(campo.value).toBe('57,25,15,40,5');
    });

    test('le o texto que o usuario DIGITOU na caixa de JSON', () => {
        // Em <textarea>, .textContent devolve o conteudo original do HTML e
        // ignora o que foi digitado depois -- por isso o codigo usa .value.
        const caixa = document.getElementById('idObjetoDeDadosDeEntrada');
        caixa.value = JSON.stringify([{ a: 1, b: 2, alvo: 3 }, { a: 4, b: 5, alvo: 6 }]);

        criandoElementoDeEntradaDeDados();

        expect(document.getElementById('idQtdeChaves').textContent).toBe('3');
        expect(document.getElementById('a')).not.toBeNull();
        expect(document.getElementById('a').value).toBe('1,4');
        expect(arrayIdsIputsDeDadosDaSaidaReal).toEqual(['alvo']);
    });

    test('avisa em vez de quebrar quando o JSON esta invalido', () => {
        const caixa = document.getElementById('idObjetoDeDadosDeEntrada');
        caixa.value = '{isto nao e json}';

        expect(() => criandoElementoDeEntradaDeDados()).not.toThrow();
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('JSON'));
    });

    test('nao deixa a rede ficar sem nenhuma coluna de entrada', () => {
        const caixa = document.getElementById('idObjetoDeDadosDeEntrada');
        caixa.value = JSON.stringify([{ x: 1, y: 2 }]);
        document.getElementById('idQtdeSaidaRede').value = '5';   // mais saidas que colunas

        criandoElementoDeEntradaDeDados();

        expect(arrayIdsIputsDeEntradaDadosParaTreinamentos.length).toBeGreaterThanOrEqual(1);
        expect(arrayIdsIputsDeDadosDaSaidaReal.length).toBeGreaterThanOrEqual(1);
    });
});


/* ==========================================================================
 *  MONTAGEM DAS AMOSTRAS A PARTIR DOS CAMPOS
 * ======================================================================= */
describe('montarAmostrasAPartirDoPainel', () => {

    test('um valor por campo gera uma amostra', () => {
        document.getElementById('horasEstudo').value = '10';
        document.getElementById('horasSono').value = '8';
        document.getElementById('simuladoPorcentagem').value = '70';
        document.getElementById('notaProvaPorcentagem').value = '75';

        const amostras = montarAmostrasAPartirDoPainel(
            ['horasEstudo', 'horasSono', 'simuladoPorcentagem'], ['notaProvaPorcentagem']);

        expect(amostras).toEqual([
            { horasEstudo: 10, horasSono: 8, simuladoPorcentagem: 70, notaProvaPorcentagem: 75 }
        ]);
    });

    test('valores separados por virgula geram uma amostra cada', () => {
        document.getElementById('horasEstudo').value = '10,20,30';
        document.getElementById('notaProvaPorcentagem').value = '1,2,3';

        const amostras = montarAmostrasAPartirDoPainel(['horasEstudo'], ['notaProvaPorcentagem']);

        expect(amostras).toHaveLength(3);
        expect(amostras[2]).toEqual({ horasEstudo: 30, notaProvaPorcentagem: 3 });
    });

    test('coluna mais curta repete o ultimo valor em vez de gerar undefined', () => {
        document.getElementById('horasEstudo').value = '10,20,30';
        document.getElementById('notaProvaPorcentagem').value = '7';

        const amostras = montarAmostrasAPartirDoPainel(['horasEstudo'], ['notaProvaPorcentagem']);

        expect(amostras).toHaveLength(3);
        amostras.forEach((amostra) => expect(amostra.notaProvaPorcentagem).toBe(7));
    });

    test('converterTextoEmValor entende numeros, virgula decimal e texto', () => {
        expect(converterTextoEmValor(' 42 ')).toBe(42);
        expect(converterTextoEmValor('3,5')).toBeCloseTo(3.5, 10);
        expect(converterTextoEmValor('-1.25')).toBeCloseTo(-1.25, 10);
        expect(converterTextoEmValor('Excelente')).toBe('Excelente');
        expect(converterTextoEmValor('')).toBe(0);
    });

    test('lerNumeroDoCampo respeita o minimo, o maximo e o valor padrao', () => {
        document.getElementById('id_taxaDeAprendizagem').value = 'abc';
        expect(lerNumeroDoCampo('id_taxaDeAprendizagem', 0.5, 0, 1)).toBe(0.5);

        document.getElementById('id_taxaDeAprendizagem').value = '99';
        expect(lerNumeroDoCampo('id_taxaDeAprendizagem', 0.5, 0, 1)).toBe(1);

        document.getElementById('id_taxaDeAprendizagem').value = '-99';
        expect(lerNumeroDoCampo('id_taxaDeAprendizagem', 0.5, 0, 1)).toBe(0);

        expect(lerNumeroDoCampo('campo_que_nao_existe', 7)).toBe(7);
    });
});


/* ==========================================================================
 *  O TREINAMENTO DE PONTA A PONTA
 * ======================================================================= */
describe('Treinamento pelo painel', () => {

    beforeEach(() => {
        document.getElementById('id_epocasDeTreinamento').value = '5';
        document.getElementById('id_velocidadeTreinamento').value = '100';
        aplicarVelocidadeDoPainel();
    });

    test('clicar em Iniciar monta a rede com a arquitetura do painel', () => {
        document.getElementById('botaoIniciar').click();

        const rede = TreinamentoRedeNeural.rede;
        expect(rede).not.toBeNull();
        // 3 colunas de entrada -> 3 neuronios de entrada -> 4 ocultos -> 1 saida
        expect(rede.camadas).toEqual([3, 3, 4, 1]);
        expect(TreinamentoRedeNeural.situacao).toBe('treinando');
    });

    test('o treinamento roda passo a passo e termina sozinho', () => {
        document.getElementById('botaoIniciar').click();
        expect(TreinamentoRedeNeural.situacao).toBe('treinando');

        jest.advanceTimersByTime(20000);

        expect(TreinamentoRedeNeural.situacao).toBe('parado');
        expect(TreinamentoRedeNeural.epocaAtual).toBe(5);
    });

    test('NENHUMA epoca dispara antes da hora (o bug dos setTimeout em lote)', () => {
        // A versao anterior agendava todos os setTimeout de todas as epocas de
        // todas as amostras de uma vez, com atraso baseado so na epoca. Assim,
        // a epoca 3 da amostra 1 e a epoca 3 da amostra 2 disparavam no mesmo
        // instante e embaralhavam os pesos. Aqui existe um unico temporizador
        // vivo por vez.
        document.getElementById('id_epocasDeTreinamento').value = '50';
        document.getElementById('botaoIniciar').click();

        expect(jest.getTimerCount()).toBe(1);

        jest.advanceTimersByTime(100);
        expect(jest.getTimerCount()).toBeLessThanOrEqual(1);
    });

    test('o erro CAI ao longo do treinamento (a rede aprende de verdade)', () => {
        document.getElementById('id_epocasDeTreinamento').value = '400';
        document.getElementById('id_taxaDeAprendizagem').value = '0.3';
        document.getElementById('botaoIniciar').click();

        jest.advanceTimersByTime(200000);

        const historico = TreinamentoRedeNeural.historicoErroGeral;
        expect(historico.length).toBeGreaterThan(10);

        const primeiros = historico.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const ultimos = historico.slice(-5).reduce((a, b) => a + b, 0) / 5;
        expect(ultimos).toBeLessThan(primeiros);
    });

    test('o resultado previsto se aproxima do real na escala ORIGINAL dos dados', () => {
        document.getElementById('id_epocasDeTreinamento').value = '600';
        document.getElementById('id_taxaDeAprendizagem').value = '0.3';
        document.getElementById('botaoIniciar').click();

        jest.advanceTimersByTime(300000);

        const real = parseFloat(document.getElementById('resultadoReal').textContent);
        const previsto = parseFloat(document.getElementById('resultadoPrevisto').textContent);

        // As notas do conjunto de exemplo vao de 55 a 97: o previsto tem que
        // sair nessa faixa, e nao em 0..1 (que e a escala interna da rede).
        expect(real).toBeGreaterThan(50);
        expect(previsto).toBeGreaterThan(30);
        expect(Math.abs(previsto - real)).toBeLessThan(20);
    });

    test('os pesos aparecem nas tres caixas de texto', () => {
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(1000);

        expect(document.getElementById('pesosEntrada').value.length).toBeGreaterThan(10);
        expect(document.getElementById('pesosEscondidos').value.length).toBeGreaterThan(10);
        expect(document.getElementById('pesosSaida').value.length).toBeGreaterThan(10);
        expect(document.getElementById('pesosEntrada').value).toContain('vies');
    });

    test('os dados normalizados aparecem na caixa correspondente', () => {
        document.getElementById('botaoIniciar').click();

        const texto = document.getElementById('idObjetoDeDadosDeEntradaNormalizado').value;
        const conteudo = JSON.parse(texto);

        expect(conteudo).toHaveProperty('minimosEMaximos');
        expect(conteudo).toHaveProperty('amostrasNormalizadas');
        conteudo.amostrasNormalizadas.forEach((amostra) => {
            Object.values(amostra).forEach((valor) => {
                expect(valor).toBeGreaterThanOrEqual(0);
                expect(valor).toBeLessThanOrEqual(1);
            });
        });
    });

    test('a funcao de ativacao escolhida no painel e a que a rede usa', () => {
        document.getElementById('id_funcaoAtivacaoOculta').value = 'relu';
        document.getElementById('id_funcaoAtivacaoSaida').value = 'sigmoide';

        document.getElementById('botaoIniciar').click();

        expect(TreinamentoRedeNeural.rede.ativacaoOculta).toBe('relu');
        expect(TreinamentoRedeNeural.rede.ativacaoSaida).toBe('sigmoide');
    });

    test('clicar em Iniciar de novo reinicia em vez de rodar dois treinos juntos', () => {
        document.getElementById('id_epocasDeTreinamento').value = '100';
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(200);

        const primeiraRede = TreinamentoRedeNeural.rede;
        document.getElementById('botaoIniciar').click();

        expect(TreinamentoRedeNeural.rede).not.toBe(primeiraRede);
        expect(TreinamentoRedeNeural.epocaAtual).toBe(0);
        expect(jest.getTimerCount()).toBe(1);
    });
});


/* ==========================================================================
 *  PAUSAR, CONTINUAR E PARAR
 * ======================================================================= */
describe('Controles de pausa e parada', () => {

    beforeEach(() => {
        document.getElementById('id_epocasDeTreinamento').value = '2000';
        document.getElementById('id_velocidadeTreinamento').value = '100';
        aplicarVelocidadeDoPainel();
    });

    test('pausar congela o treinamento no lugar', () => {
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(300);

        document.getElementById('id_botaoPausar').click();
        expect(TreinamentoRedeNeural.situacao).toBe('pausado');

        const epocaAoPausar = TreinamentoRedeNeural.epocaAtual;
        jest.advanceTimersByTime(5000);
        expect(TreinamentoRedeNeural.epocaAtual).toBe(epocaAoPausar);
    });

    test('continuar retoma de onde parou', () => {
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(300);
        document.getElementById('id_botaoPausar').click();

        const epocaAoPausar = TreinamentoRedeNeural.epocaAtual;
        document.getElementById('id_botaoPausar').click();

        expect(TreinamentoRedeNeural.situacao).toBe('treinando');
        jest.advanceTimersByTime(1000);
        expect(TreinamentoRedeNeural.epocaAtual).toBeGreaterThan(epocaAoPausar);
    });

    test('parar encerra e nao deixa temporizador vivo', () => {
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(300);

        document.getElementById('id_botaoParar').click();

        expect(TreinamentoRedeNeural.situacao).toBe('parado');
        expect(jest.getTimerCount()).toBe(0);

        const epocaAoParar = TreinamentoRedeNeural.epocaAtual;
        jest.advanceTimersByTime(10000);
        expect(TreinamentoRedeNeural.epocaAtual).toBe(epocaAoParar);
    });

    test('mudar a arquitetura durante o treino para o treino antes de redesenhar', () => {
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(200);

        adicionarOuRemoverNeuroniosCamadaDeEntrada('+');

        expect(TreinamentoRedeNeural.situacao).toBe('parado');
        expect(jest.getTimerCount()).toBe(0);
    });

    test('os botoes ficam habilitados e desabilitados na hora certa', () => {
        const pausar = document.getElementById('id_botaoPausar');
        const parar = document.getElementById('id_botaoParar');

        expect(pausar.disabled).toBe(true);
        expect(parar.disabled).toBe(true);

        document.getElementById('botaoIniciar').click();
        expect(pausar.disabled).toBe(false);
        expect(parar.disabled).toBe(false);

        parar.click();
        expect(pausar.disabled).toBe(true);
        expect(parar.disabled).toBe(true);
    });
});


/* ==========================================================================
 *  VELOCIDADE
 * ======================================================================= */
describe('Controle de velocidade', () => {

    test('velocidade baixa deixa um passo bem lento, para dar para acompanhar', () => {
        document.getElementById('id_velocidadeTreinamento').value = '1';
        aplicarVelocidadeDoPainel();

        expect(TreinamentoRedeNeural.atrasoEntrePassos).toBeGreaterThan(1000);
        expect(TreinamentoRedeNeural.passosPorLote).toBe(1);
        expect(document.getElementById('id_rotuloVelocidade').textContent).toBe('passo a passo');
    });

    test('velocidade maxima roda varios passos por lote', () => {
        document.getElementById('id_velocidadeTreinamento').value = '100';
        aplicarVelocidadeDoPainel();

        expect(TreinamentoRedeNeural.atrasoEntrePassos).toBeLessThan(50);
        expect(TreinamentoRedeNeural.passosPorLote).toBeGreaterThan(1);
        expect(document.getElementById('id_rotuloVelocidade').textContent).toBe('rapido');
    });

    test('o ciclo da animacao acompanha a velocidade, com um minimo legivel', () => {
        document.getElementById('id_velocidadeTreinamento').value = '100';
        aplicarVelocidadeDoPainel();
        expect(TreinamentoRedeNeural.animador.duracaoCiclo).toBeGreaterThanOrEqual(280);

        document.getElementById('id_velocidadeTreinamento').value = '1';
        aplicarVelocidadeDoPainel();
        expect(TreinamentoRedeNeural.animador.duracaoCiclo).toBeGreaterThan(1000);
    });
});


/* ==========================================================================
 *  A ANIMACAO LIGADA AO TREINAMENTO
 * ======================================================================= */
describe('Animacao ligada ao treinamento de verdade', () => {

    test('o animador e criado junto com o desenho da rede', () => {
        expect(TreinamentoRedeNeural.animador).not.toBeNull();
        expect(TreinamentoRedeNeural.animador.canvas.id).toBe('meuCanvas');
    });

    test('as bolinhas do DOM viram ancoras invisiveis (o canvas as desenha)', () => {
        const neuronios = document.querySelectorAll('.neuronioDesenhado');
        expect(neuronios.length).toBeGreaterThan(0);
        neuronios.forEach((neuronio) => expect(neuronio.style.visibility).toBe('hidden'));
    });

    test('a geometria enxerga todas as camadas, na ordem certa', () => {
        criarComponentesDaCamadaEscondida('+');
        const camadas = montarDescricaoDasCamadas();

        expect(camadas.map((camada) => camada.tipo))
            .toEqual(['entrada', 'escondida', 'escondida', 'saida']);
        expect(camadas[0].ids).toHaveLength(3);
        expect(camadas[3].ids).toHaveLength(1);
    });

    test('cada passo de treinamento chega no animador com os numeros REAIS', () => {
        simularLayoutDosNeuronios();
        const animador = TreinamentoRedeNeural.animador;
        const registrar = jest.spyOn(animador, 'registrarPasso');

        document.getElementById('id_epocasDeTreinamento').value = '3';
        document.getElementById('id_velocidadeTreinamento').value = '100';
        aplicarVelocidadeDoPainel();
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(20000);

        expect(registrar).toHaveBeenCalled();

        const passo = registrar.mock.calls[0][0];
        // A rede e 3 -> 3 -> 4 -> 1, entao ha 4 camadas de ativacao.
        expect(passo.ativacoes.map((camada) => camada.length)).toEqual([3, 3, 4, 1]);
        expect(passo.deltas.map((camada) => camada.length)).toEqual([3, 3, 4, 1]);
        expect(Number.isFinite(passo.erro)).toBe(true);
        expect(passo.totalEpocas).toBe(3);
    });

    test('o animador desenha usando as ativacoes que o treinamento produziu', () => {
        simularLayoutDosNeuronios();
        const animador = TreinamentoRedeNeural.animador;
        animador.atualizarGeometria();

        document.getElementById('id_epocasDeTreinamento').value = '2';
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(5000);

        animador.mostrarValores = true;
        animador.fase = 0.3;

        const escrever = jest.spyOn(animador.contexto, 'fillText');
        expect(() => animador.desenhar()).not.toThrow();

        const textos = escrever.mock.calls.map((chamada) => String(chamada[0]));
        // O valor escrito dentro do primeiro neuronio tem que ser o mesmo que
        // o motor calculou para aquele neuronio.
        const primeiraAtivacao = animador.passoAtual.ativacoes[1][0];
        expect(textos).toContain(primeiraAtivacao.toFixed(2));
    });

    test('desligar a animacao para o desenho, ligar volta a desenhar', () => {
        const animador = TreinamentoRedeNeural.animador;
        const interruptor = document.getElementById('id_animacaoLigada');

        interruptor.checked = false;
        interruptor.dispatchEvent(new Event('change'));
        expect(animador.ligado).toBe(false);
        expect(animador.rodando).toBe(false);

        interruptor.checked = true;
        interruptor.dispatchEvent(new Event('change'));
        expect(animador.ligado).toBe(true);
    });

    test('os interruptores de valores e pesos chegam no animador', () => {
        const animador = TreinamentoRedeNeural.animador;

        const valores = document.getElementById('id_mostrarValores');
        valores.checked = false;
        valores.dispatchEvent(new Event('change'));
        expect(animador.mostrarValores).toBe(false);

        const pesos = document.getElementById('id_mostrarPesos');
        pesos.checked = true;
        pesos.dispatchEvent(new Event('change'));
        expect(animador.mostrarPesos).toBe(true);
    });

    test('"Limpar Canvas" para tudo e apaga o desenho', () => {
        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(200);

        document.getElementById('limparCanvas').click();

        expect(TreinamentoRedeNeural.situacao).toBe('parado');
        expect(TreinamentoRedeNeural.animador.passoAtual).toBeNull();
        expect(TreinamentoRedeNeural.animador.rodando).toBe(false);
    });

    test('"Testar Conexoes" anima sem treinar', () => {
        simularLayoutDosNeuronios();
        document.getElementById('pintarNeuronio').click();

        const animador = TreinamentoRedeNeural.animador;
        expect(animador.emTreinamento).toBe(false);
        expect(TreinamentoRedeNeural.situacao).toBe('parado');
        expect(() => animador.desenhar()).not.toThrow();
    });

    test('redesenhar a arquitetura recria o canvas e reancora o animador', () => {
        const canvasAntigo = document.getElementById('meuCanvas');
        adicionarOuRemoverNeuroniosCamadaDeEntrada('+');

        const canvasNovo = document.getElementById('meuCanvas');
        expect(canvasNovo).not.toBe(canvasAntigo);
        expect(TreinamentoRedeNeural.animador.canvas).toBe(canvasNovo);
    });
});


/* ==========================================================================
 *  ROBUSTEZ
 * ======================================================================= */
describe('Robustez do painel', () => {

    test('funciona mesmo sem a biblioteca de graficos do Google (sem internet)', () => {
        expect(typeof google).toBe('undefined');

        document.getElementById('id_epocasDeTreinamento').value = '3';
        document.getElementById('id_velocidadeTreinamento').value = '100';
        aplicarVelocidadeDoPainel();

        expect(() => {
            document.getElementById('botaoIniciar').click();
            jest.advanceTimersByTime(20000);
        }).not.toThrow();

        expect(TreinamentoRedeNeural.situacao).toBe('parado');
        expect(TreinamentoRedeNeural.epocaAtual).toBe(3);
    });

    test('avisa e para quando a taxa de aprendizagem faz os numeros explodirem', () => {
        document.getElementById('id_taxaDeAprendizagem').value = '1e12';
        document.getElementById('id_epocasDeTreinamento').value = '200';
        document.getElementById('id_funcaoAtivacaoOculta').value = 'relu';
        document.getElementById('id_funcaoAtivacaoSaida').value = 'linear';
        document.getElementById('id_velocidadeTreinamento').value = '100';
        aplicarVelocidadeDoPainel();

        document.getElementById('botaoIniciar').click();
        jest.advanceTimersByTime(30000);

        // Ou terminou normalmente, ou parou avisando -- nunca fica preso
        // cuspindo NaN na tela para sempre.
        expect(TreinamentoRedeNeural.situacao).toBe('parado');
        expect(document.getElementById('resultadoPrevisto').textContent).not.toContain('NaN');
    });

    test('mostrar e esconder as caixas de configuracao', () => {
        mostrar_e_esconder_div_configuracao_entrada('block');
        expect(document.getElementById('id_div_configuracao_entrada_de_dados').style.display).toBe('block');
        expect(document.getElementById('fundoCaixaDeDialogBlackTranslucido_id').style.display).toBe('block');

        mostrar_e_esconder_div_configuracao_entrada('none');
        expect(document.getElementById('id_div_configuracao_entrada_de_dados').style.display).toBe('none');
    });

    test('a seta da caixa de dados normalizados alterna corretamente', () => {
        const icone = document.getElementById('icon_arrow');
        const caixa = document.getElementById('id_div_configuracao_entrada_de_dados_normalizado');

        toggleIconAndCallFunction(null);   // estava fechada -> abre
        expect(caixa.style.display).toBe('block');
        expect(icone.classList.contains('fa-arrow-left')).toBe(true);

        toggleIconAndCallFunction(null);   // fecha de novo
        expect(caixa.style.display).toBe('none');
        expect(icone.classList.contains('fa-arrow-right')).toBe(true);
    });

    test('a caixa de JSON marca em vermelho quando o texto esta invalido', () => {
        const caixa = document.getElementById('idObjetoDeDadosDeEntrada');

        caixa.value = '{quebrado';
        caixa.dispatchEvent(new Event('blur'));
        expect(caixa.style.border).toContain('#cf3535');

        caixa.value = '[{"a":1}]';
        caixa.dispatchEvent(new Event('blur'));
        expect(caixa.style.border).not.toContain('#cf3535');
    });

    test('validar o JSON no blur nao dispara alert a cada tecla digitada', () => {
        // A versao anterior validava no evento "input" e abria um alert() a
        // cada caractere digitado, tornando a caixa impossivel de editar.
        const caixa = document.getElementById('idObjetoDeDadosDeEntrada');
        window.alert.mockClear();

        caixa.value = '[{"a":';
        caixa.dispatchEvent(new Event('input'));

        expect(window.alert).not.toHaveBeenCalled();
    });
});
