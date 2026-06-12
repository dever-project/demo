package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type CanvasAssetVersionSource struct {
	ID               uint64    `dorm:"primaryKey;autoIncrement;comment:画布资产版本来源ID"`
	ProjectID        uint64    `dorm:"type:bigint;not null;default:0;comment:项目"`
	AssetID          uint64    `dorm:"type:bigint;not null;default:0;comment:资产"`
	VersionID        uint64    `dorm:"type:bigint;not null;default:0;comment:资产版本"`
	Purpose          string    `dorm:"type:varchar(32);not null;default:'material_result';comment:保存目的"`
	RunID            uint64    `dorm:"type:bigint;not null;default:0;comment:运行"`
	NodeRunID        uint64    `dorm:"type:bigint;not null;default:0;comment:节点运行"`
	ReleaseID        uint64    `dorm:"type:bigint;not null;default:0;comment:发布版本"`
	NodeKey          string    `dorm:"type:varchar(128);not null;default:'';comment:画布节点标识"`
	SourceKey        string    `dorm:"type:varchar(128);not null;default:'';comment:来源标识"`
	RequestID        string    `dorm:"type:varchar(128);not null;default:'';comment:请求标识"`
	SourceRunID      uint64    `dorm:"type:bigint;not null;default:0;comment:来源运行"`
	SourceNodeRunID  uint64    `dorm:"type:bigint;not null;default:0;comment:来源节点运行"`
	SourceAssetID    uint64    `dorm:"type:bigint;not null;default:0;comment:来源资产"`
	SourceVersionID  uint64    `dorm:"type:bigint;not null;default:0;comment:来源资产版本"`
	SourceReleaseID  uint64    `dorm:"type:bigint;not null;default:0;comment:来源发布版本"`
	SourceRequestID  string    `dorm:"type:varchar(128);not null;default:'';comment:来源请求"`
	SourceNodeKey    string    `dorm:"type:varchar(128);not null;default:'';comment:来源节点标识"`
	SourceNodeType   string    `dorm:"type:varchar(32);not null;default:'';comment:来源节点类型"`
	SourceNodeStatus string    `dorm:"type:varchar(32);not null;default:'';comment:来源节点状态"`
	CreatedAt        time.Time `dorm:"comment:创建时间"`
}

type CanvasAssetVersionSourceIndex struct {
	Version      struct{} `unique:"version_id"`
	ProjectAsset struct{} `index:"project_id,asset_id,version_id"`
	ProjectRun   struct{} `index:"project_id,run_id,node_run_id"`
	Request      struct{} `index:"project_id,purpose,request_id"`
	SourceAsset  struct{} `index:"source_asset_id,source_version_id"`
}

func NewCanvasAssetVersionSourceModel() *orm.Model[CanvasAssetVersionSource] {
	return orm.LoadModel[CanvasAssetVersionSource]("工作台画布资产版本来源", "work_canvas_asset_version_source", orm.ModelConfig{
		Index:    CanvasAssetVersionSourceIndex{},
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
