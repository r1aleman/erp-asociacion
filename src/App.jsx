// =====================================================
// src/App.jsx — versión Supabase con login compartido
// =====================================================
// 1. Completá SUPABASE_URL y SUPABASE_ANON_KEY con tus datos.
// 2. Completá AUTH_EMAIL con el mismo email del usuario compartido.
// 3. npm install @supabase/supabase-js
// =====================================================

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iochhkqjchsplbgwzvlw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvY2hoa3FqY2hzcGxiZ3d6dmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MDE4MzUsImV4cCI6MjEwMTk3NzgzNX0.TQQSN53_05CtRUcyGG6eE1cE3A-unxlTIhI-vlhP30A";
const AUTH_EMAIL = "zuluclub.inc@gmail.com";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapea nombres de campos del formulario (camelCase) <-> columnas de la tabla (snake_case)
const FIELD_MAPS = {
  socios: {
    nombre: "nombre", dni: "dni", reprocannNumero: "reprocann_numero",
    reprocannVencimiento: "reprocann_vencimiento", fechaAlta: "fecha_alta",
    telefono: "telefono", estado: "estado", gramosCuota: "gramos_cuota",
  },
  cultivo: {
    lote: "lote", fechaSiembra: "fecha_siembra", cantidadPlantas: "cantidad_plantas",
    etapa: "etapa", fechaCosechaEstimada: "fecha_cosecha_estimada",
    gramosCosechados: "gramos_cosechados",
  },
  dispensacion: {
    socioNombre: "socio_nombre", fecha: "fecha", tipo: "tipo",
    cantidadGramos: "cantidad_gramos", observaciones: "observaciones",
    monto: "monto", pagado: "pagado", tipoCobro: "tipo_cobro",
    metodoPago: "metodo_pago", mesesCuota: "meses_cuota",
  },
  finanzas: {
    fecha: "fecha", tipo: "tipo", categoria: "categoria",
    concepto: "concepto", monto: "monto", metodoPago: "metodo_pago",
  },
};

const toDb = (table, obj) => {
  const map = FIELD_MAPS[table];
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { if (map[k]) out[map[k]] = v; });
  return out;
};
const fromDb = (table, row) => {
  const map = FIELD_MAPS[table];
  const out = { id: row.id };
  Object.entries(map).forEach(([appKey, dbKey]) => { out[appKey] = row[dbKey]; });
  return out;
};

const TODAY = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
const fmtMoney = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
const fmtG = (n) => `${new Intl.NumberFormat("es-AR").format(Math.round((n || 0) * 10) / 10)} g`;
const pad = (n) => String(n).padStart(4, "0");
const daysUntil = (d) => {
  if (!d) return null;
  const target = new Date(d + "T00:00:00");
  const now = new Date(TODAY() + "T00:00:00");
  return Math.round((target - now) / 86400000);
};

// Cálculo de cuotas adeudadas: meses transcurridos desde el alta vs. meses pagados en Dispensación
function mesesTranscurridos(fechaAlta) {
  if (!fechaAlta) return 0;
  const [ay, am] = fechaAlta.split("-").map(Number);
  const now = new Date();
  return (now.getFullYear() - ay) * 12 + (now.getMonth() + 1 - am) + 1;
}
function mesesPagados(socioNombre, dispensacionItems) {
  return dispensacionItems
    .filter((d) => d.socioNombre === socioNombre && d.tipoCobro === "Cuota mensual" && d.pagado)
    .reduce((a, d) => a + (Number(d.mesesCuota) || 1), 0);
}
function mesesAdeudados(socio, dispensacionItems) {
  return Math.max(0, mesesTranscurridos(socio.fechaAlta) - mesesPagados(socio.nombre, dispensacionItems));
}

const ROLES = {
  admin: { label: "Administración", sections: ["dashboard", "socios", "cultivo", "dispensacion", "finanzas", "reportes"] },
  tesoreria: { label: "Tesorería", sections: ["dashboard", "socios", "finanzas", "reportes"] },
  cultivo: { label: "Cultivo", sections: ["dashboard", "cultivo", "dispensacion", "reportes"] },
};

