-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  domain_glossary         JSONB DEFAULT '{}',
  preferred_depth         SMALLINT DEFAULT 3,
  preferred_breadth       SMALLINT DEFAULT 3,
  layout_preference       TEXT DEFAULT 'dagre',
  ai_verbosity            TEXT DEFAULT 'balanced',
  personalization_opt_in  BOOLEAN DEFAULT false,
  learned_signals         JSONB DEFAULT '{}',
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Mind maps
CREATE TABLE IF NOT EXISTS mind_maps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled Map',
  topic       TEXT,
  purpose     TEXT CHECK (purpose IN ('brainstorm','research','planning','learning','other')) DEFAULT 'brainstorm',
  is_deleted  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mind_maps_user ON mind_maps(user_id) WHERE NOT is_deleted;

-- Nodes
CREATE TABLE IF NOT EXISTS nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mind_map_id   UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES nodes(id) ON DELETE SET NULL,
  label         TEXT NOT NULL,
  content       TEXT,
  node_type     TEXT DEFAULT 'concept' CHECK (node_type IN ('concept','fact','question','action','link')),
  position_x    FLOAT NOT NULL DEFAULT 0,
  position_y    FLOAT NOT NULL DEFAULT 0,
  depth         INT NOT NULL DEFAULT 0,
  color         TEXT,
  note_content  TEXT,
  created_by    TEXT DEFAULT 'human',
  is_deleted    BOOLEAN DEFAULT false,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nodes_map ON nodes(mind_map_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);

-- Edges
CREATE TABLE IF NOT EXISTS edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mind_map_id   UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  source_id     UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_id     UUID REFERENCES nodes(id) ON DELETE CASCADE,
  label         TEXT,
  edge_type     TEXT DEFAULT 'child' CHECK (edge_type IN ('child','association','contradiction','reference')),
  created_by    TEXT DEFAULT 'human',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edges_map ON edges(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);

-- Node embeddings (for semantic deduplication)
CREATE TABLE IF NOT EXISTS node_embeddings (
  node_id     UUID PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  embedding   vector(1536) NOT NULL,
  embedded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_node_embeddings_vec ON node_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  mind_map_id         UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  socket_id           TEXT,
  graph_checkpoints   JSONB DEFAULT '[]',
  started_at          TIMESTAMPTZ DEFAULT now(),
  last_active         TIMESTAMPTZ DEFAULT now(),
  ended_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_map ON sessions(mind_map_id);

-- Agent proposals
CREATE TABLE IF NOT EXISTS agent_proposals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID REFERENCES sessions(id) ON DELETE CASCADE,
  mind_map_id             UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  agent_name              TEXT NOT NULL,
  prompt_version          TEXT NOT NULL DEFAULT '1.0.0',
  proposal_type           TEXT NOT NULL CHECK (proposal_type IN ('nodes','restructure','summary','critique','onboarding','socratic_question')),
  payload                 JSONB NOT NULL DEFAULT '{}',
  status                  TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','edited','expired')),
  user_edit               JSONB,
  confidence_score        FLOAT,
  confidence_level        TEXT DEFAULT 'medium' CHECK (confidence_level IN ('high','medium','low')),
  reasoning               TEXT,
  sources                 JSONB DEFAULT '[]',
  source_conversation_id  UUID,
  created_at              TIMESTAMPTZ DEFAULT now(),
  resolved_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_proposals_session ON agent_proposals(session_id);
CREATE INDEX IF NOT EXISTS idx_proposals_map ON agent_proposals(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON agent_proposals(status);

-- Node conversations (per-node chat history)
CREATE TABLE IF NOT EXISTS node_conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id               UUID REFERENCES nodes(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  messages              JSONB DEFAULT '[]',
  extracted_proposals   JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(node_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_node ON node_conversations(node_id);

-- Socratic questions
CREATE TABLE IF NOT EXISTS socratic_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mind_map_id         UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  question            TEXT NOT NULL,
  trigger_node_count  INT NOT NULL DEFAULT 0,
  answered            BOOLEAN DEFAULT false,
  answer_text         TEXT,
  generated_node_ids  JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_socratic_map ON socratic_questions(mind_map_id);

-- Feedback events
CREATE TABLE IF NOT EXISTS feedback_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES sessions(id),
  proposal_id     UUID REFERENCES agent_proposals(id),
  event_type      TEXT NOT NULL CHECK (event_type IN ('accept','reject','edit','retry','thumbs_up','thumbs_down','report')),
  node_id         UUID REFERENCES nodes(id),
  agent_name      TEXT,
  prompt_version  TEXT,
  original_value  TEXT,
  new_value       TEXT,
  free_text       TEXT,
  context         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_proposal ON feedback_events(proposal_id);

-- Prompt versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name    TEXT NOT NULL,
  version       TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT false,
  system_prompt TEXT NOT NULL,
  config        JSONB DEFAULT '{}',
  notes         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_name, version)
);

-- Success metrics (nightly aggregates)
CREATE TABLE IF NOT EXISTS success_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  agent_name      TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  total_proposals INT DEFAULT 0,
  accepted        INT DEFAULT 0,
  rejected        INT DEFAULT 0,
  edited          INT DEFAULT 0,
  retried         INT DEFAULT 0,
  acceptance_rate FLOAT GENERATED ALWAYS AS (
    CASE WHEN total_proposals > 0 THEN accepted::float / total_proposals ELSE 0 END
  ) STORED,
  p50_latency_ms  INT,
  p95_latency_ms  INT,
  UNIQUE(date, agent_name, prompt_version)
);
