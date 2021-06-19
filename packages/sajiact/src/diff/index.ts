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
  console.log('diff:newVNodeType', newVNodeType);

  // When passing through createElement it assigns the object
  // constructor as undefined. This to prevent JSON-injection.
  if (newVNode.constructor !== undefined) return null;

  try {
    // 変更したいVnodeのtypeにfunctionが指定されている = functional/class両方
    // ルートは基本Fragment
    if (typeof newVNodeType === 'function') {
      // 新しいProps
      const newProps = newVNode.props;
      //
      let newComponent, isNew: boolean, oldProps;
      // diffをとるのがcomponentの時
      // すでに以前のcomponentがある時 = setStateの時とか
      if ('_component' in oldVNode && oldVNode._component) {
        // component自体は変わらない
        newComponent = newVNode._component = oldVNode._component;
      } else {
        // 新しくComponentを作成する必要がある時
        if ('prototype' in newVNodeType && newVNodeType.prototype.render) {
          // classComponentの場合
          // newVnodeTpyeに指定されたClassをnewして新しいComponentとする
          // @ts-ignore
          newVNode._component = newComponent = new newVNodeType(newProps);
        } else {
          // functiocalComponentの場合
          // Component funtionをnewする
          //@ts-ignore TODO:
          newVNode._component = newComponent = new Component(newProps);
          // コンストラクタの作成
          newComponent.constructor = newVNodeType;
          // renderの作成
          newComponent.render = doRender;
        }
        // 新しいComponentの初期化
        newComponent.props = newProps;
        // TODO: state入ることあるのか
        if (!newComponent.state) newComponent.state = {};
        // あたしくcomponentを作成したので isNewフラグをtrue
        isNew = newComponent._dirty = true;
        //
        newComponent._renderCallbacks = [];
      }
      // stateを利用するための_newxtStateの初期化
      if (newComponent._nextState == null) {
        newComponent._nextState = newComponent.state;
      }

      // 記憶しておく
      oldProps = newComponent.props;

      // ライフサイクル
      // shouldComponentUpdate ,componentWillUpdate,componentDidUpdate,componentWillMountは削った
      // 新しくComponentを作成した時
      if (isNew) {
        // componentDidMountをrenderCallbacksに登録しておく
        if (newComponent.componentDidMount != null) {
          newComponent._renderCallbacks.push(newComponent.componentDidMount);
        }
      } else {
        // 新しくComponentが生成されてない場合
        if (
          // getDerivedStateFromPropsがある場合はcomponentWillReceivePropsが走る前にreRenderされる可能性あり
          newVNodeType.getDerivedStateFromProps === null &&
          // Propsが違う時のみcomponentWillReceivePropsを行う
          newProps !== oldProps &&
          // componentWillReceivePropsが設定されてたら
          newComponent.componentWillReceiveProps != null
        ) {
          newComponent.componentWillReceiveProps(newProps);
        }
      }

      // 新しいComponentのpropsとstateを設定
      newComponent.props = newProps;
      newComponent.state = newComponent._nextState;

      // _dirtyをfalseにする
      newComponent._dirty = false;
      // 新しいComponentのVnodeを設定
      newComponent._vnode = newVNode;
      // 新しいComponentのparentDomを設定
      newComponent._parentDom = parentDom;

      // render結果を一時的にもつ
      const newComponentRenderResultTmp = newComponent.render(
        newComponent.props
      );

      // Handle setState called in render, see #2553　(TODO: なんでもう一回呼ぶのか調べる)
      newComponent.state = newComponent._nextState;

      // 新しいコンポーネントのrender結果がフラグメントの場合かどうか
      const isTopLevelFragment =
        newComponentRenderResultTmp != null &&
        newComponentRenderResultTmp.type == Fragment &&
        newComponentRenderResultTmp.key == null;

      // 新しいコンポーネントのrender結果がフラグメントだったらそのChildrenを返すようにする
      const newComponentRenderResult = isTopLevelFragment
        ? newComponentRenderResultTmp.props.children
        : newComponentRenderResultTmp;

      console.log('diff:newComponent', newComponent);

      //
      diffChildren({
        parentDom: parentDom,
        // renderを呼び出した結果をrenderResultにいれる
        renderResult: Array.isArray(newComponentRenderResult)
          ? newComponentRenderResult
          : [newComponentRenderResult],
        newParentVNode: newVNode,
        oldParentVNode: oldVNode,
        excessDomChildren: excessDomChildren,
        commitQueue: commitQueue,
        oldDom: oldDom,
      });

      //
      newComponent.base = newVNode._dom;

      // componentDidMountなどが入っていれば
      if (newComponent._renderCallbacks.length) {
        // commitQueueに追加
        commitQueue.push(newComponent);
      }
      // TODO
      newComponent._force = false;

      //これ以降は diffの対象がコンポーネントでない = diff を取る対象が primitive=最後はこの分岐に入る
    } else if (
      // excessDomChildrenが存在しなくかつnewVnodeとoldVnodeのオリジナルが一致
      excessDomChildren == null &&
      '_component' in oldVNode &&
      newVNode._original === oldVNode._original
    ) {
      // 基本この分岐に入ることはない
      newVNode._children = oldVNode._children;
      newVNode._dom = oldVNode._dom;
    } else {
      console.log('diff:primitive');

      // primitiveの場合

      newVNode._dom = diffElementNodes({
        dom: '_dom' in oldVNode ? oldVNode._dom : null, // この分岐に入るとparentDomではなくoldVNode._domを見るようになる。(階層を下る)
        newVNode: newVNode,
        oldVNode: oldVNode,
        excessDomChildren: excessDomChildren,
        commitQueue: commitQueue,
      });
    }
    // newVnodeのdomを返す
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

  console.log('diffElementNodes:dom', dom);

  // dom(diffでoldVnodeの_domとして渡される)がない
  if (dom == null) {
    // 新しいVNodeのタイプが不明 = テキストとして解釈するしかない
    if (newVNodeType === null) {
      //最終的に再起はここで終わる
      // @ts-ignore createTextNode returns Text, we expect PreactElement
      return document.createTextNode(newProps);
    }

    // @ts-ignore _listenerがないと怒られる
    // ここでcreateElementしている
    dom = document.createElement(
      // @ts-ignore We know `newVNode.type` is a string
      newVNodeType,
      newProps.is && newProps
    );

    // TODO
    excessDomChildren = null;
  }

  console.log('diffElementNodes:newVNodeType', newVNodeType);

  // newVNode 不明　= textとして扱う
  if (newVNodeType === null) {
    // TODO 型が....
    const textNodeProps = newProps as any as string | number;
    if (oldProps !== newProps && dom.data !== textNodeProps) {
      // propsが変更されていたらdataにpropsのデータを入れる
      dom.data = textNodeProps;
    }
    // newVNode が 何らかのプリミティブな element の場合
  } else {
    // props
    const props: Partial<VNode<PropsType>['props']> = oldProps;

    // VNodeのpropsの差分を取り、domを破壊的に変更
    diffProps(dom, newProps, props);

    // VNode の children に diff を取るためにchildrenを抽出
    const propsChildren = newVNode.props.children;

    // newVNodeがComponentの入れ子でなくてもプリミティブなElementの入れ子の可能性があるので、childrenの比較も行う
    diffChildren({
      // この先はchildrenの比較なので
      parentDom: dom,
      // childrenを入れる
      renderResult: Array.isArray(propsChildren)
        ? propsChildren
        : [propsChildren],
      newParentVNode: newVNode,
      oldParentVNode: oldVNode,
      excessDomChildren: excessDomChildren,
      commitQueue: commitQueue,
      // oldDomはなし？
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
