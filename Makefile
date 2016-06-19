build:
	GOOS=linux go build

docker-build: build
	docker build -t draw-guess .

run:
	docker run --rm -p 3000:3000 draw-guess
