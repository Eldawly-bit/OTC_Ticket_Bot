const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bot_dashboard.db');
const db = new sqlite3.Database(dbPath);

// Initialize Tables
db.serialize(() => {
  // Tickets Table
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT UNIQUE,
      channel_name TEXT,
      type TEXT,
      creator_id TEXT,
      creator_tag TEXT,
      staff_id TEXT,
      staff_tag TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      first_response_at DATETIME
    )
  `);

  // Logs Table
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      staff_id TEXT,
      staff_tag TEXT,
      target_user TEXT,
      ticket_name TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transcripts Table
  db.run(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_name TEXT,
      type TEXT,
      creator_tag TEXT,
      staff_tag TEXT,
      file_name TEXT,
      content_html TEXT,
      content_txt TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ticket Types Table
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      key TEXT UNIQUE NOT NULL,
      emoji TEXT,
      prefix TEXT UNIQUE NOT NULL,
      description TEXT,
      embed_title TEXT,
      embed_description TEXT,
      embed_color TEXT DEFAULT '#5865F2',
      button_style TEXT DEFAULT 'Primary',
      button_order INTEGER DEFAULT 0,
      category_id TEXT,
      staff_role_id TEXT,
      logs_channel_id TEXT,
      enabled INTEGER DEFAULT 1,
      allow_multiple INTEGER DEFAULT 0,
      max_open_tickets INTEGER DEFAULT 1,
      auto_close_minutes INTEGER DEFAULT 0,
      auto_delete_minutes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ticket Panels Table
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel_id TEXT,
      title TEXT,
      description TEXT,
      color TEXT DEFAULT '#5865F2',
      image TEXT,
      thumbnail TEXT,
      footer TEXT,
      button_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Dynamic Join Team Questions Table
  db.run(`
    CREATE TABLE IF NOT EXISTS join_team_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_key TEXT UNIQUE,
      label TEXT,
      placeholder TEXT,
      style TEXT DEFAULT 'short',
      question_type TEXT DEFAULT 'Short Text',
      options TEXT,
      min_length INTEGER DEFAULT 0,
      max_length INTEGER DEFAULT 1000,
      required INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // Check columns migration for existing join_team_questions table if missing new columns
  db.all(`PRAGMA table_info(join_team_questions)`, (err, rows) => {
    if (!err && rows) {
      const colNames = rows.map(r => r.name);
      if (!colNames.includes('question_type')) {
        db.run(`ALTER TABLE join_team_questions ADD COLUMN question_type TEXT DEFAULT 'Short Text'`);
      }
      if (!colNames.includes('options')) {
        db.run(`ALTER TABLE join_team_questions ADD COLUMN options TEXT`);
      }
      if (!colNames.includes('min_length')) {
        db.run(`ALTER TABLE join_team_questions ADD COLUMN min_length INTEGER DEFAULT 0`);
      }
      if (!colNames.includes('max_length')) {
        db.run(`ALTER TABLE join_team_questions ADD COLUMN max_length INTEGER DEFAULT 1000`);
      }
    }
  });

  // Seed default join team questions if empty
  db.get(`SELECT COUNT(*) as count FROM join_team_questions`, (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare(`
        INSERT INTO join_team_questions (question_key, label, placeholder, style, question_type, required, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run('join_name', 'Name', 'Enter your name', 'short', 'Short Text', 1, 1);
      stmt.run('join_age', 'Age', 'Enter your age', 'short', 'Number', 1, 2);
      stmt.run('join_games', 'Games Played', 'Example: FiveM, Valorant, GTA V, Minecraft', 'paragraph', 'Paragraph', 1, 3);
      stmt.run('join_why', 'Why Do You Want To Join OTC?', 'Explain why you want to join OTC and what you can offer...', 'paragraph', 'Paragraph', 1, 4);
      stmt.finalize();
    }
  });

  // Settings Extra Table (Key-Value)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings_extra (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Auto-migrate default ticket types if empty
  db.get(`SELECT COUNT(*) as count FROM ticket_types`, (err, row) => {
    if (!err && row && row.count === 0) {
      const configPath = path.join(__dirname, '../../config.json');
      let config = {};
      try {
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch (e) {
        console.error('[DB Migration] Error reading config.json:', e);
      }

      const stmt = db.prepare(`
        INSERT INTO ticket_types (
          name, key, emoji, prefix, description, embed_title, embed_description, embed_color,
          button_style, button_order, category_id, staff_role_id, logs_channel_id, enabled,
          allow_multiple, max_open_tickets
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 1. Complaint
      stmt.run(
        config.ticketTypes?.complaint?.label || 'Complaints',
        'complaint',
        config.ticketTypes?.complaint?.emoji || '😡',
        config.ticketTypes?.complaint?.prefix || 'complaint',
        'File a formal complaint for staff or user issues.',
        '😡 Complaint Ticket',
        'Please explain your complaint clearly.\n\nA staff member will assist you shortly.',
        config.embedColors?.danger || '#ED4245',
        'Danger',
        1,
        config.categoryIds?.complaint || '',
        config.staffRoleId || '',
        config.logsChannelId || '',
        config.ticketTypes?.complaint?.enabled !== false ? 1 : 0,
        0,
        1
      );

      // 2. Suggestion
      stmt.run(
        config.ticketTypes?.suggestion?.label || 'Suggestions',
        'suggestion',
        config.ticketTypes?.suggestion?.emoji || '💡',
        config.ticketTypes?.suggestion?.prefix || 'suggestion',
        'Share your ideas and suggestions to improve OTC.',
        '💡 Suggestion Ticket',
        'Share your suggestion with as much detail as possible.\n\nWe appreciate every idea.',
        config.embedColors?.primary || '#5865F2',
        'Primary',
        2,
        config.categoryIds?.suggestion || '',
        config.staffRoleId || '',
        config.logsChannelId || '',
        config.ticketTypes?.suggestion?.enabled !== false ? 1 : 0,
        0,
        1
      );

      // 3. Join Team
      stmt.run(
        config.ticketTypes?.jointeam?.label || 'Request to Join Team',
        'jointeam',
        config.ticketTypes?.jointeam?.emoji || '🤝',
        config.ticketTypes?.jointeam?.prefix || 'jointeam',
        'Submit an application to join the OTC staff team.',
        '🤝 OTC Team Application',
        'New team application received:',
        config.embedColors?.success || '#57F287',
        'Success',
        3,
        config.categoryIds?.jointeam || '',
        config.staffRoleId || '',
        config.logsChannelId || '',
        config.ticketTypes?.jointeam?.enabled !== false ? 1 : 0,
        0,
        1
      );

      stmt.finalize();
      console.log('[DB Migration] Successfully migrated initial ticket types into SQLite!');
    }
  });
});

// Helper Promise wrappers
const dbAsync = {
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  }),
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  })
};

module.exports = { db, dbAsync };
