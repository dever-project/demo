package main

import (
	"log"

	"my/data"
	_ "my/data/load"
	frontsite "my/package/front/service/site"

	dever "github.com/shemic/dever/cmd"
	"github.com/shemic/dever/server"
)

func main() {
	if err := dever.Run(func(s server.Server) {
		data.RegisterRoutes(s)
		frontsite.Register(s)
	}); err != nil {
		log.Fatal(err)
	}
}
