import React, { useRef, useReducer } from 'react';
import { FaSearch } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';

import {
  SearchState,
  SearchAction,
  FindPostProps,
} from '../interfaces/ui.post.interface';
import { searchPostPreviews } from '../services/post.service';
import { handleAxiosError } from '../../utils/error.util';
import { showAlertToast } from '../../utils/AlertToast';

function reducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'INITIALIZE':
      return { loading: false, found: false, notFound: false, selected: false };
    case 'START_SEARCH':
      return { loading: true, found: false, notFound: false, selected: false };
    case 'COMPLETED':
      return { loading: false, found: true, notFound: false, selected: false };
    default:
      return state;
  }
}

const SearchPostBar: React.FC<FindPostProps> = ({ setPreviews }) => {
  const [searchState, searchStateDispatch] = useReducer(reducer, {
    loading: false,
    found: false,
    notFound: false,
    selected: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    try {
      const query = inputRef.current?.value || '';

      searchStateDispatch({ type: 'START_SEARCH' });

      const results = await searchPostPreviews(query);
      setPreviews(results);
      searchStateDispatch({ type: 'COMPLETED' });
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="pt-4 d-flex flex-column align-items-center mt-2">
      <div className="input-group w-75 mb-2">
        <input
          type="text"
          ref={inputRef}
          onKeyDown={handleKeyDown}
          className="form-control form-control-sm"
          placeholder="Search for a post..."
        />
        <button
          className={`btn ${searchState.loading ? 'btn-secondary disabled' : 'btn-primary'}`}
          onClick={handleSearch}
          disabled={searchState.loading}
        >
          <FaSearch />
        </button>
      </div>

      {searchState.loading && (
        <div className="text-muted d-flex align-items-center gap-2">
          <ClipLoader
            size={35}
            color={'var(--primary-color)'}
            loading={searchState.loading}
          />
          Loading...
        </div>
      )}
    </div>
  );
};

export default SearchPostBar;
