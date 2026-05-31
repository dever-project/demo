package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

const (
	StatusEnabled  int16 = 1
	StatusDisabled int16 = 2
)

var statusOptions = []map[string]any{
	{"id": StatusEnabled, "value": "开启"},
	{"id": StatusDisabled, "value": "停用"},
}

type User struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:用户ID"`
	Account   string    `dorm:"type:varchar(64);not null;comment:账号"`
	Password  string    `dorm:"type:varchar(128);not null;comment:密码"`
	Name      string    `dorm:"type:varchar(64);not null;default:'';comment:昵称"`
	Status    int16     `dorm:"type:smallint;not null;default:1;comment:状态"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type UserIndex struct {
	Account struct{} `unique:"account"`
	Status  struct{} `index:"status,created_at"`
}

func NewUserModel() *orm.Model[User] {
	return orm.LoadModel[User]("画布用户", "huabu_user", orm.ModelConfig{
		Index:    UserIndex{},
		Order:    "id desc",
		Database: "default",
		Options: map[string]any{
			"status": statusOptions,
		},
		Fields: map[string]orm.FieldConfig{
			"password": {Type: orm.FieldTypePassword},
		},
	})
}
