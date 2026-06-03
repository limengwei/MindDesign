package main

import (
	"embed"
	_ "embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {

	projectService := NewProjectService()
	mcpService := NewMCPService(projectService)

	app := application.New(application.Options{
		Name:        "MindDesign",
		Description: "AI 对话式 UI 设计工具",
		Services: []application.Service{
			application.NewService(projectService),
			application.NewService(NewImageProxyService()),
			application.NewService(mcpService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "MindDesign",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		Windows: application.WindowsWindow{
			BackdropType: application.Mica,
		},
		Frameless:        true,
		StartState:       application.WindowStateMaximised,
		BackgroundColour: application.NewRGB(15, 15, 35),
		URL:              "/",
		Width:            1280,
		Height:           800,
		MinWidth:         1280,
		MinHeight:        800,
	})

	// 自动启动 MCP 服务
	if err := mcpService.StartMCP(9527); err != nil {
		log.Printf("MCP 服务启动失败: %v", err)
	}

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
