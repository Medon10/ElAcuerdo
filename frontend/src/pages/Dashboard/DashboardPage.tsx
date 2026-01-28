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
  discap_nombre?: string | null;
  discap_apellido?: string | null;
  discap_dni?: string | null;
};

type DiscapProgramadoDTO = {
  id: number;
  fecha: string;
  horario?: string | null;
  numero_recorrido?: string | null;
  discap_nombre?: string | null;
  discap_apellido?: string | null;
  discap_dni?: string | null;
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

function formatDateTimeAR(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour12: false,
  });
}

function formatTimeAR(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
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
  const { payload } = useAuth();

  const todayISO = useMemo(() => toLocalISODateString(new Date()), []);

  const draftKey = useMemo(() => {
    const userId = payload?.id;
    if (!userId) return null;
    return `elAcuerdo.planillaDraft.v1.${userId}.${todayISO}`;
  }, [payload?.id, todayISO]);

  type DraftV1 = {
    v: 1;
    updatedAt: string;
    coche: string;
    routes: Array<{ id: number; time: string; routeId: string; amount: string }>;
    cashCounts: Record<number, number>;
  };

  const [coche, setCoche] = useState('');
  const [routes, setRoutes] = useState([{ id: 1, time: '', routeId: '', amount: '' }]);
  const [cashCounts, setCashCounts] = useState(() =>
    BILLETES.reduce((acc, b) => ({ ...acc, [b.valor]: 0 }), {} as Record<number, number>)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [discapProgramados, setDiscapProgramados] = useState<DiscapProgramadoDTO[]>([]);

  const normalizeHorario = (raw: string) => {
    const s = (raw || '').trim();
    const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(s);
    if (!m) return s;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return s;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return s;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const formatDiscap = (d: DiscapProgramadoDTO) => {
    const full = [d.discap_nombre, d.discap_apellido].filter(Boolean).join(' ').trim();
    if (!full && !d.discap_dni) return '';
    return `${full}${d.discap_dni ? ` (${d.discap_dni})` : ''}`.trim();
  };

  const discapListForDay = useMemo(() => {
    const items = Array.isArray(discapProgramados) ? [...discapProgramados] : [];
    items.sort((a, b) => {
      const ha = normalizeHorario(String(a.horario || ''));
      const hb = normalizeHorario(String(b.horario || ''));
      return ha.localeCompare(hb);
    });
    return items;
  }, [discapProgramados]);

  const findDiscapForRow = (row: { time: string; routeId: string }) => {
    const keyH = normalizeHorario(row.time);
    const keyR = (row.routeId || '').trim();
    if (!keyH || !keyR) return null;
    const found = discapProgramados.find(
      (d) => normalizeHorario(String(d.horario || '')) === keyH && String(d.numero_recorrido || '').trim() === keyR
    );
    return found || null;
  };

  // Traer pre-asignaciones del día (para mostrar al chofer qué recorridos tienen discapacitado asignado).
  useEffect(() => {
    let mounted = true;
    api
      .get<{ data: DiscapProgramadoDTO[] }>(`/discap-programados/por-fecha?fecha=${encodeURIComponent(todayISO)}`)
      .then((res) => {
        if (!mounted) return;
        setDiscapProgramados(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setDiscapProgramados([]);
      });
    return () => {
      mounted = false;
    };
  }, [todayISO]);

  // Restore draft (if any) when opening the page.
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const data = JSON.parse(raw) as DraftV1;
      if (!data || data.v !== 1) return;

      if (typeof data.coche === 'string') setCoche(data.coche);

      if (Array.isArray(data.routes) && data.routes.length > 0) {
        setRoutes(
          data.routes.map((r, idx) => ({
            id: Number.isFinite(Number(r?.id)) ? Number(r.id) : Date.now() + idx,
            time: typeof r?.time === 'string' ? r.time : '',
            routeId: typeof r?.routeId === 'string' ? r.routeId : '',
            amount: typeof r?.amount === 'string' ? r.amount : '',
          }))
        );
      }

      if (data.cashCounts && typeof data.cashCounts === 'object') {
        setCashCounts((prev) => {
          const next = { ...prev };
          for (const b of BILLETES) {
            const v = (data.cashCounts as any)[b.valor];
            next[b.valor] = Math.max(0, Math.trunc(toNumber(v)));
          }
          return next;
        });
      }
    } catch {
      // ignore draft parse errors
    }
  }, [draftKey]);

  // Auto-save draft so it survives reload/closing the page.
  useEffect(() => {
    if (!draftKey) return;
    const t = setTimeout(() => {
      try {
        const payloadToSave: DraftV1 = {
          v: 1,
          updatedAt: new Date().toISOString(),
          coche,
          routes,
          cashCounts,
        };
        localStorage.setItem(draftKey, JSON.stringify(payloadToSave));
      } catch {
        // ignore quota / serialization errors
      }
    }, 400);
    return () => clearTimeout(t);
  }, [draftKey, coche, routes, cashCounts]);

  const routeMeta = useMemo(() => {
    let total = 0;
    let partialCount = 0;
    let emptyCount = 0;

    const valid = [] as Array<{ horario: string; numero_recorrido: string; importe: number }>;

    for (const r of routes) {
      const time = (r.time || '').trim();
      const routeId = (r.routeId || '').trim();
      const amountStr = (r.amount || '').trim();
      const amount = toNumber(amountStr);

      const anyFilled = Boolean(time || routeId || amountStr);
      if (!anyFilled) {
        emptyCount++;
        continue;
      }

      const isComplete = Boolean(time && routeId && amount > 0);
      if (!isComplete) {
        partialCount++;
        continue;
      }

      total += amount;
      valid.push({ horario: time, numero_recorrido: routeId, importe: amount });
    }

    return { total, partialCount, emptyCount, valid };
  }, [routes]);

  const totalRoutes = routeMeta.total;
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
    setWarning(null);
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRouteRow = () => {
    setSuccess(null);
    setWarning(null);
    setRoutes((prev) => [...prev, { id: Date.now(), time: '', routeId: '', amount: '' }]);
  };

  const removeRouteRow = (id: number) => {
    setSuccess(null);
    setWarning(null);
    if (routes.length > 1) setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCashChange = (valor: number, cantidad: string) => {
    setSuccess(null);
    setWarning(null);
    setCashCounts((prev) => ({ ...prev, [valor]: parseInt(cantidad) || 0 }));
  };

  const handleSubmit = async () => {
    if (!coche) return setError('Falta el número de coche');

    const recorridos = routeMeta.valid;
    if (recorridos.length === 0) {
      return setError('Cargá al menos un viaje completo (Hora, Recorrido e Importe).');
    }

    if (routeMeta.partialCount > 0) {
      setWarning(`Aviso: se ignorarán ${routeMeta.partialCount} viaje(s) incompleto(s) al enviar.`);
    } else {
      setWarning(null);
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
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
      const ignoredMsg = routeMeta.partialCount > 0 ? ` • Ignoradas: ${routeMeta.partialCount} incompleta(s)` : '';
      setSuccess(`${baseMsg} • Total: ${formatMoneyARS(totalR)} • Efectivo: ${formatMoneyARS(totalE)} • ${arqueo}${ignoredMsg}`);

      setCoche('');
      setRoutes([{ id: 1, time: '', routeId: '', amount: '' }]);
      setCashCounts(BILLETES.reduce((acc, b) => ({ ...acc, [b.valor]: 0 }), {} as Record<number, number>));

      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
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

        {discapListForDay.length > 0 && (
          <div className="DashboardPage__inlineError" role="note" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
            <AlertTriangle className="DashboardPage__inlineErrorIcon" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Discapacitados programados hoy</div>
              <div style={{ display: 'grid', gap: 4 }}>
                {discapListForDay.map((d) => {
                  const when = normalizeHorario(String(d.horario || '')) || '-';
                  const rec = String(d.numero_recorrido || '').trim() || '-';
                  const label = formatDiscap(d);
                  return (
                    <div key={d.id} className="DashboardPage__mono" style={{ fontSize: 12 }}>
                      {when} • {rec} • {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="DashboardPage__field">
          <label className="DashboardPage__fieldLabel">N° Coche</label>
          <input
            type="number"
            value={coche}
            onChange={(e) => {
              setSuccess(null);
              setWarning(null);
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
                  placeholder=""
                  value={route.time}
                  onChange={(e) => handleRouteChange(route.id, 'time', e.target.value)}
                  className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--center"
                />
              </div>
              <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                <label className="DashboardPage__miniLabel">Recorrido</label>
                <input
                  type="text"
                  placeholder=""
                  value={route.routeId}
                  onChange={(e) => handleRouteChange(route.id, 'routeId', e.target.value)}
                  className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--center"
                />
              </div>
              <div className="DashboardPage__routeCol DashboardPage__routeCol--amount">
                <label className="DashboardPage__miniLabel">Importe ($)</label>
                <input
                  type="number"
                  placeholder=""
                  value={route.amount}
                  onChange={(e) => handleRouteChange(route.id, 'amount', e.target.value)}
                  className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--right DashboardPage__input--mono"
                />

                {(() => {
                  const d = findDiscapForRow(route);
                  const label = d ? formatDiscap(d) : '';
                  if (!label) return null;
                  return (
                    <div className="DashboardPage__muted" style={{ marginTop: 6, fontSize: 12 }}>
                      Discapacitado asignado: <span className="DashboardPage__mono">{label}</span>
                    </div>
                  );
                })()}
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

          {warning && (
            <div className="DashboardPage__inlineError" role="note">
              <AlertTriangle className="DashboardPage__inlineErrorIcon" />
              <span>{warning}</span>
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
  const [planillas, setPlanillas] = useState<PlanillaDTO[]>([]);
  const [selectedPlanillaId, setSelectedPlanillaId] = useState<string>('');
  const [totalDiaValue, setTotalDiaValue] = useState<number>(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingDiscapId, setEditingDiscapId] = useState<number | null>(null);
  const [discapDraft, setDiscapDraft] = useState({ nombre: '', apellido: '', dni: '' });
  const [discapSavingId, setDiscapSavingId] = useState<number | null>(null);
  const [discapError, setDiscapError] = useState<string | null>(null);

  const [discapProgramados, setDiscapProgramados] = useState<DiscapProgramadoDTO[]>([]);
  const [discapProgLoading, setDiscapProgLoading] = useState(false);
  const [discapProgError, setDiscapProgError] = useState<string | null>(null);
  const [discapProgSaving, setDiscapProgSaving] = useState(false);
  const [discapProgDeletingId, setDiscapProgDeletingId] = useState<number | null>(null);
  const [discapProgEditingId, setDiscapProgEditingId] = useState<number | null>(null);
  const [discapProgDraft, setDiscapProgDraft] = useState({ horario: '', numero_recorrido: '', nombre: '', apellido: '', dni: '' });

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
    setPlanillas([]);
    setSelectedPlanillaId('');
    setConfirmDeleteOpen(false);

    if (!choferId || !fecha) return;

    setLoading(true);
    api
      .get<{ data: PlanillaDTO[] }>(
        `/planillas/por-chofer-fecha?choferId=${encodeURIComponent(choferId)}&fecha=${encodeURIComponent(fecha)}`
      )
      .then((res) => {
        if (!mounted) return;
        setError(null);
        const items = Array.isArray(res?.data) ? res.data : [];
        setPlanillas(items);
        setSelectedPlanillaId(items[0]?.id ? String(items[0].id) : '');
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
    setDiscapProgError(null);
    setDiscapProgramados([]);
    setDiscapProgEditingId(null);
    setDiscapProgDraft({ horario: '', numero_recorrido: '', nombre: '', apellido: '', dni: '' });

    if (!fecha) return;

    setDiscapProgLoading(true);
    api
      .get<{ data: DiscapProgramadoDTO[] }>(`/discap-programados/por-fecha?fecha=${encodeURIComponent(fecha)}`)
      .then((res) => {
        if (!mounted) return;
        setDiscapProgramados(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setDiscapProgError(e?.message || 'Error al cargar discapacitados programados');
      })
      .finally(() => {
        if (!mounted) return;
        setDiscapProgLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [fecha]);

  const planilla = useMemo(() => {
    if (!selectedPlanillaId) return planillas[0] || null;
    const found = planillas.find((p) => String(p?.id) === String(selectedPlanillaId));
    return found || planillas[0] || null;
  }, [planillas, selectedPlanillaId]);

  useEffect(() => {
    setEditingDiscapId(null);
    setDiscapDraft({ nombre: '', apellido: '', dni: '' });
    setDiscapError(null);
  }, [planilla?.id]);

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
      .get<{ data?: { total?: unknown } }>(`/planillas/total-dia?fecha=${encodeURIComponent(fecha)}`)
      .then((res) => {
        if (!mounted) return;
        setTotalDiaValue(toNumber(res?.data?.total));
      })
      .catch(async (e: any) => {
        // Fallback (por compatibilidad): si el endpoint no existe/falla, usar suma local de planillas.
        try {
          const res = await api.get<{ data: Array<{ fecha_hora_planilla?: string; total_recorrido?: unknown }> }>(`/planillas`);
          if (!mounted) return;
          const items = Array.isArray(res?.data) ? res.data : [];
          const sum = items.reduce((acc, p) => {
            const iso = toLocalISODateString(p?.fecha_hora_planilla);
            if (iso !== fecha) return acc;
            return acc + toNumber(p?.total_recorrido);
          }, 0);
          setTotalDiaValue(sum);
        } catch (fallbackErr: any) {
          if (!mounted) return;
          setTotalDiaValue(0);
          setTotalDiaError(fallbackErr?.message || e?.message || 'Error al calcular total del día');
        }
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

  const formatDiscapLabel = (r: RecorridoDTO) => {
    const full = [r.discap_nombre, r.discap_apellido].filter(Boolean).join(' ').trim();
    if (!full && !r.discap_dni) return '-';
    return `${full}${r.discap_dni ? ` (${r.discap_dni})` : ''}`.trim();
  };

  const formatDiscapProgramadoLabel = (d: DiscapProgramadoDTO) => {
    const full = [d.discap_nombre, d.discap_apellido].filter(Boolean).join(' ').trim();
    if (!full && !d.discap_dni) return '-';
    return `${full}${d.discap_dni ? ` (${d.discap_dni})` : ''}`.trim();
  };

  const startEditDiscapProgramado = (d: DiscapProgramadoDTO) => {
    setDiscapProgError(null);
    setDiscapProgEditingId(d.id);
    setDiscapProgDraft({
      horario: String(d.horario || ''),
      numero_recorrido: String(d.numero_recorrido || ''),
      nombre: String(d.discap_nombre || ''),
      apellido: String(d.discap_apellido || ''),
      dni: String(d.discap_dni || ''),
    });
  };

  const cancelEditDiscapProgramado = () => {
    setDiscapProgEditingId(null);
    setDiscapProgDraft({ horario: '', numero_recorrido: '', nombre: '', apellido: '', dni: '' });
  };

  const saveDiscapProgramado = async () => {
    if (!fecha) return;
    setDiscapProgSaving(true);
    setDiscapProgError(null);
    try {
      const payload = {
        fecha,
        horario: discapProgDraft.horario,
        numero_recorrido: discapProgDraft.numero_recorrido,
        discap_nombre: discapProgDraft.nombre.trim() || null,
        discap_apellido: discapProgDraft.apellido.trim() || null,
        discap_dni: discapProgDraft.dni.trim() || null,
      } as any;

      if (discapProgEditingId) {
        await api.patch(`/discap-programados/${discapProgEditingId}`, payload);
      } else {
        await api.post(`/discap-programados`, payload);
      }

      const res = await api.get<{ data: DiscapProgramadoDTO[] }>(`/discap-programados/por-fecha?fecha=${encodeURIComponent(fecha)}`);
      setDiscapProgramados(Array.isArray(res?.data) ? res.data : []);
      cancelEditDiscapProgramado();
    } catch (e: any) {
      setDiscapProgError(e?.message || 'Error al guardar');
    } finally {
      setDiscapProgSaving(false);
    }
  };

  const deleteDiscapProgramado = async (id: number) => {
    setDiscapProgDeletingId(id);
    setDiscapProgError(null);
    try {
      await api.del(`/discap-programados/${id}`);
      setDiscapProgramados((prev) => prev.filter((x) => x.id !== id));
      if (discapProgEditingId === id) cancelEditDiscapProgramado();
    } catch (e: any) {
      setDiscapProgError(e?.message || 'Error al borrar');
    } finally {
      setDiscapProgDeletingId(null);
    }
  };

  const updateRecorridoInPlanillas = (recorridoId: number, updates: Partial<RecorridoDTO>) => {
    setPlanillas((prev) =>
      prev.map((p) => {
        const items = extractArray<RecorridoDTO>(p.recorridos);
        if (items.length === 0) return p;
        const nextItems = items.map((r) => (r.id === recorridoId ? { ...r, ...updates } : r));
        if (Array.isArray(p.recorridos)) return { ...p, recorridos: nextItems };
        if (p.recorridos && typeof p.recorridos === 'object') {
          return { ...p, recorridos: { ...(p.recorridos as any), items: nextItems } };
        }
        return p;
      })
    );
  };

  const startEditDiscap = (r: RecorridoDTO) => {
    setDiscapError(null);
    setEditingDiscapId(r.id);
    setDiscapDraft({
      nombre: r.discap_nombre || '',
      apellido: r.discap_apellido || '',
      dni: r.discap_dni || '',
    });
  };

  const cancelEditDiscap = () => {
    setEditingDiscapId(null);
    setDiscapDraft({ nombre: '', apellido: '', dni: '' });
    setDiscapError(null);
  };

  const saveDiscap = async (r: RecorridoDTO) => {
    setDiscapSavingId(r.id);
    setDiscapError(null);
    try {
      const nombre = discapDraft.nombre.trim();
      const apellido = discapDraft.apellido.trim();
      const dni = discapDraft.dni.trim();
      const payload = {
        discap_nombre: nombre || null,
        discap_apellido: apellido || null,
        discap_dni: dni || null,
      } as any;
      await api.patch(`/recorridos/${r.id}`, payload);
      updateRecorridoInPlanillas(r.id, payload);
      setEditingDiscapId(null);
    } catch (e: any) {
      setDiscapError(e?.message || 'Error al guardar discapacitado');
    } finally {
      setDiscapSavingId(null);
    }
  };

  const handleDeletePlanilla = async () => {
    if (!planilla?.id) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/planillas/${planilla.id}`);
      setPlanillas((prev) => {
        const next = prev.filter((p) => String(p?.id) !== String(planilla.id));
        setSelectedPlanillaId(next[0]?.id ? String(next[0].id) : '');
        return next;
      });
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

          {fecha && (
            <div style={{ marginTop: 18 }}>
              <h3 className="DashboardPage__h3" style={{ margin: 0 }}>Discapacitados programados</h3>
              <div className="DashboardPage__muted" style={{ marginTop: 6 }}>
                Cargar antes de que suceda el recorrido (se valida por fecha + hora).
              </div>

              {discapProgError && (
                <div className="DashboardPage__inlineError" role="alert" style={{ marginTop: 10 }}>
                  <AlertTriangle className="DashboardPage__inlineErrorIcon" />
                  <span>{discapProgError}</span>
                </div>
              )}

              {discapProgLoading ? (
                <div className="DashboardPage__muted" style={{ marginTop: 10 }}>Cargando…</div>
              ) : (
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  {discapProgramados.length === 0 ? (
                    <div className="DashboardPage__muted">No hay asignaciones para esta fecha.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {discapProgramados.map((d) => (
                        <div key={d.id} className="DashboardPage__routeRow" style={{ background: '#fff' }}>
                          <div className="DashboardPage__routeCol DashboardPage__routeCol--time">
                            <div className="DashboardPage__miniLabel">Hora</div>
                            <div className="DashboardPage__mono">{String(d.horario || '-') || '-'}</div>
                          </div>
                          <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                            <div className="DashboardPage__miniLabel">Recorrido</div>
                            <div className="DashboardPage__mono">{String(d.numero_recorrido || '-') || '-'}</div>
                          </div>
                          <div className="DashboardPage__routeCol DashboardPage__routeCol--amount">
                            <div className="DashboardPage__miniLabel">Pasajero</div>
                            <div className="DashboardPage__mono">{formatDiscapProgramadoLabel(d)}</div>
                          </div>
                          <button
                            className="DashboardPage__tab"
                            type="button"
                            onClick={() => startEditDiscapProgramado(d)}
                            style={{ padding: '8px 10px', alignSelf: 'center' }}
                          >
                            Editar
                          </button>
                          <button
                            className="DashboardPage__removeRow"
                            type="button"
                            onClick={() => deleteDiscapProgramado(d.id)}
                            disabled={discapProgDeletingId === d.id}
                            title="Borrar"
                          >
                            <Trash2 className="DashboardPage__removeRowIcon" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 110px 1fr', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label className="DashboardPage__fieldLabel">Hora</label>
                    <input
                      className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--center"
                      value={discapProgDraft.horario}
                      onChange={(e) => setDiscapProgDraft((p) => ({ ...p, horario: e.target.value }))}
                      placeholder="06:35"
                    />
                  </div>
                  <div>
                    <label className="DashboardPage__fieldLabel">Recorrido</label>
                    <input
                      className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--center"
                      value={discapProgDraft.numero_recorrido}
                      onChange={(e) => setDiscapProgDraft((p) => ({ ...p, numero_recorrido: e.target.value }))}
                      placeholder="0301"
                    />
                  </div>
                  <div>
                    <label className="DashboardPage__fieldLabel">DNI</label>
                    <input
                      className="DashboardPage__input DashboardPage__input--sm"
                      value={discapProgDraft.dni}
                      onChange={(e) => setDiscapProgDraft((p) => ({ ...p, dni: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="DashboardPage__fieldLabel">Nombre</label>
                    <input
                      className="DashboardPage__input DashboardPage__input--sm"
                      value={discapProgDraft.nombre}
                      onChange={(e) => setDiscapProgDraft((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="DashboardPage__fieldLabel">Apellido</label>
                    <input
                      className="DashboardPage__input DashboardPage__input--sm"
                      value={discapProgDraft.apellido}
                      onChange={(e) => setDiscapProgDraft((p) => ({ ...p, apellido: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="DashboardPage__submit is-enabled"
                    style={{ width: 'fit-content', padding: '10px 14px' }}
                    onClick={saveDiscapProgramado}
                    disabled={discapProgSaving}
                  >
                    {discapProgSaving ? 'Guardando…' : discapProgEditingId ? 'Guardar cambios' : 'Agregar'}
                  </button>
                  {discapProgEditingId && (
                    <button
                      type="button"
                      className="DashboardPage__tab"
                      onClick={cancelEditDiscapProgramado}
                      disabled={discapProgSaving}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && choferId && fecha && planillas.length === 0 && !error && (
            <div className="DashboardPage__muted" style={{ marginTop: 12 }}>No hay planilla para esa fecha.</div>
          )}

          {!loading && choferId && fecha && planillas.length > 1 && (
            <div style={{ marginTop: 12 }}>
              <label className="DashboardPage__fieldLabel">Planillas encontradas</label>
              <select
                className="DashboardPage__input"
                value={selectedPlanillaId}
                onChange={(e) => {
                  setSelectedPlanillaId(e.target.value);
                  setConfirmDeleteOpen(false);
                }}
              >
                {planillas.map((p) => {
                  const when = p?.fecha_hora_planilla ? formatTimeAR(p.fecha_hora_planilla) : '';
                  const label = `${when ? ` • ${when}` : ''} • ${formatMoneyARS(toNumber(p.total_recorrido))}`;
                  return (
                    <option key={p.id} value={String(p.id)}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <div className="DashboardPage__muted" style={{ marginTop: 6 }}>
                Se muestran todas las planillas del chofer en esa fecha.
              </div>
            </div>
          )}

          {planilla && (
            <div style={{ marginTop: 16 }}>
              <div className="DashboardPage__muted" style={{ marginBottom: 10 }}>
                {planilla.chofer ? `Chofer: ${formatChoferLabel(planilla.chofer)}` : ''}
                {planilla.status ? ` • Estado: ${formatPlanillaStatus(planilla.status)}` : ''}
                {planilla.fecha_hora_planilla
                  ? ` • ${formatDateTimeAR(planilla.fecha_hora_planilla)}`
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
                      <div key={r.id}>
                        <div className="DashboardPage__routeRow">
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
                          <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                            <div className="DashboardPage__miniLabel">Discapacitado</div>
                            <div className="DashboardPage__mono">{formatDiscapLabel(r)}</div>
                            <button
                              type="button"
                              onClick={() => startEditDiscap(r)}
                              disabled={discapSavingId === r.id}
                              style={{
                                marginTop: 6,
                                padding: '4px 8px',
                                borderRadius: 8,
                                border: '1px solid rgb(var(--brand-border))',
                                background: '#f8fafc',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {r.discap_nombre || r.discap_apellido || r.discap_dni ? 'Editar' : 'Asignar'}
                            </button>
                          </div>
                        </div>

                        {editingDiscapId === r.id && (
                          <div
                            className="DashboardPage__routeRow"
                            style={{
                              marginTop: 8,
                              padding: '8px 10px',
                              background: '#f8fafc',
                              border: '1px solid rgb(var(--brand-border))',
                              borderRadius: 10,
                            }}
                          >
                            <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                              <div className="DashboardPage__miniLabel">Nombre</div>
                              <input
                                type="text"
                                value={discapDraft.nombre}
                                onChange={(e) => setDiscapDraft((prev) => ({ ...prev, nombre: e.target.value }))}
                                className="DashboardPage__input DashboardPage__input--sm"
                              />
                            </div>
                            <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                              <div className="DashboardPage__miniLabel">Apellido</div>
                              <input
                                type="text"
                                value={discapDraft.apellido}
                                onChange={(e) => setDiscapDraft((prev) => ({ ...prev, apellido: e.target.value }))}
                                className="DashboardPage__input DashboardPage__input--sm"
                              />
                            </div>
                            <div className="DashboardPage__routeCol DashboardPage__routeCol--route">
                              <div className="DashboardPage__miniLabel">DNI</div>
                              <input
                                type="text"
                                value={discapDraft.dni}
                                onChange={(e) => setDiscapDraft((prev) => ({ ...prev, dni: e.target.value }))}
                                className="DashboardPage__input DashboardPage__input--sm DashboardPage__input--mono"
                              />
                            </div>
                            <div className="DashboardPage__routeCol DashboardPage__routeCol--amount" style={{ alignItems: 'flex-end' }}>
                              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                                <button
                                  type="button"
                                  onClick={() => saveDiscap(r)}
                                  disabled={discapSavingId === r.id}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid rgb(var(--brand-border))',
                                    background: 'rgb(var(--brand-red))',
                                    color: '#fff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {discapSavingId === r.id ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditDiscap}
                                  disabled={discapSavingId === r.id}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid rgb(var(--brand-border))',
                                    background: '#fff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancelar
                                </button>
                              </div>
                              {discapError && (
                                <div className="DashboardPage__inlineError" role="alert" style={{ marginTop: 6 }}>
                                  <AlertTriangle className="DashboardPage__inlineErrorIcon" />
                                  <span>{discapError}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
