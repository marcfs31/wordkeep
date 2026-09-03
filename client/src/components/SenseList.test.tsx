import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SenseList } from './SenseList'
import { FormsLine, SenseExtras } from './SenseExtras'

const sense = {
  id: 's1',
  partOfSpeech: 'adjective',
  definition: 'Feeling pleasure.',
  examples: ['A happy day.'],
  synonyms: ['glad'],
  antonyms: ['sad'],
  tags: ['emotion'],
}

describe('SenseList', () => {
  it('renders definitions grouped by part of speech and marks the primary', () => {
    render(
      <MemoryRouter>
        <SenseList
          senses={[sense]}
          language="en"
          primaryId="s1"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('adjective')).toBeInTheDocument()
    expect(screen.getByText('Feeling pleasure.')).toBeInTheDocument()
    expect(screen.getByText('card face')).toBeInTheDocument()
  })

  it('invokes onPick when a definition is clicked', async () => {
    const onPick = vi.fn()
    render(
      <MemoryRouter>
        <SenseList
          senses={[sense]}
          language="en"
          primaryId="s1"
          onPick={onPick}
        />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Feeling pleasure.' }))
    expect(onPick).toHaveBeenCalledWith(0, expect.objectContaining({ id: 's1' }))
  })
})

describe('SenseExtras', () => {
  it('links synonyms and antonyms', () => {
    render(
      <MemoryRouter>
        <SenseExtras sense={sense} language="en" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'glad' })).toHaveAttribute('href', '/?q=glad&lang=en')
    expect(screen.getByRole('link', { name: 'sad' })).toHaveAttribute('href', '/?q=sad&lang=en')
    expect(screen.getByText('emotion')).toBeInTheDocument()
    expect(screen.getByText(/A happy day/)).toBeInTheDocument()
  })
})

describe('FormsLine', () => {
  it('renders nothing without forms', () => {
    const { container } = render(<FormsLine forms={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists inflected forms', () => {
    render(<FormsLine forms={[{ word: 'happier', tags: ['comparative'] }]} />)
    expect(screen.getByText('happier')).toBeInTheDocument()
    expect(screen.getByText('(comparative)')).toBeInTheDocument()
  })
})
