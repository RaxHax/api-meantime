FROM node:18-bullseye

WORKDIR /srv

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps || npm install

COPY functions/package.json functions/package-lock.json* ./functions/
RUN cd functions && npm install --legacy-peer-deps || npm install

COPY . .

RUN npm run build

EXPOSE 8080
CMD ["npm", "run", "serve"]
