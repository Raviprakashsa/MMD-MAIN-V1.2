'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, Briefcase, Users, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'company' | 'requirement' | 'candidate'
  title: string
  subtitle: string
  href: string
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearch({ isOpen, onClose }: Readonly<GlobalSearchProps>) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      router.push(results[selectedIndex].href)
      onClose()
    }
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'company':
        return <Building2 className="h-4 w-4 text-[var(--accent)]" />
      case 'requirement':
        return <Briefcase className="h-4 w-4 text-[var(--primary)]" />
      case 'candidate':
        return <Users className="h-4 w-4 text-[var(--success)]" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      {/* Backdrop - Glass command style */}
      <button
        type="button"
        className="absolute inset-0 glass-command-backdrop cursor-default"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="Close search"
      />

      {/* Search dialog - Glass command container */}
      <div className="relative w-full max-w-2xl mx-4 glass-command-container overflow-hidden modal-enter">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <Search className="h-5 w-5 text-[var(--foreground-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="flex-1 bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] outline-none text-lg"
            autoComplete="off"
          />
          {loading && <Loader2 className="h-5 w-5 text-[var(--primary)] animate-spin" />}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors btn-light"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query && !loading && (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] flex items-center justify-center mx-auto mb-3">
                <Search className="h-6 w-6 text-[var(--foreground-subtle)]" />
              </div>
              <p className="text-[var(--foreground)] font-medium">No results found</p>
              <p className="text-sm text-[var(--foreground-muted)] mt-1">Try searching with different keywords</p>
            </div>
          )}

          {results.length === 0 && !query && (
            <div className="px-5 py-10 text-center">
              <p className="text-[var(--foreground-muted)]">Start typing to search...</p>

            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => {
                router.push(result.href)
                onClose()
              }}
              className={cn(
                'w-full flex items-center gap-3 px-5 py-3 text-left transition-all row-stagger',
                index === selectedIndex
                  ? 'bg-[var(--primary-light)] border-l-3 border-[var(--primary)]'
                  : 'hover:bg-[var(--surface-hover)] border-l-3 border-transparent'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                result.type === 'company' && 'bg-[var(--accent-light)]',
                result.type === 'requirement' && 'bg-[var(--primary-light)]',
                result.type === 'candidate' && 'bg-[var(--success-light)]'
              )}>
                {getIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--foreground)] font-medium truncate">{result.title}</p>
                <p className="text-sm text-[var(--foreground-muted)] truncate">{result.subtitle}</p>
              </div>
              <span className="text-xs text-[var(--foreground-muted)] capitalize px-2 py-1 bg-[var(--surface-hover)] rounded-md font-medium">
                {result.type}
              </span>
            </button>
          ))}
        </div>


      </div>
    </div>
  )
}
