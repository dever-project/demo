package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	frontcron "github.com/dever-package/front/service/cron"
	"github.com/shemic/dever/orm"
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	marketdata "my/module/record/model"
)

type RecordCronService struct{}

const (
	defaultCoinLoreBaseURL         = "https://api.coinlore.net/api"
	defaultCoinGeckoBaseURL        = "https://api.coingecko.com/api/v3"
	defaultCoinGeckoDeFiCategoryID = "decentralized-finance-defi"
	recordMarketCronProvider       = "record.RecordCronService.CollectMarket"
)

var marketHTTPClient = &http.Client{Timeout: 30 * time.Second}

type marketCollectConfig struct {
	CoinLoreBaseURL  string
	CoinGeckoBaseURL string
	VSCurrency       string
	Scope            string
	MarketLimit      int
	DeFiLimit        int
	DeFiCategory     string
}

type marketAssetSnapshot struct {
	ProviderCoinID           string
	Symbol                   string
	Name                     string
	Image                    string
	MarketCapRank            int
	Price                    float64
	MarketCap                float64
	TotalVolume              float64
	PriceChangePercentage24h float64
	Source                   string
	SourceUpdatedAt          *time.Time
}

type coinLoreTickerResponse struct {
	Data []coinLoreTickerItem `json:"data"`
	Info map[string]any       `json:"info"`
}

type coinLoreTickerItem struct {
	ID               string `json:"id"`
	Symbol           string `json:"symbol"`
	Name             string `json:"name"`
	Rank             any    `json:"rank"`
	PriceUSD         any    `json:"price_usd"`
	MarketCapUSD     any    `json:"market_cap_usd"`
	Volume24         any    `json:"volume24"`
	PercentChange24h any    `json:"percent_change_24h"`
}

type coinGeckoMarketItem struct {
	ID                       string  `json:"id"`
	Symbol                   string  `json:"symbol"`
	Name                     string  `json:"name"`
	Image                    string  `json:"image"`
	MarketCapRank            int     `json:"market_cap_rank"`
	CurrentPrice             float64 `json:"current_price"`
	MarketCap                float64 `json:"market_cap"`
	TotalVolume              float64 `json:"total_volume"`
	PriceChangePercentage24h float64 `json:"price_change_percentage_24h"`
	LastUpdated              string  `json:"last_updated"`
}

func (RecordCronService) ProviderBeforeSaveMarketJob(c *server.Context, params []any) any {
	payload := cloneRecordPayload(params)
	cronRecord := buildMarketCronRecord(payload)
	return (frontcron.CronHook{}).ProviderBeforeSaveCron(c, []any{cronRecord})
}

func (RecordCronService) ProviderCollectMarket(c *server.Context, params []any) any {
	payload := cronPayload(params)
	result, err := collectMarketAssets(cronContext(c, params), marketCollectConfigFromPayload(payload))
	if err != nil {
		panic(err)
	}
	return result
}

func buildMarketCronRecord(payload map[string]any) map[string]any {
	name := util.ToStringTrimmed(payload["name"])
	if name == "" {
		name = "行情采集"
	}

	intervalMinutes := limitedInt(payload["interval_minutes"], 15, 1, 59)
	marketLimit := limitedInt(payload["market_limit"], 100, 1, 100)
	defiLimit := limitedInt(payload["defi_limit"], 100, 1, 250)
	timeoutSeconds := limitedInt(payload["timeout_seconds"], 120, 30, 86400)
	scope := normalizeMarketScope(payload["scope"])
	vsCurrency := normalizeMarketText(payload["vs_currency"], "usd")
	defiCategory := normalizeMarketText(payload["defi_category_id"], defaultCoinGeckoDeFiCategoryID)
	coinLoreBaseURL := normalizeMarketText(payload["coinlore_base_url"], defaultCoinLoreBaseURL)
	coinGeckoBaseURL := normalizeMarketText(payload["coingecko_base_url"], defaultCoinGeckoBaseURL)

	cronRecord := map[string]any{
		"id":               payload["id"],
		"name":             name,
		"status":           util.ToIntDefault(payload["status"], 1),
		"schedule_mode":    "every_minutes",
		"interval_minutes": intervalMinutes,
		"timezone":         "Asia/Shanghai",
		"kind":             "provider",
		"use":              recordMarketCronProvider,
		"timeout_seconds":  timeoutSeconds,
		"payload_json":     "{}",
		"params": []any{
			cronParam("scope", scope, 10),
			cronParam("vs_currency", vsCurrency, 20),
			cronParam("market_limit", strconv.Itoa(marketLimit), 30),
			cronParam("defi_limit", strconv.Itoa(defiLimit), 40),
			cronParam("defi_category_id", defiCategory, 50),
			cronParam("coinlore_base_url", coinLoreBaseURL, 60),
			cronParam("coingecko_base_url", coinGeckoBaseURL, 70),
		},
	}
	return cronRecord
}

