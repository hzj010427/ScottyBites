import ISearchStrategy from '../searchStrategies/ISearchStrategy';

export default class SearchDispatcher<T> {
    private searchStrategy?: ISearchStrategy<T>;

    public constructor() {
    }

    public async search(query: string): Promise<T[]> {
        if (!this.searchStrategy) {
            throw new Error('Search strategy not set');
        }
        return await this.searchStrategy.searchInfo(query);
    }

    public setSearchStrategy(searchStrategy: ISearchStrategy<T>): void {
        this.searchStrategy = searchStrategy;
    }
}

export { SearchDispatcher };
