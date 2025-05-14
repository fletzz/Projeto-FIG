# Bot de Figurinhas WhatsApp

Bot que cria figurinhas a partir de imagens, GIFs e vídeos enviados no WhatsApp.

## Funcionalidades

- Cria figurinhas a partir de imagens
- Suporte a GIFs e vídeos
- Conversão automática para o formato WebP
- Redimensionamento automático

## Como usar

1. Envie uma imagem, GIF ou vídeo para o bot
2. Digite `/fig` na legenda
3. Aguarde o bot processar e enviar sua figurinha

## Requisitos

- Node.js 16 ou superior
- NPM ou Yarn

## Instalação Local

```bash
# Clone o repositório
git clone [seu-repositorio]

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o bot
npm start
```

## Deploy

### Railway (Recomendado)

1. Crie uma conta no [Railway](https://railway.app)
2. Conecte seu repositório GitHub
3. Crie um novo projeto e selecione o repositório
4. Configure as variáveis de ambiente:
   - NODE_ENV=production
   - TEMP_FOLDER=tmp
   - CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage

### Render

1. Crie uma conta no [Render](https://render.com)
2. Crie um novo Web Service
3. Conecte seu repositório
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Configure as mesmas variáveis de ambiente do Railway

### Heroku

1. Crie uma conta no [Heroku](https://heroku.com)
2. Instale o [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
3. Execute:
```bash
heroku login
heroku create
git push heroku main
```
4. Configure as variáveis de ambiente:
```bash
heroku config:set NODE_ENV=production
heroku config:set TEMP_FOLDER=tmp
heroku config:set CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
```

## Variáveis de Ambiente

- `NODE_ENV`: Ambiente de execução (development/production)
- `TEMP_FOLDER`: Pasta para arquivos temporários
- `CHROME_PATH`: Caminho para o executável do Chrome (opcional)
- `CHROME_ARGS`: Argumentos para o Chrome/Puppeteer

## Contribuindo

Sinta-se à vontade para abrir issues e pull requests!

## Tecnologias utilizadas

- whatsapp-web.js
- sharp
- ffmpeg
- fluent-ffmpeg 