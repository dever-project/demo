package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type UserTitle struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:用户头衔ID"`
	UserID    uint64    `dorm:"not null;comment:用户ID"`
	Sort      int       `dorm:"type:int;not null;default:0;comment:排序"`
	Name      string    `dorm:"type:varchar(64);not null;comment:头衔名称"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type UserTitleIndex struct {
	UserID struct{} `index:"user_id"`
}

func NewUserTitleModel() *orm.Model[UserTitle] {
	return orm.LoadModel[UserTitle]("用户头衔", "user_title", orm.ModelConfig{
		Index:    UserTitleIndex{},
		Order:    "sort asc, id asc",
		Database: "default",
	})
}
