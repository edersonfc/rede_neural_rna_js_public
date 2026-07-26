## <center>Rede Neural em JavaScript</center>

Este projeto é uma rede neural do tipo **perceptron multi-layer** feita totalmente em JavaScript, HTML e CSS,
com critérios didáticos: os componentes básicos essenciais estão todos à vista, e o painel mostra em tempo real
o que acontece dentro da rede enquanto ela treina.

**Nada de bibliotecas na aplicação.** JavaScript puro e HTML simples — basta abrir o
`painel_rede_neural_pml.html` no navegador, sem instalar nada, sem build, sem servidor.

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural.png)

No painel, é mostrado durante o processo de treinamento os pesos sinápticos sendo ajustados automaticamente,
bem como a saída da rede em cada época de treinamento.

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural2.png)

Carregue o arquivo JSON pelo painel de configurações de dados, à direita do painel.

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural_3.png?)

Modele a estrutura da rede neural com quantas camadas escondidas quiser e quantos neurônios quiser,
tanto na camada de entrada quanto na de saída.

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural_4.png)

---

## A animação: vendo a rede pensar

Enquanto a rede treina, o `<canvas>` mostra o que está realmente acontecendo — e os números
**não são inventados**: cada quadro é desenhado com os valores que o motor acabou de calcular.

| O que você vê | O que significa |
|---|---|
| 🟢 **Pulsos verdes** indo da esquerda para a direita | A **propagação para frente**: o sinal saindo dos dados, atravessando cada camada até virar a previsão |
| 🟠 **Pulsos laranja** voltando da direita para a esquerda | A **retropropagação**: o erro nascendo na saída e voltando, camada por camada, para corrigir os pesos |
| 🔵 **Fios azuis** / 🔴 **fios vermelhos** | O **sinal do peso sináptico**: azul estimula, vermelho inibe. Quanto mais grosso e mais forte, maior o peso |
| **Neurônios acendendo** com halo e onda circular | A **ativação** daquele neurônio: quanto mais forte o valor, mais ele brilha |
| **Número dentro do neurônio** | O valor exato de ativação naquele instante |
| **Topo do canvas** | Época, amostra e erro atuais |
| **Rodapé do canvas** | Legenda das cores e o nome/tamanho de cada camada |

Controles logo abaixo do desenho:

- **Velocidade** — no mínimo, dá para acompanhar cada onda percorrendo a rede fio a fio; no máximo,
  o treino corre solto e a animação mostra sempre o passo mais recente.
- **Animar / Valores / Pesos** — liga e desliga a animação, os valores dentro dos neurônios e os pesos escritos sobre os fios.
- **Pausar / Continuar / Parar** — o treinamento roda passo a passo e pode ser congelado a qualquer momento.
- **Testar Conexões** — roda a animação sem treinar, só para ver o caminho do sinal.

---

## Funcionalidades

- Animação em tempo real da propagação, da retropropagação e da ativação de cada neurônio.
- Arquitetura totalmente ajustável: neurônios na entrada, na saída e em quantas camadas escondidas quiser.
- Funções de ativação selecionáveis: **Sigmoide, Tangente Hiperbólica, ReLU, Leaky ReLU e Linear**.
- Backpropagation com regra da cadeia, regularização L2 e *gradient clipping*.
- Normalização automática dos dados (min-max) e desnormalização do resultado para a unidade original.
- Colunas de texto viram números de forma determinística (o mesmo texto sempre vira o mesmo número).
- Curva do erro por época, mais uma curva "real x previsto" por amostra.
- Carregamento de qualquer arquivo JSON para treinamento, seguindo o padrão abaixo,
  com quantos objetos achar necessário. **As últimas colunas são a resposta que a rede deve aprender a prever.**

```json
[
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
    }
]
```

---

## Os arquivos

| Arquivo | Papel |
|---|---|
| `painel_rede_neural_pml.html` | O painel. Abra este arquivo no navegador |
| `motor_rede_neural.js` | **A matemática pura.** Sem DOM, sem canvas: ativações, forward, backpropagation, MSE, L2, normalização |
| `animacao_rede_neural.js` | O motor de animação do canvas: fios, pulsos, ondas e brilho dos neurônios |
| `rna_pml_js_puro.js` | Orquestra: lê o painel, roda o treinamento passo a passo e alimenta a animação e os gráficos |
| `funcoes_principal_do_frontend.js` | A interface: monta a arquitetura na tela e liga os botões |
| `funcoes_auxiliares.js` | Geometria, coordenadas e conversões de texto |
| `index.css` | Estilos |

O único recurso externo que o painel usa é a **biblioteca de gráficos do Google**, apenas para as curvas
da direita. Sem internet, o painel e o treinamento continuam funcionando normalmente — só as curvas
deixam de aparecer.

---

## Instalação

```bash
git clone https://github.com/edersonfc/rede_neural_rna_js_public.git
```

Depois é só abrir o `painel_rede_neural_pml.html` no navegador. **Não precisa instalar nada.**

---

## Testes automatizados

Os testes — e **somente os testes** — usam bibliotecas externas (Jest + jsdom).
A aplicação continua sem nenhuma dependência.

```bash
npm install              # só na primeira vez, e só se você for rodar os testes
npm test                 # roda tudo
npm run test:cobertura   # com relatório de cobertura
```

São **168 testes** em 4 arquivos:

| Arquivo de teste | O que verifica |
|---|---|
| `testes/motor_rede_neural.test.js` | A matemática, sem navegador. Inclui a **conferência dos gradientes contra a derivada numérica** e o aprendizado do **XOR** — problema que nenhuma rede linear resolve |
| `testes/funcoes_auxiliares.test.js` | Geometria, coordenadas e conversões de texto |
| `testes/animacao_rede_neural.test.js` | As ondas, o relógio da animação e o desenho no canvas |
| `testes/painel_integracao.test.js` | O painel HTML inteiro carregado no jsdom: clica nos botões e confere o resultado de ponta a ponta |

---

## Notas sobre a versão 2.0

Esta versão corrigiu falhas que impediam a rede de aprender, e reescreveu o motor:

- **A rede não treinava.** Um `.pop()` removia a última camada escondida do mesmo array usado no
  cálculo. Com uma camada escondida — o padrão — a saída da rede era sempre `0`.
- **Não havia função de ativação.** As camadas eram puramente lineares, o que torna uma rede de
  10 camadas matematicamente equivalente a uma única camada.
- **O backpropagation não aplicava a regra da cadeia**: o mesmo gradiente era usado em todas as camadas.
- **Todas as épocas eram agendadas de uma só vez** com `setTimeout`, e o atraso dependia apenas da época —
  então épocas de amostras diferentes disparavam no mesmo instante.
- **As linhas do canvas saíam do lugar** ao rolar a página, porque a posição era calculada somando
  `window.scrollY` à altura de uma faixa de botões.
- Redesenhar uma conexão redesenhava o canvas inteiro, custando N² operações.
- Os dados não eram reescalados, e colunas de texto viravam números **aleatórios** — o mesmo texto
  podia virar um número diferente a cada execução.

<br>

`Créditos` [www.linkedin.com/in/ederson-feliciano-corsatto](www.linkedin.com/in/ederson-feliciano-corsatto)
