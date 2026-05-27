import { useState, useMemo, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// ─── Helpers ────────────────────────────────────────────────────────────────

const toDate = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
};

const diffHoras = (a, b) => {
  const da = toDate(a), db = toDate(b);
  if (!da || !db) return null;
  return Math.round((db - da) / 36e5 * 10) / 10; // horas con 1 decimal
};

const formatHoras = (h) => {
  if (h === null || h === undefined) return "—";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24), hs = h % 24;
  return hs > 0 ? `${d}d ${hs}h` : `${d}d`;
};

const PERIODOS = [
  { id: "hoy",     label: "Hoy" },
  { id: "7d",      label: "Últimos 7 días" },
  { id: "30d",     label: "Últimos 30 días" },
  { id: "mes",     label: "Este mes" },
  { id: "anio",    label: "Este año" },
  { id: "custom",  label: "Rango personalizado" },
];

const REPORTES = [
  { id: "resumen",    label: "Resumen general",      icono: "📊" },
  { id: "categorias", label: "Por categoría",         icono: "🏷️" },
  { id: "areas",      label: "Por área",              icono: "📍" },
  { id: "demoras",    label: "Tiempos y demoras",     icono: "⏱️" },
  { id: "estados",    label: "Por estado actual",     icono: "🔄" },
  { id: "mapa",       label: "Mapa de reclamos",      icono: "🗺️" },
];

const estadoConfig = {
  pendiente:   { label: "Pendiente",     color: "#f59e0b" },
  asignado:    { label: "Asignado",      color: "#f97316" },
  "en proceso":{ label: "En proceso",   color: "#3b82f6" },
  verificar:   { label: "Por verificar", color: "#8b5cf6" },
  resuelto:    { label: "Resuelto",      color: "#10b981" },
};

