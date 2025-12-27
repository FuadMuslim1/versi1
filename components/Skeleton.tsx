import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>
  );
};

export const PageHeaderSkeleton = () => (
  <div className="mb-8">
    <Skeleton className="h-8 w-48 mb-2" />
    <Skeleton className="h-4 w-64" />
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
    <Skeleton className="h-10 w-10 rounded-full mb-4" />
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);