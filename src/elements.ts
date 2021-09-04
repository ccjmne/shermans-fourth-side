const SVGNS = 'http://www.w3.org/2000/svg';
export default function createSVGElement(
  type = 'path',
  attr: { [key: string]: { toString: () => string } } = {},
  classed: string = null,
): SVGElement {
  const res = document.createElementNS(SVGNS, type);
  Object.entries(attr).forEach(([key, value]) => res.setAttribute(key, value.toString()));
  res.classList.add(classed);
  return res;
}
