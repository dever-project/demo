package main

import (
	"log"

	"my/data"
	_ "my/data/load"

	dever "github.com/shemic/dever/cmd"
)

func main() {
	if err := dever.Run(data.RegisterRoutes); err != nil {
		log.Fatal(err)
	}
}
