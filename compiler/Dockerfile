FROM ubuntu:20.04

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y

# for gcc 
RUN apt install curl vim sudo build-essential -y

# for jdk
# RUN apt-get install openjdk-8-jdk -y

RUN curl -sL https://deb.nodesource.com/setup_16.x | bash
RUN apt-get install nodejs -y
# RUN apt install npm -y

# Create app directory
WORKDIR /usr/src/

# copying everything from the app dir to the working dir
COPY . .

# making a temp folder in working dir
RUN mkdir temp

RUN chmod 700  /
RUN chmod 755 -R temp/
RUN adduser --disabled-password --gecos "" judge

# installing the dependencies in the working dir
RUN cd app && npm install

# # exposing port 3000
# EXPOSE 3000

# running the worker
CMD cd app && node app.js