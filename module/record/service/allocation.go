package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/shemic/dever/orm"
	"github.com/shemic/dever/util"

	recordmodel "my/module/record/model"
)

const defaultInitialPortfolioUSD = 5_000_000

type PortfolioAllocationOptions struct {
	TotalUSD float64
	Apply    bool
	Reset    bool
}

type PortfolioAllocationResult struct {
	Applied        bool
	Reset          bool
	TotalTargetUSD float64
	TotalActualUSD float64
	Items          []PortfolioAllocationItem
}

type PortfolioAllocationItem struct {
	CategoryName   string
	AccountName    string
	AccountID      uint64
	ChainType      string
	AccountAddress string
	AssetID        uint64
	AssetSymbol    string
	AssetName      string
	PeerAddress    string
	PriceUSD       float64
	TargetUSD      float64
	Quantity       float64
	RecordID       uint64
}

type portfolioAccountSpec struct {
	CategoryName string
	Name         string
	ChainType    string
	Address      string
	Sort         int
}

type portfolioAssetSpec struct {
	ChainType string
	Symbol    string
	Name      string
	Sort      int
}

type portfolioAllocationSpec struct {
	Account     portfolioAccountSpec
	Asset       portfolioAssetSpec
	Share       float64
	PeerAddress string
}

var initialPortfolioAllocations = []portfolioAllocationSpec{
	{
		Account: portfolioAccountSpec{
			CategoryName: "ac",
			Name:         "zty",
			ChainType:    recordmodel.ChainTypeTron,
			Address:      "TJMvoGBu1Y8CN1eN7nPpC9xE2p1vF1Dznmnr",
			Sort:         10,
		},
		Asset: portfolioAssetSpec{
			ChainType: recordmodel.ChainTypeTron,
			Symbol:    "USDT",
			Name:      "Tether USD",
			Sort:      20,
		},
		Share:       0.62,
		PeerAddress: "TYASr5tC7g2aLQkQp9Qn8ztwM9xMUxHLS",
	},
	{
		Account: portfolioAccountSpec{
			CategoryName: "ac",
			Name:         "zty",
			ChainType:    recordmodel.ChainTypeTron,
			Address:      "TJMvoGBu1Y8CN1eN7nPpC9xE2p1vF1Dznmnr",
			Sort:         10,
		},
		Asset: portfolioAssetSpec{
			ChainType: recordmodel.ChainTypeTron,
			Symbol:    "TRX",
			Name:      "TRON",
			Sort:      10,
		},
		Share:       0.16,
		PeerAddress: "TP5wjnQvGkPH7f9nSkv77b6XvHAin1ZX",
	},
	{
		Account: portfolioAccountSpec{
			CategoryName: "btc",
			Name:         "Account 01",
			ChainType:    recordmodel.ChainTypeBitcoin,
			Address:      "bc1phjc7rc6l7vmwr9uhy5fms7w7lzdlfnq2qd2zx",
			Sort:         20,
		},
		Asset: portfolioAssetSpec{
			ChainType: recordmodel.ChainTypeBitcoin,
			Symbol:    "BTC",
			Name:      "Bitcoin",
			Sort:      10,
		},
		Share:       0.22,
		PeerAddress: "bc1q9p8u7y6t5r4e3w2qazxswedcvfrtgbnhyujmki",
	},
}

func AllocateInitialPortfolio(ctx context.Context, options PortfolioAllocationOptions) (PortfolioAllocationResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if options.TotalUSD <= 0 {
		options.TotalUSD = defaultInitialPortfolioUSD
	}

	result, err := buildInitialPortfolioPlan(ctx, options.TotalUSD)
	if err != nil || !options.Apply {
		result.Applied = false
		result.Reset = options.Reset
		return result, err
	}

	result.Applied = true
	result.Reset = options.Reset
	err = orm.Transaction(ctx, func(txCtx context.Context) error {
		if options.Reset {
			resetAccountRecords(txCtx)
		}
		appliedItems := make([]PortfolioAllocationItem, 0, len(initialPortfolioAllocations))
		for _, item := range result.Items {
			accountID, err := ensurePortfolioAccount(txCtx, item)
			if err != nil {
				return err
			}
			assetID, err := ensurePortfolioAsset(txCtx, item)
			if err != nil {
				return err
			}
			recordID, err := adjustAccountBalance(txCtx, map[string]any{
				"account_id":   accountID,
				"asset_id":     assetID,
				"record_type":  recordmodel.RecordTypeTransferIn,
				"peer_address": item.PeerAddress,
				"amount":       item.Quantity,
				"remark":       item.Remark(),
			})
			if err != nil {
				return err
			}
			item.AccountID = accountID
			item.AssetID = assetID
			item.RecordID = recordID
			appliedItems = append(appliedItems, item)
		}
		result.Items = appliedItems
		return refreshAllAccountValues(txCtx)
	})
	if err != nil {
		return PortfolioAllocationResult{}, err
	}
	return result, nil
}

