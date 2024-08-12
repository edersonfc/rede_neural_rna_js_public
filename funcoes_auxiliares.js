
function pegandoCoordenada_e_dimenssoes_do_componente1(meuElemento) {

    var elemento = document.getElementById(meuElemento);
    var coordenadaX = elemento.offsetLeft;
    var coordenadaY = elemento.offsetTop;
    var largura = elemento.offsetWidth;
    var altura = elemento.offsetHeight;

    return {
        "coordenadaX": coordenadaX,
        "coordenadaY": coordenadaY,
        "largura": largura,
        "altura": altura
    }
}


function pegandoCoordenada_e_dimenssoes_do_componente2(meuElemento) {
    try {
        // Obtém a largura e altura da página
        const larguraPagina = document.documentElement.clientWidth;
        const alturaPagina = document.documentElement.clientHeight;
        // Obtém o elemento a ser posicionado
        const elemento = document.getElementById(meuElemento);
        // elemento.style.background = 'black';//AUDITORIA
        // Calcula a coordenada X do elemento em relação à página
        const posicaoX = elemento.getBoundingClientRect().left;
        // const coordenadaX = (posicaoX / larguraPagina) * 100;//DESCONSIDERANDO
        // Calcula a coordenada Y do elemento em relação à páginaf
        const posicaoY = elemento.getBoundingClientRect().top;
        // const coordenadaY = (alturaPagina / posicaoY);//DESCONSIDERANDO
        //Pegando Largura e Altura do componente
        var largura = elemento.offsetWidth;
        var altura = elemento.offsetHeight;
        // Retorna as coordenadas e dimensões do círculo
        return {
            "coordenadaX": posicaoX,
            "coordenadaY": posicaoY,
            "largura": largura,
            "altura": altura
        }
    } catch (erro) {
        console.error('878543' + erro);
    }
}


//Calculo de angulos apartir de x,y iniciais E x,y finais
function calcularAnguloRetaAutoCAD(xInicial, yInicial, xFinal, yFinal) {
    // Calcula a diferença entre as coordenadas x e y
    const deltaX = xFinal - xInicial;
    const deltaY = yFinal - yInicial;
    // Calcula o ângulo em radianos usando Math.atan2()
    const anguloRadianos = Math.atan2(deltaY, deltaX);
    // Converte o ângulo de radianos para graus
    const anguloGraus = anguloRadianos * 180 / Math.PI;
    // Subtrai o ângulo de 180 graus para obter o ângulo no AutoCAD
    const anguloAutoCAD = 180 - anguloGraus;
    // Retorna o ângulo no AutoCAD
    return anguloAutoCAD;

}

function calcularAnguloReta(xInicial, yInicial, xFinal, yFinal) {
    // Calcula a diferença entre as coordenadas x e y
    const deltaX = xFinal - xInicial;
    const deltaY = yFinal - yInicial;
    // Calcula o ângulo em radianos usando Math.atan2()
    const anguloRadianos = Math.atan2(deltaY, deltaX);
    // Converte o ângulo de radianos para graus
    const anguloGraus = anguloRadianos * 180 / Math.PI;
    // Subtrai o ângulo de 180 graus para obter o ângulo no AutoCAD
    // const anguloAutoCAD = 180 - anguloGraus;
    // Retorna o ângulo no AutoCAD
    // return anguloAutoCAD;
    return anguloGraus;
}

// Calculo de comprimento da reta apartir de x,y iniciais E x,y finais
function calcularComprimentoReta(xInicial, yInicial, xFinal, yFinal) {
    // Calcula a diferença entre as coordenadas x e y
    const deltaX = xFinal - xInicial;
    const deltaY = yFinal - yInicial;
    // Calcula o comprimento da reta usando o Teorema de Pitágoras
    const comprimento = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    // Retorna o comprimento da reta
    return comprimento;
}


function setPositionEntreDoisComponente(target2, reference2, subtracaoExtra) {
    try {
        // Obter as coordenadas x e y do componente de referência
        let referenceX = reference2.getBoundingClientRect().x;
        const referenceY = reference2.getBoundingClientRect().y;
        referenceX = referenceX - subtracaoExtra;
        // Definir as coordenadas x e y do componente de destino como as coordenadas do componente de referência
        target2.style.left = `${referenceX}px`;
        target2.style.top = `${referenceY}px`;
    } catch (erro) {
        console.error('653654' + erro);
    }
}


