import { dropStopWords } from '../../../server/utils/searchUtils';

describe('Search Utils Tests', () => {
  test('Should drop stop words', () => {
    const text = 'this is a test with stop words like a and the because but can ';
    const result = dropStopWords(text);
    expect(result).toBe('test stop words ');
  });
});
