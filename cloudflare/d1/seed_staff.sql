-- Seed staff accounts with verified PBKDF2 password hashes (100,000 iterations SHA-256)
-- Owner: owner@cafeos.in / Owner@CafeOS2026
-- Reception: reception@cafeos.in / Reception@CafeOS2026
INSERT OR REPLACE INTO users (id, cafe_id, email, password_hash, full_name, role, created_at, updated_at)
VALUES 
  ('usr-owner-01', 'cafe-kurali-01', 'owner@cafeos.in', '50cebf038391a9b7ebb02ac172e6eace:5e92095c9a9104c3c3f81c82dbd19fb657728a1febcebfc3b44391f79d4488d3', 'Asha Verma (Owner)', 'owner', datetime('now'), datetime('now')),
  ('usr-reception-01', 'cafe-kurali-01', 'reception@cafeos.in', 'a64843378d3b3c82bc55312654386e55:5cc98bd0020c53d3af4d8979235c87f108f8e9a04a14d7b974c4a701871aa225', 'Front Desk / Reception', 'staff', datetime('now'), datetime('now'));
