// The three "plan your day" cards
export default function Tiles({ a }) {
  const items = [['What to wear', a.wear, a.wearSub], ['Best time outside', a.best, a.bestSub], ['Sun', a.sun, a.uvText]];
  return (
    <section className="tiles">
      {items.map(([title, big, small]) => (
        <div className="panel" key={title}><h2>{title}</h2><p className="big">{big}</p><p className="small">{small}</p></div>
      ))}
    </section>
  );
}
