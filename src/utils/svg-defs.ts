import { select, Selection } from 'd3-selection';

let ID_SEQ = 0;

const SVG_NS = 'http://www.w3.org/2000/svg';
function getDefs(this: SVGSVGElement): SVGDefsElement {
  if (!this.querySelector('defs')) {
    this.prepend(document.createElementNS(SVG_NS, 'defs'));
  }

  return this.querySelector('defs') as SVGDefsElement; // can't be `null` here
}

// credit: https://stackoverflow.com/a/14500054
export function defineHatch(stroke = 'grey', side = 4): {
  in: (svg: SVGSVGElement) => { href: string, elem: Selection<SVGPatternElement, unknown, null, undefined> };
} {
  const id = `def:hatch-${++ID_SEQ}`; // eslint-disable-line no-plusplus
  return {
    in(svg: SVGSVGElement) {
      const pattern = select(svg).select(getDefs).append('pattern')
        .attr('id', id)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', side)
        .attr('height', side);
      pattern.append('path')
        .attr('stroke', stroke)
        .attr(
          'd',
          `M-1,1 l2,-2
           M0,${side} l${side},-${side}
           M${side},${side}
           m-1,1 l2,-2`,
        );

      return { href: `#${id}`, elem: pattern };
    },
  };
}

export function defineClip(d?: string): {
  in: (svg: SVGSVGElement) => { href: string, elem: Selection<SVGClipPathElement, unknown, null, undefined> };
} {
  const id = `def:clip-${++ID_SEQ}`; // eslint-disable-line no-plusplus
  return {
    in(svg: SVGSVGElement) {
      const clip = select(svg).select(getDefs).append('clipPath')
        .attr('id', id);
      clip.append('path')
        .attr('d', d ?? '');

      return { href: `#${id}`, elem: clip };
    },
  };
}

export function definePath(d?: string): {
  in: (svg: SVGSVGElement) => { href: string, elem: Selection<SVGPathElement, unknown, null, undefined> };
} {
  const id = `def:path-${++ID_SEQ}`; // eslint-disable-line no-plusplus
  return {
    in(svg: SVGSVGElement) {
      return {
        href: `#${id}`,
        elem: select(svg)
          .select(getDefs)
          .append('path')
          .attr('id', id)
          .attr('d', d ?? ''),
      };
    },
  };
}
