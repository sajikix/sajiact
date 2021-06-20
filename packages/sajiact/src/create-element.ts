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

  // If a Component VNode, check for and apply defaultProps
  // Note: type may be undefined in development, must never error here.
  // VNodeがconponentだったらdefaultPropsを適用
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
  return createVNode(
    type,
    normalizedProps as { children: ComponentChildren },
    key,
    undefined,
    null
  );
}

export function createVNode(
  type: VNode['type'] | FragmentType,
  props: VNode<PropsType>['props'] | string | number,
  key: Key,
  ref: undefined,
  original: VNode | null | string | number
) {
  // V8 seems to be better at detecting type shapes if the object is allocated from the same call site
  // Do not inline into createElement and coerceToVNode!
  const vnode: VNode<PropsType> = {
    type,
    //@ts-ignore TODO:
    props,
    key,
    ref,
    _children: null,
    _parent: null,
    _depth: 0,
    _dom: null,
    // _nextDom must be initialized to undefined b/c it will eventually
    // be set to dom.nextSibling which can return `null` and it is important
    // to be able to distinguish between an uninitialized _nextDom and
    // a _nextDom that has been set to `null`
    _nextDom: undefined,
    _component: null,
    _hydrating: null,
    constructor: undefined,
    _original: original,
  };

  if (original == null) vnode._original = vnode;

  return vnode;
}

export function Fragment(props: VNode['props']) {
  return props.children;
}
