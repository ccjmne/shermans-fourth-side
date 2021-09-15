import { select, Selection } from 'd3-selection';
import 'd3-selection-multi';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, EMPTY, endWith, exhaustMap, filter, fromEvent, map, mapTo, merge, Observable, ReplaySubject, startWith, Subject, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs';

import { Angle, Circle, Line, Point, Segment } from '../geometries/module';
import Shapes, { ShapesCompiler, ShapeType, ShapeVertex } from '../shapes/module';
import { minBy, pairs, triads } from '../utils/arrays';
import { Maybe } from '../utils/maybe';
import RxElement from '../utils/rx-element.class';
import { definePath } from '../utils/svg-defs';

class VirtualChalkboard extends RxElement {

  private svg!: SVGSVGElement;
  private Ω!: Selection<SVGGElement, unknown, HTMLElement, unknown>;
  private vertices$: BehaviorSubject<ShapeVertex[]>;

  constructor() {
    super();
    this.vertices$ = new BehaviorSubject([
      Shapes.vertex(new Point(0, 0), 'A'),
      Shapes.vertex(new Point(.5, 0), 'B'),
      Shapes.vertex(new Point(.5, .5), 'C'),
    ]);
    // this.vertices$ = new BehaviorSubject(Array.from({ length: 3 },
    //   () => new Point(Math.random() * 2 - 1, Math.random() * 2 - 1)).map((d, i) => Shapes.vertex(d, 'ABC'[i])));
  }

  public connectedCallback(): void {
    if (!this.isConnected) { // See https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
      return;
    }

    this.innerHTML = require('./virtual-chalkboard.html');
    this.style.display = 'grid';
    this.style.placeItems = 'stretch';

    this.svg = this.querySelector('svg') as SVGSVGElement; // can't be `null` there, innerHTML was attached and compiled
    this.Ω = select('g.origin');

    const shapes$: Subject<ShapeType[]> = new ReplaySubject(1);
    const mouse$: Subject<Point> = new Subject();
    const compiler$: Subject<ShapesCompiler> = new Subject();

    const hovered$ = new Subject<Maybe<ShapeType>>();
    const dragging$ = new BehaviorSubject<boolean>(false);

    const highlight = { text: this.Ω.select('text#hovered'), textPath: definePath().in(this.svg) };
    highlight.text.append('textPath').attrs({ startOffset: '50%', href: highlight.textPath.href });

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
      debounceTime(100),
      map(rect => new ShapesCompiler(rect)),
      tap(({ Ω: { x, y } }) => this.Ω.transition().attr('transform', `translate(${x},${y})`)),
      takeUntil(super.disconnected),
    ).subscribe(compiler$);

    merge(fromEvent<MouseEvent>(this.svg, 'mousemove'), fromEvent<MouseEvent>(this.svg, 'touchmove', { passive: true })).pipe(
      withLatestFrom(compiler$),
      map(([mouse, compiler]) => compiler.toLocalCoords(mouse)),
      takeUntil(super.disconnected),
    ).subscribe(mouse$);

    this.vertices$.pipe(
      map(vertices => {
        const sides = pairs(vertices).map(([A, B]) => Shapes.side(new Segment(A.geometry, B.geometry), `${A.name}${B.name}`));
        const sideLines = sides.map(s => Shapes.line(new Line(s.geometry.vector, s.geometry.from), `${s.name} (extended)`));
        const lateralBisectors = sides.map(({ geometry, name }) => Shapes.line(geometry.bisector(), `bisector of ${name}`));
        const angularBisectors = triads(vertices).map(([A, B, C]) => Shapes.line(new Angle(A.geometry, B.geometry, C.geometry).bisector(), `bisector of angle ${A.name}${B.name}${C.name}`));
        const [[{ geometry: A }], [{ geometry: AB }], [{ geometry: l1 }, { geometry: l2 }], [{ geometry: l3 }, { geometry: l4 }]] = [vertices, sides, lateralBisectors, angularBisectors];
        const [circumcenter, incenter] = [l1.intersectWith(l2) as Point, l3.intersectWith(l4) as Point]; // these intersections can't be `null`, by geometric definition
        const circumcircle = Shapes.circle(new Circle(circumcenter, circumcenter.distanceFrom(A)), 'circumcircle of ABC');
        const incircle = Shapes.circle(new Circle(incenter, incenter.distanceFrom(incenter.projectOnto(AB))), 'incircle of ABC');

        return [...sideLines, ...lateralBisectors, ...angularBisectors, circumcircle, incircle, ...sides, ...vertices];
      }),
      takeUntil(super.disconnected),
    ).subscribe(shapes$);

