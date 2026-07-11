package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type PageConfig struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:单页ID"`
	PageKey   string    `dorm:"type:varchar(128);not null;comment:页面Key"`
	Content   string    `dorm:"type:text;not null;default:'';comment:页面内容"`
	CreatedAt time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
}

type PageConfigIndex struct {
	PageKey struct{} `unique:"page_key"`
}

func NewPageConfigModel() *orm.Model[PageConfig] {
	return orm.LoadModel[PageConfig]("单页配置", "record_page_config", orm.ModelConfig{
		Index:    PageConfigIndex{},
		Order:    "id desc",
		Database: "default",
	})
}
