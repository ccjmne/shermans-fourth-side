import { drag } from 'd3-drag';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import { local, select, Selection } from 'd3-selection';
import 'd3-selection-multi';
import { arc, line } from 'd3-shape';
import { BehaviorSubject, debounceTime, map, Observable, of, ReplaySubject, startWith, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs';
import { Angle, Circle, Line, pairs, Point, Segment, triads } from '../utils/geometry';
import RxElement from '../utils/rx-element.class';

type Scales = {
  λx: ScaleLinear<number, number, number>,
  λy: ScaleLinear<number, number, number>,
  Δ: ScaleLinear<number, number, number>,
  diagonal: number,
  origin: Point,
};

function paired<T>(items: T[]): Array<[T, T]> {
  const pairings = [...items.slice(1), items[0]];
  return items.map((item, i) => [item, pairings[i]]);
}

const idx = local<number>();

class VirtualChalkboard extends RxElement {
  private vertices$: BehaviorSubject<Point[]>;

  private scales$: ReplaySubject<Scales> = new ReplaySubject(1);

  private origin: Selection<SVGGElement, Point, null, undefined>;

  constructor() {
    super();
    this.vertices$ = new BehaviorSubject([new Point(0, 0), new Point(0.5, 0), new Point(0.5, 0.5)]);
    // this.vertices$ = new BehaviorSubject(Array.from({ length: 3 }, () => new Point(Math.random() * 2 - 1, Math.random() * 2 - 1)));
  }

  public connectedCallback(): void {
    if (!this.isConnected) {
      return;
    }

    this.innerHTML = require('./virtual-chalkboard.html');
    this.style.display = 'grid';
    this.style.placeItems = 'stretch';
    this.origin = select('g.origin') as Selection<SVGGElement, Point, null, unknown>;

    (function onResize(elem: Element): Observable<DOMRect> {
      return new Observable<DOMRect>(subscriber => {
        const observer = new ResizeObserver(
          e => e.filter(({ target }) => target === elem).forEach(({ contentRect }) => subscriber.next(contentRect)),
        );

        observer.observe(elem);
        return () => observer.unobserve(elem);
      }).pipe(
        startWith(elem.getBoundingClientRect()),
      );
    }(this)).pipe(
      debounceTime(200),
      map(({ width: w, height: h }) => ({ Δ: Math.min(w, h) / 2, diagonal: Math.sqrt(w ** 2 + h ** 2), origin: new Point(w / 2, h / 2) })),
      map(({ Δ, ...rest }) => ({
        ...rest,
        λx: scaleLinear([-Δ, Δ]).domain([-1, 1]),
        λy: scaleLinear([-Δ, Δ]).domain([1, -1]),
        Δ: scaleLinear([0, Δ]),
      })),
      switchMap((d, i) => (i === 0
        // no transition the first time
        ? of(d).pipe(tap(({ origin: { x, y } }) => this.origin.attr('transform', `translate(${x} ${y})`)))
        : of(d).pipe(tap(({ origin: { x, y } }) => this.origin.transition().attr('transform', `translate(${x} ${y})`)))
      )),
      takeUntil(super.disconnected),
    ).subscribe(this.scales$);

    this.vertices$.pipe(
      withLatestFrom(this.scales$),
      takeUntil(super.disconnected),
    ).subscribe(([vertices, scale]) => this.redraw(vertices, scale));

    this.scales$.pipe(
      withLatestFrom(this.vertices$),
      takeUntil(super.disconnected),
    ).subscribe(([scale, vertices]) => this.redraw(vertices, scale, true));
  }

  private redraw(vertices: Point[], { λx, λy, Δ, diagonal }: Scales, smooth = false): void {
    const translate = ({ x, y }: Point): string => `translate(${λx(x)}, ${λy(y)})`;
    const segmentPath = line<Point>(({ x }) => λx(x), ({ y }) => λy(y));
    const circlePath = arc<Circle>().startAngle(0).endAngle(Math.PI * 2).outerRadius(({ r }) => Δ(r));
    const linePath = (l: Line): string => segmentPath(new Circle(new Point(0, 0), Δ.invert(diagonal / 2)).intersectWith(l));

    const sides = paired(vertices).map(([A, B]) => new Segment(A, B));
    const angles = triads(vertices).map(([A, B, C]) => new Angle(A, B, C));
    const [A] = vertices;
    const [AB, BC] = sides;
    const [ABC, BCA] = angles;

    (drag<SVGCircleElement, Point>()
      .on('start', (e: DragEvent, o) => idx.set(this, this.vertices$.getValue().findIndex(({ x, y }) => o.x === x && o.y === y)))
      .on('drag', ({ x: Δx, y: Δy }: DragEvent, { x, y }) => this.vertices$.next(
        this.vertices$.getValue().map((p, i) => (i === idx.get(this) ? new Point(x + λx.invert(Δx), y + λy.invert(Δy)) : p)),
      )))(this.origin.select('g.vertices').selectAll<SVGCircleElement, Point>('circle').data(vertices).join(
        enter => enter.append('circle').attrs(({ x, y }) => ({ cx: λx(x), cy: λy(y), r: 8, class: 'vertex' })),
        update => update.call(u => (smooth ? u.transition() : u).attrs(({ x, y }) => ({ cx: λx(x), cy: λy(y) }))),
      ));

    this.origin.select('g.sides').selectAll<SVGPathElement, Segment>('path').data(sides).join(
      enter => enter.append('path').attr('d', segmentPath),
      update => update.call(u => (smooth ? u.transition() : u).attr('d', segmentPath)),
    );

    this.origin.select('g.circum').selectAll<SVGPathElement, Line>('path:not(.circle)').data(sides.map(({ bisector }) => bisector)).join(
      enter => enter.append('path').attr('d', linePath),
      update => update.call(u => (smooth ? u.transition() : u).attr('d', linePath)),
    );

    this.origin.select('g.circum').selectAll<SVGPathElement, Point>('path.circle')
      .data([((O => new Circle(O, O.distanceFrom(A)))(AB.bisector.intersectWith(BC.bisector)))]).join(
        enter => enter.append('path').attrs({ class: 'circle', transform: translate, d: circlePath }),
        update => update.call(u => (smooth ? u.transition() : u).attrs({ transform: translate, d: circlePath })),
      );

    this.origin.select('g.in').selectAll<SVGPathElement, Line>('path:not(.circle)').data(angles.map(({ bisector }) => bisector)).join(
      enter => enter.append('path').attr('d', linePath),
      update => update.call(u => (smooth ? u.transition() : u).attr('d', linePath)),
    );

    this.origin.select('g.in').selectAll<SVGPathElement, Circle>('path.circle')
      .data([((O => new Circle(O, O.distanceFrom(O.projectOnto(AB.asLine()))))(ABC.bisector.intersectWith(BCA.bisector)))]).join(
        enter => enter.append('path').attrs({ class: 'circle', transform: translate, d: circlePath }),
        update => update.call(u => (smooth ? u.transition() : u).attrs({ transform: translate, d: circlePath })),
      );
  }

}

customElements.define('virtual-chalkboard', VirtualChalkboard);
