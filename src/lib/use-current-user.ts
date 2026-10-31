import { useRouteContext } from '@tanstack/react-router'

export const useCurrentUser = () => useRouteContext({ from: '/_app' }).user
