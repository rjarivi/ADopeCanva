import { createContext, useContext } from 'react'

interface FocusedModeCtxValue {
    focused: boolean
    setFocused: (v: boolean) => void
}

export const FocusedModeCtx = createContext<FocusedModeCtxValue>({
    focused: false,
    setFocused: () => {},
})

export function useFocusedMode() {
    return useContext(FocusedModeCtx)
}