// ─── Mini barra horizontal ───────────────────────────────────────────────────
function Barra({ valor, max, color = "#3dbfbf" }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Tarjeta KPI ─────────────────────────────────────────────────────────────
function KPI({ icono, label, valor, sub, color = "#3dbfbf" }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icono}</span>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-black" style={{ color }}>{valor}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Mapa de reclamos ────────────────────────────────────────────────────────
const COLORES_CATEGORIA = [
  "#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#8338ec",
  "#fb5607", "#06d6a0", "#118ab2", "#ef476f", "#ffd166",
];

function MapaReclamos({ reclamos, categorias }) {
  const mapaRef = useRef(null);
  const mapaInstancia = useRef(null);

  const colorPorCategoria = useMemo(() => {
    const mapa = {};
    categorias.forEach((cat, i) => {
      mapa[cat.id] = COLORES_CATEGORIA[i % COLORES_CATEGORIA.length];
    });
    return mapa;
  }, [categorias]);

  const reclamosConUbicacion = useMemo(() =>
    reclamos.filter(r => r.ubicacion?.lat && r.ubicacion?.lng),
  [reclamos]);

  useEffect(() => {
    // Cargar Leaflet CSS si no está
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Cargar Leaflet JS
    const cargarLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) { resolve(window.L); return; }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve(window.L);
        document.head.appendChild(script);
      });
    };

    cargarLeaflet().then((L) => {
      if (!mapaRef.current) return;
      if (mapaInstancia.current) {
        mapaInstancia.current.remove();
        mapaInstancia.current = null;
      }

      // Centro por defecto: Soriano, Uruguay
      const centro = reclamosConUbicacion.length > 0
        ? [reclamosConUbicacion[0].ubicacion.lat, reclamosConUbicacion[0].ubicacion.lng]
        : [-33.4, -58.0];

      const map = L.map(mapaRef.current).setView(centro, 13);
      mapaInstancia.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
      }).addTo(map);

      reclamosConUbicacion.forEach((r) => {
        const color = colorPorCategoria[r.categoriaId] || "#3dbfbf";
        const icono = L.divIcon({
          className: "",
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([r.ubicacion.lat, r.ubicacion.lng], { icon: icono })
          .addTo(map)
          .bindPopup(`
            <b>${r.categoria || "Sin categoría"}</b><br/>
            ${r.nombre}<br/>
            <span style="color:#6b7280;font-size:12px">${r.descripcion?.substring(0, 60)}...</span>
          `);
      });
    });

    return () => {
      if (mapaInstancia.current) {
        mapaInstancia.current.remove();
        mapaInstancia.current = null;
      }
    };
  }, [reclamosConUbicacion, colorPorCategoria]);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-700">Mapa de reclamos</h3>
        <p className="text-xs text-gray-400 mt-1">{reclamosConUbicacion.length} reclamos con ubicación registrada</p>
      </div>

      {/* Leyenda */}
      <div className="px-4 pt-3 flex flex-wrap gap-2">
        {categorias.map((cat, i) => (
          <div key={cat.id} className="flex items-center gap-1 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length] }} />
            {cat.nombre}
          </div>
        ))}
      </div>

      {reclamosConUbicacion.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-3xl mb-2">📍</p>
          <p className="text-gray-400 text-sm">No hay reclamos con ubicación registrada</p>
        </div>
      ) : (
        <div ref={mapaRef} style={{ height: "420px", width: "100%" }} className="mt-3" />
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
function PanelReportes({ reclamos, categorias, areas }) {
  const [reporte, setReporte] = useState("resumen");
  const [periodo, setPeriodo] = useState("30d");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // ── Filtrar por período ──────────────────────────────────────────────────
  const reclamosFiltrados = useMemo(() => {
    const ahora = new Date();
    let desde, hasta;

    if (periodo === "custom") {
      desde = fechaDesde ? new Date(fechaDesde) : null;
      hasta = fechaHasta ? new Date(fechaHasta + "T23:59:59") : null;
    } else {
      hasta = ahora;
      if (periodo === "hoy") {
        desde = new Date(ahora); desde.setHours(0, 0, 0, 0);
      } else if (periodo === "7d") {
        desde = new Date(ahora - 7 * 864e5);
      } else if (periodo === "30d") {
        desde = new Date(ahora - 30 * 864e5);
      } else if (periodo === "mes") {
        desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      } else if (periodo === "anio") {
        desde = new Date(ahora.getFullYear(), 0, 1);
      }
    }

    return reclamos.filter((r) => {
      const f = toDate(r.fecha);
      if (!f) return false;
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    });
  }, [reclamos, periodo, fechaDesde, fechaHasta]);

  // ── Datos derivados ──────────────────────────────────────────────────────
  const porCategoria = useMemo(() => {
    const map = {};
    reclamosFiltrados.forEach((r) => {
      const k = r.categoria || "Sin categoría";
      if (!map[k]) map[k] = { total: 0, resueltos: 0, pendientes: 0 };
      map[k].total++;
      if (r.estado === "resuelto") map[k].resueltos++;
      if (r.estado === "pendiente") map[k].pendientes++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [reclamosFiltrados]);

  const porArea = useMemo(() => {
    const map = {};
    reclamosFiltrados.forEach((r) => {
      if (!r.areaId) return;
      const area = areas.find((a) => a.id === r.areaId);
      const k = area?.nombre || r.areaId;
      if (!map[k]) map[k] = { total: 0, resueltos: 0, enProceso: 0 };
      map[k].total++;
      if (r.estado === "resuelto") map[k].resueltos++;
      if (r.estado === "en proceso") map[k].enProceso++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [reclamosFiltrados, areas]);

  const porEstado = useMemo(() => {
    const map = {};
    reclamosFiltrados.forEach((r) => {
      const k = r.estado || "sin estado";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [reclamosFiltrados]);

  const demoras = useMemo(() => {
    return reclamosFiltrados
      .filter((r) => r.estado === "resuelto" || r.estado === "verificar")
      .map((r) => ({
        id: r.id,
        nombre: r.nombre,
        categoria: r.categoria,
        area: areas.find((a) => a.id === r.areaId)?.nombre || "—",
        etapa1: diffHoras(r.fecha, r.fechaAsignado),
        etapa2: diffHoras(r.fechaAsignado, r.fechaEnProceso),
        etapa3: diffHoras(r.fechaEnProceso, r.fechaVerificar || r.fechaResolucion),
        etapa4: diffHoras(r.fechaVerificar || r.fechaResolucion, r.fechaResuelto),
        total: diffHoras(r.fecha, r.fechaResuelto || r.fechaVerificar || r.fechaResolucion),
      }))
      .filter((r) => r.total !== null)
      .sort((a, b) => b.total - a.total);
  }, [reclamosFiltrados, areas]);

  const promedioTotal = useMemo(() => {
    if (!demoras.length) return null;
    return Math.round(demoras.reduce((s, r) => s + (r.total || 0), 0) / demoras.length * 10) / 10;
  }, [demoras]);

  // ── Exportar Excel ───────────────────────────────────────────────────────
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja resumen
    const resumenData = [
      ["Reporte de Reclamos - Intendencia de Soriano"],
      ["Período", PERIODOS.find(p => p.id === periodo)?.label],
      ["Generado", new Date().toLocaleString("es-UY")],
      [],
      ["Total reclamos", reclamosFiltrados.length],
      ["Resueltos", reclamosFiltrados.filter(r => r.estado === "resuelto").length],
      ["Pendientes", reclamosFiltrados.filter(r => r.estado === "pendiente").length],
      ["En proceso", reclamosFiltrados.filter(r => r.estado === "en proceso").length],
      ["Promedio resolución (horas)", promedioTotal ?? "—"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), "Resumen");

    // Hoja por categoría
    const catData = [
      ["Categoría", "Total", "Resueltos", "Pendientes", "% Resueltos"],
      ...porCategoria.map(([cat, d]) => [
        cat, d.total, d.resueltos, d.pendientes,
        d.total > 0 ? `${Math.round(d.resueltos / d.total * 100)}%` : "0%"
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catData), "Por Categoría");

    // Hoja por área
    const areaData = [
      ["Área", "Total", "Resueltos", "En proceso"],
      ...porArea.map(([area, d]) => [area, d.total, d.resueltos, d.enProceso])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(areaData), "Por Área");

    // Hoja demoras
    const demorasData = [
      ["Reclamo", "Categoría", "Área", "Pendiente→Asignado", "Asignado→En proceso", "En proceso→Verificar", "Verificar→Resuelto", "Total (horas)"],
      ...demoras.map(r => [
        r.nombre, r.categoria, r.area,
        r.etapa1 ?? "—", r.etapa2 ?? "—", r.etapa3 ?? "—", r.etapa4 ?? "—", r.total ?? "—"
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(demorasData), "Demoras");

    XLSX.writeFile(wb, `reporte-soriano-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ── Exportar PDF (impresión) ─────────────────────────────────────────────
  const exportarPDF = () => window.print();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {PERIODOS.map((p) => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition"
              style={{ backgroundColor: periodo === p.id ? "#3dbfbf" : "#f3f4f6", color: periodo === p.id ? "white" : "#6b7280" }}>
              {p.label}
            </button>
          ))}
        </div>
        {periodo === "custom" && (
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                className="border-2 rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#3dbfbf" }} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                className="border-2 rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#3dbfbf" }} />
            </div>
          </div>
        )}
      </div>

      {/* Selector de reporte */}
      <div className="flex gap-2 flex-wrap mb-4">
        {REPORTES.map((r) => (
          <button key={r.id} onClick={() => setReporte(r.id)}
            className="text-sm px-4 py-2 rounded-xl font-semibold transition shadow-sm"
            style={{ backgroundColor: reporte === r.id ? "#3dbfbf" : "white", color: reporte === r.id ? "white" : "#6b7280" }}>
            {r.icono} {r.label}
          </button>
        ))}
      </div>

      {/* Botones exportar */}
      <div className="flex gap-2 mb-6 justify-end">
        <button onClick={exportarExcel}
          className="flex items-center gap-1 text-sm px-4 py-2 rounded-xl font-semibold text-white transition"
          style={{ backgroundColor: "#10b981" }}>
          📥 Exportar Excel
        </button>
        <button onClick={exportarPDF}
          className="flex items-center gap-1 text-sm px-4 py-2 rounded-xl font-semibold text-white transition"
          style={{ backgroundColor: "#6b7280" }}>
          🖨️ Exportar PDF
        </button>
      </div>

      {/* ── RESUMEN GENERAL ── */}
      {reporte === "resumen" && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
            <KPI icono="📋" label="Total reclamos" valor={reclamosFiltrados.length} />
            <KPI icono="✅" label="Resueltos" valor={reclamosFiltrados.filter(r => r.estado === "resuelto").length} color="#10b981" />
            <KPI icono="⏳" label="Pendientes" valor={reclamosFiltrados.filter(r => r.estado === "pendiente").length} color="#f59e0b" />
            <KPI icono="⏱️" label="Promedio resolución" valor={promedioTotal ? formatHoras(promedioTotal) : "—"} sub="tiempo total" color="#8b5cf6" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="font-bold text-gray-700 mb-4">Distribución por estado</h3>
            <div className="space-y-3">
              {porEstado.map(([estado, count]) => (
                <div key={estado}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{estadoConfig[estado]?.label || estado}</span>
                    <span className="font-bold" style={{ color: estadoConfig[estado]?.color || "#3dbfbf" }}>{count}</span>
                  </div>
                  <Barra valor={count} max={reclamosFiltrados.length} color={estadoConfig[estado]?.color || "#3dbfbf"} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-gray-700 mb-4">Top categorías</h3>
            <div className="space-y-3">
              {porCategoria.slice(0, 5).map(([cat, d]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{cat}</span>
                    <span className="font-bold" style={{ color: "#3dbfbf" }}>{d.total}</span>
                  </div>
                  <Barra valor={d.total} max={porCategoria[0]?.[1]?.total || 1} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── POR CATEGORÍA ── */}
      {reporte === "categorias" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Reclamos por categoría</h3>
            <p className="text-xs text-gray-400 mt-0.5">{reclamosFiltrados.length} reclamos en el período</p>
          </div>
          <div className="divide-y divide-gray-50">
            {porCategoria.map(([cat, d]) => (
              <div key={cat} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">{cat}</p>
                  <span className="text-lg font-black" style={{ color: "#3dbfbf" }}>{d.total}</span>
                </div>
                <Barra valor={d.total} max={porCategoria[0]?.[1]?.total || 1} />
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="text-green-600 font-medium">✅ {d.resueltos} resueltos</span>
                  <span className="text-yellow-600 font-medium">⏳ {d.pendientes} pendientes</span>
                  <span className="text-gray-400">{d.total > 0 ? Math.round(d.resueltos / d.total * 100) : 0}% completados</span>
                </div>
              </div>
            ))}
            {porCategoria.length === 0 && (
              <p className="text-center text-gray-400 py-10">Sin datos en el período seleccionado</p>
            )}
          </div>
        </div>
      )}

      {/* ── POR ÁREA ── */}
      {reporte === "areas" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Reclamos por área</h3>
            <p className="text-xs text-gray-400 mt-0.5">Solo reclamos asignados a un área</p>
          </div>
          <div className="divide-y divide-gray-50">
            {porArea.map(([area, d]) => (
              <div key={area} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">{area}</p>
                  <span className="text-lg font-black" style={{ color: "#3dbfbf" }}>{d.total}</span>
                </div>
                <Barra valor={d.total} max={porArea[0]?.[1]?.total || 1} />
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-600 font-medium">✅ {d.resueltos} resueltos</span>
                  <span className="text-blue-600 font-medium">🔧 {d.enProceso} en proceso</span>
                  <span className="text-gray-400">{d.total > 0 ? Math.round(d.resueltos / d.total * 100) : 0}% completados</span>
                </div>
              </div>
            ))}
            {porArea.length === 0 && (
              <p className="text-center text-gray-400 py-10">Sin datos en el período seleccionado</p>
            )}
          </div>
        </div>
      )}

      {/* ── DEMORAS ── */}
      {reporte === "demoras" && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
            <KPI icono="⏱️" label="Promedio total" valor={promedioTotal ? formatHoras(promedioTotal) : "—"} color="#8b5cf6" />
            <KPI icono="📋" label="Casos analizados" valor={demoras.length} />
            <KPI icono="🐢" label="Más lento" valor={demoras[0] ? formatHoras(demoras[0].total) : "—"} color="#ef4444" />
            <KPI icono="🚀" label="Más rápido" valor={demoras[demoras.length - 1] ? formatHoras(demoras[demoras.length - 1].total) : "—"} color="#10b981" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-700">Detalle de tiempos por etapa</h3>
              <p className="text-xs text-gray-400 mt-0.5">Solo reclamos resueltos o en verificación</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-semibold">Reclamo</th>
                    <th className="text-left px-4 py-3 font-semibold">Categoría</th>
                    <th className="text-center px-3 py-3 font-semibold">Pend.→Asig.</th>
                    <th className="text-center px-3 py-3 font-semibold">Asig.→Proc.</th>
                    <th className="text-center px-3 py-3 font-semibold">Proc.→Verif.</th>
                    <th className="text-center px-3 py-3 font-semibold">Verif.→Res.</th>
                    <th className="text-center px-3 py-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {demoras.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">{r.categoria}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{formatHoras(r.etapa1)}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{formatHoras(r.etapa2)}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{formatHoras(r.etapa3)}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{formatHoras(r.etapa4)}</td>
                      <td className="px-3 py-3 text-center font-bold" style={{ color: "#8b5cf6" }}>{formatHoras(r.total)}</td>
                    </tr>
                  ))}
                  {demoras.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-400 py-10">Sin datos en el período seleccionado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── POR ESTADO ── */}
      {reporte === "estados" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Reclamos por estado actual</h3>
          </div>
          <div className="p-4 space-y-4">
            {Object.entries(estadoConfig).map(([estado, cfg]) => {
              const count = reclamosFiltrados.filter(r => r.estado === estado).length;
              return (
                <div key={estado}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">{cfg.label}</span>
                    <span className="text-xl font-black" style={{ color: cfg.color }}>{count}</span>
                  </div>
                  <Barra valor={count} max={reclamosFiltrados.length} color={cfg.color} />
                  <p className="text-xs text-gray-400 mt-0.5">
                    {reclamosFiltrados.length > 0 ? Math.round(count / reclamosFiltrados.length * 100) : 0}% del total
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── MAPA ── */}
      {reporte === "mapa" && (
        <MapaReclamos reclamos={reclamos} categorias={categorias} />
      )}
    </div>
  );
}

export default PanelReportes;
