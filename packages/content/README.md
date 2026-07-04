# Content

BestLNG 内容包处理包。

用于定义内容包 manifest、公开词库导入、许可证校验和格式转换逻辑。

## 考试内容包

`packs/exam` 目录提供 4 个可直接导入桌面端的 JSON 内容包：

- `bestlng-cet4-en-zh.json`
- `bestlng-cet6-en-zh.json`
- `bestlng-ielts-en-zh.json`
- `bestlng-toefl-en-zh.json`

这些内容包由 `scripts/generate_exam_packs.py` 生成，词表和释义来自 ECDICT
（MIT），英文例句优先匹配 Tatoeba CC0 导出，未匹配词条使用 BestLNG 原创兜底例句。

重新生成：

```bash
python packages/content/scripts/generate_exam_packs.py
```
