import { debounceTime, fromEvent, map, of, pairwise, startWith, Subscription, switchMap, toArray } from 'rxjs';
import './index.scss';

module.hot.accept();

const SVGNS = 'http://www.w3.org/2000/svg';
function createSVGElement(type = 'path', attr: { [key: string]: { toString: () => string } } = {}, classed: string = null): SVGElement {
  const res = document.createElementNS(SVGNS, type);
  Object.entries(attr).forEach(([key, value]) => res.setAttribute(key, value.toString()));
  res.classList.add(classed);
  return res;
}

type Point = { x: number; y: number };
type Segment = [Point, Point];
type Line = { offset: number, slope: number };
const svg = createSVGElement('svg');
document.body.appendChild(svg);
function randomPoint(): Point {
  const { width, height } = svg.getBoundingClientRect();
  return { x: Math.random() * (width / 2) + width / 4, y: Math.random() * (height / 2) + height / 4 };
}

const subs: Subscription[] = [];

function intersection({ offset: o1, slope: s1 }: Line, { offset: o2, slope: s2 }: Line): Point {
  // o1 + x * s1 = o2 + x * s2
  // x * s1 = o2 - o1 + x * s2
  // x * s1 - x * s2 = o2 - o1
  // x * (s1 - s2) = o2 - o1
  const x = (o2 - o1) / (s1 - s2);
  return { x, y: o1 + s1 * x };
}

function throughPointWithSlope({ x, y }: Point, slope: number): Line {
  return { offset: y - slope * x, slope };
}

function distance({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function length(AB: Segment): number {
  return distance(...AB);
}

function asLine([{ x: x1, y: y1 }, { x: x2, y: y2 }]: Segment): Line {
  return throughPointWithSlope({ x: x1, y: y1 }, (y2 - y1) / (x2 - x1));
}

subs.push(
  fromEvent(window, 'resize').pipe(
    startWith(null),
    debounceTime(200),
    map(() => Array.from({ length: 3 }, randomPoint)),
    switchMap(vertices => of(...vertices, vertices[0]).pipe(pairwise(), toArray<Segment>(), map(lines => ({ vertices, lines })))),
  ).subscribe(({ vertices, lines: segments }) => {
    Array.from(svg.children).forEach(node => node.parentElement.removeChild(node));
    vertices.forEach(({ x: cx, y: cy }) => svg.appendChild(createSVGElement('circle', { cx, cy, r: 10 }, 'vertex')));
    segments.forEach(([{ x: x1, y: y1 }, { x: x2, y: y2 }]) => svg.appendChild(createSVGElement('path', { d: `M${x1},${y1}L${x2},${y2}` })));

    const { width } = svg.getBoundingClientRect();

    (function circumcircle() {
      /**
       * @param line The line to bisect
       * @returns offset and slope that correspond to the equation of the bisecting line such that `y = offset + slope * x`
       */
      function bisector([{ x: x1, y: y1 }, { x: x2, y: y2 }]: Segment): Line {
        // point: midpoint through with to go
        // slope: negative reciprocal of the original slope, so as to be perpendicular
        return throughPointWithSlope({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, -(x2 - x1) / (y2 - y1));
      }

      segments.map(l => bisector(l)).forEach(({ offset, slope }) => svg.appendChild(createSVGElement('path', {
        d: `M0,${offset}L${width},${offset + slope * width}`,
        stroke: 'grey',
      })));

      const { x: cx, y: cy } = intersection(...segments.map(bisector) as [Line, Line]);
      const { x, y } = vertices[0];
      svg.appendChild(createSVGElement('circle', { cx, cy, r: Math.sqrt(Math.abs(x - cx) ** 2 + Math.abs(y - cy) ** 2) }));
    }());

    (function incircle() {
      function angleBisector([[A, B], [, C]]: [Segment, Segment]): Line {
        function angle([{ x: x1, y: y1 }, { x: x2, y: y2 }]: Segment): number {
          return Math.atan2(y2 - y1, x2 - x1);
        }

        return throughPointWithSlope(B, Math.tan((angle([B, A]) + angle([B, C])) / 2));
      }

      subs.push(of(...segments, segments[0]).pipe(pairwise(), map(angleBisector))
        .subscribe(({ offset, slope }) => svg.appendChild(createSVGElement('path', { d: `M0,${offset}L${width},${offset + slope * width}`, stroke: 'lightgrey' }))));

      const incenter = intersection(angleBisector([segments[0], segments[1]]), angleBisector([segments[1], segments[2]]));
      const { offset, slope } = asLine(segments[0]);
      const r = distance(incenter, intersection({ offset, slope }, throughPointWithSlope(incenter, -1 / slope)));
      svg.appendChild(createSVGElement('circle', { cx: incenter.x, cy: incenter.y, r, stroke: 'lightgrey' }));
    }());
  }),
);

module.hot.dispose(() => {
  subs.forEach(s => s.unsubscribe());
  svg.parentElement.removeChild(svg);
});
