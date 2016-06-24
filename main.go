package main

import (
	"encoding/json"
	"log"
	"os"

	"github.com/garyburd/redigo/redis"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const RedisKey = "drawing"
const UUIDSeqKey = "uuidseq"

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
type ReqMessage struct {
	BaseUUID string `json:"baseUUID"`
	Strokes  []Path `json:"strokes"`
	Action   string `json:"action"`
}

type RespMessage struct {
	UUID    string `json:"uuid"`
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

	redisHost := getRedisHost()
	c, err := redis.Dial("tcp", redisHost)
	if err != nil {
		log.Print(err)
	}
	defer c.Close()

	r.Run() // listen and server on 0.0.0.0:8080
}

func getRedisHost() (host string) {
	host = os.Getenv("REDIS_HOST")
	if host == "" {
		host = ":6379"
	}
	return
}

func getRedisConn() (conn redis.Conn, err error) {
	return redis.Dial("tcp", getRedisHost())
}

func serveWs(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("ws", err)
		return
	}
	conn, err := getRedisConn()
	if err != nil {
		log.Println("get conn", err)
		return
	}
	defer conn.Close()
	for {
		var message ReqMessage
		err := ws.ReadJSON(&message)
		if err != nil {
			log.Println("read:", err)
			break
		}
		switch message.Action {
		case "clear":
			if _, err = conn.Do("DEL", RedisKey); err != nil {
				log.Println("clear", err)
				break
			}
		case "fetch":
			values, e := redis.Strings(conn.Do("LRANGE", RedisKey, 0, -1))
			if e != nil {
				err = e
				log.Println(err)
				break
			}
			log.Println(values)
			for _, v := range values {
				var msg RespMessage
				json.Unmarshal([]byte(v), &msg)
				if err = ws.WriteJSON(msg); err != nil {
					log.Println("write:", err)
					break
				}
			}
		case "draw":
			var seq, seqLen int
			if seqLen, err = redis.Int(conn.Do("HLEN", UUIDSeqKey)); err != nil {
				log.Println("hlen", err)
				break
			}
			shouldDraw := true
			if message.BaseUUID != "" || seqLen != 0 { // should check existing
				seq, err = redis.Int(conn.Do("HGET", UUIDSeqKey, message.BaseUUID))
				if err != nil {
					if err != redis.ErrNil {
						log.Println("hget", err)
						break
					}
					// not found, so clear
					err = ws.WriteJSON(RespMessage{
						Action: "clear",
					})
					if err != nil {
						log.Println("writeJson", err)
					}
				}
				var values []string
				values, err = redis.Strings(conn.Do("LRANGE", RedisKey, seq, -1))
				if err != nil {
					log.Println("lrange", err)
					break
				}
				for _, v := range values {
					var msg RespMessage
					json.Unmarshal([]byte(v), &msg)
					if err = ws.WriteJSON(msg); err != nil {
						log.Println("writeJSON", err)
						break
					}
				}
			}
			if !shouldDraw {
				break
			}
			id, err := uuid.NewRandom()
			if err != nil {
				log.Println("uuid", err)
				break
			}
			newMessage := RespMessage{
				UUID:    id.String(),
				Strokes: message.Strokes,
				Action:  message.Action,
			}
			jsonMessage, err := json.Marshal(newMessage)
			if err != nil {
				log.Println("marshal", err)
				break
			}
			if _, err = conn.Do("RPUSH", RedisKey, string(jsonMessage)); err != nil {
				log.Println("insert", err)
				break
			}
			if err = ws.WriteJSON(newMessage); err != nil {
				log.Println("writeJson", err)
				return
			}
		}
	}
}
