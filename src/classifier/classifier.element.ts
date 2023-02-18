import { type Transition } from 'd3';
import { easeBackOut, easeCircleOut } from 'd3-ease';
import { interpolateNumber, interpolateObject } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';
import { local, select, type BaseType, type Selection } from 'd3-selection';

import { Angle } from 'geometries/angle.class';
import { Point } from 'geometries/point.class';
import { Segment } from 'geometries/segment.class';
import { Vector } from 'geometries/vector.class';
import { pairs } from 'utils/arrays';
import { forSure, isNil, type Has } from 'utils/maybe';
import { RxElement } from 'utils/rx-element.class';
import { extentBy, mapTuple, merge, zip, type Tuple } from 'utils/utils';
import { type Classification } from 'virtual-chalkboard/proximity';

import style from './classifier.styling.lazy.scss';
import template from './classifier.template.html';

type ObservedAttribute = keyof Classification;
type ArcAttrs = { angle: number, orient: number, radius: number, rightangle: number, progress: number };

const TICKS = local<number>();
const ANGLE_ATTRS = local<ArcAttrs>();

const HEIGHT = 150;
const TRIANGLE_HEIGHT_PX = 60;
const λ = scaleLinear([0, 1], [0, TRIANGLE_HEIGHT_PX]);
const λy = scaleLinear([0, 1], [0, -TRIANGLE_HEIGHT_PX]);

function transition<A extends BaseType, B, C extends BaseType, D>(s: Selection<A, B, C, D>): Transition<A, B, C, D> {
  return s.transition().duration(200).ease(easeCircleOut);
}

/**
 * @param n Discrete, between `0` and any natural number
 */
function ticksPath(n: number): string {
  const [GAP, LEN] = [4, 10];
  return `M${Math.max(0, (n - 1) / 2) * -GAP},${-LEN / 2} ${Array.from(
    { length: Math.ceil(n) },
    (_, i) => `v${+(i < Math.floor(n) || n % 1 || 1) * LEN} m${GAP},${-LEN}`,
  ).join('')}`;
}

function anglePath({ angle, orient, radius, rightangle, progress }: ArcAttrs): string {
  const from = Vector.fromAngle(orient).resize(radius);
  const to = from.rotate(angle * progress);
  // Push away the midway point iff shaping a right-angle mark
  const through = from.rotate(angle * Math.min(progress, .5)).resize(radius * (1 + rightangle * (Math.SQRT2 - 1)));
  // Straighten the 'arc' when drawing a right-angle mark by increasing the ellipsis radius
  const ellipsis = radius + 120 * rightangle ** 2;

  return `M${from.Δx},${-from.Δy}
    A${ellipsis} ${ellipsis} , 0 , 0 0 , ${through.Δx} ${-through.Δy}
    ${progress <= .5 ? '' : `
    A${ellipsis} ${ellipsis} , 0 , 0 0 , ${to.Δx}      ${-to.Δy}`}`;
}

function vertexPath(progress: number): string {
  const s = 5 * progress;
  return `M${-s},${-s} L${s},${s} M${s},${-s} L${-s},${s}`;
}

function animateDy({ length }: string, from: number, to: number): (T: number) => string {
  const d = .4; // individual glyph animation duration OVER full animation duration
  const stagger = (1 - d) / (length - 1);

  return T => Array.from({ length })
    // offset, scale, clamp and ease time reference for animation of each glyph
    .map((_, i) => T - i * stagger)
    .map(t => t / d)
    .map(t => Math.max(0, Math.min(1, t)))
    .map(easeBackOut)

    .map(t => from + t * (to - from))

    // transform absolute positions into sequential relative offsets
    .reduce<number[]>((offsets, abs, i, arr) => [...offsets, abs - (arr[i - 1] ?? 0)], [])
    .join(' ');
}

function triangle([{ x: xA, y: yA }, { x: xB, y: yB }, { x: xC, y: yC }]: [Point, Point, Point]): string {
  return `M${λ(xA)},${λy(yA)} L${λ(xB)},${λy(yB)} L${λ(xC)},${λy(yC)} z`;
}

function computeVertices(cls: Classification[keyof Classification]): Tuple<Point, 3> {
  const [B, EQUI_B] = [1.5, 2 / Math.sqrt(3)];
  return {
    Degenerate: [[0, 0], [B / 2, 0], [B, 0]],
    Scalene: [[0, 0], [.3, 1], [B, 0]],
    Isosceles: [[0, 0], [B / 2, 1], [B, 0]],
    Equilateral: [[0, 0], [EQUI_B / 2, 1], [EQUI_B, 0]],
    Acute: [[0, 0], [B - .3, 1], [B, 0]],
    Right: [[0, 0], [B, 1], [B, 0]],
    Obtuse: [[0, 0], [B + .3, 1], [B, 0]],
    Equiangular: [[0, 0], [EQUI_B / 2, 1], [EQUI_B, 0]],
  }[cls].map(([x, y]) => new Point(x, y)) as Tuple<Point, 3>;
}

