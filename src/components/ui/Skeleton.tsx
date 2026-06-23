interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const roundedMap: Record<string, string> = {
  sm: 'tw-rounded-sm',
  md: 'tw-rounded-md',
  lg: 'tw-rounded-lg',
  full: 'tw-rounded-full',
};

export default function Skeleton({
  width = '100%',
  height = 16,
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`tw-animate-pulse tw-bg-[var(--cb-border-subtle)] ${roundedMap[rounded] || roundedMap.md} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="tw-bg-white tw-border tw-border-[var(--cb-border-subtle)] tw-rounded-lg tw-p-3">
      <Skeleton height={20} width="60%" className="tw-mb-2" />
      <Skeleton height={14} width="100%" className="tw-mb-1" />
      <Skeleton height={14} width="80%" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="tw-space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2">
          <Skeleton width={28} height={28} rounded="md" />
          <div className="tw-flex-1">
            <Skeleton height={14} width="60%" className="tw-mb-1" />
            <Skeleton height={12} width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}
