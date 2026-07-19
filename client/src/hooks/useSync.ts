import { useMutation } from '@tanstack/react-query';
import { dispararSync } from '../api/sync';

export function useSync() {
  return useMutation({ mutationFn: dispararSync });
}
