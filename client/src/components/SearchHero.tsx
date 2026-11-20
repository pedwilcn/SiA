import { Search, X } from 'lucide-react';

interface SearchHeroProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  countLabel?: string;
}

export function SearchHero({ value, onChange, placeholder, countLabel }: SearchHeroProps) {
  return (
    <div className="search-hero">
      <Search size={19} color="var(--primary)" style={{ flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {countLabel && (
        <span className="badge tabular" style={{ marginRight: value ? 8 : 0, flexShrink: 0 }}>
          {countLabel}
        </span>
      )}
      {value && (
        <button
          type="button"
          className="search-hero-clear"
          onClick={() => onChange('')}
          title="Limpar busca"
          aria-label="Limpar busca"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
