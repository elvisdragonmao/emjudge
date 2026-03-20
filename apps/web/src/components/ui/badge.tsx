import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors", {
	variants: {
		variant: {
			default: "border-transparent bg-primary text-primary-foreground",
			secondary: "border-transparent bg-secondary text-secondary-foreground",
			destructive: "border-transparent bg-destructive text-destructive-foreground",
			outline: "text-foreground",
			success: "border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)]",
			info: "border-transparent bg-[var(--color-info)] text-[var(--color-info-foreground)]",
			warning: "border-transparent bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
			running: "border-transparent bg-[var(--color-running)] text-[var(--color-running-foreground)]"
		}
	},
	defaultVariants: {
		variant: "default"
	}
});

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
