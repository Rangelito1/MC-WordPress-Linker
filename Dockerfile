# To Build Run: docker build . -t Lianecx/SMPBOT

FROM node:18
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm install -g @mapbox/node-pre-gyp
RUN apt update
RUN apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev 
RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3100
CMD [ "node", "main.js" ]