package main

import (
	"log"

	frontsite "github.com/dever-package/front/service/site"
	"my/data"
	_ "my/data/load"

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
