-- Users: auto-populated on first login from Azure AD JWT claims
IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE users (
    id          NVARCHAR(255)  PRIMARY KEY,
    name        NVARCHAR(255)  NOT NULL,
    email       NVARCHAR(255)  NOT NULL,
    avatar_url  NVARCHAR(500)  NULL,
    created_at  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    last_login  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

-- Projects
IF OBJECT_ID('dbo.projects', 'U') IS NULL
BEGIN
  CREATE TABLE projects (
    id          NVARCHAR(21)   PRIMARY KEY,
    name        NVARCHAR(255)  NOT NULL,
    user_id     NVARCHAR(255)  NOT NULL REFERENCES users(id),
    created_at  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX ix_projects_user ON projects(user_id);
END;

-- Columns
IF OBJECT_ID('dbo.columns', 'U') IS NULL
BEGIN
  CREATE TABLE columns (
    id          NVARCHAR(21)   PRIMARY KEY,
    title       NVARCHAR(255)  NOT NULL,
    project_id  NVARCHAR(21)   NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sort_order  INT            NOT NULL DEFAULT 0
  );
  CREATE INDEX ix_columns_project ON columns(project_id);
END;

-- Tasks
IF OBJECT_ID('dbo.tasks', 'U') IS NULL
BEGIN
  CREATE TABLE tasks (
    id          NVARCHAR(21)   PRIMARY KEY,
    title       NVARCHAR(255)  NOT NULL,
    description NVARCHAR(MAX)  NOT NULL DEFAULT '',
    column_id   NVARCHAR(21)   NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    sort_order  INT            NOT NULL DEFAULT 0,
    created_at  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX ix_tasks_column ON tasks(column_id);
END;
