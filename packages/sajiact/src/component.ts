import { Component as ComponentType, PropsType, VNode } from './interface';
import { diff, commitRoot } from './diff/index';
import { Fragment } from './create-element';
import { assign } from './util';

export function Component(props: PropsType) {
  this.props = props;
}

/**
 * setState メソッド.
 * component._nextState に次の状態を保存し、enqueueRenderを呼び出して再レンダリングをトリガーする
 */
Component.prototype.setState = function (update: Object) {
  // only clone state when copying to nextState the first time.
  let s;
  if (this._nextState != null && this._nextState !== this.state) {
    s = this._nextState;
  } else {
    s = this._nextState = assign({}, this.state);
  }

  if (update) {
    assign(s, update);
  }

  // Skip update if updater function returned null
  if (update == null) return;

  if (this._vnode) {
    enqueueRender(this);
  }
};

/**
 * render が呼ばれると、Fragment() つまり、props.childrenを返す
 */
Component.prototype.render = Fragment;

export function getDomSibling(vnode: VNode, childIndex: number | null) {
  if (childIndex == null) {
    // Use childIndex==null as a signal to resume the search from the vnode's sibling
    return vnode._parent
      ? getDomSibling(vnode._parent, vnode._parent._children.indexOf(vnode) + 1)
      : null;
  }

  let sibling;
  for (; childIndex < vnode._children.length; childIndex++) {
    sibling = vnode._children[childIndex];

    if (sibling != null && sibling._dom != null) {
      // Since updateParentDomPointers keeps _dom pointer correct,
      // we can rely on _dom to tell us if this subtree contains a
      // rendered DOM node, and what the first rendered DOM node is
      return sibling._dom;
    }
  }

  // vnodeのchildren からDOMが見つからなかった時の処理
  return typeof vnode.type == 'function'
    ? getDomSibling(vnode, undefined)
    : null;
}

/**
 * 再レンダリングのトリガー, diffを呼び出す
 * @param component rerender したいコンポーネント
 */
function renderComponent(component: ComponentType) {
  let vnode = component._vnode,
    oldDom = vnode._dom,
    parentDom = component._parentDom;

  if (parentDom) {
    let commitQueue = [];
    const oldVNode = assign({}, vnode) as VNode;
    oldVNode._original = oldVNode;

    let newDom = diff({
      parentDom: parentDom,
      newVNode: vnode,
      oldVNode: oldVNode,
      excessDomChildren: null,
      commitQueue: commitQueue,
      oldDom: oldDom == null ? getDomSibling(vnode, undefined) : oldDom,
    });

    commitRoot(commitQueue);

    if (newDom != oldDom) {
      updateParentDomPointers(vnode);
    }
  }
}

/**
 * @param {import('./internal').VNode} vnode
 */
function updateParentDomPointers(vnode: VNode) {
  if ((vnode = vnode._parent) != null && vnode._component != null) {
    vnode._dom = vnode._component.base = null;
    for (let i = 0; i < vnode._children.length; i++) {
      let child = vnode._children[i];
      if (child != null && child._dom != null) {
        vnode._dom = vnode._component.base = child._dom;
        break;
      }
    }

    return updateParentDomPointers(vnode);
  }
}

// 差分更新後の副作用を管理するリスト
let rerenderQueue: ComponentType[] = [];

// callbackの非同期スケジューラー
const defer: (cb: () => void) => void =
  typeof Promise == 'function'
    ? Promise.prototype.then.bind(Promise.resolve())
    : setTimeout;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */

/**
 * setStateが呼び出すトリガー.
 * データの破壊的操作があるので注意
 * @param c コンポーネント
 */
export function enqueueRender(c: ComponentType) {
  if (
    (!c._dirty &&
      (c._dirty = true) &&
      // queueの操作
      rerenderQueue.push(c) &&
      // counterの増加操作
      !process._rerenderCount++) ||
    true
  ) {
    defer(process);
  }
}

/**
 * renderQueueを実行する
 */
function process() {
  let queue;
  while ((process._rerenderCount = rerenderQueue.length)) {
    queue = rerenderQueue.sort((a, b) => a._vnode._depth - b._vnode._depth);
    rerenderQueue = [];
    // Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
    // process() calls from getting scheduled while `queue` is still being consumed.
    queue.some((c) => {
      if (c._dirty) renderComponent(c);
    });
  }
}
process._rerenderCount = 0;
