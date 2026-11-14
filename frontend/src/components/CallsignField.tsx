interface CallsignFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CallsignField({ value, onChange }: CallsignFieldProps) {
  return (
    <label className="field">
      <span className="field-label">Your callsign</span>
      <input
        className="field-input"
        value={value}
        maxLength={24}
        placeholder="e.g. Night Owl 7"
        autoComplete="off"
        autoCapitalize="words"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
