FROM node:10.13.0

RUN apt-get update -y && apt-get install libsecret-1-dev -y
## Add the wait script to the image
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.4.0/wait /wait

COPY . /alchemy
WORKDIR /alchemy

RUN npm ci
RUN chmod +x /wait
ENTRYPOINT [ "/entry.sh" ]