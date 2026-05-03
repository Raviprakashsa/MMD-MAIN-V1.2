'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronDown, X, Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  subtitle?: string
}

interface ComboboxProps {
  readonly options: ComboboxOption[]
  readonly value?: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  readonly emptyMessage?: string
  readonly searchPlaceholder?: string
  readonly label?: string
  readonly className?: string
  readonly disabled?: boolean
  readonly error?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  emptyMessage = 'No results found',
  searchPlaceholder = 'Search...',
  label,
  className,
  disabled = false,
  error,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const query = searchQuery.toLowerCase()
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.subtitle?.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Get selected option
  const selectedOption = options.find((opt) => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'input-modern w-full flex items-center justify-between gap-2 text-left',
          error && 'border-red-500 focus:border-red-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn('flex-1 truncate', !selectedOption && 'text-slate-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <X
              className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-200',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-red-600" />
          {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input - Fixed at top */}
          <div className="shrink-0 p-2 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-2 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 rounded focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all font-medium"
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Options List - Fixed small height container */}
          <div className="relative bg-white dark:bg-slate-800 flex-[0_1_auto]">
            <div className="h-[140px] overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(203 213 225) transparent'
            }}>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center flex flex-col items-center justify-center h-full">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 mb-2">
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {emptyMessage}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Try adjusting your search
                  </p>
                </div>
              ) : (
                <div className="py-1 px-1.5">
                  {filteredOptions.map((option) => {
                    const isSelected = option.value === value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                          'w-full px-2.5 py-1.5 mb-1 last:mb-0 text-left flex items-center justify-between gap-2.5 rounded-lg transition-all duration-150',
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-900/30 border border-violet-200/50 dark:border-violet-700/50 shadow-sm'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-600/50'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            'text-sm font-semibold truncate',
                            isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-white'
                          )}>
                            {option.label}
                          </div>
                          {option.subtitle && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>{option.subtitle}</span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Scroll indicator - Gradient fade at bottom */}
            {filteredOptions.length > 3 && (
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-slate-800 via-white/80 dark:via-slate-800/80 to-transparent pointer-events-none" />
            )}
          </div>

          {/* Compact footer removed to keep dropdown height small and focused on list scrolling */}
        </div>
      )}
    </div>
  )
}
