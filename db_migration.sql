-- Add parent_report_id to reports table to support duplicate grouping
ALTER TABLE reports 
ADD COLUMN parent_report_id UUID REFERENCES reports(id) DEFAULT NULL;

-- Index for better proximity search performance (lat/lng)
CREATE INDEX IF NOT EXISTS idx_reports_coords ON reports(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status != 'completed';
