FROM alpine

WORKDIR /home/tilt
RUN adduser -D tilt
COPY ./bin/manager .
USER 1000:1000

ENTRYPOINT ["./manager"]
