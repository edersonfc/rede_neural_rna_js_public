
//Variáveis globais Abaixo
let arrayIdsIputsDeEntradaDadosParaTreinamentos = [];
let arrayIdsIputsDeDadosDaSaidaReal = [];
let arrayDeDivsDeDadosDeEntradas = [];
let chavesArray = [];
let array_neuronio_draw_saidas_id_global = [];
let qtdeDeConecoesEntreEntradaEEscondida = 0;
let qtdeDeConecoesEntreEscondidaESaida = 0;
let divPintarDelayTimer = 1;
let delayTimerPintarSetas = 1;
let neuroniosNaCamadaDeEntrada = parseInt(document.getElementById('entradaQtdeNeuronios').textContent);
//O Size representa a quantidade de camadas escondidas e os numeros são a quantidade de neuronios dentro dela
let qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada = [2];
let neuroniosNaCamadaDeSaida = parseInt(document.getElementById('saidaQtdeNeuronios').textContent);
let clicar_botao_pintar_global;


//Carregando valores txt na estrutura json para o txtArea
const textarea = document.getElementById('idObjetoDeDadosDeEntrada');
textarea.addEventListener('input', function () {
    const newValue = textarea.value;
    try {
        const parsedValue = JSON.parse(newValue);
        document.getElementById('idObjetoDeDadosDeEntrada').innerHTML =
            JSON.stringify(parsedValue, null, 4);
    } catch (error) {
        alert('Erro ao analisar o JSON: ' + error.message);
    }
});


//Criando os elementos da entrada de dados para a rede neural chamando imediatamente chamando essa função
function criandoElementoDeEntradaDeDados() {

    let dadosVindoDoTextAreaEntradaDeDados = document.getElementById('idObjetoDeDadosDeEntrada').textContent;
    chavesArray = extrairNomesChavesArrayDeJson(JSON.parse(dadosVindoDoTextAreaEntradaDeDados));
    document.getElementById('idQtdeChaves').innerHTML = chavesArray.length.toString();

    let QtdeSaidaRede = parseInt(document.getElementById('idQtdeSaidaRede').value);

    if (arrayDeDivsDeDadosDeEntradas.length > 0) {
        for (let i = 0; i < arrayDeDivsDeDadosDeEntradas.length; i++) {
            document.getElementById(arrayDeDivsDeDadosDeEntradas[i]).remove();
            if (i === (arrayDeDivsDeDadosDeEntradas.length - 1)) {
                arrayIdsIputsDeEntradaDadosParaTreinamentos = [];
                arrayIdsIputsDeDadosDaSaidaReal = [];
                arrayDeDivsDeDadosDeEntradas = [];
            }
        }
    }

    const id_divEntradaDeDadosPrincipalContainer = document.getElementById('id_divEntradaDeDadosPrincipalContainer');
    const id_div_dados_de_entrada_input = document.getElementById('id_div_dados_de_entrada_input');
    const id_label_saida = document.getElementById('id_label_saida');


    for (let i = 0; i < chavesArray.length; i++) {

        // Cria o elemento div
        let div = document.createElement("div");
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.alignItems = "center";
        div.style.color = "white";
        div.style.width = "90%";
        div.style.gap = "5px";
        div.id = "id_divsDeDadosDeEntradas" + i;

        arrayDeDivsDeDadosDeEntradas.push("id_divsDeDadosDeEntradas" + i);

        // Cria o elemento label
        let label = document.createElement("label");
        label.style.textAlign = "center";
        label.style.fontSize = "13px";
        label.textContent = separarPalavrasCamelCase(chavesArray[i]);

        // Cria o elemento input
        let input = document.createElement("input");
        input.id = chavesArray[i];
        input.style.textAlign = "center";
        input.style.width = "100%";
        input.style.fontWeight = "bold";
        input.style.color = "#063298";

        div.appendChild(label);
        div.appendChild(input);

        if (i < (chavesArray.length - QtdeSaidaRede)) {
            arrayIdsIputsDeEntradaDadosParaTreinamentos.push(input.id);
            // Insere o elemento antes do elemento id_div_dados_de_entrada_input
            id_divEntradaDeDadosPrincipalContainer.insertBefore(div, id_div_dados_de_entrada_input);
        } else if (i >= (chavesArray.length - QtdeSaidaRede)) {
            arrayIdsIputsDeDadosDaSaidaReal.push(input.id);
            // Insere o elemento antes do elemento id_label_saida
            id_divEntradaDeDadosPrincipalContainer.insertBefore(div, id_div_dados_de_entrada_input.nextSibling);
        }

    }

    if (document.getElementById('id_botaoUsarSoUmIndice').innerText === 'Sim') {
        for (let i = 0; i < arrayIdsIputsDeEntradaDadosParaTreinamentos.length; i++) {
            document.getElementById(arrayIdsIputsDeEntradaDadosParaTreinamentos[i]).value =
                JSON.parse(dadosVindoDoTextAreaEntradaDeDados)[0][arrayIdsIputsDeEntradaDadosParaTreinamentos[i]];
        }

        for (let i = 0; i < arrayIdsIputsDeDadosDaSaidaReal.length; i++) {
            document.getElementById(arrayIdsIputsDeDadosDaSaidaReal[i]).value =
                JSON.parse(dadosVindoDoTextAreaEntradaDeDados)[0][arrayIdsIputsDeDadosDaSaidaReal[i]];
        }


    } else if (document.getElementById('id_botaoUsarSoUmIndice').innerText === 'Não') {

        for (let j = 0; j < JSON.parse(dadosVindoDoTextAreaEntradaDeDados).length; j++) {
            for (let i = 0; i < arrayIdsIputsDeEntradaDadosParaTreinamentos.length; i++) {
                document.getElementById(arrayIdsIputsDeEntradaDadosParaTreinamentos[i]).value =
                    document.getElementById(arrayIdsIputsDeEntradaDadosParaTreinamentos[i]).value
                    + (j === 0 ? "" : ",") +
                    JSON.parse(dadosVindoDoTextAreaEntradaDeDados)[j][arrayIdsIputsDeEntradaDadosParaTreinamentos[i]];
            }
        }

        for (let j = 0; j < JSON.parse(dadosVindoDoTextAreaEntradaDeDados).length; j++) {
            for (let i = 0; i < arrayIdsIputsDeDadosDaSaidaReal.length; i++) {
                document.getElementById(arrayIdsIputsDeDadosDaSaidaReal[i]).value =
                    document.getElementById(arrayIdsIputsDeDadosDaSaidaReal[i]).value
                    + (j === 0 ? "" : ",") +
                    JSON.parse(dadosVindoDoTextAreaEntradaDeDados)[j][arrayIdsIputsDeDadosDaSaidaReal[i]];
            }
        }

    }

    mostrar_e_esconder_div_configuracao_entrada('none');
    toggleIconAndCallFunction('fechar');


} criandoElementoDeEntradaDeDados();


