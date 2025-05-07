const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Configurar o caminho do ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Pasta para salvar as imagens temporárias
const tmpFolder = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpFolder)) {
    fs.mkdirSync(tmpFolder);
}

// Inicializa o cliente WhatsApp
const client = new Client({
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

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
            message.reply('Convertendo em figurinha...');
            
            // Baixa a mídia
            const media = await message.downloadMedia();
            
            if (!media) {
                console.log('Falha ao baixar a mídia');
                message.reply('Falha ao baixar a mídia. Tente novamente.');
                return;
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
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .toFormat('webp')
                        .toFile(stickerPath);
                }
                
                // Verifica se o arquivo de saída foi criado
                if (fs.existsSync(stickerPath)) {
                    // Envia a figurinha
                    const sticker = MessageMedia.fromFilePath(stickerPath);
                    await message.reply(sticker, undefined, { sendMediaAsSticker: true });
                    console.log('Figurinha enviada com sucesso!');
                } else {
                    throw new Error('Arquivo de figurinha não foi criado');
                }
            } catch (processingError) {
                console.error('Erro no processamento:', processingError);
                message.reply('Erro ao processar a mídia. Tente novamente com outra imagem.');
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
            message.reply('Desculpe, houve um erro ao criar a figurinha. Tente novamente.');
        }
    }
});

// Log de erros
client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
});

// Inicia o cliente
console.log('Iniciando cliente WhatsApp...');
client.initialize().catch(err => {
    console.error('Erro ao inicializar o cliente:', err);
});