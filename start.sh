#!/usr/bin/env sh

ng build --prod
ts-node server/main.ts