function setPositionEntreDoisComponente2(target2, reference2, subtracaoExtraX, subtracaoExtraY) {
    try {
        // Obter as coordenadas x e y do componente de referência
        let referenceX = reference2.getBoundingClientRect().x;
        let referenceY = reference2.getBoundingClientRect().y;
        referenceX = referenceX - subtracaoExtraX;
        referenceY = referenceY - subtracaoExtraY;
        // Definir as coordenadas x e y do componente de destino como as coordenadas do componente de referência
        target2.style.left = `${referenceX}px`;
        target2.style.top = `${referenceY}px`;
    } catch (erro) {
        console.error('6664354' + erro);
    }
}


function divComDiagonalEsquerdaEDireita(coresRGB, nomeDaDIV, elementoContainerGeral) {

    // Criando o elemento Div
    const div = document.createElement('div');
    div.id = nomeDaDIV;
    div.style.cssText = "width: 50px; height: 50px; position: absolute; ";
    div.style.background = 'red';
    div.style.width = '30px';
    div.style.height = '30px';
    coresRGB = '#C0C0C0';
    const larguraLinha = 3;
    // Cria um elemento SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", div.clientWidth);
    svg.setAttribute("height", div.clientHeight);
    // Cria uma linha diagonal da esquerda descendo para direita
    const linhaHorizontal = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linhaHorizontal.setAttribute("x1", 0);
    linhaHorizontal.setAttribute("y1", 0);
    linhaHorizontal.setAttribute("x2", div.clientWidth);
    linhaHorizontal.setAttribute("y2", div.clientHeight);
    linhaHorizontal.setAttribute("stroke", coresRGB);
    linhaHorizontal.setAttribute("stroke-width", larguraLinha);
    // Cria uma linha diagonal da esquerda subindo para direita
    const linhaVertical = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linhaVertical.setAttribute("x1", 0);
    linhaVertical.setAttribute("y1", 0);
    linhaVertical.setAttribute("x2", div.clientWidth);
    linhaVertical.setAttribute("y2", div.clientHeight);
    linhaVertical.setAttribute("stroke", coresRGB);
    linhaVertical.setAttribute("stroke-width", larguraLinha);
    // Cria uma linha horizontal
    const linhaDiagonal = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linhaDiagonal.setAttribute("x1", 0);
    linhaDiagonal.setAttribute("y1", div.clientHeight);
    linhaDiagonal.setAttribute("x2", div.clientWidth);
    linhaDiagonal.setAttribute("y2", 0);
    linhaDiagonal.setAttribute("stroke", coresRGB);
    linhaDiagonal.setAttribute("stroke-width", larguraLinha);
    // Adiciona as linhas ao SVG
    svg.appendChild(linhaHorizontal);
    svg.appendChild(linhaVertical);
    svg.appendChild(linhaDiagonal);
    // Adiciona o SVG à div
    div.appendChild(svg);
    elementoContainerGeral.appendChild(div);
}


//Gerando nomes ou caracteres aleatorio abaixo
function aleatorioNomesCaracteres() {
    let stringAleatoria = "";
    const tamanhoString = 10;
    for (let i = 0; i < tamanhoString; i++) {
        // Gera código entre A e Z
        const codigoUnicode = Math.floor(Math.random() * 26) + 65;
        stringAleatoria += String.fromCharCode(codigoUnicode);
    }
    return stringAleatoria;
}


function listarComponentesDeContainerDiv(identificacaoDoContainer) {
    const div = document.getElementById(identificacaoDoContainer);
    const ids = div.querySelectorAll("[id]");
    for (const id of ids) {
        console.log(id.id);
    }
}

// Remover itens duplicados
function removeItensDuplicadosEmArrays(array) {
    return [...new Set(array)];
}


