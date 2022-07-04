import { easeBackOut, easeCircleOut } from 'd3-ease';
import { select, selectAll, type Selection } from 'd3-selection';
import 'd3-selection-multi';
import { BehaviorSubject, combineLatest, combineLatestWith, debounceTime, distinctUntilChanged, EMPTY, endWith, exhaustMap, filter, fromEvent, map, merge, ReplaySubject, Subject, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs';

import { Angle, Point } from 'geometries/module';
import { angle, identify, isVertex, Mark, ShapesCompiler, ShapeType, side, type IDVertex, type Shape, type ShapeVertex } from 'shapes/module';
import { ShapeSide, vertex, type ShapeAngle } from 'shapes/shape.class';
import { pairs, triads } from 'utils/arrays';
import { equals } from 'utils/compare';
import { isNil, isNotNil, type Maybe } from 'utils/maybe';
import { onResize } from 'utils/on-resize';
import { RxElement } from 'utils/rx-element.class';
import { defineClip, definePath } from 'utils/svg-defs';
import { aggregate, type Tuple } from 'utils/utils';

import { attemptSnapping, selectClosest } from './proximity';
import { remarkableShapes } from './remarkable-shapes';
import template from './virtual-chalkboard.html';

class VirtualChalkboard extends RxElement {

  private svg!: SVGSVGElement;
  private Ω!: Selection<SVGGElement, unknown, null, unknown>;
  private bg!: Selection<SVGGElement, unknown, null, unknown>;
  private fg!: Selection<SVGGElement, unknown, null, unknown>;
  private measurer!: SVGTextElement;
  private readonly vertices$: Subject<Tuple<ShapeVertex, 3>> = new ReplaySubject(1);
  private readonly points$: BehaviorSubject<Record<IDVertex, Point> & { flexible: IDVertex }>;

  constructor() {
    super();
    this.points$ = new BehaviorSubject<Record<IDVertex, Point> & { flexible: IDVertex }>({
      A: new Point(-.5, 0),
      B: new Point(.5, 0),
      C: new Point(.5, .5),
      flexible: 'C',
    });
    // this.points$ = new BehaviorSubject<Record<IDVertex, Point> & { flexible: IDVertex }>({
    //   A: new Point(Math.random() * 2 - 1, Math.random() * 2 - 1),
    //   B: new Point(Math.random() * 2 - 1, Math.random() * 2 - 1),
    //   C: new Point(Math.random() * 2 - 1, Math.random() * 2 - 1),
    //   flexible: 'C',
    // });
  }

  public connectedCallback(): void {
    if (!this.isConnected) { // See https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
      return;
    }

    this.innerHTML = template;
    this.style.display = 'grid';
    this.style.placeItems = 'stretch';

    this.svg = this.querySelector('svg') as SVGSVGElement; // can't be `null` there, innerHTML was attached and compiled
    this.Ω = select(this.svg).select('g.origin');
    this.bg = this.Ω.select('g.background');
    this.fg = this.Ω.select('g.foreground');

    this.measurer = this.svg.querySelector('defs text#measurer') as SVGTextElement;

    const shapes$: Subject<Shape[]> = new ReplaySubject(1);
    const mouse$: Subject<Point> = new Subject();
    const compiler$: Subject<ShapesCompiler> = new ReplaySubject(1);

    const hovered$ = new Subject<Maybe<Shape>>();
    const dragging$ = new BehaviorSubject<boolean>(false);

    const classification = this.fg.select<SVGTextElement>('text#classification');
    classification.text('Scalene triangle');
    classification.attrs({ x: 0, y: 250 });

    combineLatest([this.points$, compiler$]).pipe(
      map(([{ flexible, ...points }, { distanceThreshold }]) => {
        const { [flexible]: flexibleVertex, ...fixed } = points;
        const { snappedTo, at } = attemptSnapping(flexibleVertex, Object.values(fixed) as Tuple<Point, 2>, distanceThreshold);
        return { ...points, [flexible]: at, snappedTo };
      }),
      tap(({ snappedTo }) => classification.text(snappedTo?.name ?? 'Scalene triangle')),
      map(({ A, B, C }) => [
        vertex(A, { name: 'Vertex A', id: 'A' }),
        vertex(B, { name: 'Vertex B', id: 'B' }),
        vertex(C, { name: 'Vertex C', id: 'C' }),
      ] as Tuple<ShapeVertex, 3>),
    ).subscribe(this.vertices$);

    const highlight = {
      text: this.fg.select<SVGTextElement>('text#hovered'),
      path: definePath().in(this.svg),
      clip: defineClip().in(this.svg),
      background: this.fg.select<SVGPathElement>('path#hovered-background'),
    };
    highlight.text.attr('clip-path', `url(${highlight.clip.href})`);
    highlight.text.append('textPath').attrs({ startOffset: '50%', href: highlight.path.href });

    onResize(this).pipe(
      debounceTime(100),
      tap(({ height }) => classification.transition().attrs({ x: 0, y: (height / 2 - 10) })),
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
      map(vertices => ({ vertices, sides: pairs(vertices).map(([A, B]) => side(A, B)) as Tuple<ShapeSide, 3> })),
      map(({ vertices, sides }) => remarkableShapes(
        vertices,
        sides,
        triads(vertices).map(([A, B, C]) => angle(new Angle(A.geometry, B.geometry, C.geometry), {
          name: `Angle ${A.id}${B.id}${C.id}`,
          id: `angle ${A.id}${B.id}${C.id}`,
          parents: sides.filter(({ geometry: { from, to } }) => [from, to].includes(B.geometry)),
        })) as Tuple<ShapeAngle, 3>,
      )),
      takeUntil(super.disconnected),
    ).subscribe(shapes$);

    dragging$.pipe(
      switchMap(dragging => (dragging ? EMPTY : mouse$)),
      withLatestFrom(shapes$, compiler$),
      map(([mouse, shapes, { distanceThreshold }]) => selectClosest(shapes, mouse, distanceThreshold)?.shape),
      distinctUntilChanged(),
      takeUntil(super.disconnected),
    ).subscribe(hovered$);

    merge(fromEvent(this.svg, 'mousedown'), fromEvent(this.svg, 'touchstart', { passive: true })).pipe(
      tap(e => e.preventDefault()),
      withLatestFrom(hovered$),
      map(([, hovered]) => hovered),
      filter(isVertex),
      withLatestFrom(this.vertices$),
      exhaustMap(([{ id }, [{ geometry: A }, { geometry: B }, { geometry: C }]]) => mouse$.pipe(
        map(at => this.points$.next({ A, B, C, [id]: at, flexible: id })),
        map(() => true),
        takeUntil(merge(fromEvent(this.svg, 'mouseup'), fromEvent(this.svg, 'touchend'))),
        endWith(false),
      )),
      distinctUntilChanged(),
      takeUntil(super.disconnected),
    ).subscribe(dragging$);

    shapes$.pipe(
      withLatestFrom(compiler$),
      takeUntil(super.disconnected),
    ).subscribe(([shapes, compiler]) => this.redraw(shapes, compiler));

    compiler$.pipe(
      withLatestFrom(shapes$),
      takeUntil(super.disconnected),
    ).subscribe(([compiler, shapes]) => this.redraw(shapes, compiler, true));

    hovered$.pipe(
      withLatestFrom(hovered$.pipe(filter(isNotNil))),
      combineLatestWith(dragging$),
      map(([[hovered, lastHovered], dragging]) => ({ hovered: hovered ?? lastHovered, leaving: isNil(hovered) || dragging })),
    ).pipe(
      combineLatestWith(mouse$, compiler$),
      map(([{ hovered, leaving }, mouse, compiler]) => {
        this.bg.selectAll('path').classed('hovered', false).classed('parent', false);
        const { clip, d, dy, ...attrs } = compiler.getTextPathAttrs(hovered, mouse, this.measure(hovered.name, highlight.text.node()!.computedStyleMap()));

        if (leaving || !hovered) {
          this.bg.select('g.marks').selectAll('use').data([]).join(enter => enter, update => update);
        } else {
          highlight.text.attrs({ ...attrs }).select('textPath').text(hovered.name);
          highlight.path.elem.attr('d', d);
          highlight.clip.elem.select('path').attr('d', clip);
          highlight.background.attr('d', clip);
          selectAll(hovered.parents.map(({ name }) => this.svg.querySelector(`path[name='${name}']`))).raise().classed('parent', true);
          select(this.svg.querySelector(`path[name='${hovered.name}']`)).raise().classed('hovered', true);
          this.bg.select('g.marks').selectAll<SVGUseElement, Mark>('use').data(hovered.marks).join(
            enter => enter.append('use').attrs(mark => compiler.getMarkAttrs(mark)),
            update => update.attrs(mark => compiler.getMarkAttrs(mark)),
          );
        }

        const { fontSize } = this.measure(hovered.name, (highlight.text.node() as SVGTextElement).computedStyleMap());
        return { text: hovered.name, from: fontSize * Math.sign(-dy), to: dy, leaving };
      }),
      distinctUntilChanged((prev, cur) => (prev.leaving ? cur.leaving : equals(prev, cur))), // if leaving, ignore other changes
    ).subscribe(({ text: { length }, from, to, leaving }) => {
      const [D, d] = [750, 300]; // [full animation duration, individual glyph animation duration]
      const stagger = (D - d) / (length - 1);
      highlight.background.transition().duration(D).ease(easeCircleOut).styleTween('opacity', () => t => String(leaving ? 1 - t : t));
      highlight.text.transition().duration(D).ease(easeCircleOut).attrTween('dy', () => T => Array.from({ length })
        // offset, scale, clamp and ease time reference for animation of each glyph
        .map((_, i) => T - i * (stagger / D))
        .map(t => t * (D / d))
        .map(t => Math.max(0, Math.min(1, t)))
        .map(easeBackOut)

        .map(t => (leaving ? to + t * (from - to) : from + t * (to - from)))

        // transform absolute positions into sequential relative offsets
        .reduce<number[]>((offsets, abs, i, arr) => [...offsets, abs - (arr[i - 1] ?? 0)], [])
        .join(' '));
    });
  }

  private redraw(shapes: Shape[], compiler: ShapesCompiler, smooth = false): void {
    const typed = aggregate(shapes, ({ type }) => ([ShapeType.POINT, ShapeType.SIDE, ShapeType.VERTEX].includes(type) ? type : 'other'));
    this.bg.select('g.shapes').selectAll<SVGPathElement, Shape>('path')
      .data(typed.other, identify).join(
        enter => enter.append('path').attrs(s => compiler.getPathAttrs(s)),
        update => update.call(u => (smooth ? u.transition() : u).attrs(s => compiler.getPathAttrs(s))),
      );

    this.bg.select('g.sides').selectAll<SVGPathElement, Shape>('path')
      .data(typed.side, identify).join(
        enter => enter.append('path').attrs(s => compiler.getPathAttrs(s)),
        update => update.call(u => (smooth ? u.transition() : u).attrs(s => compiler.getPathAttrs(s))),
      );

    this.bg.select('g.points').selectAll<SVGPathElement, Shape>('path')
      // there are no `POINT` shapes when the triangle is **straight**
      .data([...typed.point ?? [], ...typed.vertex], identify).join(
        enter => enter.append('path').attrs(s => compiler.getPathAttrs(s)),
        update => update.call(u => (smooth ? u.transition() : u).attrs(s => compiler.getPathAttrs(s))),
      );
  }

  private measure(text: string, styles: StylePropertyMapReadOnly): { textLength: number, fontSize: number } {
    select(this.measurer)
      .style('font-size', String(styles.get('font-size') ?? ''))
      .style('letter-spacing', String(styles.get('letter-spacing') ?? ''))
      .text(text);

    return {
      textLength: this.measurer.getComputedTextLength(),
      fontSize: (styles.get('font-size') as CSSUnitValue).value + 1, // be generous with the font size
    };
  }

}

customElements.define('virtual-chalkboard', VirtualChalkboard);
