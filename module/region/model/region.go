package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type Region struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:地区ID"`
	ParentID  uint64    `dorm:"not null;default:0;comment:父级地区"`
	Name      string    `dorm:"type:varchar(64);not null;comment:地区名称"`
	Sort      int       `dorm:"type:int;not null;default:0;comment:排序"`
	Leaf      int       `dorm:"type:smallint;not null;default:0;comment:叶子节点"`
	CreatedAt time.Time `dorm:"not null;default:CURRENT_TIMESTAMP;comment:创建时间"`
}

type RegionIndex struct {
	ParentName struct{} `unique:"parent_id,name"`
}

var regionSeed = []map[string]any{
	{"id": 110000, "parent_id": 0, "name": "北京市", "sort": 1, "leaf": 0},
	{"id": 110100, "parent_id": 110000, "name": "市辖区", "sort": 1, "leaf": 0},
	{"id": 110105, "parent_id": 110100, "name": "朝阳区", "sort": 1, "leaf": 1},
	{"id": 110108, "parent_id": 110100, "name": "海淀区", "sort": 2, "leaf": 1},
	{"id": 440000, "parent_id": 0, "name": "广东省", "sort": 2, "leaf": 0},
	{"id": 440100, "parent_id": 440000, "name": "广州市", "sort": 1, "leaf": 0},
	{"id": 440106, "parent_id": 440100, "name": "天河区", "sort": 1, "leaf": 1},
	{"id": 440300, "parent_id": 440000, "name": "深圳市", "sort": 2, "leaf": 0},
	{"id": 440305, "parent_id": 440300, "name": "南山区", "sort": 1, "leaf": 1},
	{"id": 440306, "parent_id": 440300, "name": "宝安区", "sort": 2, "leaf": 1},
}

func NewRegionModel() *orm.Model[Region] {
	return orm.LoadModel[Region]("地区", "region", orm.ModelConfig{
		Index:    RegionIndex{},
		Seeds:    regionSeed,
		Order:    "sort asc, id asc",
		Database: "default",
	})
}
