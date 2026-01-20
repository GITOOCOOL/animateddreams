import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  statusText?: string;
  color?: string; // tailwind color class prefix (e.g. 'cyan', 'purple')
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  label = "PROCESSING", 
  statusText,
  color = "cyan" 
}) => {
  return (
    <div className="w-full font-mono text-xs">
      <div className="flex justify-between mb-1 text-slate-400 uppercase tracking-widest">
        <span>{label}</span>
        <span className={`text-${color}-400`}>{Math.round(progress)}%</span>
      </div>
      
      <div className="relative h-2 bg-slate-900 rounded-sm overflow-hidden border border-slate-800">
        <motion.div 
          className={`absolute top-0 left-0 h-full bg-${color}-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
        {/* Scanline effect */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] w-full h-full animate-scan-fast opactiy-30"></div>
      </div>
      
      {statusText && (
        <div className="mt-1 text-right text-[10px] text-slate-500 animate-pulse">
           {statusText}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
