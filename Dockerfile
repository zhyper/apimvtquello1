# adapted from https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
FROM node:16-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD [ "npm", "run", "start" ]
