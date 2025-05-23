import axios from 'axios';
import { forceSocketReconnect } from './socket';
import { IResponse } from '../../../common/server.responses';

export default async function handleSearch<T>(
  query: string,
  searchFn: (query: string) => Promise<T>,
  onSuccess: (result: T) => void
): Promise<void> {
  try {
    const searchValue = query.trim().toLowerCase();
    if (!searchValue) {
      forceSocketReconnect();
      return;
    }

    const result = await searchFn(searchValue);
    onSuccess(result);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorResponse = error.response.data as IResponse;
      console.error(errorResponse.message || 'An unexpected error occurred.');
    } else {
      console.error('An unexpected error occurred.');
    }
  }
}