/*
 * Ajudantes dos testes.
 *
 * Carrega o painel HTML e os arquivos JavaScript da aplicacao dentro do jsdom
 * da MESMA forma que o navegador faria: injetando tags <script>. Isso importa,
 * porque os arquivos da aplicacao sao scripts classicos que se comunicam por
 * variaveis globais -- se fossem carregados com require(), cada arquivo teria
 * seu proprio escopo e um nao enxergaria o outro.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const ARQUIVOS_DA_APLICACAO = [
    'funcoes_auxiliares.js',
    'motor_rede_neural.js',
    'animacao_rede_neural.js',
    'rna_pml_js_puro.js',
    'funcoes_principal_do_frontend.js'
];

function lerArquivo(nome) {
    return fs.readFileSync(path.join(RAIZ, nome), 'utf8');
}

/** Devolve so o conteudo de dentro de <body>, sem as tags <script>. */
function extrairCorpoDoPainel() {
    const html = lerArquivo('painel_rede_neural_pml.html');
    const casamento = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
    const corpo = casamento ? casamento[1] : html;
    return corpo.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/*
 * Instrumentacao para o relatorio de cobertura.
 *
 * Necessaria porque estes arquivos NAO sao carregados com require(): eles sao
 * injetados como <script>, exatamente como o navegador faz -- e so assim os
 * onclick="..." escritos direto no HTML encontram as funcoes globais. Sem este
 * passo, o Jest reportaria 0% de cobertura para eles mesmo estando cobertos
 * pelos testes de integracao.
 *
 * O resultado fica guardado em cache: o Babel roda uma vez por arquivo, e nao
 * uma vez por teste.
 */
const cacheDeCodigoInstrumentado = new Map();

function instrumentarParaCobertura(codigo, caminhoDoArquivo) {
    if (cacheDeCodigoInstrumentado.has(caminhoDoArquivo)) {
        return cacheDeCodigoInstrumentado.get(caminhoDoArquivo);
    }

    let resultado = codigo;
    try {
        const babel = require('@babel/core');
        resultado = babel.transformSync(codigo, {
            filename: caminhoDoArquivo,
            configFile: false,
            babelrc: false,
            plugins: [['babel-plugin-istanbul', { cwd: RAIZ }]]
        }).code;
    } catch (erro) {
        // Sem o Babel os testes continuam rodando; so a medicao de cobertura
        // destes dois arquivos deixa de aparecer no relatorio.
        resultado = codigo;
    }

    cacheDeCodigoInstrumentado.set(caminhoDoArquivo, resultado);
    return resultado;
}

/** Executa um arquivo da aplicacao como script global do jsdom. */
function carregarScript(nome) {
    const caminho = path.join(RAIZ, nome);
    const elemento = document.createElement('script');
    elemento.textContent = instrumentarParaCobertura(lerArquivo(nome), caminho);
    document.head.appendChild(elemento);
}

/**
 * Monta o painel completo: HTML + todos os scripts, na mesma ordem do
 * navegador. Devolve a lista de erros que os scripts tenham disparado, para os
 * testes poderem afirmar que a pagina carregou limpa.
 */
function montarPainelCompleto() {

    const errosDeScript = [];
    window.addEventListener('error', (evento) => {
        errosDeScript.push(evento.error || evento.message);
    });

    // O painel usa alert() para avisar o usuario; no jsdom ele nao existe.
    window.alert = jest.fn();

    document.body.innerHTML = extrairCorpoDoPainel();
    ARQUIVOS_DA_APLICACAO.forEach(carregarScript);

    return { errosDeScript };
}

/**
 * O jsdom nao calcula layout: getBoundingClientRect devolve tudo zerado.
 * Este ajudante finge um layout, dando a cada elemento uma posicao previsivel
 * para os testes de geometria conseguirem verificar as coordenadas.
 */
function simularLayout(posicoesPorId, retanguloDoCanvas) {

    const padraoCanvas = retanguloDoCanvas || { left: 100, top: 50, width: 600, height: 280 };

    Element.prototype.getBoundingClientRect = function () {
        if (this.id === 'meuCanvas') {
            return {
                left: padraoCanvas.left,
                top: padraoCanvas.top,
                right: padraoCanvas.left + padraoCanvas.width,
                bottom: padraoCanvas.top + padraoCanvas.height,
                width: padraoCanvas.width,
                height: padraoCanvas.height,
                x: padraoCanvas.left,
                y: padraoCanvas.top
            };
        }
        const posicao = posicoesPorId[this.id];
        if (posicao) {
            return {
                left: posicao.left,
                top: posicao.top,
                right: posicao.left + posicao.width,
                bottom: posicao.top + posicao.height,
                width: posicao.width,
                height: posicao.height,
                x: posicao.left,
                y: posicao.top
            };
        }
        return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
    };
}

module.exports = {
    RAIZ,
    ARQUIVOS_DA_APLICACAO,
    lerArquivo,
    extrairCorpoDoPainel,
    carregarScript,
    montarPainelCompleto,
    simularLayout
};
