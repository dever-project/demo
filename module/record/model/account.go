package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type Account struct {
	ID         uint64    `dorm:"primaryKey;autoIncrement;comment:账户ID"`
	CategoryID uint64    `dorm:"type:bigint;not null;default:0;comment:账户分类"`
	ChainType  string    `dorm:"type:varchar(32);not null;default:'tron';comment:链类型"`
	ChainName  string    `dorm:"type:varchar(64);not null;default:'';comment:链名称"`
	Address    string    `dorm:"type:varchar(160);not null;default:'';comment:账户地址"`
	Name       string    `dorm:"type:varchar(96);not null;comment:账户名称"`
	Icon       string    `dorm:"type:text;not null;default:'';comment:账户图标"`
	Intro      string    `dorm:"type:text;not null;default:'';comment:账户介绍"`
	Balance    float64   `dorm:"type:double precision;not null;default:0;comment:账户估值"`
	Version    int       `dorm:"type:int;not null;default:0;comment:版本号"`
	Status     int16     `dorm:"type:smallint;not null;default:1;comment:状态"`
	Sort       int       `dorm:"type:int;not null;default:100;comment:排序"`
	CreatedAt  time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
}

type AccountIndex struct {
	CategoryStatusSort struct{} `index:"category_id,status,sort,id"`
	ChainStatusSort    struct{} `index:"chain_type,status,sort,id"`
	Address            struct{} `index:"address,id"`
	Name               struct{} `index:"name,id"`
	CreatedAt          struct{} `index:"created_at"`
}

var accountCategoryRelation = orm.Relation{
	Field:      "category_id",
	Name:       "category",
	Option:     "record.NewCategoryModel",
	OptionKeys: []string{"name", "icon", "status"},
}

func NewAccountModel() *orm.Model[Account] {
	return orm.LoadModel[Account]("测试账户", "record_account", orm.ModelConfig{
		Index:    AccountIndex{},
		Order:    "sort asc,id desc",
		Database: "default",
		Options: map[string]any{
			"chain_type": chainTypeOptions,
			"status":     enabledStatusOptions,
		},
		Relations: []orm.Relation{
			accountCategoryRelation,
		},
	})
}
