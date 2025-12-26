import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, Bus, CheckCircle, FileText, LogOut, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../api/client';

import './DashboardPage.css';

const BILLETES = [
  { valor: 20000, label: '$20.000' },
  { valor: 10000, label: '$10.000' },
  { valor: 2000, label: '$2.000' },
  { valor: 1000, label: '$1.000' },
  { valor: 500, label: '$500' },
  { valor: 200, label: '$200' },
  { valor: 100, label: '$100' },
  {valor: 50, label: '$50' },
];

type RecorridoDTO = {
  id: number;
  horario?: string | null;
  numero_recorrido?: string | null;
  importe: number;
};

type PlanillaEfectivoDTO = {
  id: number;
  denominacion: number;
  cantidad: number;
  subtotal: number;
};

type PlanillaDTO = {
  id: number;
  numero_coche: string;
  fecha_hora_planilla?: string;
  total_recorrido: number;
  total_efectivo: number;
  diferencia?: number;
  status?: string;
  comentarios?: string | null;
  chofer?: { id: number; usuario?: string; nombre?: string; apellido?: string };
  recorridos?: RecorridoDTO[] | { items?: RecorridoDTO[] };
  efectivos?: PlanillaEfectivoDTO[] | { items?: PlanillaEfectivoDTO[] };
};

function toNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyARS(value: unknown) {
  return `$${toNumber(value).toLocaleString('es-AR')}`;
}

function toLocalISODateString(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function extractArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  const items = (v as any)?.items;
  if (Array.isArray(items)) return items as T[];
  return [];
}

function formatChoferLabel(c?: { nombre?: string; apellido?: string; usuario?: string; id?: number }) {
  const full = [c?.nombre, c?.apellido].filter(Boolean).join(' ').trim();
  return full || c?.usuario || (c?.id ? `ID ${c.id}` : '');
}

function formatPlanillaStatus(status?: string) {
  if (!status) return '';
  if (status === 'enviado') return 'Enviado';
  if (status === 'revisado') return 'Revisado';
  if (status === 'rechazado') return 'Rechazado';
  return status;
}

export default function DashboardPage() {
  const { payload } = useAuth();
  const role = payload?.rol === 'admin' ? 'supervisor' : 'driver';

  return (
    <div className="DashboardPage">
      <Navbar role={role} />
      <main className="DashboardPage__main">{role === 'driver' ? <DriverDashboard /> : <SupervisorDashboard />}</main>
    </div>
  );
}

function Navbar({ role }: { role: 'driver' | 'supervisor' }) {
  const { payload, logout } = useAuth();
  const name = payload?.usuario || payload?.nombre || 'Usuario';

  return (
    <nav className="DashboardPage__navbar">
      <div className="DashboardPage__navbarInner">
        <div className="DashboardPage__brand">
          <div className="DashboardPage__brandBadge">
            <Bus className="DashboardPage__brandIcon" />
          </div>
          <span className="DashboardPage__brandText">El Acuerdo S.A.</span>
        </div>

        <div className="DashboardPage__navRight">
          <div className="DashboardPage__user">
            <p className="DashboardPage__userName">{name}</p>
            <p className="DashboardPage__userRole">{role === 'driver' ? 'Chofer' : 'Supervisor'}</p>
          </div>
          <button onClick={logout} className="DashboardPage__logout" title="Cerrar Sesión">
            <LogOut className="DashboardPage__logoutIcon" />
          </button>
        </div>
      </div>
    </nav>
  );
}

function DriverDashboard() {
  // El chofer NO ve histórico de planillas.
  return <DailyReportForm />;
}

