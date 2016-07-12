FROM alpine:3.4

COPY draw-guess draw-guess
COPY public public
CMD ["./draw-guess"]
