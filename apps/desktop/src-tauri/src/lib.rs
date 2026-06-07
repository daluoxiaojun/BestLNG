use tauri_plugin_sql::{Migration, MigrationKind};

const BESTLNG_DATABASE_URL: &str = "sqlite:bestlng.db";

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
