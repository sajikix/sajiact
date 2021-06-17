import { EMPTY_OBJ } from '../constants';
import { Fragment } from '../create-element';
import { VNode, PropsType, PreactElement, ComponentType } from 'src/interface';
import { diffProps } from './props';
import { diffChildren } from './children';
import { Component } from '../component';
import { removeNode } from '../util';

interface DiffArg {
  parentDom: PreactElement;
  newVNode: VNode;
  oldVNode: VNode<PropsType> | typeof EMPTY_OBJ;
  excessDomChildren: PreactElement[];
  commitQueue: ComponentType[];
  oldDom: Element | Text | typeof EMPTY_OBJ;
}

export const diff = ({
  newVNode,
  oldVNode,
  commitQueue,
  parentDom,
  excessDomChildren,
  oldDom,
}: DiffArg) => {
  // 変更したいVnodeのtype(stringまたはclass/functionComponent)
  const newVNodeType = newVNode.type;

  // When passing through createElement it assigns the object
  // constructor as undefined. This to prevent JSON-injection.
  if (newVNode.constructor !== undefined) return null;

  console.log('parentDom in diff', parentDom);

  try {
    outer: if (typeof newVNodeType === 'function') {
      const newProps = newVNode.props;
      let newComponent, isNew, oldProps, oldState;
      // diffをとるのがcomponentの時
      if ('_component' in oldVNode && oldVNode._component) {
        // すでに以前のcomponentがある時 = setStateの時とか
        newComponent = newVNode._component = oldVNode._component;
      } else {
        // 新しくComponentを作成する必要がある時
        if ('prototype' in newVNodeType && newVNodeType.prototype.render) {
          // classComponent
          // @ts-ignore
          newVNode._component = newComponent = new newVNodeType(newProps);
        } else {
          // functiocalComponent
          //@ts-ignore TODO:
          newVNode._component = newComponent = new Component(newProps);
          newComponent.constructor = newVNodeType;
          newComponent.render = doRender;
        }
        // 新しいComponentの初期化
        newComponent.props = newProps;
        if (!newComponent.state) newComponent.state = {};
        isNew = newComponent._dirty = true;
        newComponent._renderCallbacks = [];
      }
      // Invoke getDerivedStateFromProps
      if (newComponent._nextState == null) {
        newComponent._nextState = newComponent.state;
      }

      oldProps = newComponent.props;
      oldState = newComponent.state;

      // ライフサイクル
      // shouldComponentUpdate ,componentWillUpdate,componentDidUpdateはなし
      if (isNew) {
        // 新しくComponentを作成した時
        if (
          newVNodeType.getDerivedStateFromProps === null &&
          newComponent.componentWillMount != null
        ) {
          newComponent.componentWillMount();
        }

        // componentDidMountをrenderCallbacksに登録しておく
        if (newComponent.componentDidMount != null) {
          newComponent._renderCallbacks.push(newComponent.componentDidMount);
        }
      } else {
        // 新しくComponentが生成されてない場合
        if (
          newVNodeType.getDerivedStateFromProps === null &&
          newProps !== oldProps &&
          newComponent.componentWillReceiveProps != null
        ) {
          // propsが変わっていたらcomponentWillReceivePropsを実行
          newComponent.componentWillReceiveProps(newProps);
        }
      }

      //
      newComponent.props = newProps;
      newComponent.state = newComponent._nextState;

      newComponent._dirty = false;
      newComponent._vnode = newVNode;
      newComponent._parentDom = parentDom;

      // render結果を一時的にもつ
      const newComponentTmp = newComponent.render(newComponent.props);

      // Handle setState called in render, see #2553　(TODO: なんでもう一回呼ぶのか調べる)
      newComponent.state = newComponent._nextState;

      //
      const isTopLevelFragment =
        newComponentTmp != null &&
        newComponentTmp.type == Fragment &&
        newComponentTmp.key == null;

      //
      const renderResult = isTopLevelFragment
        ? newComponentTmp.props.children
        : newComponentTmp;

      //
      diffChildren({
        parentDom: parentDom,
        renderResult: Array.isArray(renderResult)
          ? renderResult
          : [renderResult],
        newParentVNode: newVNode,
        oldParentVNode: oldVNode,
        excessDomChildren: excessDomChildren,
        commitQueue: commitQueue,
        oldDom: oldDom,
      });

      //
      newComponent.base = newVNode._dom;

      if (newComponent._renderCallbacks.length) {
        commitQueue.push(newComponent);
      }
      newComponent._force = false;
    } else if (
      excessDomChildren == null &&
      '_component' in oldVNode &&
      newVNode._original === oldVNode._original
    ) {
      // 基本ない
      newVNode._children = oldVNode._children;
      newVNode._dom = oldVNode._dom;
    } else {
      newVNode._dom = diffElementNodes({
        dom: '_dom' in oldVNode ? oldVNode._dom : null, // この分岐に入るとparentDomではなくoldVNode._domを見るようになる。(階層を下る)
        newVNode: newVNode,
        oldVNode: oldVNode,
        excessDomChildren: excessDomChildren,
        commitQueue: commitQueue,
      });
    }
    return newVNode._dom;
  } catch (error) {
    console.error(error);
  }
};

