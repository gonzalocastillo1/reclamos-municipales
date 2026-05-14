import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completá todos los campos");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      onLogin(result.user);
    } catch (e) {
      setError("Email o contraseña incorrectos");
    }
    setCargando(false);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "100px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h1>🔐 Acceso encargados</h1>
      <p style={{ color: "#666" }}>Ingresá con tu cuenta asignada.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }} />
        </div>

        {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}

        <button onClick={handleLogin} disabled={cargando}
          style={{ padding: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer" }}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
}

export default Login;