export class Classifier extends RxElement {

  private svg?: SVGSVGElement;
  private g?: Selection<SVGGElement, Classification, null, undefined>;

  public static get observedAttributes(): ObservedAttribute[] {
    return ['lateral', 'angular'];
  }

  constructor() {
    super();
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    style.use({ target: this.shadowRoot });
  }

  public connectedCallback(): void {
    this.svg = forSure(this.shadowRoot.querySelector('svg'));
    this.style.height = `${HEIGHT}px`;
    this.svg.setAttribute('viewBox', `-1000 -${HEIGHT} 2000 ${HEIGHT}`);
    this.g = select(forSure(this.svg.querySelector('g')));
  }

  public attributeChangedCallback(name: ObservedAttribute, prev: string, cur: Classification[typeof name]): void {
    if (this.initialised() && cur !== prev) {
      const vertices = computeVertices(cur);
      const [[xlo, xhi], [ylo, yhi]] = [extentBy(mapTuple(vertices, ({ x }) => x)), extentBy(mapTuple(vertices, ({ y }) => y))];
      transition(this.g.select<SVGGElement>(`g#${name} g.triangle`))
        .attr('transform', `translate(${-λ((xlo + xhi) / 2)}, ${-35 - TRIANGLE_HEIGHT_PX / 2 - λy((ylo + yhi) / 2)})`);
      transition(this.g.select<SVGGElement>(`g#${name}`).select('text').text(cur))
        .styleTween('opacity', () => String).duration(400).attrTween('dy', () => animateDy(cur, 20, 0));

      transition(
        this.g.datum({ angular: this.getAttribute('angular'), lateral: this.getAttribute('lateral') } as Classification)
          .select<SVGGElement>(`g#${name}`)
          .select<SVGPathElement>('path'),
      ).attr('d', triangle(vertices));

      if (name === 'lateral') {
        // TODO: create issue in ms/TypeScript that requests reevaluation of a type's dependants when it is narrowed
        this.updateLateralTicks(vertices, cur as Classification[typeof name]);
      } else {
        this.updateAngularArcs(vertices, cur as Classification[typeof name]);
      }
    }
  }

  private updateLateralTicks(vertices: [Point, Point, Point], type: Classification['lateral']): void {
    this.assertInitialised();

    this.g.select<SVGGElement>('g#lateral').select('g.ticks').selectAll<SVGPathElement, null>('path')
      .data(merge(
        pairs(vertices)
          .map(([from, to]) => new Segment(from, to))
          .map(({ midpoint: at, vector: { angle } }) => ({ at, angle: angle % Math.PI })), // pseudo-LTR AND preserves rotation
        ({ Degenerate: [0, 0, 0], Scalene: [1, 2, 3], Isosceles: [1, 1, 0], Equilateral: [1, 1, 1] }[type]).map(ticks => ({ ticks })),
      ))
      .join(
        enter => Classifier.transitionTicks(enter.append('path')),
        update => Classifier.transitionTicks(update),
      );

    this.g.select<SVGGElement>('g#lateral').select('g.vertices').selectAll<SVGPathElement, null>('path')
      .data(zip(vertices, type === 'Degenerate' ? [1, 1, 1] : [0, 0, 0]).map(([at, open]) => ({ at, open })))
      .join(
        enter => Classifier.transitionVertices(enter.append('path')),
        update => Classifier.transitionVertices(update),
      );
  }

