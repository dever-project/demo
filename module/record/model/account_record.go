package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type AccountRecord struct {
	ID            uint64    `dorm:"primaryKey;autoIncrement;comment:记录ID"`
	AccountID     uint64    `dorm:"type:bigint;not null;comment:账户"`
	AccountName   string    `dorm:"type:varchar(96);not null;default:'';comment:账户名称"`
	CategoryID    uint64    `dorm:"type:bigint;not null;default:0;comment:账户分类"`
	CategoryName  string    `dorm:"type:varchar(64);not null;default:'';comment:分类名称"`
	AssetID       uint64    `dorm:"type:bigint;not null;default:0;comment:资产"`
	AssetSymbol   string    `dorm:"type:varchar(32);not null;default:'';comment:资产符号"`
	ChainType     string    `dorm:"type:varchar(32);not null;default:'tron';comment:链类型"`
	RecordType    string    `dorm:"type:varchar(32);not null;comment:记录类型"`
	PeerAddress   string    `dorm:"type:varchar(160);not null;default:'';comment:对方地址"`
	Amount        float64   `dorm:"type:double precision;not null;default:0;comment:变动数量"`
	BalanceBefore float64   `dorm:"type:double precision;not null;default:0;comment:变动前持仓"`
	BalanceAfter  float64   `dorm:"type:double precision;not null;default:0;comment:变动后持仓"`
	Remark        string    `dorm:"type:text;not null;default:'';comment:备注"`
	CreatedAt     time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
}

type AccountRecordIndex struct {
	AccountCreatedAt  struct{} `index:"account_id,created_at,id"`
	AccountAsset      struct{} `index:"account_id,asset_id,created_at,id"`
	CategoryCreatedAt struct{} `index:"category_id,created_at,id"`
	AssetCreatedAt    struct{} `index:"asset_id,created_at,id"`
	ChainCreatedAt    struct{} `index:"chain_type,created_at,id"`
	TypeCreatedAt     struct{} `index:"record_type,created_at,id"`
	PeerAddress       struct{} `index:"peer_address,id"`
	CreatedAt         struct{} `index:"created_at"`
}

var accountRecordAccountRelation = orm.Relation{
	Field:      "account_id",
	Name:       "account",
	Option:     "record.NewAccountModel",
	OptionKeys: []string{"name", "balance", "category_id", "chain_type", "address", "status"},
}

var accountRecordCategoryRelation = orm.Relation{
	Field:      "category_id",
	Name:       "category",
	Option:     "record.NewCategoryModel",
	OptionKeys: []string{"name", "icon", "status"},
}

var accountRecordAssetRelation = orm.Relation{
	Field:      "asset_id",
	Name:       "asset",
	Option:     "record.NewAssetModel",
	OptionKeys: []string{"symbol", "name", "icon", "chain_type", "status"},
}

func NewAccountRecordModel() *orm.Model[AccountRecord] {
	return orm.LoadModel[AccountRecord]("账户记录", "record_account_record", orm.ModelConfig{
		Index:    AccountRecordIndex{},
		Order:    "id desc",
		Database: "default",
		Options: map[string]any{
			"chain_type":  chainTypeOptions,
			"record_type": accountRecordTypeOptions,
		},
		Relations: []orm.Relation{
			accountRecordAccountRelation,
			accountRecordCategoryRelation,
			accountRecordAssetRelation,
		},
	})
}
