import { createContext, useContext } from 'react'

// api(push/update/dismiss …)는 값이 바뀌지 않아 소비자가 불필요하게 다시 그려지지 않는다.
export const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

// 화면에 그릴 알림 목록
export const ToastItemsContext = createContext([])
export const useToastItems = () => useContext(ToastItemsContext)
