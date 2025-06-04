import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Statistics from '../Statistics'

const mockTrades = [
  {
    id: 1,
    symbol: 'SBER',
    entryPrice: 250,
    exitPrice: 260,
    quantity: 100,
    profit: 1000
  },
  {
    id: 2,
    symbol: 'GAZP',
    entryPrice: 170,
    exitPrice: 165,
    quantity: 50,
    profit: -250
  }
]

describe('Statistics', () => {
  it('should render statistics cards', () => {
    render(<Statistics trades={mockTrades} />)
    
    expect(screen.getByText(/общая прибыль/i)).toBeInTheDocument()
    expect(screen.getByText(/количество сделок/i)).toBeInTheDocument()
    expect(screen.getByText(/процент прибыльных/i)).toBeInTheDocument()
  })

  it('should calculate total profit correctly', () => {
    render(<Statistics trades={mockTrades} />)
    
    expect(screen.getByText('750')).toBeInTheDocument() // 1000 + (-250)
  })

  it('should calculate trades count correctly', () => {
    render(<Statistics trades={mockTrades} />)
    
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should calculate win rate correctly', () => {
    render(<Statistics trades={mockTrades} />)
    
    expect(screen.getByText('50%')).toBeInTheDocument() // 1 profitable out of 2
  })

  it('should handle empty trades array', () => {
    render(<Statistics trades={[]} />)
    
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
}) 