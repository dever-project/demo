package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type UserRegion struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:用户地区关联ID"`
	UserID    uint64    `dorm:"not null;comment:用户ID"`
	RegionID  uint64    `dorm:"not null;comment:地区ID"`
	Sort      int       `dorm:"type:int;not null;default:0;comment:排序"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type UserRegionIndex struct {
	UserRegion struct{} `unique:"user_id,region_id"`
}

func NewUserRegionModel() *orm.Model[UserRegion] {
	return orm.LoadModel[UserRegion]("用户地区关联", "user_region", orm.ModelConfig{
		Index:    UserRegionIndex{},
		Order:    "sort asc, id asc",
		Database: "default",
	})
}
