package service

import (
	"context"
	"fmt"

	"github.com/shemic/dever/util"

	recordmodel "my/module/record/model"
)

const (
	defaultWalletListPageSize   = 100
	defaultWalletRecordPageSize = 20
	maxWalletPageSize           = 100
)

type WalletQueryService struct{}

type WalletListQuery struct {
	CategoryID uint64
	Page       int
	PageSize   int
}

type WalletRecordQuery struct {
	AccountID  uint64
	AssetID    uint64
	RecordType string
	Page       int
	PageSize   int
}

func (WalletQueryService) Accounts(ctx context.Context, query WalletListQuery) map[string]any {
	page := normalizeQueryPage(query.Page)
	pageSize := normalizeQueryPageSize(query.PageSize, defaultWalletListPageSize, maxWalletPageSize)
	filters := map[string]any{"status": 1}
	if query.CategoryID > 0 {
		filters["category_id"] = query.CategoryID
	}

	accountModel := recordmodel.NewAccountModel()
	rows := accountModel.SelectMap(ctx, filters, pagedListOptions(page, pageSize, "sort asc,id desc"))
	total := accountModel.Count(ctx, filters)
	categoryByID := walletCategoriesByID(ctx, rows)
	assetsByAccountID := walletAssetsByAccountID(ctx, rows)

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		accountID := util.ToUint64(row["id"])
		categoryID := util.ToUint64(row["category_id"])
		category := categoryByID[categoryID]
		chainType := accountChainType(row)
		assets := assetsByAccountID[accountID]
		balance := walletAssetValueTotal(assets)
		if len(assets) == 0 {
			balance = numberValue(row["balance"])
		}
		items = append(items, map[string]any{
			"id":            accountID,
			"category_id":   categoryID,
			"category_name": util.ToStringTrimmed(category["name"]),
			"category_icon": util.ToStringTrimmed(category["icon"]),
			"chain_type":    chainType,
			"chain_name":    accountChainName(row),
			"address":       util.ToStringTrimmed(row["address"]),
			"name":          util.ToStringTrimmed(row["name"]),
			"icon":          util.ToStringTrimmed(row["icon"]),
			"intro":         util.ToStringTrimmed(row["intro"]),
			"balance":       balance,
			"assets":        assets,
			"sort":          util.ToIntDefault(row["sort"], 0),
			"created_at":    row["created_at"],
		})
	}

	return pagedListPayload(items, total, page, pageSize)
}

