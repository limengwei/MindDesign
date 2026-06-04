package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type RecentProject struct {
	Path         string    `json:"path"`
	Name         string    `json:"name"`
	PageType     string    `json:"pageType"`
	DesignSpecId string    `json:"designSpecId"`
	ColorScheme  string    `json:"colorScheme"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type ProjectService struct {
	currentPath string
	appDir      string
	mu          sync.Mutex
}

func NewProjectService() *ProjectService {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		dir, _ = os.UserHomeDir()
	}
	appDir := filepath.Join(dir, "MindDesign")
	os.MkdirAll(appDir, 0755)
	return &ProjectService{appDir: appDir}
}

func generateId() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func projectPath(projectsDir, id string) string {
	return filepath.Join(projectsDir, id+".project.json")
}

func sessionsPath(projectsDir, id string) string {
	return filepath.Join(projectsDir, id+".sessions.json")
}

func cardsPath(projectsDir, id string) string {
	return filepath.Join(projectsDir, id+".cards.json")
}

func (s *ProjectService) CreateProject(name string, projectJson string, sessionsJson string, cardsJson string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	projectsDir := filepath.Join(s.appDir, "projects")
	if err := os.MkdirAll(projectsDir, 0755); err != nil {
		return "", err
	}

	id := generateId()
	projPath := projectPath(projectsDir, id)

	if err := os.WriteFile(projPath, []byte(projectJson), 0644); err != nil {
		return "", err
	}
	if sessionsJson != "" {
		if err := os.WriteFile(sessionsPath(projectsDir, id), []byte(sessionsJson), 0644); err != nil {
			return "", err
		}
	}
	if cardsJson != "" {
		if err := os.WriteFile(cardsPath(projectsDir, id), []byte(cardsJson), 0644); err != nil {
			return "", err
		}
	}

	var parsed struct {
		Meta struct {
			Name      string `json:"name"`
			CreatedAt string `json:"createdAt"`
		} `json:"meta"`
		Canvas struct {
			PageType     string `json:"pageType"`
			DesignSpecId string `json:"designSpecId"`
			ColorScheme  string `json:"colorScheme"`
		} `json:"canvas"`
	}
	json.Unmarshal([]byte(projectJson), &parsed)

	parsedName := parsed.Meta.Name
	if parsedName == "" {
		parsedName = "未命名项目"
	}
	var createdAt time.Time
	if parsed.Meta.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339, parsed.Meta.CreatedAt)
	}

	s.currentPath = projPath
	s.addRecentProject(projPath, parsedName, parsed.Canvas.PageType, parsed.Canvas.DesignSpecId, parsed.Canvas.ColorScheme, createdAt)

	return projPath, nil
}

func (s *ProjectService) WriteProjectFiles(path string, projectJson string, sessionsJson string, cardsJson string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Dir(path)
	base := strings.TrimSuffix(filepath.Base(path), ".project.json")

	if err := os.WriteFile(path, []byte(projectJson), 0644); err != nil {
		return err
	}
	if sessionsJson != "" {
		if err := os.WriteFile(filepath.Join(dir, base+".sessions.json"), []byte(sessionsJson), 0644); err != nil {
			return err
		}
	}
	if cardsJson != "" {
		if err := os.WriteFile(filepath.Join(dir, base+".cards.json"), []byte(cardsJson), 0644); err != nil {
			return err
		}
	}

	s.currentPath = path

	var parsed struct {
		Meta struct {
			Name      string `json:"name"`
			CreatedAt string `json:"createdAt"`
		} `json:"meta"`
		Canvas struct {
			PageType     string `json:"pageType"`
			DesignSpecId string `json:"designSpecId"`
			ColorScheme  string `json:"colorScheme"`
		} `json:"canvas"`
	}
	json.Unmarshal([]byte(projectJson), &parsed)
	var createdAt time.Time
	if parsed.Meta.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339, parsed.Meta.CreatedAt)
	}
	s.addRecentProject(path, parsed.Meta.Name, parsed.Canvas.PageType, parsed.Canvas.DesignSpecId, parsed.Canvas.ColorScheme, createdAt)

	return nil
}

func (s *ProjectService) SaveCardScreenshots(path string, screenshotsJson string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	screenshotsDir := s.screenshotsDir(path)
	if err := os.MkdirAll(screenshotsDir, 0755); err != nil {
		return err
	}

	var screenshots map[string]string
	if err := json.Unmarshal([]byte(screenshotsJson), &screenshots); err != nil {
		return err
	}

	for cardId, dataUrl := range screenshots {
		if dataUrl == "" {
			continue
		}
		pngData, err := dataUrlToPng(dataUrl)
		if err != nil {
			continue
		}
		pngPath := filepath.Join(screenshotsDir, cardId+".png")
		if err := os.WriteFile(pngPath, pngData, 0644); err != nil {
			return err
		}
	}

	return nil
}

func (s *ProjectService) LoadCardScreenshots(path string, cardIdsJson string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	screenshotsDir := s.screenshotsDir(path)

	var cardIds []string
	if err := json.Unmarshal([]byte(cardIdsJson), &cardIds); err != nil {
		return "{}", err
	}

	result := make(map[string]string)
	for _, cardId := range cardIds {
		pngPath := filepath.Join(screenshotsDir, cardId+".png")
		data, err := os.ReadFile(pngPath)
		if err != nil {
			continue
		}
		result[cardId] = "data:image/png;base64," + base64.StdEncoding.EncodeToString(data)
	}

	jsonBytes, _ := json.Marshal(result)
	return string(jsonBytes), nil
}

func (s *ProjectService) CleanupCardScreenshots(path string, cardIdsJson string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	screenshotsDir := s.screenshotsDir(path)

	var keepIds []string
	if err := json.Unmarshal([]byte(cardIdsJson), &keepIds); err != nil {
		return err
	}

	keepSet := make(map[string]bool)
	for _, id := range keepIds {
		keepSet[id+".png"] = true
	}

	entries, err := os.ReadDir(screenshotsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".png") {
			continue
		}
		if !keepSet[entry.Name()] {
			os.Remove(filepath.Join(screenshotsDir, entry.Name()))
		}
	}

	return nil
}

func (s *ProjectService) screenshotsDir(path string) string {
	base := strings.TrimSuffix(filepath.Base(path), ".project.json")
	return filepath.Join(s.appDir, "screenshots", base)
}

func dataUrlToPng(dataUrl string) ([]byte, error) {
	prefix := "data:image/png;base64,"
	if !strings.HasPrefix(dataUrl, prefix) {
		prefix = "data:image/"
		idx := strings.Index(dataUrl, ";base64,")
		if idx == -1 {
			return nil, fmt.Errorf("invalid data URL")
		}
		prefix = dataUrl[:idx+len(";base64,")]
	}
	b64 := strings.TrimPrefix(dataUrl, prefix)
	return base64.StdEncoding.DecodeString(b64)
}

func (s *ProjectService) ReadProject(path string) (string, error) {
	dir := filepath.Dir(path)
	base := strings.TrimSuffix(filepath.Base(path), ".project.json")

	projectData, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}

	sessionsData, _ := os.ReadFile(filepath.Join(dir, base+".sessions.json"))
	cardsData, _ := os.ReadFile(filepath.Join(dir, base+".cards.json"))

	result := map[string]json.RawMessage{
		"project":  projectData,
		"sessions": sessionsData,
		"cards":    cardsData,
	}
	combined, _ := json.Marshal(result)

	s.currentPath = path

	var parsed struct {
		Meta struct {
			Name      string `json:"name"`
			CreatedAt string `json:"createdAt"`
		} `json:"meta"`
		Canvas struct {
			PageType     string `json:"pageType"`
			DesignSpecId string `json:"designSpecId"`
			ColorScheme  string `json:"colorScheme"`
		} `json:"canvas"`
	}
	json.Unmarshal(projectData, &parsed)
	var createdAt time.Time
	if parsed.Meta.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339, parsed.Meta.CreatedAt)
	}
	s.addRecentProject(path, parsed.Meta.Name, parsed.Canvas.PageType, parsed.Canvas.DesignSpecId, parsed.Canvas.ColorScheme, createdAt)

	return string(combined), nil
}

func (s *ProjectService) GetCurrentPath() string {
	return s.currentPath
}

func (s *ProjectService) SetCurrentPath(path string) {
	s.currentPath = path
}

func (s *ProjectService) ClearCurrentPath() {
	s.currentPath = ""
}

func (s *ProjectService) AutoSave(data string) error {
	autoPath := filepath.Join(s.appDir, "autosave.mind")
	return os.WriteFile(autoPath, []byte(data), 0644)
}

func (s *ProjectService) GetAutoSave() (string, error) {
	autoPath := filepath.Join(s.appDir, "autosave.mind")
	data, err := os.ReadFile(autoPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(data), nil
}

func (s *ProjectService) ClearAutoSave() error {
	autoPath := filepath.Join(s.appDir, "autosave.mind")
	err := os.Remove(autoPath)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (s *ProjectService) UpdateProjectMeta(path string, name string, pageType string, designSpecId string, colorScheme string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var project map[string]interface{}
	if err := json.Unmarshal(data, &project); err != nil {
		return err
	}

	if meta, ok := project["meta"].(map[string]interface{}); ok {
		meta["name"] = name
		meta["updatedAt"] = time.Now().Format(time.RFC3339)
	}
	if canvas, ok := project["canvas"].(map[string]interface{}); ok {
		canvas["pageType"] = pageType
		canvas["designSpecId"] = designSpecId
		canvas["colorScheme"] = colorScheme
	}

	updated, err := json.MarshalIndent(project, "", "  ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(path, updated, 0644); err != nil {
		return err
	}

	var parsed struct {
		Meta struct {
			Name      string `json:"name"`
			CreatedAt string `json:"createdAt"`
		} `json:"meta"`
	}
	json.Unmarshal(data, &parsed)
	var createdAt time.Time
	if parsed.Meta.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339, parsed.Meta.CreatedAt)
	}
	s.addRecentProject(path, name, pageType, designSpecId, colorScheme, createdAt)

	return nil
}

func (s *ProjectService) GetRecentProjects() (string, error) {
	recentPath := filepath.Join(s.appDir, "recent.json")
	data, err := os.ReadFile(recentPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "[]", nil
		}
		return "", err
	}

	var projects []RecentProject
	if err := json.Unmarshal(data, &projects); err != nil {
		return "[]", nil
	}

	var valid []RecentProject
	for _, p := range projects {
		if _, err := os.Stat(p.Path); err == nil {
			valid = append(valid, p)
		}
	}

	sort.Slice(valid, func(i, j int) bool {
		return valid[i].CreatedAt.After(valid[j].CreatedAt)
	})

	result, _ := json.Marshal(valid)
	return string(result), nil
}

func (s *ProjectService) addRecentProject(path, name, pageType, designSpecId, colorScheme string, createdAt time.Time) {
	recentPath := filepath.Join(s.appDir, "recent.json")

	data, _ := os.ReadFile(recentPath)
	var projects []RecentProject
	json.Unmarshal(data, &projects)

	var existingCreatedAt time.Time
	var existingPageType, existingDesignSpecId, existingColorScheme string
	for i, p := range projects {
		if p.Path == path {
			existingCreatedAt = p.CreatedAt
			existingPageType = p.PageType
			existingDesignSpecId = p.DesignSpecId
			existingColorScheme = p.ColorScheme
			projects = append(projects[:i], projects[i+1:]...)
			break
		}
	}

	if name == "" {
		name = filepath.Base(path)
	}
	if createdAt.IsZero() && !existingCreatedAt.IsZero() {
		createdAt = existingCreatedAt
	}
	if createdAt.IsZero() {
		createdAt = time.Now()
	}
	if pageType == "" {
		pageType = existingPageType
	}
	if designSpecId == "" {
		designSpecId = existingDesignSpecId
	}
	if colorScheme == "" {
		colorScheme = existingColorScheme
	}

	projects = append([]RecentProject{{Path: path, Name: name, PageType: pageType, DesignSpecId: designSpecId, ColorScheme: colorScheme, CreatedAt: createdAt, UpdatedAt: time.Now()}}, projects...)

	if len(projects) > 10 {
		projects = projects[:10]
	}

	result, _ := json.MarshalIndent(projects, "", "  ")
	os.WriteFile(recentPath, result, 0644)
}

func (s *ProjectService) SaveExportFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

func (s *ProjectService) SaveExportFileBinary(path string, base64Content string) error {
	data, err := base64.StdEncoding.DecodeString(base64Content)
	if err != nil {
		return fmt.Errorf("invalid base64: %w", err)
	}
	return os.WriteFile(path, data, 0644)
}

func (s *ProjectService) DeleteProject(path string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Dir(path)
	base := strings.TrimSuffix(filepath.Base(path), ".project.json")

	// 删除项目文件
	for _, ext := range []string{".project.json", ".sessions.json", ".cards.json"} {
		os.Remove(filepath.Join(dir, base+ext))
	}

	// 删除截图目录
	screenshotsDir := s.screenshotsDir(path)
	os.RemoveAll(screenshotsDir)

	// 从最近列表移除
	recentPath := filepath.Join(s.appDir, "recent.json")
	data, _ := os.ReadFile(recentPath)
	var projects []RecentProject
	json.Unmarshal(data, &projects)
	filtered := projects[:0]
	for _, p := range projects {
		if p.Path != path {
			filtered = append(filtered, p)
		}
	}
	result, _ := json.MarshalIndent(filtered, "", "  ")
	os.WriteFile(recentPath, result, 0644)

	return nil
}
