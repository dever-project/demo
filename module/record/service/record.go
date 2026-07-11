package service

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	frontaction "github.com/dever-package/front/service/action"
	"github.com/shemic/dever/orm"
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	recordmodel "my/module/record/model"
)

type RecordService struct{}

type balanceAdjustInput struct {
	accountID   uint64
	assetID     uint64
	recordType  string
	peerAddress string
	amount      float64
	remark      string
	createdAt   time.Time
}

func (RecordService) ProviderNormalizeAccount(_ *server.Context, params []any) any {
	payload := cloneRecordPayload(params)
	chainType := strings.TrimSpace(util.ToString(payload["chain_type"]))
	if chainType == "" {
		chainType = recordmodel.ChainTypeTron
	}
	chainName := recordmodel.ChainTypeLabel(chainType)
	if chainName == "" {
		panic(frontaction.NewFieldError("form.chain_type", "链类型不正确。"))
	}
	payload["chain_type"] = chainType
	payload["chain_name"] = chainName
	payload["address"] = strings.TrimSpace(util.ToString(payload["address"]))
	return payload
}

func (RecordService) ProviderNormalizeAsset(_ *server.Context, params []any) any {
	payload := cloneRecordPayload(params)
	chainType := strings.TrimSpace(util.ToString(payload["chain_type"]))
	if chainType == "" {
		chainType = recordmodel.ChainTypeTron
	}
	if recordmodel.ChainTypeLabel(chainType) == "" {
		panic(frontaction.NewFieldError("form.chain_type", "链类型不正确。"))
	}
	payload["chain_type"] = chainType
	payload["symbol"] = strings.ToUpper(strings.TrimSpace(util.ToString(payload["symbol"])))
	payload["name"] = strings.TrimSpace(util.ToString(payload["name"]))
	return payload
}

func (RecordService) ProviderAdjustBalance(c *server.Context, params []any) any {
	payload := cloneRecordPayload(params)
	if util.ToUint64(payload["id"]) > 0 {
		panic(frontaction.NewFieldError("form.id", "账户记录不支持编辑，请新增一条反向记录。"))
	}

	accountRecordID, err := adjustAccountBalance(c.Context(), payload)
	if err != nil {
		panic(err)
	}
	result := map[string]any{
		"id":              accountRecordID,
		"record_adjusted": true,
	}
	return result
}

