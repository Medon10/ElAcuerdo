import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, LogIn, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

import './LoginPage.css';

type LoginResponse = { token: string };

export default function LoginPage() {
  const nav = useNavigate();
  const { setToken } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { usuario, contraseña },
      });
      setToken(res.token);
      nav('/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="LoginPage">
      <div className="LoginPage__card">
        <div className="LoginPage__header">
          <div className="LoginPage__logo">
            <Bus className="LoginPage__logoIcon" />
          </div>
          <h1 className="LoginPage__title">El Acuerdo S.A.</h1>
          <p className="LoginPage__subtitle">Sistema de Recaudación Digital</p>
        </div>

        <form onSubmit={onSubmit} className="LoginPage__form">
          <div>
            <label className="LoginPage__label">Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="LoginPage__input"
              placeholder="Ej. juanperez"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="LoginPage__label">Contraseña</label>
            <div className="LoginPage__passwordWrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                className="LoginPage__input LoginPage__input--withButton"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="LoginPage__passwordToggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="LoginPage__passwordToggleIcon" />
                ) : (
                  <Eye className="LoginPage__passwordToggleIcon" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="LoginPage__error" role="alert">
              <AlertTriangle className="LoginPage__errorIcon" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!usuario || !contraseña || loading}
            className="LoginPage__submit"
          >
            <LogIn className="LoginPage__submitIcon" />
            {loading ? 'Ingresando…' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
