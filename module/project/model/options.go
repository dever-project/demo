package model

const (
	StatusEnabled  int16 = 1
	StatusDisabled int16 = 2
)

var statusOptions = []map[string]any{
	{"id": StatusEnabled, "value": "开启"},
	{"id": StatusDisabled, "value": "停用"},
}
