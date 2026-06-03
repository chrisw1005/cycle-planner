-- package unit for oral/PCT drugs: how tabs_per_box is packaged (盒/排/瓶/條).
-- injectables ignore this. defaults to 盒 for backward compatibility.
ALTER TABLE drugs ADD COLUMN package_unit TEXT NOT NULL DEFAULT '盒';
