package main

import (
	"log"

	"gopkg.in/mgo.v2"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Pos struct {
	X int `json:"x"`
	Y int `json:"y"`
}
type Path struct {
	From Pos `json:"from"`
	To   Pos `json:"to"`
}
type DrawingMessage struct {
	Seq     int    `json:"seq"`
	Strokes []Path `json:"strokes"`
	Action  string `json:"action"`
}

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
	r.GET("/chanel", serveWs)
	_, err := mgo.Dial("mongodb://localhost:27017")
	if err != nil {
		log.Println("what ?", err)
	}
	r.Run() // listen and server on 0.0.0.0:8080
}

func serveWs(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("ws", err)
		return
	}
	session, err := mgo.Dial("mongodb://localhost:27017")
	if err != nil {
		log.Println("dial", err)
		return
	}
	coll := session.DB("drawing").C("drawing")
	defer ws.Close()
	for {
		var message DrawingMessage
		err := ws.ReadJSON(&message)
		if err != nil {
			log.Println("read:", err)
			break
		}
		if message.Action == "clear" {
			coll.RemoveAll(make(map[string]interface{}))
			return
		}
		log.Printf("recv: %s", message)
		err = coll.Insert(message)
		if err != nil {
			log.Println("insert", err)
			break
		}
		err = ws.WriteJSON(message)
		if err != nil {
			log.Println("write:", err)
			break
		}
	}
}
