# BestLNG Exam Content Packs

本目录包含可直接导入 BestLNG 桌面端的考试词包 JSON 文件。

## 数据来源

- ECDICT: https://github.com/skywind3000/ECDICT, MIT License。
- Tatoeba CC0 exports: https://tatoeba.org/en/downloads, CC0 句子导出。
- BestLNG generated fallback examples: 未匹配到合适 CC0 句对时生成的原创兜底例句。

## 生成结果

| 文件                     | 词条数 | Tatoeba 英文例句 | 原创兜底 |
| ------------------------ | -----: | ---------------: | -------: |
| bestlng-cet4-en-zh.json  |   3846 |             3399 |      447 |
| bestlng-cet6-en-zh.json  |   5406 |             4355 |     1051 |
| bestlng-ielts-en-zh.json |   5038 |             4007 |     1031 |
| bestlng-toefl-en-zh.json |   6970 |             4580 |     2390 |

## 词序策略

考试词包不会按字母表顺序出词。生成脚本会优先安排 ECDICT 中更常见、考试核心度更高的词，
再用一个小窗口分散同前缀/形近词，降低连续学习相似词带来的干扰。每条句子的 tags 中会写入
`order:00001` 这类稳定学习序号，桌面端按该序号出题和展示单词本。

## 重新生成

```bash
python packages/content/scripts/generate_exam_packs.py
```

生成脚本会把下载缓存放到 `packages/content/.cache/exam-packs/`。
