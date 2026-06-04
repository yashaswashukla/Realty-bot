-- Drop tables if they exist (for re-seeding)
DROP TABLE IF EXISTS project_media CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS zones CASCADE;

-- Zones (Mumbai only)
CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL
);

-- Projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES zones(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sms_message TEXT NOT NULL
);

-- Project Media
CREATE TABLE project_media (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  media_type VARCHAR(10) CHECK (media_type IN ('image', 'video', 'brochure')),
  file_path VARCHAR(500) NOT NULL,
  cloudinary_url VARCHAR(500)
);

-- Seed: Mumbai Zones
INSERT INTO zones (name, code) VALUES
  ('South Mumbai (SoBo)', 'SOBO'),
  ('Western Suburbs', 'WSUB'),
  ('Central & Harbour Suburbs', 'CHSUB'),
  ('Thane & Extended Suburbs', 'THANE'),
  ('Navi Mumbai & Beyond', 'NAVI');

-- Seed: Projects per Zone
INSERT INTO projects (zone_id, name, description, sms_message) VALUES
  -- Zone 1: South Mumbai
  (1, 'Prestige Seabreeze', '2 & 3 BHK luxury apartments with sea views in Worli.', 'Prestige Seabreeze – Sea-facing luxury 2 & 3 BHK apartments starting at ₹2.5 Cr in Worli, Mumbai. Infinity pool, clubhouse & 24/7 security. Limited units! Call: 1800-XXX-XXXX'),
  (1, 'Prestige Marine', 'Ultra-premium residences on Marine Lines with panoramic views.', 'Prestige Marine – Ultra-premium 3 & 4 BHK on Marine Lines starting at ₹4.8 Cr. Concierge services, sky lounge & private terrace. Enquire: 1800-XXX-XXXX'),
  -- Zone 2: Western Suburbs
  (2, 'Prestige Westview', 'Modern 2 & 3 BHK homes in the heart of Andheri West.', 'Prestige Westview – Contemporary 2 & 3 BHK in Andheri West from ₹1.8 Cr. Metro connectivity, rooftop pool & co-working spaces. Call: 1800-XXX-XXXX'),
  (2, 'Prestige Bandra Heights', 'Signature residences overlooking the Bandra coast.', 'Prestige Bandra Heights – Premium 3 & 4 BHK starting ₹3.5 Cr. Sea views, landscaped gardens & premium finishes. Book a visit: 1800-XXX-XXXX'),
  -- Zone 3: Central & Harbour Suburbs
  (3, 'Prestige Central Park', 'Spacious 2 BHK homes near Kurla with great connectivity.', 'Prestige Central Park – Affordable 2 BHK starting ₹1.1 Cr near Kurla. 40+ amenities, green spaces & school proximity. Call: 1800-XXX-XXXX'),
  (3, 'Prestige Harbour View', 'Harbour-facing residences in Wadala with BKC access.', 'Prestige Harbour View – 2 & 3 BHK in Wadala from ₹1.9 Cr. Harbour views, monorail connectivity & premium clubhouse. Enquire: 1800-XXX-XXXX'),
  -- Zone 4: Thane & Extended Suburbs
  (4, 'Prestige Thane Hills', 'Gated township with hill views in Thane West.', 'Prestige Thane Hills – Spacious 2 & 3 BHK in Thane West from ₹95 Lakh. Hill views, 60+ amenities & excellent schools nearby. Call: 1800-XXX-XXXX'),
  (4, 'Prestige Kalyan Meadows', 'Affordable family homes in fast-growing Kalyan.', 'Prestige Kalyan Meadows – 1, 2 & 3 BHK from ₹55 Lakh in Kalyan. Large open spaces, kids zone & future metro access. Enquire: 1800-XXX-XXXX'),
  -- Zone 5: Navi Mumbai & Beyond
  (5, 'Prestige Navi Bay', 'Waterfront living in Kharghar with Navi Mumbai Metro access.', 'Prestige Navi Bay – 2 & 3 BHK from ₹85 Lakh in Kharghar. Waterfront views, Navi Mumbai Metro & 50+ amenities. Call: 1800-XXX-XXXX'),
  (5, 'Prestige Panvel Gateway', 'Smart homes near the upcoming Navi Mumbai airport.', 'Prestige Panvel Gateway – Future-ready 2 & 3 BHK from ₹70 Lakh. Near Navi Mumbai International Airport, smart home features. Enquire: 1800-XXX-XXXX');

-- Seed: Project Media
INSERT INTO project_media (project_id, media_type, file_path) VALUES
  (1, 'image', 'media/raw/1_1.jpg'),
  (1, 'image', 'media/raw/1_2.jpg'),
  (1, 'video', 'media/raw/1_1.mp4'),
  (1, 'brochure', 'media/raw/1_brochure.pdf'),
  (2, 'image', 'media/raw/2_1.jpg'),
  (2, 'image', 'media/raw/2_2.jpg'),
  (2, 'video', 'media/raw/2_1.mp4'),
  (2, 'brochure', 'media/raw/2_brochure.pdf'),
  (3, 'image', 'media/raw/3_1.jpg'),
  (3, 'image', 'media/raw/3_2.jpg'),
  (3, 'video', 'media/raw/3_1.mp4'),
  (3, 'brochure', 'media/raw/3_brochure.pdf'),
  (4, 'image', 'media/raw/4_1.jpg'),
  (4, 'image', 'media/raw/4_2.jpg'),
  (4, 'video', 'media/raw/4_1.mp4'),
  (4, 'brochure', 'media/raw/4_brochure.pdf'),
  (5, 'image', 'media/raw/5_1.jpg'),
  (5, 'image', 'media/raw/5_2.jpg'),
  (5, 'video', 'media/raw/5_1.mp4'),
  (5, 'brochure', 'media/raw/5_brochure.pdf'),
  (6, 'image', 'media/raw/6_1.jpg'),
  (6, 'image', 'media/raw/6_2.jpg'),
  (6, 'video', 'media/raw/6_1.mp4'),
  (6, 'brochure', 'media/raw/6_brochure.pdf'),
  (7, 'image', 'media/raw/7_1.jpg'),
  (7, 'image', 'media/raw/7_2.jpg'),
  (7, 'video', 'media/raw/7_1.mp4'),
  (7, 'brochure', 'media/raw/7_brochure.pdf'),
  (8, 'image', 'media/raw/8_1.jpg'),
  (8, 'image', 'media/raw/8_2.jpg'),
  (8, 'video', 'media/raw/8_1.mp4'),
  (8, 'brochure', 'media/raw/8_brochure.pdf'),
  (9, 'image', 'media/raw/9_1.jpg'),
  (9, 'image', 'media/raw/9_2.jpg'),
  (9, 'video', 'media/raw/9_1.mp4'),
  (9, 'brochure', 'media/raw/9_brochure.pdf'),
  (10, 'image', 'media/raw/10_1.jpg'),
  (10, 'image', 'media/raw/10_2.jpg'),
  (10, 'video', 'media/raw/10_1.mp4'),
  (10, 'brochure', 'media/raw/10_brochure.pdf');
