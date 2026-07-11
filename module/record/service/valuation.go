package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/shemic/dever/util"

	recordmodel "my/module/record/model"
)

func refreshAccountValue(ctx context.Context, accountID uint64) (float64, error) {
	if accountID == 0 {
		return 0, nil
	}

	balanceModel := recordmodel.NewAccountBalanceModel()
	rows := balanceModel.SelectMap(ctx, map[string]any{"account_id": accountID}, map[string]any{
		"field": "asset_symbol,balance",
	})
	value, err := accountBalanceRowsValue(ctx, rows)
	if err != nil {
		return 0, err
	}

	accountModel := recordmodel.NewAccountModel()
	accountRow := accountModel.FindMap(ctx, map[string]any{"id": accountID}, map[string]any{
		"field": "id,version",
	})
	if len(accountRow) == 0 {
		return 0, fmt.Errorf("账户不存在")
	}
	if err := updateAccountBalance(ctx, accountModel, accountID, util.ToIntDefault(accountRow["version"], 0), value); err != nil {
		return 0, err
	}
	return value, nil
}

func refreshAllAccountValues(ctx context.Context) error {
	accountModel := recordmodel.NewAccountModel()
	rows := accountModel.SelectMap(ctx, map[string]any{}, map[string]any{
		"field": "id",
		"order": "id asc",
	})
	for _, row := range rows {
		if _, err := refreshAccountValue(ctx, util.ToUint64(row["id"])); err != nil {
			return err
		}
	}
	return nil
}

func accountBalanceRowsValue(ctx context.Context, balanceRows []map[string]any) (float64, error) {
	symbols := make([]string, 0, len(balanceRows))
	seen := map[string]bool{}
	for _, row := range balanceRows {
		symbol := normalizeAssetSymbol(row["asset_symbol"])
		if symbol == "" || seen[symbol] {
			continue
		}
		seen[symbol] = true
		symbols = append(symbols, symbol)
	}

	priceBySymbol := marketPriceBySymbol(ctx, symbols)
	total := 0.0
	for _, row := range balanceRows {
		symbol := normalizeAssetSymbol(row["asset_symbol"])
		quantity := numberValue(row["balance"])
		if symbol == "" || quantity == 0 {
			continue
		}
		price, ok := priceBySymbol[symbol]
		if !ok || price <= 0 {
			return 0, fmt.Errorf("缺少 %s 行情价格", symbol)
		}
		total += quantity * price
	}
	return total, nil
}

func marketPriceBySymbol(ctx context.Context, symbols []string) map[string]float64 {
	result := map[string]float64{}
	normalized := make([]string, 0, len(symbols))
	seen := map[string]bool{}
	for _, symbol := range symbols {
		symbol = normalizeAssetSymbol(symbol)
		if symbol == "" || seen[symbol] {
			continue
		}
		seen[symbol] = true
		normalized = append(normalized, symbol)
		if stableCoinPrice(symbol) > 0 {
			result[symbol] = stableCoinPrice(symbol)
		}
	}
	if len(normalized) == 0 {
		return result
	}

	rows := recordmodel.NewMarketAssetModel().SelectMap(ctx, map[string]any{
		"symbol": normalized,
		"status": 1,
	}, map[string]any{
		"field": "symbol,scope,price,market_cap_rank,id",
		"order": "scope asc,market_cap_rank asc,id asc",
	})
	for _, row := range rows {
		symbol := normalizeAssetSymbol(row["symbol"])
		price := numberValue(row["price"])
		if symbol == "" || price <= 0 {
			continue
		}
		if _, exists := result[symbol]; exists && util.ToStringTrimmed(row["scope"]) != recordmodel.MarketScopeMarketCap {
			continue
		}
		result[symbol] = price
	}
	return result
}

func stableCoinPrice(symbol string) float64 {
	switch normalizeAssetSymbol(symbol) {
	case "USDT", "USDC", "USD":
		return 1
	default:
		return 0
	}
}

func normalizeAssetSymbol(value any) string {
	return strings.ToUpper(strings.TrimSpace(util.ToString(value)))
}
