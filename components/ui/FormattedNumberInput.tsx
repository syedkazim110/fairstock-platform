'use client'

import { useEffect, useState } from 'react'

interface FormattedNumberInputProps {
  value: string
  onChange: (value: string) => void
  decimals?: number
  placeholder?: string
  required?: boolean
  className?: string
  disabled?: boolean
  min?: number
  max?: number
}

export default function FormattedNumberInput({
  value,
  onChange,
  decimals = 0,
  placeholder = '',
  required = false,
  className = '',
  disabled = false,
  min,
  max
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // Format number with commas
  const formatNumber = (num: string): string => {
    if (!num) return ''
    
    // Remove all non-numeric characters except decimal point
    const cleanNum = num.replace(/[^\d.]/g, '')
    
    // Split by decimal point
    const parts = cleanNum.split('.')
    
    // Format integer part with commas
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
    // Handle decimal part
    if (decimals > 0 && parts.length > 1) {
      const decimalPart = parts[1].slice(0, decimals)
      return `${integerPart}.${decimalPart}`
    }
    
    return integerPart
  }

  // Remove formatting for actual value
  const unformatNumber = (formatted: string): string => {
    return formatted.replace(/,/g, '')
  }

  // Update display value when prop value changes
  useEffect(() => {
    if (value === '' || value === undefined) {
      setDisplayValue('')
    } else {
      setDisplayValue(formatNumber(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('')
      onChange('')
      return
    }
    
    // Remove commas for processing
    const rawValue = unformatNumber(inputValue)
    
    // Validate numeric input
    const numericRegex = decimals > 0 ? /^\d*\.?\d*$/ : /^\d*$/
    if (!numericRegex.test(rawValue)) {
      return
    }
    
    // Check min/max constraints
    if (rawValue && !isNaN(parseFloat(rawValue))) {
      const numValue = parseFloat(rawValue)
      if (min !== undefined && numValue < min) return
      if (max !== undefined && numValue > max) return
    }
    
    // Update display with formatting
    setDisplayValue(formatNumber(rawValue))
    
    // Pass raw value to parent
    onChange(rawValue)
  }

  const handleBlur = () => {
    // Reformat on blur to ensure consistent formatting
    if (displayValue) {
      setDisplayValue(formatNumber(unformatNumber(displayValue)))
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className || 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'}
    />
  )
}
