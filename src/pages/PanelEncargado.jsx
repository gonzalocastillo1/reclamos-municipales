import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import Notificaciones from "../Notificaciones.jsx";
import { crearNotificacion } from "../notificaciones";

function PanelEncargado({ usuario }) {
  const [reclamos, setReclamos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [asignando, setAsignando] = useState(null);
  const [areaSeleccionada, setAreaSeleccionada] = useState("");
  const [derivando, setDerivando] = useState(null);
  const [categoriaDerivacion, setCategoriaDerivacion] = useState("");
  const [pestana, setPestana] = useState("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    if (!usuario || !usuario.categoriaId) return;

    const q = query(
      collection(db, "reclamos"),
      where("categoriaId", "==", usuario.categoriaId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      datos.sort((a, b) => b.fecha?.toMillis() - a.fecha?.toMillis());
      setReclamos(datos);
      setCargando(false);
    });

    const unsubAreas = onSnapshot(
      query(collection(db, "areas"), where("categoriaId", "==", usuario.categoriaId)),
      (snap) => setAreas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubUsuarios = onSnapshot(collection(db, "usuarios"), (snap) => {
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubCategorias = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); unsubAreas(); unsubUsuarios(); unsubCategorias(); };
  }, [usuario]);

  const derivarCategoria = async (reclamo) => {
    if (!categoriaDerivacion) return alert("Seleccioná una categoría");
    const cat = categorias.find(c => c.id === categoriaDerivacion);
    await updateDoc(doc(db, "reclamos", reclamo.id), {
      categoriaId: categoriaDerivacion,
      categoria: cat?.nombre || "",
      estado: "pendiente",
      areaId: "",
    });

    // Notificar al encargado de la nueva categoría
    const encargados = usuarios.filter(u => u.rol === "encargado" && u.categoriaId === categoriaDerivacion);
    for (const encargado of encargados) {
      await crearNotificacion({
        para: encargado.email,
        tipo: "nueva_tarea",
        mensaje: `Reclamo derivado a tu categoría: ${cat?.nombre} - ${reclamo.descripcion.substring(0, 50)}...`,
        reclamoId: reclamo.id,
      });
    }

    setDerivando(null);
    setCategoriaDerivacion("");
  };

  const asignarArea = async (reclamo) => {
    if (!areaSeleccionada) return alert("Seleccioná un área");
    await updateDoc(doc(db, "reclamos", reclamo.id), {
      areaId: areaSeleccionada,
      estado: "asignado",
      fechaAsignado: new Date(),
    });

    // Notificar al ejecutor del área
    const ejecutor = usuarios.find(u => u.areaId === areaSeleccionada && u.rol === "ejecutor");
    if (ejecutor) {
      await crearNotificacion({
        para: ejecutor.email,
        tipo: "nueva_tarea",
        mensaje: `Nueva tarea asignada: ${reclamo.categoria} - ${reclamo.descripcion.substring(0, 50)}...`,
        reclamoId: reclamo.id,
      });
    }

    // Notificar al admin
    const admins = usuarios.filter(u => u.rol === "admin");
    for (const admin of admins) {
      await crearNotificacion({
        para: admin.email,
        tipo: "tarea_asignada",
        mensaje: `Tarea asignada en ${reclamo.categoria}: ${reclamo.descripcion.substring(0, 50)}...`,
        reclamoId: reclamo.id,
      });
    }

    setAsignando(null);
    setAreaSeleccionada("");
  };

  const marcarResuelto = async (reclamo) => {
    if (!window.confirm("¿Confirmás que el trabajo fue verificado y el reclamo está resuelto?")) return;
    await updateDoc(doc(db, "reclamos", reclamo.id), { estado: "resuelto", fechaResuelto: new Date() });
    // Notificar al admin
    const admins = usuarios.filter(u => u.rol === "admin");
    for (const admin of admins) {
      await crearNotificacion({
        para: admin.email,
        tipo: "tarea_resuelta",
        mensaje: `Tarea resuelta en ${reclamo.categoria}: ${reclamo.descripcion.substring(0, 50)}...`,
        reclamoId: reclamo.id,
      });
    }
  };

  const estadoConfig = {
    pendiente: { bg: "bg-yellow-100", texto: "text-yellow-800", label: "Pendiente" },
    asignado: { bg: "bg-orange-100", texto: "text-orange-800", label: "Asignado" },
    "en proceso": { bg: "bg-blue-100", texto: "text-blue-800", label: "En proceso" },
    verificar: { bg: "bg-purple-100", texto: "text-purple-800", label: "Por verificar" },
    resuelto: { bg: "bg-green-100", texto: "text-green-800", label: "Resuelto" },
  };

  const pendientes = reclamos.filter(r => r.estado === "pendiente");
  const enCurso = reclamos.filter(r => ["asignado", "en proceso"].includes(r.estado));
  const paraVerificar = reclamos.filter(r => r.estado === "verificar");
  const resueltos = reclamos.filter(r => r.estado === "resuelto");

  const pestanas = [
    { id: "pendientes", label: "Pendientes", count: pendientes.length },
    { id: "encurso", label: "En curso", count: enCurso.length },
    { id: "verificar", label: "Por verificar", count: paraVerificar.length },
    { id: "resueltos", label: "Resueltos", count: resueltos.length },
  ];

  const reclamosMostrados = {
    pendientes,
    encurso: enCurso,
    verificar: paraVerificar,
    resueltos,
  }[pestana];

  const busquedaLower = busqueda.toLowerCase();
  const reclamosFiltradosBusqueda = busqueda
    ? reclamos.filter(r =>
        r.nombre?.toLowerCase().includes(busquedaLower) ||
        r.telefono?.toLowerCase().includes(busquedaLower) ||
        r.descripcion?.toLowerCase().includes(busquedaLower)
      )
    : reclamosMostrados;

  const totalPaginas = Math.ceil((reclamosFiltradosBusqueda?.length || 0) / POR_PAGINA);
  const reclamosPagina = reclamosFiltradosBusqueda?.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="min-h-screen" style={{background: "linear-gradient(160deg, #e8f8f8 0%, #f0fafa 40%, #eaf4f4 100%)"}}>
      <div className="shadow-sm px-6 py-3 flex items-center justify-between" style={{background: "linear-gradient(135deg, #3dbfbf 0%, #2a9d9d 60%, #1a7a7a 100%)"}}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo Soriano" className="h-10 w-auto drop-shadow" />
          <div>
            <p className="text-xs text-white opacity-70 uppercase tracking-widest">Panel encargado</p>
            <h1 className="text-lg font-bold text-white">{usuario.categoria}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Notificaciones email={usuario.email} />
          <button onClick={() => signOut(auth)}
            className="text-sm text-white opacity-70 hover:opacity-100 transition font-medium">
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {pestanas.map((p) => (
            <div key={p.id} onClick={() => { setPestana(p.id); setPagina(1); setBusqueda(""); }}
              className="rounded-xl p-3 text-center cursor-pointer transition shadow-sm"
              style={{backgroundColor: pestana === p.id ? "#3dbfbf" : "white"}}>
              <p className="text-xl font-black" style={{color: pestana === p.id ? "white" : "#3dbfbf"}}>{p.count}</p>
              <p className="text-xs" style={{color: pestana === p.id ? "white" : "#6b7280"}}>{p.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-6">
        {cargando && <p className="text-center text-gray-400 py-10">Cargando reclamos...</p>}

        {/* BUSCADOR */}
        {!cargando && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, teléfono o descripción..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition"
              style={{ borderColor: busqueda ? "#3dbfbf" : "#e5e7eb" }}
            />
            {busqueda && (
              <p className="text-xs text-gray-400 mt-1">{reclamosFiltradosBusqueda?.length} resultado(s) en todos los estados</p>
            )}
          </div>
        )}

        {!cargando && reclamosFiltradosBusqueda?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-400">No hay reclamos en esta sección.</p>
          </div>
        )}

        <div className="space-y-4">
          {reclamosPagina?.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">{r.nombre}</p>
                  <p className="text-sm text-gray-400">📞 {r.telefono}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${estadoConfig[r.estado]?.bg} ${estadoConfig[r.estado]?.texto}`}>
                  {estadoConfig[r.estado]?.label}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{r.descripcion}</p>

              {r.fotos && r.fotos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {r.fotos.map((url, i) => (
                    <img key={i} src={url} onClick={() => setFotoAmpliada(url)}
                      className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                  ))}
                </div>
              )}

              {r.fotosResolucion && r.fotosResolucion.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Fotos del trabajo realizado:</p>
                  <div className="flex gap-2 flex-wrap">
                    {r.fotosResolucion.map((url, i) => (
                      <img key={i} src={url} onClick={() => setFotoAmpliada(url)}
                        className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                    ))}
                  </div>
                </div>
              )}

              {r.descripcionResolucion && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Detalle del trabajo:</p>
                  <p className="text-sm text-gray-600">{r.descripcionResolucion}</p>
                </div>
              )}

              <p className="text-xs text-gray-300 mb-3">{r.fecha?.toDate().toLocaleString("es-UY")}</p>

              {r.estado === "pendiente" && asignando !== r.id && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { setAsignando(r.id); setDerivando(null); }}
                    className="text-sm px-4 py-2 rounded-xl text-white font-semibold transition"
                    style={{backgroundColor: "#3dbfbf"}}>
                    Asignar a área →
                  </button>
                  <button onClick={() => { setDerivando(r.id); setAsignando(null); setCategoriaDerivacion(""); }}
                    className="text-sm px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200 transition">
                    Derivar a otra categoría ↗
                  </button>
                </div>
              )}

              {derivando === r.id && (
                <div className="mt-3 p-4 bg-orange-50 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Derivar a otra categoría:</p>
                  <select value={categoriaDerivacion}
                    onChange={e => setCategoriaDerivacion(e.target.value)}
                    className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={{borderColor: "#f97316"}}>
                    <option value="">Seleccioná una categoría</option>
                    {categorias.filter(c => c.id !== usuario.categoriaId).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icono} {cat.nombre}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => derivarCategoria(r)}
                      className="flex-1 py-2 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition">
                      Confirmar derivación
                    </button>
                    <button onClick={() => { setDerivando(null); setCategoriaDerivacion(""); }}
                      className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 font-semibold">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {asignando === r.id && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Seleccioná el área:</p>
                  <select value={areaSeleccionada} onChange={e => setAreaSeleccionada(e.target.value)}
                    className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={{borderColor: "#3dbfbf"}}>
                    <option value="">Seleccioná un área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.nombre}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => asignarArea(r)}
                      className="flex-1 py-2 rounded-xl text-white font-semibold"
                      style={{backgroundColor: "#3dbfbf"}}>
                      Confirmar asignación
                    </button>
                    <button onClick={() => { setAsignando(null); setAreaSeleccionada(""); }}
                      className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 font-semibold">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {r.estado === "verificar" && (
                <button onClick={() => marcarResuelto(r)}
                  className="text-sm px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition">
                  ✅ Marcar como resuelto
                </button>
              )}
            </div>
          ))}
        </div>

        {/* PAGINACIÓN */}
        {!busqueda && totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-white shadow-sm disabled:opacity-40 transition"
              style={{ color: "#3dbfbf" }}>← Anterior</button>
            <span className="text-sm text-gray-500">Página {pagina} de {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-white shadow-sm disabled:opacity-40 transition"
              style={{ color: "#3dbfbf" }}>Siguiente →</button>
          </div>
        )}
      </div>

      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cursor-pointer p-4">
          <img src={fotoAmpliada} alt="foto ampliada" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default PanelEncargado;