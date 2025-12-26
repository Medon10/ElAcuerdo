import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query as dbQuery } from '../../db.js';
import { sanitizeLogin } from './sanitizeLogin.js';

const router = Router();

router.post('/login', sanitizeLogin, async (req, res) => {
  try {
    const { usuario, contraseña } = (req as any).body.sanitizedInput || {};
    if (!usuario || !contraseña) return res.status(400).json({ error: 'Faltan credenciales' });

    const rows = await dbQuery<any>(
      'SELECT id, `usuario`, `contraseña` AS `password_db`, `rol`, `is_active` FROM `usuario` WHERE `usuario` = ? AND `is_active` = 1',
      [usuario]
    );
    const u = rows[0];
    if (!u) {
      console.warn('[login] usuario no encontrado o inactivo:', usuario);
      return res.status(401).json({
        error: 'Usuario o contraseña inválidos',
        ...(process.env.NODE_ENV !== 'production' ? { reason: 'not_found' } : {}),
      });
    }

    const hashOrPassword = String(u.password_db ?? '');
    const looksLikeBcrypt = /^\$2[aby]\$/.test(hashOrPassword);
    const ok = looksLikeBcrypt
      ? await bcrypt.compare(contraseña, hashOrPassword)
      : contraseña === hashOrPassword;
    if (!ok) {
      console.warn('[login] contraseña inválida para usuario:', usuario);
      return res.status(401).json({
        error: 'Usuario o contraseña inválidos',
        ...(process.env.NODE_ENV !== 'production' ? { reason: 'bad_password' } : {}),
      });
    }

    const payload = { id: Number(u.id), rol: String(u.rol), usuario: String(u.usuario) };
    const secret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'supersecret';
    const signOptions: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '12h') as any,
    };

    const token = jwt.sign(payload, secret, signOptions);
    return res.json({ token });
  } catch (err: any) {
    console.error('[login] error:', err);
    return res.status(500).json({ error: 'Error interno', details: err?.message });
  }
});

export default router;


