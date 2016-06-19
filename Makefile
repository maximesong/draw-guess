build:
	GOOS=linux go build

run:
	gin

docker-build: build
	docker build -t draw-guess .

docker-run:
	docker run --rm -p 8080:8080 draw-guess
