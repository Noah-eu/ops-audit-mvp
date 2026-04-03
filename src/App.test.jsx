/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./db.js', () => ({
    db: {
        audits: {
            toArray: vi.fn().mockResolvedValue([]),
            add: vi.fn(),
            delete: vi.fn(),
            bulkPut: vi.fn(),
        },
        templates: {
            toArray: vi.fn().mockResolvedValue([]),
        },
    },
    ensureSeedTemplates: vi.fn().mockResolvedValue(undefined),
}))

import App from './App.jsx'

describe('App', () => {
    it('shows an empty state instead of hanging in loading when local DB is empty', async () => {
        render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Zatím tu nejsou žádné rozbory')).toBeInTheDocument()
        })

        expect(screen.getAllByRole('button', { name: 'Nový rozbor' }).length).toBeGreaterThan(0)
        expect(screen.queryByText('Načítám lokální data')).not.toBeInTheDocument()
    })
})