import { h, render } from 'sajiact-core';

console.log('h test', h('div', null, 'hello'));
// @ts-ignore
render(
  h('button', { onclick: () => alert('world') }, 'hello'),
  document.getElementById('main')
);