//Começa daqui para Abaixo a função principal
function funcaoPrincipalDeRenderizacaoDaRedeNeural() {

    //___ VARIÁVEIS DE CONFIGURAÇÕES PARA RENDERIZAR A REDE NEURAL ___ ABAIXO
    var array_neuronio_draw_entradas_id = [];
    var array_neuronio_draw_escondidas_id = [];
    var array_neuronio_draw_saidas_id = [];

    function insertHiddenLayer(quantidade) {

        array_neuronio_draw_escondidas_id = [];

        const containerDrawRNA = document.getElementById('containerDrawRNA');
        const containerNeuroniosCamadaEntrada = document.getElementById('containerNeuroniosCamadaEntrada');
        const containerNeuroniosCamadaSaida = document.getElementById('containerNeuroniosCamadaSaida');

        // Loop para criar a quantidade desejada de elementos
        for (let i = 0; i < quantidade; i++) {
            const sufixo = i === 0 ? '' : `${i + 1}`; // Gera sufixo para IDs
            const id = `containerNeuroniosCamadaEscondida${sufixo}`;
            // Cria e configura o elemento
            const container = document.createElement('div');
            container.innerHTML = '';
            container.id = id;
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.justifyContent = 'center';
            container.style.paddingTop = '10px';
            container.style.paddingBottom = '10px';
            container.style.width = '70px';
            // Insere o elemento
            containerDrawRNA.insertBefore(container, containerNeuroniosCamadaSaida);
            desenharDivCircularRepresentandoNeuronios2(id, 'drawNeuronioEscondida', qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.length, i);
        }

        qtdeDeConecoesEntreEntradaEEscondida = array_neuronio_draw_entradas_id.length * array_neuronio_draw_escondidas_id[0].length;
        qtdeDeConecoesEntreEscondidaESaida = array_neuronio_draw_escondidas_id[(array_neuronio_draw_escondidas_id.length - 1)].length * array_neuronio_draw_saidas_id.length;

    }


    let nomeDosContainersDasCamadasEscondidas = [];
    function desenharDivCircularRepresentandoNeuronios2(containerNeuronioQualCamada, nomeDoNeuronio, neuroniosQtde, incremento) {

        nomeDosContainersDasCamadasEscondidas.push(containerNeuronioQualCamada);
        if ((qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.length - 1) === incremento) {
            // // Loop para cada dimensão
            for (let i = 0; i < qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.length; i++) {
                // Adicionar um novo array à dimensão atual
                array_neuronio_draw_escondidas_id.push([]);
                // // Loop para a dimensão atual
                for (let j = 0; j < qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada[i]; j++) {
                    // Adicionar um novo nome aleatório à dimensão atual
                    array_neuronio_draw_escondidas_id[i].push(nomeDoNeuronio + i + j);
                }
            }

            array_neuronio_draw_saidas_id_global = array_neuronio_draw_escondidas_id;

            for (let x = 0; x < array_neuronio_draw_escondidas_id.length; x++) {
                const parent = document.getElementById(nomeDosContainersDasCamadasEscondidas[x]);
                // Limpar divs existentes dentro do contêiner
                parent.innerHTML = '';

                for (let y = 0; y < array_neuronio_draw_escondidas_id[x].length; y++) {
                    const child = document.createElement('div');
                    //observação
                    child.innerHTML = '';
                    // child.id = `drawNeuronioEntrada${i + 1}`;
                    child.id = nomeDoNeuronio + x + y;
                    child.style.width = '30px';
                    child.style.height = '30px';
                    child.style.borderRadius = '50%';
                    // child.style.backgroundColor = '#C0C0C0';
                    child.style.backgroundImage = 'linear-gradient(to right, #4623CB, #8531EC)';
                    // child.style.backgroundColor = 'red';
                    child.style.margin = '10px auto';
                    child.style.zIndex = '1';
                    parent.appendChild(child);

                }

            }

        }

    }

    function gerarCorAleatoria() {
        return "#" + Math.floor(Math.random() * 16777215).toString(16);
    }

    function desenharDivCircularRepresentandoNeuronios(containerNeuronioQualCamada, nomeDoNeuronio, neuroniosQtde) {

        const parent = document.getElementById(containerNeuronioQualCamada);
        parent.style.backgroundColor = '#031B2D';
        // Limpar divs existentes dentro do contêiner
        parent.innerHTML = '';
        // Cria 5 divs filhas e adiciona à div pai
        for (let i = 0; i < neuroniosQtde; i++) {
            const child = document.createElement('div');
            child.innerHTML = '';

            child.id = nomeDoNeuronio + i;
            if (containerNeuronioQualCamada === 'containerNeuroniosCamadaEntrada') {
                array_neuronio_draw_entradas_id.push(nomeDoNeuronio + i);
            } else if (containerNeuronioQualCamada === 'containerNeuroniosCamadaSaida') {
                array_neuronio_draw_saidas_id.push(nomeDoNeuronio + i);
            }
            child.style.width = '30px';
            child.style.height = '30px';
            child.style.borderRadius = '50%';
            // child.style.backgroundColor = '#C0C0C0';
            child.style.backgroundImage = 'linear-gradient(to right, #4623CB, #8531EC)';
            // child.style.backgroundColor = 'red';
            child.style.margin = '10px auto';
            child.style.zIndex = '1';

            parent.appendChild(child);
        }

    }

    desenharDivCircularRepresentandoNeuronios('containerNeuroniosCamadaEntrada', 'drawNeuronioEntrada', neuroniosNaCamadaDeEntrada);
    insertHiddenLayer(qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.length);
    desenharDivCircularRepresentandoNeuronios('containerNeuroniosCamadaSaida', 'drawNeuronioSaida', neuroniosNaCamadaDeSaida);


    //Pintar DIV do neuronio 1
    let botao2 = document.getElementById('pintarNeuronio')
    botao2.addEventListener('click', function (event) {

        // Evitar o evento "prevent"
        event.preventDefault();

        // // Resetando os canvas Abaixo
        // removerComponentesDaDiv("containerDrawRNA");
        // reinserindoComponentesParaRenderizacaoRedeNeural();
        // funcaoPrincipalDeRenderizacaoDaRedeNeural();//ACTIVATE 1
        // // Resetando os canvas Acima

        // Chamando a função de animações abaixo
        responsavelPorAnimarAsInteracoesDosNeuroniosDaRedeRNA(
            array_neuronio_draw_entradas_id,
            array_neuronio_draw_escondidas_id,
            array_neuronio_draw_saidas_id,
            divPintarDelayTimer,
            delayTimerPintarSetas,
            qtdeDeConecoesEntreEntradaEEscondida
        )

    });

    clicar_botao_pintar_global = botao2;

    //Limpar canvas
    let botaoLimparCanvas = document.getElementById('limparCanvas')
    botaoLimparCanvas.addEventListener('click', function (event) {
        let neuronioCirculo = document.getElementById('drawNeuronioEntrada' + 0);
        // neuronioCirculo.style.background = '#1E90FF';
        limparCanvas();
    });


    function desenhandoRetasDeConeccaoDosNeuroniosDaRede(corDasSetas, destinoNeuronios) {

        setaID = [];
        setas = [];

        //ENTRADA Neuronio, Desenhando Conexão da Camada de Entrada com A Primeira Camada Escondida
        for (let a = 0; a < array_neuronio_draw_entradas_id.length; a++) {
            for (let b = 0; b < array_neuronio_draw_escondidas_id[0].length; b++) {

                let pontoInicialX = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_entradas_id[a]).coordenadaX;
                let pontoInicialY = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_entradas_id[a]).coordenadaY;
                let pontoFinalX = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[0][b]).coordenadaX;
                let pontoFinalY = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[0][b]).coordenadaY;
                canvasCriandoSetas('setaDiagonais' + array_neuronio_draw_entradas_id[a] + "" + array_neuronio_draw_escondidas_id[0][b], pontoInicialX + 15, pontoInicialY + 5, pontoFinalX + 5, pontoFinalY + 5, destinoNeuronios === 'entrada' ? corDasSetas : '#A475AD');//'#A475AD'
            }
        }

        // ESCONDIDA Neuronio, Desenhando Conexão da Camada Escondida com as outras Camadas Escondidas
        for (var a = 0; a < array_neuronio_draw_escondidas_id.length; a++) {
            const arraySize = array_neuronio_draw_escondidas_id.length;
            const incrementoIteracaoMaisUm = a + 1;
            for (var i = 0; i < array_neuronio_draw_escondidas_id[a].length; i++) {
                if (incrementoIteracaoMaisUm <= (arraySize - 1)) {
                    for (var j = 0; j < array_neuronio_draw_escondidas_id[incrementoIteracaoMaisUm].length; j++) {
                        let pontoInicialX = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[a][i]).coordenadaX;
                        let pontoInicialY = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[a][i]).coordenadaY;
                        let pontoFinalX = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[incrementoIteracaoMaisUm][j]).coordenadaX;
                        let pontoFinalY = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[incrementoIteracaoMaisUm][j]).coordenadaY;
                        canvasCriandoSetas('setaDiagonais' + array_neuronio_draw_escondidas_id[a][i] + "" + array_neuronio_draw_escondidas_id[incrementoIteracaoMaisUm][j], pontoInicialX + 15, pontoInicialY + 5, pontoFinalX + 5, pontoFinalY + 5, destinoNeuronios === 'escondida' ? corDasSetas : '#A475AD');//'#A475AD'
                    }
                }
            }
        }

        //SAÍDA Neuronio, Desenhando Conexão da Ultima Camada ESCONDIDA com a Camada de Saída
        let ultimaCamadaEscondidaQtdeNeuronios = array_neuronio_draw_escondidas_id.length - 1;
        for (let a = 0; a < array_neuronio_draw_saidas_id.length; a++) {
            for (let b = 0; b < array_neuronio_draw_escondidas_id[ultimaCamadaEscondidaQtdeNeuronios].length; b++) {
                let pontoInicialX = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[ultimaCamadaEscondidaQtdeNeuronios][b]).coordenadaX;
                let pontoInicialY = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_escondidas_id[ultimaCamadaEscondidaQtdeNeuronios][b]).coordenadaY;
                let pontoFinalX = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_saidas_id[a]).coordenadaX;
                let pontoFinalY = pegandoCoordenada_e_dimenssoes_do_componente2(array_neuronio_draw_saidas_id[a]).coordenadaY;
                canvasCriandoSetas('setaDiagonais' + array_neuronio_draw_escondidas_id[ultimaCamadaEscondidaQtdeNeuronios][b] + "|" + array_neuronio_draw_saidas_id[a], pontoInicialX + 15, pontoInicialY + 5, pontoFinalX + 5, pontoFinalY + 5, destinoNeuronios === 'saida' ? corDasSetas : '#A475AD');//'#A475AD'
            }
        }

    }

    desenhandoRetasDeConeccaoDosNeuroniosDaRede('#A475AD', 'cor_normal');
    // removerCanvas();//REMOVER DEPOIS



    function desenhandoRetasTotalmenteHorizontal(arrayDoNeuronioQueVaiReceberASeta, deslocamentoX, camada) {

        for (let i = 0; i < arrayDoNeuronioQueVaiReceberASeta.length; i++) {
            let pontoInicialX = pegandoCoordenada_e_dimenssoes_do_componente2(arrayDoNeuronioQueVaiReceberASeta[i]).coordenadaX - (camada == 'entrada' ? deslocamentoX : 0);
            let pontoInicialY = pegandoCoordenada_e_dimenssoes_do_componente2(arrayDoNeuronioQueVaiReceberASeta[i]).coordenadaY;
            let pontoFinalX = pegandoCoordenada_e_dimenssoes_do_componente2(arrayDoNeuronioQueVaiReceberASeta[i]).coordenadaX + (camada == 'saida' ? deslocamentoX : 0);
            let pontoFinalY = pegandoCoordenada_e_dimenssoes_do_componente2(arrayDoNeuronioQueVaiReceberASeta[i]).coordenadaY;
            canvasCriandoSetas(pontoInicialX + 15, pontoInicialY + 5, pontoFinalX + 5, pontoFinalY + 5, '#A475AD');
        }

    }
    //ATIVAR DEPOIS 
    // desenhandoRetasTotalmenteHorizontal(array_neuronio_draw_entradas_id, 40, 'entrada');
    // desenhandoRetasTotalmenteHorizontal(array_neuronio_draw_saidas_id, 40, 'saida');


    function pegandoCoordenada_e_dimenssoes_do_componente2(meuElemento) {
        try {
            const larguraPagina = document.documentElement.clientWidth;
            const alturaPagina = document.documentElement.clientHeight;
            const elemento = document.getElementById(meuElemento);
            const posicaoX = elemento.getBoundingClientRect().left;
            const posicaoY = elemento.getBoundingClientRect().top;
            var largura = elemento.offsetWidth;
            var altura = elemento.offsetHeight;
            return {
                "coordenadaX": posicaoX,
                "coordenadaY": posicaoY,
                "largura": largura,
                "altura": altura
            }
        } catch (erro) { alert("erro 878543=> " + meuElemento); }
    }


    // Função para limpar o conteúdo desenhado no canvas
    function limparCanvas() {
        var canvas = document.getElementById("meuCanvas");
        var ctx = canvas.getContext("2d");
        // Limpar toda a área do canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Função para remover o canvas existente
    function removerCanvas() {
        var canvasExistente = document.getElementById("meuCanvas");
        if (canvasExistente) {
            canvasExistente.parentNode.removeChild(canvasExistente);
        }
    }

    // Função para adicionar um novo canvas dinamicamente
    function adicionarCanvas() {
        let containerDrawRNA = document.createElement("containerDrawRNA");
        var novoCanvas = document.createElement("canvas");
        novoCanvas.id = "meuCanvas";
        novoCanvas.width = "600";
        novoCanvas.height = "280";
        novoCanvas.style.position = "absolute";
        containerDrawRNA.appendChild(novoCanvas);
    }

    //___ VARIÁVEIS DE CONFIGURAÇÕES PARA RENDERIZAR A REDE NEURAL ___ ACIMA


} funcaoPrincipalDeRenderizacaoDaRedeNeural();
//Começa daqui para Acima a função principal


function definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao() {

    try {
        neuroniosNaCamadaDeEntrada = parseInt(document.getElementById('entradaQtdeNeuronios').innerHTML);
        neuroniosNaCamadaDeSaida = parseInt(document.getElementById('saidaQtdeNeuronios').innerHTML);
        removerComponentesDaDiv("containerDrawRNA");
        reinserindoComponentesParaRenderizacaoRedeNeural();
        funcaoPrincipalDeRenderizacaoDaRedeNeural();//ACTIVATE 2
    } catch (error) { alert("Erro aqui 764387 " + error) };

}


function adicionarOuRemoverNeuroniosCamadaDeEntrada(menosOuMais) {
    let valorAtual = parseInt(document.getElementById('entradaQtdeNeuronios').innerHTML);
    if (menosOuMais === '-') {
        if (valorAtual > 1) {
            valorAtual -= 1;
            document.getElementById('entradaQtdeNeuronios').innerHTML = valorAtual;
        }
    } else if (menosOuMais === '+') {
        valorAtual += 1;
        document.getElementById('entradaQtdeNeuronios').innerHTML = valorAtual;
    }
    definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
}


function adicionarOuRemoverNeuroniosCamadaDeSaida(menosOuMais) {

    let valorAtual = parseInt(document.getElementById('saidaQtdeNeuronios').innerHTML);
    if (menosOuMais === '-') {
        if (valorAtual > 1) {
            valorAtual -= 1;
            document.getElementById('saidaQtdeNeuronios').innerHTML = valorAtual;
            document.getElementById('idQtdeSaidaRede').value = valorAtual;
            document.getElementById('id_aplicar_configuracoes').click();
        }
    } else if (menosOuMais === '+') {
        valorAtual += 1;
        document.getElementById('saidaQtdeNeuronios').innerHTML = valorAtual;
        document.getElementById('idQtdeSaidaRede').value = valorAtual;
        document.getElementById('id_aplicar_configuracoes').click();
    }
    definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();

}


