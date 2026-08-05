export default function MetricCard({ label, value, tone = 'neutral', meta }) {
  return (
    <section className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {meta ? <small>{meta}</small> : null}
    </section>
  );
}
