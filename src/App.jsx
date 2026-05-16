import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import FormularioReclamo from "./pages/FormularioReclamo";
import Login from "./pages/Login";
import PanelEncargado from "./pages/PanelEncargado";
import PanelAdmin from "./pages/PanelAdmin";
import PanelEjecutor from "./pages/PanelEjecutor";

function Bienvenida({ onComenzar, onEncargados }) {
  const pasos = [
    { icono: "💡", titulo: "Alumbrado público", desc: "Luminarias apagadas o dañadas" },
    { icono: "🚧", titulo: "Calles y veredas", desc: "Baches, roturas o hundimientos" },
    { icono: "🗑️", titulo: "Recolección de basura", desc: "Residuos sin recolectar" },
    { icono: "📋", titulo: "Otros problemas", desc: "Cualquier otra situación" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: "#f0fafa"}}>

      {/* HERO */}
      <div className="relative overflow-hidden" style={{background: "linear-gradient(135deg, #3dbfbf 0%, #2a9d9d 60%, #1a7a7a 100%)"}}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{backgroundColor: "white", transform: "translate(30%, -30%)"}}></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10" style={{backgroundColor: "white", transform: "translate(-30%, 30%)"}}></div>
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full opacity-5" style={{backgroundColor: "white"}}></div>

        <div className="relative max-w-lg mx-auto px-6 py-10 text-center">
          <div className="flex flex-col items-center mb-6">
            <img src="/public/logo.png" alt="Logo Soriano" className="h-32 w-auto mb-4 drop-shadow-lg" style={{filter: "brightness(1) invert(0)"}} />
            <h1 className="text-4xl font-black text-white tracking-wide drop-shadow">SORIANO</h1>
            <p className="text-lg font-semibold text-white opacity-90 tracking-widest uppercase mt-1">Tu App</p>
          </div>

          <p className="text-white opacity-90 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            Reportá problemas en tu barrio y la Intendencia los resolverá. Rápido, simple y sin complicaciones.
          </p>

          <button onClick={onComenzar}
            className="bg-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg transition hover:shadow-xl hover:scale-105"
            style={{color: "#3dbfbf"}}>
            Hacer un reclamo →
          </button>

          <p className="text-white opacity-70 text-xs mt-4">Sin registro · Solo 2 minutos · 100% gratuito</p>
        </div>
      </div>

      {/* CATEGORIAS */}
      <div className="max-w-lg mx-auto w-full px-4 py-8">
        <h2 className="text-center text-base font-bold text-gray-600 mb-4 uppercase tracking-widest">¿Qué podés reportar?</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {pasos.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center text-center hover:shadow-md transition cursor-pointer"
              onClick={onComenzar}>
              <span className="text-3xl mb-2">{p.icono}</span>
              <p className="font-bold text-gray-800 text-sm">{p.titulo}</p>
              <p className="text-gray-400 text-xs mt-1">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* COMO FUNCIONA */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-gray-700 mb-4 text-center">¿Cómo funciona?</h2>
          <div className="space-y-3">
            {[
              { n: "1", texto: "Elegí la categoría del problema" },
              { n: "2", texto: "Ingresá tu nombre y teléfono" },
              { n: "3", texto: "Describí el problema y agregá fotos" },
              { n: "4", texto: "¡Listo! El equipo lo recibe al instante" },
            ].map((paso) => (
              <div key={paso.n} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                  style={{backgroundColor: "#3dbfbf"}}>
                  {paso.n}
                </div>
                <p className="text-gray-600 text-sm">{paso.texto}</p>
              </div>
            ))}
          </div>
        </div>

        {/* DESTACADO */}
        <div className="rounded-2xl p-5 text-center mb-6" style={{background: "linear-gradient(135deg, #e6f9f9, #d0f0f0)"}}>
          <p className="text-2xl mb-2">🚀</p>
          <p className="font-bold text-sm" style={{color: "#2a9d9d"}}>Simple, rápido y sin complicaciones</p>
          <p className="text-xs text-gray-500 mt-1">No necesitás registrarte ni crear una cuenta</p>
        </div>

        <button onClick={onComenzar}
          className="w-full text-white py-4 rounded-2xl font-bold text-lg shadow-md transition hover:shadow-lg mb-4"
          style={{backgroundColor: "#3dbfbf"}}>
          Comenzar ahora →
        </button>
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
    </div>
  );
}

function App() {
  const [usuario, setUsuario] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [vista, setVista] = useState("bienvenida");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.email));
        if (snap.exists()) {
          const datos = { ...snap.data(), email: user.email };
          if (datos.rol === "ejecutor" && datos.areaId) {
            const areaSnap = await getDoc(doc(db, "areas", datos.areaId));
            if (areaSnap.exists()) datos.areaNombre = areaSnap.data().nombre;
          }
          if (datos.rol === "encargado" && datos.categoriaId) {
            const catSnap = await getDoc(doc(db, "categorias", datos.categoriaId));
            if (catSnap.exists()) datos.categoria = catSnap.data().nombre;
          }
          setDatosUsuario(datos);
          if (datos.rol === "admin") setVista("admin");
          else if (datos.rol === "encargado") setVista("panel");
          else if (datos.rol === "ejecutor") setVista("ejecutor");
        }
        setUsuario(user);
      } else {
        setUsuario(null);
        setDatosUsuario(null);
        setVista("bienvenida");
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
      <div className="flex-1">
        {vista === "bienvenida" && (
          <Bienvenida
            onComenzar={() => setVista("formulario")}
            onEncargados={() => setVista("login")}
          />
        )}
        {vista === "formulario" && (
          <FormularioReclamo
            onVolver={() => setVista("bienvenida")}
            onEncargados={() => setVista("login")}
          />
        )}
        {vista === "login" && <Login onLogin={(user) => setUsuario(user)} />}
        {vista === "panel" && datosUsuario && <PanelEncargado usuario={datosUsuario} />}
        {vista === "ejecutor" && datosUsuario && <PanelEjecutor usuario={datosUsuario} />}
        {vista === "admin" && <PanelAdmin />}
      </div>
    </div>
  );
}

export default App;