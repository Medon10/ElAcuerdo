import 'dotenv/config';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'supersecret';
const token = jwt.sign({ id: 1, rol: 'admin', usuario: 'debug' }, secret, { expiresIn: '5m' });

const url = 'http://localhost:3000/planillas/total-dia?fecha=2025-12-24';
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

console.log('status', res.status);
console.log(await res.text());
