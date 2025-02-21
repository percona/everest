FROM alpine as dev
WORKDIR /home/everest
RUN adduser -D everest
USER 1000:1000
COPY ./bin/everest  ./everest-api

EXPOSE 8080
ENTRYPOINT ["./everest-api"]

# Build the Delve debuger
FROM golang:1.24-alpine as delve
RUN go install github.com/go-delve/delve/cmd/dlv@v1.24.0
RUN chmod +x /go/bin/dlv

# Build the image with debuger
FROM dev as debug
COPY --from=delve /go/bin/dlv /dlv
WORKDIR /
USER root

# Expose Delve port
EXPOSE 40000
ENTRYPOINT [ "/dlv", \
    "--listen=:40000", \
    "--headless=true", \
    "--api-version=2", \
    "--continue=true", \
    "--accept-multiclient=true", \
    "exec", \
    "/home/everest/everest-api", \
    "--"]
