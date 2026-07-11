package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type AccountBalance struct {
	ID          uint64    `dorm:"primaryKey;autoIncrement;comment:持仓ID"`
	AccountID   uint64    `dorm:"type:bigint;not null;comment:账户"`
	AccountName string    `dorm:"type:varchar(96);not null;default:'';comment:账户名称"`
	AssetID     uint64    `dorm:"type:bigint;not null;comment:资产"`
	AssetSymbol string    `dorm:"type:varchar(32);not null;default:'';comment:资产符号"`
	ChainType   string    `dorm:"type:varchar(32);not null;default:'tron';comment:链类型"`
	Balance     float64   `dorm:"type:double precision;not null;default:0;comment:持仓数量"`
	Version     int       `dorm:"type:int;not null;default:0;comment:版本号"`
	CreatedAt   time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
	UpdatedAt   time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:更新时间"`
}

type AccountBalanceIndex struct {
	AccountAsset struct{} `unique:"account_id,asset_id"`
	Account      struct{} `index:"account_id,id"`
	Asset        struct{} `index:"asset_id,id"`
	ChainAccount struct{} `index:"chain_type,account_id,id"`
}

var accountBalanceAccountRelation = orm.Relation{
	Field:      "account_id",
	Name:       "account",
	Option:     "record.NewAccountModel",
	OptionKeys: []string{"name", "category_id", "chain_type", "address", "status"},
}

var accountBalanceAssetRelation = orm.Relation{
	Field:      "asset_id",
	Name:       "asset",
	Option:     "record.NewAssetModel",
	OptionKeys: []string{"symbol", "name", "icon", "chain_type", "status"},
}

func NewAccountBalanceModel() *orm.Model[AccountBalance] {
	return orm.LoadModel[AccountBalance]("账户持仓", "record_account_balance", orm.ModelConfig{
		Index:    AccountBalanceIndex{},
		Order:    "account_id asc,asset_id asc",
		Database: "default",
		Options: map[string]any{
			"chain_type": chainTypeOptions,
		},
		Relations: []orm.Relation{
			accountBalanceAccountRelation,
			accountBalanceAssetRelation,
		},
	})
}
