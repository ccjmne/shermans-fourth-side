import { Observable, Subject } from 'rxjs';

const unsubscribe = Symbol('unsubscribe');

export default abstract class RxElement extends HTMLElement {
  private [unsubscribe] = new Subject<true>();

  public get disconnected() : Observable<true> {
    return this[unsubscribe].asObservable();
  }

  public disconnectedCallback(): void {
    this[unsubscribe].next(true);
    this[unsubscribe].complete();
  }
}
