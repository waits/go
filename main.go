// Command gogo is a web server for hosting multiplayer Go games.
package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/waits/gogo/handler"
	"github.com/waits/gogo/model"
	"golang.org/x/net/websocket"
)

var (
	host     = flag.String("host", "go.waits.io", "server hostname")
	devMode  = flag.Bool("development", false, "run in development mode")
	certFile = flag.String("cert", "", "path to certificate chain")
	keyFile  = flag.String("key", "", "path to private key")
)

func main() {
	flag.Parse()
	t := handler.LoadTemplates("template/")
	if *devMode {
		t = nil
	}
	env := &handler.Env{Templates: t, TemplatePath: "template/"}
	model.InitPool(0)

	http.Handle("/", handler.Handler{Env: env, Fn: handler.Static})
	http.Handle("/game/", handler.Handler{Env: env, Fn: handler.Game})
	http.Handle("/static/", http.FileServer(http.Dir("./")))
	http.Handle("/live/game/", websocket.Handler(handler.Live))

	if *devMode {
		log.Printf("Starting server at http://0.0.0.0:8080\n")
		http.ListenAndServe("0.0.0.0:8080", nil)
		return
	}

	log.Printf("Starting server at https://" + *host)
	redir := "https://" + *host
	go http.ListenAndServe("0.0.0.0:80", http.RedirectHandler(redir, 301))
	http.ListenAndServeTLS("0.0.0.0:443", *certFile, *keyFile, nil)
}
