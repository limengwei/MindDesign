package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	GitHubOwner    = "your-github-owner" // 替换为实际的 GitHub 用户名/组织名
	GitHubRepo     = "MindDesign"        // 替换为实际的仓库名
	AppVersion     = "0.1.0"             // 与 build/config.yml 的 version 保持一致
	updateCheckURL = "https://api.github.com/repos/" + GitHubOwner + "/" + GitHubRepo + "/releases/latest"
)

type ReleaseInfo struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	PublishedAt string `json:"published_at"`
	Assets      []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
		Size               int64  `json:"size"`
	} `json:"assets"`
}

type UpdateResult struct {
	HasUpdate      bool   `json:"hasUpdate"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseNotes   string `json:"releaseNotes"`
	DownloadURL    string `json:"downloadURL"`
	FileSize       int64  `json:"fileSize"`
	CurrentVersion string `json:"currentVersion"`
}

type UpdateService struct {
	app *application.App
}

func NewUpdateService() *UpdateService {
	return &UpdateService{}
}

func (s *UpdateService) SetApp(app *application.App) {
	s.app = app
}

func (s *UpdateService) CheckUpdate() (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", updateCheckURL, nil)
	if err != nil {
		return "", fmt.Errorf("create request failed: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", GitHubRepo+"-updater/"+AppVersion)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("github api returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response failed: %w", err)
	}

	var release ReleaseInfo
	if err := json.Unmarshal(body, &release); err != nil {
		return "", fmt.Errorf("parse response failed: %w", err)
	}

	// 解析最新版本号（去掉 v 前缀）
	latestVersion := strings.TrimPrefix(release.TagName, "v")

	result := UpdateResult{
		CurrentVersion: AppVersion,
		LatestVersion:  latestVersion,
		ReleaseNotes:   release.Body,
		HasUpdate:      latestVersion != AppVersion,
	}

	if result.HasUpdate {
		// 查找匹配当前平台的安装包
		targetAsset := findPlatformAsset(release.Assets)
		if targetAsset != nil {
			result.DownloadURL = targetAsset.BrowserDownloadURL
			result.FileSize = targetAsset.Size
		} else {
			// 找不到匹配的安装包，视为无更新
			result.HasUpdate = false
		}
	}

	jsonBytes, _ := json.Marshal(result)
	return string(jsonBytes), nil
}

func (s *UpdateService) DownloadUpdate(downloadURL string, onProgress func(current int64, total int64)) (string, error) {
	client := &http.Client{Timeout: 30 * time.Minute}
	req, err := http.NewRequest("GET", downloadURL, nil)
	if err != nil {
		return "", fmt.Errorf("create download request failed: %w", err)
	}
	req.Header.Set("User-Agent", GitHubRepo+"-updater/"+AppVersion)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("download server returned status %d", resp.StatusCode)
	}

	// 保存到临时目录
	tmpDir := os.TempDir()
	ext := filepath.Ext(downloadURL)
	tmpPath := filepath.Join(tmpDir, GitHubRepo+"-update"+ext)

	f, err := os.Create(tmpPath)
	if err != nil {
		return "", fmt.Errorf("create temp file failed: %w", err)
	}
	defer f.Close()

	var written int64
	buf := make([]byte, 32*1024)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			wn, werr := f.Write(buf[:n])
			written += int64(wn)
			if werr != nil {
				return "", fmt.Errorf("write failed: %w", werr)
			}
			if onProgress != nil && resp.ContentLength > 0 {
				onProgress(written, resp.ContentLength)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("read failed: %w", err)
		}
	}

	return tmpPath, nil
}

func (s *UpdateService) InstallUpdate(installerPath string) error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable path failed: %w", err)
	}

	// 创建一个 updater 脚本，等主进程退出后执行安装
	scriptPath := filepath.Join(filepath.Dir(exePath), "update.bat")
	scriptContent := fmt.Sprintf(`@echo off
timeout /t 2 /nobreak >nul
start /wait "" "%s"
del "%s"
del "%%~f0"
`, installerPath, scriptPath)

	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0644); err != nil {
		return fmt.Errorf("write update script failed: %w", err)
	}

	// 启动更新脚本并退出应用
	cmdAttr := &os.ProcAttr{
		Files: []*os.File{os.Stdin, os.Stdout, os.Stderr},
	}
	_, err = os.StartProcess(scriptPath, []string{}, cmdAttr)
	if err != nil {
		return fmt.Errorf("start update script failed: %w", err)
	}

	s.app.Quit()
	return nil
}

func findPlatformAsset(assets []struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}) *struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
} {
	goos := strings.ToLower(runtime.GOOS)
	goarch := strings.ToLower(runtime.GOARCH)

	for i, asset := range assets {
		name := strings.ToLower(asset.Name)
		switch goos {
		case "windows":
			if strings.HasSuffix(name, ".exe") || strings.HasSuffix(name, ".msi") || strings.Contains(name, "windows") {
				if goarch == "amd64" && (strings.Contains(name, "x64") || strings.Contains(name, "amd64") || !strings.Contains(name, "arm")) {
					return &assets[i]
				}
				if goarch == "arm64" && strings.Contains(name, "arm64") {
					return &assets[i]
				}
				// 默认返回第一个 windows 安装包
				if strings.HasSuffix(name, ".msi") || strings.HasSuffix(name, ".exe") {
					return &assets[i]
				}
			}
		case "darwin":
			if strings.HasSuffix(name, ".dmg") || strings.Contains(name, "macos") || strings.Contains(name, "darwin") {
				if goarch == "amd64" && (strings.Contains(name, "intel") || strings.Contains(name, "x64") || !strings.Contains(name, "arm")) {
					return &assets[i]
				}
				if goarch == "arm64" && (strings.Contains(name, "apple") || strings.Contains(name, "arm") || strings.Contains(name, "silicon")) {
					return &assets[i]
				}
				if strings.HasSuffix(name, ".dmg") {
					return &assets[i]
				}
			}
		case "linux":
			if strings.HasSuffix(name, ".AppImage") || strings.HasSuffix(name, ".deb") || strings.HasSuffix(name, ".rpm") || strings.Contains(name, "linux") {
				return &assets[i]
			}
		}
	}

	// 兜底：返回第一个看起来像安装包的文件
	for i, asset := range assets {
		name := strings.ToLower(asset.Name)
		for _, ext := range []string{".exe", ".msi", ".dmg", ".appimage", ".deb", ".rpm"} {
			if strings.HasSuffix(name, ext) {
				return &assets[i]
			}
		}
	}

	return nil
}
