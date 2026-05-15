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

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <img src="/logo.png" alt="Logo Soriano" className="h-20 w-auto mx-auto mb-4 opacity-50" />
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* HEADER solo visible en formulario */}
      {vista === "formulario" && (
        <header className="bg-white shadow-sm py-4 px-6">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo Soriano" className="h-14 w-auto" />
              <div>
                <p className="font-black text-xl leading-none" style={{color: "#3dbfbf"}}>SORIANO</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Tu App</p>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1">
        {vista === "formulario" && (
          <FormularioReclamo
            onEncargados={() => setVista(usuario ? (datosUsuario?.rol === "admin" ? "admin" : "panel") : "login")}
          />
        )}
        {vista === "login" && <Login onLogin={(user) => setUsuario(user)} />}
        {vista === "panel" && datosUsuario && <PanelEncargado usuario={datosUsuario} />}
        {vista === "admin" && <PanelAdmin />}
      </div>

    </div>
  );
}

export default App;