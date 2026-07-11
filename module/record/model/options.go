package model

const (
	ChainTypeTron    = "tron"
	ChainTypeBitcoin = "bitcoin"

	ChainTypeTronLabel    = "Tron"
	ChainTypeBitcoinLabel = "Bitcoin"

	RecordTypeTransferIn  = "transfer_in"
	RecordTypeTransferOut = "transfer_out"
	RecordTypeFailed      = "failed"

	RecordTypeTransferInLabel  = "转入"
	RecordTypeTransferOutLabel = "转出"
	RecordTypeFailedLabel      = "失败"

	MarketScopeMarketCap = "market_cap"
	MarketScopeDeFi      = "defi"

	MarketScopeMarketCapLabel = "市值"
	MarketScopeDeFiLabel      = "DeFi"

	MarketSourceCoinLore  = "coinlore"
	MarketSourceCoinGecko = "coingecko"
)

var enabledStatusOptions = []map[string]any{
	{"id": 1, "value": "启用", "label": "启用", "color": "#0f766e"},
	{"id": 2, "value": "停用", "label": "停用", "color": "#737373"},
}

var chainTypeOptions = []map[string]any{
	{"id": ChainTypeTron, "value": ChainTypeTronLabel, "label": ChainTypeTronLabel, "color": "#dc2626"},
	{"id": ChainTypeBitcoin, "value": ChainTypeBitcoinLabel, "label": ChainTypeBitcoinLabel, "color": "#f97316"},
}

var accountRecordTypeOptions = []map[string]any{
	{"id": RecordTypeTransferIn, "value": RecordTypeTransferInLabel, "label": RecordTypeTransferInLabel, "color": "#0f766e"},
	{"id": RecordTypeTransferOut, "value": RecordTypeTransferOutLabel, "label": RecordTypeTransferOutLabel, "color": "#dc2626"},
	{"id": RecordTypeFailed, "value": RecordTypeFailedLabel, "label": RecordTypeFailedLabel, "color": "#737373"},
}

var marketScopeOptions = []map[string]any{
	{"id": MarketScopeMarketCap, "value": MarketScopeMarketCapLabel, "label": MarketScopeMarketCapLabel, "color": "#2563eb"},
	{"id": MarketScopeDeFi, "value": MarketScopeDeFiLabel, "label": MarketScopeDeFiLabel, "color": "#7c3aed"},
}

var marketSourceOptions = []map[string]any{
	{"id": MarketSourceCoinLore, "value": "CoinLore", "label": "CoinLore", "color": "#2563eb"},
	{"id": MarketSourceCoinGecko, "value": "CoinGecko", "label": "CoinGecko", "color": "#0f766e"},
}

func ChainTypeLabel(chainType string) string {
	switch chainType {
	case ChainTypeTron:
		return ChainTypeTronLabel
	case ChainTypeBitcoin:
		return ChainTypeBitcoinLabel
	default:
		return ""
	}
}

func AccountRecordTypeLabel(recordType string) string {
	switch recordType {
	case RecordTypeTransferIn:
		return RecordTypeTransferInLabel
	case RecordTypeTransferOut:
		return RecordTypeTransferOutLabel
	case RecordTypeFailed:
		return RecordTypeFailedLabel
	default:
		return ""
	}
}

func MarketScopeLabel(scope string) string {
	switch scope {
	case MarketScopeMarketCap:
		return MarketScopeMarketCapLabel
	case MarketScopeDeFi:
		return MarketScopeDeFiLabel
	default:
		return ""
	}
}
