import React, { useState, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';

export default function SearchPanel({ onSearch }) {
  const [value, setValue] = useState('');
  const timerRef = useRef(null);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setValue(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(v), 300);
  }, [onSearch]);

  return (
    <div className="absolute top-6 left-6 z-20 w-80">
      <div className="relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"
          size={20}
        />
        <input
          type="text"
          value={value}
          placeholder="Buscar SKU o Lote..."
          className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xl"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
