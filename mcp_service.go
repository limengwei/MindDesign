package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

type MCPService struct {
	mcpServer   *server.MCPServer
	httpServer  *server.StreamableHTTPServer
	httpRaw     *http.Server
	project     *ProjectService
	mu          sync.Mutex
	running     bool
	currentPort int
}

func NewMCPService(projectService *ProjectService) *MCPService {
	s := &MCPService{
		project: projectService,
	}

	s.mcpServer = server.NewMCPServer(
		"MindDesign",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithResourceCapabilities(true, false),
	)

	s.registerTools()
	s.registerResources()

	return s
}

// registerTools 注册 MCP 工具
func (s *MCPService) registerTools() {
	// 获取当前项目信息
	s.mcpServer.AddTool(mcp.NewTool("get_current_project",
		mcp.WithDescription("获取当前打开的设计项目信息，包括项目名称、页面类型、设计规格等"),
	), s.handleGetCurrentProject)

	// 获取项目设计数据
	s.mcpServer.AddTool(mcp.NewTool("get_project_data",
		mcp.WithDescription("获取当前项目的完整设计数据（JSON格式），包含画布、组件、样式等所有设计信息"),
	), s.handleGetProjectData)

	// 获取项目截图
	s.mcpServer.AddTool(mcp.NewTool("get_project_screenshots",
		mcp.WithDescription("获取当前项目的卡片截图列表，返回所有卡片的截图数据（base64编码的PNG图片）"),
	), s.handleGetProjectScreenshots)

	// 列出设计稿（卡片）列表
	s.mcpServer.AddTool(mcp.NewTool("list_designs",
		mcp.WithDescription("列出当前项目中的所有设计稿（卡片），返回每个设计稿的 id、标签、尺寸等信息"),
	), s.handleListDesigns)

	// 读取设计稿 HTML 内容
	s.mcpServer.AddTool(mcp.NewTool("get_design_html",
		mcp.WithDescription("读取指定设计稿的 HTML 内容，可直接用于前端开发"),
		mcp.WithString("card_id",
			mcp.Required(),
			mcp.Description("设计稿（卡片）ID，可通过 list_designs 获取"),
		),
	), s.handleGetDesignHtml)

	// 获取设计规范列表
	s.mcpServer.AddTool(mcp.NewTool("list_design_specs",
		mcp.WithDescription("获取可用的设计规范列表，如 Stripe、Linear、Apple 等风格"),
	), s.handleListDesignSpecs)

	// 搜索图标
	s.mcpServer.AddTool(mcp.NewTool("search_icons",
		mcp.WithDescription("搜索 Material Symbols 图标，返回匹配的图标名称列表"),
		mcp.WithString("query",
			mcp.Required(),
			mcp.Description("搜索关键词，如图标名称或功能描述"),
		),
		mcp.WithNumber("limit",
			mcp.Description("返回结果数量上限"),
			mcp.DefaultNumber(20),
		),
	), s.handleSearchIcons)

	// 获取图标 SVG
	s.mcpServer.AddTool(mcp.NewTool("get_icon_svg",
		mcp.WithDescription("获取指定图标的 SVG 内容"),
		mcp.WithString("name",
			mcp.Required(),
			mcp.Description("图标名称（snake_case），如 arrow_back、shopping_cart"),
		),
	), s.handleGetIconSvg)

	// 获取最近项目列表
	s.mcpServer.AddTool(mcp.NewTool("list_recent_projects",
		mcp.WithDescription("获取最近打开的设计项目列表"),
	), s.handleListRecentProjects)

	// 读取指定项目
	s.mcpServer.AddTool(mcp.NewTool("read_project",
		mcp.WithDescription("读取指定路径的设计项目文件"),
		mcp.WithString("path",
			mcp.Required(),
			mcp.Description("项目文件路径（.project.json）"),
		),
	), s.handleReadProject)

	// 导出设计稿
	s.mcpServer.AddTool(mcp.NewTool("export_design",
		mcp.WithDescription("将设计数据导出为文件保存到指定路径"),
		mcp.WithString("path",
			mcp.Required(),
			mcp.Description("导出文件保存路径"),
		),
		mcp.WithString("content",
			mcp.Required(),
			mcp.Description("要导出的内容（JSON字符串）"),
		),
	), s.handleExportDesign)
}

