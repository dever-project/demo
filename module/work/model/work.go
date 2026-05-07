package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type Work struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:职业ID"`
	Name      string    `dorm:"type:varchar(64);not null;comment:职业名称"`
	TypeID    uint64    `dorm:"type:bigint;not null;default:0;comment:分类"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type WorkIndex struct {
	Name struct{} `unique:"name"`
}

var workSeed = []map[string]any{
	{"name": "产品经理", "type_id": 1},
	{"name": "前端工程师", "type_id": 1},
	{"name": "后端工程师", "type_id": 1},
	{"name": "运营专员", "type_id": 2},
}

var workTypeRelation = orm.Relation{
	Field:  "type_id",
	Option: "work.NewWorkTypeModel",
}

func NewWorkModel() *orm.Model[Work] {
	return orm.LoadModel[Work]("职业", "work", orm.ModelConfig{
		Index:     WorkIndex{},
		Seeds:     workSeed,
		Order:     "id desc",
		Database:  "default",
		Relations: []orm.Relation{workTypeRelation},
	})
}
