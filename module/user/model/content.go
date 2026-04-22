package model

import (
	"github.com/shemic/dever/orm"

	frontmeta "github.com/dever-package/front/service/meta"
)

type Content struct {
	ID      uint64 `dorm:"primaryKey;autoIncrement;comment:内容ID"`
	UserID  uint64 `dorm:"type:bigint;not null;default:0;comment:用户ID"`
	Title   string `dorm:"type:varchar(128);not null;comment:标题"`
	Content string `dorm:"type:text;not null;comment:内容"`
}

type ContentIndex struct {
	UserID struct{} `index:"user_id,id"`
}

var contentUserRelation = frontmeta.Relation{
	Field:            "user_id",
	Option:           "user.NewUserModel",
	OptionKeys:       []string{},
	OptionLabelField: "username",
}

func init() {
	frontmeta.RegisterModelMeta("user.NewContentModel", frontmeta.ModelMeta{
		Relations: []frontmeta.Relation{contentUserRelation},
	})
}

func NewContentModel() *orm.Model[Content] {
	return orm.LoadModel[Content]("user_content", Content{}, ContentIndex{}, "id desc", "default")
}
