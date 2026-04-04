CREATE DATABASE IF NOT EXISTS bugsense;

CREATE TABLE IF NOT EXISTS bugsense.error_events
(
    event_id UUID,
    project_id String,
    issue_fingerprint String,
    environment LowCardinality(String),
    release_version Nullable(String),
    level LowCardinality(String),
    platform LowCardinality(String),
    message String,
    exception_type Nullable(String),
    stack_trace String,
    handled UInt8,
    session_id Nullable(String),
    user_id Nullable(String),
    request_url Nullable(String),
    user_agent Nullable(String),
    browser_name Nullable(String),
    browser_version Nullable(String),
    os_name Nullable(String),
    os_version Nullable(String),
    tags_json String DEFAULT '{}',
    contexts_json String DEFAULT '{}',
    metadata_json String DEFAULT '{}',
    occurred_at DateTime64(3, 'UTC'),
    received_at DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(received_at)
ORDER BY (project_id, occurred_at, issue_fingerprint, event_id)
TTL toDateTime(received_at) + toIntervalMonth(12)
SETTINGS index_granularity = 8192;
