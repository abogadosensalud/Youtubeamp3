# Usar imagen de Python que incluye Node.js
FROM python:3.11-slim

# Instalar Node.js y npm
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip install --upgrade pip && pip install yt-dlp

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias de Node.js
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio de descargas
RUN mkdir -p downloads

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
