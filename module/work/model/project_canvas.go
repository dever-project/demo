package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type ProjectCanvas struct {
	ID          uint64    `dorm:"primaryKey;autoIncrement;comment:画布ID"`
	ProjectID   uint64    `dorm:"type:bigint;not null;default:0;comment:项目"`
	AssetCateID uint64    `dorm:"type:bigint;not null;default:0;comment:资产分类"`
	Nodes       string    `dorm:"type:text;not null;default:'[]';comment:节点"`
	Edges       string    `dorm:"type:text;not null;default:'[]';comment:连线"`
	Viewport    string    `dorm:"type:text;not null;default:'{}';comment:视图"`
	CreatedAt   time.Time `dorm:"comment:创建时间"`
	UpdatedAt   time.Time `dorm:"comment:更新时间"`
}

type ProjectCanvasIndex struct {
	ProjectCate struct{} `unique:"project_id,asset_cate_id"`
}

var projectCanvasProjectRelation = orm.Relation{
	Field:      "project_id",
	Option:     "work.NewProjectModel",
	OptionKeys: []string{"name", "status"},
}

func NewProjectCanvasModel() *orm.Model[ProjectCanvas] {
	return orm.LoadModel[ProjectCanvas]("工作台画布", "work_project_canvas", orm.ModelConfig{
		Index:    ProjectCanvasIndex{},
		Order:    "id desc",
		Database: "default",
		Relations: []orm.Relation{
			projectCanvasProjectRelation,
		},
	})
}