let setaID = []; // Variável para rastrear o ID da seta
let setas = []; // Array para armazenar as informações das setas
//Usando canvas para desenhar a reta posição inicial e final do x E y
function canvasCriandoSetas(id, xInicial, yInicial, xFinal, yFinal, corRGB) {
    //Pegando Posição Y do scroll do Navegador
    let scrollPosition = window.scrollY;
    const alturaFaixaBotoes = document.getElementById('faixaBotoes').offsetHeight;
    yInicial += -alturaFaixaBotoes;
    yFinal += -alturaFaixaBotoes;
    const canvas = document.getElementById('meuCanvas');
    canvas.innerHTML = '';
    const ctx = canvas.getContext('2d');
    // Definindo a cor da linha
    ctx.strokeStyle = corRGB; // Altere para a cor desejada
    // Definindo a largura da linha
    ctx.lineWidth = 2; // Altere a espessura da linha
    // Ponto inicial
    ctx.beginPath();
    // ctx.moveTo(50, 50); // Altere para as coordenadas x, y iniciais
    ctx.moveTo(xInicial, yInicial - (50 - scrollPosition)); // Altere para as coordenadas x, y iniciais
    // Ponto final
    // ctx.lineTo(200, 150); // Altere para as coordenadas x, y finais
    ctx.lineTo(xFinal, yFinal - (50 - scrollPosition)); // Altere para as coordenadas x, y finais
    // Traçar a linha
    ctx.stroke();//DESATIVADO PARA CRIAR O ID UNICO ABAIXO
    //Criando o id unico abaixo
    // Incrementar o ID da seta
    // setaID++;
    setaID.push(id);

    // Criar um objeto com as informações da seta, incluindo o ID único
    const seta = {
        id: id,
        xInicial: xInicial,
        yInicial: yInicial,
        xFinal: xFinal,
        yFinal: yFinal,
        cor: corRGB
    };

    // Adicionar a seta ao array de setas
    setas.push(seta);
    // Criando o id unico  acima
}


function mudarCorSeta(setaID, novaCor) {

    //Pegando Posição Y do scroll do Navegador
    let scrollPositionY = window.scrollY;
    const canvas = document.getElementById('meuCanvas');
    const ctx = canvas.getContext('2d');
    canvas.innerHTML = '';
    // Encontrar a seta correspondente ao ID no array de setas
    const seta = setas.find(s => s.id === setaID);

    if (seta) {
        // Limpar a seta antiga
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Desenhar todas as setas novamente
        let i = 0;
        for (const s of setas) {
            i++
            ctx.strokeStyle = s.id === setaID ? novaCor : s.cor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.xInicial, s.yInicial - 50);
            ctx.lineTo(s.xFinal, s.yFinal - 50);
            ctx.stroke();
        }

        // Atualizar a cor da seta no array de setas
        seta.cor = novaCor;
    }
}


function fazendoSplit(contentText, separadorCaracter) {

    try {
        return contentText.toString().split(separadorCaracter);
    } catch (error) {
        console.error('erro no split função auxiliar 546543' + error);

    }

}


