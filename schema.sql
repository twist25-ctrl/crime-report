-- ============================================================
-- Crime Report System — Database Schema
-- MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS crime_report_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE crime_report_system;

-- ── Drop existing tables for a clean slate ──────────────────
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS report_images;
DROP TABLE IF EXISTS evidence_images;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  phone         VARCHAR(20)   DEFAULT NULL,
  role          ENUM('user','staff','admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Crime Categories ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL UNIQUE,
  icon          VARCHAR(10)   DEFAULT '📁',
  color         VARCHAR(20)   DEFAULT '#3b82f6',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Reports ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  user_id         INT           DEFAULT NULL,
  category_id     INT           NOT NULL,
  title           VARCHAR(255)  NOT NULL,
  description     TEXT          NOT NULL,
  location        VARCHAR(255)  NOT NULL,
  latitude        DECIMAL(10,7) DEFAULT NULL,
  longitude       DECIMAL(10,7) DEFAULT NULL,
  incident_date   DATE          NOT NULL,
  incident_time   TIME          NOT NULL,
  priority        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  status          ENUM('pending','investigating','resolved','rejected') NOT NULL DEFAULT 'pending',
  escalated       TINYINT(1)    DEFAULT 0,
  is_anonymous    TINYINT(1)    DEFAULT 0,
  tracking_number VARCHAR(20)   DEFAULT NULL UNIQUE,
  anonymous_contact VARCHAR(255) DEFAULT NULL,
  notes           TEXT          DEFAULT NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── Report Images (BLOB storage) ──────────────────────────
CREATE TABLE IF NOT EXISTS report_images (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  report_id     INT           NOT NULL,
  filename      VARCHAR(255)  NOT NULL,
  mimetype      VARCHAR(100)  NOT NULL,
  data          LONGBLOB      NOT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Comments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  report_id     INT           NOT NULL,
  user_id       INT           DEFAULT NULL,
  author_name   VARCHAR(100)  DEFAULT 'Unknown',
  author_role   ENUM('user','staff','admin') DEFAULT 'user',
  comment       TEXT          NOT NULL,
  is_internal   TINYINT(1)    DEFAULT 0,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Activity Log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           DEFAULT NULL,
  report_id     INT           DEFAULT NULL,
  action        VARCHAR(100)  NOT NULL,
  description   TEXT          DEFAULT NULL,
  ip_address    VARCHAR(45)   DEFAULT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Seed: Default Categories ───────────────────────────────
INSERT IGNORE INTO categories (name, icon, color) VALUES
  ('Theft',           '🔓', '#ef4444'),
  ('Assault',         '👊', '#f97316'),
  ('Burglary',        '🏠', '#eab308'),
  ('Robbery',         '💰', '#f59e0b'),
  ('Vandalism',       '🎨', '#8b5cf6'),
  ('Fraud',           '💳', '#6366f1'),
  ('Cybercrime',      '💻', '#3b82f6'),
  ('Drug Offence',    '💊', '#14b8a6'),
  ('Domestic Violence','🏡', '#ec4899'),
  ('Traffic Incident','🚗', '#64748b'),
  ('Missing Person',  '🔍', '#0ea5e9'),
  ('Other',           '📋', '#6b7280');

-- ── Seed: Default Admin Account ────────────────────────────
-- Password: admin123 (bcrypt hash)
INSERT IGNORE INTO users (name, email, password, role) VALUES
  ('System Admin', 'admin@crimereport.com',
   '$2a$10$8K1p/a0dR1xqM8K3hF1sFeK0OMBf6R7a6J9K5vN8mQ2pL4wX6y3Zy',
   'admin');
