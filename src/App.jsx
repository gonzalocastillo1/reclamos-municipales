import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import FormularioReclamo from "./pages/FormularioReclamo";
import Login from "./pages/Login";
import PanelEncargado from "./pages/PanelEncargado";
import PanelAdmin from "./pages/PanelAdmin";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [vista, setVista] = useState("formulario");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.email));
        if (snap.exists()) {
          const datos = { ...snap.data(), email: user.email };
          setDatosUsuario(datos);
          setVista(datos.rol === "admin" ? "admin" : "panel");
        }
        setUsuario(user);
      } else {
        setUsuario(null);
        setDatosUsuario(null);
        setVista("formulario");
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  if (cargando) return <p style={{ textAlign: "center", marginTop: "100px" }}>Cargando...</p>;

  return (
    <div>
      <nav style={{ backgroundColor: "#1e40af", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>🏛️ Municipio de Soriano</span>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => setVista("formulario")}
            style={{ padding: "6px 14px", backgroundColor: vista === "formulario" ? "white" : "transparent", color: vista === "formulario" ? "#1e40af" : "white", border: "1px solid white", borderRadius: "6px", cursor: "pointer" }}>
            Reportar problema
          </button>
          <button onClick={() => setVista(usuario ? (datosUsuario?.rol === "admin" ? "admin" : "panel") : "login")}
            style={{ padding: "6px 14px", backgroundColor: vista === "panel" || vista === "login" || vista === "admin" ? "white" : "transparent", color: vista === "panel" || vista === "login" || vista === "admin" ? "#1e40af" : "white", border: "1px solid white", borderRadius: "6px", cursor: "pointer" }}>
            {usuario ? (datosUsuario?.rol === "admin" ? "Administrador" : "Mi panel") : "Encargados"}
          </button>
        </div>
      </nav>

      {vista === "formulario" && <FormularioReclamo />}
      {vista === "login" && <Login onLogin={(user) => setUsuario(user)} />}
      {vista === "panel" && datosUsuario && <PanelEncargado usuario={datosUsuario} />}
      {vista === "admin" && <PanelAdmin />}
    </div>
  );
}

export default App;