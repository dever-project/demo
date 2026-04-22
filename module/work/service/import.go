package service

import (
	"strings"

	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	frontimporter "github.com/dever-package/front/service/importer"
	frontrecord "github.com/dever-package/front/service/record"
	workmodel "my/module/work/model"
)

type ImportService struct{}

func (ImportService) ProviderResolveWorkType(c *server.Context, params []any) any {
	payload := frontimporter.ParseServicePayload(params)
	name := strings.TrimSpace(util.ToString(payload.Value))
	if name == "" {
		return nil
	}

	model := workmodel.NewWorkTypeModel()
	row := model.FindMap(c.Context(), map[string]any{"name": name})
	if len(row) == 0 && strings.EqualFold(strings.TrimSpace(payload.Field.MissingPolicy), "create") {
		record := map[string]any{
			"name":   name,
			"status": 1,
		}
		frontrecord.ApplyCreatedAt(
			record,
			frontrecord.ResolveColumnLookup("work.NewWorkTypeModel", model),
		)
		insertID := model.Insert(c.Context(), record)
		if insertID != 0 {
			row = model.FindMap(c.Context(), map[string]any{"id": insertID})
		}
		if len(row) == 0 {
			row = model.FindMap(c.Context(), map[string]any{"name": name})
		}
	}

	typeID := util.ToUint64(row["id"])
	if typeID == 0 {
		panic("未匹配到职业分类")
	}

	return frontimporter.WrapServiceValue(typeID)
}
