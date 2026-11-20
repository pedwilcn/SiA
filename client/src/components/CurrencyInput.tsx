interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  allowNegative?: boolean;
  id?: string;
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CurrencyInput({ value, onChange, allowNegative = false, id }: CurrencyInputProps) {
  const isNeg = value < 0;
  const formatted = formatBrl(Math.abs(value));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const cents = Math.round(Math.abs(value) * 100);
      const nextCents = Math.min(cents * 10 + Number(e.key), 99999999);
      const nextVal = nextCents / 100;
      onChange(isNeg ? -nextVal : nextVal);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const cents = Math.round(Math.abs(value) * 100);
      const nextVal = Math.floor(cents / 10) / 100;
      onChange(isNeg && nextVal > 0 ? -nextVal : nextVal);
    } else if (e.key === 'Delete' || e.key === 'Escape') {
      e.preventDefault();
      onChange(0);
    } else if (allowNegative && (e.key === '-' || e.key === '+')) {
      e.preventDefault();
      if (value !== 0) {
        onChange(e.key === '-' ? -Math.abs(value) : Math.abs(value));
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 38,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface)',
        padding: '0 10px',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', userSelect: 'none' }}>
        {isNeg ? '-R$' : 'R$'}
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatted}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        className="tabular"
        style={{
          border: 'none',
          outline: 'none',
          padding: 0,
          height: '100%',
          width: '100%',
          textAlign: 'right',
          fontWeight: 600,
          fontSize: 14,
          background: 'transparent',
          color: isNeg ? 'var(--danger)' : 'var(--text)',
        }}
      />
    </div>
  );
}
