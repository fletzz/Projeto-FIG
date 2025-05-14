require('dotenv').config();
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const http = require('http');

// Criar servidor HTTP básico para o Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

// Configurar o caminho do ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Pasta para salvar as imagens temporárias
const tmpFolder = process.env.TEMP_FOLDER || path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpFolder)) {
    fs.mkdirSync(tmpFolder, { recursive: true });
}

// Configurações do cliente
const clientConfig = {
    puppeteer: {
        headless: true,
        args: (process.env.CHROME_ARGS || '--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage').split(',')
    }
};

if (process.env.CHROME_PATH) {
    clientConfig.puppeteer.executablePath = process.env.CHROME_PATH;
}

// Inicializa o cliente WhatsApp
const client = new Client(clientConfig);

// Mantém o processo vivo
process.on('SIGTERM', async () => {
    console.log('Recebido SIGTERM. Desconectando...');
    try {
        await client.destroy();
    } catch (err) {
        console.error('Erro ao desconectar:', err);
    }
    process.exit(0);
});

// Reconexão automática
let reconnectInterval;
const startReconnectInterval = () => {
    if (!reconnectInterval) {
        reconnectInterval = setInterval(async () => {
            if (!client.isConnected) {
                console.log('Tentando reconectar...');
                try {
                    await client.initialize();
                } catch (err) {
                    console.error('Erro ao reconectar:', err);
                }
            }
        }, 30000); // Tenta reconectar a cada 30 segundos
    }
};

// Gera o QR code para autenticação
client.on('qr', (qr) => {
    console.log('QR Code gerado. Escaneie para autenticar:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente pronto e conectado!');
});

client.on('authenticated', () => {
    console.log('Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
    console.error('Falha na autenticação:', msg);
});

// Processa as mensagens recebidas
client.on('message', async (message) => {
    const caption = message.body.toLowerCase();
    
    // Verifica se a mensagem contém '/fig' e se tem mídia
    if (caption.includes('/fig') && message.hasMedia) {
        try {
            console.log('Recebendo mídia para converter em figurinha...');
            
            // Baixa a mídia com retry
            let media = null;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!media && retryCount < maxRetries) {
                try {
                    media = await message.downloadMedia();
                    if (!media) {
                        throw new Error('Mídia vazia');
                    }
                } catch (downloadError) {
                    console.log(`Tentativa ${retryCount + 1} falhou:`, downloadError.message);
                    retryCount++;
                    if (retryCount === maxRetries) {
                        throw new Error('Falha ao baixar a mídia após várias tentativas');
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1 segundo antes de tentar novamente
                }
            }
            
            console.log('Tipo de mídia:', media.mimetype);
            
            const timestamp = Date.now();
            let isAnimated = media.mimetype === 'image/gif' || media.mimetype === 'video/mp4';
            let extension = isAnimated ? (media.mimetype === 'image/gif' ? 'gif' : 'mp4') : 'png';
            
            // Caminhos para os arquivos
            const mediaPath = path.join(tmpFolder, `original_${timestamp}.${extension}`);
            const stickerPath = path.join(tmpFolder, `sticker_${timestamp}.webp`);
            
            // Salva a mídia em arquivo
            fs.writeFileSync(mediaPath, Buffer.from(media.data, 'base64'));
            
            // Processa a mídia
            try {
                if (isAnimated) {
                    // Processa GIF ou vídeo usando ffmpeg
                    console.log('Processando animação...');
                    await new Promise((resolve, reject) => {
                        ffmpeg(mediaPath)
                            .outputOptions([
                                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
                                '-vcodec', 'libwebp',
                                '-loop', '0',
                                '-preset', 'default',
                                '-an',
                                '-vsync', '0',
                                '-t', '10'
                            ])
                            .save(stickerPath)
                            .on('end', resolve)
                            .on('error', (err) => {
                                console.error('Erro ao processar animação:', err);
                                reject(err);
                            });
                    });
                } else {
                    // Processa imagem usando sharp
                    console.log('Processando imagem...');
                    await sharp(mediaPath)
                        .resize(512, 512, {
                            fit: 'cover',
                            position: 'centre'
                        })
                        .toFormat('webp')
                        .toFile(stickerPath);
                }
                
                // Verifica se o arquivo de saída foi criado
                if (fs.existsSync(stickerPath)) {
                    // Envia a figurinha com retry
                    let sendRetryCount = 0;
                    const maxSendRetries = 3;
                    let sent = false;
                    
                    while (!sent && sendRetryCount < maxSendRetries) {
                        try {
                            const sticker = MessageMedia.fromFilePath(stickerPath);
                            await message.reply(sticker, undefined, { sendMediaAsSticker: true });
                            console.log('Figurinha enviada com sucesso!');
                            sent = true;
                        } catch (sendError) {
                            console.error(`Erro ao enviar figurinha (tentativa ${sendRetryCount + 1}):`, sendError);
                            sendRetryCount++;
                            if (sendRetryCount === maxSendRetries) {
                                throw new Error('Falha ao enviar figurinha após várias tentativas');
                            }
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } else {
                    throw new Error('Arquivo de figurinha não foi criado');
                }
            } catch (processingError) {
                console.error('Erro no processamento:', processingError);
                await message.reply('Erro ao processar a mídia. Tente novamente com outra imagem.');
            } finally {
                // Limpa os arquivos temporários
                try {
                    if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
                    if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);
                } catch (cleanupError) {
                    console.error('Erro ao limpar arquivos temporários:', cleanupError);
                }
            }
        } catch (error) {
            console.error('Erro geral:', error);
            try {
                await message.reply('Desculpe, houve um erro ao criar a figurinha. Tente novamente.');
            } catch (replyError) {
                console.error('Erro ao enviar mensagem de erro:', replyError);
            }
        }
    }
});

// Log de erros
client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    startReconnectInterval();
});

// Inicia o cliente
console.log('Iniciando cliente WhatsApp...');
client.initialize()
    .then(() => {
        console.log('Cliente inicializado com sucesso!');
        startReconnectInterval();
    })
    .catch(err => {
        console.error('Erro ao inicializar o cliente:', err);
        startReconnectInterval();
    });