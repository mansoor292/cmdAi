FROM node:18-slim

# Install required dependencies for node-pty
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create public/xterm directory and copy xterm files
RUN mkdir -p public/xterm/css public/xterm/lib && \
    cp node_modules/xterm/css/xterm.css public/xterm/css/ && \
    cp node_modules/xterm/lib/xterm.js public/xterm/lib/

EXPOSE 3000

CMD ["node", "server.js"]
