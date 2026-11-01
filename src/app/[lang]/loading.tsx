export default function Loading() {
  return (
    <div className="container-x py-12 md:py-20" aria-busy="true">
      <div className="skeleton h-12 w-2/3 max-w-xl" />
      <div className="skeleton mt-5 h-5 w-full max-w-lg" />
      <div className="mt-12 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
