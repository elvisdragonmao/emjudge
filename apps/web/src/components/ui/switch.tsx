import { cn } from "@/lib/utils";
import * as React from "react";

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
	checked: boolean;
	onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(({ checked, className, disabled, onCheckedChange, type, ...props }, ref) => (
	<button
		ref={ref}
		type={type ?? "button"}
		role="switch"
		aria-checked={checked}
		disabled={disabled}
		onClick={() => {
			if (!disabled) {
				onCheckedChange?.(!checked);
			}
		}}
		className={cn(
			"inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
			checked ? "bg-[var(--color-success)]" : "bg-muted",
			className
		)}
		{...props}
	>
		<span className={cn("block h-5 w-5 rounded-full bg-background shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
	</button>
));

Switch.displayName = "Switch";

export { Switch };
