import { type Transition } from 'd3';
import { easeBackOut, easeCircleOut } from 'd3-ease';
import { interpolateNumber, interpolateObject } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';
import { local, select, type BaseType, type Selection } from 'd3-selection';

import { Angle } from 'geometries/angle.class';
import { Point } from 'geometries/point.class';
import { Segment } from 'geometries/segment.class';
import { Vector } from 'geometries/vector.class';
import { pairs, sortBy } from 'utils/arrays';
import { isNearly, εθ } from 'utils/compare';
import { forSure, isNil, type Has } from 'utils/maybe';
import { RxElement } from 'utils/rx-element.class';
import { merge, zip } from 'utils/utils';
import { type Classification } from 'virtual-chalkboard/proximity';

import style from './classifier.styling.lazy.scss';
import template from './classifier.template.html';

type ObservedAttribute = keyof Classification;

const HEIGHT = 120;
const TRIANGLE_BASE = 85;

type ArcAttrs = { angle: number, orient: number, radius: number, rightangle: number, open: number };
const TICKS = local<number>();
const ANGLE_ATTRS = local<ArcAttrs>();

const λ = scaleLinear([0, 1], [-TRIANGLE_BASE / 2, TRIANGLE_BASE / 2]);
const λy = scaleLinear([0, 1], [0, -TRIANGLE_BASE]);

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

