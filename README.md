# Projeto FIG - Conversor de mídia para figurinhas

Um bot para WhatsApp que converte imagens, GIFs e vídeos em figurinhas (stickers).

## Funcionalidades

- Converte imagens em figurinhas estáticas
- Converte GIFs e vídeos em figurinhas animadas
- Processamento automático para garantir o formato correto

## Pré-requisitos

- Node.js
- NPM ou Yarn

## Instalação

1. Clone o repositório
```
git clone https://github.com/seu-usuario/Projeto-FIG.git
cd Projeto-FIG
```

2. Instale as dependências
```
npm install
```

3. Execute o projeto
```
node index.js
```

## Como usar

1. Escaneie o QR code com seu WhatsApp
2. Envie uma imagem, GIF ou vídeo para o número conectado com o texto "/fig"
3. O bot irá processar e retornar a mídia como uma figurinha

## Tecnologias utilizadas

- whatsapp-web.js
- sharp
- ffmpeg
- fluent-ffmpeg 