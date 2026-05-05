-- ==================== Account uniqueness per tenant ====================
-- Multi-tenant accounts: same username can exist in different tenants
-- (e.g. each tenant can have an 'admin' account).

ALTER TABLE accounts DROP CONSTRAINT accounts_username_key;
ALTER TABLE accounts ADD CONSTRAINT accounts_tenant_username_key UNIQUE (tenant_id, username);
