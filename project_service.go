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
	Path      string    `json:"path"`
	Name      string    `json:"name"`
	UpdatedAt time.Time `json:"updatedAt"`
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
			Name string `json:"name"`
		} `json:"meta"`
	}
	json.Unmarshal([]byte(data), &parsed)
	s.addRecentProject(path, parsed.Meta.Name)

	return nil
}

func (s *ProjectService) ReadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	s.currentPath = path

	var parsed struct {
		Meta struct {
			Name string `json:"name"`
		} `json:"meta"`
	}
	json.Unmarshal(data, &parsed)
	s.addRecentProject(path, parsed.Meta.Name)

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

	s.currentPath = path
	s.addRecentProject(path, name)

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

	result, _ := json.Marshal(valid)
	return string(result), nil
}

func (s *ProjectService) addRecentProject(path, name string) {
	recentPath := filepath.Join(s.appDir, "recent.json")

	data, _ := os.ReadFile(recentPath)
	var projects []RecentProject
	json.Unmarshal(data, &projects)

	for i, p := range projects {
		if p.Path == path {
			projects = append(projects[:i], projects[i+1:]...)
			break
		}
	}

	if name == "" {
		name = filepath.Base(path)
	}

	projects = append([]RecentProject{{Path: path, Name: name, UpdatedAt: time.Now()}}, projects...)

	if len(projects) > 10 {
		projects = projects[:10]
	}

	sort.Slice(projects, func(i, j int) bool {
		return projects[i].UpdatedAt.After(projects[j].UpdatedAt)
	})

	result, _ := json.MarshalIndent(projects, "", "  ")
	os.WriteFile(recentPath, result, 0644)
}
