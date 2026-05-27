import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import Notificaciones from "../Notificaciones.jsx";
import { crearNotificacion } from "../notificaciones";

function PanelEjecutor({ usuario }) {
  const [reclamos, setReclamos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [resolviendo, setResolviendo] = useState(null);
  const [fotosResolucion, setFotosResolucion] = useState([]);
  const [previewsResolucion, setPreviewsResolucion] = useState([]);
  const [descripcionResolucion, setDescripcionResolucion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    if (!usuario || !usuario.areaId) return;
    const q = query(
      collection(db, "reclamos"),
      where("areaId", "==", usuario.areaId),
      where("estado", "in", ["asignado", "en proceso"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      datos.sort((a, b) => b.fecha?.toMillis() - a.fecha?.toMillis());
      setReclamos(datos);
      setCargando(false);
    });

    const unsubUsuarios = onSnapshot(collection(db, "usuarios"), (snap) => {
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); unsubUsuarios(); };
  }, [usuario]);

  const subirFoto = async (foto) => {
    const data = new FormData();
    data.append("file", foto);
    data.append("upload_preset", "reclamos_fotos");
    const res = await fetch("https://api.cloudinary.com/v1_1/dfuapevo4/image/upload", {
      method: "POST",
      body: data,
    });
    const json = await res.json();
    return json.secure_url;
  };

  const handleFotosResolucion = (e) => {
    const archivos = Array.from(e.target.files).slice(0, 3);
    setFotosResolucion(archivos);
    setPreviewsResolucion(archivos.map((f) => URL.createObjectURL(f)));
  };

  const marcarEnProceso = async (id) => {
    await updateDoc(doc(db, "reclamos", id), { estado: "en proceso", fechaEnProceso: new Date() });
  };

  const marcarParaVerificar = async (reclamo) => {
    setEnviando(true);
    try {
      const urlsFotos = await Promise.all(fotosResolucion.map(subirFoto));
      await updateDoc(doc(db, "reclamos", reclamo.id), {
        estado: "verificar",
        fotosResolucion: urlsFotos,
        descripcionResolucion,
        fechaResolucion: new Date(),
        fechaVerificar: new Date(),
      });

      // Notificar al encargado de la categoría
      const encargados = usuarios.filter(u => u.rol === "encargado" && u.categoriaId === reclamo.categoriaId && u.email);
      for (const encargado of encargados) {
        await crearNotificacion({
          para: encargado.email,
          tipo: "para_verificar",
          mensaje: `Tarea completada para verificar: ${reclamo.categoria} - ${reclamo.descripcion.substring(0, 50)}...`,
          reclamoId: reclamo.id,
        });
      }

      // Notificar al admin
      const admins = usuarios.filter(u => u.rol === "admin" && u.email);
      for (const admin of admins) {
        await crearNotificacion({
          para: admin.email,
          tipo: "para_verificar",
          mensaje: `Tarea completada para verificar: ${reclamo.categoria} - ${reclamo.descripcion.substring(0, 50)}...`,
          reclamoId: reclamo.id,
        });
      }

      setResolviendo(null);
      setFotosResolucion([]);
      setPreviewsResolucion([]);
      setDescripcionResolucion("");
    } catch (e) {
      alert("Error al enviar. Intentá de nuevo.");
    }
    setEnviando(false);
  };

  const estadoConfig = {
    asignado: { bg: "bg-orange-100", texto: "text-orange-800", label: "Asignado" },
    "en proceso": { bg: "bg-blue-100", texto: "text-blue-800", label: "En proceso" },
  };

  return (
    <div className="min-h-screen" style={{background: "linear-gradient(160deg, #e8f8f8 0%, #f0fafa 40%, #eaf4f4 100%)"}}>
      <div className="shadow-sm px-6 py-3 flex items-center justify-between" style={{background: "linear-gradient(135deg, #3dbfbf 0%, #2a9d9d 60%, #1a7a7a 100%)"}}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo Soriano" className="h-10 w-auto drop-shadow" />
          <div>
            <p className="text-xs text-white opacity-70 uppercase tracking-widest">Panel ejecutor</p>
            <h1 className="text-lg font-bold text-white">{usuario.areaNombre || "Mi área"}</h1>
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

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {["asignado", "en proceso"].map((estado) => (
            <div key={estado} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-2xl font-black" style={{color: "#3dbfbf"}}>
                {reclamos.filter(r => r.estado === estado).length}
              </p>
              <p className="text-xs text-gray-500 capitalize">{estado}</p>
            </div>
          ))}
        </div>

        {cargando && <p className="text-center text-gray-400 py-10">Cargando tareas...</p>}

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
            {busqueda && (() => {
              const bl = busqueda.toLowerCase();
              const cant = reclamos.filter(r =>
                r.nombre?.toLowerCase().includes(bl) ||
                r.telefono?.toLowerCase().includes(bl) ||
                r.descripcion?.toLowerCase().includes(bl)
              ).length;
              return <p className="text-xs text-gray-400 mt-1">{cant} resultado(s)</p>;
            })()}
          </div>
        )}

        {!cargando && (() => {
          const bl = busqueda.toLowerCase();
          const filtrados = busqueda
            ? reclamos.filter(r =>
                r.nombre?.toLowerCase().includes(bl) ||
                r.telefono?.toLowerCase().includes(bl) ||
                r.descripcion?.toLowerCase().includes(bl)
              )
            : reclamos;
          const totalPags = Math.ceil(filtrados.length / POR_PAGINA);
          const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
          return (
            <>
              {filtrados.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="text-gray-400">No tenés tareas asignadas.</p>
                </div>
              )}
              <div className="space-y-4">
                {paginados.map((r) => (
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

              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{r.categoria}</span>
              <p className="text-sm text-gray-600 mt-2 mb-3">{r.descripcion}</p>

              {r.fotos && r.fotos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {r.fotos.map((url, i) => (
                    <img key={i} src={url} onClick={() => setFotoAmpliada(url)}
                      className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-300 mb-3">{r.fecha?.toDate().toLocaleString("es-UY")}</p>

              <div className="flex gap-2">
                {r.estado === "asignado" && (
                  <button onClick={() => marcarEnProceso(r.id)}
                    className="text-sm px-4 py-2 rounded-xl text-white font-semibold transition"
                    style={{backgroundColor: "#3dbfbf"}}>
                    Tomar tarea
                  </button>
                )}
                {r.estado === "en proceso" && resolviendo !== r.id && (
                  <button onClick={() => setResolviendo(r.id)}
                    className="text-sm px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition">
                    Marcar completada ✓
                  </button>
                )}
              </div>

              {resolviendo === r.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Completá el trabajo realizado:</p>
                  <textarea
                    value={descripcionResolucion}
                    onChange={(e) => setDescripcionResolucion(e.target.value)}
                    placeholder="Describí brevemente el trabajo realizado..."
                    rows={3}
                    className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                    style={{borderColor: "#3dbfbf"}} />
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-white transition"
                    style={{borderColor: "#3dbfbf"}}>
                    <span className="text-xl mb-1">📷</span>
                    <span className="text-xs text-gray-500">Subir fotos del trabajo (máx. 3)</span>
                    <input type="file" accept="image/*" multiple onChange={handleFotosResolucion} className="hidden" />
                  </label>
                  {previewsResolucion.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {previewsResolucion.map((src, i) => (
                        <img key={i} src={src} alt={`preview ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-xl" />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => marcarParaVerificar(r)} disabled={enviando}
                      className="flex-1 text-sm py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition disabled:opacity-60">
                      {enviando ? "Enviando..." : "Enviar para verificación ✓"}
                    </button>
                    <button onClick={() => { setResolviendo(null); setFotosResolucion([]); setPreviewsResolucion([]); setDescripcionResolucion(""); }}
                      className="text-sm px-4 py-2 rounded-xl bg-gray-200 text-gray-600 font-semibold hover:bg-gray-300 transition">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {!busqueda && totalPags > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-white shadow-sm disabled:opacity-40 transition"
              style={{ color: "#3dbfbf" }}>← Anterior</button>
            <span className="text-sm text-gray-500">Página {pagina} de {totalPags}</span>
            <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-white shadow-sm disabled:opacity-40 transition"
              style={{ color: "#3dbfbf" }}>Siguiente →</button>
          </div>
        )}
            </>
          );
        })()}
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

export default PanelEjecutor;