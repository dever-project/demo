package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type Category struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:分类ID"`
	Name      string    `dorm:"type:varchar(64);not null;comment:分类名称"`
	Icon      string    `dorm:"type:text;not null;default:'';comment:分类图标"`
	Status    int16     `dorm:"type:smallint;not null;default:1;comment:状态"`
	Sort      int       `dorm:"type:int;not null;default:100;comment:排序"`
	CreatedAt time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
}

type CategoryIndex struct {
	StatusSort struct{} `index:"status,sort,id"`
	Name       struct{} `index:"name,id"`
}

func NewCategoryModel() *orm.Model[Category] {
	return orm.LoadModel[Category]("账户分类", "record_category", orm.ModelConfig{
		Index:    CategoryIndex{},
		Order:    "sort asc,id asc",
		Database: "default",
		Options: map[string]any{
			"status": enabledStatusOptions,
		},
	})
}