function DailyReportForm() {
  const api = useApi();
  const [coche, setCoche] = useState('');
  const [routes, setRoutes] = useState([{ id: 1, time: '', routeId: '', amount: '' }]);
  const [cashCounts, setCashCounts] = useState(() =>
    BILLETES.reduce((acc, b) => ({ ...acc, [b.valor]: 0 }), {} as Record<number, number>)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalRoutes = useMemo(() => routes.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0), [routes]);
  const totalCash = useMemo(
    () => Object.entries(cashCounts).reduce((sum, [valor, cantidad]) => sum + Number(valor) * (Number(cantidad) || 0), 0),
    [cashCounts]
  );

  const difference = totalRoutes - totalCash;
  const isBalanced = Math.abs(difference) === 0;
  const absDifference = Math.abs(difference);
  const balanceLabel = isBalanced
    ? 'Cuadra'
    : difference > 0
      ? `Faltan $${absDifference.toLocaleString('es-AR')}`
      : `Sobra $${absDifference.toLocaleString('es-AR')}`;

  const handleRouteChange = (id: number, field: 'time' | 'routeId' | 'amount', value: string) => {
    setSuccess(null);
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRouteRow = () => {
    setSuccess(null);
    setRoutes((prev) => [...prev, { id: Date.now(), time: '', routeId: '', amount: '' }]);
  };

  const removeRouteRow = (id: number) => {
    setSuccess(null);
    if (routes.length > 1) setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCashChange = (valor: number, cantidad: string) => {
    setSuccess(null);
    setCashCounts((prev) => ({ ...prev, [valor]: parseInt(cantidad) || 0 }));
  };

  const handleSubmit = async () => {
    if (!coche) return setError('Falta el número de coche');
    if (routes.some((r) => !r.amount)) return setError('Faltan importes en la planilla');
    // Si el arqueo no cuadra, se muestra aviso y se envía igual.

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const recorridos = routes
        .map((r) => ({
          horario: r.time?.trim() || null,
          numero_recorrido: r.routeId?.trim() || null,
          importe: Number(r.amount) || 0,
        }))
        .filter((r) => r.importe > 0);

      const efectivos = BILLETES
        .map((b) => ({
          denominacion: b.valor,
          cantidad: Number(cashCounts[b.valor] || 0),
        }))
        .filter((e) => e.cantidad > 0);

      const res = await api.post<{ message?: string; data?: { id?: number; total_recorrido?: number; total_efectivo?: number; diferencia?: number } }>(
        `/planillas/submit`,
        {
        numero_coche: coche,
        recorridos,
        efectivos,
        }
      );

      const id = res?.data?.id;
      const totalR = typeof res?.data?.total_recorrido !== 'undefined' ? res.data.total_recorrido : totalRoutes;
      const totalE = typeof res?.data?.total_efectivo !== 'undefined' ? res.data.total_efectivo : totalCash;
      const diff = typeof res?.data?.diferencia !== 'undefined' ? res.data.diferencia : totalR - totalE;
      const abs = Math.abs(toNumber(diff));
      const arqueo = abs === 0 ? 'Cuadra' : toNumber(diff) > 0 ? `Faltan ${formatMoneyARS(abs)}` : `Sobra ${formatMoneyARS(abs)}`;

      const baseMsg = res?.message || 'Planilla enviada';
      setSuccess(`${baseMsg}${id ? ` (ID ${id})` : ''} • Total: ${formatMoneyARS(totalR)} • Efectivo: ${formatMoneyARS(totalE)} • ${arqueo}`);

      setCoche('');
      setRoutes([{ id: 1, time: '', routeId: '', amount: '' }]);
      setCashCounts(BILLETES.reduce((acc, b) => ({ ...acc, [b.valor]: 0 }), {} as Record<number, number>));
    } catch (e: any) {
      setError(e?.message || 'Error al guardar. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="DashboardPage__grid">
      <div className="DashboardPage__card">
        <h2 className="DashboardPage__sectionTitle">
          <FileText className="DashboardPage__sectionIcon DashboardPage__sectionIcon--blue" /> Planilla de Viajes
        </h2>

        <div className="DashboardPage__field">
          <label className="DashboardPage__fieldLabel">N° Coche</label>
          <input
            type="number"
            value={coche}
            onChange={(e) => {
              setSuccess(null);
              setCoche(e.target.value);
            }}
            className="DashboardPage__input DashboardPage__input--mono DashboardPage__input--lg"
            placeholder="00"
          />
        </div>

        <div className="DashboardPage__routes">
          {routes.map((route) => (
            <div key={route.id} className="DashboardPage__routeRow">
              <div className="DashboardPage__routeCol DashboardPage__routeCol--time">
                <label className="DashboardPage__miniLabel">Hora</label>
                <input
                  type="text"
                  placeholder="06:30"
                  value={route.time}
                  onChange={(e) => handleRouteChange(route.id, 'time', e.target.value)}
                  className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--center"
                />
              </div>
              <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                <label className="DashboardPage__miniLabel">Recorrido</label>
                <input
                  type="text"
                  placeholder="0301"
                  value={route.routeId}
                  onChange={(e) => handleRouteChange(route.id, 'routeId', e.target.value)}
                  className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--center"
                />
              </div>
              <div className="DashboardPage__routeCol DashboardPage__routeCol--amount">
                <label className="DashboardPage__miniLabel">Importe ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={route.amount}
                  onChange={(e) => handleRouteChange(route.id, 'amount', e.target.value)}
                  className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--right DashboardPage__input--mono"
                />
              </div>
              <button onClick={() => removeRouteRow(route.id)} className="DashboardPage__removeRow" title="Eliminar fila">
                <Trash2 className="DashboardPage__removeRowIcon" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addRouteRow} className="DashboardPage__addRow">
          <Plus className="DashboardPage__addRowIcon" /> Agregar Viaje
        </button>

        <div className="DashboardPage__totalRow">
          <span className="DashboardPage__totalLabel">Total Planilla:</span>
          <span className="DashboardPage__totalValue DashboardPage__totalValue--blue">${totalRoutes.toLocaleString('es-AR')}</span>
        </div>
      </div>

      <div className="DashboardPage__rightCol">
        <div className="DashboardPage__card DashboardPage__card--grow">
          <h2 className="DashboardPage__sectionTitle">
            <Banknote className="DashboardPage__sectionIcon DashboardPage__sectionIcon--red" /> Arqueo de Billetes
          </h2>

          <div className="DashboardPage__cash">
            <div className="DashboardPage__cashHeader">
              <span>Billete</span>
              <span className="DashboardPage__center">Cant.</span>
              <span className="DashboardPage__right">Subtotal</span>
            </div>
            {BILLETES.map((b) => (
              <div key={b.valor} className="DashboardPage__cashRow">
                <span className="DashboardPage__mono">{b.label}</span>
                <input
                  type="number"
                  min="0"
                  value={cashCounts[b.valor] || ''}
                  onChange={(e) => handleCashChange(b.valor, e.target.value)}
                  className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--center"
                  placeholder="0"
                />
                <span className="DashboardPage__mono DashboardPage__right DashboardPage__muted">
                  ${(b.valor * (cashCounts[b.valor] || 0)).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>

          <div className="DashboardPage__totalRow">
            <span className="DashboardPage__totalLabel">Total Efectivo:</span>
            <span className="DashboardPage__totalValue DashboardPage__totalValue--red">${totalCash.toLocaleString('es-AR')}</span>
          </div>
        </div>

        <div className={`DashboardPage__balance ${isBalanced ? 'is-balanced' : 'is-unbalanced'}`}>
          <div className="DashboardPage__balanceRow">
            <span className="DashboardPage__totalLabel">Arqueo:</span>
            <span className={`DashboardPage__balanceValue ${isBalanced ? 'is-ok' : 'is-bad'}`}>{balanceLabel}</span>
          </div>

          {!isBalanced && (
            <div className="DashboardPage__inlineError" role="note">
              <AlertTriangle className="DashboardPage__inlineErrorIcon" />
              <span>Se enviará igual aunque no coincida.</span>
            </div>
          )}

          {error && (
            <div className="DashboardPage__inlineError" role="alert">
              <AlertTriangle className="DashboardPage__inlineErrorIcon" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="DashboardPage__muted" role="status" style={{ marginBottom: 10 }}>
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || totalRoutes === 0}
            className={`DashboardPage__submit ${totalRoutes > 0 && !isSubmitting ? 'is-enabled' : 'is-disabled'}`}
          >
            {isSubmitting ? (
              'Enviando...'
            ) : (
              <>
                <CheckCircle className="DashboardPage__submitIcon" /> Confirmar y Enviar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SupervisorDashboard() {
  const api = useApi();
  const [choferes, setChoferes] = useState<Array<{ id: number; usuario?: string; nombre?: string; apellido?: string }>>([]);
  const [choferId, setChoferId] = useState<string>('');
  const [fecha, setFecha] = useState<string>(() => toLocalISODateString(new Date()));
  const [loading, setLoading] = useState(false);
  const [totalDiaLoading, setTotalDiaLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDiaError, setTotalDiaError] = useState<string | null>(null);
  const [planilla, setPlanilla] = useState<PlanillaDTO | null>(null);
  const [totalDiaValue, setTotalDiaValue] = useState<number>(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setError(null);
    api
      .get<{ data: Array<{ id: number; usuario?: string; nombre?: string; apellido?: string }> }>(
        '/usuarios/choferes'
      )
      .then((res) => {
        if (!mounted) return;
        setChoferes(res.data || []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Error al cargar choferes');
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setPlanilla(null);
    setConfirmDeleteOpen(false);

    if (!choferId || !fecha) return;

    setLoading(true);
    api
      .get<{ data: PlanillaDTO | null }>(
        `/planillas/por-chofer-fecha?choferId=${encodeURIComponent(choferId)}&fecha=${encodeURIComponent(fecha)}`
      )
      .then((res) => {
        if (!mounted) return;
        setError(null);
        setPlanilla(res.data || null);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Error al buscar planilla');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [choferId, fecha]);

  useEffect(() => {
    let mounted = true;
    setTotalDiaError(null);

    if (!fecha) {
      setTotalDiaValue(0);
      setTotalDiaLoading(false);
      return;
    }

    setTotalDiaLoading(true);
    api
      .get<{ data: Array<{ fecha_hora_planilla?: string; total_recorrido?: unknown }> }>(`/planillas`)
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res?.data) ? res.data : [];
        const sum = items.reduce((acc, p) => {
          const iso = toLocalISODateString(p?.fecha_hora_planilla);
          if (iso !== fecha) return acc;
          return acc + toNumber(p?.total_recorrido);
        }, 0);
        setTotalDiaValue(sum);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setTotalDiaValue(0);
        setTotalDiaError(e?.message || 'Error al calcular total del día');
      })
      .finally(() => {
        if (!mounted) return;
        setTotalDiaLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [fecha]);

  const planillaRecorridos = useMemo(() => extractArray<RecorridoDTO>(planilla?.recorridos), [planilla]);
  const planillaEfectivos = useMemo(() => extractArray<PlanillaEfectivoDTO>(planilla?.efectivos), [planilla]);
  const diff = useMemo(() => {
    if (!planilla) return 0;
    // Prefer backend-computed diferencia, but fall back to totals.
    const fromField = planilla.diferencia;
    if (typeof fromField !== 'undefined') return toNumber(fromField);
    return toNumber(planilla.total_recorrido) - toNumber(planilla.total_efectivo);
  }, [planilla]);

  const balanceLabel = useMemo(() => {
    if (!planilla) return '';
    if (Math.abs(diff) === 0) return 'Cuadra';
    const abs = Math.abs(diff);
    return diff > 0 ? `Faltan ${formatMoneyARS(abs)}` : `Sobra ${formatMoneyARS(abs)}`;
  }, [planilla, diff]);

  const totalDia = useMemo(() => {
    // Fallback: si el endpoint /total-dia falla o no existe, mostrar el total de la planilla cargada.
    const planillaTotal = toNumber(planilla?.total_recorrido);
    if (planillaTotal > 0 && toNumber(totalDiaValue) === 0) return formatMoneyARS(planillaTotal);
    return formatMoneyARS(totalDiaValue);
  }, [planilla, totalDiaValue]);

  const totalDiaDisplay = useMemo(() => {
    // Evitar que quede "..." si ya tenemos un total para mostrar.
    if (totalDiaLoading) {
      const planillaTotal = toNumber(planilla?.total_recorrido);
      if (toNumber(totalDiaValue) > 0 || planillaTotal > 0) return totalDia;
      return '...';
    }
    return totalDia;
  }, [planilla, totalDia, totalDiaLoading, totalDiaValue]);

  const handleDeletePlanilla = async () => {
    if (!planilla?.id) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/planillas/${planilla.id}`);
      setPlanilla(null);
      setConfirmDeleteOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Error al eliminar planilla');
    } finally {
      setDeleting(false);
    }
  };

  // No mezclar errores de total-dia con errores de búsqueda de planilla.
  const visibleError = error;

  return (
    <div className="DashboardPage__stack">
      <div className="DashboardPage__card DashboardPage__card--padLg">
        <div className="DashboardPage__superHeader">
          <div>
            <h2 className="DashboardPage__h2">Panel de Control</h2>
            <p className="DashboardPage__muted">Resumen de recaudación</p>
          </div>
          <div className="DashboardPage__superTotal">
            <p className="DashboardPage__superTotalLabel">Total Recaudado (Día)</p>
            <p className="DashboardPage__superTotalValue">{totalDiaDisplay}</p>
          </div>
        </div>
      </div>

      <div className="DashboardPage__card DashboardPage__card--tight">
        <div className="DashboardPage__padLg">
          <div className="DashboardPage__adminFilters">
            <div>
              <label className="DashboardPage__fieldLabel">Chofer</label>
              <select
                className="DashboardPage__input"
                value={choferId}
                onChange={(e) => setChoferId(e.target.value)}
              >
                <option value="">Seleccionar chofer</option>
                {choferes.map((c) => {
                  const label = [c.nombre, c.apellido].filter(Boolean).join(' ').trim() || c.usuario || `ID ${c.id}`;
                  return (
                    <option key={c.id} value={String(c.id)}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="DashboardPage__fieldLabel">Fecha</label>
              <input
                type="date"
                className="DashboardPage__input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          {visibleError && (
            <div className="DashboardPage__inlineError" role="alert" style={{ marginTop: 12 }}>
              <AlertTriangle className="DashboardPage__inlineErrorIcon" />
              <span>{visibleError}</span>
            </div>
          )}

          {loading && <div className="DashboardPage__muted" style={{ marginTop: 12 }}>Buscando...</div>}

          {!loading && choferId && fecha && !planilla && !error && (
            <div className="DashboardPage__muted" style={{ marginTop: 12 }}>No hay planilla para esa fecha.</div>
          )}

          {planilla && (
            <div style={{ marginTop: 16 }}>
              <div className="DashboardPage__muted" style={{ marginBottom: 10 }}>
                {planilla.chofer ? `Chofer: ${formatChoferLabel(planilla.chofer)}` : ''}
                {planilla.status ? ` • Estado: ${formatPlanillaStatus(planilla.status)}` : ''}
                {planilla.fecha_hora_planilla
                  ? ` • ${new Date(planilla.fecha_hora_planilla).toLocaleString('es-AR')}`
                  : ''}
              </div>

              {!confirmDeleteOpen ? (
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={loading || deleting}
                  className="DashboardPage__removeRow"
                  style={{ marginLeft: 0, marginBottom: 12, padding: '8px 10px', width: 'fit-content' }}
                  title="Eliminar planilla"
                >
                  <Trash2 className="DashboardPage__removeRowIcon" />
                  <span style={{ marginLeft: 8, fontWeight: 800 }}>Eliminar planilla</span>
                </button>
              ) : (
                <div
                  className="DashboardPage__inlineError"
                  role="alert"
                  style={{ marginTop: 0, marginBottom: 12, alignItems: 'center' }}
                >
                  <AlertTriangle className="DashboardPage__inlineErrorIcon" />
                  <span style={{ flex: 1 }}>¿Eliminar esta planilla? Esta acción no se puede deshacer.</span>
                  <div style={{ display: 'inline-flex', gap: 8 }}>
                    <button
                      type="button"
                      className="DashboardPage__tab"
                      onClick={() => setConfirmDeleteOpen(false)}
                      disabled={deleting}
                      style={{ padding: '8px 10px' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="DashboardPage__removeRow"
                      onClick={handleDeletePlanilla}
                      disabled={deleting}
                      style={{ padding: '8px 10px', width: 'fit-content' }}
                      title="Confirmar eliminación"
                    >
                      <Trash2 className="DashboardPage__removeRowIcon" />
                      <span style={{ marginLeft: 8, fontWeight: 800 }}>{deleting ? 'Eliminando…' : 'Eliminar'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="DashboardPage__totalRow" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                <span className="DashboardPage__totalLabel">Coche:</span>
                <span className="DashboardPage__totalValue DashboardPage__totalValue--blue">{planilla.numero_coche}</span>
              </div>

              <div className="DashboardPage__totalRow">
                <span className="DashboardPage__totalLabel">Total recorrido:</span>
                <span className="DashboardPage__totalValue DashboardPage__totalValue--blue">
                  {formatMoneyARS(planilla.total_recorrido || 0)}
                </span>
              </div>

              <div className="DashboardPage__totalRow">
                <span className="DashboardPage__totalLabel">Total efectivo:</span>
                <span className="DashboardPage__totalValue DashboardPage__totalValue--red">
                  {formatMoneyARS(planilla.total_efectivo || 0)}
                </span>
              </div>

              <div className="DashboardPage__totalRow">
                <span className="DashboardPage__totalLabel">Arqueo:</span>
                <span className="DashboardPage__mono">{balanceLabel}</span>
              </div>

              {planillaRecorridos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="DashboardPage__fieldLabel">Recorridos</div>
                  <div className="DashboardPage__routes" style={{ maxHeight: 260 }}>
                    {planillaRecorridos.map((r) => (
                      <div key={r.id} className="DashboardPage__routeRow">
                        <div className="DashboardPage__routeCol DashboardPage__routeCol--time">
                          <div className="DashboardPage__miniLabel">Hora</div>
                          <div className="DashboardPage__mono">{r.horario || '-'}</div>
                        </div>
                        <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                          <div className="DashboardPage__miniLabel">Recorrido</div>
                          <div className="DashboardPage__mono">{r.numero_recorrido || '-'}</div>
                        </div>
                        <div className="DashboardPage__routeCol DashboardPage__routeCol--amount">
                          <div className="DashboardPage__miniLabel">Importe</div>
                          <div className="DashboardPage__mono" style={{ textAlign: 'left' }}>
                            {formatMoneyARS(r.importe || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {planillaEfectivos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="DashboardPage__fieldLabel">Efectivo</div>
                  <div className="DashboardPage__cash" style={{ marginTop: 8 }}>
                    <div className="DashboardPage__cashHeader">
                      <span>Billete</span>
                      <span>Cant.</span>
                      <span>Subtotal</span>
                    </div>
                    {planillaEfectivos.map((e) => (
                      <div key={e.id} className="DashboardPage__cashRow">
                        <span className="DashboardPage__mono">${Number(e.denominacion).toLocaleString('es-AR')}</span>
                        <span className="DashboardPage__mono">{e.cantidad}</span>
                        <span className="DashboardPage__mono DashboardPage__muted">
                          {formatMoneyARS(e.subtotal || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {planilla.comentarios && (
                <div style={{ marginTop: 16 }}>
                  <div className="DashboardPage__fieldLabel">Comentarios</div>
                  <div className="DashboardPage__muted">{planilla.comentarios}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
