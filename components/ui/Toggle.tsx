import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, label }) => {
  return (
    <div className="flex items-center cursor-pointer" onClick={() => onChange(!enabled)}>
      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${enabled ? 'bg-primary' : 'bg-zinc-700'}`}>
        <span
          className={`${
            enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`}
        />
      </div>
      {label && <span className="ml-3 text-sm font-medium text-zinc-300">{label}</span>}
    </div>
  );
};