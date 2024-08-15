## <center>Rede Neural em JavaScript</center>

Este projeto é uma rede neural do tipo perceptron multi-layer feita totalmente em JavaScript, HTML e CSS, 
- Com critérios didáticos de como funciona uma RN com os componentes básicos essenciais, 
- Todo o motor princial de funcionamento da RN está no arquivo **rna_pml_js_puro.js**

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural.png)

No painel, é mostrado durante o processo de treinamento os pesos sinápticos sendo ajustados automaticamente, bem como a saída da rede em cada época de treinamento.

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural2.png)


Carregue o Arquivo JSON pelo pela de configurações do painel de dados a direita do painel

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural_3.png?)


Modele a estrutura da rede neural com quantas camadas escondidas quiser e quantos neurônios quiser tanto na camada de entrada quanto na de saída

![Painel de Rede Neural](https://github.com/edersonfc/rede_neural_rna_js_public/blob/main/images/painel_rede_neural_4.png)


## Funcionalidades
- Treinamento em tempo real com visualização dos pesos sinápticos.
- Ajuste automático de parâmetros durante o treinamento.
- Visualização gráfica das saídas da rede por época.
- Carregamento de qualquer arquivo JSON para treinamento de Teste seguindo esse padrão Abaixo com quantos objetos achar necessário.
#### Exemplo Abaixo:
```
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


## Instalação
1. Clone o repositório:
   ```bash
   git clone https://github.com/edersonfc/rede_neural_rna_js_public.git
   ```
   <br>

`Créditos` [www.linkedin.com/in/ederson-feliciano-corsatto](www.linkedin.com/in/ederson-feliciano-corsatto)
