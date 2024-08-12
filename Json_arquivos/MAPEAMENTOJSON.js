function mesclarDados(dadosSomenteValores, dadosTextoEValores) {
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

// Exemplo de uso:
let dadosSomenteValores = [
    {
        "idade": 35,
        "certificado": 9,
        "anosExperiencia": 10,
        "educacao": 24,
        "desempenhoTrabalho": 23
    },
    {
        "idade": 28,
        "certificado": 7,
        "anosExperiencia": 6,
        "educacao": 15,
        "desempenhoTrabalho": 12
    },
    {
        "idade": 42,
        "certificado": 8,
        "anosExperiencia": 15,
        "educacao": 1,
        "desempenhoTrabalho": 23
    }
];

let dadosTextoEValores = [
    {
        "idade": 35,
        "certificado": 9,
        "anosExperiencia": 10,
        "educacao": "Mestrado",
        "desempenhoTrabalho": "Excelente"
    },
    {
        "idade": 28,
        "certificado": 7,
        "anosExperiencia": 6,
        "educacao": "Bacharelado",
        "desempenhoTrabalho": "Bom"
    },
    {
        "idade": 42,
        "certificado": 8,
        "anosExperiencia": 15,
        "educacao": "Doutorado",
        "desempenhoTrabalho": "Excelente"
    }
];

let dadosTextosMapeados = mesclarDados(dadosSomenteValores, dadosTextoEValores);
console.log(dadosTextosMapeados);
