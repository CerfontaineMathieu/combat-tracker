-- Seed demo campaign
INSERT INTO campaigns (id, name, description) VALUES
(1, 'La Quête du Dragon', 'Une aventure épique à travers les terres de Faerûn');

-- Reset sequence to avoid conflicts
SELECT setval('campaigns_id_seq', (SELECT MAX(id) FROM campaigns));

-- Seed player characters
INSERT INTO characters (campaign_id, name, class, level, current_hp, max_hp, ac, initiative, conditions) VALUES
(1, 'Thorin', 'Guerrier', 5, 45, 52, 18, 0, '[]'::jsonb),
(1, 'Elara', 'Magicienne', 5, 28, 32, 13, 0, '["concentré"]'::jsonb),
(1, 'Finn', 'Roublard', 5, 38, 38, 15, 0, '[]'::jsonb),
(1, 'Aldric', 'Clerc', 5, 12, 40, 16, 0, '["empoisonné"]'::jsonb);

-- Seed combat monsters (current encounter)
INSERT INTO combat_monsters (campaign_id, name, hp, max_hp, ac, initiative, notes, status) VALUES
(1, 'Gobelin Archer', 7, 7, 13, 14, 'Attaque à distance', 'actif'),
(1, 'Gobelin Guerrier', 5, 7, 15, 12, 'Bouclier', 'actif'),
(1, 'Chef Gobelin', 21, 21, 17, 16, 'Multiattaque', 'actif');

-- Seed session notes
INSERT INTO notes (campaign_id, title, content, session_date) VALUES
(1, 'Session 1', 'Le groupe arrive au village de Brindille...', '2024-01-15'),
(1, 'Session 2', 'Combat contre les gobelins dans la forêt...', '2024-01-22');
