FROM node:12-alpine

WORKDIR /home/app
COPY . .

RUN addgroup -S appgroup
RUN adduser -S -D -h /home/app app appgroup
RUN chown -R app:appgroup /home/app
USER app

RUN yarn
EXPOSE ${PORT}
CMD ["yarn", "start"]

