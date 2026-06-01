package main

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ImageProxyService struct {
	client *http.Client
}

func NewImageProxyService() *ImageProxyService {
	return &ImageProxyService{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *ImageProxyService) FetchImage(imageUrl string) (string, error) {
	allowedHosts := []string{
		"placehold.co",
		"picsum.photos",
		"via.placeholder.com",
		"dummyimage.com",
	}

	u, err := url.Parse(imageUrl)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	host := u.Hostname()

	allowed := false
	for _, allowedHost := range allowedHosts {
		if host == allowedHost || strings.HasSuffix(host, "."+allowedHost) {
			allowed = true
			break
		}
	}
	if !allowed {
		return "", fmt.Errorf("host not allowed: %s", imageUrl)
	}

	req, err := http.NewRequest("GET", imageUrl, nil)
	if err != nil {
		return "", fmt.Errorf("create request failed: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d for %s", resp.StatusCode, imageUrl)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/png"
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return "", fmt.Errorf("read failed: %w", err)
	}

	b64 := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", contentType, b64), nil
}