    dragging$.pipe(
      switchMap(dragging => (dragging ? EMPTY : mouse$)),
      withLatestFrom(shapes$, compiler$),
      map(([mouse, shapes, { distanceThreshold }]) => minBy(
        shapes.map(shape => ({ shape, closest: shape.geometry.closestPointTo(mouse) }))
          .filter(({ closest }) => closest.distance < distanceThreshold),
        ({ shape, closest: { distance } }) => Shapes.priority(shape) + distance,
      )?.shape),
      distinctUntilChanged(),
      takeUntil(super.disconnected),
    ).subscribe(hovered$);

    merge(fromEvent(this.svg, 'mousedown'), fromEvent(this.svg, 'touchstart', { passive: true })).pipe(
      tap(e => e.preventDefault()),
      withLatestFrom(hovered$),
      map(([, hovered]) => hovered),
      filter(Shapes.isVertex),
      exhaustMap(vertex => mouse$.pipe(
        tap(at => this.reposition(vertex, at)),
        mapTo(true),
        takeUntil(merge(fromEvent(this.svg, 'mouseup'), fromEvent(this.svg, 'touchend'))),
        endWith(false),
      )),
      distinctUntilChanged(),
      takeUntil(super.disconnected),
    ).subscribe(dragging$);

    combineLatest([this.vertices$, shapes$]).pipe(
      withLatestFrom(compiler$),
      takeUntil(super.disconnected),
    ).subscribe(([[vertices, shapes], compiler]) => this.redraw(vertices, shapes, compiler));

    compiler$.pipe(
      withLatestFrom(combineLatest([this.vertices$, shapes$])),
      takeUntil(super.disconnected),
    ).subscribe(([compiler, [vertices, shapes]]) => this.redraw(vertices, shapes, compiler, true));

    combineLatest([hovered$, mouse$, compiler$]).pipe(
      takeUntil(super.disconnected),
    ).subscribe(([shape, mouse, compiler]) => {
      this.Ω.selectAll('path').classed('hovered', false);
      if (shape) {
        highlight.text.select('textPath').text(shape.name);
        highlight.text.attrs(compiler.getTextPathAttrs(shape, mouse));
        highlight.textPath.elem.attrs(compiler.getTextPathAttrs(shape, mouse));
        select(this.svg.querySelector(`path[name='${shape.name}']`)).raise().classed('hovered', true);
      } else {
        highlight.text.select('textPath').text('');
      }
    });
  }

  private reposition(hovered: ShapeVertex, at: Point): void {
    this.vertices$.next(this.vertices$.getValue().map(v => (v.name === hovered.name ? hovered.reshape(at) : v)));
  }

  private redraw(vertices: ShapeType[], shapes: ShapeType[], gen: ShapesCompiler, smooth = false): void {
    this.Ω.select('g.shapes').selectAll<SVGPathElement, ShapeType>('path').data(shapes.filter(shape => !Shapes.isVertex(shape)), Shapes.identify).join(
      enter => enter.append('path').attrs(s => gen.getPathAttrs(s)),
      update => update.call(u => (smooth ? u.transition() : u).attrs(s => gen.getPathAttrs(s))),
    );

    this.Ω.select('g.vertices').selectAll<SVGPathElement, ShapeType>('path').data(vertices, Shapes.identify).join(
      enter => enter.append('path').attrs(s => gen.getPathAttrs(s)),
      update => update.call(u => (smooth ? u.transition() : u).attrs(s => gen.getPathAttrs(s))),
    );
  }

}

customElements.define('virtual-chalkboard', VirtualChalkboard);