function removerComponentesDaDiv(divId) {
    const divElement = document.getElementById(divId);
    while (divElement.firstChild) {
        divElement.removeChild(divElement.firstChild);
    }
}


//Reinserindo os componentes
function reinserindoComponentesParaRenderizacaoRedeNeural() {
    const parentElement = document.getElementById("containerDrawRNA");

    if (!parentElement) {
        console.error("Could not find parent element with the provided ID.");
        return;
    }

    // Create the containerDivs and canvas elements
    const containerNeuroniosCamadaEntrada = document.createElement("div");
    containerNeuroniosCamadaEntrada.id = "containerNeuroniosCamadaEntrada";
    containerNeuroniosCamadaEntrada.style.cssText = "display: flex; flex-direction: column; justify-content: center; padding-top: 10px; padding-bottom: 10px; width: 70px;";
    const containerNeuroniosCamadaSaida = document.createElement("div");
    containerNeuroniosCamadaSaida.id = "containerNeuroniosCamadaSaida";
    containerNeuroniosCamadaSaida.style.cssText = "display: flex; flex-direction: column; justify-content: center; padding-top: 10px; padding-bottom: 10px; width: 70px;";
    const canvas = document.createElement("canvas");
    canvas.id = "meuCanvas";
    canvas.width = 600;
    canvas.height = 280;
    canvas.style.position = "absolute";
    // Append the elements to the parent element
    parentElement.appendChild(containerNeuroniosCamadaEntrada);
    parentElement.appendChild(containerNeuroniosCamadaSaida);
    parentElement.appendChild(canvas);
}


