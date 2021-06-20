import {
  ComponentChildren,
  FragmentType,
  Key,
  PropsType,
  VNode,
} from './interface';

export function createElement(
  type: VNode['type'] | FragmentType,
  props: PropsType,
  children: ComponentChildren
) {
  let normalizedProps: { children?: ComponentChildren } = {};
  let key: Key;

  for (const propKey in props) {
    if (propKey == 'key') key = props[propKey];
    else normalizedProps[propKey] = props[propKey];
  }

  if (arguments.length > 3) {
    children = [children];
    if (!Array.isArray(children)) {
      throw new Error();
    }
    for (let i = 3; i < arguments.length; i++) {
      children.push(arguments[i]);
    }
  }
  if (children != null) {
    normalizedProps.children = children;
  }

  // VNodeがconponentだったらdefaultPropsを確認
  if (
    typeof type == 'function' &&
    'defaultProps' in type &&
    type.defaultProps != null
  ) {
    //
    for (let defaultPropKey in type.defaultProps) {
      // normalizedPropsの中にdefaultPropKeyがある場合、normalizedPropsをdefaultPropで上書き
      if (normalizedProps[defaultPropKey] === undefined) {
        normalizedProps[defaultPropKey] = type.defaultProps[defaultPropKey];
      }
    }
  }

  // key がなければ undefined のまま入る
  return createVNode(type, normalizedProps, key, undefined);
}

export function createVNode(
  type: VNode['type'] | FragmentType,
  props: VNode<PropsType>['props'] | string | number,
  key: Key,
  original: VNode | null | string | number
) {
  // V8 seems to be better at detecting type shapes if the object is allocated from the same call site
  // Do not inline into createElement and coerceToVNode!
  const vnode: VNode<PropsType> = {
    type,
    props,
    key,
    _children: null,
    _parent: null,
    _depth: 0,
    _dom: null,
    _nextDom: undefined,
    _component: null,
    _hydrating: null,
    constructor: undefined,
    _original: original,
  };

  console.log('createVNode:VNode', vnode);

  if (original == null) vnode._original = vnode;

  return vnode;
}

export function Fragment(props: VNode['props']) {
  if (typeof props === 'object' && 'children' in props) return props.children;
  return null;
}
