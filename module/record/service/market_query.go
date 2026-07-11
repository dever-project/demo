package service

import (
	"context"
	"fmt"

	"github.com/shemic/dever/util"

	recordmodel "my/module/record/model"
)

const (
	defaultMarketAssetPageSize = 100
	maxMarketAssetPageSize     = 250
	marketScopeAll             = "all"
)

type MarketQueryService struct{}

type MarketAssetQuery struct {
	Scope    string
	Page     int
	PageSize int
}

func (MarketQueryService) Assets(ctx context.Context, query MarketAssetQuery) (map[string]any, error) {
	scope, err := normalizeMarketAssetScope(query.Scope)
	if err != nil {
		return nil, err
	}

	page := normalizeQueryPage(query.Page)
	pageSize := normalizeQueryPageSize(query.PageSize, defaultMarketAssetPageSize, maxMarketAssetPageSize)
	filters := map[string]any{"status": 1}
	order := "market_cap_rank asc,id asc"
	if scope != marketScopeAll {
		filters["scope"] = scope
	} else {
		order = "scope asc,market_cap_rank asc,id asc"
	}

	assetModel := recordmodel.NewMarketAssetModel()
	rows := assetModel.SelectMap(ctx, filters, pagedListOptions(page, pageSize, order))
	total := assetModel.Count(ctx, filters)

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		currentScope := util.ToStringTrimmed(row["scope"])
		items = append(items, map[string]any{
			"id":                          util.ToUint64(row["id"]),
			"scope":                       currentScope,
			"scope_label":                 recordmodel.MarketScopeLabel(currentScope),
			"provider_coin_id":            util.ToStringTrimmed(row["provider_coin_id"]),
			"symbol":                      util.ToStringTrimmed(row["symbol"]),
			"name":                        util.ToStringTrimmed(row["name"]),
			"image":                       util.ToStringTrimmed(row["image"]),
			"market_cap_rank":             util.ToIntDefault(row["market_cap_rank"], 0),
			"rank":                        util.ToIntDefault(row["market_cap_rank"], 0),
			"price":                       numberValue(row["price"]),
			"market_cap":                  numberValue(row["market_cap"]),
			"total_volume":                numberValue(row["total_volume"]),
			"price_change_percentage_24h": numberValue(row["price_change_percentage_24h"]),
			"source":                      util.ToStringTrimmed(row["source"]),
			"source_updated_at":           row["source_updated_at"],
			"collected_at":                row["collected_at"],
			"updated_at":                  row["updated_at"],
		})
	}

	payload := pagedListPayload(items, total, page, pageSize)
	payload["scope"] = scope
	payload["scope_label"] = marketAssetScopeLabel(scope)
	return payload, nil
}

func normalizeMarketAssetScope(value string) (string, error) {
	switch util.ToStringTrimmed(value) {
	case "":
		return recordmodel.MarketScopeMarketCap, nil
	case recordmodel.MarketScopeMarketCap:
		return recordmodel.MarketScopeMarketCap, nil
	case recordmodel.MarketScopeDeFi:
		return recordmodel.MarketScopeDeFi, nil
	case marketScopeAll:
		return marketScopeAll, nil
	default:
		return "", fmt.Errorf("行情类型不正确")
	}
}

func marketAssetScopeLabel(scope string) string {
	if scope == marketScopeAll {
		return "全部"
	}
	return recordmodel.MarketScopeLabel(scope)
}