// registerResources 注册 MCP 资源
func (s *MCPService) registerResources() {
	s.mcpServer.AddResource(
		mcp.NewResource("minddesign://current-project", "当前设计项目"),
		s.handleReadCurrentProjectResource,
	)
}

// ========== Wails 暴露给前端的方法 ==========

// StartMCP 启动 MCP 服务（Wails 绑定方法）
func (s *MCPService) StartMCP(port int) error {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return fmt.Errorf("MCP 服务已在端口 %d 运行", s.currentPort)
	}
	s.mu.Unlock()

	s.httpServer = server.NewStreamableHTTPServer(
		s.mcpServer,
		server.WithEndpointPath("/mcp"),
		server.WithStateLess(true),
		server.WithStreamableHTTPCORS(
			server.WithCORSAllowedOrigins("*"),
		),
	)

	addr := ":" + strconv.Itoa(port)
	// 先检测端口是否可用
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("端口 %d 被占用: %w", port, err)
	}

	mux := http.NewServeMux()
	mux.Handle("/mcp", s.httpServer)
	s.httpRaw = &http.Server{Addr: addr, Handler: mux}

	s.mu.Lock()
	s.running = true
	s.currentPort = port
	s.mu.Unlock()

	go func() {
		if err := s.httpRaw.Serve(ln); err != nil && err != http.ErrServerClosed {
			s.mu.Lock()
			s.running = false
			s.mu.Unlock()
		}
	}()

	return nil
}

// StopMCP 停止 MCP 服务（Wails 绑定方法）
func (s *MCPService) StopMCP() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running || s.httpRaw == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	s.running = false
	s.currentPort = 0
	return s.httpRaw.Shutdown(ctx)
}

// IsMCPRunning 查询 MCP 服务状态（Wails 绑定方法）
func (s *MCPService) IsMCPRunning() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running
}

// GetMCPPort 获取 MCP 服务端口（Wails 绑定方法）
func (s *MCPService) GetMCPPort() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.currentPort
}

// ========== MCP Tool Handlers ==========

func (s *MCPService) handleGetCurrentProject(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	path := s.project.GetCurrentPath()
	if path == "" {
		return mcp.NewToolResultText("当前没有打开的项目"), nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("读取项目失败: %v", err)), nil
	}

	var project map[string]interface{}
	if err := json.Unmarshal(data, &project); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("解析项目失败: %v", err)), nil
	}

	info := map[string]interface{}{
		"path":    path,
		"project": project,
	}

	result, _ := json.MarshalIndent(info, "", "  ")
	return mcp.NewToolResultText(string(result)), nil
}

func (s *MCPService) handleGetProjectData(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	path := s.project.GetCurrentPath()
	if path == "" {
		return mcp.NewToolResultError("当前没有打开的项目"), nil
	}

	combined, err := s.project.ReadProject(path)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("读取项目数据失败: %v", err)), nil
	}

	return mcp.NewToolResultText(combined), nil
}

func (s *MCPService) handleGetProjectScreenshots(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	path := s.project.GetCurrentPath()
	if path == "" {
		return mcp.NewToolResultError("当前没有打开的项目"), nil
	}

	base := strings.TrimSuffix(filepath.Base(path), ".project.json")
	screenshotsDir := filepath.Join(s.project.appDir, "screenshots", base)

	entries, err := os.ReadDir(screenshotsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return mcp.NewToolResultText("[]"), nil
		}
		return mcp.NewToolResultError(fmt.Sprintf("读取截图目录失败: %v", err)), nil
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".png") {
			files = append(files, filepath.Join(screenshotsDir, entry.Name()))
		}
	}

	result, _ := json.Marshal(files)
	return mcp.NewToolResultText(string(result)), nil
}

