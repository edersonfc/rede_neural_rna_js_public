

let dadosEntrada = [];


function treinarRedeNeural(
    arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA
    , arrayIdsIputsDeEntradaDadosParaTreinamentos
    , arrayIdsIputsDeDadosDaSaidaReal
    , chavesArray
) {

    let array_para_o_grafico_valores_reais;
    let array_para_o_grafico_valores_previstos;

    let imprimeNoLabelValoresReais = [];
    let imprimeNoLabelValoresPrevistos = [];

    //Concatenando os 2 arrays de Input de Entrada e de Saída
    const arrayInputsEntradaESaidaConcatenado = [...arrayIdsIputsDeEntradaDadosParaTreinamentos, ...arrayIdsIputsDeDadosDaSaidaReal];

    try {

        let dadosTextoEValores = [];
        let dadosSomenteValores = [];
        let arrayQueVaiMontarOObjetoDeDados = [];
        for (ww = 0; ww < arrayInputsEntradaESaidaConcatenado.length; ww++) {
            arrayQueVaiMontarOObjetoDeDados.push(chavesArray[ww] + "|" + document.getElementById(arrayInputsEntradaESaidaConcatenado[ww]).value);
            if (ww === (arrayInputsEntradaESaidaConcatenado.length - 1)) {
                let arrayChaves = [];
                let arrayValores = [];
                for (let i = 0; i < arrayQueVaiMontarOObjetoDeDados.length; i++) {
                    arrayChaves.push(arrayQueVaiMontarOObjetoDeDados[i].split('|')[0]);
                    arrayValores.push(arrayQueVaiMontarOObjetoDeDados[i].split('|')[1]);
                    if (i === (arrayQueVaiMontarOObjetoDeDados.length - 1)) {
                        dadosEntrada = criarObjetosComChavesEValores(arrayChaves, arrayValores);
                        // let aCopy = Object.assign({}, a);
                        //Capturando Para mapeamento 1
                        dadosTextoEValores.push(criarObjetosComChavesEValores(arrayChaves, arrayValores)[0]);

                        //ENVIANDO PARA NORMALIZAÇÃO DOS DADOS
                        dadosEntrada = normalizarDadosParaARedeNeural(dadosEntrada);

                        if (dadosEntrada.length === 0) {

                            //Capturando Para mapeamento 2
                            dadosSomenteValores.push(normalizarDadosParaARedeNeural(dadosEntrada)[0]);
                            //Enviando para o TextArea Objeto JSON com mapeamento de Valores
                            document.getElementById('idObjetoDeDadosDeEntradaNormalizado').innerHTML =
                                JSON.stringify(
                                    criarMapeamentoDosDadosNormalizadoJSON(
                                        dadosSomenteValores, dadosTextoEValores), null, 4
                                );

                        } else {

                            try {
                                let dadosSomenteValores = dadosEntrada;
                                let dadosTextoEValores = document.getElementById('idObjetoDeDadosDeEntrada').value;
                                //Enviando para o TextArea Objeto JSON com mapeamento de Valores
                                document.getElementById('idObjetoDeDadosDeEntradaNormalizado').innerHTML =
                                    JSON.stringify(
                                        criarMapeamentoDosDadosNormalizadoJSON(
                                            dadosSomenteValores, dadosTextoEValores), null, 4
                                    );
                            } catch (error) { alert("erro 76346 => " + error) }

                        }//if else

                    }//IF
                }//FOR

            }//IF

            //DOING
            if (ww === (arrayInputsEntradaESaidaConcatenado.length - 1)) {
                array_para_o_grafico_valores_reais = criarMatrizMultiDimenssional(dadosEntrada.length);
                array_para_o_grafico_valores_previstos = criarMatrizMultiDimenssional(dadosEntrada.length);
            }//IF

        }//FOR
    } catch (error) { alert("erro 5328=> " + error) }

    //-----MODELAGEM E DESIGN DA RN 
    // 1 ENTRADA Camada Configurações dos Valores Abaixo
    // Qtde Entradas Camada Entrada
    const qtdeDadosDeEntradasNaCamadaDeEntrada = Object.keys(dadosEntrada[0]).length;

    // Neurônios Camada de Entrada
    const neuroniosCamadaDeEntrada_qtde = parseInt(document.getElementById('entradaQtdeNeuronios').innerHTML);

    const neuroniosCamadaEscondida_qtde = arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA;
    var neuroniosCamadaEscondida_qtde2 = arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA;

    // 3 SAÍDA
    // Neurônios Camada de Saída Camada Configurações dos Valores Abaixo
    const neuroniosCamadaDeSaida_qtde = [parseInt(document.getElementById('saidaQtdeNeuronios').innerHTML)];
    
    //-----CONFIGURAÇÃO DOS HYPER PARÂMETROS
    // Defina o número de épocas que você deseja treinar a rede
    const numeroEpocas = parseInt(document.getElementById('id_epocasDeTreinamento').value);
    //Defina a taxa de aprendizagem
    // Defina a taxa de aprendizagem desejada (um valor pequeno, ex: 0.01)
    const taxaDeAprendizagem = parseFloat(document.getElementById('id_taxaDeAprendizagem').value);
    // Defina o valor do parâmetro de regularização (lambda)
    const lambda = parseFloat(document.getElementById('id_regulacaoLambda').value);

    //Array para Armazenamentos do Valores Reais e Previstos durante os Treinamentos
    let array_dos_valores_previsto_em_cada_epoca = [];
    let array_dos_valores_reais = [];

    //Array dos Pesos Iniciais
    let pesos_iniciais_entrada = [];
    let pesos_iniciais_escondida = [];
    let pesos_iniciais_saida = [];

    // Inicialização glorot (Xavier) dos pesos
    function inicializacaoGlorot(entrada, saida) {
        const limite = Math.sqrt(6 / (entrada + saida));
        return Math.random() * 2 * limite - limite;
    }

    // Gerando os pesos Iniciais Camada de Entrada
    function gerandoPesosIniciaisParaEssaCamada(entradasQtde, neuroniosQtde) {
        let array_pesos_iniciais = [];
        for (let j = 1; j <= entradasQtde; j++) {
            for (let k = 1; k <= neuroniosQtde; k++) {
                array_pesos_iniciais.push(inicializacaoGlorot(j, k));
            }
        }
        return array_pesos_iniciais;
    }

    //-----INICIALIZAÇÃO DOS PESOS DAS CAMADAS 
    //Camada de Entrada
    pesos_iniciais_entrada = gerandoPesosIniciaisParaEssaCamada(qtdeDadosDeEntradasNaCamadaDeEntrada, neuroniosCamadaDeEntrada_qtde);

    //Camadas Escondidas
    for (let i = 0; i < neuroniosCamadaEscondida_qtde.length; i++) {
        if (i === 0) {
            pesos_iniciais_escondida.push(gerandoPesosIniciaisParaEssaCamada((neuroniosCamadaDeEntrada_qtde * 1), neuroniosCamadaEscondida_qtde[i]));
        } else {
            pesos_iniciais_escondida.push(gerandoPesosIniciaisParaEssaCamada(neuroniosCamadaEscondida_qtde[(i - 1)], neuroniosCamadaEscondida_qtde[i]));
        }
    }

    //Camada de Saída 
    pesos_iniciais_saida = gerandoPesosIniciaisParaEssaCamada(neuroniosCamadaEscondida_qtde.pop(), neuroniosCamadaDeSaida_qtde[0]);

    //-----CRIAÇÃO DAS CAMADAS QUE SÃO REPRESENTADAS POR FUNÇÕES
    // CAMADAS DE ENTRADA DYNAMICAS
    function camadaEntradaNeuronio(entradas, numeroNeuroniosCamadaEntrada, pesos) {

        let saidasCamadaEntrada = [];
        for (let j = 0; j < numeroNeuroniosCamadaEntrada; j++) {
            let somaPonderada = 0;
            let startIndex = j * entradas.length; // Index inicial dos pesos para o neurônio j
            for (let k = 0; k < entradas.length; k++) {
                somaPonderada += entradas[k] * pesos[startIndex + k];
            }
            saidasCamadaEntrada.push(somaPonderada);
        }
        return saidasCamadaEntrada;
    }

    // CAMADAS ESCONDIDAS DYNAMICAS
    function camadaEscondidaNeuronio(entradas, numeroNeuroniosCamadaEntrada, pesos) {
        let saidasCamadaEscondida = [];
        for (let j = 0; j < numeroNeuroniosCamadaEntrada; j++) {
            let somaPonderada = 0;
            let startIndex = j * entradas.length; // Index inicial dos pesos para o neurônio j
            for (let k = 0; k < entradas.length; k++) {
                somaPonderada += entradas[k] * pesos[startIndex + k];
            }
            saidasCamadaEscondida.push(somaPonderada);
        }
        return saidasCamadaEscondida;
    }

    //CAMADA DE SAÍDA DINAMICAS
    function camadaSaidaNeuronio(entradas, numeroNeuroniosCamadaEntrada, pesos) {
        let saidasCamadaSaida = [];
        for (let j = 0; j < numeroNeuroniosCamadaEntrada; j++) {
            let somaPonderada = 0;
            // Index inicial dos pesos para o neurônio j
            let startIndex = j * entradas.length;
            for (let k = 0; k < entradas.length; k++) {
                somaPonderada += entradas[k] * pesos[startIndex + k];
            }
            saidasCamadaSaida.push(somaPonderada);
        }
        return saidasCamadaSaida;
    }


    // Função que Calcula o erro Meam Square Error (MSE) Abaixo
    function calcularErroMSE(saidaReal, saidaPredita) {
        // Verificar se há entradas válidas
        if (saidaReal.length === 0 || saidaPredita.length === 0 || saidaReal.length !== saidaPredita.length) {
            throw new Error('Entradas inválidas: as entradas devem ter o mesmo tamanho e não podem estar vazias.');
        }
        const n = saidaReal.length;
        const somaQuadrados = saidaReal.reduce((soma, real, i) => {
            const erro = real - saidaPredita[i];
            return soma + erro * erro;
        }, 0);

        const mse = somaQuadrados / n;
        // Verificar se o resultado é um número válido
        if (Number.isFinite(mse)) {
            return mse;
        } else {
            throw new Error('Erro no cálculo do MSE: resultado inválido.');
        }
    }

    // Função para atualizar os pesos com Regularização L2 Abaixo
    function atualizarPesosRegularizacaoL2(pesoAtual, gradiente, taxaDeAprendizagem, lambda) {
        // Calcula o termo de regularização L2
        const termoRegularizacao = lambda * pesoAtual;
        // Atualiza o peso considerando o gradiente, a taxa de aprendizagem e a regularização L2
        const novoPeso = pesoAtual - taxaDeAprendizagem * (gradiente + termoRegularizacao);
        return novoPeso;
    }

    let resultado_real;
    let resultado_previsto;
    let erro_quadratico_medio;

    const chaves = Object.keys(dadosEntrada[0]);

    for (let indice_objeto_json = 0; indice_objeto_json < dadosEntrada.length; indice_objeto_json++) {
        for (let epoca = 0; epoca < numeroEpocas; epoca++) {

            setTimeout(function () {

                let erroTotal = 0;
                let entrada = dadosEntrada[indice_objeto_json];

                const quantidade = parseInt(document.getElementById('idQtdeSaidaRede').value);
                let saidaEsperada = obterUltimosValores(entrada, quantidade);
                resultado_real = saidaEsperada;

                // Executa a rede neural 
                let entradasCamadaEntrada = [];
                for (let chave of chaves.slice(0, qtdeDadosDeEntradasNaCamadaDeEntrada)) { entradasCamadaEntrada.push(entrada[chave]); }

                //Calculos da Camada de Entrada
                let saidaCamadaEntrada = camadaEntradaNeuronio(entradasCamadaEntrada, neuroniosCamadaDeEntrada_qtde, pesos_iniciais_entrada);

                //Calculos da Camada Escondidas
                let saidaCamadaEscondida = [];
                for (let k = 0; k < neuroniosCamadaEscondida_qtde2.length; k++) {

                    if (k === 0) {
                        saidaCamadaEscondida = camadaEscondidaNeuronio(saidaCamadaEntrada, neuroniosCamadaEscondida_qtde2[k], pesos_iniciais_escondida[k]);
                    }
                    else {
                        saidaCamadaEscondida = camadaEscondidaNeuronio(saidaCamadaEscondida, neuroniosCamadaEscondida_qtde2[k], pesos_iniciais_escondida[k]);
                    }
                }//FOR

                //Calculos da Camada de Saída
                let saidaCamadaSaida = camadaSaidaNeuronio(saidaCamadaEscondida, neuroniosCamadaDeSaida_qtde[0], pesos_iniciais_saida);
                resultado_previsto = saidaCamadaSaida;

                //Armazenando cada saída do final de cada época para fazer o gráfico
                for (let ii = 0; ii < saidaCamadaSaida.length; ii++) {
                    array_dos_valores_previsto_em_cada_epoca.push(saidaCamadaSaida[ii].toFixed(0));
                    array_dos_valores_reais.push(saidaEsperada);
                }

                // Calcula o erro MSE (Mean Square Error)
                saidaEsperada = transformaZeroParaUmEmArray(saidaEsperada)
                saidaCamadaSaida = transformaZeroParaUmEmArray(saidaCamadaSaida)
                let erro = calcularErroMSE([saidaEsperada], [saidaCamadaSaida]);
                erroTotal += erro;
                erro_quadratico_medio = erroTotal;


                //----OBSERVAÇÃO IMPORTANTE BATER NESSE PONTO É O LUGAR QUE PODE GERAR ERROS
                //AQUI IMPRIME OS PESOS DE TODAS AS CAMADAS SEPARADA POR ESSES 3 console.log()
                // console.log(pesos_iniciais_entrada);
                // console.log(pesos_iniciais_escondida);
                // console.log(pesos_iniciais_saida);

                // Atualiza os pesos da Camada de Entrada
                let gradiente = saidaCamadaSaida - saidaEsperada;
                let incrementoDaEntrada = 0;
                for (let i = 0; i < pesos_iniciais_entrada.length; i++) {
                    incrementoDaEntrada++;
                    if (incrementoDaEntrada === (entradasCamadaEntrada.length)) { incrementoDaEntrada = 0; }
                    //                                                        pesoAtual                , gradiente                                             , taxaDeAprendizagem, lambda
                    pesos_iniciais_entrada[i] = atualizarPesosRegularizacaoL2(pesos_iniciais_entrada[i], gradiente * entradasCamadaEntrada[incrementoDaEntrada], taxaDeAprendizagem, lambda);
                }

                //Renderizando Pesos na Camada de Entrada
                let imprimirPesoCamadaEntrada = "";
                for (let q = 0; q < pesos_iniciais_entrada.length; q++) {
                    let value = pesos_iniciais_entrada[q].toString().replace(/,/g, '') + "\n";
                    value = value.replace(/,/g, '');
                    imprimirPesoCamadaEntrada += value;
                    document.getElementById('pesosEntrada').innerHTML = imprimirPesoCamadaEntrada;
                }

                // Atualiza os pesos das camadas escondida
                let incrementoDaPonteiroCamadaEscondida = 0;
                for (let i = 0; i < pesos_iniciais_escondida.length; i++) {
                    let subarrayPesos = pesos_iniciais_escondida[i];
                    for (let j = 0; j < subarrayPesos.length; j++) {
                        if (incrementoDaPonteiroCamadaEscondida === (saidaCamadaEntrada.length)) { incrementoDaPonteiroCamadaEscondida = 0; }
                        pesos_iniciais_escondida[i][j] = atualizarPesosRegularizacaoL2(pesos_iniciais_escondida[i][j], gradiente * saidaCamadaEntrada[incrementoDaPonteiroCamadaEscondida], taxaDeAprendizagem, lambda);
                    }
                }

                //Renderizando Pesos nas Camada Escondida
                let imprimirPesoCamadaEscondida = "";
                for (let q = 0; q < pesos_iniciais_escondida.length; q++) {
                    let subarrayPesos = pesos_iniciais_escondida[q];
                    for (let r = 0; r < subarrayPesos.length; r++) {
                        let value = pesos_iniciais_escondida[q][r].toString().replace(/,/g, '') + "\n";
                        value = value.replace(/,/g, '');
                        imprimirPesoCamadaEscondida += value;
                        document.getElementById('pesosEscondidos').innerHTML = imprimirPesoCamadaEscondida;
                    }
                }

                // Atualiza os pesos da Camada de Saída
                let incrementoPonteiroCamadaSaida = 0;
                for (let i = 0; i < pesos_iniciais_saida.length; i++) {
                    incrementoPonteiroCamadaSaida++;
                    if (incrementoPonteiroCamadaSaida === (saidaCamadaEscondida.length)) { incrementoPonteiroCamadaSaida = 0; }
                    //                                                      pesoAtual              , gradiente                                                      , taxaDeAprendizagem, lambda
                    pesos_iniciais_saida[i] = atualizarPesosRegularizacaoL2(pesos_iniciais_saida[i], gradiente * saidaCamadaEscondida[incrementoPonteiroCamadaSaida], taxaDeAprendizagem, lambda);
                }

                //Renderizando Pesos na Camada de Saída
                let imprimirPesoCamadaSaida = "";
                for (let q = 0; q < pesos_iniciais_saida.length; q++) {
                    let value = pesos_iniciais_saida[q].toString().replace(/,/g, '') + "\n";
                    value = value.replace(/,/g, '');
                    imprimirPesoCamadaSaida += value;
                    document.getElementById('pesosSaida').innerHTML = imprimirPesoCamadaSaida;
                }

                document.getElementById('resultadoReal').innerHTML = resultado_real;
                document.getElementById('resultadoPrevisto').innerHTML = resultado_previsto;
                document.getElementById('erroQuadraticoMedio').innerHTML = erro_quadratico_medio;
                document.getElementById('valoresDeSaidas').innerHTML = array_dos_valores_previsto_em_cada_epoca;

                if (dadosEntrada.length === 1) {
                    desenharGrafico(array_dos_valores_reais, array_dos_valores_previsto_em_cada_epoca, "grafico0");
                }//if

                if (dadosEntrada.length > 1) {
                    if (!document.getElementById('grafico' + indice_objeto_json)) {
                        let divContainerMultiplosGraficos = document.getElementById('divGraficoVariosGraficos');
                        let elementoGrafico0 = document.getElementById('grafico0');
                        var alturaGrafico0 = elementoGrafico0.offsetHeight;
                        let div = document.createElement("div");
                        div.id = 'grafico' + indice_objeto_json;
                        div.className = "divgraficos"
                        div.style.height = alturaGrafico0 + "px";
                        divContainerMultiplosGraficos.insertBefore(div, elementoGrafico0.nextSibling);

                    }//IF

                    array_para_o_grafico_valores_reais[indice_objeto_json].push(resultado_real);
                    array_para_o_grafico_valores_previstos[indice_objeto_json].push(resultado_previsto);

                    desenharGrafico(
                        array_para_o_grafico_valores_reais[indice_objeto_json],
                        array_para_o_grafico_valores_previstos[indice_objeto_json], "grafico" + indice_objeto_json
                    );

                    // Se for a última época, envia os dados para o gráfico e reseta o array
                    if ((epoca + 1) % numeroEpocas === 0) {
                        imprimeNoLabelValoresReais.push([array_para_o_grafico_valores_reais[indice_objeto_json]]);
                        imprimeNoLabelValoresPrevistos.push([array_para_o_grafico_valores_previstos[indice_objeto_json]]);
                        //DOING
                        if (indice_objeto_json === (dadosEntrada.length - 1)) {
                            let arrayParticionado = particionandoArrayUnicoEmVarios2(imprimeNoLabelValoresReais, dadosEntrada.length);
                            let arrayParticionado2 = particionandoArrayUnicoEmVarios2(imprimeNoLabelValoresPrevistos, dadosEntrada.length);
                            let arraysUltimosValoresReais = [];
                            let arraysUltimosValoresPrevistos = [];
                            for (let i = 0; i < arrayParticionado.length; i++) {

                                arraysUltimosValoresReais.push(arrayParticionado[i].toString().split(",").slice(-1)[0]);
                                arraysUltimosValoresPrevistos.push(parseFloat(arrayParticionado2[i].toString().split(",").slice(-1)[0]).toFixed(0));

                                if (i === (arrayParticionado.length - 1)) {
                                    document.getElementById('resultadoReal').innerHTML = arraysUltimosValoresReais;
                                    document.getElementById('resultadoPrevisto').innerHTML = arraysUltimosValoresPrevistos;
                                    document.getElementById('resultadoReal').textContent = substituirVirgulasPorBarrasVerticais(document.getElementById('resultadoReal'))
                                    document.getElementById('resultadoPrevisto').textContent = substituirVirgulasPorBarrasVerticais(document.getElementById('resultadoPrevisto'))
                                }//IF
                            }//FOR
                        }//IF
                    }//IF

                }//IF

            }, epoca * 9);

        }//FOR
        document.getElementById('pintarNeuronio').click();
    }//FOR


}

