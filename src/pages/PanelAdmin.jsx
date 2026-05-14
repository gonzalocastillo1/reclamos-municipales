import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function PanelAdmin() {
  const [reclamos, setReclamos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reclamos"), (snap) => {
      const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      datos.sort((a, b) => b.fecha?.toMillis() - a.fecha?.toMillis());
      setReclamos(datos);
      setCargando(false);
    });
    return unsub;
  }, []);

  const colores = {
    pendiente: { bg: "#fef3c7", texto: "#92400e" },
    "en proceso": { bg: "#dbeafe", texto: "#1e40af" },
    resuelto: { bg: "#d1fae5", texto: "#065f46" },
  };

  const reclamosFiltrados = filtro === "todos"
    ? reclamos
    : reclamos.filter((r) => r.estado === filtro);

  const conteo = {
    todos: reclamos.length,
    pendiente: reclamos.filter((r) => r.estado === "pendiente").length,
    "en proceso": reclamos.filter((r) => r.estado === "en proceso").length,
    resuelto: reclamos.filter((r) => r.estado === "resuelto").length,
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>🛡️ Panel Administrador</h1>
        <button onClick={() => signOut(auth)}
          style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
          Salir
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {["todos", "pendiente", "en proceso", "resuelto"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
              backgroundColor: filtro === f ? "#1e40af" : "#e5e7eb",
              color: filtro === f ? "white" : "#374151" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({conteo[f]})
          </button>
        ))}
      </div>

      {cargando && <p>Cargando reclamos...</p>}
      {!cargando && reclamosFiltrados.length === 0 && <p style={{ color: "#666" }}>No hay reclamos en esta categoría.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {reclamosFiltrados.map((r) => (
          <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong>{r.nombre}</strong>
              <span style={{
                padding: "4px 10px", borderRadius: "20px", fontSize: "12px",
                backgroundColor: colores[r.estado]?.bg, color: colores[r.estado]?.texto
              }}>
                {r.estado}
              </span>
            </div>
            <p style={{ margin: "4px 0", color: "#666" }}>📞 {r.telefono}</p>
            <p style={{ margin: "4px 0" }}>🏷️ {r.categoria}</p>
            <p style={{ margin: "4px 0" }}>{r.descripcion}</p>
            <p style={{ margin: "4px 0", fontSize: "12px", color: "#999" }}>
              {r.fecha?.toDate().toLocaleString("es-UY")}
            </p>

            {r.fotos && r.fotos.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "8px 0" }}>
                {r.fotos.map((url, i) => (
                  <img key={i} src={url} alt={`foto ${i + 1}`}
                    style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelAdmin;