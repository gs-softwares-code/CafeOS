CREATE TABLE IF NOT EXISTS customer_preferences (
  user_id TEXT PRIMARY KEY,
  phone TEXT NOT NULL DEFAULT '',
  dietary_preference TEXT NOT NULL DEFAULT 'pure_veg',
  milk_preference TEXT NOT NULL DEFAULT 'regular',
  sugar_preference TEXT NOT NULL DEFAULT 'normal',
  favorite_note TEXT NOT NULL DEFAULT '',
  notifications_enabled INTEGER NOT NULL DEFAULT 0 CHECK (notifications_enabled IN (0, 1)),
  marketing_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (marketing_opt_in IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer_messages (
  id TEXT PRIMARY KEY,
  cafe_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  admin_reply TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  replied_at TEXT,
  FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

