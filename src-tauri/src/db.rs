use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: PathBuf) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database { conn };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> SqlResult<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY,
                path TEXT UNIQUE NOT NULL,
                last_opened INTEGER,
                cursor_line INTEGER DEFAULT 0,
                cursor_col INTEGER DEFAULT 0,
                created_at INTEGER,
                updated_at INTEGER
            );
            
            CREATE TABLE IF NOT EXISTS recent_searches (
                id INTEGER PRIMARY KEY,
                query TEXT NOT NULL,
                created_at INTEGER
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER
            );",
        )?;
        Ok(())
    }

    pub fn save_file_position(
        &self,
        path: &str,
        line: i32,
        col: i32,
    ) -> SqlResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT OR REPLACE INTO files (path, cursor_line, cursor_col, last_opened, updated_at)
             VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![path, line, col, now, now],
        )?;
        Ok(())
    }

    pub fn get_file_position(&self, path: &str) -> SqlResult<Option<(i32, i32)>> {
        let mut stmt = self.conn.prepare(
            "SELECT cursor_line, cursor_col FROM files WHERE path = ?",
        )?;

        let mut rows = stmt.query(rusqlite::params![path])?;

        if let Some(row) = rows.next()? {
            let line: i32 = row.get(0)?;
            let col: i32 = row.get(1)?;
            return Ok(Some((line, col)));
        }

        Ok(None)
    }

    pub fn add_recent_search(&self, query: &str) -> SqlResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT INTO recent_searches (query, created_at) VALUES (?, ?)",
            rusqlite::params![query, now],
        )?;
        Ok(())
    }

    pub fn get_recent_searches(&self, limit: i32) -> SqlResult<Vec<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT query FROM recent_searches ORDER BY created_at DESC LIMIT ?")?;

        let searches = stmt
            .query_map(rusqlite::params![limit], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(searches)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> SqlResult<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
            rusqlite::params![key, value, now],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> SqlResult<Option<String>> {
        let mut stmt = self.conn.prepare("SELECT value FROM settings WHERE key = ?")?;

        let mut rows = stmt.query(rusqlite::params![key])?;

        if let Some(row) = rows.next()? {
            let value: String = row.get(0)?;
            return Ok(Some(value));
        }

        Ok(None)
    }
}