// Inicia tudo aqui abaixo a animação da rede neural perceptron multilayer Abaixo
// Pintando setas da camada de entrada para escondida
function responsavelPorAnimarAsInteracoesDosNeuroniosDaRedeRNA(
    array_neuronio_draw_entradas_id,
    array_neuronio_draw_escondidas_id,
    array_neuronio_draw_saidas_id,
    divPintarDelayTimer,
    delayTimerPintarSetas,
    qtdeDeConecoesEntreEntradaEEscondida
) {
    for (let yy = 0; yy < array_neuronio_draw_entradas_id.length; yy++) {

        setTimeout(function () {

            let neuronioCirculo = document.getElementById(array_neuronio_draw_entradas_id[yy]);
            if (neuronioCirculo) {
                neuronioCirculo.style.border = '1px solid yellow ';
                neuronioCirculo.style.backgroundImage = 'linear-gradient(to right, #a5d817, #8531ec)';

                for (let i = 0; i < qtdeDeConecoesEntreEntradaEEscondida; i++) {
                    setTimeout(function () {
                        if (setaID[i]) {
                            mudarCorSeta(setaID[i], '#a5d817');
                        }//if
                    }, i * delayTimerPintarSetas);
                    // mudarCorSeta(setaID[i], '#a5d817');
                }//for
            }// if (neuronioCirculo) {

        }, yy * divPintarDelayTimer);



        //PINTANDO AS SETAS E DIVs DAS CAMADAS ESCONDIDAS ABAIXO
        if (yy === (array_neuronio_draw_entradas_id.length - 1)) {

            for (var f = 0; f < array_neuronio_draw_escondidas_id.length; f++) {
                try {
                    for (var g = 0; g < array_neuronio_draw_escondidas_id[f].length; g++) {
                        let neuronioCirculo = document.getElementById(array_neuronio_draw_escondidas_id[f][g]);
                        if (neuronioCirculo) {

                            (function (g) { // Immediately Invoked Function Expression (IIFE)
                                setTimeout(function () {
                                    neuronioCirculo.style.border = '1px solid yellow ';
                                    neuronioCirculo.style.backgroundImage = 'linear-gradient(to right, #a5d817, #8531ec)'
                                }, g * divPintarDelayTimer);
                            })(g);

                        }//if
                    }//for

                } catch (erro) { console.log(erro + "\nMMM\n" + array_neuronio_draw_saidas_id) }

                //PINTANDO AS SETAS ABAIXO CAMADA DE SAÍDA
                let incremento = (qtdeDeConecoesEntreEntradaEEscondida + 1);
                for (let incremento = 0; incremento < setaID.length; incremento++) {
                    setTimeout(function () {
                        if (setaID[incremento]) {
                            mudarCorSeta(setaID[incremento], '#a5d817');
                        }//if

                        //PINTANDO AS DIVs DA CAMADA DE SAÍDA ABAIXO
                        if (incremento === (setaID.length - 1)) {
                            for (let h = 0; h < array_neuronio_draw_saidas_id.length; h++) {
                                // alert("PINTAR DIVS DE SAÍDA !!!");
                                let neuronioCirculoSaida = document.getElementById(array_neuronio_draw_saidas_id[h]);
                                if (neuronioCirculoSaida) {
                                    neuronioCirculoSaida.style.border = '1px solid yellow ';
                                    // neuronioCirculoSaida.style.backgroundImage = 'linear-gradient(to right, rgb(70, 35, 203), rgb(133, 49, 236))';
                                    neuronioCirculoSaida.style.backgroundImage = 'linear-gradient(to right, #a5d817, #8531ec)';
                                }//if
                            }//for
                        }//if
                        //PINTANDO AS DIVs DA CAMADA DE SAÍDA ACIMA

                    }, incremento * delayTimerPintarSetas);

                }//for

            }//for


        }// if( yy === (array_neuronio_draw_entradas_id.length - 1) ){
        //PINTANDO AS SETAS E DIVs DAS CAMADAS ESCONDIDAS ACIMA


    }//for //PINTANDO SETAS DA CAMADA DE ENTRADA para ESCONDIDA
}


function extrairNomesChavesArrayDeJson(dadosObjetos) {


    try {

        // Função para extrair os nomes das chaves de um objeto
        function extrairNomesChaves(objeto2) {
            return Object.keys(objeto2);
        }

        // Array para armazenar os nomes das chaves
        let nomesChaves = [];
        // Iterando sobre cada objeto do array
        dadosObjetos.forEach(function (objeto) {
            // Extrair os nomes das chaves do objeto atual e adicionar ao array de nomes de chaves
            let chaves = extrairNomesChaves(objeto);
            nomesChaves = nomesChaves.concat(chaves);
        });
        // Remover duplicatas dos nomes das chaves
        nomesChaves = [...new Set(nomesChaves)];
        // console.log(nomesChaves);
        return nomesChaves;

    } catch (error) {
        console.error('erro nº 8274532 ' + error);
    }


}


function formatarJSON(nomeDoComponenteTextArea) {
    var jsonText = document.getElementById(nomeDoComponenteTextArea).value;
    // var jsonText = document.getElementById("jsonInput").value;
    try {
        var jsonObj = JSON.parse(jsonText);
        var formattedJson = formatarObjeto(jsonObj);
        document.getElementById(nomeDoComponenteTextArea).value = formattedJson;
        // document.getElementById("jsonInput").value = formattedJson;
    } catch (error) {
        console.error('Erro ao formatar JSON: 9774475 ' + error);
    }
}

function formatarObjeto(obj, indent = 0) {
    var indentString = ' '.repeat(indent); // Espaços de recuo
    var result = '';

    if (typeof obj === 'object' && obj !== null) {
        result += '{\n';
        Object.keys(obj).forEach(function (key, index, array) {
            result += indentString + '    "' + key + '": ' + formatarObjeto(obj[key], indent + 1);
            if (index < array.length - 1) {
                result += ',';
            }
            result += '\n';
        });
        result += indentString + '}';
    } else {
        result += JSON.stringify(obj);
    }

    return result;
}