function anglePath({ angle, orient, radius, rightangle, open }: ArcAttrs): string {
  const from = Vector.fromAngle(orient).resize(radius);
  const to = from.rotate(angle * open);
  // Push away the midway point iff shaping a right-angle mark
  const through = from.rotate(angle * Math.min(open, .5)).resize(radius * (1 + rightangle * (Math.SQRT2 - 1)));
  // Straighten the 'arc' when drawing a right-angle mark by increasing the ellipsis radius
  const ellipsis = radius + 100 * rightangle ** 2;

  return `M${from.Δx},${-from.Δy}
    A${ellipsis} ${ellipsis} , 0 , 0 0 , ${through.Δx} ${-through.Δy}
    ${open <= .5 ? '' : `
    A${ellipsis} ${ellipsis} , 0 , 0 0 , ${to.Δx}      ${-to.Δy}`}`;
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

/**
 * @param apex Coordinates of the apex point of a triangle whose base coincides with the canonical vector `(1, 0)`.
 */
function triangle({ x, y }: Point): string {
  return `M${λ(0)},${λy(0)} L${λ(x)},${λy(y)} L${λ(1)},${λy(0)} z`;
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
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
    this.svg.setAttribute('viewBox', `-1000 -${HEIGHT} 2000 ${HEIGHT}`);
    this.g = select(forSure(this.svg.querySelector('g')));
    this.reposition();
  }

  public attributeChangedCallback(name: ObservedAttribute, prev: string, cur: Classification[typeof name]): void {
    if (this.initialised() && cur !== prev) {
      transition(this.g.select<SVGGElement>(`g#${name}`).select('text').text(cur))
        .styleTween('opacity', () => String).duration(400).attrTween('dy', () => animateDy(cur, 20, 0));

      const xDefault = .3;
      const y90 = Math.sqrt(xDefault - xDefault ** 2);
      const yIso = Math.sqrt(3) / 2;
      const x = { Acute: xDefault, Degenerate: (name === 'lateral' ? .5 : .3), Equiangular: .5, Obtuse: xDefault, Right: xDefault, Scalene: .3, Isosceles: .5, Equilateral: .5 }[cur];
      const y = { Acute: y90 + .2, Degenerate: 0, Equiangular: yIso, Obtuse: y90 - .2, Right: y90, Scalene: yIso - .2, Isosceles: yIso - .2, Equilateral: yIso }[cur];
      const apex = new Point(x, y);

      transition(
        this.g.datum({ angular: this.getAttribute('angular'), lateral: this.getAttribute('lateral') } as Classification)
          .select<SVGGElement>(`g#${name}`)
          .select<SVGPathElement>('path'),
      ).attr('d', triangle(apex));

      if (name === 'lateral') {
        // TODO: create issue in ms/TypeScript that requests reevaluation of a type's dependants when it is narrowed
        this.updateLateralTicks(apex, cur as Classification[typeof name]);
      } else {
        this.updateAngularArcs(apex, cur as Classification[typeof name]);
      }

      this.reposition();
    }
  }

  private updateLateralTicks(apex: Point, type: Classification['lateral']): void {
    this.assertInitialised();

    this.g.select<SVGGElement>('g#lateral').select('g.ticks').selectAll<SVGPathElement, null>('path')
      .data(merge(
        pairs([new Point(0, 0), apex, new Point(1, 0)])
          .map(([A, B]) => sortBy([A, B], ({ x }) => x)) // always draw marks from left to right
          .map(([from, to]) => new Segment(from, to))
          .map(({ midpoint: at, vector: { angle } }) => ({ at, angle })),
        ({ Degenerate: [0, 0, 0], Scalene: [1, 2, 3], Isosceles: [1, 1, 0], Equilateral: [1, 1, 1] }[type]).map(ticks => ({ ticks })),
      ))
      .join(
        enter => Classifier.transitionTicks(enter.append('path')),
        update => Classifier.transitionTicks(update),
      );
  }

  private updateAngularArcs(apex: Point, type: Classification['angular']): void {
    this.assertInitialised();

    const points = [new Point(0, 0), apex, new Point(1, 0)];
    const angles = pairs(
      pairs(points).map(([from, to]) => new Segment(from, to)),
    ).map(([{ from: A, to: B }, { to: C }]) => new Angle(A, B, C));

    const data = merge(
      zip(points, [...angles.slice(-1), ...angles.slice(0, -1)]).map(([at, angle]) => ({ at, angle })),
      ({ Degenerate: [0, 0, 0], Acute: [1, 1, 1], Right: [0, 1, 0], Obtuse: [0, 1, 0], Equiangular: [1, 1, 1] }[type]).map(open => ({ open })),
    );

    this.g.select<SVGGElement>('g#angular').select('g.arcs-values').selectAll<SVGTextElement, null>('text')
      .data(data)
      .join(
        enter => Classifier.transitionValues(enter.append('text').attr('part', 'svg-text'), type),
        update => Classifier.transitionValues(update, type),
      );

    this.g.select<SVGGElement>('g#angular').select('g.arcs-inner').selectAll<SVGPathElement, null>('path')
      .data(data)
      .join(
        enter => Classifier.transitionArcs(enter.append('path')),
        update => Classifier.transitionArcs(update),
      );
  }

  private static transitionTicks(
    selection: Selection<SVGPathElement, { at: Point, angle: number, ticks: number }, BaseType, unknown>,
  ): Transition<SVGPathElement, { at: Point, angle: number, ticks: number }, BaseType, unknown> {
    return transition(selection)
      .attr('transform', ({ at: { x, y }, angle }) => `translate(${λ(x)},${λy(y)}) rotate(${angle * (-180 / Math.PI)})`)
      .attrTween('d', function interpolate(this: SVGPathElement, { ticks }) {
        const i = interpolateNumber(TICKS.get(this) ?? 0, ticks);
        return t => ticksPath(TICKS.set(this, i(t)) as unknown as number);
      });
  }

  private static transitionArcs(
    selection: Selection<SVGPathElement, { at: Point, angle: Angle, open: number }, BaseType, unknown>,
  ): Transition<SVGPathElement, { at: Point, angle: Angle, open: number }, BaseType, unknown> {
    return transition(selection)
      .attr('transform', ({ at: { x, y } }) => `translate(${λ(x)},${λy(y)})`)
      .attrTween('d', function interpolate(this: SVGPathElement, { angle, open }) {
        const area = 150;
        const r = isNearly(angle.angle, 0, εθ) ? 15 : Math.sqrt((area * 2) / angle.angle) || 15;
        const i = interpolateObject(
          ANGLE_ATTRS.get(this),
          { angle: angle.angle, orient: angle.BA.angle, radius: r, rightangle: +angle.isNearlyRight(), open },
        );

        // TODO: remove casting once typings are fixed
        // See my PR at https://github.com/DefinitelyTyped/DefinitelyTyped/pull/61154
        return t => anglePath(ANGLE_ATTRS.set(this, i(t)) as unknown as ArcAttrs);
      });
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

  private reposition(): void {
    this.assertInitialised();
    const w = this.measure(`${this.getAttribute('lateral') ?? ''}\u00a0\u00a0and\u00a0\u00a0${this.getAttribute('angular') ?? ''}`);
    const w1 = this.measure(this.getAttribute('lateral') ?? '');
    const w2 = this.measure(this.getAttribute('angular') ?? '');

    transition(this.g).attr('transform', `translate(${-w / 2}, 0)`);
    transition(this.g.select<SVGElement>('text#and')).attr('x', w1 + (w - (w1 + w2)) / 2);

    transition(this.g.select<SVGElement>('g#lateral')).attr('transform', `translate(${w1 / 2}, 0)`);
    transition(this.g.select<SVGElement>('g#angular')).attr('transform', `translate(${w - w2 / 2}, 0)`);
  }

  private measure(text: string): number {
    this.assertInitialised();
    const measurer = forSure(this.svg.querySelector<SVGTextElement>('defs text#measurer'));
    measurer.textContent = text;

    return measurer.getComputedTextLength();
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
