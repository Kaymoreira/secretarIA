import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative bg-purple-600 rounded-lg p-2 rotate-12 transform hover:rotate-0 transition-transform duration-300">
        <FiMessageSquare className="w-5 h-5 text-white" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-300 rounded-full" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-300 rounded-full" />
      </div>
      <span className="text-2xl tracking-tight font-light">
        secretar
        <span className="text-purple-600 font-medium">ia</span>
      </span>
    </div>
  );
};

export default Logo; 