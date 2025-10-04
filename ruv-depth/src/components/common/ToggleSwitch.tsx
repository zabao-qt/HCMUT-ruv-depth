import { forwardRef } from 'react';

type Props = {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string | null;
  disabled?: boolean;
  className?: string; // wrapper class
  ariaLabel?: string;
};

const ToggleSwitch = forwardRef<HTMLInputElement, Props>(function ToggleSwitch(
  { id, checked, onChange, label = null, disabled = false, className = '', ariaLabel },
  ref
) {
  const inputId = id ?? `toggle-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <input
        id={inputId}
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'toggle')}
      />
      <div
        aria-hidden
        className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700
                   peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white
                   after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border
                   after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"
      />
      {label ? <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">{label}</span> : null}
    </label>
  );
});

export default ToggleSwitch;
