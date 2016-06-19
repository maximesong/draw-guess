FROM alpine:3.3

ADD draw-guess draw-guess
ADD public public
CMD ["./draw-guess"]
