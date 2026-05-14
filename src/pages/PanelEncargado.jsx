import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function PanelEncargado({ usuario }) {
  const [reclamos, setReclamos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
  if (!usuario || !usuario.categoria) return;
  
  const q = query(
    collection(db, "reclamos"),
    where("categoria", "==", usuario.categoria)
  );
  const unsub = onSnapshot(q, (snap) => {
    setReclamos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setCargando(false);
  });
  return unsub;
}, [usuario]);

  const marcarResuelto = async (id) => {
    await updateDoc(doc(db, "reclamos", id), { estado: "resuelto" });
  };

  const marcarEnProceso = async (id) => {
    await updateDoc(doc(db, "reclamos", id), { estado: "en proceso" });
  };

  const colores = {
    pendiente: { bg: "#fef3c7", texto: "#92400e" },
    "en proceso": { bg: "#dbeafe", texto: "#1e40af" },
    resuelto: { bg: "#d1fae5", texto: "#065f46" },
  };

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>📋 Panel — {usuario.categoria}</h1>
        <button onClick={() => signOut(auth)}
          style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
          Salir
        </button>
      </div>

      {cargando && <p>Cargando reclamos...</p>}
      {!cargando && reclamos.length === 0 && <p style={{ color: "#666" }}>No hay reclamos asignados.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {reclamos.map((r) => (
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
            <p style={{ margin: "4px 0" }}>{r.descripcion}</p>

            {r.fotos && r.fotos.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "8px 0" }}>
                {r.fotos.map((url, i) => (
                  <img key={i} src={url} alt={`foto ${i + 1}`}
                    style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              {r.estado === "pendiente" && (
                <button onClick={() => marcarEnProceso(r.id)}
                  style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                  Tomar tarea
                </button>
              )}
              {r.estado === "en proceso" && (
                <button onClick={() => marcarResuelto(r.id)}
                  style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                  Marcar resuelto
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelEncargado;