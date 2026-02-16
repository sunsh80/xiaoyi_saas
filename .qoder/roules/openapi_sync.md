# OpenAPI 同步规则

所有新生成的 API 接口或数据模型必须：
1. 严格遵循 OpenAPI 3.0 规范
2. 自动更新 `openapi.yaml` 文件
3. 新增字段必须同步添加到 `openapi.yaml` 的对应 schema 中
4. 输出前使用 YAML 格式校验（缩进 2 空格，引用带引号）
5. 若 `openapi.yaml` 不存在，则先创建基础模板

禁止：
- 手动硬编码 API 路径而不更新 openapi.yaml
- 修改 DTO 类但不同步 OpenAPI