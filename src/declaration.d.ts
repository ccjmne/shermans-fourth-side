declare module '*.template.html' {
  const template: HTMLTemplateElement;
  export default template;
}

declare module '*.lazy.scss' {
  const insert: { use(option: { target?: DocumentOrShadowRoot } = {}): void };
  export default insert;
}

declare module '*.scss' {
  export default undefined;
}
