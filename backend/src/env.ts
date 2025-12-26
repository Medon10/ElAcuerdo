import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load backend/.env regardless of the current working directory.
// This keeps ORM + raw SQL pool in sync.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
