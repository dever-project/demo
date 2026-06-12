package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

const (
	CanvasAssetPurposeMaterial = "material_result"
	CanvasAssetPurposeContent  = "content_save"
)

var canvasAssetPurposeOptions = []map[string]any{
	{"id": CanvasAssetPurposeMaterial, "value": "素材结果"},
	{"id": CanvasAssetPurposeContent, "value": "内容保存"},
}

type CanvasAsset struct {
	ID          uint64    `dorm:"primaryKey;autoIncrement;comment:画布资产映射ID"`
	ProjectID   uint64    `dorm:"type:bigint;not null;default:0;comment:项目"`
	AssetCateID uint64    `dorm:"type:bigint;not null;default:0;comment:资产分类"`
	AssetID     uint64    `dorm:"type:bigint;not null;default:0;comment:资产"`
	NodeKey     string    `dorm:"type:varchar(128);not null;default:'';comment:画布节点标识"`
	SourceKey   string    `dorm:"type:varchar(128);not null;default:'';comment:来源标识"`
	Purpose     string    `dorm:"type:varchar(32);not null;default:'material_result';comment:保存目的"`
	Name        string    `dorm:"type:varchar(128);not null;default:'';comment:展示名称"`
	CreatedAt   time.Time `dorm:"comment:创建时间"`
	UpdatedAt   time.Time `dorm:"comment:更新时间"`
}

type CanvasAssetIndex struct {
	ProjectPurposeSource struct{} `unique:"project_id,asset_cate_id,purpose,node_key,source_key"`
	ProjectAsset         struct{} `index:"project_id,asset_id"`
	ProjectNode          struct{} `index:"project_id,node_key,purpose"`
}

func NewCanvasAssetModel() *orm.Model[CanvasAsset] {
	return orm.LoadModel[CanvasAsset]("工作台画布资产映射", "work_canvas_asset", orm.ModelConfig{
		Index:    CanvasAssetIndex{},
		Order:    "id desc",
		Database: "default",
		Options: map[string]any{
			"purpose": canvasAssetPurposeOptions,
		},
		Relations: []orm.Relation{
			projectCanvasProjectRelation,
		},
	})
}
