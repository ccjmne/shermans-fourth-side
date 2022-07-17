import { Observable, Subject } from 'rxjs';

const unsubscribe = Symbol('unsubscribe');

export abstract class RxElement extends HTMLElement {

  public readonly shadowRoot: ShadowRoot;

  private [unsubscribe] = new Subject<true>();

  constructor() {
    super();
    this.shadowRoot = this.attachShadow({ mode: 'closed' });
  }

  public get disconnected(): Observable<true> {
    return this[unsubscribe].asObservable();
  }

  public disconnectedCallback(): void {
    this[unsubscribe].next(true);
    this[unsubscribe].complete();
  }

}
