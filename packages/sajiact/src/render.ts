import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { VNode, PreactElement, ComponentClass } from './interface';
import { createElement, Fragment } from './create-element';
import { commitRoot, diff } from './diff/index';

export const render = (vnode: VNode, parentDom: PreactElement) => {
  // childなくない？
  const oldVNode = parentDom._children;

  const newVNode = createElement(Fragment as any as ComponentClass, null, [
    vnode,
  ]);

  parentDom._children = newVNode;

  let commitQueue = [];

  diff({
    parentDom: parentDom,
    newVNode,
    oldVNode: oldVNode || EMPTY_OBJ,
    // globalContext: EMPTY_OBJ,
    excessDomChildren: oldVNode
      ? null
      : parentDom.firstChild
      ? EMPTY_ARR.slice.call(parentDom.childNodes)
      : null,
    commitQueue,
    oldDom: oldVNode ? oldVNode._dom : parentDom.firstChild,
  });

  // Flush all queued effects
  commitRoot(commitQueue);
};
