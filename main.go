package main

import (
	"encoding/json"
	"fmt"
	"image/png"
	"log"
	"net/http"
	"os"

	"github.com/atrox/haikunatorgo"
	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/qr"
	"github.com/garyburd/redigo/redis"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const RedisKey = "drawing"
const HashKey = "hashing"
const UUIDSeqKey = "uuidseq"

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var nameGenerator = haikunator.NewHaikunator()

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

	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/draw/painting")
	})
	r.Static("/css", "./public/css")

	r.LoadHTMLGlob("./public/templates/*")
	r.GET("/guess/:name", func(c *gin.Context) {
		c.HTML(http.StatusOK, "guess.html", gin.H{
			"name": c.Param("name"),
		})
	})
	r.GET("/draw/:name", func(c *gin.Context) {
		c.HTML(http.StatusOK, "draw.html", gin.H{
			"name": c.Param("name"),
		})
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})
	r.GET("/chanel/:name", serveWs)
	r.POST("/open/:name", openBoard)
	r.GET("/qrcode/:name", qrCode)
	r.GET("/boards", listBoards)

	redisHost := getRedisHost()
	log.Println("redisHost", redisHost)
	c, err := redis.Dial("tcp", redisHost)
	if err != nil {
		log.Print(err)
		return
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

func openBoard(c *gin.Context) {
	name := c.Param("name")
	conn, err := getRedisConn()
	if err != nil {
		log.Println("get conn", err)
		return
	}
	defer conn.Close()
	hash, err := redis.String(conn.Do("hget", HashKey, name))
	if err == nil {
		c.JSON(http.StatusOK, map[string]string{
			"hash": hash,
		})
		return
	}
	if err != redis.ErrNil {
		c.Error(err)
		return
	}
	hash = nameGenerator.Haikunate()
	log.Println(hash)
	_, err = conn.Do("hset", HashKey, name, hash)
	if err != nil {
		c.Error(err)
		return
	}
	c.JSON(http.StatusOK, map[string]string{
		"hash": hash,
	})
	return
}

func qrCode(c *gin.Context) {
	qrcode, err := qr.Encode(
		fmt.Sprintf("http://%s/guess/%s", c.Request.Host, c.Param("name")), qr.L, qr.Auto)
	if err != nil {
		fmt.Println(err)
	} else {
		qrcode, err = barcode.Scale(qrcode, 200, 200)
		if err != nil {
			fmt.Println(err)
		} else {
			png.Encode(c.Writer, qrcode)
			c.Status(200)
		}
	}
}

func listBoards(c *gin.Context) {
	conn, err := getRedisConn()
	if err != nil {
		log.Println("get conn", err)
		return
	}
	defer conn.Close()
	hash, err := redis.StringMap(conn.Do("hgetall", HashKey))
	if err == nil {
		c.JSON(http.StatusOK, hash)
		return
	}
}

func getRedisKey(name string) string {
	return RedisKey + "_" + name
}

func getUUIDKey(name string) string {
	return UUIDSeqKey + "_" + name
}

func serveWs(c *gin.Context) {
	name := c.Param("name")
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
		log.Println(name, message.Action)
		switch message.Action {
		case "clear":
			if _, err = conn.Do("DEL", getRedisKey(name)); err != nil {
				log.Println("clear", err)
				break
			}
			if _, err = conn.Do("DEL", getUUIDKey(name)); err != nil {
				log.Println("clear", err)
				break
			}
		case "fetch":
			if message.BaseUUID != "" {
				_, err = redis.Int(
					conn.Do("HGET", getUUIDKey(name), message.BaseUUID))
				if err != nil {
					if err != redis.ErrNil {
						log.Println("hget", err)
						break
					}
					// not found, so clear at client side
					err = ws.WriteJSON(RespMessage{
						Action: "clear",
					})
					if err != nil {
						log.Println("writeJson", err)
					}
					break
				}
			}
			values, e := redis.Strings(
				conn.Do("LRANGE", getRedisKey(name), 0, -1))
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
			if seqLen, err = redis.Int(conn.Do("HLEN", getUUIDKey(name))); err != nil {
				log.Println("hlen", err)
				break
			}
			log.Println("Why not", message.BaseUUID != "" || seqLen != 0)
			shouldDraw := true
			if message.BaseUUID != "" || seqLen != 0 { // should check existing
				seq, err = redis.Int(
					conn.Do("HGET", getUUIDKey(name), message.BaseUUID))
				if err != nil {
					if err != redis.ErrNil {
						log.Println("hget", err)
						break
					}
					// not found, so clear at client side
					err = ws.WriteJSON(RespMessage{
						Action: "clear",
					})
					if err != nil {
						log.Println("writeJson", err)
					}
				}
				var values []string
				values, err = redis.Strings(
					conn.Do("LRANGE", getRedisKey(name), seq, -1))
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
			log.Println("Drawing")
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
			if _, err = conn.Do("RPUSH", getRedisKey(name), string(jsonMessage)); err != nil {
				log.Println("insert", err)
				break
			}
			if _, err = conn.Do("HSET", getUUIDKey(name), id.String(), seqLen); err != nil {
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