func buildInitialPortfolioPlan(ctx context.Context, totalUSD float64) (PortfolioAllocationResult, error) {
	symbols := make([]string, 0, len(initialPortfolioAllocations))
	for _, spec := range initialPortfolioAllocations {
		symbols = append(symbols, spec.Asset.Symbol)
	}
	priceBySymbol := marketPriceBySymbol(ctx, symbols)

	result := PortfolioAllocationResult{
		TotalTargetUSD: totalUSD,
		Items:          make([]PortfolioAllocationItem, 0, len(initialPortfolioAllocations)),
	}
	for _, spec := range initialPortfolioAllocations {
		symbol := normalizeAssetSymbol(spec.Asset.Symbol)
		price := priceBySymbol[symbol]
		if price <= 0 {
			return result, fmt.Errorf("缺少 %s 行情价格，请先采集行情或确认 record_market_asset 中存在价格", symbol)
		}
		targetUSD := totalUSD * spec.Share
		quantity := targetUSD / price
		result.TotalActualUSD += quantity * price
		result.Items = append(result.Items, PortfolioAllocationItem{
			CategoryName:   spec.Account.CategoryName,
			AccountName:    spec.Account.Name,
			ChainType:      spec.Account.ChainType,
			AccountAddress: spec.Account.Address,
			AssetSymbol:    symbol,
			AssetName:      spec.Asset.Name,
			PeerAddress:    spec.PeerAddress,
			PriceUSD:       price,
			TargetUSD:      targetUSD,
			Quantity:       quantity,
		})
	}
	return result, nil
}

func resetAccountRecords(ctx context.Context) {
	recordmodel.NewAccountRecordModel().Delete(ctx, map[string]any{"id": map[string]any{"gt": 0}})
	recordmodel.NewAccountBalanceModel().Delete(ctx, map[string]any{"id": map[string]any{"gt": 0}})
	recordmodel.NewAccountModel().Update(ctx, map[string]any{"id": map[string]any{"gt": 0}}, map[string]any{
		"balance": 0,
	})
}

func ensurePortfolioAccount(ctx context.Context, item PortfolioAllocationItem) (uint64, error) {
	categoryID, err := ensurePortfolioCategory(ctx, item.CategoryName)
	if err != nil {
		return 0, err
	}

	accountModel := recordmodel.NewAccountModel()
	account := accountModel.FindMap(ctx, map[string]any{
		"name":       item.AccountName,
		"chain_type": item.ChainType,
	})
	record := map[string]any{
		"category_id": categoryID,
		"chain_type":  item.ChainType,
		"chain_name":  recordmodel.ChainTypeLabel(item.ChainType),
		"address":     item.AccountAddress,
		"name":        item.AccountName,
		"icon":        "",
		"intro":       "脚本生成的初始测试账户",
		"status":      1,
		"sort":        allocationAccountSort(item),
	}
	if len(account) == 0 {
		record["created_at"] = time.Now()
		accountID := util.ToUint64(accountModel.Insert(ctx, record))
		if accountID == 0 {
			return 0, fmt.Errorf("账户 %s 保存失败", item.AccountName)
		}
		return accountID, nil
	}

	accountID := util.ToUint64(account["id"])
	accountModel.Update(ctx, map[string]any{"id": accountID}, record)
	return accountID, nil
}

func ensurePortfolioCategory(ctx context.Context, name string) (uint64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, fmt.Errorf("账户分类不能为空")
	}

	categoryModel := recordmodel.NewCategoryModel()
	category := categoryModel.FindMap(ctx, map[string]any{"name": name})
	record := map[string]any{
		"name":   name,
		"icon":   "",
		"status": 1,
		"sort":   allocationCategorySort(name),
	}
	if len(category) == 0 {
		record["created_at"] = time.Now()
		categoryID := util.ToUint64(categoryModel.Insert(ctx, record))
		if categoryID == 0 {
			return 0, fmt.Errorf("账户分类 %s 保存失败", name)
		}
		return categoryID, nil
	}

	categoryID := util.ToUint64(category["id"])
	categoryModel.Update(ctx, map[string]any{"id": categoryID}, record)
	return categoryID, nil
}

func ensurePortfolioAsset(ctx context.Context, item PortfolioAllocationItem) (uint64, error) {
	assetModel := recordmodel.NewAssetModel()
	asset := assetModel.FindMap(ctx, map[string]any{
		"chain_type": item.ChainType,
		"symbol":     item.AssetSymbol,
	})
	record := map[string]any{
		"chain_type": item.ChainType,
		"symbol":     item.AssetSymbol,
		"name":       item.AssetName,
		"icon":       "",
		"status":     1,
		"sort":       allocationAssetSort(item),
	}
	if len(asset) == 0 {
		record["created_at"] = time.Now()
		assetID := util.ToUint64(assetModel.Insert(ctx, record))
		if assetID == 0 {
			return 0, fmt.Errorf("资产 %s 保存失败", item.AssetSymbol)
		}
		return assetID, nil
	}

	assetID := util.ToUint64(asset["id"])
	assetModel.Update(ctx, map[string]any{"id": assetID}, record)
	return assetID, nil
}

func allocationCategorySort(name string) int {
	switch strings.TrimSpace(name) {
	case "ac":
		return 10
	case "btc":
		return 20
	default:
		return 100
	}
}

func allocationAccountSort(item PortfolioAllocationItem) int {
	switch item.AccountName {
	case "zty":
		return 10
	case "Account 01":
		return 20
	default:
		return 100
	}
}

func allocationAssetSort(item PortfolioAllocationItem) int {
	switch item.AssetSymbol {
	case "TRX", "BTC":
		return 10
	case "USDT":
		return 20
	default:
		return 100
	}
}

func (item PortfolioAllocationItem) Remark() string {
	return fmt.Sprintf("初始资产分配，按 %.8f USD/%s 折算，目标估值 %.2f USD", item.PriceUSD, item.AssetSymbol, item.TargetUSD)
}
