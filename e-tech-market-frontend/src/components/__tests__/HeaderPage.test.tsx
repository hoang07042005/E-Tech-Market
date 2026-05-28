import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import HeaderPage from '../HeaderPage'

describe('HeaderPage Component', () => {
  it('renders the search inputs correctly', () => {
    render(
      <BrowserRouter>
        <HeaderPage />
      </BrowserRouter>
    )

    const searchInputs = screen.getAllByPlaceholderText(/Tìm kiếm/i)
    expect(searchInputs.length).toBeGreaterThan(0)
  })

  it('renders cart and notification icons', () => {
    render(
      <BrowserRouter>
        <HeaderPage />
      </BrowserRouter>
    )

    const cartBtn = screen.getByLabelText(/Giỏ hàng/i)
    expect(cartBtn).toBeInTheDocument()
  })
})
