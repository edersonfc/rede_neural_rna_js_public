/*
 * Configuracao do Jest.
 *
 * As bibliotecas (jest, jsdom, jest-canvas-mock) existem SOMENTE para os
 * testes. A aplicacao em si -- painel, rede neural e animacao -- continua em
 * JavaScript puro e HTML simples, sem nenhuma dependencia externa.
 */
module.exports = {

    // Ambiente padrao: navegador simulado (jsdom), porque a maior parte do
    // codigo mexe em DOM e canvas. Os testes de matematica pura declaram
    // "@jest-environment node" no proprio arquivo.
    testEnvironment: 'jsdom',

    // Da um contexto 2D de mentira ao <canvas>, que o jsdom nao implementa.
    setupFiles: ['jest-canvas-mock'],

    testMatch: ['<rootDir>/testes/**/*.test.js'],

    collectCoverageFrom: [
        'motor_rede_neural.js',
        'animacao_rede_neural.js',
        'funcoes_auxiliares.js',
        'funcoes_principal_do_frontend.js',
        'rna_pml_js_puro.js'
    ],

    coverageDirectory: 'testes/cobertura',

    // Silencia o aviso do jsdom sobre navegacao/recursos externos.
    testEnvironmentOptions: {
        resources: 'usable'
    }
};
