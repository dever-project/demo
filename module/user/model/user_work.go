package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type UserWork struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:用户职业关联ID"`
	UserID    uint64    `dorm:"not null;comment:用户ID"`
	WorkID    uint64    `dorm:"not null;comment:职业ID"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type UserWorkIndex struct {
	UserWork struct{} `unique:"user_id,work_id"`
}

func NewUserWorkModel() *orm.Model[UserWork] {
	return orm.LoadModel[UserWork]("用户职业关联", "user_work", orm.ModelConfig{
		Index:    UserWorkIndex{},
		Order:    "id desc",
		Database: "default",
	})
}
