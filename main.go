// Command playgo is a web server for hosting multiplayer Go games.
package main

import (
	"flag"
	"log"
	"html/template"
	"net/http"
	"strings"
)

var (
	httpAddr     = flag.String("http", "localhost:8080", "HTTP listen address")
	templatePath = flag.String("template", "template/", "path to template files")
	staticPath   = flag.String("static", "static/", "path to static files")
	reload       = flag.Bool("reload", false, "reload templates on every page load")
	templates    = template.Must(template.ParseGlob(*templatePath + "*.tmpl"))
)

type Game struct {
	Id    int
	White string
	Black string
}

// Wraps a route handler in a closure, then logs the request address, method,
// and path, plus the status code returned by the handler
func makeHandler(fn func(http.ResponseWriter, *http.Request) int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := fn(w, r)
		log.Printf("%s %s %s %d", strings.Split(r.RemoteAddr, ":")[0], r.Method, r.URL.Path, status)
	}
}

// Loads a game for a provided id
func loadGame(id int) *Game {
	return &Game{Id: id, White: "John", Black: "Frank"}
}

// Renders an HTML template from the cache using provided data
func renderTemplate(w http.ResponseWriter, action string, data interface{}) error {
	if *reload {
		templates = template.Must(template.ParseGlob(*templatePath + "*.tmpl"))
	}
	err := templates.ExecuteTemplate(w, action+".tmpl", data)
	if err != nil {
		return err
	}
	return nil
}

func main() {
	flag.Parse()

	log.Printf("Starting server at http://%s\n", *httpAddr)
	http.HandleFunc("/", makeHandler(rootHandler))
	http.HandleFunc("/game/", makeHandler(gameHandler))
	http.ListenAndServe(*httpAddr, nil)
}
