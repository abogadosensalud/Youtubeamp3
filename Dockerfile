# Usar imagen oficial de Node.js
FROM node:18-slim

# Instalar dependencias del sistema y yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Crear un entorno virtual de Python y instalar yt-dlp
RUN python3 -m venv /opt/venv
RUN /opt/venv/bin/pip install --upgrade pip
RUN /opt/venv/bin/pip install yt-dlp

# Agregar el entorno virtual al PATH
ENV PATH="/opt/venv/bin:$PATH"

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
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
