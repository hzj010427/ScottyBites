import axios from 'axios';
import { IResponse } from '../../../common/server.responses';

export function handleAxiosError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    const errorResponse = error.response.data as IResponse;
    return errorResponse.message || 'An unexpected error occurred.';
  }
  return 'An unexpected error occurred.';
}