//Inserindo os componentes que fazem parte da camada escondida incluindo os neurônios abaixo
function criarComponentesDaCamadaEscondida(menosOuMais) {

    // Obtém o elemento container
    var container = document.getElementById("containerCamadaEscondidaMostrador");
    var idNumerico = container.childElementCount;

    let valorAtual = parseInt(document.getElementById('qtdeCamadasEscondidasMostrador').innerHTML);
    if (menosOuMais === '-') {
        if (valorAtual > 1) {
            valorAtual -= 1;
            const divPai = document.getElementById("containerCamadaEscondidaMostrador");
            const divFilho = document.getElementById("camadaEscondidaMostrador" + (idNumerico - 1));
            divPai.removeChild(divFilho);
            document.getElementById('qtdeCamadasEscondidasMostrador').innerHTML = valorAtual;
            qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.pop();
            definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
        }
    } else if (menosOuMais === '+') {
        valorAtual += 1;
        document.getElementById('qtdeCamadasEscondidasMostrador').innerHTML = valorAtual;
        // Cria o elemento div
        var div = document.createElement("div");
        div.id = "camadaEscondidaMostrador" + idNumerico;
        div.style.width = "65px";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.backgroundImage = "linear-gradient(to right, #4623CB, #8531EC)";
        div.style.margin = "5px";
        div.style.padding = "5px";
        div.style.borderRadius = "5px";

        // Cria o elemento label
        var label = document.createElement("label");
        label.textContent = "Neurônios";
        label.style.textAlign = "center";
        label.style.fontSize = "13px";
        label.style.color = "white";

        // Cria o elemento div interno
        var divInterno = document.createElement("div");
        divInterno.style.display = "flex";
        divInterno.style.flexDirection = "row";

        // Cria o botão de remover
        var btnRemover = document.createElement("button");
        btnRemover.id = "escondidaQtdeNeuronioxRemover" + idNumerico;
        btnRemover.textContent = "-";
        btnRemover.className = "botaoSubtrair2";
        btnRemover.onclick = function () {
            adicionarOuRemoverNeuroniosCamadaEscondida(this);
        };

        // Cria o botão de adicionar
        var btnAdicionar = document.createElement("button");
        btnAdicionar.id = "escondidaQtdeNeuronioxAdicionar" + idNumerico;
        btnAdicionar.textContent = "+";
        btnAdicionar.className = "botaoSomar2";
        btnAdicionar.onclick = function () {
            adicionarOuRemoverNeuroniosCamadaEscondida(this);
        };

        // Cria o label de quantidade de neurônios
        var labelQtdeNeuronio = document.createElement("label");
        labelQtdeNeuronio.id = "qtdeNeuronioCamadaEscondida" + idNumerico;
        labelQtdeNeuronio.textContent = "2";
        labelQtdeNeuronio.style.fontWeight = "bolder";
        labelQtdeNeuronio.style.textAlign = "center";
        labelQtdeNeuronio.style.width = "20px";

        // Adiciona os elementos ao div interno
        divInterno.appendChild(btnRemover);
        divInterno.appendChild(btnAdicionar);
        divInterno.appendChild(labelQtdeNeuronio);

        // Adiciona os elementos ao div principal
        div.appendChild(label);
        div.appendChild(divInterno);

        // Adiciona o novo componente ao container
        container.appendChild(div);

        qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada.push(2);
        definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
    }

}


