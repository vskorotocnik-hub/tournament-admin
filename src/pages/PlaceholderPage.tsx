export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-3">
        <p className="text-4xl">🚧</p>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-zinc-500 text-sm">Этот раздел будет добавлен позже</p>
      </div>
    </div>
  );
}
