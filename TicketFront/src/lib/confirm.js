import { createContext, useContext } from 'react'

export const ConfirmContext = createContext(null)
// ask(message, { confirmLabel, danger }) → Promise<boolean>
export const useConfirm = () => useContext(ConfirmContext)
