import { scaleLinear } from 'd3-scale';
import { arc, line } from 'd3-shape';
import { debounceTime, fromEvent, map, mapTo, startWith, Subscription } from 'rxjs';
import createSVGElement from './elements';
import { angleBisector, asLine, bisector, distance, intersection, Line, perpendicular, Point, slopeThroughPoint } from './geometry';
import './index.scss';

module.hot.accept();
const svg = createSVGElement('svg');
document.body.appendChild(svg);

const subs: Subscription[] = [];

/**
 * Like RxJs' `pairwise` operator, but also pairs the last and first items together.
 *
 * For example:
 * ```
 * pairs('a', 'b', 'c').map(pair => pair.join(''))
 * // ['ab', 'bc', 'ca']
 * ```
 */
function pairs<T>(...items: T[]): [T, T][] {
  const next = [...items.slice(1), items[0]];
  return items.map((item, i) => [item, next[i]]);
}

subs.push(
  fromEvent(window, 'resize').pipe(
    startWith(null),
    debounceTime(200),
    mapTo(Array.from({ length: 3 }, () => ({ x: Math.random() * (3 / 4) + 1 / 8, y: Math.random() * (3 / 4) + 1 / 8 }))),
    map(vertices => ({ vertices, sides: pairs(...vertices) })),
  ).subscribe(({ vertices: [A, B, C], sides: [AB, BC, CA] }) => {
    const { width, height } = svg.getBoundingClientRect();
    const amplitude = Math.min(width, height);
    const scaleX = scaleLinear([0 + (width - amplitude) / 2, width - (width - amplitude) / 2]);
    const scaleY = scaleLinear([height - (height - amplitude) / 2, 0 + (height - amplitude) / 2]);
    const segmentPath = line<Point>(({ x }) => scaleX(x), ({ y }) => scaleY(y));
    const circlePath = arc<{ r: number }>().startAngle(0).endAngle(Math.PI * 2).outerRadius(({ r }) => scaleX(r) - scaleX(0));
    const linePath = function ({ offset, slope }: Line): string {
      return `M0,${scaleY(offset + scaleX.invert(0) * slope)}L${width},${scaleY(offset + scaleX.invert(width) * slope)}`;
    };

    Array.from(svg.children).forEach(node => node.parentElement.removeChild(node));
    [A, B, C].forEach(({ x, y }) => svg.appendChild(createSVGElement('circle', { cx: scaleX(x), cy: scaleY(y), r: 10 }, 'vertex')));
    [AB, BC, CA].forEach(side => svg.appendChild(createSVGElement('path', { d: segmentPath(side) }, 'side')));

    (function circumcircle() {
      [AB, BC, CA].map(bisector).forEach(straightline => svg.appendChild(
        createSVGElement('path', { d: linePath(straightline), stroke: 'grey' }),
      ));

      const circumcenter = intersection(bisector(AB), bisector(BC));
      svg.appendChild(createSVGElement('path', {
        d: circlePath({ r: distance(A, circumcenter) }),
        transform: `translate(${scaleX(circumcenter.x)},${scaleY(circumcenter.y)})`,
        stroke: 'grey',
      }));
    }());

    (function incircle() {
      pairs(AB, BC, CA).map(angleBisector).forEach(straightline => svg.appendChild(
        createSVGElement('path', { d: linePath(straightline), stroke: 'lightgrey' }),
      ));

      const incenter = intersection(angleBisector([AB, BC]), angleBisector([BC, CA]));
      svg.appendChild(createSVGElement('path', {
        d: circlePath({ r: distance(incenter, intersection(asLine(AB), slopeThroughPoint(perpendicular(AB), incenter))) }),
        transform: `translate(${scaleX(incenter.x)},${scaleY(incenter.y)})`,
        stroke: 'lightgrey',
      }));
    }());
  }),
);

module.hot.dispose(() => {
  subs.forEach(s => s.unsubscribe());
  svg.parentElement.removeChild(svg);
});
