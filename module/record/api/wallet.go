package api

import (
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	recordservice "my/module/record/service"
)

type Wallet struct{}

var walletQueryService = recordservice.WalletQueryService{}

func (Wallet) GetAccounts(c *server.Context) error {
	data := walletQueryService.Accounts(c.Context(), recordservice.WalletListQuery{
		CategoryID: firstUint64Input(c, "category_id", "cate_id"),
		Page:       firstIntInput(c, "page"),
		PageSize:   firstIntInput(c, "page_size", "pageSize", "limit"),
	})
	return recordJSON(c, data, nil)
}

func (Wallet) GetRecords(c *server.Context) error {
	data, err := walletQueryService.Records(c.Context(), recordservice.WalletRecordQuery{
		AccountID:  firstUint64Input(c, "account_id", "wallet_id", "id"),
		AssetID:    firstUint64Input(c, "asset_id"),
		RecordType: c.Input("record_type"),
		Page:       firstIntInput(c, "page"),
		PageSize:   firstIntInput(c, "page_size", "pageSize", "limit"),
	})
	return recordJSON(c, data, err)
}

func firstUint64Input(c *server.Context, keys ...string) uint64 {
	for _, key := range keys {
		if value := util.ToUint64(c.Input(key)); value > 0 {
			return value
		}
	}
	return 0
}

func firstIntInput(c *server.Context, keys ...string) int {
	for _, key := range keys {
		if value := util.ToIntDefault(c.Input(key), 0); value > 0 {
			return value
		}
	}
	return 0
}
