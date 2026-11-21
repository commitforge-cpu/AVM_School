export default function PageHead({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="page-head">
      <div className="wrap">
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
    </header>
  );
}
