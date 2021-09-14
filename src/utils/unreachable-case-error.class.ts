export default class UnreachableCaseError<T extends never> extends Error {

  constructor(t: T) { // eslint-disable-line @typescript-eslint/no-unused-vars
    super(`Uncheable code... 🤔`);
  }

}