func cronParam(key string, value string, sort int) map[string]any {
	result := map[string]any{
		"param_key":   key,
		"param_value": value,
		"status":      1,
		"sort":        sort,
	}
	return result
}

func collectMarketAssets(ctx context.Context, config marketCollectConfig) (map[string]any, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	startedAt := time.Now()
	result := map[string]any{
		"market_cap_source": marketdata.MarketSourceCoinLore,
		"defi_source":       marketdata.MarketSourceCoinGecko,
		"vs_currency":       config.VSCurrency,
		"collected_at":      startedAt.Format(time.RFC3339),
	}

	total := 0
	if config.Scope == "all" || config.Scope == marketdata.MarketScopeMarketCap {
		items, err := fetchCoinLoreTickers(ctx, config, config.MarketLimit)
		if err != nil {
			return nil, err
		}
		count, err := saveMarketAssetScope(ctx, marketdata.MarketScopeMarketCap, items, startedAt)
		if err != nil {
			return nil, err
		}
		result["market_cap_count"] = count
		total += count
	}

	if config.Scope == "all" || config.Scope == marketdata.MarketScopeDeFi {
		items, err := fetchCoinGeckoMarkets(ctx, config, config.DeFiCategory, config.DeFiLimit)
		if err != nil {
			return nil, err
		}
		count, err := saveMarketAssetScope(ctx, marketdata.MarketScopeDeFi, items, startedAt)
		if err != nil {
			return nil, err
		}
		result["defi_count"] = count
		total += count
	}
	if err := refreshAllAccountValues(ctx); err != nil {
		return nil, err
	}
	result["total_count"] = total
	return result, nil
}

func marketCollectConfigFromPayload(payload map[string]any) marketCollectConfig {
	return marketCollectConfig{
		CoinLoreBaseURL:  normalizeMarketText(payload["coinlore_base_url"], defaultCoinLoreBaseURL),
		CoinGeckoBaseURL: normalizeMarketText(firstMarketValue(payload, "coingecko_base_url", "base_url"), defaultCoinGeckoBaseURL),
		VSCurrency:       normalizeMarketText(payload["vs_currency"], "usd"),
		Scope:            normalizeMarketScope(payload["scope"]),
		MarketLimit:      limitedInt(payload["market_limit"], 100, 1, 100),
		DeFiLimit:        limitedInt(payload["defi_limit"], 100, 1, 250),
		DeFiCategory:     normalizeMarketText(payload["defi_category_id"], defaultCoinGeckoDeFiCategoryID),
	}
}

func fetchCoinLoreTickers(ctx context.Context, config marketCollectConfig, limit int) ([]marketAssetSnapshot, error) {
	endpoint, err := url.Parse(strings.TrimRight(config.CoinLoreBaseURL, "/") + "/tickers/")
	if err != nil {
		return nil, fmt.Errorf("CoinLore 地址无效: %w", err)
	}
	query := endpoint.Query()
	query.Set("start", "0")
	query.Set("limit", strconv.Itoa(limit))
	endpoint.RawQuery = query.Encode()

	responseBody, err := fetchMarketJSON(ctx, endpoint.String(), marketdata.MarketSourceCoinLore)
	if err != nil {
		return nil, err
	}

	payload := coinLoreTickerResponse{}
	if err := json.Unmarshal(responseBody, &payload); err != nil {
		return nil, fmt.Errorf("CoinLore 响应解析失败: %w", err)
	}
	sourceUpdatedAt := coinLoreSourceTime(payload.Info)
	result := make([]marketAssetSnapshot, 0, len(payload.Data))
	for _, item := range payload.Data {
		result = append(result, coinLoreTickerToSnapshot(item, sourceUpdatedAt))
	}
	return result, nil
}

