package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
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

func (s *ProjectService) WriteFile(path string, data string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.WriteFile(path, []byte(data), 0644); err != nil {
		return err
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
	json.Unmarshal([]byte(data), &parsed)
	var createdAt time.Time
	if parsed.Meta.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339, parsed.Meta.CreatedAt)
	}
	s.addRecentProject(path, parsed.Meta.Name, parsed.Canvas.PageType, parsed.Canvas.DesignSpecId, parsed.Canvas.ColorScheme, createdAt)

	return nil
}

func (s *ProjectService) ReadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
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
	json.Unmarshal(data, &parsed)
	var createdAt time.Time
	if parsed.Meta.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339, parsed.Meta.CreatedAt)
	}
	s.addRecentProject(path, parsed.Meta.Name, parsed.Canvas.PageType, parsed.Canvas.DesignSpecId, parsed.Canvas.ColorScheme, createdAt)

	return string(data), nil
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

func (s *ProjectService) CreateProject(name string, data string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	projectsDir := filepath.Join(s.appDir, "projects")
	if err := os.MkdirAll(projectsDir, 0755); err != nil {
		return "", err
	}

	safeName := name
	if safeName == "" {
		safeName = "未命名项目"
	}
	filename := safeName + ".mind"
	path := filepath.Join(projectsDir, filename)

	if err := os.WriteFile(path, []byte(data), 0644); err != nil {
		return "", err
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
	json.Unmarshal([]byte(data), &parsed)

	parsedName := parsed.Meta.Name
	if parsedName == "" {
		parsedName = "未命名项目"
	}
	var createdAt time.Time
	if parsed.Meta.CreatedAt != "" {
		createdAt, _ = time.Parse(time.RFC3339, parsed.Meta.CreatedAt)
	}

	s.currentPath = path
	s.addRecentProject(path, parsedName, parsed.Canvas.PageType, parsed.Canvas.DesignSpecId, parsed.Canvas.ColorScheme, createdAt)

	return path, nil
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