//Gerando o gráfico Abaixo usando a biblioteca do google
function inicializarGrafico() {
    google.charts.load('current', { 'packages': ['corechart'] });
    google.charts.setOnLoadCallback(desenharGrafico);
}

function desenharGrafico(array_dos_valores_reais, array_dos_valores_previsto_em_cada_epoca, idGrafico) {
    if (array_dos_valores_reais) {
        const dados = [['Época', 'Valores Previstos', 'Valores Reais']];
        for (let i = 0; i < array_dos_valores_previsto_em_cada_epoca.length; i++) {
            dados.push([
                i,
                parseFloat(array_dos_valores_previsto_em_cada_epoca[i]),
                parseFloat(array_dos_valores_reais[i])
            ]);
        }
        const data = google.visualization.arrayToDataTable(dados);
        const options = {
            title: 'Gráfico de Aprendizagem',
            curveType: 'function',
            legend: { position: 'bottom' },
            hAxis: { title: 'Época' },
            vAxis: { title: 'Valor' }
        };
        const chart = new google.visualization.LineChart(document.getElementById(idGrafico));
        chart.draw(data, options);
    }//IF
}


function desenharGrafico2(array_dos_valores_reais, array_dos_valores_previsto_em_cada_epoca) {
    const dados = [['Época', 'Valores Previstos', 'Valores Reais']];

    for (let i = 0; i < array_dos_valores_previsto_em_cada_epoca.length; i++) {
        dados.push([
            i,
            parseFloat(array_dos_valores_previsto_em_cada_epoca[i][0]),
            parseFloat(array_dos_valores_reais[i][0])
        ]);
    }
    const data = google.visualization.arrayToDataTable(dados);
    const options = {
        title: 'Gráfico de Aprendizagem',
        curveType: 'function',
        legend: { position: 'bottom' },
        hAxis: { title: 'Época' },
        vAxis: { title: 'Valor' }
    };

    const chart = new google.visualization.LineChart(document.getElementById('grafico'));
    chart.draw(data, options);
}