func (WalletQueryService) Records(ctx context.Context, query WalletRecordQuery) (map[string]any, error) {
	if query.AccountID == 0 {
		return nil, fmt.Errorf("账户ID不能为空")
	}

	recordType := util.ToStringTrimmed(query.RecordType)
	if recordType != "" && recordmodel.AccountRecordTypeLabel(recordType) == "" {
		return nil, fmt.Errorf("记录类型不正确")
	}

	accountModel := recordmodel.NewAccountModel()
	account := accountModel.FindMap(ctx, map[string]any{"id": query.AccountID, "status": 1}, map[string]any{
		"field": "id,category_id,chain_type,chain_name,address,name,icon,intro,balance",
	})
	if len(account) == 0 {
		return nil, fmt.Errorf("账户不存在")
	}

	page := normalizeQueryPage(query.Page)
	pageSize := normalizeQueryPageSize(query.PageSize, defaultWalletRecordPageSize, maxWalletPageSize)
	filters := map[string]any{"account_id": query.AccountID}
	if query.AssetID > 0 {
		filters["asset_id"] = query.AssetID
	}
	if recordType != "" {
		filters["record_type"] = recordType
	}

	recordModel := recordmodel.NewAccountRecordModel()
	rows := recordModel.SelectMap(ctx, filters, pagedListOptions(page, pageSize, "id desc"))
	total := recordModel.Count(ctx, filters)

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		currentType := util.ToStringTrimmed(row["record_type"])
		items = append(items, map[string]any{
			"id":                util.ToUint64(row["id"]),
			"account_id":        util.ToUint64(row["account_id"]),
			"account_name":      util.ToStringTrimmed(row["account_name"]),
			"category_id":       util.ToUint64(row["category_id"]),
			"category_name":     util.ToStringTrimmed(row["category_name"]),
			"asset_id":          util.ToUint64(row["asset_id"]),
			"asset_symbol":      util.ToStringTrimmed(row["asset_symbol"]),
			"chain_type":        util.ToStringTrimmed(row["chain_type"]),
			"chain_type_label":  recordmodel.ChainTypeLabel(util.ToStringTrimmed(row["chain_type"])),
			"record_type":       currentType,
			"record_type_label": recordmodel.AccountRecordTypeLabel(currentType),
			"peer_address":      util.ToStringTrimmed(row["peer_address"]),
			"amount":            numberValue(row["amount"]),
			"balance_before":    numberValue(row["balance_before"]),
			"balance_after":     numberValue(row["balance_after"]),
			"remark":            util.ToStringTrimmed(row["remark"]),
			"created_at":        row["created_at"],
		})
	}

	payload := pagedListPayload(items, total, page, pageSize)
	payload["account"] = map[string]any{
		"id":          util.ToUint64(account["id"]),
		"category_id": util.ToUint64(account["category_id"]),
		"chain_type":  accountChainType(account),
		"chain_name":  accountChainName(account),
		"address":     util.ToStringTrimmed(account["address"]),
		"name":        util.ToStringTrimmed(account["name"]),
		"icon":        util.ToStringTrimmed(account["icon"]),
		"intro":       util.ToStringTrimmed(account["intro"]),
		"balance":     numberValue(account["balance"]),
	}
	return payload, nil
}

func accountChainType(row map[string]any) string {
	chainType := util.ToStringTrimmed(row["chain_type"])
	if chainType == "" {
		return recordmodel.ChainTypeTron
	}
	return chainType
}

func accountChainName(row map[string]any) string {
	chainName := util.ToStringTrimmed(row["chain_name"])
	if chainName != "" {
		return chainName
	}
	return recordmodel.ChainTypeLabel(accountChainType(row))
}

func pagedListOptions(page int, pageSize int, order string) map[string]any {
	return map[string]any{
		"page":     page,
		"pageSize": pageSize,
		"order":    order,
	}
}

func walletCategoriesByID(ctx context.Context, accountRows []map[string]any) map[uint64]map[string]any {
	categoryIDs := make([]uint64, 0, len(accountRows))
	seen := map[uint64]bool{}
	for _, row := range accountRows {
		categoryID := util.ToUint64(row["category_id"])
		if categoryID == 0 || seen[categoryID] {
			continue
		}
		seen[categoryID] = true
		categoryIDs = append(categoryIDs, categoryID)
	}
	if len(categoryIDs) == 0 {
		return map[uint64]map[string]any{}
	}

	rows := recordmodel.NewCategoryModel().SelectMap(ctx, map[string]any{"id": categoryIDs}, map[string]any{
		"field": "id,name,icon",
	})
	categoryByID := make(map[uint64]map[string]any, len(rows))
	for _, row := range rows {
		categoryByID[util.ToUint64(row["id"])] = row
	}
	return categoryByID
}

