# Controle de Horas Extras

## Descrição

Este projeto é uma aplicação para controle de horas extras dos usuários. Ele calcula automaticamente as horas extras trabalhadas com base nos registros de acesso dos usuários.

## Pré-requisitos

- Node.js instalado (>=21.6.1)
- NPM instalado (>=10.2.4)
- Acesso ao dispositivo de controle de acesso [iDBlock](https://www.controlid.com.br/controle-de-acesso/idblock-preta/)

## Instalação

1. Clone este repositório

    ```Bash
    git clone git@github.com:GMorais47/horas_extras_automatizadas.git
    ```

2. Acesse o diretório da aplicação

    ```Bash
    cd horas_extras_automatizadas
    ```

3. Instale as dependências do projeto

    ```Bash
    npm install
    ```

4. Crie as variaveis de ambiente

    ```Bash
    copy .env-exemplo .env
    ```

5. Configure as variaveis de ambiente

    ```Bash
    DISPOSITIVO_IP= #Endereço http para comunicar com o dispositivo
    DISPOSITIVO_USUARIO= #Usuário de conexão
    DISPOSITIVO_SENHA= #Senha do usuário de conexão
    TOLERANCIA= #Tolerância de tempo (em minutos, Ex: 10)
    VALOR_HORA= #Valor da hora (Ex: 0.25)
    CAMINHO_EXTRAS= #Caminho de saída para os relatórios
    ```

## Uso

- Produção
  1. Realize o Build do projeto

      ```Bash
      npm run build
      ```

  2. Inicie a aplicação

      ```Bash
      npm start
      ```

- Desenvolvimento

    ```Bash
      npm run start:dev
    ```
