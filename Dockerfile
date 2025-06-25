FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p downloads public
EXPOSE 3000
CMD ["npm", "start"]