const STOCK_MINIMO = 50;
const DIAS_ALERTA_REPROCANN = 30;

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    .erp-root {
      --bg: #F0EFE5; --surface: #FFFFFF; --ink: #24261F; --ink-soft: #5B5D52; --ink-faint: #93958A;
      --moss: #435E39; --moss-light: #DEE6D4; --moss-dark: #2E4127;
      --soil: #8B5E3C; --soil-light: #EFE1D2;
      --rust: #A6433D; --rust-light: #F5DEDC;
      --slate: #3E5C76; --slate-light: #DDE5EC;
      --border: #D7D4C4; --border-strong: #BEBAA4;
      font-family: 'IBM Plex Sans', sans-serif; color: var(--ink); background: var(--bg);
      min-height: 100vh; display: flex; width: 100%;
    }
    .erp-serif { font-family: 'Fraunces', serif; }
    .erp-mono { font-family: 'IBM Plex Mono', monospace; }
    .erp-sidebar { width: 216px; flex-shrink: 0; background: var(--moss-dark); color: #EFEFE4; display: flex; flex-direction: column; padding: 24px 0; }
    .erp-brand { padding: 0 20px 20px; border-bottom: 1px solid rgba(239,239,228,0.15); margin-bottom: 12px; }
    .erp-brand-title { font-size: 18px; font-weight: 600; line-height: 1.25; }
    .erp-brand-sub { font-size: 11px; color: #C7CFB9; margin-top: 4px; letter-spacing: 0.03em; }
    .erp-nav-item { display: flex; align-items: baseline; gap: 10px; padding: 11px 20px; cursor: pointer; font-size: 14px; color: #D8DECB; border-left: 3px solid transparent; background: none; border-top:none; border-right:none; border-bottom:none; width: 100%; text-align: left; }
    .erp-nav-item:hover { background: rgba(239,239,228,0.06); }
    .erp-nav-item.active { background: rgba(239,239,228,0.1); border-left-color: #C7CFB9; color: #fff; font-weight: 500; }
    .erp-nav-num { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #94A184; width: 16px; }
    .erp-main { flex: 1; padding: 32px 40px; max-width: 1120px; min-width: 0; }
    .erp-h1 { font-size: 24px; font-weight: 500; margin: 0; }
    .erp-header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 16px; flex-wrap: wrap; gap: 10px; }
    .erp-folio { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-faint); }
    .erp-card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 16px 18px; }
    .erp-metric-label { font-size: 12px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px; }
    .erp-metric-value { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 500; margin: 0; }
    .erp-btn { font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: 3px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--ink); cursor: pointer; }
    .erp-btn:hover { background: var(--bg); }
    .erp-btn-primary { background: var(--moss); border-color: var(--moss); color: #fff; }
    .erp-btn-primary:hover { background: var(--moss-dark); }
    .erp-btn-danger { color: var(--rust); border-color: var(--rust-light); background: var(--rust-light); }
    .erp-input, .erp-select { font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; padding: 7px 9px; border-radius: 3px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--ink); width: 100%; }
    .erp-field-label { font-size: 11px; color: var(--ink-soft); margin-bottom: 4px; display: block; }
    .erp-table-wrap { overflow-x: auto; }
    .erp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .erp-table th { text-align: left; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ink-soft); padding: 8px 10px; border-bottom: 1px solid var(--border-strong); white-space: nowrap; }
    .erp-table td { padding: 10px 10px; border-bottom: 1px dashed var(--border); white-space: nowrap; }
    .erp-table tr:last-child td { border-bottom: none; }
    .erp-badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 500; display: inline-block; }
    .erp-badge-moss { background: var(--moss-light); color: var(--moss-dark); }
    .erp-badge-rust { background: var(--rust-light); color: var(--rust); }
    .erp-badge-soil { background: var(--soil-light); color: var(--soil); }
    .erp-badge-slate { background: var(--slate-light); color: var(--slate); }
    .erp-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .erp-empty { color: var(--ink-faint); font-size: 13px; padding: 24px 0; text-align: center; }
    .erp-gate { min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 16px; }
    .erp-gate-card { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 32px; width: 380px; max-width: 100%; box-sizing: border-box; }
    .erp-role-btn { width: 100%; text-align: left; padding: 14px 16px; margin-top: 10px; border-radius: 4px; border: 1px solid var(--border-strong); background: var(--surface); cursor: pointer; }
    .erp-role-btn:hover { background: var(--moss-light); border-color: var(--moss); }
    .erp-role-name { font-weight: 500; font-size: 14px; }
    .erp-role-desc { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
    .erp-alert-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .erp-alert { display: flex; gap: 10px; align-items: baseline; padding: 10px 14px; border-radius: 4px; font-size: 13px; }
    .erp-alert-danger { background: var(--rust-light); color: var(--rust); }
    .erp-alert-warning { background: var(--soil-light); color: var(--soil); }
    .erp-user-chip { font-size: 12px; color: #C7CFB9; padding: 8px 20px 0; margin-top: auto; }
    .erp-user-chip button { background: none; border: none; color: #C7CFB9; text-decoration: underline; cursor: pointer; font-size: 11px; padding: 0; margin-top: 4px; }
    .erp-error { color: var(--rust); font-size: 12px; margin-top: 8px; }
    .erp-landing { min-height: 100vh; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--moss-dark); padding: 24px; text-align: center; }
    .erp-landing img { max-width: 260px; width: 80%; height: auto; margin-bottom: 28px; filter: drop-shadow(0 8px 24px rgba(0,0,0,0.4)); }
    .erp-landing-btn { font-family: 'IBM Plex Sans', sans-serif; font-size: 15px; font-weight: 600; padding: 14px 40px; border-radius: 4px; border: none; background: var(--moss-light); color: var(--moss-dark); cursor: pointer; }
    .erp-landing-btn:hover { background: #fff; }
    .erp-menu-toggle { display: none; }
    .erp-overlay { display: none; }
    @media (max-width: 768px) {
      .erp-root { display: block; }
      .erp-menu-toggle {
        display: flex; align-items: center; justify-content: center;
        position: fixed; top: 14px; left: 14px; z-index: 40;
        width: 40px; height: 40px; border-radius: 4px; border: 1px solid var(--border-strong);
        background: var(--surface); font-size: 18px; cursor: pointer;
      }
      .erp-sidebar {
        position: fixed; top: 0; left: 0; height: 100vh; width: 240px; z-index: 50;
        transform: translateX(-100%); transition: transform 0.2s ease;
      }
      .erp-sidebar.open { transform: translateX(0); }
      .erp-overlay.open {
        display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 45;
      }
      .erp-main { padding: 64px 16px 32px; max-width: 100%; }
      .erp-header-row { align-items: flex-start; }
    }
    @media print {
      .erp-sidebar, .erp-header-row .erp-btn, .erp-menu-toggle, .no-print { display: none !important; }
      .erp-main { padding: 0; max-width: 100%; }
      body, .erp-root { background: #fff; }
    }
  `}</style>
);

// Hook que reemplaza a window.storage: lee y escribe en Supabase
function useCollection(table, ready) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
    if (error) { console.error(error); setLoaded(true); return; }
    setItems(data.map((r) => fromDb(table, r)));
    setLoaded(true);
  };

  useEffect(() => { if (ready) reload(); }, [table, ready]);

  const add = async (record) => {
    const { error } = await supabase.from(table).insert(toDb(table, record));
    if (error) console.error(error);
    await reload();
  };
  const update = async (id, patch) => {
    const { error } = await supabase.from(table).update(toDb(table, patch)).eq("id", id);
    if (error) console.error(error);
    await reload();
  };
  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) console.error(error);
    await reload();
  };

  return { items, loaded, add, update, remove };
}

// Configuración global: monto de cuota y valor por gramo, iguales para todos los socios
function useSettings(ready) {
  const [settings, setSettings] = useState({ montoCuota: 0, valorGramo: 0 });
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    const { data, error } = await supabase.from("configuracion").select("*").eq("id", 1).maybeSingle();
    if (!error && data) setSettings({ montoCuota: data.monto_cuota || 0, valorGramo: data.valor_gramo || 0 });
    setLoaded(true);
  };

  useEffect(() => { if (ready) reload(); }, [ready]);

  const updateMontoCuota = async (value) => {
    const { error } = await supabase.from("configuracion").upsert({ id: 1, monto_cuota: value });
    if (!error) setSettings((s) => ({ ...s, montoCuota: value }));
  };

  const updateValorGramo = async (value) => {
    const { error } = await supabase.from("configuracion").upsert({ id: 1, valor_gramo: value });
    if (!error) setSettings((s) => ({ ...s, valorGramo: value }));
  };

  return { settings, loaded, updateMontoCuota, updateValorGramo };
}

function Field({ label, children }) {
  return (
    <div>
      <label className="erp-field-label">{label}</label>
      {children}
    </div>
  );
}

function AddForm({ fields, onSubmit, onCancel, initialValues, submitLabel }) {
  const initial = {};
  fields.forEach((f) => {
    initial[f.name] = initialValues && initialValues[f.name] !== undefined
      ? initialValues[f.name]
      : (f.default !== undefined ? f.default : "");
  });
  const [values, setValues] = useState(initial);
  const set = (name, val) => setValues((v) => ({ ...v, [name]: val }));

  return (
    <div className="erp-card" style={{ marginBottom: 20 }}>
      <div className="erp-form-grid">
        {fields.map((f) => (
          <Field label={f.label} key={f.name}>
            {f.type === "select" ? (
              <select className="erp-select" value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "checkbox" ? (
              <input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} style={{ width: 18, height: 18, marginTop: 6 }} />
            ) : (
              <input
                className="erp-input"
                type={f.type || "text"}
                value={values[f.name]}
                onChange={(e) => set(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)}
              />
            )}
          </Field>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="erp-btn erp-btn-primary" onClick={() => onSubmit(values)}>{submitLabel || "Guardar registro"}</button>
        <button className="erp-btn" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function SectionHeader({ title, folio, onAdd, addLabel }) {
  return (
    <div className="erp-header-row">
      <div>
        <p className="erp-h1 erp-serif">{title}</p>
        <p className="erp-folio">{folio}</p>
      </div>
      {onAdd && <button className="erp-btn erp-btn-primary" onClick={onAdd}>{addLabel}</button>}
    </div>
  );
}

// Pantalla de bienvenida con el logo de la asociación
function Landing({ onEnter }) {
  return (
    <div className="erp-landing">
      <img src="/logo.png" alt="Zulu Club Inc." />
      <button className="erp-landing-btn" onClick={onEnter}>Ingresar</button>
    </div>
  );
}

// Pantalla de login compartido — usa un único usuario de Supabase Auth
function LoginGate({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: AUTH_EMAIL, password });
    setLoading(false);
    if (err) { setError("Clave incorrecta. Probá de nuevo."); return; }
    onSuccess();
  };

  return (
    <div className="erp-gate">
      <div className="erp-gate-card">
        <p className="erp-brand-title erp-serif" style={{ fontSize: 20, marginBottom: 4 }}>Registro Asociativo</p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
          Ingresá la clave de acceso de la asociación.
        </p>
        <form onSubmit={submit}>
          <Field label="Clave de acceso">
            <input className="erp-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </Field>
          {error && <p className="erp-error">{error}</p>}
          <button className="erp-btn erp-btn-primary" type="submit" style={{ width: "100%", marginTop: 14 }} disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function RoleGate({ onSelect }) {
  return (
    <div className="erp-gate">
      <div className="erp-gate-card">
        <p className="erp-brand-title erp-serif" style={{ fontSize: 20, marginBottom: 4 }}>Registro Asociativo</p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 4 }}>
          Elegí con qué rol vas a trabajar. Esto organiza qué secciones ves.
        </p>
        {Object.entries(ROLES).map(([key, r]) => (
          <button key={key} className="erp-role-btn" onClick={() => onSelect(key)}>
            <div className="erp-role-name">{r.label}</div>
            <div className="erp-role-desc">Acceso a: {r.sections.filter((s) => s !== "dashboard").join(", ")}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AlertBanner({ socios, cultivo, dispensacion }) {
  const alerts = useMemo(() => {
    const list = [];
    socios.items.filter((s) => s.estado === "Activo" && s.reprocannVencimiento).forEach((s) => {
      const d = daysUntil(s.reprocannVencimiento);
      if (d !== null && d < 0) list.push({ level: "danger", text: `REPROCANN vencido de ${s.nombre} (venció el ${fmtDate(s.reprocannVencimiento)})` });
      else if (d !== null && d <= DIAS_ALERTA_REPROCANN) list.push({ level: "warning", text: `REPROCANN de ${s.nombre} vence en ${d} día${d === 1 ? "" : "s"}` });
    });
    const gCosechados = cultivo.items.reduce((a, c) => a + (Number(c.gramosCosechados) || 0), 0);
    const gEntregados = dispensacion.items.reduce((a, d) => a + (Number(d.cantidadGramos) || 0), 0);
    const stock = gCosechados - gEntregados;
    if (stock < STOCK_MINIMO) list.push({ level: "danger", text: `Stock disponible bajo: ${fmtG(stock)} (mínimo sugerido ${fmtG(STOCK_MINIMO)})` });
    return list;
  }, [socios.items, cultivo.items, dispensacion.items]);

  if (alerts.length === 0) return null;
  return (
    <div className="erp-alert-list">
      {alerts.map((a, i) => (
        <div key={i} className={`erp-alert erp-alert-${a.level}`}>
          <span>{a.level === "danger" ? "●" : "○"}</span>
          <span>{a.text}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ socios, cultivo, dispensacion, finanzas }) {
  const m = useMemo(() => {
    const activos = socios.items.filter((s) => s.estado === "Activo");
    const atrasados = activos.filter((s) => mesesAdeudados(s, dispensacion.items) > 0);
    const gCosechados = cultivo.items.reduce((a, c) => a + (Number(c.gramosCosechados) || 0), 0);
    const gEntregados = dispensacion.items.reduce((a, d) => a + (Number(d.cantidadGramos) || 0), 0);
    const plantasActivas = cultivo.items.filter((c) => c.etapa !== "Cosecha").reduce((a, c) => a + (Number(c.cantidadPlantas) || 0), 0);
    const ingresos = finanzas.items.filter((f) => f.tipo === "Ingreso").reduce((a, f) => a + (Number(f.monto) || 0), 0);
    const egresos = finanzas.items.filter((f) => f.tipo === "Egreso").reduce((a, f) => a + (Number(f.monto) || 0), 0);
    return { activos: activos.length, atrasados: atrasados.length, stock: gCosechados - gEntregados, plantasActivas, balance: ingresos - egresos };
  }, [socios.items, cultivo.items, dispensacion.items, finanzas.items]);

  return (
    <>
      <SectionHeader title="Panel general" folio={`Actualizado ${fmtDate(TODAY())}`} />
      <AlertBanner socios={socios} cultivo={cultivo} dispensacion={dispensacion} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div className="erp-card"><p className="erp-metric-label">Socios activos</p><p className="erp-metric-value">{m.activos}</p></div>
        <div className="erp-card"><p className="erp-metric-label">Cuotas atrasadas</p><p className="erp-metric-value" style={{ color: m.atrasados ? "var(--rust)" : "var(--ink)" }}>{m.atrasados}</p></div>
        <div className="erp-card"><p className="erp-metric-label">Plantas en cultivo</p><p className="erp-metric-value">{m.plantasActivas}</p></div>
        <div className="erp-card"><p className="erp-metric-label">Stock disponible</p><p className="erp-metric-value erp-mono" style={{ fontSize: 22 }}>{fmtG(m.stock)}</p></div>
        <div className="erp-card"><p className="erp-metric-label">Balance</p><p className="erp-metric-value erp-mono" style={{ fontSize: 22, color: m.balance < 0 ? "var(--rust)" : "var(--moss-dark)" }}>{fmtMoney(m.balance)}</p></div>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 28 }}>
        Este panel resume los cuatro libros de registro de la asociación. Usá la navegación de la izquierda para cargar socios, lotes de cultivo, entregas y movimientos de caja.
      </p>
    </>
  );
}

// Formulario para registrar el pago de una o varias cuotas — se calcula por gramos × valor del gramo
function PagoCuotaForm({ socio, valorGramo, onCancel, onSubmit }) {
  const [meses, setMeses] = useState(1);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [fecha, setFecha] = useState(TODAY());
  const gramos = meses * (socio.gramosCuota || 0);
  const monto = gramos * (valorGramo || 0);

  return (
    <div className="erp-card" style={{ marginBottom: 20 }}>
      <p className="erp-serif" style={{ fontSize: 15, marginBottom: 10 }}>Registrar pago — {socio.nombre}</p>
      <div className="erp-form-grid">
        <Field label="Meses a pagar">
          <input className="erp-input" type="number" min="1" value={meses} onChange={(e) => setMeses(Math.max(1, Number(e.target.value)))} />
        </Field>
        <Field label="Método de pago">
          <select className="erp-select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {["Efectivo", "Transferencia", "Tarjeta"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Fecha de pago">
          <input className="erp-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 12 }}>
        Gramos por cuota del socio: <strong>{fmtG(socio.gramosCuota)}</strong> × {meses} mes{meses === 1 ? "" : "es"} = <strong>{fmtG(gramos)}</strong> a descontar del stock.
        <br />
        Total a cobrar (a {fmtMoney(valorGramo)}/g): <strong>{fmtMoney(monto)}</strong>
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="erp-btn erp-btn-primary" onClick={() => onSubmit({ meses, metodoPago, fecha, monto, gramos })}>Confirmar pago</button>
        <button className="erp-btn" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function SociosView({ col, dispensacion, finanzas, settings }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pagoSocioId, setPagoSocioId] = useState(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const DIAS_VENCIMIENTO_SOCIOS = 60;
  const fields = [
    { name: "nombre", label: "Nombre completo" },
    { name: "dni", label: "DNI" },
    { name: "reprocannNumero", label: "N° REPROCANN" },
    { name: "reprocannVencimiento", label: "Vto. REPROCANN", type: "date" },
    { name: "fechaAlta", label: "Fecha de alta", type: "date", default: TODAY() },
    { name: "telefono", label: "Teléfono" },
    { name: "gramosCuota", label: "Gramos por cuota (mensual)", type: "number", default: 0 },
    { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"], default: "Activo" },
  ];

  const proximosVencer = useMemo(() => {
    return col.items
      .filter((s) => s.estado === "Activo" && s.reprocannVencimiento)
      .map((s) => ({ ...s, dias: daysUntil(s.reprocannVencimiento) }))
      .filter((s) => s.dias !== null && s.dias <= DIAS_VENCIMIENTO_SOCIOS)
      .sort((a, b) => a.dias - b.dias);
  }, [col.items]);

  const filtrados = useMemo(() => {
    let items = col.items;
    if (filtro === "atrasados") {
      items = items.filter((s) => mesesAdeudados(s, dispensacion.items) > 0);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((s) => (s.nombre || "").toLowerCase().includes(q) || (s.dni || "").toLowerCase().includes(q));
    }
    return items;
  }, [col.items, dispensacion.items, filtro, search]);

  const editingSocio = editingId ? col.items.find((s) => s.id === editingId) : null;
  const pagoSocio = pagoSocioId ? col.items.find((s) => s.id === pagoSocioId) : null;

  const registrarPago = ({ meses, metodoPago, fecha, monto, gramos }) => {
    dispensacion.add({
      socioNombre: pagoSocio.nombre,
      fecha,
      tipo: "Cuota",
      cantidadGramos: gramos,
      tipoCobro: "Cuota mensual",
      monto,
      pagado: true,
      metodoPago,
      mesesCuota: meses,
      observaciones: meses > 1 ? `Pago de ${meses} cuotas mensuales` : "Pago de cuota mensual",
    });
    finanzas.add({
      fecha,
      tipo: "Ingreso",
      categoria: "Cuota",
      concepto: pagoSocio.nombre,
      metodoPago,
      monto,
    });
    setPagoSocioId(null);
  };

  return (
    <>
      <SectionHeader title="Socios" folio={`Libro I · ${col.items.length} registrados`} onAdd={() => { setEditingId(null); setShowForm(true); }} addLabel="+ Nuevo socio" />

      {proximosVencer.length > 0 && (
        <div className="erp-card" style={{ marginBottom: 20 }}>
          <p className="erp-serif" style={{ fontSize: 15, marginBottom: 10 }}>REPROCANN por vencer (próximos {DIAS_VENCIMIENTO_SOCIOS} días)</p>
          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead><tr><th>Socio</th><th>Vence</th><th>Días</th></tr></thead>
              <tbody>
                {proximosVencer.map((s) => (
                  <tr key={s.id}>
                    <td>{s.nombre}</td>
                    <td>{fmtDate(s.reprocannVencimiento)}</td>
                    <td>
                      <span className={`erp-badge ${s.dias < 0 ? "erp-badge-rust" : "erp-badge-soil"}`}>
                        {s.dias < 0 ? `Vencido hace ${Math.abs(s.dias)}d` : `${s.dias} días`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <AddForm
          fields={fields}
          initialValues={editingSocio || undefined}
          submitLabel={editingSocio ? "Guardar cambios" : "Guardar registro"}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
          onSubmit={(v) => {
            if (editingSocio) col.update(editingSocio.id, v);
            else col.add(v);
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {pagoSocio && (
        <PagoCuotaForm
          socio={pagoSocio}
          valorGramo={settings.valorGramo}
          onCancel={() => setPagoSocioId(null)}
          onSubmit={registrarPago}
        />
      )}

      <div className="erp-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Buscar socio (nombre o DNI)">
              <input className="erp-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Escribí para buscar…" />
            </Field>
          </div>
          <button className={filtro === "atrasados" ? "erp-btn erp-btn-primary" : "erp-btn"} onClick={() => setFiltro("atrasados")}>Ver atrasados</button>
          <button className={filtro === "todos" ? "erp-btn erp-btn-primary" : "erp-btn"} onClick={() => setFiltro("todos")}>Ver todos</button>
        </div>
      </div>

      <div className="erp-card">
        {filtrados.length === 0 ? (
          <p className="erp-empty">{col.items.length === 0 ? "Todavía no hay socios cargados." : "No hay socios que coincidan con la búsqueda/filtro."}</p>
        ) : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>N°</th><th>Nombre</th><th>DNI</th><th>REPROCANN</th><th>Vence</th><th>Grs. cuota</th><th>Cuotas</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((s, i) => {
                const deuda = mesesAdeudados(s, dispensacion.items);
                return (
                <tr key={s.id}>
                  <td className="erp-mono">{pad(i + 1)}</td>
                  <td>{s.nombre}</td>
                  <td className="erp-mono">{s.dni}</td>
                  <td className="erp-mono">{s.reprocannNumero || "—"}</td>
                  <td>{fmtDate(s.reprocannVencimiento)}</td>
                  <td className="erp-mono">{fmtG(s.gramosCuota)}</td>
                  <td>
                    <span className={`erp-badge ${deuda === 0 ? "erp-badge-moss" : "erp-badge-rust"}`}>
                      {deuda === 0 ? "Al día" : `Debe ${deuda} cuota${deuda === 1 ? "" : "s"}`}
                    </span>
                  </td>
                  <td><span className={`erp-badge ${s.estado === "Activo" ? "erp-badge-moss" : "erp-badge-soil"}`}>{s.estado}</span></td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => { setPagoSocioId(s.id); setShowForm(false); }}>Registrar pago</button>
                    <button className="erp-btn" onClick={() => { setEditingId(s.id); setShowForm(true); setPagoSocioId(null); }}>Editar</button>
                    <button className="erp-btn erp-btn-danger" onClick={() => col.remove(s.id)}>Borrar</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

function CultivoView({ col }) {
  const [showForm, setShowForm] = useState(false);
  const fields = [
    { name: "lote", label: "Lote / identificación" },
    { name: "fechaSiembra", label: "Fecha de siembra", type: "date", default: TODAY() },
    { name: "cantidadPlantas", label: "Cantidad de plantas", type: "number", default: 0 },
    { name: "etapa", label: "Etapa", type: "select", options: ["Germinación", "Vegetativo", "Floración", "Cosecha", "Secado"], default: "Vegetativo" },
    { name: "fechaCosechaEstimada", label: "Cosecha estimada", type: "date" },
    { name: "gramosCosechados", label: "Gramos cosechados", type: "number", default: 0 },
  ];
  return (
    <>
      <SectionHeader title="Cultivo" folio={`Libro II · ${col.items.length} lotes`} onAdd={() => setShowForm(true)} addLabel="+ Nuevo lote" />
      {showForm && <AddForm fields={fields} onCancel={() => setShowForm(false)} onSubmit={(v) => { col.add(v); setShowForm(false); }} />}
      <div className="erp-card">
        {col.items.length === 0 ? <p className="erp-empty">Todavía no hay lotes cargados.</p> : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>N°</th><th>Lote</th><th>Siembra</th><th>Plantas</th><th>Etapa</th><th>Cosecha est.</th><th>Cosechado</th><th></th></tr></thead>
            <tbody>
              {col.items.map((c, i) => (
                <tr key={c.id}>
                  <td className="erp-mono">{pad(i + 1)}</td>
                  <td>{c.lote}</td>
                  <td>{fmtDate(c.fechaSiembra)}</td>
                  <td className="erp-mono">{c.cantidadPlantas}</td>
                  <td>
                    <select className="erp-select" style={{ width: "auto", padding: "3px 6px", fontSize: 12 }} value={c.etapa} onChange={(e) => col.update(c.id, { etapa: e.target.value })}>
                      {["Germinación", "Vegetativo", "Floración", "Cosecha", "Secado"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td>{fmtDate(c.fechaCosechaEstimada)}</td>
                  <td className="erp-mono">
                    <input className="erp-input" style={{ width: 80, padding: "4px 6px" }} type="number" defaultValue={c.gramosCosechados || 0} onBlur={(e) => col.update(c.id, { gramosCosechados: Number(e.target.value) })} />
                  </td>
                  <td><button className="erp-btn erp-btn-danger" onClick={() => col.remove(c.id)}>Borrar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

// Formulario de nueva entrega — calcula el monto solo a partir de los gramos y el valor por gramo
function NuevaEntregaForm({ sociosNombres, valorGramo, onCancel, onSubmit }) {
  const [socioNombre, setSocioNombre] = useState(sociosNombres[0] || "");
  const [fecha, setFecha] = useState(TODAY());
  const [tipo, setTipo] = useState("Flor");
  const [cantidadGramos, setCantidadGramos] = useState(0);
  const [tipoCobro, setTipoCobro] = useState("Cuota mensual");
  const [valorGramoLocal, setValorGramoLocal] = useState(valorGramo || 0);
  const [monto, setMonto] = useState(0);
  const [montoEditado, setMontoEditado] = useState(false);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [pagado, setPagado] = useState(true);
  const [observaciones, setObservaciones] = useState("");

  const recalcular = (gramos, precio) => {
    if (!montoEditado) setMonto(Math.round(gramos * (precio || 0)));
  };
  const handleGramos = (val) => {
    setCantidadGramos(val);
    recalcular(val, valorGramoLocal);
  };
  const handleValorGramo = (val) => {
    setValorGramoLocal(val);
    recalcular(cantidadGramos, val);
  };

  return (
    <div className="erp-card" style={{ marginBottom: 20 }}>
      <div className="erp-form-grid">
        <Field label="Socio">
          <select className="erp-select" value={socioNombre} onChange={(e) => setSocioNombre(e.target.value)}>
            {(sociosNombres.length ? sociosNombres : ["Sin socios cargados"]).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input className="erp-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Tipo de producto">
          <select className="erp-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {["Flor", "Aceite", "Extracto", "Semilla", "Otro"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Cantidad (g)">
          <input className="erp-input" type="number" value={cantidadGramos} onChange={(e) => handleGramos(Number(e.target.value))} />
        </Field>
        <Field label="Concepto">
          <select className="erp-select" value={tipoCobro} onChange={(e) => setTipoCobro(e.target.value)}>
            {["Cuota mensual", "Excedente"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Valor por gramo — esta entrega (ARS)">
          <input className="erp-input" type="number" value={valorGramoLocal} onChange={(e) => handleValorGramo(Number(e.target.value))} />
        </Field>
        <Field label={`Monto (ARS)${!montoEditado ? " · calculado" : ""}`}>
          <input className="erp-input" type="number" value={monto} onChange={(e) => { setMontoEditado(true); setMonto(Number(e.target.value)); }} />
        </Field>
        <Field label="Método de pago">
          <select className="erp-select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {["Efectivo", "Transferencia", "Tarjeta", "Cuenta corriente"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Pagado">
          <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} style={{ width: 18, height: 18, marginTop: 6 }} />
        </Field>
        <Field label="Observaciones">
          <input className="erp-input" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
        {!montoEditado
          ? `El monto se calculó solo: ${fmtG(cantidadGramos)} × ${fmtMoney(valorGramoLocal)}/g. Si es una venta especial, cambiá el "Valor por gramo — esta entrega" y el monto se recalcula sin tocar tu configuración general.`
          : "Editaste el monto manualmente — ya no se recalcula solo al cambiar gramos o valor por gramo."}
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="erp-btn erp-btn-primary" onClick={() => onSubmit({ socioNombre, fecha, tipo, cantidadGramos, tipoCobro, monto, metodoPago, pagado, observaciones })}>Guardar registro</button>
        <button className="erp-btn" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function DispensacionView({ col, socios, finanzas, settings }) {
  const [showForm, setShowForm] = useState(false);
  const [filtro, setFiltro] = useState("todos");

  const totalPendiente = col.items.filter((d) => !d.pagado).reduce((a, d) => a + (Number(d.monto) || 0), 0);
  const filtrados = filtro === "deudores"
    ? col.items.filter((d) => d.metodoPago === "Cuenta corriente" && !d.pagado)
    : col.items;

  const handleSubmit = (v) => {
    col.add(v);
    if (v.pagado && Number(v.monto) > 0) {
      finanzas.add({
        fecha: v.fecha,
        tipo: "Ingreso",
        categoria: v.tipoCobro === "Excedente" ? "Excedente" : "Cuota",
        concepto: v.socioNombre,
        metodoPago: v.metodoPago,
        monto: v.monto,
      });
    }
    setShowForm(false);
  };

  const marcarPago = (d) => {
    const nuevoEstado = !d.pagado;
    col.update(d.id, { pagado: nuevoEstado });
    if (nuevoEstado && Number(d.monto) > 0) {
      finanzas.add({
        fecha: TODAY(),
        tipo: "Ingreso",
        categoria: d.tipoCobro === "Excedente" ? "Excedente" : "Cuota",
        concepto: d.socioNombre,
        metodoPago: d.metodoPago,
        monto: d.monto,
      });
    }
  };

  return (
    <>
      <SectionHeader
        title="Dispensación"
        folio={`Libro III · ${col.items.length} entregas${totalPendiente > 0 ? ` · Pendiente de cobro: ${fmtMoney(totalPendiente)}` : ""}`}
        onAdd={() => setShowForm(true)}
        addLabel="+ Nueva entrega"
      />
      {showForm && (
        <NuevaEntregaForm
          sociosNombres={socios.items.map((s) => s.nombre)}
          valorGramo={settings.valorGramo}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
      <div className="erp-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className={filtro === "deudores" ? "erp-btn erp-btn-primary" : "erp-btn"} onClick={() => setFiltro("deudores")}>Ver deudores (cta. cte.)</button>
          <button className={filtro === "todos" ? "erp-btn erp-btn-primary" : "erp-btn"} onClick={() => setFiltro("todos")}>Ver listado completo</button>
        </div>
      </div>
      <div className="erp-card">
        {filtrados.length === 0 ? (
          <p className="erp-empty">{col.items.length === 0 ? "Todavía no hay entregas registradas." : "No hay entregas que coincidan con el filtro."}</p>
        ) : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>N°</th><th>Fecha</th><th>Socio</th><th>Tipo</th><th>Cantidad</th><th>Concepto</th><th>Monto</th><th>Método</th><th>Cobro</th><th>Obs.</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((d, i) => (
                <tr key={d.id}>
                  <td className="erp-mono">{pad(i + 1)}</td>
                  <td>{fmtDate(d.fecha)}</td>
                  <td>{d.socioNombre}</td>
                  <td><span className="erp-badge erp-badge-slate">{d.tipo}</span></td>
                  <td className="erp-mono">{fmtG(d.cantidadGramos)}</td>
                  <td><span className={`erp-badge ${d.tipoCobro === "Excedente" ? "erp-badge-soil" : "erp-badge-slate"}`}>{d.tipoCobro || "Cuota mensual"}</span></td>
                  <td className="erp-mono">{fmtMoney(d.monto)}</td>
                  <td style={{ color: "var(--ink-soft)" }}>{d.metodoPago || "—"}</td>
                  <td>
                    <button className={`erp-badge ${d.pagado ? "erp-badge-moss" : "erp-badge-rust"}`} onClick={() => marcarPago(d)} style={{ border: "none", cursor: "pointer" }}>
                      {d.pagado ? "Pago" : "Impago"}
                    </button>
                  </td>
                  <td style={{ color: "var(--ink-soft)" }}>{d.observaciones || "—"}</td>
                  <td><button className="erp-btn erp-btn-danger" onClick={() => col.remove(d.id)}>Borrar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

function FinanzasView({ col, settings, updateMontoCuota, updateValorGramo }) {
  const [showForm, setShowForm] = useState(false);
  const [cuotaInput, setCuotaInput] = useState(settings.montoCuota || 0);
  const [valorGramoInput, setValorGramoInput] = useState(settings.valorGramo || 0);
  const [savedMsg, setSavedMsg] = useState(false);
  const fields = [
    { name: "fecha", label: "Fecha", type: "date", default: TODAY() },
    { name: "tipo", label: "Tipo", type: "select", options: ["Ingreso", "Egreso"] },
    { name: "categoria", label: "Categoría" },
    { name: "concepto", label: "Concepto" },
    { name: "monto", label: "Monto (ARS)", type: "number", default: 0 },
  ];
  const balance = col.items.reduce((a, f) => a + (f.tipo === "Ingreso" ? Number(f.monto) || 0 : -(Number(f.monto) || 0)), 0);

  const saveConfig = async () => {
    await updateMontoCuota(Number(cuotaInput));
    await updateValorGramo(Number(valorGramoInput));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  return (
    <>
      <SectionHeader title="Finanzas" folio={`Libro IV · Balance ${fmtMoney(balance)}`} onAdd={() => setShowForm(true)} addLabel="+ Nuevo movimiento" />
      <div className="erp-card" style={{ marginBottom: 20 }}>
        <p className="erp-serif" style={{ fontSize: 15, marginBottom: 10 }}>Configuración de cuota</p>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
          El "Valor por gramo" es el que se usa para calcular el monto a cobrar en "Registrar pago" (Socios): gramos por cuota del socio × meses × valor del gramo. El "Monto de cuota" se usa como sugerencia al cargar una entrega manual en Dispensación.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Monto de cuota (ARS)">
            <input className="erp-input" style={{ width: 160 }} type="number" value={cuotaInput} onChange={(e) => setCuotaInput(Number(e.target.value))} />
          </Field>
          <Field label="Valor por gramo (ARS)">
            <input className="erp-input" style={{ width: 160 }} type="number" value={valorGramoInput} onChange={(e) => setValorGramoInput(Number(e.target.value))} />
          </Field>
          <button className="erp-btn erp-btn-primary" onClick={saveConfig}>Guardar</button>
          {savedMsg && <span style={{ fontSize: 12, color: "var(--moss-dark)" }}>Guardado ✓</span>}
        </div>
      </div>
      {showForm && <AddForm fields={fields} onCancel={() => setShowForm(false)} onSubmit={(v) => { col.add(v); setShowForm(false); }} />}
      <div className="erp-card">
        {col.items.length === 0 ? <p className="erp-empty">Todavía no hay movimientos cargados.</p> : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>N°</th><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th>Método</th><th>Monto</th><th></th></tr></thead>
            <tbody>
              {col.items.map((f, i) => (
                <tr key={f.id}>
                  <td className="erp-mono">{pad(i + 1)}</td>
                  <td>{fmtDate(f.fecha)}</td>
                  <td><span className={`erp-badge ${f.tipo === "Ingreso" ? "erp-badge-moss" : "erp-badge-rust"}`}>{f.tipo}</span></td>
                  <td>{f.categoria}</td>
                  <td>{f.concepto}</td>
                  <td style={{ color: "var(--ink-soft)" }}>{f.metodoPago || "—"}</td>
                  <td className="erp-mono" style={{ color: f.tipo === "Ingreso" ? "var(--moss-dark)" : "var(--rust)" }}>{f.tipo === "Ingreso" ? "+" : "-"}{fmtMoney(f.monto)}</td>
                  <td><button className="erp-btn erp-btn-danger" onClick={() => col.remove(f.id)}>Borrar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

const REPORTES = {
  padron: { label: "Padrón de socios", cols: [{ key: "nombre", label: "Nombre" }, { key: "dni", label: "DNI" }, { key: "reprocannNumero", label: "N° REPROCANN" }, { key: "reprocannVencimiento", label: "Vto. REPROCANN", date: true }, { key: "fechaAlta", label: "Fecha de alta", date: true }, { key: "estado", label: "Estado" }], dateField: "fechaAlta" },
  cultivo: { label: "Registro de cultivo", cols: [{ key: "lote", label: "Lote" }, { key: "fechaSiembra", label: "Siembra", date: true }, { key: "cantidadPlantas", label: "Plantas" }, { key: "etapa", label: "Etapa" }, { key: "gramosCosechados", label: "Gramos cosechados" }], dateField: "fechaSiembra" },
  dispensacion: { label: "Registro de dispensación", cols: [{ key: "fecha", label: "Fecha", date: true }, { key: "socioNombre", label: "Socio" }, { key: "tipo", label: "Tipo" }, { key: "cantidadGramos", label: "Gramos" }, { key: "tipoCobro", label: "Concepto" }, { key: "monto", label: "Monto" }, { key: "metodoPago", label: "Método" }, { key: "pagado", label: "Pagado" }, { key: "observaciones", label: "Observaciones" }], dateField: "fecha" },
  finanzas: { label: "Balance financiero", cols: [{ key: "fecha", label: "Fecha", date: true }, { key: "tipo", label: "Tipo" }, { key: "categoria", label: "Categoría" }, { key: "concepto", label: "Concepto" }, { key: "metodoPago", label: "Método" }, { key: "monto", label: "Monto" }], dateField: "fecha" },
};

function toCSV(cols, rows) {
  const header = cols.map((c) => c.label).join(";");
  const lines = rows.map((r) => cols.map((c) => String(r[c.key] ?? "").replace(/;/g, ",")).join(";"));
  return [header, ...lines].join("\n");
}

function downloadCSV(filename, csv) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ReportesView({ socios, cultivo, dispensacion, finanzas }) {
  const [tipo, setTipo] = useState("padron");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const dataByTipo = { padron: socios.items, cultivo: cultivo.items, dispensacion: dispensacion.items, finanzas: finanzas.items };
  const config = REPORTES[tipo];
  const rows = useMemo(() => {
    let items = dataByTipo[tipo];
    if (desde) items = items.filter((r) => r[config.dateField] && r[config.dateField] >= desde);
    if (hasta) items = items.filter((r) => r[config.dateField] && r[config.dateField] <= hasta);
    return items;
  }, [tipo, desde, hasta, socios.items, cultivo.items, dispensacion.items, finanzas.items]);

  return (
    <>
      <SectionHeader title="Reportes" folio={`Libro V · Para presentar ante la autoridad`} />
      <div className="erp-card no-print" style={{ marginBottom: 20 }}>
        <div className="erp-form-grid">
          <Field label="Tipo de reporte">
            <select className="erp-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {Object.entries(REPORTES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Desde"><input className="erp-input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
          <Field label="Hasta"><input className="erp-input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="erp-btn erp-btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
          <button className="erp-btn" onClick={() => downloadCSV(`${tipo}-${TODAY()}.csv`, toCSV(config.cols, rows))}>Exportar CSV</button>
        </div>
      </div>
      <div className="erp-card">
        <p className="erp-serif" style={{ fontSize: 16, marginBottom: 2 }}>{config.label}</p>
        <p className="erp-folio" style={{ marginBottom: 14 }}>Generado el {fmtDate(TODAY())} · {rows.length} registros</p>
        {rows.length === 0 ? <p className="erp-empty">No hay registros para el rango seleccionado.</p> : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr>{config.cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {config.cols.map((c) => (
                    <td key={c.key} className={c.date || c.key === "monto" ? "erp-mono" : ""}>
                      {c.date ? fmtDate(r[c.key]) : c.key === "monto" ? fmtMoney(r[c.key]) : (r[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function ERPCannabico() {
  const [entered, setEntered] = useState(false);
  const [section, setSection] = useState("dashboard");
  const [role, setRole] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const socios = useCollection("socios", authed);
  const cultivo = useCollection("cultivo", authed);
  const dispensacion = useCollection("dispensacion", authed);
  const finanzas = useCollection("finanzas", authed);
  const settingsHook = useSettings(authed);

  // Verifica si ya hay una sesión activa de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // El rol acá se guarda solo en el navegador de cada persona (no hace falta compartirlo)
  useEffect(() => {
    const saved = localStorage.getItem("erp-role");
    if (saved && ROLES[saved]) setRole(saved);
  }, []);

  const chooseRole = (key) => {
    setRole(key);
    setSection("dashboard");
    localStorage.setItem("erp-role", key);
  };
  const changeRole = () => {
    setRole(null);
    localStorage.removeItem("erp-role");
  };
  const logout = async () => {
    await supabase.auth.signOut();
    changeRole();
  };

  const allNav = [
    { key: "dashboard", label: "Panel", num: "00" },
    { key: "socios", label: "Socios", num: "01" },
    { key: "cultivo", label: "Cultivo", num: "02" },
    { key: "dispensacion", label: "Dispensación", num: "03" },
    { key: "finanzas", label: "Finanzas", num: "04" },
    { key: "reportes", label: "Reportes", num: "05" },
  ];

  const allLoaded = socios.loaded && cultivo.loaded && dispensacion.loaded && finanzas.loaded;

  if (!entered) return <div className="erp-root"><GlobalStyle /><Landing onEnter={() => setEntered(true)} /></div>;
  if (!authLoaded) return <div className="erp-root"><GlobalStyle /></div>;
  if (!authed) return <div className="erp-root"><GlobalStyle /><LoginGate onSuccess={() => setAuthed(true)} /></div>;
  if (!role) return <div className="erp-root"><GlobalStyle /><RoleGate onSelect={chooseRole} /></div>;

  const nav = allNav.filter((n) => ROLES[role].sections.includes(n.key));
  const visibleSection = ROLES[role].sections.includes(section) ? section : "dashboard";

  return (
    <div className="erp-root">
      <GlobalStyle />
      <button className="erp-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">☰</button>
      <div className={`erp-overlay ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />
      <aside className={`erp-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="erp-brand">
          <p className="erp-brand-title erp-serif">Registro Asociativo</p>
          <p className="erp-brand-sub">GESTIÓN ASOCIACIÓN CANNÁBICA</p>
        </div>
        {nav.map((n) => (
          <button key={n.key} className={`erp-nav-item ${visibleSection === n.key ? "active" : ""}`} onClick={() => { setSection(n.key); setMenuOpen(false); }}>
            <span className="erp-nav-num">{n.num}</span><span>{n.label}</span>
          </button>
        ))}
        <div className="erp-user-chip">
          Rol: {ROLES[role].label}<br />
          <button onClick={changeRole}>Cambiar rol</button>
          {" · "}
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="erp-main">
        {!allLoaded ? <p className="erp-empty">Cargando registros…</p> : (
          <>
            {visibleSection === "dashboard" && <Dashboard socios={socios} cultivo={cultivo} dispensacion={dispensacion} finanzas={finanzas} />}
            {visibleSection === "socios" && <SociosView col={socios} dispensacion={dispensacion} finanzas={finanzas} settings={settingsHook.settings} />}
            {visibleSection === "cultivo" && <CultivoView col={cultivo} />}
            {visibleSection === "dispensacion" && <DispensacionView col={dispensacion} socios={socios} finanzas={finanzas} settings={settingsHook.settings} />}
            {visibleSection === "finanzas" && <FinanzasView col={finanzas} settings={settingsHook.settings} updateMontoCuota={settingsHook.updateMontoCuota} updateValorGramo={settingsHook.updateValorGramo} />}
            {visibleSection === "reportes" && <ReportesView socios={socios} cultivo={cultivo} dispensacion={dispensacion} finanzas={finanzas} />}
          </>
        )}
      </main>
    </div>
  );
}