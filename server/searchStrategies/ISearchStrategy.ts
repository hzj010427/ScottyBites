abstract class ISearchStrategy<T> {

  // each controller must define this method to set up its endpoints
  public abstract searchInfo(query: string): Promise<T[]>;
}

export default ISearchStrategy;