func adjustAccountBalance(ctx context.Context, payload map[string]any) (uint64, error) {
	input, err := normalizeBalanceAdjustInput(payload)
	if err != nil {
		return 0, err
	}

	accountModel := recordmodel.NewAccountModel()
	categoryModel := recordmodel.NewCategoryModel()
	assetModel := recordmodel.NewAssetModel()
	balanceModel := recordmodel.NewAccountBalanceModel()
	recordModel := recordmodel.NewAccountRecordModel()
	var accountRecordID uint64

	err = orm.Transaction(ctx, func(txCtx context.Context) error {
		accountRow := accountModel.FindMap(txCtx, map[string]any{"id": input.accountID})
		if len(accountRow) == 0 {
			return frontaction.NewFieldError("form.account_id", "账户不存在。")
		}

		assetRow := assetModel.FindMap(txCtx, map[string]any{"id": input.assetID, "status": 1})
		if len(assetRow) == 0 {
			return frontaction.NewFieldError("form.asset_id", "资产不存在或已停用。")
		}

		chainType := util.ToStringTrimmed(accountRow["chain_type"])
		if chainType == "" {
			chainType = recordmodel.ChainTypeTron
		}
		if assetChainType := util.ToStringTrimmed(assetRow["chain_type"]); assetChainType != chainType {
			return frontaction.NewFieldError("form.asset_id", "资产链类型与账户不一致。")
		}

		balanceRow := balanceModel.FindMap(txCtx, map[string]any{
			"account_id": input.accountID,
			"asset_id":   input.assetID,
		})
		balanceBefore := numberValue(balanceRow["balance"])
		balanceAfter, err := nextBalance(balanceBefore, input)
		if err != nil {
			return err
		}

		if input.recordType != recordmodel.RecordTypeFailed {
			if err := updateAccountAssetBalance(txCtx, balanceModel, balanceRow, accountRow, assetRow, balanceAfter); err != nil {
				return err
			}
			if _, err := refreshAccountValue(txCtx, input.accountID); err != nil {
				return err
			}
		}

		categoryID := util.ToUint64(accountRow["category_id"])
		categoryName := ""
		if categoryID > 0 {
			categoryRow := categoryModel.FindMap(txCtx, map[string]any{"id": categoryID})
			categoryName = util.ToStringTrimmed(categoryRow["name"])
		}

		accountRecordID = util.ToUint64(recordModel.Insert(txCtx, map[string]any{
			"account_id":     input.accountID,
			"account_name":   util.ToStringTrimmed(accountRow["name"]),
			"category_id":    categoryID,
			"category_name":  categoryName,
			"asset_id":       input.assetID,
			"asset_symbol":   util.ToStringTrimmed(assetRow["symbol"]),
			"chain_type":     chainType,
			"record_type":    input.recordType,
			"peer_address":   input.peerAddress,
			"amount":         input.amount,
			"balance_before": balanceBefore,
			"balance_after":  balanceAfter,
			"remark":         input.remark,
			"created_at":     input.createdAt,
		}))
		if accountRecordID == 0 {
			return frontaction.NewFieldError("form.amount", "账户记录保存失败。")
		}
		return nil
	})
	return accountRecordID, err
}

func normalizeBalanceAdjustInput(payload map[string]any) (balanceAdjustInput, error) {
	accountID := util.ToUint64(payload["account_id"])
	if accountID == 0 {
		return balanceAdjustInput{}, frontaction.NewFieldError("form.account_id", "账户不能为空。")
	}

	assetID := util.ToUint64(payload["asset_id"])
	if assetID == 0 {
		return balanceAdjustInput{}, frontaction.NewFieldError("form.asset_id", "资产不能为空。")
	}

	recordType := strings.TrimSpace(util.ToString(payload["record_type"]))
	switch recordType {
	case recordmodel.RecordTypeTransferIn, recordmodel.RecordTypeTransferOut, recordmodel.RecordTypeFailed:
	default:
		return balanceAdjustInput{}, frontaction.NewFieldError("form.record_type", "记录类型不正确。")
	}

	peerAddress := strings.TrimSpace(util.ToString(payload["peer_address"]))
	if peerAddress == "" {
		return balanceAdjustInput{}, frontaction.NewFieldError("form.peer_address", "对方地址不能为空。")
	}

	amount := numberValue(payload["amount"])
	if amount <= 0 {
		return balanceAdjustInput{}, frontaction.NewFieldError("form.amount", "变动数量必须大于 0。")
	}

	remark := strings.TrimSpace(util.ToString(payload["remark"]))

	return balanceAdjustInput{
		accountID:   accountID,
		assetID:     assetID,
		recordType:  recordType,
		peerAddress: peerAddress,
		amount:      amount,
		remark:      remark,
		createdAt:   time.Now(),
	}, nil
}

func nextBalance(balanceBefore float64, input balanceAdjustInput) (float64, error) {
	switch input.recordType {
	case recordmodel.RecordTypeTransferIn:
		return balanceBefore + input.amount, nil
	case recordmodel.RecordTypeTransferOut:
		if balanceBefore < input.amount {
			return 0, frontaction.NewFieldError("form.amount", "转出数量不能超过当前持仓。")
		}
		return balanceBefore - input.amount, nil
	case recordmodel.RecordTypeFailed:
		return balanceBefore, nil
	default:
		return 0, frontaction.NewFieldError("form.record_type", "记录类型不正确。")
	}
}

