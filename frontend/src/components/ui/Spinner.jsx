export default function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function PageLoading() {
  return (
    <div className="page-loading">
      <Spinner />
    </div>
  );
}
