import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

function FormularioReclamo({ onEncargados }) {
  const [formulario, setFormulario] = useState({
    nombre: "",
    telefono: "",
    categoriaId: "",
    categoria: "",
    descripcion: "",
  });
  const [categorias, setCategorias] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const [avisoCelular, setAvisoCelular] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleChange = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const handleFotos = (e) => {
    const archivos = Array.from(e.target.files).slice(0, 3);
    setFotos(archivos);
    setPreviews(archivos.map((f) => URL.createObjectURL(f)));
  };

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización.");
      return;
    }
    setObteniendoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setObteniendoUbicacion(false);
      },
      (err) => {
        alert("No se pudo obtener la ubicación. Verificá los permisos.");
        setObteniendoUbicacion(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  const handleEnviar = async () => {
    if (!formulario.nombre || !formulario.categoriaId || !formulario.descripcion) {
      alert("Por favor completá todos los campos obligatorios");
      return;
    }
    if (!formulario.telefono && !avisoCelular) {
      setAvisoCelular(true);
      return;
    }
    setEnviando(true);
    try {
      const urlsFotos = await Promise.all(fotos.map(subirFoto));
      await addDoc(collection(db, "reclamos"), {
        ...formulario,
        fotos: urlsFotos,
        estado: "pendiente",
        fecha: new Date(),
        ...(ubicacion && { ubicacion }),
      });
      setEnviado(true);
    } catch (error) {
      alert("Error al enviar el reclamo. Intentá de nuevo.");
    }
    setEnviando(false);
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reclamo enviado</h2>
          <p className="text-gray-500 mb-6">Tu reclamo fue registrado. Te notificaremos cuando esté resuelto.</p>
          <button onClick={() => {
            setEnviado(false);
            setFormulario({ nombre: "", telefono: "", categoriaId: "", categoria: "", descripcion: "" });
            setFotos([]);
            setPreviews([]);
            setUbicacion(null);
            setAvisoCelular(false);
          }}
            className="text-white px-6 py-3 rounded-xl font-semibold transition" style={{ backgroundColor: "#3dbfbf" }}>
            Cargar otro reclamo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background: "linear-gradient(160deg, #e8f8f8 0%, #f0fafa 40%, #eaf4f4 100%)"}}>
      <div className="shadow-sm px-6 py-3 flex items-center gap-3" style={{background: "linear-gradient(135deg, #3dbfbf 0%, #2a9d9d 60%, #1a7a7a 100%)"}}>
        <img src="/logo.png" alt="Logo Soriano" className="h-10 w-auto drop-shadow" />
        <div>
          <p className="text-xs text-white opacity-70 uppercase tracking-widest">Intendencia de Soriano</p>
          <h1 className="text-lg font-bold text-white">Nuevo reclamo</h1>
        </div>
      </div>
      <div className="flex-1 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Reportar un problema</h2>
            <p className="text-gray-500 text-sm mb-6">Completá el formulario y nos pondremos en contacto.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo</label>
                <input name="nombre" value={formulario.nombre} onChange={handleChange}
                  placeholder="Tu nombre completo"
                  className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                  style={{ borderColor: formulario.nombre ? "#3dbfbf" : "#e5e7eb" }}
                  onFocus={e => e.target.style.borderColor = "#3dbfbf"}
                  onBlur={e => e.target.style.borderColor = formulario.nombre ? "#3dbfbf" : "#e5e7eb"} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono / WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input name="telefono" value={formulario.telefono} onChange={e => { handleChange(e); setAvisoCelular(false); }}
                  placeholder="Ej: 099123456"
                  className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                  style={{ borderColor: formulario.telefono ? "#3dbfbf" : "#e5e7eb" }}
                  onFocus={e => e.target.style.borderColor = "#3dbfbf"}
                  onBlur={e => e.target.style.borderColor = formulario.telefono ? "#3dbfbf" : "#e5e7eb"} />

                {avisoCelular && !formulario.telefono && (
                  <div className="mt-2 p-3 rounded-xl border-2 flex flex-col gap-2"
                    style={{ borderColor: "#f59e0b", backgroundColor: "#fffbeb" }}>
                    <p className="text-sm text-amber-700">
                      📱 El teléfono no es obligatorio, pero es importante para hacerte llegar un reporte de tu reclamo.
                    </p>
                    <button type="button" onClick={async () => {
                        setAvisoCelular(false);
                        setEnviando(true);
                        try {
                          const urlsFotos = await Promise.all(fotos.map(subirFoto));
                          await addDoc(collection(db, "reclamos"), {
                            ...formulario,
                            fotos: urlsFotos,
                            estado: "pendiente",
                            fecha: new Date(),
                            ...(ubicacion && { ubicacion }),
                          });
                          setEnviado(true);
                        } catch (error) {
                          alert("Error al enviar el reclamo. Intentá de nuevo.");
                        }
                        setEnviando(false);
                      }}
                      className="self-start text-xs px-4 py-2 rounded-lg font-semibold text-white transition"
                      style={{ backgroundColor: "#f59e0b" }}>
                      Entendido, continuar sin teléfono →
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría del problema</label>
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map((cat) => (
                    <button key={cat.id} type="button"
                      onClick={() => setFormulario({ ...formulario, categoriaId: cat.id, categoria: cat.nombre })}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl border-2 font-medium transition w-full min-w-0"
                      style={{
                        borderColor: formulario.categoriaId === cat.id ? "#3dbfbf" : "#e5e7eb",
                        backgroundColor: formulario.categoriaId === cat.id ? "#e6f9f9" : "white",
                        color: formulario.categoriaId === cat.id ? "#3dbfbf" : "#6b7280",
                        fontSize: cat.nombre.length > 15 ? "0.7rem" : "0.875rem",
                      }}>
                      <span className="flex-shrink-0">{cat.icono}</span>
                      <span className="truncate">{cat.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción del problema</label>
                <textarea name="descripcion" value={formulario.descripcion} onChange={handleChange}
                  placeholder="Describí el problema con el mayor detalle posible..."
                  rows={4}
                  className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition resize-none"
                  style={{ borderColor: formulario.descripcion ? "#3dbfbf" : "#e5e7eb" }}
                  onFocus={e => e.target.style.borderColor = "#3dbfbf"}
                  onBlur={e => e.target.style.borderColor = formulario.descripcion ? "#3dbfbf" : "#e5e7eb"} />
              </div>

              {/* UBICACIÓN GPS */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ubicación del problema</label>
                {!ubicacion ? (
                  <button type="button" onClick={obtenerUbicacion} disabled={obteniendoUbicacion}
                    className="w-full border-2 border-dashed rounded-xl py-4 flex flex-col items-center gap-1 transition hover:bg-gray-50 disabled:opacity-60"
                    style={{ borderColor: "#3dbfbf" }}>
                    <span className="text-2xl">{obteniendoUbicacion ? "⏳" : "📍"}</span>
                    <span className="text-sm font-medium" style={{ color: "#3dbfbf" }}>
                      {obteniendoUbicacion ? "Obteniendo ubicación..." : "Marcar mi ubicación actual"}
                    </span>
                    <span className="text-xs text-gray-400">Opcional · Ayuda a localizar el problema</span>
                  </button>
                ) : (
                  <div className="rounded-xl border-2 p-4 flex items-center justify-between"
                    style={{ borderColor: "#3dbfbf", backgroundColor: "#e6f9f9" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📍</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#2a9d9d" }}>Ubicación guardada</p>
                        <p className="text-xs text-gray-500">
                          {ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1 rounded-lg font-semibold transition"
                        style={{ backgroundColor: "#3dbfbf", color: "white" }}>
                        Ver
                      </a>
                      <button type="button" onClick={() => setUbicacion(null)}
                        className="text-xs px-3 py-1 rounded-lg bg-gray-200 text-gray-600 font-semibold hover:bg-gray-300 transition">
                        Quitar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fotos del problema</label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition hover:bg-gray-50"
                  style={{ borderColor: "#3dbfbf" }}>
                  <span className="text-2xl mb-1">📷</span>
                  <span className="text-sm text-gray-500">Tocá para subir fotos (máx. 3)</span>
                  <input type="file" accept="image/*" multiple onChange={handleFotos} className="hidden" />
                </label>
                {previews.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {previews.map((src, i) => (
                      <img key={i} src={src} alt={`foto ${i + 1}`}
                        onClick={() => setFotoAmpliada(src)}
                        className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition" />
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleEnviar} disabled={enviando}
                className="w-full text-white py-3 rounded-xl font-semibold transition disabled:opacity-60"
                style={{ backgroundColor: "#3dbfbf" }}>
                {enviando ? "Enviando..." : "Enviar reclamo"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-lg mx-auto text-center space-y-2">
          <p className="text-sm font-semibold text-gray-700">Intendencia Departamental de Soriano</p>
          <p className="text-sm text-gray-500">📞 4532 2201 &nbsp;|&nbsp; ✉️ contacto@soriano.gub.uy</p>
          <div className="flex justify-center gap-4 text-sm">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 transition">Facebook</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-500 transition">Instagram</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-sky-500 transition">Twitter</a>
          </div>
          <p className="text-xs text-gray-400">© 2026 Intendencia de Soriano. Todos los derechos reservados.</p>
          <button onClick={onEncargados} className="text-xs text-gray-300 hover:text-gray-400 transition mt-1">
            Acceso encargados
          </button>
        </div>
      </footer>

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

export default FormularioReclamo;
