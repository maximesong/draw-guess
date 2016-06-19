package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()
	r.Static("/js", "./public/js")
	r.StaticFile("/", "./public/index.html")
	r.Static("/css", "./public/css")

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})
	r.Run() // listen and server on 0.0.0.0:8080
}
