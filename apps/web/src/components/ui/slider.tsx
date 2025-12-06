export const Slider = ({
  value,
  onValueChange,
  max,
  min = 0,
  step = 1,
  className = ""
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  max: number;
  min?: number;
  step?: number;
  className?: string;
}) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value[0]}
    onChange={(e) => onValueChange([parseInt(e.target.value)])}
    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 ${className}`}
  />
);