func (s *MCPService) handleListDesigns(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	path := s.project.GetCurrentPath()
	if path == "" {
		return mcp.NewToolResultError("当前没有打开的项目"), nil
	}

	dir := filepath.Dir(path)
	base := strings.TrimSuffix(filepath.Base(path), ".project.json")
	cardsFile := filepath.Join(dir, base+".cards.json")

	data, err := os.ReadFile(cardsFile)
	if err != nil {
		if os.IsNotExist(err) {
			return mcp.NewToolResultText("[]"), nil
		}
		return mcp.NewToolResultError(fmt.Sprintf("读取设计稿列表失败: %v", err)), nil
	}

	var cardsData struct {
		Cards []json.RawMessage `json:"cards"`
	}
	if err := json.Unmarshal(data, &cardsData); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("解析设计稿列表失败: %v", err)), nil
	}

	type DesignInfo struct {
		ID     string `json:"id"`
		Label  string `json:"label"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	}

	var designs []DesignInfo
	for _, raw := range cardsData.Cards {
		var info DesignInfo
		json.Unmarshal(raw, &info)
		designs = append(designs, info)
	}

	result, _ := json.MarshalIndent(designs, "", "  ")
	return mcp.NewToolResultText(string(result)), nil
}

func (s *MCPService) handleGetDesignHtml(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	cardID := request.GetString("card_id", "")
	if cardID == "" {
		return mcp.NewToolResultError("必须提供 card_id"), nil
	}

	path := s.project.GetCurrentPath()
	if path == "" {
		return mcp.NewToolResultError("当前没有打开的项目"), nil
	}

	dir := filepath.Dir(path)
	base := strings.TrimSuffix(filepath.Base(path), ".project.json")
	cardsFile := filepath.Join(dir, base+".cards.json")

	data, err := os.ReadFile(cardsFile)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("读取设计稿失败: %v", err)), nil
	}

	var cardsData struct {
		Cards []struct {
			ID    string `json:"id"`
			Label string `json:"label"`
			HTML  string `json:"html"`
		} `json:"cards"`
	}
	if err := json.Unmarshal(data, &cardsData); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("解析设计稿失败: %v", err)), nil
	}

	for _, card := range cardsData.Cards {
		if card.ID == cardID {
			return mcp.NewToolResultText(card.HTML), nil
		}
	}

	return mcp.NewToolResultError(fmt.Sprintf("未找到设计稿: %s", cardID)), nil
}

func (s *MCPService) handleListRecentProjects(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	recent, err := s.project.GetRecentProjects()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("获取最近项目失败: %v", err)), nil
	}
	return mcp.NewToolResultText(recent), nil
}

func (s *MCPService) handleReadProject(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	path := request.GetString("path", "")
	if path == "" {
		return mcp.NewToolResultError("必须提供项目路径"), nil
	}

	if _, err := os.Stat(path); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("项目文件不存在: %s", path)), nil
	}

	combined, err := s.project.ReadProject(path)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("读取项目失败: %v", err)), nil
	}

	return mcp.NewToolResultText(combined), nil
}

func (s *MCPService) handleExportDesign(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	path := request.GetString("path", "")
	content := request.GetString("content", "")

	if path == "" || content == "" {
		return mcp.NewToolResultError("必须提供路径和内容"), nil
	}

	if err := s.project.SaveExportFile(path, content); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("导出失败: %v", err)), nil
	}

	return mcp.NewToolResultText(fmt.Sprintf("已导出到: %s", path)), nil
}

// ========== MCP Resource Handlers ==========

func (s *MCPService) handleReadCurrentProjectResource(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	path := s.project.GetCurrentPath()
	if path == "" {
		return []mcp.ResourceContents{
			mcp.TextResourceContents{
				URI:      "minddesign://current-project",
				MIMEType: "application/json",
				Text:     `{"error": "no project open"}`,
			},
		}, nil
	}

	combined, err := s.project.ReadProject(path)
	if err != nil {
		return nil, err
	}

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      "minddesign://current-project",
			MIMEType: "application/json",
			Text:     combined,
		},
	}, nil
}

// ========== 设计规范 ==========

type designSpec struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

var builtinDesignSpecs = []designSpec{
	{ID: "stripe", Name: "Stripe", Category: "Fintech", Description: "支付基础设施品牌，深海军蓝底色，标志性靛蓝渐变网格"},
	{ID: "linear", Name: "Linear", Category: "Productivity", Description: "极简暗黑项目管理工具，近乎纯黑画布，薰衣草蓝单色点缀"},
	{ID: "apple", Name: "Apple", Category: "Consumer Tech", Description: "摄影优先的产品展示，纯白与近黑交替，SF Pro 字体"},
	{ID: "vercel", Name: "Vercel", Category: "Developer Tools", Description: "黑白精准配对，Geist 字体，多彩网格渐变"},
	{ID: "notion", Name: "Notion", Category: "Productivity", Description: "温暖极简主义，衬线标题，柔和表面"},
	{ID: "airbnb", Name: "Airbnb", Category: "E-commerce", Description: "温暖珊瑚色调，摄影驱动，圆角友好"},
	{ID: "spotify", Name: "Spotify", Category: "Media", Description: "深色背景亮绿点缀，大胆排版，专辑封面驱动"},
	{ID: "nike", Name: "Nike", Category: "E-commerce", Description: "单色 UI，巨大大写 Futura 字体，全出血摄影"},
	{ID: "figma", Name: "Figma", Category: "Design Tools", Description: "多彩活力的协作设计工具，鲜艳配色"},
	{ID: "supabase", Name: "Supabase", Category: "Backend", Description: "暗黑翡翠主题，代码优先的开源后端"},
	{ID: "cursor", Name: "Cursor", Category: "Developer Tools", Description: "AI 代码编辑器，深色界面，渐变点缀"},
	{ID: "framer", Name: "Framer", Category: "Design Tools", Description: "大胆黑白蓝，动效优先，设计导向"},
	{ID: "tesla", Name: "Tesla", Category: "Automotive", Description: "极简科技感，大量留白，深色高级感"},
}

func (s *MCPService) handleListDesignSpecs(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	result, _ := json.MarshalIndent(builtinDesignSpecs, "", "  ")
	return mcp.NewToolResultText(string(result)), nil
}

// ========== 图标 ==========

type iconEntry struct {
	Name     string   `json:"name"`
	Display  string   `json:"display"`
	File     string   `json:"file"`
	Keywords []string `json:"keywords"`
}

func (s *MCPService) loadIconIndex() ([]iconEntry, error) {
	// 图标在前端 public/icons 目录下
	// 运行时从 embed 的 assets 或开发目录读取
	iconIndexPath := "frontend/public/icons/icon-index.json"
	data, err := os.ReadFile(iconIndexPath)
	if err != nil {
		return nil, err
	}
	var icons []iconEntry
	if err := json.Unmarshal(data, &icons); err != nil {
		return nil, err
	}
	return icons, nil
}

func (s *MCPService) handleSearchIcons(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	query := strings.ToLower(request.GetString("query", ""))
	if query == "" {
		return mcp.NewToolResultError("必须提供搜索关键词"), nil
	}

	limit := request.GetInt("limit", 20)

	icons, err := s.loadIconIndex()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("加载图标索引失败: %v", err)), nil
	}

	type iconResult struct {
		Name string `json:"name"`
	}

	var results []iconResult
	for _, icon := range icons {
		if len(results) >= limit {
			break
		}
		// 匹配名称或关键词
		if strings.Contains(icon.Name, query) {
			results = append(results, iconResult{Name: icon.Name})
			continue
		}
		for _, kw := range icon.Keywords {
			if strings.Contains(strings.ToLower(kw), query) {
				results = append(results, iconResult{Name: icon.Name})
				break
			}
		}
	}

	if results == nil {
		results = []iconResult{}
	}
	result, _ := json.MarshalIndent(results, "", "  ")
	return mcp.NewToolResultText(string(result)), nil
}

func (s *MCPService) handleGetIconSvg(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	name := request.GetString("name", "")
	if name == "" {
		return mcp.NewToolResultError("必须提供图标名称"), nil
	}

	svgPath := fmt.Sprintf("frontend/public/icons/%s.svg", name)
	data, err := os.ReadFile(svgPath)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("未找到图标: %s", name)), nil
	}

	return mcp.NewToolResultText(string(data)), nil
}
