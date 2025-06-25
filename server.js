// server-alternative.js - Backend alternativo sin yt-dlp
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crear directorio de descargas si no existe
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Función para extraer video ID de YouTube
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/ // ID directo de 11 caracteres
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Función para obtener información del video usando una API pública
async function getVideoInfo(videoId) {
    return new Promise((resolve, reject) => {
        // Usar API pública de YouTube (requiere API key)
        // Por seguridad, esta es una implementación simplificada
        
        // Alternativa: usar web scraping básico (no recomendado para producción)
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    resolve({
                        title: info.title,
                        author: info.author_name,
                        thumbnail: info.thumbnail_url
                    });
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Endpoint principal - usando servicio externo seguro
app.post('/download', async (req, res) => {
    try {
        const { url, format } = req.body;

        // Validaciones
        if (!url || !format) {
            return res.status(400).json({
                success: false,
                error: 'URL y formato son requeridos'
            });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'URL de YouTube inválida'
            });
        }

        // Obtener información del video
        const videoInfo = await getVideoInfo(videoId);

        // Crear URL para servicio de descarga externo confiable
        // Nota: En producción, deberías usar tu propia implementación segura
        const downloadServiceUrl = `https://api.cobalt.tools/api/json`;
        
        const response = await fetch(downloadServiceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                vCodec: format === 'mp4' ? 'h264' : undefined,
                vQuality: '720',
                aFormat: format === 'mp3' ? 'mp3' : 'best',
                isAudioOnly: format === 'mp3'
            })
        });

        const result = await response.json();

        if (result.status === 'success' || result.status === 'redirect') {
            res.json({
                success: true,
                downloadUrl: result.url,
                filename: `${videoInfo.title.replace(/[^a-z0-9]/gi, '_')}.${format}`,
                videoInfo: videoInfo
            });
        } else {
            throw new Error(result.text || 'Error en el servicio de descarga');
        }

    } catch (error) {
        console.error('Error en descarga:', error);
        res.status(500).json({
            success: false,
            error: 'Servicio temporalmente no disponible. Por favor intenta más tarde.'
        });
    }
});

// Endpoint de información del video
app.post('/info', async (req, res) => {
    try {
        const { url } = req.body;
        const videoId = extractVideoId(url);
        
        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'URL de YouTube inválida'
            });
        }

        const info = await getVideoInfo(videoId);
        res.json({
            success: true,
            ...info
        });

    } catch (error) {
        console.error('Error obteniendo info:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener información del video'
        });
    }
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'YouTube Downloader Alternative'
    });
});

// Servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor alternativo corriendo en puerto ${PORT}`);
});

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Promesa rechazada:', error);
});
