import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function PanelAdmin() {
  const [reclamos, setReclamos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reclamos"), (snap) => {
      const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      datos.sort((a, b) => b.fecha?.toMillis() - a.fecha?.toMillis());
      setReclamos(datos);
      setCargando(false);
    });
    return unsub;
  }, []);

  const estadoConfig = {
    pendiente: { bg: "bg-yellow-100", texto: "text-yellow-800", label: "Pendiente" },
    "en proceso": { bg: "bg-blue-100", texto: "text-blue-800", label: "En proceso" },
    resuelto: { bg: "bg-green-100", texto: "text-green-800", label: "Resuelto" },
  };

  const reclamosFiltrados = filtro === "todos" ? reclamos : reclamos.filter((r) => r.estado === filtro);

  const conteo = {
    todos: reclamos.length,
    pendiente: reclamos.filter((r) => r.estado === "pendiente").length,
    "en proceso": reclamos.filter((r) => r.estado === "en proceso").length,
    resuelto: reclamos.filter((r) => r.estado === "resuelto").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Panel</p>
          <h1 className="text-xl font-bold text-gray-800">Administrador</h1>
        </div>
        <button onClick={() => signOut(auth)}
          className="text-sm text-gray-400 hover:text-red-500 transition font-medium">
          Cerrar sesión
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tarjetas resumen */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {["todos", "pendiente", "en proceso", "resuelto"].map((estado) => (
            <div key={estado} onClick={() => setFiltro(estado)}
              className={`rounded-xl p-4 text-center cursor-pointer transition shadow-sm ${filtro === estado ? "text-white" : "bg-white"}`}
              style={{backgroundColor: filtro === estado ? "#3dbfbf" : "white"}}>
              <p className={`text-2xl font-black ${filtro === estado ? "text-white" : ""}`}
                style={{color: filtro === estado ? "white" : "#3dbfbf"}}>
                {conteo[estado]}
              </p>
              <p className={`text-xs capitalize ${filtro === estado ? "text-white" : "text-gray-500"}`}>
                {estado}
              </p>
            </div>
          ))}
        </div>

        {cargando && <p className="text-center text-gray-400 py-10">Cargando reclamos...</p>}
        {!cargando && reclamosFiltrados.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-400">No hay reclamos en esta categoría.</p>
          </div>
        )}

        <div className="space-y-4">
          {reclamosFiltrados.map((r) => (
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

              <div className="flex gap-2 mb-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{r.categoria}</span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{r.descripcion}</p>

              {r.fotos && r.fotos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {r.fotos.map((url, i) => (
                    <img key={i} src={url} alt={`foto ${i + 1}`}
                      onClick={() => setFotoAmpliada(url)}
                      className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-300">{r.fecha?.toDate().toLocaleString("es-UY")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Foto ampliada */}
      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cursor-pointer p-4">
          <img src={fotoAmpliada} alt="foto ampliada" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default PanelAdmin;