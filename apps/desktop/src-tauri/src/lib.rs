use serde::Deserialize;
use sqlx::sqlite::SqlitePoolOptions;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const BESTLNG_DATABASE_URL: &str = "sqlite:bestlng.db";
const BESTLNG_DATABASE_FILE: &str = "bestlng.db";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentLicenseInput {
    name: String,
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentPackageManifestInput {
    authors: Vec<String>,
    description: Option<String>,
    id: String,
    license: Option<ContentLicenseInput>,
    name: String,
    source_language: String,
    target_language: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentBlankInput {
    accepted_answers: Option<Vec<String>>,
    answer: String,
    hint: Option<String>,
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentSentenceInput {
    blanks: Vec<ContentBlankInput>,
    id: String,
    tags: Option<Vec<String>>,
    text: String,
    translation: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentPackageInput {
    manifest: ContentPackageManifestInput,
    sentences: Vec<ContentSentenceInput>,
}

fn sqlite_database_url<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<String, String> {
    let app_path = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法读取应用数据目录：{error}"))?;

    std::fs::create_dir_all(&app_path).map_err(|error| format!("无法创建应用数据目录：{error}"))?;

    let database_path = app_path.join(BESTLNG_DATABASE_FILE);

    Ok(format!(
        "sqlite:{}",
        database_path
            .to_str()
            .ok_or_else(|| "SQLite 数据库路径包含无法识别的字符。".to_string())?
    ))
}

fn exercise_id(package_id: &str, sentence_id: &str) -> String {
    format!("{package_id}:{sentence_id}")
}

fn blank_database_id(package_id: &str, sentence_id: &str, blank_id: &str) -> String {
    format!("{package_id}:{sentence_id}:{blank_id}")
}

#[tauri::command]
async fn upsert_content_package<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    content_package: ContentPackageInput,
) -> Result<usize, String> {
    let database_url = sqlite_database_url(&app)?;
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .map_err(|error| format!("连接 SQLite 数据库失败：{error}"))?;
    let result = async {
        let mut transaction = pool
            .begin()
            .await
            .map_err(|error| format!("开启内容包导入事务失败：{error}"))?;
        let manifest = &content_package.manifest;
        let license_name = manifest
            .license
            .as_ref()
            .map(|license| license.name.as_str())
            .unwrap_or("未声明");
        let license_url = manifest
            .license
            .as_ref()
            .and_then(|license| license.url.as_deref())
            .unwrap_or("");

        // 大内容包必须在原生层单连接事务里写入，避免 JS SQL 插件连接池打断 BEGIN/COMMIT。
        sqlx::query(
            r#"
            INSERT INTO content_packs
                (id, title, description, source, license_name, license_url, is_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, 1)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                source = excluded.source,
                license_name = excluded.license_name,
                license_url = excluded.license_url,
                is_enabled = 1
            "#,
        )
        .bind(&manifest.id)
        .bind(&manifest.name)
        .bind(manifest.description.as_deref().unwrap_or(""))
        .bind(manifest.authors.join(", "))
        .bind(license_name)
        .bind(license_url)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("写入内容包元数据失败：{error}"))?;

        for sentence in &content_package.sentences {
            let stored_sentence_id = exercise_id(&manifest.id, &sentence.id);
            let tags = serde_json::to_string(sentence.tags.as_deref().unwrap_or(&[]))
                .map_err(|error| format!("序列化句子标签失败：{error}"))?;

            sqlx::query("DELETE FROM sentence_blanks WHERE sentence_id = $1")
                .bind(&stored_sentence_id)
                .execute(&mut *transaction)
                .await
                .map_err(|error| format!("清理旧空位失败：{error}"))?;

            sqlx::query(
                r#"
                INSERT INTO sentences
                    (id, pack_id, source_lang, target_lang, text, translation, level, tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT(id) DO UPDATE SET
                    pack_id = excluded.pack_id,
                    source_lang = excluded.source_lang,
                    target_lang = excluded.target_lang,
                    text = excluded.text,
                    translation = excluded.translation,
                    level = excluded.level,
                    tags = excluded.tags
                "#,
            )
            .bind(&stored_sentence_id)
            .bind(&manifest.id)
            .bind(&manifest.source_language)
            .bind(&manifest.target_language)
            .bind(&sentence.text)
            .bind(&sentence.translation)
            .bind("A1")
            .bind(tags)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("写入句子失败：{error}"))?;

            for (blank_index, blank) in sentence.blanks.iter().enumerate() {
                let stored_blank_id = blank_database_id(&manifest.id, &sentence.id, &blank.id);
                let accepted_answers =
                    serde_json::to_string(blank.accepted_answers.as_deref().unwrap_or(&[]))
                        .map_err(|error| format!("序列化可接受答案失败：{error}"))?;

                sqlx::query(
                    r#"
                    INSERT INTO sentence_blanks
                        (id, sentence_id, answer, accepted_answers, hint, display_order)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT(id) DO UPDATE SET
                        sentence_id = excluded.sentence_id,
                        answer = excluded.answer,
                        accepted_answers = excluded.accepted_answers,
                        hint = excluded.hint,
                        display_order = excluded.display_order
                    "#,
                )
                .bind(&stored_blank_id)
                .bind(&stored_sentence_id)
                .bind(&blank.answer)
                .bind(accepted_answers)
                .bind(blank.hint.as_deref().unwrap_or(""))
                .bind(blank_index as i64)
                .execute(&mut *transaction)
                .await
                .map_err(|error| format!("写入句子空位失败：{error}"))?;

                sqlx::query(
                    r#"
                    INSERT OR IGNORE INTO vocabulary_entries
                        (id, term, meaning, lang, status, next_review_at)
                    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                    "#,
                )
                .bind(format!("vocab-{stored_blank_id}"))
                .bind(&blank.answer)
                .bind(blank.hint.as_deref().unwrap_or(&sentence.translation))
                .bind(&manifest.source_language)
                .bind("learning")
                .execute(&mut *transaction)
                .await
                .map_err(|error| format!("写入词条失败：{error}"))?;
            }
        }

        transaction
            .commit()
            .await
            .map_err(|error| format!("提交内容包导入事务失败：{error}"))?;

        Ok(content_package.sentences.len())
    }
    .await;

    pool.close().await;

    result
}

fn bestlng_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_bestlng_local_schema",
        // 本地优先的第一版数据模型，所有表都使用 IF NOT EXISTS，方便开发期重复启动。
        sql: r#"
            CREATE TABLE IF NOT EXISTS content_packs (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                source TEXT NOT NULL,
                license_name TEXT NOT NULL,
                license_url TEXT NOT NULL,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sentences (
                id TEXT PRIMARY KEY,
                pack_id TEXT NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                text TEXT NOT NULL,
                translation TEXT NOT NULL,
                level TEXT NOT NULL DEFAULT 'A1',
                tags TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sentence_blanks (
                id TEXT PRIMARY KEY,
                sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
                answer TEXT NOT NULL,
                accepted_answers TEXT NOT NULL DEFAULT '[]',
                hint TEXT NOT NULL DEFAULT '',
                display_order INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS vocabulary_entries (
                id TEXT PRIMARY KEY,
                term TEXT NOT NULL UNIQUE,
                meaning TEXT NOT NULL,
                lang TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'learning',
                next_review_at TEXT NOT NULL,
                due_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS practice_attempts (
                id TEXT PRIMARY KEY,
                sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
                blank_id TEXT NOT NULL REFERENCES sentence_blanks(id) ON DELETE CASCADE,
                answer TEXT NOT NULL,
                normalized_answer TEXT NOT NULL,
                is_correct INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS review_queue (
                id TEXT PRIMARY KEY,
                vocabulary_id TEXT NOT NULL REFERENCES vocabulary_entries(id) ON DELETE CASCADE,
                due_at TEXT NOT NULL,
                interval_days INTEGER NOT NULL DEFAULT 1,
                ease_factor REAL NOT NULL DEFAULT 2.5,
                repetitions INTEGER NOT NULL DEFAULT 0,
                lapses INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS sentences_pack_id_idx ON sentences(pack_id);
            CREATE INDEX IF NOT EXISTS sentence_blanks_sentence_id_idx ON sentence_blanks(sentence_id);
            CREATE INDEX IF NOT EXISTS practice_attempts_sentence_id_idx ON practice_attempts(sentence_id);
            CREATE UNIQUE INDEX IF NOT EXISTS review_queue_vocabulary_id_idx
                ON review_queue(vocabulary_id);
        "#,
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 原生入口保持轻量，业务逻辑优先沉淀到前端和共享核心包中。
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![upsert_content_package])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(BESTLNG_DATABASE_URL, bestlng_migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("运行 BestLNG 桌面端时发生错误");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_frontend_content_package_payload() {
        let payload = serde_json::json!({
            "manifest": {
                "authors": ["BestLNG contributors"],
                "description": "测试内容包",
                "id": "test-pack",
                "license": {
                    "attribution": "BestLNG contributors",
                    "name": "CC0-1.0",
                    "url": "https://creativecommons.org/publicdomain/zero/1.0/"
                },
                "name": "测试包",
                "sourceLanguage": "en",
                "targetLanguage": "zh-Hans",
                "version": "0.1.0"
            },
            "sentences": [
                {
                    "blanks": [
                        {
                            "acceptedAnswers": ["test"],
                            "answer": "test",
                            "hint": "测试",
                            "id": "blank-1"
                        }
                    ],
                    "id": "sentence-1",
                    "tags": ["unit"],
                    "text": "This is a test.",
                    "translation": "这是一条测试句。"
                }
            ]
        });
        let content_package: ContentPackageInput =
            serde_json::from_value(payload).expect("前端内容包 payload 应可反序列化");

        assert_eq!(content_package.manifest.source_language, "en");
        assert_eq!(content_package.manifest.target_language, "zh-Hans");
        assert_eq!(
            content_package.sentences[0].blanks[0].accepted_answers,
            Some(vec!["test".to_string()])
        );
        assert_eq!(
            blank_database_id(
                &content_package.manifest.id,
                &content_package.sentences[0].id,
                &content_package.sentences[0].blanks[0].id
            ),
            "test-pack:sentence-1:blank-1"
        );
    }
}