func walletAssetsByAccountID(ctx context.Context, accountRows []map[string]any) map[uint64][]map[string]any {
	accountIDs := make([]uint64, 0, len(accountRows))
	chainTypes := make([]string, 0, len(accountRows))
	seenAccount := map[uint64]bool{}
	seenChain := map[string]bool{}
	for _, row := range accountRows {
		accountID := util.ToUint64(row["id"])
		if accountID > 0 && !seenAccount[accountID] {
			seenAccount[accountID] = true
			accountIDs = append(accountIDs, accountID)
		}

		chainType := accountChainType(row)
		if chainType != "" && !seenChain[chainType] {
			seenChain[chainType] = true
			chainTypes = append(chainTypes, chainType)
		}
	}
	if len(accountIDs) == 0 || len(chainTypes) == 0 {
		return map[uint64][]map[string]any{}
	}

	assetsByChain := walletAssetsByChain(ctx, chainTypes)
	balanceByAccountAsset := walletBalanceByAccountAsset(ctx, accountIDs)
	priceBySymbol := walletAssetPrices(ctx, assetsByChain)
	assetsByAccountID := make(map[uint64][]map[string]any, len(accountRows))

	for _, row := range accountRows {
		accountID := util.ToUint64(row["id"])
		if accountID == 0 {
			continue
		}
		chainType := accountChainType(row)
		assets := assetsByChain[chainType]
		items := make([]map[string]any, 0, len(assets))
		for _, asset := range assets {
			assetID := util.ToUint64(asset["id"])
			symbol := normalizeAssetSymbol(asset["symbol"])
			balanceRow := balanceByAccountAsset[accountID][assetID]
			quantity := numberValue(balanceRow["balance"])
			price := priceBySymbol[symbol]
			items = append(items, map[string]any{
				"id":         assetID,
				"asset_id":   assetID,
				"symbol":     symbol,
				"name":       util.ToStringTrimmed(asset["name"]),
				"icon":       util.ToStringTrimmed(asset["icon"]),
				"chain_type": chainType,
				"amount":     quantity,
				"quantity":   quantity,
				"balance":    quantity,
				"price":      price,
				"value":      quantity * price,
				"balance_id": util.ToUint64(balanceRow["id"]),
			})
		}
		assetsByAccountID[accountID] = items
	}

	return assetsByAccountID
}

func walletAssetsByChain(ctx context.Context, chainTypes []string) map[string][]map[string]any {
	rows := recordmodel.NewAssetModel().SelectMap(ctx, map[string]any{
		"chain_type": chainTypes,
		"status":     1,
	}, map[string]any{
		"field": "id,chain_type,symbol,name,icon,sort",
		"order": "chain_type asc,sort asc,id asc",
	})

	assetsByChain := make(map[string][]map[string]any, len(chainTypes))
	for _, row := range rows {
		chainType := util.ToStringTrimmed(row["chain_type"])
		assetsByChain[chainType] = append(assetsByChain[chainType], row)
	}
	return assetsByChain
}

func walletAssetPrices(ctx context.Context, assetsByChain map[string][]map[string]any) map[string]float64 {
	symbols := make([]string, 0)
	seen := map[string]bool{}
	for _, assets := range assetsByChain {
		for _, asset := range assets {
			symbol := normalizeAssetSymbol(asset["symbol"])
			if symbol == "" || seen[symbol] {
				continue
			}
			seen[symbol] = true
			symbols = append(symbols, symbol)
		}
	}
	return marketPriceBySymbol(ctx, symbols)
}

func walletAssetValueTotal(assets []map[string]any) float64 {
	total := 0.0
	for _, asset := range assets {
		total += numberValue(asset["value"])
	}
	return total
}

func walletBalanceByAccountAsset(ctx context.Context, accountIDs []uint64) map[uint64]map[uint64]map[string]any {
	rows := recordmodel.NewAccountBalanceModel().SelectMap(ctx, map[string]any{
		"account_id": accountIDs,
	}, map[string]any{
		"field": "id,account_id,asset_id,balance",
	})

	balanceByAccountAsset := make(map[uint64]map[uint64]map[string]any, len(accountIDs))
	for _, row := range rows {
		accountID := util.ToUint64(row["account_id"])
		assetID := util.ToUint64(row["asset_id"])
		if balanceByAccountAsset[accountID] == nil {
			balanceByAccountAsset[accountID] = map[uint64]map[string]any{}
		}
		balanceByAccountAsset[accountID][assetID] = row
	}
	return balanceByAccountAsset
}

func pagedListPayload(items []map[string]any, total int64, page int, pageSize int) map[string]any {
	return map[string]any{
		"list":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"pageSize":  pageSize,
	}
}

func normalizeQueryPage(value int) int {
	if value < 1 {
		return 1
	}
	return value
}

func normalizeQueryPageSize(value int, fallback int, max int) int {
	if value < 1 {
		value = fallback
	}
	if value > max {
		return max
	}
	return value
}
