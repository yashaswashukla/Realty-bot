-- Drop tables if they exist (for re-seeding)
DROP TABLE IF EXISTS project_media CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS cities CASCADE;

-- Cities
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL
);

-- Projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  city_id INTEGER REFERENCES cities(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sms_message TEXT NOT NULL
);

-- Project Media
CREATE TABLE project_media (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),
  file_path VARCHAR(500) NOT NULL,
  cloudinary_url VARCHAR(500)
);

-- Seed: Cities
INSERT INTO cities (name, code) VALUES
  ('Mumbai', 'MUM'),
  ('Bangalore', 'BLR');

-- Seed: Projects
INSERT INTO projects (city_id, name, description, sms_message) VALUES
  (1, 'Prestige Seabreeze', '2 & 3 BHK luxury apartments with sea views in Worli.', 'Prestige Seabreeze – Sea-facing luxury 2 & 3 BHK apartments starting at ₹2.5 Cr in Worli, Mumbai. Amenities include infinity pool, clubhouse & 24/7 security. Limited units available! Call us: 1800-XXX-XXXX or visit www.prestigerealty.in'),
  (1, 'Prestige Gateway', 'Premium commercial and residential spaces in BKC.', 'Prestige Gateway – Premium residences in the heart of BKC, Mumbai. 2, 3 & 4 BHK starting at ₹3.2 Cr. Metroconnectivity, world-class amenities. Book your site visit today! Call: 1800-XXX-XXXX'),
  (2, 'Prestige Lakeside', 'Gated community villas beside Varthur Lake in Whitefield.', 'Prestige Lakeside – Exclusive lake-facing villas in Whitefield, Bangalore. Starting ₹1.8 Cr. 3 & 4 BHK villas with private garden. Gated community with 50+ amenities. Call: 1800-XXX-XXXX'),
  (2, 'Prestige Silicon Valley', 'IT-hub proximity smart homes in Electronic City.', 'Prestige Silicon Valley – Smart homes near Electronic City, Bangalore. 1, 2 & 3 BHK from ₹65 Lakh. High-speed internet, smart security & co-working spaces. Enquire: 1800-XXX-XXXX');

-- Seed: Project Media
INSERT INTO project_media (project_id, media_type, file_path) VALUES
  -- Project 1: Prestige Seabreeze
  (1, 'image', 'media/raw/1_1.jpg'),
  (1, 'image', 'media/raw/1_2.jpg'),
  (1, 'video', 'media/raw/1_1.mp4'),
  -- Project 2: Prestige Gateway
  (2, 'image', 'media/raw/2_1.jpg'),
  (2, 'image', 'media/raw/2_2.jpg'),
  (2, 'video', 'media/raw/2_1.mp4'),
  -- Project 3: Prestige Lakeside
  (3, 'image', 'media/raw/3_1.jpg'),
  (3, 'image', 'media/raw/3_2.jpg'),
  (3, 'video', 'media/raw/3_1.mp4'),
  -- Project 4: Prestige Silicon Valley
  (4, 'image', 'media/raw/4_1.jpg'),
  (4, 'image', 'media/raw/4_2.jpg'),
  (4, 'video', 'media/raw/4_1.mp4');
