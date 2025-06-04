import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TradeForm from '../TradeForm'

const mockOnSubmit = vi.fn()

describe('TradeForm', () => {
  it('should render form fields', () => {
    render(<TradeForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText(/символ/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/цена входа/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/количество/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /добавить сделку/i })).toBeInTheDocument()
  })

  it('should submit form with correct data', async () => {
    render(<TradeForm onSubmit={mockOnSubmit} />)
    
    fireEvent.change(screen.getByLabelText(/символ/i), {
      target: { value: 'SBER' }
    })
    fireEvent.change(screen.getByLabelText(/цена входа/i), {
      target: { value: '250.50' }
    })
    fireEvent.change(screen.getByLabelText(/количество/i), {
      target: { value: '100' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /добавить сделку/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'SBER',
          entryPrice: 250.50,
          quantity: 100
        })
      )
    })
  })

  it('should show validation error for empty symbol', async () => {
    render(<TradeForm onSubmit={mockOnSubmit} />)
    
    fireEvent.click(screen.getByRole('button', { name: /добавить сделку/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/символ обязателен/i)).toBeInTheDocument()
    })
  })
}) 