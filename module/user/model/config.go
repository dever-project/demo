package model

import "github.com/shemic/dever/orm"

type Config struct {
	ID      uint64 `dorm:"primaryKey;autoIncrement;comment:配置ID"`
	Name    string `dorm:"type:varchar(128);not null;comment:名称"`
	Content string `dorm:"type:text;not null;comment:内容"`
	Pic     string `dorm:"type:text;not null;default:'[]';comment:图片"`
}

type ConfigIndex struct{}

var configSeed = []map[string]any{
	{
		"id":      1,
		"name":    "默认配置",
		"content": "",
		"pic":     "[]",
	},
}

func NewConfigModel() *orm.Model[Config] {
	return orm.LoadModel[Config]("user_config", Config{}, ConfigIndex{}, configSeed, "id asc", "default")
}
