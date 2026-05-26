package module

import "embed"

// FrontFS 内嵌所有模块下的页面 JSON，便于直接打包进二进制。
//
//go:embed */front/page
var FrontFS embed.FS
