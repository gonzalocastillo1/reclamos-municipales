import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

// Crear una notificación
export const crearNotificacion = async ({ para, tipo, mensaje, reclamoId }) => {
  await addDoc(collection(db, "notificaciones"), {
    para,
    tipo,
    mensaje,
    reclamoId,
    leida: false,
    fecha: new Date(),
  });
};

// Escuchar notificaciones no leídas de un usuario
export const escucharNotificaciones = (email, callback) => {
  const q = query(
    collection(db, "notificaciones"),
    where("para", "==", email),
    where("leida", "==", false)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// Marcar notificación como leída
export const marcarLeida = async (id) => {
  await updateDoc(doc(db, "notificaciones", id), { leida: true });
};

// Marcar todas como leídas
export const marcarTodasLeidas = async (notificaciones) => {
  await Promise.all(notificaciones.map(n => marcarLeida(n.id)));
};