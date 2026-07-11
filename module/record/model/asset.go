package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type Asset struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:资产ID"`
	ChainType string    `dorm:"type:varchar(32);not null;default:'tron';comment:链类型"`
	Symbol    string    `dorm:"type:varchar(32);not null;comment:资产符号"`
	Name      string    `dorm:"type:varchar(96);not null;default:'';comment:资产名称"`
	Icon      string    `dorm:"type:text;not null;default:'';comment:资产图标"`
	Status    int16     `dorm:"type:smallint;not null;default:1;comment:状态"`
	Sort      int       `dorm:"type:int;not null;default:100;comment:排序"`
	CreatedAt time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
}

type AssetIndex struct {
	ChainSymbol     struct{} `unique:"chain_type,symbol"`
	ChainStatusSort struct{} `index:"chain_type,status,sort,id"`
	Symbol          struct{} `index:"symbol,id"`
}

func NewAssetModel() *orm.Model[Asset] {
	return orm.LoadModel[Asset]("账户资产", "record_asset", orm.ModelConfig{
		Index:    AssetIndex{},
		Order:    "chain_type asc,sort asc,id asc",
		Database: "default",
		Options: map[string]any{
			"chain_type": chainTypeOptions,
			"status":     enabledStatusOptions,
		},
	})
}
