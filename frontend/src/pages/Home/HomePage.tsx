import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function HomePage() {
  const { logout } = useAuth();

  return (
    <div className="container">
      <h1>Inicio</h1>
      <nav>
        <Link to="/planillas">Planillas</Link>
        <button onClick={logout}>Salir</button>
      </nav>
      <div className="card">
        <p>Frontend inicial listo: login + navegación.</p>
        <p>Próximo: pantalla de edición de planilla (recorridos + efectivo).</p>
      </div>
    </div>
  );
}
