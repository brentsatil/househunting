-- Add AI feature columns to properties table
-- Used by: Red Flag Detector, Partner Alignment Analysis

ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_red_flags jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_alignment jsonb;

-- Add comments for documentation
COMMENT ON COLUMN properties.ai_red_flags IS 'AI-detected red flags: { flags: [{severity, category, title, explanation}], overall_risk }';
COMMENT ON COLUMN properties.ai_alignment IS 'Partner alignment analysis: { together_score, agreements, disagreements, compromise_suggestions, verdict }';
