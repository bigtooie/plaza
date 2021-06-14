FROM node:15-alpine

RUN apk --update add git less openssh && \
    rm -rf /var/lib/apt/lists/* && \
    rm /var/cache/apk/*
    
WORKDIR /app

RUN git clone https://github.com/bigtooie/plaza --depth 1 && \
    cd plaza && \
    npm i -g npm@6.14.13 && \
    npm i -g @angular/cli@11.2.9 node-gyp@8.1.0 ts-node@9.1.1 typescript@4.2.4 && \
    npm i

# TODO: COPY server/secret/secret.ts & shared/globals.ts
# COPY . .
EXPOSE 42069
WORKDIR /app/plaza
CMD ["./start.sh"]

