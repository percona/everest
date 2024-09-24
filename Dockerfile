FROM golang:1.22-alpine as build

WORKDIR /everest

COPY . .

RUN apk add -U --no-cache ca-certificates

FROM scratch

WORKDIR /

COPY ./bin/everest  /everest-api
COPY ./bin/helm-tools /helm-tools
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080

ENTRYPOINT ["/everest-api"]
