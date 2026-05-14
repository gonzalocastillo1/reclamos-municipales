import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

function FormularioReclamo() {
  const [formulario, setFormulario] = useState({
    nombre: "",
    telefono: "",
    categoria: "",
    descripcion: "",
  });
  const [fotos, setFotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const categorias = [
    "Alumbrado público",
    "Reparación de calles",
    "Recolección de basura",
    "Otro",
  ];

  const handleChange = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const handleFotos = (e) => {
    const archivos = Array.from(e.target.files);
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
    if (!formulario.nombre || !formulario.telefono || !formulario.categoria || !formulario.descripcion) {
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
      <div style={{ maxWidth: "500px", margin: "80px auto", textAlign: "center", fontFamily: "Arial" }}>
        <h2>✅ Reclamo enviado</h2>
        <p>Tu reclamo fue registrado. Te notificaremos cuando esté resuelto.</p>
        <button onClick={() => { setEnviado(false); setFormulario({ nombre: "", telefono: "", categoria: "", descripcion: "" }); setFotos([]); setPreviews([]); }}
          style={{ padding: "10px 20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
          Cargar otro reclamo
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h1>📋 Reportar un problema</h1>
      <p style={{ color: "#666" }}>Completá el formulario y nos pondremos en contacto.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Nombre</label>
          <input name="nombre" value={formulario.nombre} onChange={handleChange}
            placeholder="Tu nombre completo"
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Teléfono / WhatsApp</label>
          <input name="telefono" value={formulario.telefono} onChange={handleChange}
            placeholder="Ej: 099123456"
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Categoría del problema</label>
          <select name="categoria" value={formulario.categoria} onChange={handleChange}
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}>
            <option value="">Seleccioná una categoría</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Descripción del problema</label>
          <textarea name="descripcion" value={formulario.descripcion} onChange={handleChange}
            placeholder="Describí el problema con el mayor detalle posible..."
            rows={4}
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", resize: "vertical" }} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Fotos del problema</label>
          <input type="file" accept="image/*" multiple onChange={handleFotos}
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            {previews.map((src, i) => (
              <img key={i} src={src} alt={`foto ${i + 1}`}
                style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
            ))}
          </div>
        </div>

        <button onClick={handleEnviar} disabled={enviando}
          style={{ padding: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer" }}>
          {enviando ? "Enviando..." : "Enviar reclamo"}
        </button>
      </div>
    </div>
  );
}

export default FormularioReclamo;