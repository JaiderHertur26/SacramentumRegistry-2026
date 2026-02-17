import React from 'react';

const Select = React.forwardRef(({ options = [], placeholder, error, className, ...props }, ref) => {
  return (
    <div className="w-full">
      <select
        ref={ref}
        className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B7BA7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 ${className}`}
        {...props}
      >
        {placeholder && <option value="" disabled selected className="text-gray-500">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-1 font-semibold">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';

export { Select };
export default Select;