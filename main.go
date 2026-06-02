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

	app := application.New(application.Options{
		Name:        "MindDesign",
		Description: "AI 对话式 UI 设计工具",
		Services: []application.Service{
			application.NewService(NewProjectService()),
			application.NewService(NewImageProxyService()),
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

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
