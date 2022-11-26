FROM node:16-alpine3.11

RUN apk update && apk add --no-cache curl vim bash build-base sudo python3 py3-pip openjdk11

WORKDIR /usr/src/

COPY . .

RUN mkdir temp

RUN chmod 700  /
RUN chmod 755 -R temp/
RUN adduser --disabled-password --gecos "" judge

RUN cd app && npm install

# If you are building your code for production
# RUN npm ci --only=production

CMD cd app && node app.js
