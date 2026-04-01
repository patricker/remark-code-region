-- region: create_table
CREATE TABLE users (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer'
);
-- endregion: create_table

-- region: insert_data
INSERT INTO users (name, role) VALUES ('Alice', 'admin');
INSERT INTO users (name, role) VALUES ('Bob', 'editor');
-- endregion: insert_data