export const commitRoot = (commitQueue: ComponentType<any, any>[]) => {
  commitQueue.some((c) => {
    // @ts-ignore Reuse the commitQueue variable here so the type changes
    commitQueue = c._renderCallbacks;
    // @ts-ignore Reuse the commitQueue variable here so the type changes
    c._renderCallbacks = [];
    commitQueue.some((cb) => {
      // @ts-ignore See above ts-ignore on commitQueue
      cb.call(c);
    });
  });
};

type DiffElementArg = {
  // diffで渡されたoldVNode._dom
  dom: PreactElement | null;
  newVNode: VNode<PropsType>;
  oldVNode: VNode<PropsType> | typeof EMPTY_OBJ;
  excessDomChildren: any;
  commitQueue: ComponentType[];
};

const diffElementNodes = ({
  oldVNode,
  newVNode,
  dom,
  excessDomChildren,
  commitQueue,
}: DiffElementArg): PreactElement => {
  const oldProps = 'props' in oldVNode ? oldVNode.props : EMPTY_OBJ;
  const newProps = newVNode.props;
  const newVNodeType = newVNode.type;

  //
  if (dom == null) {
    if (newVNodeType === null) {
      // @ts-ignore createTextNode returns Text, we expect PreactElement
      return document.createTextNode(newProps);
    }

    // @ts-ignore _listenerがないと怒られる
    dom = document.createElement(
      // @ts-ignore We know `newVNode.type` is a string
      newVNodeType,
      newProps.is && newProps
    );

    // 新しく親を作ったので既存の子は使いまわさない
    excessDomChildren = null;
  }

  if (newVNodeType === null) {
    // newVNode が primitive の場合
    // TODO 型が....
    const textNodeProps = newProps as any as string | number;
    if (oldProps !== newProps && dom.data !== textNodeProps) {
      dom.data = textNodeProps;
    }
  } else {
    // newVNode が element の場合
    const props: Partial<VNode<PropsType>['props']> = oldProps;

    // VNodeの差分を取る。domは破壊的操作がされる
    diffProps(dom, newProps, props);

    // VNode の children に diff を取るためにchildrenを抽出
    const propsChildren = newVNode.props.children;

    // newVNodeがComponentの入れ子でなくてもElementの入れ子の可能性があるので、childrenの比較も行う
    diffChildren({
      parentDom: dom,
      renderResult: Array.isArray(propsChildren)
        ? propsChildren
        : [propsChildren],
      newParentVNode: newVNode,
      oldParentVNode: oldVNode,
      excessDomChildren: excessDomChildren,
      commitQueue: commitQueue,
      oldDom: EMPTY_OBJ,
    });
  }

  return dom;
};

/**
 * componentWillUnmount の実行と、DOMツリーからNodeをremoveする
 * @param vnode
 * @param parentVNode
 * @param skipRemove
 */
export function unmount(vnode: VNode, parentVNode: VNode, skipRemove: boolean) {
  let r;

  let dom;
  if (!skipRemove && typeof vnode.type != 'function') {
    skipRemove = (dom = vnode._dom) != null;
  }

  // Must be set to `undefined` to properly clean up `_nextDom`
  // for which `null` is a valid value. See comment in `create-element.js`
  vnode._dom = vnode._nextDom = undefined;

  if ((r = vnode._component) != null) {
    if (r.componentWillUnmount) {
      r.componentWillUnmount();
    }

    r.base = r._parentDom = null;
  }

  if ((r = vnode._children)) {
    for (let i = 0; i < r.length; i++) {
      if (r[i]) unmount(r[i], parentVNode, skipRemove);
    }
  }

  if (dom != null) removeNode(dom);
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props) {
  return this.constructor(props);
}
