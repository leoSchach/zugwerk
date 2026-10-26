// Rundes Profilbild mit einer Schachfigur
export default function Avatar({ piece, color, size = 40 }) {
  return (
    <span
      className="avatar"
      style={{ background: color, width: size, height: size, fontSize: size * 0.62 }}
    >
      {piece}
    </span>
  );
}