//Add neuronio nas camadas escondidas
function adicionarOuRemoverNeuroniosCamadaEscondida(componenteAdicionaRemoverNeuroniosCamadaEscondida) {

    if (componenteAdicionaRemoverNeuroniosCamadaEscondida.id.includes('Adicionar')) {
        try {
            const indiceDaCamadaEscondida = componenteAdicionaRemoverNeuroniosCamadaEscondida.id.toString().replace(/[^0-9]/g, "");
            let quantidadeAtualDeNeuronioCamadaEscondida = document.getElementById('qtdeNeuronioCamadaEscondida' + indiceDaCamadaEscondida).textContent;
            quantidadeAtualDeNeuronioCamadaEscondida.innerHTML = '';
            qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada[indiceDaCamadaEscondida] = parseInt(quantidadeAtualDeNeuronioCamadaEscondida) + 1;
            document.getElementById('qtdeNeuronioCamadaEscondida' + indiceDaCamadaEscondida).textContent = parseInt(quantidadeAtualDeNeuronioCamadaEscondida) + 1;
            definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
        } catch (error) { alert("Erro Aqui => 375429" + error) }

    } else if (componenteAdicionaRemoverNeuroniosCamadaEscondida.id.includes('Remover')) {
        try {
            const indiceDaCamadaEscondida = componenteAdicionaRemoverNeuroniosCamadaEscondida.id.toString().replace(/[^0-9]/g, "");
            let quantidadeAtualDeNeuronioCamadaEscondida = parseInt(document.getElementById('qtdeNeuronioCamadaEscondida' + indiceDaCamadaEscondida).textContent);
            if (quantidadeAtualDeNeuronioCamadaEscondida > 1) {
                qtdeDeCamadasEscondidasComQtdeDeNeuroniosEmCadaCamada[indiceDaCamadaEscondida] = parseInt(quantidadeAtualDeNeuronioCamadaEscondida) - 1;
                document.getElementById('qtdeNeuronioCamadaEscondida' + indiceDaCamadaEscondida).textContent = parseInt(quantidadeAtualDeNeuronioCamadaEscondida) - 1;
                definindoConfiguracaoDaRenderizacaoDaRedePeloPainelDeBotao();
            }

        } catch (error) { alert("Erro Aqui => 467933" + error) }
    }

}


