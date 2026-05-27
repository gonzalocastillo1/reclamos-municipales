import { useState, useEffect, useRef } from "react";
import { escucharNotificaciones, marcarTodasLeidas } from "./notificaciones";

const reproducirSonido = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Primer tono
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.4, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Segundo tono
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log("No se pudo reproducir sonido:", e);
  }
};

function Notificaciones({ email }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!email) return;
    const unsub = escucharNotificaciones(email, (nuevas) => {
      if (nuevas.length > prevCountRef.current) {
        reproducirSonido();
      }
      prevCountRef.current = nuevas.length;
      setNotificaciones(nuevas);
    });
    return unsub;
  }, [email]);

  const handleAbrir = async () => {
    setAbierto(!abierto);
  };

  const handleMarcarLeidas = async () => {
    await marcarTodasLeidas(notificaciones);
    setAbierto(false);
  };

  return (
    <div className="relative">
      {/* Campana */}
      <button onClick={handleAbrir}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition">
        <span className="text-xl">🔔</span>
        {notificaciones.length > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
            style={{backgroundColor: "#ef4444"}}>
            {notificaciones.length > 9 ? "9+" : notificaciones.length}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {abierto && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-800">Notificaciones</p>
            {notificaciones.length > 0 && (
              <button onClick={handleMarcarLeidas}
                className="text-xs font-semibold" style={{color: "#3dbfbf"}}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          {notificaciones.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-gray-400">No tenés notificaciones nuevas</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notificaciones.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
                  <p className="text-sm font-semibold text-gray-800">{n.mensaje}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {n.fecha?.toDate().toLocaleString("es-UY")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlay para cerrar */}
      {abierto && (
        <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
      )}
    </div>
  );
}

export default Notificaciones;