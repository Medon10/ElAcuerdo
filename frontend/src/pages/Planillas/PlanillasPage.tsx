import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../api/client';

import './PlanillasPage.css';

type Planilla = {
  id: number;
  numero_coche?: string;
  fecha_hora_planilla?: string;
  total_recorrido?: number;
  total_efectivo?: number;
  diferencia?: number;
  status?: string;
};

export default function PlanillasPage() {
  const api = useApi();
  const [data, setData] = useState<Planilla[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<{ data: Planilla[] }>('/planillas')
      .then((res: { data: Planilla[] }) => {
        if (!mounted) return;
        setData(res.data || []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Error al cargar planillas');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const total = data.length;

  return (
    <div className="PlanillasPage">
      <header className="PlanillasPage__header">
        <h1 className="PlanillasPage__title">Planillas</h1>
        <Link className="PlanillasPage__back" to="/">
          Volver
        </Link>
      </header>

      {error && <div className="PlanillasPage__error">{error}</div>}

      <div className="PlanillasPage__card">
        <div className="PlanillasPage__cardHeader">
          <div className="PlanillasPage__muted">Listado (chofer)</div>
          <div className="PlanillasPage__muted">Total: {total}</div>
        </div>

        {data.length === 0 ? (
          <div className="PlanillasPage__empty">No hay planillas.</div>
        ) : (
          <div className="PlanillasPage__tableWrap">
            <table className="PlanillasPage__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Coche</th>
                  <th>Fecha</th>
                  <th>Tot. recorrido</th>
                  <th>Tot. efectivo</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="PlanillasPage__mono">{p.id}</td>
                    <td className="PlanillasPage__mono">{p.numero_coche ?? '-'}</td>
                    <td className="PlanillasPage__mono">{p.fecha_hora_planilla ?? '-'}</td>
                    <td className="PlanillasPage__mono">{p.total_recorrido ?? '-'}</td>
                    <td className="PlanillasPage__mono">{p.total_efectivo ?? '-'}</td>
                    <td className="PlanillasPage__mono">{p.diferencia ?? '-'}</td>
                    <td>
                      <span
                        className={`PlanillasPage__status PlanillasPage__status--${(p.status || 'enviado').toLowerCase()}`}
                      >
                        {p.status ?? 'enviado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
