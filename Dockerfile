# Usar imagen oficial de Node.js
FROM node:18-slim

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node.js (usar install en lugar de ci)
RUN npm install --only=production

# Copiar código fuente
COPY . .

# Crear directorio de descargas y public
RUN mkdir -p downloads public

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
