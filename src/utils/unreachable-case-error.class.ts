export class UnreachableCaseError<T extends never> extends Error {

  constructor(_: T) {
    super('Uncheable code... 🤔');
  }

}
