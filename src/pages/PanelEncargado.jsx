import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function PanelEncargado({ usuario }) {
  const [reclamos, setReclamos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [resolviendo, setResolviendo] = useState(null);
  const [fotosResolucion, setFotosResolucion] = useState([]);
  const [previewsResolucion, setPreviewsResolucion] = useState([]);
  const [descripcionResolucion, setDescripcionResolucion] = useState("");

  useEffect(() => {
    if (!usuario || !usuario.categoria) return;
    const q = query(collection(db, "reclamos"), where("categoria", "==", usuario.categoria));
    const unsub = onSnapshot(q, (snap) => {
      const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      datos.sort((a, b) => b.fecha?.toMillis() - a.fecha?.toMillis());
      setReclamos(datos);
      setCargando(false);
    });
    return unsub;
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

  const marcarResuelto = async (reclamo) => {
    const urlsFotos = await Promise.all(fotosResolucion.map(subirFoto));
    await updateDoc(doc(db, "reclamos", reclamo.id), {
      estado: "resuelto",
      fotosResolucion: urlsFotos,
      descripcionResolucion,
    });

    const telefono = reclamo.telefono.replace(/\D/g, "");
    const telefonoUY = telefono.startsWith("598") ? telefono : `598${telefono}`;
    const fotosTexto = urlsFotos.length > 0 ? `\n\nPodés ver las fotos del trabajo realizado:\n${urlsFotos.join("\n")}` : "";
    const descripcionTexto = descripcionResolucion ? `\n\nDetalle: ${descripcionResolucion}` : "";
    const mensaje = encodeURIComponent(
      `Hola ${reclamo.nombre} 👋, tu reclamo sobre *"${reclamo.categoria}"* ha sido resuelto. ✅${descripcionTexto}${fotosTexto}\n\nGracias por contactarte con la Intendencia de Soriano. 🏛️`
    );
    window.open(`https://wa.me/${telefonoUY}?text=${mensaje}`, "_blank");
    setResolviendo(null);
    setFotosResolucion([]);
    setPreviewsResolucion([]);
    setDescripcionResolucion("");
  };

  const marcarEnProceso = async (id) => {
    await updateDoc(doc(db, "reclamos", id), { estado: "en proceso" });
  };

  const estadoConfig = {
    pendiente: { bg: "bg-yellow-100", texto: "text-yellow-800", label: "Pendiente" },
    "en proceso": { bg: "bg-blue-100", texto: "text-blue-800", label: "En proceso" },
    resuelto: { bg: "bg-green-100", texto: "text-green-800", label: "Resuelto" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header panel */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Panel encargado</p>
          <h1 className="text-xl font-bold text-gray-800">{usuario.categoria}</h1>
        </div>
        <button onClick={() => signOut(auth)}
          className="text-sm text-gray-400 hover:text-red-500 transition font-medium">
          Cerrar sesión
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {["pendiente", "en proceso", "resuelto"].map((estado) => (
            <div key={estado} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-2xl font-black" style={{color: "#3dbfbf"}}>
                {reclamos.filter(r => r.estado === estado).length}
              </p>
              <p className="text-xs text-gray-500 capitalize">{estado}</p>
            </div>
          ))}
        </div>

        {cargando && <p className="text-center text-gray-400 py-10">Cargando reclamos...</p>}
        {!cargando && reclamos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-400">No hay reclamos asignados.</p>
          </div>
        )}

        <div className="space-y-4">
          {reclamos.map((r) => (
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
                    <img key={i} src={url} alt={`foto ${i + 1}`}
                      onClick={() => setFotoAmpliada(url)}
                      className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-300 mb-3">{r.fecha?.toDate().toLocaleString("es-UY")}</p>

              {/* Fotos de resolución ya cargadas */}
              {r.fotosResolucion && r.fotosResolucion.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Fotos de resolución:</p>
                  <div className="flex gap-2 flex-wrap">
                    {r.fotosResolucion.map((url, i) => (
                      <img key={i} src={url} alt={`resolucion ${i + 1}`}
                        onClick={() => setFotoAmpliada(url)}
                        className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {r.estado === "pendiente" && (
                  <button onClick={() => marcarEnProceso(r.id)}
                    className="text-sm px-4 py-2 rounded-xl text-white font-semibold transition"
                    style={{backgroundColor: "#3dbfbf"}}>
                    Tomar tarea
                  </button>
                )}
                {r.estado === "en proceso" && resolviendo !== r.id && (
                  <button onClick={() => setResolviendo(r.id)}
                    className="text-sm px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition">
                    Marcar resuelto ✓
                  </button>
                )}
              </div>

              {/* Panel de resolución */}
              {resolviendo === r.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Completá la resolución:</p>
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
                    <button onClick={() => marcarResuelto(r)}
                      className="flex-1 text-sm py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition">
                      Confirmar y enviar WhatsApp ✓
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

export default PanelEncargado;