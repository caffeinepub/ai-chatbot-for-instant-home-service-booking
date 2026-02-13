import { Button } from '@/components/ui/button';

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center px-4 py-2">
      {options.map((option) => (
        <Button
          key={option}
          variant="outline"
          size="sm"
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="rounded-full border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
