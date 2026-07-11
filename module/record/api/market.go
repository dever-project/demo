package api

import (
	"github.com/shemic/dever/server"

	recordservice "my/module/record/service"
)

type Market struct{}

var marketQueryService = recordservice.MarketQueryService{}

func (Market) GetAssets(c *server.Context) error {
	data, err := marketQueryService.Assets(c.Context(), recordservice.MarketAssetQuery{
		Scope:    c.Input("scope"),
		Page:     firstIntInput(c, "page"),
		PageSize: firstIntInput(c, "page_size", "pageSize", "limit"),
	})
	return recordJSON(c, data, err)
}
