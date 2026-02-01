-- Transaction to ensure atomicity
BEGIN;

-- 1. Remove Old Algiers (Code 16)
-- Note: Cascading delete should handle related records if FKs are set to CASCADE.
-- If not, we might need to delete from records first.
-- The schema says: foreign key (state_id) references states(id) on delete cascade
-- So deleting the state is sufficient.

DELETE FROM states WHERE code = 16;

-- 2. Insert New Zones
INSERT INTO states (name, code) VALUES 
('Algeria Central', 161),
('Algeria East', 162),
('Algeria West', 163);

COMMIT;
