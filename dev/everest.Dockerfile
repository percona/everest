FROM alpine


WORKDIR /home/tilt
RUN adduser -D tilt
COPY ./bin/everest  ./everest-api
USER 1000:1000

EXPOSE 8080

ENTRYPOINT ["./everest-api"]
