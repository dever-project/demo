项目自定义 middleware 是可选目录。

如需项目级中间件，在本目录增加 Go 文件并提供 Register() 函数。
dever 生成 data/router.go 时会自动导入并调用。

普通使用 package/front 不需要在这里复制 front 鉴权或站点中间件。
框架默认 Recover/Log 已自动注册，项目 Register() 不需要再调用 coremiddleware.Init()。
