
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response JSONB,
  created_at TIMESTAMP DEFAULT now()
);
