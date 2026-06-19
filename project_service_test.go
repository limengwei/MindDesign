package main

import (
	"encoding/json"
	"strings"
	"testing"
)

// TestMigrateProjectV2_NilOrEmpty 测试空输入不抛错。
func TestMigrateProjectV2_NilOrEmpty(t *testing.T) {
	out, err := migrateProjectV2(nil)
	if err != nil {
		t.Fatalf("nil input should not error: %v", err)
	}
	if out != nil {
		t.Fatalf("nil input should return nil, got %v", out)
	}
	out, err = migrateProjectV2([]byte{})
	if err != nil {
		t.Fatalf("empty input should not error: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("empty input should return empty, got %q", out)
	}
}

// TestMigrateProjectV2_InvalidJSON 测试非法 JSON 不抛错，原样返回。
func TestMigrateProjectV2_InvalidJSON(t *testing.T) {
	raw := []byte("{not json")
	out, err := migrateProjectV2(raw)
	if err != nil {
		t.Fatalf("invalid JSON should not error, got %v", err)
	}
	if string(out) != string(raw) {
		t.Fatalf("invalid JSON should be returned as-is")
	}
}

// TestMigrateProjectV2_AlreadyV4 测试 v4 输入原样返回。
func TestMigrateProjectV2_AlreadyV4(t *testing.T) {
	raw := []byte(`{"formatVersion":4,"canvas":{"cards":[],"pages":[]}}`)
	out, err := migrateProjectV2(raw)
	if err != nil {
		t.Fatalf("v4 input should not error: %v", err)
	}
	if string(out) != string(raw) {
		t.Fatalf("v4 input should be returned as-is\nwant: %s\ngot:  %s", raw, out)
	}
}

// TestMigrateProjectV2_V3ToV4_CardsToPages 测试 v3（cards）迁移到 v4（pages）。
func TestMigrateProjectV2_V3ToV4_CardsToPages(t *testing.T) {
	raw := []byte(`{
		"formatVersion": 3,
		"meta": {"name": "demo", "createdAt": "2025-01-01T00:00:00Z"},
		"canvas": {
			"pageType": "app",
			"colorScheme": "auto",
			"designSpecId": "stripe",
			"cards": [
				{"id":"c-1","label":"首页","html":"<h1>hi</h1>","screenshot":"data:..."},
				{"id":"c-2","label":"详情","html":"<p>detail</p>","screenshot":""}
			]
		}
	}`)

	out, err := migrateProjectV2(raw)
	if err != nil {
		t.Fatalf("v3 migration should not error: %v", err)
	}

	var doc map[string]interface{}
	if err := json.Unmarshal(out, &doc); err != nil {
		t.Fatalf("migrated doc must be valid JSON: %v", err)
	}

	// formatVersion 必须升到 4
	if fv, _ := doc["formatVersion"].(float64); fv != 4 {
		t.Fatalf("formatVersion should be 4, got %v", doc["formatVersion"])
	}

	canvas, _ := doc["canvas"].(map[string]interface{})
	if canvas == nil {
		t.Fatalf("canvas must exist")
	}

	// 旧字段必须保留（双向兼容）
	if canvas["designSpecId"] != "stripe" {
		t.Fatalf("canvas.designSpecId should be preserved, got %v", canvas["designSpecId"])
	}
	if _, ok := canvas["cards"].([]interface{}); !ok {
		t.Fatalf("canvas.cards should be preserved (backward read), got %T", canvas["cards"])
	}

	// pages 字段必须存在且包含 2 个 page
	pages, ok := canvas["pages"].([]interface{})
	if !ok {
		t.Fatalf("canvas.pages should be an array, got %T", canvas["pages"])
	}
	if len(pages) != 2 {
		t.Fatalf("canvas.pages should have 2 pages, got %d", len(pages))
	}

	// 校验第 1 个 page 的结构
	p0, _ := pages[0].(map[string]interface{})
	if p0 == nil {
		t.Fatalf("page[0] should be an object")
	}
	if p0["id"] != "c-1" {
		t.Fatalf("page[0].id should be c-1, got %v", p0["id"])
	}
	if p0["name"] != "首页" {
		t.Fatalf("page[0].name should be 首页, got %v", p0["name"])
	}
	if p0["pageType"] != "app" {
		t.Fatalf("page[0].pageType should be app, got %v", p0["pageType"])
	}
	variants, _ := p0["variants"].([]interface{})
	if len(variants) != 1 {
		t.Fatalf("page[0].variants should have 1 variant, got %d", len(variants))
	}
	v0, _ := variants[0].(map[string]interface{})
	if v0["id"] != "c-1-v1" {
		t.Fatalf("variant id should be c-1-v1, got %v", v0["id"])
	}
	if v0["html"] != "<h1>hi</h1>" {
		t.Fatalf("variant html should be preserved, got %v", v0["html"])
	}
	links, _ := p0["links"].([]interface{})
	if len(links) != 0 {
		t.Fatalf("page[0].links should be empty array, got %v", links)
	}

	// designSystem.activeSpecId 必须由 designSpecId 复制而来
	ds, _ := canvas["designSystem"].(map[string]interface{})
	if ds == nil {
		t.Fatalf("canvas.designSystem should exist")
	}
	if ds["activeSpecId"] != "stripe" {
		t.Fatalf("designSystem.activeSpecId should be stripe, got %v", ds["activeSpecId"])
	}
}

// TestMigrateProjectV2_MissingFormatVersion 测试 formatVersion 字段缺失时也应触发迁移。
func TestMigrateProjectV2_MissingFormatVersion(t *testing.T) {
	raw := []byte(`{"canvas":{"designSpecId":"linear","cards":[{"id":"a","label":"L","html":"","screenshot":""}]}}`)
	out, err := migrateProjectV2(raw)
	if err != nil {
		t.Fatalf("missing formatVersion should not error: %v", err)
	}
	var doc map[string]interface{}
	_ = json.Unmarshal(out, &doc)
	if fv, _ := doc["formatVersion"].(float64); fv != 4 {
		t.Fatalf("formatVersion should be 4, got %v", doc["formatVersion"])
	}
	canvas, _ := doc["canvas"].(map[string]interface{})
	pages, ok := canvas["pages"].([]interface{})
	if !ok || len(pages) != 1 {
		t.Fatalf("expected 1 page, got %v", canvas["pages"])
	}
}

// TestMigrateProjectV2_NoCards 测试没有 cards 字段的项目（v4 已迁移过）原样返回。
func TestMigrateProjectV2_NoCards(t *testing.T) {
	raw := []byte(`{"formatVersion":4,"canvas":{"pages":[]}}`)
	out, _ := migrateProjectV2(raw)
	if string(out) != string(raw) {
		t.Fatalf("v4 doc without cards should be returned as-is")
	}
}

// TestMigrateProjectV2_Idempotent 测试迁移后再迁移一次结果稳定。
func TestMigrateProjectV2_Idempotent(t *testing.T) {
	raw := []byte(`{"formatVersion":3,"canvas":{"designSpecId":"vercel","cards":[{"id":"x","label":"X","html":"<div/>","screenshot":""}]}}`)
	first, _ := migrateProjectV2(raw)
	second, err := migrateProjectV2(first)
	if err != nil {
		t.Fatalf("second migration should not error: %v", err)
	}
	if string(first) != string(second) {
		t.Fatalf("migrate should be idempotent\nfirst:  %s\nsecond: %s", first, second)
	}
}

// TestMigrateProjectV2_EmptyCards 测试空 cards 数组也能正常迁移。
func TestMigrateProjectV2_EmptyCards(t *testing.T) {
	raw := []byte(`{"formatVersion":3,"canvas":{"cards":[]}}`)
	out, _ := migrateProjectV2(raw)
	if !strings.Contains(string(out), `"pages":[]`) {
		t.Fatalf("empty cards should yield empty pages, got: %s", out)
	}
}
