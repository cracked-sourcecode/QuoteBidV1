import React from 'react';

interface LogoUniformProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  onError?: (event?: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function LogoUniform({ 
  src, 
  alt, 
  className = "",
  width = 400,
  height = 200,
  onError
}: LogoUniformProps) {
  // Calculate the SVG viewBox based on the desired aspect ratio (400x200 = 2:1)
  const viewBoxWidth = 400;
  const viewBoxHeight = 200;
  
  // Create a unique ID for the image element
  const imageId = React.useId();
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={`bg-white ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background rectangle */}
      <rect 
        width={viewBoxWidth} 
        height={viewBoxHeight} 
        fill="white" 
        stroke="#e5e7eb" 
        strokeWidth="1"
      />
      
      {/* Logo container - minimal padding */}
      <foreignObject 
        x="2" 
        y="2" 
        width={viewBoxWidth - 4} 
        height={viewBoxHeight - 4}
      >
        <div 
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflow: 'hidden'
          }}
        >
          <img 
            src={src}
            alt={alt}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              width: 'auto',
              height: 'auto'
            }}
            onError={onError}
          />
        </div>
      </foreignObject>
    </svg>
  );
} 