document.addEventListener('DOMContentLoaded', () => {
    const botaoIniciar = document.getElementById('botaoIniciar');
    botaoIniciar.addEventListener('click', () => {
        removerTodosElementosDaDivGraficoMenosOPrimeiro();
        // Chama a função de treinamento da rede neural definida em RN_JS_PURO.js
        let arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA = [];
        for (let i = 0; i < array_neuronio_draw_saidas_id_global.length; i++) {
            arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA.push(array_neuronio_draw_saidas_id_global[i].length);
            if (i === (array_neuronio_draw_saidas_id_global.length - 1)) {
                treinarRedeNeural(arrayQuantitativosCamadasENeuroniosCamadaEscondidaPCodigoRNA
                    , arrayIdsIputsDeEntradaDadosParaTreinamentos
                    , arrayIdsIputsDeDadosDaSaidaReal
                    , chavesArray
                );
            }
        }
    });
});


//Carragando arquivo pelo botão json abaixo
document.getElementById('idCarregarJson').addEventListener('click', function () {
    // Cria um input do tipo file invisível
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json'; // Aceita apenas arquivos JSON
    // Quando um arquivo é selecionado
    input.onchange = function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = function () {
            var jsonContent = reader.result;
            document.getElementById('idObjetoDeDadosDeEntrada').value = jsonContent;
            // Dispara manualmente o evento input
            var inputEvent = new Event('input', { bubbles: true });
            document.getElementById('idObjetoDeDadosDeEntrada').dispatchEvent(inputEvent);
        };
        // Lê o conteúdo do arquivo como texto
        reader.readAsText(file);
    };
    input.click();
});


