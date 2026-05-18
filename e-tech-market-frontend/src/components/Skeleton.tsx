import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius, 
  className = '', 
  style = {} 
}) => {
  const combinedStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: borderRadius !== undefined ? borderRadius : undefined,
    ...style,
  };

  return <div className={`skeleton ${className}`} style={combinedStyle} />;
};

export default Skeleton;