func fetchCoinGeckoMarkets(ctx context.Context, config marketCollectConfig, category string, limit int) ([]marketAssetSnapshot, error) {
	endpoint, err := url.Parse(strings.TrimRight(config.CoinGeckoBaseURL, "/") + "/coins/markets")
	if err != nil {
		return nil, fmt.Errorf("CoinGecko 地址无效: %w", err)
	}
	query := endpoint.Query()
	query.Set("vs_currency", config.VSCurrency)
	query.Set("order", "market_cap_desc")
	query.Set("per_page", strconv.Itoa(limit))
	query.Set("page", "1")
	query.Set("sparkline", "false")
	query.Set("price_change_percentage", "24h")
	query.Set("locale", "zh")
	if strings.TrimSpace(category) != "" {
		query.Set("category", strings.TrimSpace(category))
	}
	endpoint.RawQuery = query.Encode()

	responseBody, err := fetchMarketJSON(ctx, endpoint.String(), marketdata.MarketSourceCoinGecko)
	if err != nil {
		return nil, err
	}

	items := []coinGeckoMarketItem{}
	if err := json.Unmarshal(responseBody, &items); err != nil {
		return nil, fmt.Errorf("CoinGecko 响应解析失败: %w", err)
	}
	result := make([]marketAssetSnapshot, 0, len(items))
	for _, item := range items {
		result = append(result, coinGeckoMarketToSnapshot(item))
	}
	return result, nil
}

func fetchMarketJSON(ctx context.Context, rawURL string, source string) ([]byte, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "shemic-record-market-collector/0.1")
	if source == marketdata.MarketSourceCoinGecko {
		if apiKey := strings.TrimSpace(os.Getenv("COINGECKO_API_KEY")); apiKey != "" {
			applyCoinGeckoAPIKeyHeader(request, apiKey)
		}
	}

	response, err := marketHTTPClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("%s 请求失败: %w", source, err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 512))
		return nil, fmt.Errorf("%s 返回异常: %s %s", source, response.Status, strings.TrimSpace(string(body)))
	}
	return io.ReadAll(response.Body)
}

