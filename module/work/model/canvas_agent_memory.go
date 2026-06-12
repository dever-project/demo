package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type CanvasAgentMemory struct {
	ID          uint64    `dorm:"primaryKey;autoIncrement;comment:画布智能体记忆ID"`
	ProjectID   uint64    `dorm:"type:bigint;not null;default:0;comment:项目"`
	AssetCateID uint64    `dorm:"type:bigint;not null;default:0;comment:资产分类"`
	AgentID     uint64    `dorm:"type:bigint;not null;default:0;comment:智能体"`
	NodeKey     string    `dorm:"type:varchar(128);not null;default:'';comment:画布节点标识"`
	Role        string    `dorm:"type:varchar(32);not null;default:'';comment:记忆角色"`
	Content     string    `dorm:"type:text;not null;default:'{}';comment:记忆内容"`
	RunID       uint64    `dorm:"type:bigint;not null;default:0;comment:画布运行"`
	NodeRunID   uint64    `dorm:"type:bigint;not null;default:0;comment:节点运行"`
	AgentRunID  uint64    `dorm:"type:bigint;not null;default:0;comment:智能体运行"`
	CreatedAt   time.Time `dorm:"comment:创建时间"`
}

type CanvasAgentMemoryIndex struct {
	ProjectScope struct{} `index:"project_id,asset_cate_id,node_key,agent_id,id"`
	ProjectRun   struct{} `index:"project_id,run_id,node_run_id"`
	AgentRun     struct{} `index:"agent_run_id"`
}

func NewCanvasAgentMemoryModel() *orm.Model[CanvasAgentMemory] {
	return orm.LoadModel[CanvasAgentMemory]("工作台画布智能体记忆", "work_canvas_agent_memory", orm.ModelConfig{
		Index:    CanvasAgentMemoryIndex{},
		Order:    "id desc",
		Database: "default",
		Relations: []orm.Relation{
			projectCanvasProjectRelation,
		},
	})
}
