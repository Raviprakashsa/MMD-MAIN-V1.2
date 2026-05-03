'use client'

import { forwardRef, InputHTMLAttributes, ReactNode, useState, useId } from 'react'
import { Eye, EyeOff, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Base Input Props
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

function getDescribedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, fullWidth = true, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const describedBy = getDescribedBy(inputId, error, hint)

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-[var(--foreground-muted)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input-modern',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
              className
            )}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-600" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-[var(--foreground-subtle)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Password Input with Toggle
interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showStrengthMeter?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrengthMeter = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 rounded hover:bg-[var(--surface-hover)] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        className={className}
        {...props}
      />
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

// Search Input
interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onClear?: () => void
  showClearButton?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, showClearButton = true, ...props }, ref) => {
    const hasValue = value && String(value).length > 0

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="w-4 h-4" />}
        rightIcon={
          hasValue && showClearButton ? (
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null
        }
        value={value}
        className={className}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

// Select Component
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, fullWidth = true, id, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const describedBy = getDescribedBy(selectId, error, hint)

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-[var(--foreground-muted)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'select-modern w-full',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
            className
          )}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt, index) => (
            <option key={`${opt.value}-${index}`} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-600" />
            {error}
          </p>
        )}
        {hint && !error && <p id={`${selectId}-hint`} className="text-sm text-[var(--foreground-subtle)]">{hint}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

// Textarea Component
interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
  rows?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, fullWidth = true, rows = 4, id, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = id || generatedId
    const describedBy = getDescribedBy(textareaId, error, hint)

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-semibold text-[var(--foreground-muted)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'input-modern resize-none',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
            className
          )}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-600" />
            {error}
          </p>
        )}
        {hint && !error && <p id={`${textareaId}-hint`} className="text-sm text-[var(--foreground-subtle)]">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// Checkbox Component
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId()
    const checkboxId = id || generatedId

    return (
      <div className="flex items-center gap-2.5">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={cn(
            'w-4 h-4 rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0 transition-colors cursor-pointer',
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="text-sm text-[var(--foreground)] cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

// Radio Group
interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  readonly name: string
  readonly options: readonly RadioOption[]
  readonly value?: string
  readonly onChange?: (value: string) => void
  readonly label?: string
  readonly orientation?: 'horizontal' | 'vertical'
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <fieldset className="space-y-2">
      {label && <legend className="text-sm font-semibold text-[var(--foreground-muted)] mb-2">{label}</legend>}
      <div className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
              value === opt.value
                ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                : 'border-[var(--border)] hover:border-[var(--border-strong)]'
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange?.(opt.value)}
              className="mt-0.5 w-4 h-4 text-[var(--primary)] border-[var(--border-strong)] focus:ring-[var(--primary)] focus:ring-offset-0"
            />
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">{opt.label}</span>
              {opt.description && (
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default Input
