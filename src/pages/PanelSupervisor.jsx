import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import Notificaciones from "../Notificaciones.jsx";

function PanelSupervisor({ usuario }) {
  const [reclamos, setReclamos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [pestana, setPestana] = useState("pendientes");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reclamos"), (snap) => {
      const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      datos.sort((a, b) => b.fecha?.toMillis() - a.fecha?.toMillis());
      setReclamos(datos);
      setCargando(false);
    });
    return unsub;
  }, []);

  const aprobarYEnviar = async (reclamo) => {
    await updateDoc(doc(db, "reclamos", reclamo.id), { estado: "resuelto", fechaResuelto: new Date() });

    const telefono = reclamo.telefono.replace(/\D/g, "");
    const telefonoUY = telefono.startsWith("598") ? telefono : `598${telefono}`;
    const fotosTexto = reclamo.fotosResolucion?.length > 0
      ? `\n\nFotos del trabajo realizado:\n${reclamo.fotosResolucion.join("\n")}`
      : "";
    const descripcionTexto = reclamo.descripcionResolucion
      ? `\n\nDetalle: ${reclamo.descripcionResolucion}`
      : "";
    const mensaje = encodeURIComponent(
      `Hola ${reclamo.nombre} 👋, tu reclamo sobre *"${reclamo.categoria}"* ha sido resuelto. ✅${descripcionTexto}${fotosTexto}\n\nGracias por contactarte con la Intendencia de Soriano. 🏛️`
    );
    window.open(`https://wa.me/${telefonoUY}?text=${mensaje}`, "_blank");
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

  return (
    <div className="min-h-screen" style={{background: "linear-gradient(160deg, #e8f8f8 0%, #f0fafa 40%, #eaf4f4 100%)"}}>
      {/* HEADER */}
      <div className="shadow-sm px-6 py-3 flex items-center justify-between" style={{background: "linear-gradient(135deg, #3dbfbf 0%, #2a9d9d 60%, #1a7a7a 100%)"}}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo Soriano" className="h-10 w-auto drop-shadow" />
          <div>
            <p className="text-xs text-white opacity-70 uppercase tracking-widest">Panel supervisor</p>
            <h1 className="text-lg font-bold text-white">Supervisión general</h1>
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

      {/* PESTAÑAS */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {pestanas.map((p) => (
            <div key={p.id} onClick={() => setPestana(p.id)}
              className="rounded-xl p-3 text-center cursor-pointer transition shadow-sm"
              style={{ backgroundColor: pestana === p.id ? "#3dbfbf" : "white" }}>
              <p className="text-xl font-black" style={{ color: pestana === p.id ? "white" : "#3dbfbf" }}>{p.count}</p>
              <p className="text-xs" style={{ color: pestana === p.id ? "white" : "#6b7280" }}>{p.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LISTADO */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        {cargando && <p className="text-center text-gray-400 py-10">Cargando reclamos...</p>}
        {!cargando && reclamosMostrados.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-400">No hay reclamos en esta sección.</p>
          </div>
        )}

        <div className="space-y-4">
          {reclamosMostrados.map((r) => (
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

              {/* Ubicación GPS */}
              {r.ubicacion && (
                <a
                  href={`https://www.google.com/maps?q=${r.ubicacion.lat},${r.ubicacion.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full mb-3 transition hover:opacity-80"
                  style={{ backgroundColor: "#e6f9f9", color: "#2a9d9d" }}>
                  📍 Ver ubicación en mapa
                </a>
              )}

              {/* Fotos del reclamo */}
              {r.fotos && r.fotos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {r.fotos.map((url, i) => (
                    <img key={i} src={url} onClick={() => setFotoAmpliada(url)}
                      className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                  ))}
                </div>
              )}

              {/* Fotos de resolución */}
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

              {/* Descripción de resolución */}
              {r.descripcionResolucion && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Detalle del trabajo:</p>
                  <p className="text-sm text-gray-600">{r.descripcionResolucion}</p>
                </div>
              )}

              <p className="text-xs text-gray-300 mb-3">{r.fecha?.toDate().toLocaleString("es-UY")}</p>

              {/* Acción verificar */}
              {r.estado === "verificar" && (
                <button onClick={() => aprobarYEnviar(r)}
                  className="text-sm px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition">
                  Aprobar y enviar WhatsApp ✓
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOTO AMPLIADA */}
      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cursor-pointer p-4">
          <img src={fotoAmpliada} alt="foto ampliada" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default PanelSupervisor;
