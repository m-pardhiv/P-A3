import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  [
    'relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-sm font-semibold',
    'transition-colors duration-200 select-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Ink-black pill that warms into the brand gradient on hover
        default:
          'bg-primary text-primary-foreground shadow-soft before:absolute before:inset-0 before:-z-10 before:bg-brand-gradient before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
        brand: 'bg-brand-gradient text-white shadow-glow hover:brightness-105',
        outline: 'border border-input bg-card text-foreground hover:bg-secondary/60 hover:border-foreground/20',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        soft: 'bg-accent text-accent-foreground hover:bg-brand-100',
        ghost: 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        link: 'rounded-none px-0 text-brand-ink underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'h-10 w-10',
        'icon-sm': 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'>, ButtonVariantProps {
  loading?: boolean
  children?: React.ReactNode
}

const tapProps = { whileHover: { scale: 1.025 }, whileTap: { scale: 0.97 } }
const springy = { type: 'spring', stiffness: 520, damping: 32 } as const

export function Button({ className, variant, size, loading, disabled, children, type = 'button', ...props }: ButtonProps) {
  return (
    <motion.button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      transition={springy}
      {...(variant === 'link' ? {} : tapProps)}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </motion.button>
  )
}

const MotionLink = motion.create(Link)

export type LinkButtonProps = React.ComponentProps<typeof MotionLink> & ButtonVariantProps

export function LinkButton({ className, variant, size, ...props }: LinkButtonProps) {
  return (
    <MotionLink
      className={cn(buttonVariants({ variant, size }), className)}
      transition={springy}
      {...(variant === 'link' ? {} : tapProps)}
      {...props}
    />
  )
}
