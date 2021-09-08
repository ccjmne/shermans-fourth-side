import { drag } from 'd3-drag';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import { local, select, Selection } from 'd3-selection';
import 'd3-selection-multi';
import { arc, line } from 'd3-shape';
import { BehaviorSubject, debounceTime, map, Observable, of, ReplaySubject, startWith, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs';
import { angleBisector, bisector, distance, intersection, intersections, Line, Point, projection, Segment } from '../utils/geometry';
import RxElement from '../utils/rx-element.class';

type Scales = {
  λx: ScaleLinear<number, number, number>,
  λy: ScaleLinear<number, number, number>,
  Δ: ScaleLinear<number, number, number>,
  diagonal: number,
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
    this.vertices$ = new BehaviorSubject([{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 0.5 }]);
    // this.vertices$ = new BehaviorSubject(Array.from({ length: 3 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 })));
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
      switchMap((d, i) => (i === 0
        // no transition the first time
        ? of(d).pipe(tap(({ width, height }) => this.origin.attr('transform', `translate(${width / 2} ${height / 2})`)))
        : of(d).pipe(tap(({ width, height }) => this.origin.transition().attr('transform', `translate(${width / 2} ${height / 2})`)))
      )),
      map(({ width, height }) => ({ Δ: Math.min(width, height) / 2, diagonal: Math.sqrt(width ** 2 + height ** 2) })),
      map(({ Δ, diagonal }) => ({
        λx: scaleLinear([-Δ, Δ]).domain([-1, 1]),
        λy: scaleLinear([-Δ, Δ]).domain([1, -1]),
        Δ: scaleLinear([0, Δ]),
        diagonal,
      })),
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
    const circlePath = arc<number>().startAngle(0).endAngle(Math.PI * 2).outerRadius(r => Δ(r));
    const segmentPath = line<Point>(({ x }) => λx(x), ({ y }) => λy(y));
    const linePath = (l: Line): string => segmentPath(intersections(l, { u: 0, v: 0, r: Δ.invert(diagonal / 2) }));

    const sides = paired(vertices);
    const angles = paired(sides);
    const [A] = vertices;
    const [AB, BC] = sides;
    const [ABC, BCA] = angles;

    (drag<SVGCircleElement, Point>()
      .on('start', (e: DragEvent, o) => idx.set(this, this.vertices$.getValue().findIndex(({ x, y }) => o.x === x && o.y === y)))
      .on('drag', ({ x: Δx, y: Δy }: DragEvent, { x, y }) => this.vertices$.next(
        this.vertices$.getValue().map((p, i) => (i === idx.get(this) ? { x: x + λx.invert(Δx), y: y + λy.invert(Δy) } : p)),
      )))(this.origin.select('g.vertices').selectAll<SVGCircleElement, Point>('circle').data(vertices).join(
        enter => enter.append('circle').attrs(({ x, y }) => ({ cx: λx(x), cy: λy(y), r: 8, class: 'vertex' })),
        update => update.call(u => (smooth ? u.transition() : u).attrs(({ x, y }) => ({ cx: λx(x), cy: λy(y) }))),
      ));

    this.origin.select('g.sides')
      .selectAll<SVGPathElement, Segment>('path').data(sides).join(
        enter => enter.append('path').attr('d', segmentPath),
        update => update.call(u => (smooth ? u.transition() : u).attr('d', segmentPath)),
      );

    this.origin.select('g.circum')
      .selectAll<SVGPathElement, Line>('path:not(.circle)').data(sides.map(bisector)).join(
        enter => enter.append('path').attr('d', linePath),
        update => update.call(u => (smooth ? u.transition() : u).attr('d', linePath)),
      );

    this.origin.select('g.circum')
      .selectAll<SVGPathElement, Point>('path.circle').data([intersection(bisector(AB), bisector(BC))]).join(
        enter => enter.append('path').attrs({ class: 'circle', transform: translate, d: O => circlePath(distance(A, O)) }),
        update => update.call(u => (smooth ? u.transition() : u).attrs({ transform: translate, d: O => circlePath(distance(A, O)) })),
      );

    this.origin.select('g.in')
      .selectAll<SVGPathElement, Line>('path:not(.circle)').data(angles.map(angleBisector)).join(
        enter => enter.append('path').attr('d', linePath),
        update => update.call(u => (smooth ? u.transition() : u).attr('d', linePath)),
      );

    this.origin.select('g.in')
      .selectAll<SVGPathElement, Point>('path.circle').data([intersection(angleBisector(ABC), angleBisector(BCA))]).join(
        enter => enter.append('path').attrs({ class: 'circle', transform: translate, d: O => circlePath(distance(O, projection(O, AB))) }),
        update => update.call(
          u => (smooth ? u.transition() : u).attrs({ transform: translate, d: O => circlePath(distance(O, projection(O, AB))) }),
        ),
      );
  }
}

customElements.define('virtual-chalkboard', VirtualChalkboard);
