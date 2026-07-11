package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type MarketAsset struct {
	ID                       uint64     `dorm:"primaryKey;autoIncrement;comment:行情ID"`
	Scope                    string     `dorm:"type:varchar(32);not null;comment:榜单"`
	ProviderCoinID           string     `dorm:"type:varchar(96);not null;comment:数据源币种ID"`
	Symbol                   string     `dorm:"type:varchar(32);not null;default:'';comment:币种符号"`
	Name                     string     `dorm:"type:varchar(96);not null;default:'';comment:币种名称"`
	Image                    string     `dorm:"type:text;not null;default:'';comment:图标"`
	MarketCapRank            int        `dorm:"type:int;not null;default:0;comment:市值排名"`
	Price                    float64    `dorm:"type:double precision;not null;default:0;comment:价格"`
	MarketCap                float64    `dorm:"type:double precision;not null;default:0;comment:市值"`
	TotalVolume              float64    `dorm:"type:double precision;not null;default:0;comment:成交量"`
	PriceChangePercentage24h float64    `dorm:"type:double precision;not null;default:0;comment:24小时涨跌幅"`
	Source                   string     `dorm:"type:varchar(32);not null;default:'coinlore';comment:数据源"`
	SourceUpdatedAt          *time.Time `dorm:"null;comment:源更新时间"`
	CollectedAt              time.Time  `dorm:"not null;default:CURRENT_TIMESTAMP;comment:采集时间"`
	Status                   int16      `dorm:"type:smallint;not null;default:1;comment:状态"`
	CreatedAt                time.Time  `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
	UpdatedAt                time.Time  `dorm:"not null;default:CURRENT_TIMESTAMP;comment:更新时间"`
}

type MarketAssetIndex struct {
	ScopeCoin       struct{} `unique:"scope,provider_coin_id"`
	ScopeRank       struct{} `index:"scope,status,market_cap_rank,id"`
	ScopeMarketCap  struct{} `index:"scope,status,market_cap,id"`
	Symbol          struct{} `index:"symbol,id"`
	CollectedAt     struct{} `index:"collected_at"`
	SourceUpdatedAt struct{} `index:"source_updated_at"`
}

func NewMarketAssetModel() *orm.Model[MarketAsset] {
	return orm.LoadModel[MarketAsset]("行情资产", "record_market_asset", orm.ModelConfig{
		Index:    MarketAssetIndex{},
		Order:    "scope asc, market_cap_rank asc, id asc",
		Database: "default",
		Options: map[string]any{
			"scope":  marketScopeOptions,
			"source": marketSourceOptions,
			"status": enabledStatusOptions,
		},
	})
}