//Mostrar e esconder divs
function mostrar_e_esconder_div_configuracao_entrada(statusShowHidden) {

    const alturaNavegador = window.innerHeight;
    // console.log(alturaNavegador);
    var elemento = document.getElementById("id_div_configuracao_entrada_de_dados");
    var elemento2 = document.getElementById("fundoCaixaDeDialogBlackTranslucido_id");
    if (statusShowHidden === 'block') {
        elemento.style.display = "block";
        elemento2.style.display = "block";

        try {
            let altura1 = document.getElementById('containerDrawRNAeGrafico')
            let altura2 = document.getElementById('id_div_segunda_linha')
            let altura3 = document.getElementById('id_div_terceira_linha')
            let somatorioAltura = altura1.offsetHeight + altura2.offsetHeight + altura3.offsetHeight;
            if (somatorioAltura) {
                elemento2.style.height = `${somatorioAltura + 50}px`;
            }
        } catch (erro) { alert(erro) }

    } else if (statusShowHidden === 'none') {
        elemento.style.display = "none";
        elemento2.style.display = "none";
    }

}

//Posicionar Div dos Dados Normalizados quando houver 
function posicionarDivDosDadosNormalizadosAoLadoDeDivEntradaDeDados() {
    let target = document.getElementById('id_div_configuracao_entrada_de_dados_normalizado');
    if (target) {
        let reference = document.getElementById('id_div_configuracao_entrada_de_dados');
        setPositionEntreDoisComponente2(target, reference, -120, -(130));
    }
}

setTimeout(posicionarDivDosDadosNormalizadosAoLadoDeDivEntradaDeDados, 200);

//Ocultando e Mostrando Div de Normalização de Dados e Alterando o icone da seta awesome
function toggleIconAndCallFunction(status) {

    var icon = document.getElementById('icon_arrow');
    if (icon.classList.contains('fa-arrow-left') || status === 'fechar') {
        icon.classList.remove('fa-arrow-left');
        icon.classList.add('fa-arrow-right');
        document.getElementById('id_div_configuracao_entrada_de_dados_normalizado').style.display = 'none';
    } else {
        icon.classList.remove('fa-arrow-right');
        icon.classList.add('fa-arrow-left');
        document.getElementById('id_div_configuracao_entrada_de_dados_normalizado').style.display = 'block';
    }

}

// Inicializar o Gráfico vazio
inicializarGrafico();

