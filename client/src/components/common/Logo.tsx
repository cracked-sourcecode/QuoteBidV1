import React from 'react';
import { Link } from 'wouter';

interface LogoProps {
  height?: number;
  className?: string;
}

export function Logo({ height = 40, className = '' }: LogoProps) {
  return (
    <Link href="/">
      <div className={`cursor-pointer flex items-center ${className}`}>
        <svg 
          width={height * 2.5} 
          height={height} 
          viewBox="0 0 250 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* SVG path for QuoteBid logo */}
          <path 
            d="M40 20C51.0457 20 60 28.9543 60 40C60 51.0457 51.0457 60 40 60C28.9543 60 20 51.0457 20 40C20 28.9543 28.9543 20 40 20Z" 
            fill="#004684" 
          />
          <path 
            d="M35 30V50L50 40L35 30Z" 
            fill="white" 
          />
          <text 
            x="75" 
            y="55" 
            fontFamily="Arial, sans-serif" 
            fontSize="30" 
            fontWeight="bold" 
            fill="#004684"
          >
            QuoteBid
          </text>
        </svg>
      </div>
    </Link>
  );
}