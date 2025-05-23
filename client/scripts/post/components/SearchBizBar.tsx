import React, { useRef, useReducer, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';

import {
  FindBizProps,
  SearchState,
  SearchAction,
} from '../interfaces/ui.post.interface';
import { searchBusinesses } from '../services/post.service';
import { IBusiness } from '../../../../common/business.interface';
import { handleAxiosError } from '../../utils/error.util';
import { showAlertToast } from '../../utils/AlertToast';

function reducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'INITIALIZE':
      return { loading: false, found: false, notFound: false, selected: false };
    case 'START_SEARCH':
      return { loading: true, found: false, notFound: false, selected: false };
    case 'FOUND':
      return { loading: false, found: true, notFound: false, selected: false };
    case 'NOT_FOUND':
      return { loading: false, found: false, notFound: true, selected: false };
    case 'SELECTED':
      return { loading: false, found: false, notFound: false, selected: true };
    default:
      return state;
  }
}

const SearchBizBar: React.FC<FindBizProps> = ({
  selectedBiz,
  setSelectedBiz,
  onContinue,
}) => {
  const [searchState, searchStateDispatch] = useReducer(reducer, {
    loading: false,
    found: false,
    notFound: false,
    selected: false,
  });
  const [results, setResults] = useState<IBusiness[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    try {
      const query = inputRef.current?.value || '';

      searchStateDispatch({ type: 'START_SEARCH' });
      
      const found = await searchBusinesses(query);
      if (found.length > 0) {
        setResults(found);
        searchStateDispatch({ type: 'FOUND' });
      } else {
        setResults([]);
        searchStateDispatch({ type: 'NOT_FOUND' });
      }
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
      {/* search bar */}
      <div className="input-group w-75 mb-2">
        <input
          type="text"
          ref={inputRef}
          onKeyDown={handleKeyDown}
          className="form-control form-control-sm"
          placeholder="Search for a business to review..."
        />
        <button
          className={`btn ${searchState.loading ? 'btn-secondary disabled' : 'btn-primary'}`}
          onClick={handleSearch}
          disabled={searchState.loading}
        >
          <FaSearch />
        </button>
      </div>

      {/* loading stage */}
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

      {/* found stage */}
      {searchState.found && (
        <div
          className="list-group w-75 mx-auto mb-4"
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #ccc',
          }}
        >
          {results.map((biz) => (
            <button
              key={biz._id}
              className={`list-group-item list-group-item-action`}
              onClick={() => {
                setSelectedBiz(biz);
                searchStateDispatch({ type: 'SELECTED' });
              }}
            >
              {biz.name}
            </button>
          ))}
        </div>
      )}

      {/* not found stage */}
      {searchState.notFound && (
        <div className="text-muted mt-2">
          No businesses found? Click{' '}
          <a href="/business/pages/creation" className="text-primary">
            here
          </a>{' '}
          to create your own business now!
        </div>
      )}

      {/* selected stage */}
      {searchState.selected && (
        <div className="d-flex flex-column align-items-center gap-2">
          <span className="text-success">
            Selected Business: {selectedBiz?.name}
          </span>
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-outline-primary"
              onClick={() => {
                setSelectedBiz(null);
                searchStateDispatch({ type: 'INITIALIZE' });
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={onContinue}>
              Continue to Edit Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBizBar;
