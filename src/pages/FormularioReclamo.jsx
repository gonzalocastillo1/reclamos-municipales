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
    if (!formulario.nombre || !formulario.telefono || !formulario.categoriaId || !formulario.descripcion) {
      alert("Por favor completá todos los campos");
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
          <button onClick={() => { setEnviado(false); setFormulario({ nombre: "", telefono: "", categoriaId: "", categoria: "", descripcion: "" }); setFotos([]); setPreviews([]); }}
            className="text-white px-6 py-3 rounded-xl font-semibold transition" style={{backgroundColor: "#3dbfbf"}}>
            Cargar otro reclamo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
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
                  style={{borderColor: formulario.nombre ? "#3dbfbf" : "#e5e7eb"}}
                  onFocus={e => e.target.style.borderColor="#3dbfbf"}
                  onBlur={e => e.target.style.borderColor=formulario.nombre?"#3dbfbf":"#e5e7eb"} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono / WhatsApp</label>
                <input name="telefono" value={formulario.telefono} onChange={handleChange}
                  placeholder="Ej: 099123456"
                  className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                  style={{borderColor: formulario.telefono ? "#3dbfbf" : "#e5e7eb"}}
                  onFocus={e => e.target.style.borderColor="#3dbfbf"}
                  onBlur={e => e.target.style.borderColor=formulario.telefono?"#3dbfbf":"#e5e7eb"} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría del problema</label>
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map((cat) => (
                    <button key={cat.id} type="button"
                      onClick={() => setFormulario({ ...formulario, categoriaId: cat.id, categoria: cat.nombre })}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition"
                      style={{
                        borderColor: formulario.categoriaId === cat.id ? "#3dbfbf" : "#e5e7eb",
                        backgroundColor: formulario.categoriaId === cat.id ? "#e6f9f9" : "white",
                        color: formulario.categoriaId === cat.id ? "#3dbfbf" : "#6b7280"
                      }}>
                      <span>{cat.icono}</span> {cat.nombre}
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
                  style={{borderColor: formulario.descripcion ? "#3dbfbf" : "#e5e7eb"}}
                  onFocus={e => e.target.style.borderColor="#3dbfbf"}
                  onBlur={e => e.target.style.borderColor=formulario.descripcion?"#3dbfbf":"#e5e7eb"} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fotos del problema</label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition hover:bg-gray-50"
                  style={{borderColor: "#3dbfbf"}}>
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
                style={{backgroundColor: "#3dbfbf"}}>
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