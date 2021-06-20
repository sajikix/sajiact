import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { VNode, PreactElement } from './interface';
import { createElement, Fragment } from './create-element';
import { commitRoot, diff } from './diff/index';

export const render = (vnode: VNode, parentDom: PreactElement) => {
  // parentDomの_childrenがいれば記録する
  const oldVNode = parentDom._children;
  console.log('render:oldVNode', oldVNode);

  // 新しくVNodeを作成
  //  typeはFragment
  //  Propsなし
  //  childrenは渡されたvnode
  // const newVNode = createElement(Fragment as any as ComponentClass, null, [
  //   vnode,
  // ]);
  const newVNode = createElement(Fragment, null, [vnode]);
  // 引数はstring | ComponentType
  console.log('render:newVNode', newVNode);

  // parentDomの._childrenにnewVNodeを入れる
  parentDom._children = newVNode;
  console.log('render:parentDom', parentDom);

  // 実行するライフサイクルイベント管理用
  const commitQueue = [];

  // diff関数呼び出し
  diff({
    parentDom: parentDom,
    newVNode,
    // 以前のVNode。なければ空オブジェクト
    oldVNode: oldVNode || EMPTY_OBJ,
    // globalContext: EMPTY_OBJ,
    // vnodeに記録されてないがchildにいるNodeがあったら
    excessDomChildren: oldVNode
      ? null
      : parentDom.firstChild
      ? EMPTY_ARR.slice.call(parentDom.childNodes)
      : null,
    commitQueue,
    oldDom: oldVNode ? oldVNode._dom : parentDom.firstChild,
  });

  console.log('render:commitQueue', commitQueue);
  // 登録されたエフェクトを読んで消す
  commitRoot(commitQueue);
  console.log('render:commitQueue', commitQueue);
};
