package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type WorkType struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:分类ID"`
	Name      string    `dorm:"type:varchar(64);not null;comment:分类名称"`
	Status    int       `dorm:"type:int;not null;default:1;comment:状态"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type WorkTypeIndex struct {
	Name struct{} `unique:"name"`
}

var workTypeSeed = []map[string]any{
	{"id": 1, "name": "IT", "status": 1},
	{"id": 2, "name": "物流", "status": 1},
}

var workTypeStatusOptions = []map[string]any{
	{"id": 1, "value": "启用", "label": "启用", "color": "#0f766e"},
	{"id": 0, "value": "停用", "label": "停用", "color": "#737373"},
}

func NewWorkTypeModel() *orm.Model[WorkType] {
	return orm.LoadModel[WorkType]("职业分类", "work_type", orm.ModelConfig{
		Index:    WorkTypeIndex{},
		Seeds:    workTypeSeed,
		Order:    "id asc",
		Database: "default",
		Options: map[string]any{
			"status": workTypeStatusOptions,
		},
	})
}