function separarPalavrasCamelCase(str) {
    // Transforma a primeira letra em maiúscula se não for
    str = str.charAt(0).toUpperCase() + str.slice(1);
    // Dividindo a string em palavras baseadas em letras maiúsculas
    let palavras = str.match(/[A-Z]?[a-z]+/g);
    // Juntando as palavras com um espaço entre elas
    let resultado = palavras.join(' ');
    return resultado;
}


function criarObjetosComChavesEValores(arrayChaves, arrayValores) {

    try {
        const objetos = [];
        // Função auxiliar para verificar se uma string contém vírgulas
        function contemVirgulas(str) {
            return str.includes(',');
        }

        // Determinar o número de objetos a serem criados
        const numObjetos = arrayValores.some(contemVirgulas)
            ? arrayValores[0].split(',').length
            : 1;

        for (let i = 0; i < numObjetos; i++) {
            const objeto = {};
            for (let j = 0; j < arrayChaves.length; j++) {
                const chave = arrayChaves[j];
                const valor = arrayValores[j];
                // Verificar se o valor contém vírgulas
                if (contemVirgulas(valor)) {
                    const valores = valor.split(',');
                    // objeto[chave] = parseInt(valores[i], 10);
                    objeto[chave] = isNaN(valores[i]) ? valores[i] : parseInt(valores[i], 10);
                } else {
                    // objeto[chave] = parseInt(valor, 10);
                    objeto[chave] = isNaN(valor) ? valor : parseInt(valor, 10);
                }
            }
            objetos.push(objeto);
        }
        return objetos;

    } catch (error) {
        console.error('erros 44764 ' + error);
    }
}


//Normalizar os dados para a rede neural poder trabalhar com numeros somente Abaixo
// Função para normalizar os dados
function normalizarDadosParaARedeNeural(dados) {

    try {
        // Mapeamentos dinâmicos para as chaves de texto encontradas
        const mapeamentos = {};
        // Iterar sobre os dados e construir mapeamentos para chaves de texto
        for (let i = 0; i < dados.length; i++) {
            for (const chave in dados[i]) {
                if (dados[i].hasOwnProperty(chave) && typeof dados[i][chave] === 'string') {
                    if (!mapeamentos[chave]) {
                        mapeamentos[chave] = {};
                    }
                    if (!mapeamentos[chave][dados[i][chave]]) {
                        mapeamentos[chave][dados[i][chave]] = (Math.random() * 30 + 1).toFixed(0);
                    }
                }
            }
        }

        // Iterar sobre os dados novamente para substituir os valores de texto pelos valores normalizados
        for (let i = 0; i < dados.length; i++) {
            for (const chave in dados[i]) {
                if (dados[i].hasOwnProperty(chave) && mapeamentos[chave] && typeof dados[i][chave] === 'string') {
                    dados[i][chave] = parseInt(mapeamentos[chave][dados[i][chave]]);
                }
            }
        }
        return dados;

    } catch (error) {
        console.error('erros 86729 ' + error);
    }

}


//Desnormalizar os dados da rede Abaixo
// Função para desnormalizar os dados de saída da rede neural
function desnormalizarSaida(saida, mapeamentos) {
    const saidaDesnormalizada = {};
    for (const chave in saida) {
        if (saida.hasOwnProperty(chave) && mapeamentos[chave]) {
            const valor = saida[chave];
            for (const texto in mapeamentos[chave]) {
                if (mapeamentos[chave].hasOwnProperty(texto) && mapeamentos[chave][texto] === valor) {
                    saidaDesnormalizada[chave] = texto;
                    break;
                }
            }
        }
    }
    return saidaDesnormalizada;
}

/*
// Exemplo de uso abaixo
// Normalizar os dados
const { dadosNormalizados, mapeamentos } = normalizarDados(dados);
// Suponha que a saída da rede neural seja algo assim:
const saidaRedeNeural = { "educacao": 2, "desempenhoTrabalho": 4 };
// Desnormalizar a saída da rede neural
const saidaDesnormalizada = desnormalizarSaida(saidaRedeNeural, mapeamentos);
// Exibir a saída desnormalizada
console.log(saidaDesnormalizada);
*/

//Desnormalizar os dados da rede Acima



