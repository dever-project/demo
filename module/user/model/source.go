package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type Source struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:来源ID"`
	Name      string    `dorm:"type:varchar(64);not null;comment:来源名称"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type SourceIndex struct {
	Name struct{} `unique:"name"`
}

var sourceSeed = []map[string]any{
	{"name": "官网注册"},
	{"name": "活动报名"},
	{"name": "渠道导入"},
	{"name": "老客推荐"},
}

func NewSourceModel() *orm.Model[Source] {
	return orm.LoadModel[Source]("来源", "source", orm.ModelConfig{
		Index:    SourceIndex{},
		Seeds:    sourceSeed,
		Order:    "id desc",
		Database: "default",
	})
}
