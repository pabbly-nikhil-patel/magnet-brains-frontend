export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return (
    <div className="flex justify-center items-center py-8">
      <div className={`${sizeClass} border-4 border-gray-200 border-t-primary rounded-full animate-spin`} />
    </div>
  );
}
