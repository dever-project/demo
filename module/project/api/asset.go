package api

import "github.com/shemic/dever/server"

type Asset struct{}

func (Asset) GetList(c *server.Context) error {
	data, err := projectSvc.Assets(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "flow_id"),
		queryText(c, "kind"),
	)
	return projectJSON(c, data, err)
}

func (Asset) GetDetail(c *server.Context) error {
	data, err := projectSvc.AssetDetail(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "id"),
	)
	return projectJSON(c, data, err)
}
