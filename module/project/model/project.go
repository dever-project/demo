package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type Project struct {
	ID        uint64    `dorm:"primaryKey;autoIncrement;comment:项目ID"`
	UserID    uint64    `dorm:"type:bigint;not null;default:0;comment:用户"`
	BodyID    uint64    `dorm:"type:bigint;not null;default:0;comment:身体"`
	TeamID    uint64    `dorm:"type:bigint;not null;default:0;comment:团队"`
	ReleaseID uint64    `dorm:"type:bigint;not null;default:0;comment:发布版本"`
	Name      string    `dorm:"type:varchar(128);not null;comment:项目名称"`
	Status    int16     `dorm:"type:smallint;not null;default:1;comment:状态"`
	CreatedAt time.Time `dorm:"comment:创建时间"`
}

type ProjectIndex struct {
	UserStatus struct{} `index:"user_id,status,created_at"`
	Body       struct{} `index:"body_id"`
	Team       struct{} `index:"team_id,release_id"`
}

var projectUserRelation = orm.Relation{
	Field:      "user_id",
	Option:     "project.NewUserModel",
	OptionKeys: []string{"name", "account"},
}

var projectTeamRelation = orm.Relation{
	Field:      "team_id",
	Option:     "bot.team.NewTeamModel",
	OptionKeys: []string{"name", "key"},
}

var projectBodyRelation = orm.Relation{
	Field:      "body_id",
	Option:     "bot.body.NewBodyModel",
	OptionKeys: []string{"name", "type"},
}

var projectReleaseRelation = orm.Relation{
	Field:      "release_id",
	Option:     "bot.team.NewTeamReleaseModel",
	OptionKeys: []string{"version", "status"},
}

func NewProjectModel() *orm.Model[Project] {
	return orm.LoadModel[Project]("项目", "project_project", orm.ModelConfig{
		Index:    ProjectIndex{},
		Order:    "id desc",
		Database: "default",
		Options: map[string]any{
			"status": statusOptions,
		},
		Relations: []orm.Relation{
			projectUserRelation,
			projectBodyRelation,
			projectTeamRelation,
			projectReleaseRelation,
		},
	})
}
