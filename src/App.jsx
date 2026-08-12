// =====================================================
// src/App.jsx — versión Supabase con login compartido
// =====================================================
// 1. Completá SUPABASE_URL y SUPABASE_ANON_KEY con tus datos.
// 2. Completá AUTH_EMAIL con el mismo email que uses para crear
//    el usuario compartido en Supabase (paso a paso aparte).
// 3. npm install @supabase/supabase-js
// =====================================================

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iochhkqjchsplbgwzvlw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvY2hoa3FqY2hzcGxiZ3d6dmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MDE4MzUsImV4cCI6MjEwMTk3NzgzNX0.TQQSN53_05CtRUcyGG6eE1cE3A-unxlTIhI-vlhP30A";
const AUTH_EMAIL = "zuluclub.inc@gmail.com"; // <-- completar con el email del usuario compartido
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapea nombres de campos del formulario (camelCase) <-> columnas de la tabla (snake_case)
const FIELD_MAPS = {
  socios: {
    nombre: "nombre", dni: "dni", reprocannNumero: "reprocann_numero",
    reprocannVencimiento: "reprocann_vencimiento", fechaAlta: "fecha_alta",
    telefono: "telefono", cuotaAlDia: "cuota_al_dia", estado: "estado",
  },
  cultivo: {
    lote: "lote", fechaSiembra: "fecha_siembra", cantidadPlantas: "cantidad_plantas",
    etapa: "etapa", fechaCosechaEstimada: "fecha_cosecha_estimada",
    gramosCosechados: "gramos_cosechados",
  },
  dispensacion: {
    socioNombre: "socio_nombre", fecha: "fecha", tipo: "tipo",
    cantidadGramos: "cantidad_gramos", observaciones: "observaciones",
  },
  finanzas: {
    fecha: "fecha", tipo: "tipo", categoria: "categoria",
    concepto: "concepto", monto: "monto",
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
function useCollection(table) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
    if (error) { console.error(error); setLoaded(true); return; }
    setItems(data.map((r) => fromDb(table, r)));
    setLoaded(true);
  };

  useEffect(() => { reload(); }, [table]);

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

function Field({ label, children }) {
  return (
    <div>
      <label className="erp-field-label">{label}</label>
      {children}
    </div>
  );
}

function AddForm({ fields, onSubmit, onCancel }) {
  const initial = {};
  fields.forEach((f) => (initial[f.name] = f.default !== undefined ? f.default : ""));
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
        <button className="erp-btn erp-btn-primary" onClick={() => onSubmit(values)}>Guardar registro</button>
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
    const atrasados = activos.filter((s) => !s.cuotaAlDia);
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

function SociosView({ col }) {
  const [showForm, setShowForm] = useState(false);
  const fields = [
    { name: "nombre", label: "Nombre completo" },
    { name: "dni", label: "DNI" },
    { name: "reprocannNumero", label: "N° REPROCANN" },
    { name: "reprocannVencimiento", label: "Vto. REPROCANN", type: "date" },
    { name: "fechaAlta", label: "Fecha de alta", type: "date", default: TODAY() },
    { name: "telefono", label: "Teléfono" },
    { name: "cuotaAlDia", label: "Cuota al día", type: "checkbox", default: true },
    { name: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"], default: "Activo" },
  ];
  return (
    <>
      <SectionHeader title="Socios" folio={`Libro I · ${col.items.length} registrados`} onAdd={() => setShowForm(true)} addLabel="+ Nuevo socio" />
      {showForm && <AddForm fields={fields} onCancel={() => setShowForm(false)} onSubmit={(v) => { col.add(v); setShowForm(false); }} />}
      <div className="erp-card">
        {col.items.length === 0 ? <p className="erp-empty">Todavía no hay socios cargados.</p> : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>N°</th><th>Nombre</th><th>DNI</th><th>REPROCANN</th><th>Vence</th><th>Cuota</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {col.items.map((s, i) => (
                <tr key={s.id}>
                  <td className="erp-mono">{pad(i + 1)}</td>
                  <td>{s.nombre}</td>
                  <td className="erp-mono">{s.dni}</td>
                  <td className="erp-mono">{s.reprocannNumero || "—"}</td>
                  <td>{fmtDate(s.reprocannVencimiento)}</td>
                  <td><button className={`erp-badge ${s.cuotaAlDia ? "erp-badge-moss" : "erp-badge-rust"}`} onClick={() => col.update(s.id, { cuotaAlDia: !s.cuotaAlDia })} style={{ border: "none", cursor: "pointer" }}>{s.cuotaAlDia ? "Al día" : "Atrasada"}</button></td>
                  <td><span className={`erp-badge ${s.estado === "Activo" ? "erp-badge-moss" : "erp-badge-soil"}`}>{s.estado}</span></td>
                  <td><button className="erp-btn erp-btn-danger" onClick={() => col.remove(s.id)}>Borrar</button></td>
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

function DispensacionView({ col, socios }) {
  const [showForm, setShowForm] = useState(false);
  const fields = [
    { name: "socioNombre", label: "Socio", type: "select", options: socios.items.length ? socios.items.map((s) => s.nombre) : ["Sin socios cargados"] },
    { name: "fecha", label: "Fecha", type: "date", default: TODAY() },
    { name: "tipo", label: "Tipo de producto", type: "select", options: ["Flor", "Aceite", "Extracto", "Semilla", "Otro"] },
    { name: "cantidadGramos", label: "Cantidad (g)", type: "number", default: 0 },
    { name: "observaciones", label: "Observaciones" },
  ];
  return (
    <>
      <SectionHeader title="Dispensación" folio={`Libro III · ${col.items.length} entregas`} onAdd={() => setShowForm(true)} addLabel="+ Nueva entrega" />
      {showForm && <AddForm fields={fields} onCancel={() => setShowForm(false)} onSubmit={(v) => { col.add(v); setShowForm(false); }} />}
      <div className="erp-card">
        {col.items.length === 0 ? <p className="erp-empty">Todavía no hay entregas registradas.</p> : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>N°</th><th>Fecha</th><th>Socio</th><th>Tipo</th><th>Cantidad</th><th>Obs.</th><th></th></tr></thead>
            <tbody>
              {col.items.map((d, i) => (
                <tr key={d.id}>
                  <td className="erp-mono">{pad(i + 1)}</td>
                  <td>{fmtDate(d.fecha)}</td>
                  <td>{d.socioNombre}</td>
                  <td><span className="erp-badge erp-badge-slate">{d.tipo}</span></td>
                  <td className="erp-mono">{fmtG(d.cantidadGramos)}</td>
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

function FinanzasView({ col }) {
  const [showForm, setShowForm] = useState(false);
  const fields = [
    { name: "fecha", label: "Fecha", type: "date", default: TODAY() },
    { name: "tipo", label: "Tipo", type: "select", options: ["Ingreso", "Egreso"] },
    { name: "categoria", label: "Categoría" },
    { name: "concepto", label: "Concepto" },
    { name: "monto", label: "Monto (ARS)", type: "number", default: 0 },
  ];
  const balance = col.items.reduce((a, f) => a + (f.tipo === "Ingreso" ? Number(f.monto) || 0 : -(Number(f.monto) || 0)), 0);
  return (
    <>
      <SectionHeader title="Finanzas" folio={`Libro IV · Balance ${fmtMoney(balance)}`} onAdd={() => setShowForm(true)} addLabel="+ Nuevo movimiento" />
      {showForm && <AddForm fields={fields} onCancel={() => setShowForm(false)} onSubmit={(v) => { col.add(v); setShowForm(false); }} />}
      <div className="erp-card">
        {col.items.length === 0 ? <p className="erp-empty">Todavía no hay movimientos cargados.</p> : (
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead><tr><th>N°</th><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th>Monto</th><th></th></tr></thead>
            <tbody>
              {col.items.map((f, i) => (
                <tr key={f.id}>
                  <td className="erp-mono">{pad(i + 1)}</td>
                  <td>{fmtDate(f.fecha)}</td>
                  <td><span className={`erp-badge ${f.tipo === "Ingreso" ? "erp-badge-moss" : "erp-badge-rust"}`}>{f.tipo}</span></td>
                  <td>{f.categoria}</td>
                  <td>{f.concepto}</td>
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
  dispensacion: { label: "Registro de dispensación", cols: [{ key: "fecha", label: "Fecha", date: true }, { key: "socioNombre", label: "Socio" }, { key: "tipo", label: "Tipo" }, { key: "cantidadGramos", label: "Gramos" }, { key: "observaciones", label: "Observaciones" }], dateField: "fecha" },
  finanzas: { label: "Balance financiero", cols: [{ key: "fecha", label: "Fecha", date: true }, { key: "tipo", label: "Tipo" }, { key: "categoria", label: "Categoría" }, { key: "concepto", label: "Concepto" }, { key: "monto", label: "Monto" }], dateField: "fecha" },
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
  const [section, setSection] = useState("dashboard");
  const [role, setRole] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const socios = useCollection("socios");
  const cultivo = useCollection("cultivo");
  const dispensacion = useCollection("dispensacion");
  const finanzas = useCollection("finanzas");

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
            {visibleSection === "socios" && <SociosView col={socios} />}
            {visibleSection === "cultivo" && <CultivoView col={cultivo} />}
            {visibleSection === "dispensacion" && <DispensacionView col={dispensacion} socios={socios} />}
            {visibleSection === "finanzas" && <FinanzasView col={finanzas} />}
            {visibleSection === "reportes" && <ReportesView socios={socios} cultivo={cultivo} dispensacion={dispensacion} finanzas={finanzas} />}
          </>
        )}
      </main>
    </div>
  );
}