func saveMarketAssetScope(ctx context.Context, scope string, items []marketAssetSnapshot, collectedAt time.Time) (int, error) {
	assetModel := marketdata.NewMarketAssetModel()
	err := orm.Transaction(ctx, func(txCtx context.Context) error {
		assetModel.Update(txCtx, map[string]any{"scope": scope}, map[string]any{
			"status":     2,
			"updated_at": collectedAt,
		})
		for _, item := range items {
			if strings.TrimSpace(item.ProviderCoinID) == "" {
				continue
			}
			if err := upsertMarketAsset(txCtx, assetModel, scope, item, collectedAt); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return len(items), nil
}

func upsertMarketAsset(ctx context.Context, assetModel *orm.Model[marketdata.MarketAsset], scope string, item marketAssetSnapshot, collectedAt time.Time) error {
	filter := map[string]any{
		"scope":            scope,
		"provider_coin_id": strings.TrimSpace(item.ProviderCoinID),
	}
	record := map[string]any{
		"scope":                       scope,
		"provider_coin_id":            strings.TrimSpace(item.ProviderCoinID),
		"symbol":                      strings.ToUpper(strings.TrimSpace(item.Symbol)),
		"name":                        strings.TrimSpace(item.Name),
		"image":                       strings.TrimSpace(item.Image),
		"market_cap_rank":             item.MarketCapRank,
		"price":                       item.Price,
		"market_cap":                  item.MarketCap,
		"total_volume":                item.TotalVolume,
		"price_change_percentage_24h": item.PriceChangePercentage24h,
		"source":                      strings.TrimSpace(item.Source),
		"source_updated_at":           item.SourceUpdatedAt,
		"collected_at":                collectedAt,
		"status":                      1,
		"updated_at":                  collectedAt,
	}

	existing := assetModel.FindMap(ctx, filter)
	if len(existing) == 0 {
		record["created_at"] = collectedAt
		assetModel.Insert(ctx, record)
		return nil
	}
	assetModel.Update(ctx, map[string]any{"id": util.ToUint64(existing["id"])}, record)
	return nil
}

func coinLoreTickerToSnapshot(item coinLoreTickerItem, sourceUpdatedAt *time.Time) marketAssetSnapshot {
	return marketAssetSnapshot{
		ProviderCoinID:           strings.TrimSpace(item.ID),
		Symbol:                   strings.TrimSpace(item.Symbol),
		Name:                     strings.TrimSpace(item.Name),
		MarketCapRank:            util.ToIntDefault(item.Rank, 0),
		Price:                    numberValue(item.PriceUSD),
		MarketCap:                numberValue(item.MarketCapUSD),
		TotalVolume:              numberValue(item.Volume24),
		PriceChangePercentage24h: numberValue(item.PercentChange24h),
		Source:                   marketdata.MarketSourceCoinLore,
		SourceUpdatedAt:          sourceUpdatedAt,
	}
}

func coinGeckoMarketToSnapshot(item coinGeckoMarketItem) marketAssetSnapshot {
	return marketAssetSnapshot{
		ProviderCoinID:           strings.TrimSpace(item.ID),
		Symbol:                   strings.TrimSpace(item.Symbol),
		Name:                     strings.TrimSpace(item.Name),
		Image:                    strings.TrimSpace(item.Image),
		MarketCapRank:            item.MarketCapRank,
		Price:                    item.CurrentPrice,
		MarketCap:                item.MarketCap,
		TotalVolume:              item.TotalVolume,
		PriceChangePercentage24h: item.PriceChangePercentage24h,
		Source:                   marketdata.MarketSourceCoinGecko,
		SourceUpdatedAt:          parseMarketTime(item.LastUpdated),
	}
}

func coinLoreSourceTime(info map[string]any) *time.Time {
	if len(info) == 0 {
		return nil
	}
	timestamp := int64(numberValue(info["time"]))
	if timestamp <= 0 {
		return nil
	}
	parsed := time.Unix(timestamp, 0)
	return &parsed
}

func applyCoinGeckoAPIKeyHeader(request *http.Request, apiKey string) {
	if strings.Contains(request.URL.Host, "pro-api") {
		request.Header.Set("x-cg-pro-api-key", apiKey)
		return
	}
	request.Header.Set("x-cg-demo-api-key", apiKey)
}

func parseMarketTime(value string) *time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil
	}
	return &parsed
}

func normalizeMarketScope(value any) string {
	switch strings.TrimSpace(util.ToString(value)) {
	case marketdata.MarketScopeMarketCap:
		return marketdata.MarketScopeMarketCap
	case marketdata.MarketScopeDeFi:
		return marketdata.MarketScopeDeFi
	default:
		return "all"
	}
}

func normalizeMarketText(value any, fallback string) string {
	text := strings.TrimSpace(util.ToString(value))
	if text == "" {
		return fallback
	}
	return text
}

func firstMarketValue(payload map[string]any, keys ...string) any {
	for _, key := range keys {
		if value, exists := payload[key]; exists && strings.TrimSpace(util.ToString(value)) != "" {
			return value
		}
	}
	return nil
}

func limitedInt(value any, fallback int, min int, max int) int {
	number := util.ToIntDefault(value, fallback)
	if number < min {
		return min
	}
	if number > max {
		return max
	}
	return number
}

func cronContext(c *server.Context, params []any) context.Context {
	if c != nil {
		return c.Context()
	}
	for _, item := range params {
		if ctx, ok := item.(context.Context); ok && ctx != nil {
			return ctx
		}
	}
	return context.Background()
}

func cronPayload(params []any) map[string]any {
	for _, item := range params {
		if row, ok := item.(map[string]any); ok && row != nil {
			return util.CloneMap(row)
		}
	}
	return make(map[string]any)
}
