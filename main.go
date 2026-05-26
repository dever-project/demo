package main

import (
	"log"

	"my/data"
	_ "my/data/load"
	botroot "my/package/bot"
	frontplugin "my/package/front/service/plugin"
	frontsite "my/package/front/service/site"

	dever "github.com/shemic/dever/cmd"
	"github.com/shemic/dever/server"
)

func main() {
	if err := dever.Run(func(s server.Server) {
		data.RegisterRoutes(s)
		frontplugin.Register(s, frontplugin.Options{
			Name: "bot",
			FS:   botroot.FrontFS,
		})
		frontsite.Register(s)
	}); err != nil {
		log.Fatal(err)
	}
}
