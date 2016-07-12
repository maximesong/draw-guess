build:
	GOOS=linux go build

run:
	gin

docker-build: build
	docker build -t draw-guess .