function obterUltimosValores(json, quantidade) {
    const valores = Object.values(json);
    if (quantidade <= valores.length) {
        return quantidade === 1 ? valores[valores.length - 1] : valores.slice(-quantidade);
    } else {
        console.log("A quantidade solicitada é maior do que o número de valores disponíveis no JSON.");
    }
}


// Função auxiliar para "achatar" arrays aninhados e remover valores indefinidos ou infinitos
function flattenAndFilter(arr) {
    return arr.flatMap(subArr => subArr.filter(isFinite));
}


function transformaZeroParaUmEmArray(array) {
    // Percorre o array
    for (let i = 0; i < array.length; i++) {
        // Verifica se o valor é igual a zero
        if (array[i] === 0) {
            // Transforma zero em um
            array[i] = 1;
        }
    }
    // Retorna o array modificado
    return array;
}


function criarMapeamentoDosDadosNormalizadoJSON(dadosSomenteValores, dadosTextoEValores) {
    let dadosTextosMapeados = [];
    // Iterar sobre cada objeto em dadosSomenteValores
    dadosSomenteValores.forEach((obj1, index) => {
        let mergedObj = {};
        // Iterar sobre as chaves do objeto
        Object.keys(obj1).forEach(key => {
            // Verificar se a chave existe no segundo objeto
            if (dadosTextoEValores[index][key] !== undefined) {
                // Se o valor for uma string, concatenar com o valor correspondente do segundo objeto
                // Se não, apenas adicionar o valor do primeiro objeto
                mergedObj[key] = typeof obj1[key] === 'string' ? `${dadosTextoEValores[index][key]}|${obj1[key]}` : dadosTextoEValores[index][key] + "|" + obj1[key];
            } else {
                // Se a chave não existir no segundo objeto, adicionar o valor do primeiro objeto
                mergedObj[key] = obj1[key];
            }
        });
        // Adicionar objeto mesclado ao array final
        dadosTextosMapeados.push(mergedObj);
    });

    return dadosTextosMapeados;
}


// Função para criar um array de arrays vazios com base no tamanho fornecido
function criarMatrizMultiDimenssional(tamanho) {
    const matriz = new Array(tamanho);
    for (let i = 0; i < tamanho; i++) {
        matriz[i] = [];
    }
    return matriz;
}


function particionandoArrayUnicoEmVarios(ArrayTotal, chunk) {
    try {
        const VariosArrays = [];
        for (let i = 0; i < ArrayTotal.length; i += chunk) {
            VariosArrays.push(ArrayTotal.slice(i, i + chunk));
        }
        console.log(VariosArrays);
        return VariosArrays;
    } catch (error) {
        console.error('erros 77647 ' + error);
    }
}



function particionandoArrayUnicoEmVarios2(array, chunk) {
    const result = [];
    for (let i = 0; i < array.length; i += array.length / chunk) {
        result.push(array.slice(i, i + array.length / chunk));
    }
    return result;
}


function obterUltimoValor(array) {
    // Retorna undefined se o array for vazio
    if (!array.length) return undefined;
    // Retorna o último elemento do array
    return array[array.length - 1];
}


function tipoDeDado(variavel) {
    if (Array.isArray(variavel)) {
        return "array";
    } else if (typeof variavel === "object" && variavel !== null) {
        return "objeto";
    } else {
        return typeof variavel;
    }
}


function substituirVirgulasPorBarrasVerticais(elemento) {
    // Verifica se o elemento é válido
    if (!elemento || !elemento.textContent) {
        return '';
    }
    const textoOriginal = elemento.textContent;
    const textoComBarras = textoOriginal.replace(/,/g, '|');
    return textoComBarras;
}



// Remover todos os elementos de uma div menos o primeiro elemento
function removerTodosElementosDaDivGraficoMenosOPrimeiro() {
    // Seleciona a div pelo ID
    var divGrafico = document.getElementById('divGraficoVariosGraficos');
    // Verifica se a div foi encontrada
    if (divGrafico) {
        // Obtém todos os elementos filhos da div, exceto o primeiro
        var elementosParaRemover = Array.from(divGrafico.children).slice(1);
        // Remove os elementos filhos
        elementosParaRemover.forEach(function (elemento) {
            divGrafico.removeChild(elemento);
        });
    } else {
        console.log('A div com o ID divGraficoVariosGraficos não foi encontrada.');
    }
}