  private updateAngularArcs(vertices: [Point, Point, Point], type: Classification['angular']): void {
    this.assertInitialised();

    const angles = pairs(
      pairs(vertices).map(([from, to]) => new Segment(from, to)),
    ).map(([{ from: A, to: B }, { to: C }]) => new Angle(A, B, C));

    const data = merge(
      zip(vertices, [...angles.slice(-1), ...angles.slice(0, -1)]).map(([at, angle]) => ({ at, angle })),
      ({ Degenerate: [0, 0, 0], Acute: [1, 1, 1], Right: [0, 0, 1], Obtuse: [0, 0, 1], Equiangular: [1, 1, 1] }[type]).map(open => ({ open })),
    );

    this.g.select<SVGGElement>('g#angular').select('g.arcs-values').selectAll<SVGTextElement, null>('text')
      .data(data)
      .join(
        enter => Classifier.transitionValues(enter.append('text'), type),
        update => Classifier.transitionValues(update, type),
      );

    this.g.select<SVGGElement>('g#angular').select('g.arcs').selectAll<SVGPathElement, null>('path')
      .data(data)
      .join(
        enter => Classifier.transitionArcs(enter.append('path')),
        update => Classifier.transitionArcs(update),
      );

    this.g.select<SVGGElement>('g#angular').select('g.vertices').selectAll<SVGPathElement, null>('path')
      .data(zip(vertices, type === 'Degenerate' ? [1, 1, 1] : [0, 0, 0]).map(([at, open]) => ({ at, open })))
      .join(
        enter => Classifier.transitionVertices(enter.append('path')),
        update => Classifier.transitionVertices(update),
      );
  }

  private static transitionTicks(
    selection: Selection<SVGPathElement, { at: Point, angle: number, ticks: number }, BaseType, unknown>,
  ): Transition<SVGPathElement, { at: Point, angle: number, ticks: number }, BaseType, unknown> {
    return transition(selection)
      .attr('transform', ({ at: { x, y }, angle }) => `translate(${λ(x)},${λy(y)}) rotate(${angle * (-180 / Math.PI)})`)
      .attrTween('d', function interpolate(this: SVGPathElement, { ticks }) {
        const i = interpolateNumber(TICKS.get(this) ?? 0, ticks);
        return t => ticksPath(TICKS.set(this, i(t)));
      });
  }

  private static transitionArcs(
    selection: Selection<SVGPathElement, { at: Point, angle: Angle, open: number }, BaseType, unknown>,
  ): Transition<SVGPathElement, { at: Point, angle: Angle, open: number }, BaseType, unknown> {
    return transition(selection)
      .attr('transform', ({ at: { x, y } }) => `translate(${λ(x)},${λy(y)})`)
      .attrTween('d', function interpolate(this: SVGPathElement, { angle: { angle: θ, BA }, angle, open }) {
        const r = Math.sqrt(200 * (2 / θ)); // 200 is a constant **area** (in px^2) that the angle should cover
        const s = ANGLE_ATTRS.get(this);
        const i = interpolateObject(
          { ...s, radius: (s?.radius ?? 0) || r },
          { angle: θ, orient: BA.angle, radius: open ? r : (s?.radius ?? 0), rightangle: +angle.isNearlyRight(), progress: open },
        );

        return t => anglePath(ANGLE_ATTRS.set(this, i(t)));
      });
  }

  private static transitionVertices(
    selection: Selection<SVGPathElement, { at: Point, open: number }, BaseType, unknown>,
  ): Transition<SVGPathElement, { at: Point, open: number }, BaseType, unknown> {
    return transition(selection)
      .attr('transform', ({ at: { x, y } }) => `translate(${λ(x)},${λy(y)})`)
      .attr('d', ({ open }) => vertexPath(open));
  }

  private static transitionValues(
    selection: Selection<SVGTextElement, { at: Point, angle: Angle, open: number }, BaseType, unknown>,
    type: Classification['angular'],
  ): Transition<SVGTextElement, { at: Point, angle: Angle, open: number }, BaseType, unknown> {
    return transition(selection)
      .attr('transform', ({ at: { x, y } }) => `translate(${λ(x)},${λy(y)})`)
      .style('opacity', ({ open }) => open)
      .text(({ angle }) => {
        if (angle.isNearlyRight()) {
          return '90°';
        }

        if (angle.isObtuse()) {
          return '>90°';
        }

        return type === 'Equiangular' ? '60°' : '<90°';
      });
  }

  // @ts-expect-error 'svg' and 'g' aren't `keyof Classifier` because they're private properties.
  // See https://github.com/microsoft/TypeScript/issues/46802
  private initialised(): this is Classifier & Has<Pick<Classifier, 'svg' | 'g'>> {
    return !!this.svg && !!this.g;
  }

  // @ts-expect-error 'svg' and 'g' aren't `keyof Classifier` because they're private properties.
  // See https://github.com/microsoft/TypeScript/issues/46802
  private assertInitialised(): asserts this is Classifier & Has<Pick<Classifier, 'svg' | 'g'>> {
    if (!this.initialised()) {
      throw new Error('Assertion failed: component not initialised');
    }
  }

}

if (isNil(customElements.get('triangle-classifier'))) {
  customElements.define('triangle-classifier', Classifier);
}