func updateAccountAssetBalance(ctx context.Context, balanceModel *orm.Model[recordmodel.AccountBalance], balanceRow map[string]any, accountRow map[string]any, assetRow map[string]any, balanceAfter float64) error {
	now := time.Now()
	chainType := util.ToStringTrimmed(accountRow["chain_type"])
	if chainType == "" {
		chainType = recordmodel.ChainTypeTron
	}
	record := map[string]any{
		"account_id":   util.ToUint64(accountRow["id"]),
		"account_name": util.ToStringTrimmed(accountRow["name"]),
		"asset_id":     util.ToUint64(assetRow["id"]),
		"asset_symbol": util.ToStringTrimmed(assetRow["symbol"]),
		"chain_type":   chainType,
		"balance":      balanceAfter,
		"updated_at":   now,
	}

	balanceID := util.ToUint64(balanceRow["id"])
	if balanceID == 0 {
		record["created_at"] = now
		if util.ToUint64(balanceModel.Insert(ctx, record)) == 0 {
			return frontaction.NewFieldError("form.amount", "账户持仓保存失败。")
		}
		return nil
	}

	return updateExistingAccountAssetBalance(ctx, balanceModel, balanceID, util.ToIntDefault(balanceRow["version"], 0), record)
}

func updateExistingAccountAssetBalance(ctx context.Context, balanceModel *orm.Model[recordmodel.AccountBalance], balanceID uint64, version int, record map[string]any) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			if recoveredErr, ok := recovered.(error); ok && errors.Is(recoveredErr, orm.ErrVersionConflict) {
				err = frontaction.NewFieldError("form.amount", "账户持仓已发生变化，请刷新后重试。")
				return
			}
			panic(recovered)
		}
	}()

	updated := balanceModel.Update(ctx, map[string]any{
		"id":      balanceID,
		"version": version,
	}, record, true)
	if updated == 0 {
		return frontaction.NewFieldError("form.amount", "账户持仓已发生变化，请刷新后重试。")
	}
	return nil
}

func updateAccountBalance(ctx context.Context, accountModel *orm.Model[recordmodel.Account], accountID uint64, version int, balanceAfter float64) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			if recoveredErr, ok := recovered.(error); ok && errors.Is(recoveredErr, orm.ErrVersionConflict) {
				err = frontaction.NewFieldError("form.amount", "账户估值已发生变化，请刷新后重试。")
				return
			}
			panic(recovered)
		}
	}()

	updated := accountModel.Update(ctx, map[string]any{
		"id":      accountID,
		"version": version,
	}, map[string]any{
		"balance": balanceAfter,
	}, true)
	if updated == 0 {
		return frontaction.NewFieldError("form.amount", "账户估值已发生变化，请刷新后重试。")
	}
	return nil
}

func cloneRecordPayload(params []any) map[string]any {
	if len(params) == 0 {
		return make(map[string]any)
	}
	payload, ok := params[0].(map[string]any)
	if !ok {
		return make(map[string]any)
	}
	return util.CloneMap(payload)
}

func numberValue(value any) float64 {
	switch current := value.(type) {
	case nil:
		return 0
	case int:
		return float64(current)
	case int8:
		return float64(current)
	case int16:
		return float64(current)
	case int32:
		return float64(current)
	case int64:
		return float64(current)
	case uint:
		return float64(current)
	case uint8:
		return float64(current)
	case uint16:
		return float64(current)
	case uint32:
		return float64(current)
	case uint64:
		return float64(current)
	case float32:
		return float64(current)
	case float64:
		return current
	case []byte:
		number, _ := strconv.ParseFloat(strings.TrimSpace(string(current)), 64)
		return number
	case string:
		number, _ := strconv.ParseFloat(strings.TrimSpace(current), 64)
		return number
	default:
		number, _ := strconv.ParseFloat(strings.TrimSpace(util.ToString(current)), 64)
		return number
	}
}
