build:
	GOOS=linux go build

run:
	gin

docker-build: build
	docker build -t draw-guess .

docker-run:
	docker run --rm -p 8080:8080 -e "MONGO_HOST=mongo://192.168.99.100:32017" draw-guess
