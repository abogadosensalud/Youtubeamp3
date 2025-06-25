// server.js - Backend para Railway
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

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

// Función para limpiar nombre de archivo
function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9.-]/gi, '_').substring(0, 100);
}

// Función para validar URL de YouTube
function isValidYouTubeUrl(url) {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return regex.test(url);
}

// Endpoint principal de descarga
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

        if (!isValidYouTubeUrl(url)) {
            return res.status(400).json({
                success: false,
                error: 'URL de YouTube inválida'
            });
        }

        if (!['mp3', 'mp4'].includes(format)) {
            return res.status(400).json({
                success: false,
                error: 'Formato no soportado'
            });
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const outputDir = path.join(downloadsDir, timestamp.toString());
        fs.mkdirSync(outputDir, { recursive: true });

        let command;
        let outputFile;

        if (format === 'mp3') {
            outputFile = path.join(outputDir, `audio_${timestamp}.%(ext)s`);
            command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputFile}" "${url}"`;
        } else {
            outputFile = path.join(outputDir, `video_${timestamp}.%(ext)s`);
            command = `yt-dlp -f "best[height<=720]" -o "${outputFile}" "${url}"`;
        }

        console.log(`Ejecutando: ${command}`);

        // Ejecutar yt-dlp
        const { stdout, stderr } = await execAsync(command, {
            timeout: 300000 // 5 minutos timeout
        });

        console.log('stdout:', stdout);
        if (stderr) console.log('stderr:', stderr);

        // Buscar el archivo descargado
        const files = fs.readdirSync(outputDir);
        if (files.length === 0) {
            throw new Error('No se pudo descargar el archivo');
        }

        const downloadedFile = files[0];
        const filePath = path.join(outputDir, downloadedFile);

        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            throw new Error('Archivo no encontrado después de la descarga');
        }

        // Crear endpoint temporal para la descarga
        const downloadId = timestamp.toString();
        const filename = sanitizeFilename(downloadedFile);

        // Servir el archivo
        app.get(`/file/${downloadId}`, (req, res) => {
            res.download(filePath, filename, (err) => {
                if (err) {
                    console.error('Error al enviar archivo:', err);
                } else {
                    // Limpiar archivo después de 10 minutos
                    setTimeout(() => {
                        try {
                            fs.rmSync(outputDir, { recursive: true, force: true });
                            console.log(`Archivo limpiado: ${outputDir}`);
                        } catch (cleanupError) {
                            console.error('Error al limpiar archivo:', cleanupError);
                        }
                    }, 10 * 60 * 1000); // 10 minutos
                }
            });
        });

        res.json({
            success: true,
            downloadUrl: `/file/${downloadId}`,
            filename: filename
        });

    } catch (error) {
        console.error('Error en descarga:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la descarga: ' + error.message
        });
    }
});

// Endpoint de información del video
app.post('/info', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url || !isValidYouTubeUrl(url)) {
            return res.status(400).json({
                success: false,
                error: 'URL de YouTube inválida'
            });
        }

        const command = `yt-dlp --dump-json "${url}"`;
        const { stdout } = await execAsync(command);
        
        const info = JSON.parse(stdout);
        
        res.json({
            success: true,
            title: info.title,
            duration: info.duration,
            uploader: info.uploader,
            thumbnail: info.thumbnail
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
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Limpiar archivos antiguos al iniciar
function cleanupOldFiles() {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        
        files.forEach(file => {
            const filePath = path.join(downloadsDir, file);
            const stats = fs.statSync(filePath);
            const ageInMinutes = (now - stats.mtime.getTime()) / (1000 * 60);
            
            if (ageInMinutes > 30) { // Limpiar archivos de más de 30 minutos
                fs.rmSync(filePath, { recursive: true, force: true });
                console.log(`Archivo antiguo limpiado: ${file}`);
            }
        });
    } catch (error) {
        console.error('Error en limpieza:', error);
    }
}

// Limpiar archivos cada 30 minutos
setInterval(cleanupOldFiles, 30 * 60 * 1000);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    cleanupOldFiles(); // Limpiar al iniciar
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Promesa rechazada:', error);
});